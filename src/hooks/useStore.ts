import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CATEGORY_PALETTE,
  createEmptyProject,
  projectLaborStats,
  projectMargin,
  projectNetProfit,
  projectReceived,
  projectReceivableOutstanding,
  projectSpent,
  type AppStore,
  type Category,
  type ClientPayment,
  type Expense,
  type LaborPayment,
  type Project,
  PROTECTED_CATEGORY_IDS,
  projectCommittedSpent,
} from '../types'
import { uid } from '../lib/format'
import { monthKey } from '../lib/ledger'
import { normalizeExpenseTaxFields } from '../lib/vat'
import { calcWithholding, laborWithholdingExpenseIds } from '../lib/withholding'
import { normalizeProjectContractInput, syncProjectContractBudget } from '../lib/contract'
import { downloadStoreBackup, readBackupFile } from '../lib/backup'

const STORAGE_KEY = 'reelbudget.store.v3'
const STORAGE_KEY_V2 = 'reelbudget.store.v2'
const LEGACY_KEY = 'reelbudget.project.v1'

const SAMPLE_PROJECT_IDS = new Set(['p_sample_dawn', 'p_sample_mv'])

function normalizeExpense(
  e: Partial<Expense> & Pick<Expense, 'id' | 'title' | 'amount' | 'categoryId' | 'date'>,
  opts?: { withholding?: boolean },
): Expense {
  const withholding = opts?.withholding === true
  const restoreVat = !withholding && e.categoryId === 'labor' && e.vatMode === 'exempt'

  const base = {
    id: e.id,
    title: e.title,
    amount: e.amount,
    categoryId: e.categoryId,
    date: e.date,
    note: e.note ?? '',
    vendor: e.vendor ?? '',
    invoiceReceived: withholding ? true : (e.invoiceReceived ?? false),
    vatMode: withholding
      ? ('exempt' as const)
      : restoreVat
        ? ('included' as const)
        : (e.vatMode ?? 'included'),
    supplyAmount: withholding || restoreVat ? undefined : e.supplyAmount,
    vatAmount: withholding ? 0 : restoreVat ? undefined : e.vatAmount,
    receiptDataUrl: e.receiptDataUrl ?? '',
    receiptFileName: e.receiptFileName ?? '',
  }
  const tax = normalizeExpenseTaxFields(base)
  return { ...base, ...tax }
}

function normalizeClientPayment(
  cp: Partial<ClientPayment> & Pick<ClientPayment, 'id' | 'label' | 'amount'>,
): ClientPayment {
  return {
    id: cp.id,
    label: cp.label,
    amount: cp.amount,
    dueDate: cp.dueDate ?? '',
    paidDate: cp.paidDate ?? '',
    isPaid: cp.isPaid ?? false,
    note: cp.note ?? '',
    kind: cp.kind ?? 'custom',
    invoiceIssued: cp.invoiceIssued ?? false,
    invoiceDate: cp.invoiceDate ?? '',
  }
}

function normalizeProject(p: Partial<Project> & { name: string }): Project {
  const base = createEmptyProject()
  const laborPayments = p.laborPayments ?? []
  const withholdingIds = laborWithholdingExpenseIds(laborPayments)
  const merged = {
    ...base,
    ...p,
    categories: p.categories?.length ? p.categories : base.categories,
    expenses: (p.expenses ?? []).map((e) =>
      normalizeExpense(
        e as Partial<Expense> & Pick<Expense, 'id' | 'title' | 'amount' | 'categoryId' | 'date'>,
        { withholding: withholdingIds.has(e.id) },
      ),
    ),
    clientPayments: (p.clientPayments ?? []).map((cp) =>
      normalizeClientPayment(cp as Partial<ClientPayment> & Pick<ClientPayment, 'id' | 'label' | 'amount'>),
    ),
    laborPayments,
  }
  const contract = syncProjectContractBudget(merged)
  return { ...merged, ...contract }
}

function stripSampleProjects(store: AppStore): AppStore {
  const projects = store.projects.filter((p) => !SAMPLE_PROJECT_IDS.has(p.id))
  const activeProjectId =
    store.activeProjectId && projects.some((p) => p.id === store.activeProjectId)
      ? store.activeProjectId
      : null
  return { ...store, projects, activeProjectId }
}

export function normalizeImportedStore(raw: AppStore): AppStore {
  return stripSampleProjects({
    version: 3,
    projects: raw.projects.map((p) => normalizeProject(p)),
    activeProjectId:
      raw.activeProjectId &&
      raw.projects.some((p) => p.id === raw.activeProjectId)
        ? raw.activeProjectId
        : null,
  })
}

function createInitialStore(): AppStore {
  return {
    version: 3,
    projects: [],
    activeProjectId: null,
  }
}

function migrateToV3(
  projects: Partial<Project>[],
  activeProjectId: string | null,
): AppStore {
  return {
    version: 3,
    projects: projects
      .filter((p): p is Partial<Project> & { name: string } => Boolean(p.name))
      .map((p) => normalizeProject(p)),
    activeProjectId,
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
    const project = normalizeProject({
      name: legacy.name,
      client: legacy.client ?? '',
      shootDate: legacy.shootDate ?? '',
      revenue: legacy.revenue ?? Math.round((legacy.totalBudget ?? 0) * 1.25),
      totalBudget: legacy.totalBudget ?? 0,
      categories: legacy.categories?.length ? legacy.categories : undefined,
      expenses: legacy.expenses ?? [],
    })
    return { version: 3, projects: [project], activeProjectId: null }
  } catch {
    return null
  }
}

function loadStore(): AppStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppStore
      if (parsed?.version === 3 && Array.isArray(parsed.projects)) {
        return stripSampleProjects({
          ...parsed,
          projects: parsed.projects.map((p) => normalizeProject(p)),
        })
      }
    }
    const v2raw = localStorage.getItem(STORAGE_KEY_V2)
    if (v2raw) {
      const parsed = JSON.parse(v2raw) as {
        version: 2
        projects: Partial<Project>[]
        activeProjectId: string | null
      }
      if (parsed?.version === 2 && Array.isArray(parsed.projects)) {
        localStorage.removeItem(STORAGE_KEY_V2)
        return migrateToV3(parsed.projects, parsed.activeProjectId)
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

function laborExpenseFields(lp: {
  name: string
  role: string
  amount: number
  note: string
  paidDate: string
}): Omit<Expense, 'id'> {
  const paidDate = lp.paidDate || new Date().toISOString().slice(0, 10)
  const wh = calcWithholding(lp.amount)
  const noteParts = [
    lp.role,
    lp.note,
    `원천세 3.3% ${wh.tax.toLocaleString('ko-KR')}원 · 실수령 ${wh.net.toLocaleString('ko-KR')}원`,
  ].filter(Boolean)

  return {
    title: `${lp.name} 인건비`,
    amount: lp.amount,
    categoryId: 'labor',
    date: paidDate,
    note: noteParts.join(' · '),
    vendor: lp.name,
    invoiceReceived: true,
    vatMode: 'exempt',
    supplyAmount: lp.amount,
    vatAmount: 0,
    receiptDataUrl: '',
    receiptFileName: '',
  }
}

export function useStore() {
  const [store, setStore] = useState<AppStore>(loadStore)
  const [filter, setFilter] = useState<string | 'all'>('all')
  const [ledgerMonth, setLedgerMonth] = useState(monthKey)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    }, 500)
    return () => window.clearTimeout(timer)
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
    contractAmount: number
    contractVatMode?: 'included' | 'separate' | 'exempt'
  }) => {
    const contract = normalizeProjectContractInput({
      amount: input.contractAmount,
      vatMode: input.contractVatMode ?? 'separate',
    })
    const project = createEmptyProject({
      name: input.name.trim() || '새 프로젝트',
      client: input.client.trim(),
      shootDate: input.shootDate,
      ...contract,
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
          | 'name'
          | 'client'
          | 'shootDate'
          | 'revenue'
          | 'totalBudget'
          | 'budgetPreset'
          | 'contractVatMode'
          | 'contractSupplyAmount'
          | 'contractVatAmount'
        >
      >,
    ) => {
      setStore((s) => ({
        ...s,
        projects: s.projects.map((p) => {
          if (p.id !== id) return p
          const next = { ...p, ...patch }
          return { ...next, ...syncProjectContractBudget(next) }
        }),
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

  const setCategoriesPlannedBulk = useCallback(
    (projectId: string, allocations: Record<string, number>) => {
      setStore((s) => ({
        ...s,
        projects: s.projects.map((p) => {
          if (p.id !== projectId) return p
          const patchKeys = Object.keys(allocations)
          if (patchKeys.length === 1) {
            const categoryId = patchKeys[0]
            return {
              ...p,
              categories: p.categories.map((c) =>
                c.id === categoryId
                  ? { ...c, planned: Math.max(0, allocations[categoryId]) }
                  : c,
              ),
            }
          }
          return {
            ...p,
            categories: p.categories.map((c) =>
              allocations[c.id] !== undefined
                ? { ...c, planned: Math.max(0, allocations[c.id]) }
                : c,
            ),
          }
        }),
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
    if (PROTECTED_CATEGORY_IDS.has(categoryId)) return
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
          : {
              ...p,
              expenses: p.expenses.filter((e) => e.id !== expenseId),
              laborPayments: p.laborPayments.map((lp) =>
                lp.expenseId === expenseId
                  ? { ...lp, expenseId: undefined, isPaid: false, paidDate: '' }
                  : lp,
              ),
            },
      ),
    }))
  }, [])

  const patchProject = useCallback(
    (projectId: string, updater: (p: Project) => Project) => {
      setStore((s) => ({
        ...s,
        projects: s.projects.map((p) => (p.id === projectId ? updater(p) : p)),
      }))
    },
    [],
  )

  const addClientPayment = useCallback(
    (projectId: string, data: Omit<ClientPayment, 'id'>) => {
      patchProject(projectId, (p) => ({
        ...p,
        clientPayments: [{ ...data, id: uid() }, ...p.clientPayments],
      }))
    },
    [patchProject],
  )

  const updateClientPayment = useCallback(
    (projectId: string, paymentId: string, data: Omit<ClientPayment, 'id'>) => {
      patchProject(projectId, (p) => ({
        ...p,
        clientPayments: p.clientPayments.map((cp) =>
          cp.id === paymentId ? { ...data, id: paymentId } : cp,
        ),
      }))
    },
    [patchProject],
  )

  const deleteClientPayment = useCallback(
    (projectId: string, paymentId: string) => {
      patchProject(projectId, (p) => ({
        ...p,
        clientPayments: p.clientPayments.filter((cp) => cp.id !== paymentId),
      }))
    },
    [patchProject],
  )

  const toggleClientPaymentPaid = useCallback(
    (projectId: string, paymentId: string, isPaid: boolean) => {
      patchProject(projectId, (p) => ({
        ...p,
        clientPayments: p.clientPayments.map((cp) =>
          cp.id === paymentId
            ? {
                ...cp,
                isPaid,
                paidDate: isPaid
                  ? cp.paidDate || new Date().toISOString().slice(0, 10)
                  : '',
              }
            : cp,
        ),
      }))
    },
    [patchProject],
  )

  const toggleClientPaymentInvoice = useCallback(
    (projectId: string, paymentId: string, issued: boolean) => {
      patchProject(projectId, (p) => ({
        ...p,
        clientPayments: p.clientPayments.map((cp) =>
          cp.id === paymentId
            ? {
                ...cp,
                invoiceIssued: issued,
                invoiceDate: issued
                  ? cp.invoiceDate || new Date().toISOString().slice(0, 10)
                  : '',
              }
            : cp,
        ),
      }))
    },
    [patchProject],
  )

  const toggleExpenseInvoice = useCallback(
    (projectId: string, expenseId: string, received: boolean) => {
      patchProject(projectId, (p) => ({
        ...p,
        expenses: p.expenses.map((e) =>
          e.id === expenseId ? { ...e, invoiceReceived: received } : e,
        ),
      }))
    },
    [patchProject],
  )

  const addLaborPayment = useCallback(
    (projectId: string, data: Omit<LaborPayment, 'id'>) => {
      patchProject(projectId, (p) => ({
        ...p,
        laborPayments: [{ ...data, id: uid() }, ...p.laborPayments],
      }))
    },
    [patchProject],
  )

  const updateLaborPayment = useCallback(
    (projectId: string, paymentId: string, data: Omit<LaborPayment, 'id'>) => {
      patchProject(projectId, (p) => {
        const existing = p.laborPayments.find((l) => l.id === paymentId)
        if (!existing) return p

        let expenses = p.expenses
        if (existing.isPaid && existing.expenseId) {
          const fields = laborExpenseFields({
            ...data,
            paidDate:
              data.paidDate || existing.paidDate || new Date().toISOString().slice(0, 10),
          })
          expenses = p.expenses.map((e) =>
            e.id === existing.expenseId ? { ...e, ...fields } : e,
          )
        }

        return {
          ...p,
          expenses,
          laborPayments: p.laborPayments.map((lp) =>
            lp.id === paymentId ? { ...data, id: paymentId } : lp,
          ),
        }
      })
    },
    [patchProject],
  )

  const deleteLaborPayment = useCallback(
    (projectId: string, paymentId: string) => {
      patchProject(projectId, (p) => {
        const lp = p.laborPayments.find((l) => l.id === paymentId)
        return {
          ...p,
          expenses: lp?.expenseId
            ? p.expenses.filter((e) => e.id !== lp.expenseId)
            : p.expenses,
          laborPayments: p.laborPayments.filter((l) => l.id !== paymentId),
        }
      })
    },
    [patchProject],
  )

  const toggleLaborPaymentPaid = useCallback(
    (projectId: string, paymentId: string, isPaid: boolean) => {
      patchProject(projectId, (p) => {
        const lp = p.laborPayments.find((l) => l.id === paymentId)
        if (!lp) return p

        if (isPaid) {
          const paidDate = lp.paidDate || new Date().toISOString().slice(0, 10)
          let expenseId = lp.expenseId
          let expenses = p.expenses
          const fields = laborExpenseFields({ ...lp, paidDate })

          if (!expenseId) {
            expenseId = uid()
            expenses = [{ id: expenseId, ...fields }, ...p.expenses]
          } else {
            expenses = p.expenses.map((e) =>
              e.id === expenseId ? { ...e, ...fields } : e,
            )
          }

          return {
            ...p,
            expenses,
            laborPayments: p.laborPayments.map((l) =>
              l.id === paymentId
                ? { ...l, isPaid: true, paidDate, expenseId }
                : l,
            ),
          }
        }

        const expenses = lp.expenseId
          ? p.expenses.filter((e) => e.id !== lp.expenseId)
          : p.expenses

        return {
          ...p,
          expenses,
          laborPayments: p.laborPayments.map((l) =>
            l.id === paymentId
              ? { ...l, isPaid: false, paidDate: '', expenseId: undefined }
              : l,
          ),
        }
      })
    },
    [patchProject],
  )

  const exportBackup = useCallback(() => {
    downloadStoreBackup(store)
  }, [store])

  const importBackup = useCallback(async (file: File, mode: 'merge' | 'replace') => {
    const result = await readBackupFile(file)
    if (!result.ok) {
      return { ok: false as const, error: result.error }
    }

    const imported = normalizeImportedStore(result.store)

    if (mode === 'replace') {
      setStore(imported)
      setFilter('all')
      return { ok: true as const, projectCount: imported.projects.length }
    }

    setStore((s) => {
      const existingIds = new Set(s.projects.map((p) => p.id))
      const merged = [...s.projects]
      for (const p of imported.projects) {
        if (existingIds.has(p.id)) {
          const idx = merged.findIndex((m) => m.id === p.id)
          merged[idx] = p
        } else {
          merged.unshift(p)
        }
      }
      return {
        version: 3,
        projects: merged,
        activeProjectId: s.activeProjectId,
      }
    })
    return { ok: true as const, projectCount: imported.projects.length }
  }, [])

  const applyAdvanceBalanceTemplate = useCallback(
    (projectId: string, contractTotal: number, advancePercent = 50) => {
      if (contractTotal <= 0) return
      const pct = Math.min(100, Math.max(1, advancePercent))
      const advanceAmount = Math.round(contractTotal * (pct / 100))
      const balanceAmount = Math.max(0, contractTotal - advanceAmount)
      const today = new Date().toISOString().slice(0, 10)
      const items: Omit<ClientPayment, 'id'>[] = [
        {
          label: '선납금',
          kind: 'advance',
          amount: advanceAmount,
          dueDate: today,
          paidDate: '',
          isPaid: false,
          note: `${pct}%`,
          invoiceIssued: false,
          invoiceDate: '',
        },
        {
          label: '잔금',
          kind: 'balance',
          amount: balanceAmount,
          dueDate: '',
          paidDate: '',
          isPaid: false,
          note: `${100 - pct}%`,
          invoiceIssued: false,
          invoiceDate: '',
        },
      ]
      patchProject(projectId, (p) => ({
        ...p,
        clientPayments: [
          ...items.map((item) => ({ ...item, id: uid() })),
          ...p.clientPayments,
        ],
      }))
    },
    [patchProject],
  )

  const applyClientPaymentTemplate = useCallback(
    (projectId: string, revenue: number) => {
      if (revenue <= 0) return
      const today = new Date().toISOString().slice(0, 10)
      const items: Omit<ClientPayment, 'id'>[] = [
        {
          label: '계약금',
          kind: 'advance',
          amount: Math.round(revenue * 0.3),
          dueDate: today,
          paidDate: '',
          isPaid: false,
          note: '30%',
          invoiceIssued: false,
          invoiceDate: '',
        },
        {
          label: '중도금',
          kind: 'interim',
          amount: Math.round(revenue * 0.4),
          dueDate: '',
          paidDate: '',
          isPaid: false,
          note: '40%',
          invoiceIssued: false,
          invoiceDate: '',
        },
        {
          label: '잔금',
          kind: 'balance',
          amount: Math.max(0, revenue - Math.round(revenue * 0.3) - Math.round(revenue * 0.4)),
          dueDate: '',
          paidDate: '',
          isPaid: false,
          note: '30%',
          invoiceIssued: false,
          invoiceDate: '',
        },
      ]
      patchProject(projectId, (p) => ({
        ...p,
        clientPayments: [
          ...items.map((item) => ({ ...item, id: uid() })),
          ...p.clientPayments,
        ],
      }))
    },
    [patchProject],
  )

  const projectStats = useMemo(() => {
    if (!activeProject) return null
    const spent = projectSpent(activeProject)
    const committedSpent = projectCommittedSpent(activeProject)
    const unpaidLabor = committedSpent - spent
    const remaining = activeProject.totalBudget - spent
    const committedRemaining = activeProject.totalBudget - committedSpent
    const usageRatio =
      activeProject.totalBudget > 0
        ? Math.min(spent / activeProject.totalBudget, 1)
        : 0
    const committedUsageRatio =
      activeProject.totalBudget > 0
        ? Math.min(committedSpent / activeProject.totalBudget, 1)
        : 0
    const netProfit = projectNetProfit(activeProject)
    const margin = projectMargin(activeProject)
    const received = projectReceived(activeProject)
    const outstanding = projectReceivableOutstanding(activeProject)
    const laborStats = projectLaborStats(activeProject)
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
      committedSpent,
      unpaidLabor,
      remaining,
      committedRemaining,
      usageRatio,
      committedUsageRatio,
      netProfit,
      margin,
      received,
      outstanding,
      laborStats,
      byCategory,
      filteredExpenses,
    }
  }, [activeProject, filter])

  const categoryOf = useCallback(
    (id: string): Category | undefined =>
      activeProject?.categories.find((c) => c.id === id),
    [activeProject],
  )

  const replaceStore = useCallback((next: AppStore) => {
    setStore(normalizeImportedStore(next))
  }, [])

  return {
    store,
    replaceStore,
    projects: store.projects,
    activeProject,
    activeProjectId: store.activeProjectId,
    portfolio,
    filter,
    setFilter,
    ledgerMonth,
    setLedgerMonth,
    projectStats,
    openProject,
    closeProject,
    createProject,
    deleteProject,
    updateProject,
    updateCategoryPlanned,
    setCategoriesPlannedBulk,
    addCategory,
    renameCategory,
    deleteCategory,
    addExpense,
    updateExpense,
    deleteExpense,
    addClientPayment,
    updateClientPayment,
    deleteClientPayment,
    toggleClientPaymentPaid,
    toggleClientPaymentInvoice,
    toggleExpenseInvoice,
    addLaborPayment,
    updateLaborPayment,
    deleteLaborPayment,
    toggleLaborPaymentPaid,
    applyClientPaymentTemplate,
    applyAdvanceBalanceTemplate,
    exportBackup,
    importBackup,
    categoryOf,
  }
}
