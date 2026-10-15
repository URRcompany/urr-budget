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

export function monthTotals(projects: Project[], month: string): Totals {
  return sumEntries(
    projects.flatMap((p) => p.entries.filter((e) => e.date.startsWith(month))),
  )
}

export function projectMonthTotals(project: Project, month: string): Totals {
  return sumEntries(project.entries.filter((e) => e.date.startsWith(month)))
}
