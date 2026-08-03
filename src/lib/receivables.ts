import type { ClientPayment, Project } from '../types'

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
