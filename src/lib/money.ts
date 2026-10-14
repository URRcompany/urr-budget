import type { Entry, EntryKind, Project } from '../types'

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

export function entriesOfKind(project: Project, kind: EntryKind): Entry[] {
  return project.entries
    .filter((e) => e.kind === kind)
    .sort((a, b) => b.date.localeCompare(a.date))
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

export function monthTotals(projects: Project[], month: string): Totals {
  return sumEntries(
    projects.flatMap((p) => p.entries.filter((e) => e.date.startsWith(month))),
  )
}

export function projectMonthTotals(project: Project, month: string): Totals {
  return sumEntries(project.entries.filter((e) => e.date.startsWith(month)))
}
