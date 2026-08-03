import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createSampleProject,
  type Category,
  type CategoryId,
  type Expense,
  type Project,
} from '../types'
import { uid } from '../lib/format'

const STORAGE_KEY = 'reelbudget.project.v1'

function loadProject(): Project {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Project
  } catch {
    /* ignore */
  }
  return createSampleProject()
}

export function useProject() {
  const [project, setProject] = useState<Project>(loadProject)
  const [filter, setFilter] = useState<CategoryId | 'all'>('all')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project))
  }, [project])

  const spent = useMemo(
    () => project.expenses.reduce((sum, e) => sum + e.amount, 0),
    [project.expenses],
  )

  const remaining = project.totalBudget - spent
  const usageRatio =
    project.totalBudget > 0 ? Math.min(spent / project.totalBudget, 1) : 0

  const byCategory = useMemo(() => {
    const map = new Map<CategoryId, number>()
    for (const c of project.categories) map.set(c.id, 0)
    for (const e of project.expenses) {
      map.set(e.categoryId, (map.get(e.categoryId) ?? 0) + e.amount)
    }
    return project.categories.map((c) => ({
      ...c,
      spent: map.get(c.id) ?? 0,
    }))
  }, [project])

  const filteredExpenses = useMemo(() => {
    const list =
      filter === 'all'
        ? project.expenses
        : project.expenses.filter((e) => e.categoryId === filter)
    return [...list].sort((a, b) => b.date.localeCompare(a.date))
  }, [project.expenses, filter])

  const updateMeta = useCallback(
    (patch: Partial<Pick<Project, 'name' | 'client' | 'shootDate' | 'totalBudget'>>) => {
      setProject((p) => ({ ...p, ...patch }))
    },
    [],
  )

  const updateCategoryPlanned = useCallback((id: CategoryId, planned: number) => {
    setProject((p) => ({
      ...p,
      categories: p.categories.map((c) =>
        c.id === id ? { ...c, planned: Math.max(0, planned) } : c,
      ),
    }))
  }, [])

  const addExpense = useCallback(
    (data: Omit<Expense, 'id'>) => {
      setProject((p) => ({
        ...p,
        expenses: [{ ...data, id: uid() }, ...p.expenses],
      }))
    },
    [],
  )

  const updateExpense = useCallback((id: string, data: Omit<Expense, 'id'>) => {
    setProject((p) => ({
      ...p,
      expenses: p.expenses.map((e) => (e.id === id ? { ...data, id } : e)),
    }))
  }, [])

  const deleteExpense = useCallback((id: string) => {
    setProject((p) => ({
      ...p,
      expenses: p.expenses.filter((e) => e.id !== id),
    }))
  }, [])

  const resetSample = useCallback(() => {
    const next = createSampleProject()
    setProject(next)
    setFilter('all')
  }, [])

  const categoryOf = useCallback(
    (id: CategoryId): Category | undefined =>
      project.categories.find((c) => c.id === id),
    [project.categories],
  )

  return {
    project,
    filter,
    setFilter,
    spent,
    remaining,
    usageRatio,
    byCategory,
    filteredExpenses,
    updateMeta,
    updateCategoryPlanned,
    addExpense,
    updateExpense,
    deleteExpense,
    resetSample,
    categoryOf,
  }
}
