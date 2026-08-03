import type { Project } from '../types'

/** 장부 한 줄 — 실제 입금·지출 흐름 */
export interface LedgerEntry {
  id: string
  date: string
  type: 'income' | 'expense'
  amount: number
  title: string
  projectId: string
  projectName: string
  sublabel?: string
  sourceType: 'client_payment' | 'expense' | 'labor_payment'
}

export interface MonthStats {
  month: string
  label: string
  /** 매출 — 클라이언트 실입금 */
  sales: number
  /** 매입 — 지출 + 인건비 지급 */
  purchases: number
  /** 순이익 = 매출 − 매입 */
  net: number
  incomeCount: number
  expenseCount: number
  runningBalance: number
}

export interface YearOverview {
  year: number
  months: MonthStats[]
  totalSales: number
  totalPurchases: number
  totalNet: number
}

export function monthKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function formatMonthLabel(key: string): string {
  const [y, m] = key.split('-')
  return `${y}년 ${Number(m)}월`
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return monthKey(d)
}

function inMonth(isoDate: string, month: string): boolean {
  if (!isoDate) return false
  return isoDate.slice(0, 7) === month
}

/** 프로젝트들에서 장부 항목 생성 (현금주의) */
export function buildLedgerEntries(
  projects: Project[],
  opts?: { projectId?: string; month?: string },
): LedgerEntry[] {
  const list = opts?.projectId
    ? projects.filter((p) => p.id === opts.projectId)
    : projects

  const entries: LedgerEntry[] = []

  for (const p of list) {
    for (const cp of p.clientPayments) {
      if (!cp.isPaid || !cp.paidDate) continue
      if (opts?.month && !inMonth(cp.paidDate, opts.month)) continue
      entries.push({
        id: `in_${p.id}_${cp.id}`,
        date: cp.paidDate,
        type: 'income',
        amount: cp.amount,
        title: cp.label,
        projectId: p.id,
        projectName: p.name,
        sublabel: p.client || '클라이언트 입금',
        sourceType: 'client_payment',
      })
    }

    for (const e of p.expenses) {
      if (!e.date) continue
      if (opts?.month && !inMonth(e.date, opts.month)) continue
      const cat = p.categories.find((c) => c.id === e.categoryId)
      entries.push({
        id: `ex_${p.id}_${e.id}`,
        date: e.date,
        type: 'expense',
        amount: e.amount,
        title: e.title,
        projectId: p.id,
        projectName: p.name,
        sublabel: cat?.name ?? '지출',
        sourceType: 'expense',
      })
    }

    for (const lp of p.laborPayments) {
      if (!lp.isPaid || !lp.paidDate) continue
      if (lp.expenseId) continue
      if (opts?.month && !inMonth(lp.paidDate, opts.month)) continue
      entries.push({
        id: `lb_${p.id}_${lp.id}`,
        date: lp.paidDate,
        type: 'expense',
        amount: lp.amount,
        title: `${lp.name} 인건비`,
        projectId: p.id,
        projectName: p.name,
        sublabel: lp.role || '인건비 지급',
        sourceType: 'labor_payment',
      })
    }
  }

  return entries.sort((a, b) => {
    const d = b.date.localeCompare(a.date)
    if (d !== 0) return d
    return a.type === 'income' ? -1 : 1
  })
}

export function getMonthStats(
  projects: Project[],
  month: string,
  projectId?: string,
): MonthStats {
  const entries = buildLedgerEntries(projects, { projectId, month })
  const sales = entries
    .filter((e) => e.type === 'income')
    .reduce((s, e) => s + e.amount, 0)
  const purchases = entries
    .filter((e) => e.type === 'expense')
    .reduce((s, e) => s + e.amount, 0)

  return {
    month,
    label: formatMonthLabel(month),
    sales,
    purchases,
    net: sales - purchases,
    incomeCount: entries.filter((e) => e.type === 'income').length,
    expenseCount: entries.filter((e) => e.type === 'expense').length,
    runningBalance: sales - purchases,
  }
}

/** 장부에 데이터가 있는 월 목록 (최신순) */
export function getAvailableMonths(projects: Project[]): string[] {
  const set = new Set<string>()
  for (const p of projects) {
    for (const cp of p.clientPayments) {
      if (cp.isPaid && cp.paidDate) set.add(cp.paidDate.slice(0, 7))
    }
    for (const e of p.expenses) {
      if (e.date) set.add(e.date.slice(0, 7))
    }
    for (const lp of p.laborPayments) {
      if (lp.isPaid && lp.paidDate) set.add(lp.paidDate.slice(0, 7))
    }
  }
  set.add(monthKey())
  return [...set].sort((a, b) => b.localeCompare(a))
}

export function getYearOverview(
  projects: Project[],
  year: number,
  projectId?: string,
): YearOverview {
  const months: MonthStats[] = []
  for (let m = 1; m <= 12; m++) {
    const key = `${year}-${String(m).padStart(2, '0')}`
    months.push(getMonthStats(projects, key, projectId))
  }
  return {
    year,
    months,
    totalSales: months.reduce((s, m) => s + m.sales, 0),
    totalPurchases: months.reduce((s, m) => s + m.purchases, 0),
    totalNet: months.reduce((s, m) => s + m.net, 0),
  }
}

/** 월별 장부를 일(date) 단위로 묶기 */
export function groupEntriesByDate(
  entries: LedgerEntry[],
): Array<{ date: string; entries: LedgerEntry[]; net: number }> {
  const map = new Map<string, LedgerEntry[]>()
  for (const e of entries) {
    const arr = map.get(e.date) ?? []
    arr.push(e)
    map.set(e.date, arr)
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, dayEntries]) => {
      const net = dayEntries.reduce(
        (s, e) => s + (e.type === 'income' ? e.amount : -e.amount),
        0,
      )
      return { date, entries: dayEntries, net }
    })
}

export function breakdownPurchases(
  projects: Project[],
  month: string,
  projectId?: string,
): { expenses: number; labor: number } {
  const entries = buildLedgerEntries(projects, { projectId, month })
  let expenses = 0
  let labor = 0
  for (const e of entries) {
    if (e.type !== 'expense') continue
    if (e.sourceType === 'labor_payment') labor += e.amount
    else expenses += e.amount
  }
  return { expenses, labor }
}

/** expenseId 없이 지급만 된 인건비 (레거시) 포함 여부 확인용 */
export function countUnlinkedLaborPaid(projects: Project[]): number {
  let n = 0
  for (const p of projects) {
    for (const lp of p.laborPayments) {
      if (lp.isPaid && !lp.expenseId) n++
    }
  }
  return n
}
