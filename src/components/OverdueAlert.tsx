import { AlertTriangle, CalendarClock } from 'lucide-react'
import { getOverduePayments, getUpcomingPayments } from '../lib/receivables'
import type { Project } from '../types'
import { formatDate, formatKRW } from '../lib/format'

interface OverdueAlertProps {
  projects: Project[]
  onOpenProject?: (projectId: string) => void
}

export function OverdueAlert({ projects, onOpenProject }: OverdueAlertProps) {
  const overdue = getOverduePayments(projects)
  const upcoming = getUpcomingPayments(projects, 7)

  if (overdue.length === 0 && upcoming.length === 0) return null

  return (
    <section className="overdue-alert" aria-labelledby="overdue-heading">
      {overdue.length > 0 && (
        <div className="overdue-alert__block overdue-alert__block--danger">
          <header>
            <AlertTriangle size={18} aria-hidden />
            <h2 id="overdue-heading">연체 미수금 {overdue.length}건</h2>
          </header>
          <ul>
            {overdue.map((o) => (
              <li key={`${o.projectId}_${o.payment.id}`}>
                <button
                  type="button"
                  className="overdue-alert__item"
                  onClick={() => onOpenProject?.(o.projectId)}
                >
                  <span className="overdue-alert__title">
                    {o.projectName} · {o.payment.label}
                  </span>
                  <span className="overdue-alert__meta">
                    {formatKRW(o.payment.amount)} · 예정 {formatDate(o.payment.dueDate)} ·{' '}
                    <strong>{o.daysOverdue}일 연체</strong>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="overdue-alert__block overdue-alert__block--soon">
          <header>
            <CalendarClock size={18} aria-hidden />
            <h2>7일 내 입금 예정 {upcoming.length}건</h2>
          </header>
          <ul>
            {upcoming.map((o) => (
              <li key={`up_${o.projectId}_${o.payment.id}`}>
                <button
                  type="button"
                  className="overdue-alert__item"
                  onClick={() => onOpenProject?.(o.projectId)}
                >
                  <span className="overdue-alert__title">
                    {o.projectName} · {o.payment.label}
                  </span>
                  <span className="overdue-alert__meta">
                    {formatKRW(o.payment.amount)} · {formatDate(o.payment.dueDate)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
