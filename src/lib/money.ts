import type { Entry, Project } from '../types'

export interface Totals {
  income: number
  labor: number
  equipment: number
  misc: number
  expense: number
  profit: number
}

export function emptyTotals(): Totals {
  return { income: 0, labor: 0, equipment: 0, misc: 0, expense: 0, profit: 0 }
}

export function sumEntries(entries: Entry[]): Totals {
  const t = emptyTotals()
  for (const e of entries) t[e.kind] += e.amount
  t.expense = t.labor + t.equipment + t.misc
  t.profit = t.income - t.expense
  return t
}

export function projectTotals(project: Project): Totals {
  return sumEntries(project.entries)
}

/** 인건비 사람별 합계 (같은 이름은 합산, 금액 큰 순) */
export function laborByPerson(project: Project): { name: string; amount: number; count: number }[] {
  const map = new Map<string, { name: string; amount: number; count: number }>()
  for (const e of project.entries) {
    if (e.kind !== 'labor') continue
    const name = e.title.trim() || '이름 없음'
    const row = map.get(name) ?? { name, amount: 0, count: 0 }
    row.amount += e.amount
    row.count += 1
    map.set(name, row)
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount)
}

/** 날짜 최신순으로 묶음 (같은 날 안에서는 수입 먼저) */
export function groupEntriesByDate(entries: Entry[]): { date: string; entries: Entry[] }[] {
  const sorted = entries.slice().sort((a, b) => {
    const byDate = b.date.localeCompare(a.date)
    if (byDate !== 0) return byDate
    if (a.kind === 'income' && b.kind !== 'income') return -1
    if (b.kind === 'income' && a.kind !== 'income') return 1
    return 0
  })
  const groups: { date: string; entries: Entry[] }[] = []
  for (const e of sorted) {
    const last = groups[groups.length - 1]
    if (last && last.date === e.date) last.entries.push(e)
    else groups.push({ date: e.date, entries: [e] })
  }
  return groups
}

/** 로컬 날짜 기준 YYYY-MM-DD */
export function todayISO(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** YYYY-MM */
export function monthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  return monthKey(new Date(y, m - 1 + delta, 1))
}

export function formatMonthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${y}년 ${m}월`
}

/** 프로젝트 날짜가 그 달이거나, 그 달에 기록이 있으면 홈 목록에 올린다 */
export function projectTouchesMonth(project: Project, month: string): boolean {
  if (project.date.startsWith(month)) return true
  return project.entries.some((e) => e.date.startsWith(month))
}

export function monthTotals(projects: Project[], month: string): Totals {
  return sumEntries(
    projects.flatMap((p) => p.entries.filter((e) => e.date.startsWith(month))),
  )
}

export function projectMonthTotals(project: Project, month: string): Totals {
  return sumEntries(project.entries.filter((e) => e.date.startsWith(month)))
}

/* ───────────── 정산장부: 받을 돈 / 미수금 ───────────── */

export type PayStatus = 'unpaid' | 'partial' | 'done'

export interface Ledger {
  /** 받을 금액 (0 = 미정) */
  amount: number
  /** 지금까지 받은 돈 */
  received: number
  labor: number
  equipment: number
  misc: number
  expense: number
  /** 아직 받을 돈 */
  due: number
  /** 받을 금액 − 지출 */
  profit: number
  status: PayStatus
  /** 촬영일이 오늘 이후 */
  upcoming: boolean
  /** 입금 기한이 지났는데 다 못 받음 */
  overdue: boolean
  laborUnpaid: number
  /** 마지막 입금일 */
  lastPay: string
}

export function projectLedger(project: Project, today: string = todayISO()): Ledger {
  const t = projectTotals(project)
  const amount = project.amount
  const received = t.income
  const status: PayStatus =
    amount > 0 && received >= amount ? 'done' : received > 0 ? 'partial' : 'unpaid'
  const upcoming = !!project.date && project.date > today
  const laborUnpaid = project.entries
    .filter((e) => e.kind === 'labor' && !e.paid)
    .reduce((s, e) => s + e.amount, 0)
  const lastPay = project.entries
    .filter((e) => e.kind === 'income')
    .map((e) => e.date)
    .sort()
    .pop() ?? ''
  return {
    amount,
    received,
    labor: t.labor,
    equipment: t.equipment,
    misc: t.misc,
    expense: t.expense,
    due: Math.max(0, amount - received),
    profit: amount - t.expense,
    status,
    upcoming,
    overdue: status !== 'done' && !upcoming && !!project.dueDate && project.dueDate < today,
    laborUnpaid,
    lastPay,
  }
}

export interface PersonLabor {
  name: string
  roles: string[]
  total: number
  unpaid: number
  items: { project: Project; entry: Entry }[]
}

/** 여러 프로젝트의 인건비를 사람별로 (미지급 많은 순) */
export function laborAcrossProjects(projects: Project[]): PersonLabor[] {
  const map = new Map<string, PersonLabor>()
  for (const project of projects) {
    for (const entry of project.entries) {
      if (entry.kind !== 'labor') continue
      const name = entry.title.trim() || '이름 없음'
      const row = map.get(name) ?? { name, roles: [], total: 0, unpaid: 0, items: [] }
      row.total += entry.amount
      if (!entry.paid) row.unpaid += entry.amount
      if (entry.role && !row.roles.includes(entry.role)) row.roles.push(entry.role)
      row.items.push({ project, entry })
      map.set(name, row)
    }
  }
  return [...map.values()].sort((a, b) => b.unpaid - a.unpaid || b.total - a.total)
}
