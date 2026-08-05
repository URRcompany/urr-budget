import type { ClientPayment, Project } from '../types'
import { projectReceived, projectReceivableOutstanding } from '../types'

export interface OverduePayment {
  projectId: string
  projectName: string
  client: string
  payment: ClientPayment
  daysOverdue: number
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function isPaymentOverdue(payment: ClientPayment, today = todayISO()): boolean {
  if (payment.isPaid || !payment.dueDate) return false
  return payment.dueDate < today
}

export function daysOverdue(payment: ClientPayment, today = todayISO()): number {
  if (!isPaymentOverdue(payment, today)) return 0
  const due = new Date(payment.dueDate + 'T00:00:00')
  const now = new Date(today + 'T00:00:00')
  return Math.floor((now.getTime() - due.getTime()) / 86400000)
}

export function getOverduePayments(
  projects: Project[],
  today = todayISO(),
): OverduePayment[] {
  const list: OverduePayment[] = []
  for (const p of projects) {
    for (const cp of p.clientPayments) {
      if (!isPaymentOverdue(cp, today)) continue
      list.push({
        projectId: p.id,
        projectName: p.name,
        client: p.client,
        payment: cp,
        daysOverdue: daysOverdue(cp, today),
      })
    }
  }
  return list.sort((a, b) => b.daysOverdue - a.daysOverdue)
}

export function getUpcomingPayments(
  projects: Project[],
  withinDays = 7,
  today = todayISO(),
): OverduePayment[] {
  const now = new Date(today + 'T00:00:00')
  const end = new Date(now)
  end.setDate(end.getDate() + withinDays)
  const endISO = end.toISOString().slice(0, 10)

  const list: OverduePayment[] = []
  for (const p of projects) {
    for (const cp of p.clientPayments) {
      if (cp.isPaid || !cp.dueDate) continue
      if (cp.dueDate < today || cp.dueDate > endISO) continue
      list.push({
        projectId: p.id,
        projectName: p.name,
        client: p.client,
        payment: cp,
        daysOverdue: daysOverdue(cp, today),
      })
    }
  }
  return list.sort((a, b) => a.payment.dueDate.localeCompare(b.payment.dueDate))
}

export interface PendingReceivable {
  projectId: string
  projectName: string
  client: string
  paymentId: string
  label: string
  amount: number
  dueDate: string
  isOverdue: boolean
  daysOverdue: number
}

export interface ProjectReceivableRow {
  projectId: string
  projectName: string
  client: string
  revenue: number
  received: number
  outstanding: number
  pendingCount: number
  overdueCount: number
  overdueAmount: number
  nextDueDate: string | null
  pendingPayments: PendingReceivable[]
}

export interface PortfolioReceivables {
  totalOutstanding: number
  totalOverdue: number
  totalUpcoming7d: number
  projectsWithBalance: number
  overdueCount: number
  pendingCount: number
  byProject: ProjectReceivableRow[]
  allPending: PendingReceivable[]
}

function toPendingReceivable(
  p: Project,
  cp: ClientPayment,
  today: string,
): PendingReceivable {
  const overdue = isPaymentOverdue(cp, today)
  return {
    projectId: p.id,
    projectName: p.name,
    client: p.client,
    paymentId: cp.id,
    label: cp.label,
    amount: cp.amount,
    dueDate: cp.dueDate,
    isOverdue: overdue,
    daysOverdue: daysOverdue(cp, today),
  }
}

/** 포트폴리오 전체 미수금·회차별 현황 */
export function getPortfolioReceivables(
  projects: Project[],
  today = todayISO(),
): PortfolioReceivables {
  const byProject: ProjectReceivableRow[] = []
  const allPending: PendingReceivable[] = []
  let totalOutstanding = 0
  let totalOverdue = 0
  let totalUpcoming7d = 0
  let overdueCount = 0
  let pendingCount = 0

  const upcoming7 = getUpcomingPayments(projects, 7, today)
  const upcoming7Ids = new Set(
    upcoming7.map((u) => `${u.projectId}_${u.payment.id}`),
  )

  for (const p of projects) {
    const revenue = p.revenue
    const received = projectReceived(p)
    const outstanding = projectReceivableOutstanding(p)
    if (outstanding <= 0 && p.clientPayments.every((cp) => cp.isPaid)) continue

    const pendingPayments = p.clientPayments
      .filter((cp) => !cp.isPaid)
      .map((cp) => toPendingReceivable(p, cp, today))
      .sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return a.dueDate.localeCompare(b.dueDate)
      })

    const overduePayments = pendingPayments.filter((pp) => pp.isOverdue)
    const overdueAmount = overduePayments.reduce((s, pp) => s + pp.amount, 0)
    const nextDue = pendingPayments.find((pp) => pp.dueDate)?.dueDate ?? null

    for (const pp of pendingPayments) {
      allPending.push(pp)
      pendingCount += 1
      if (pp.isOverdue) {
        overdueCount += 1
        totalOverdue += pp.amount
      }
      if (upcoming7Ids.has(`${pp.projectId}_${pp.paymentId}`)) {
        totalUpcoming7d += pp.amount
      }
    }

    totalOutstanding += outstanding

    byProject.push({
      projectId: p.id,
      projectName: p.name,
      client: p.client,
      revenue,
      received,
      outstanding,
      pendingCount: pendingPayments.length,
      overdueCount: overduePayments.length,
      overdueAmount,
      nextDueDate: nextDue,
      pendingPayments,
    })
  }

  byProject.sort((a, b) => b.outstanding - a.outstanding)
  allPending.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1
    if (!a.dueDate && !b.dueDate) return b.amount - a.amount
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return a.dueDate.localeCompare(b.dueDate)
  })

  return {
    totalOutstanding,
    totalOverdue,
    totalUpcoming7d,
    projectsWithBalance: byProject.filter((r) => r.outstanding > 0).length,
    overdueCount,
    pendingCount,
    byProject,
    allPending,
  }
}
