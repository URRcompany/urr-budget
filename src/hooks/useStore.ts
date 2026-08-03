import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CATEGORY_PALETTE,
  createEmptyProject,
  createSampleProjects,
  projectMargin,
  projectNetProfit,
  projectSpent,
  type AppStore,
  type Category,
  type Expense,
  type Project,
} from '../types'
import { uid } from '../lib/format'

const STORAGE_KEY = 'reelbudget.store.v2'
const LEGACY_KEY = 'reelbudget.project.v1'

function createInitialStore(): AppStore {
  const projects = createSampleProjects()
  return {
    version: 2,
    projects,
    activeProjectId: null,
  }
}

function migrateLegacy(raw: string): AppStore | null {
  try {
    const legacy = JSON.parse(raw) as Partial<Project> & {
      name?: string
      expenses?: Expense[]
      categories?: Category[]
    }
    if (!legacy.name) return null
    const project = createEmptyProject({
      name: legacy.name,
      client: legacy.client ?? '',
      shootDate: legacy.shootDate ?? '',
      revenue: legacy.revenue ?? Math.round((legacy.totalBudget ?? 0) * 1.25),
      totalBudget: legacy.totalBudget ?? 0,
      categories: legacy.categories?.length
        ? legacy.categories
        : createEmptyProject().categories,
      expenses: legacy.expenses ?? [],
    })
    return { version: 2, projects: [project], activeProjectId: null }
  } catch {
    return null
  }
}

function loadStore(): AppStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppStore
      if (parsed?.version === 2 && Array.isArray(parsed.projects)) {
        return parsed
      }
    }
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy) {
      const migrated = migrateLegacy(legacy)
      if (migrated) {
        localStorage.removeItem(LEGACY_KEY)
        return migrated
      }
    }
  } catch {
    /* ignore */
  }
  return createInitialStore()
}

export function useStore() {
  const [store, setStore] = useState<AppStore>(loadStore)
  const [filter, setFilter] = useState<string | 'all'>('all')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  }, [store])

  const activeProject = useMemo(
    () => store.projects.find((p) => p.id === store.activeProjectId) ?? null,
    [store],
  )

  const portfolio = useMemo(() => {
    const revenue = store.projects.reduce((s, p) => s + p.revenue, 0)
    const spent = store.projects.reduce((s, p) => s + projectSpent(p), 0)
    return {
      count: store.projects.length,
      revenue,
      spent,
      netProfit: revenue - spent,
    }
  }, [store.projects])

  const openProject = useCallback((id: string) => {
    setFilter('all')
    setStore((s) => ({ ...s, activeProjectId: id }))
  }, [])

  const closeProject = useCallback(() => {
    setFilter('all')
    setStore((s) => ({ ...s, activeProjectId: null }))
  }, [])

  const createProject = useCallback((input: {
    name: string
    client: string
    shootDate: string
    revenue: number
    totalBudget: number
  }) => {
    const project = createEmptyProject({
      name: input.name.trim() || '새 프로젝트',
      client: input.client.trim(),
      shootDate: input.shootDate,
      revenue: Math.max(0, input.revenue),
      totalBudget: Math.max(0, input.totalBudget),
    })
    setStore((s) => ({
      ...s,
      projects: [project, ...s.projects],
      activeProjectId: project.id,
    }))
    setFilter('all')
    return project.id
  }, [])

  const deleteProject = useCallback((id: string) => {
    setStore((s) => {
      const projects = s.projects.filter((p) => p.id !== id)
      return {
        ...s,
        projects,
        activeProjectId: s.activeProjectId === id ? null : s.activeProjectId,
      }
    })
  }, [])

  const updateProject = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<
          Project,
          'name' | 'client' | 'shootDate' | 'revenue' | 'totalBudget'
        >
      >,
    ) => {
      setStore((s) => ({
        ...s,
        projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }))
    },
    [],
  )

  const updateCategoryPlanned = useCallback(
    (projectId: string, categoryId: string, planned: number) => {
      setStore((s) => ({
        ...s,
        projects: s.projects.map((p) =>
          p.id !== projectId
            ? p
            : {
                ...p,
                categories: p.categories.map((c) =>
                  c.id === categoryId
                    ? { ...c, planned: Math.max(0, planned) }
                    : c,
                ),
              },
        ),
      }))
    },
    [],
  )

  const addCategory = useCallback((projectId: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setStore((s) => ({
      ...s,
      projects: s.projects.map((p) => {
        if (p.id !== projectId) return p
        const color =
          CATEGORY_PALETTE[p.categories.length % CATEGORY_PALETTE.length]
        return {
          ...p,
          categories: [
            ...p.categories,
            {
              id: `cat_${uid()}`,
              name: trimmed,
              color,
              planned: 0,
            },
          ],
        }
      }),
    }))
  }, [])

  const renameCategory = useCallback(
    (projectId: string, categoryId: string, name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      setStore((s) => ({
        ...s,
        projects: s.projects.map((p) =>
          p.id !== projectId
            ? p
            : {
                ...p,
                categories: p.categories.map((c) =>
                  c.id === categoryId ? { ...c, name: trimmed } : c,
                ),
              },
        ),
      }))
    },
    [],
  )

  const deleteCategory = useCallback((projectId: string, categoryId: string) => {
    setStore((s) => ({
      ...s,
      projects: s.projects.map((p) => {
        if (p.id !== projectId) return p
        if (p.categories.length <= 1) return p
        const fallback = p.categories.find((c) => c.id !== categoryId)?.id
        if (!fallback) return p
        return {
          ...p,
          categories: p.categories.filter((c) => c.id !== categoryId),
          expenses: p.expenses.map((e) =>
            e.categoryId === categoryId ? { ...e, categoryId: fallback } : e,
          ),
        }
      }),
    }))
    setFilter((f) => (f === categoryId ? 'all' : f))
  }, [])

  const addExpense = useCallback(
    (projectId: string, data: Omit<Expense, 'id'>) => {
      setStore((s) => ({
        ...s,
        projects: s.projects.map((p) =>
          p.id !== projectId
            ? p
            : { ...p, expenses: [{ ...data, id: uid() }, ...p.expenses] },
        ),
      }))
    },
    [],
  )

  const updateExpense = useCallback(
    (projectId: string, expenseId: string, data: Omit<Expense, 'id'>) => {
      setStore((s) => ({
        ...s,
        projects: s.projects.map((p) =>
          p.id !== projectId
            ? p
            : {
                ...p,
                expenses: p.expenses.map((e) =>
                  e.id === expenseId ? { ...data, id: expenseId } : e,
                ),
              },
        ),
      }))
    },
    [],
  )

  const deleteExpense = useCallback((projectId: string, expenseId: string) => {
    setStore((s) => ({
      ...s,
      projects: s.projects.map((p) =>
        p.id !== projectId
          ? p
          : { ...p, expenses: p.expenses.filter((e) => e.id !== expenseId) },
      ),
    }))
  }, [])

  const resetSamples = useCallback(() => {
    const projects = createSampleProjects()
    setStore({ version: 2, projects, activeProjectId: null })
    setFilter('all')
  }, [])

  const projectStats = useMemo(() => {
    if (!activeProject) return null
    const spent = projectSpent(activeProject)
    const remaining = activeProject.totalBudget - spent
    const usageRatio =
      activeProject.totalBudget > 0
        ? Math.min(spent / activeProject.totalBudget, 1)
        : 0
    const netProfit = projectNetProfit(activeProject)
    const margin = projectMargin(activeProject)
    const byCategory = activeProject.categories.map((c) => ({
      ...c,
      spent: activeProject.expenses
        .filter((e) => e.categoryId === c.id)
        .reduce((sum, e) => sum + e.amount, 0),
    }))
    const filteredExpenses = (
      filter === 'all'
        ? activeProject.expenses
        : activeProject.expenses.filter((e) => e.categoryId === filter)
    )
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))

    return {
      spent,
      remaining,
      usageRatio,
      netProfit,
      margin,
      byCategory,
      filteredExpenses,
    }
  }, [activeProject, filter])

  const categoryOf = useCallback(
    (id: string): Category | undefined =>
      activeProject?.categories.find((c) => c.id === id),
    [activeProject],
  )

  return {
    projects: store.projects,
    activeProject,
    activeProjectId: store.activeProjectId,
    portfolio,
    filter,
    setFilter,
    projectStats,
    openProject,
    closeProject,
    createProject,
    deleteProject,
    updateProject,
    updateCategoryPlanned,
    addCategory,
    renameCategory,
    deleteCategory,
    addExpense,
    updateExpense,
    deleteExpense,
    resetSamples,
    categoryOf,
  }
}
