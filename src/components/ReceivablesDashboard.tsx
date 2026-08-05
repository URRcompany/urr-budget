import { AlertTriangle, Banknote, CalendarClock, CheckCircle2 } from 'lucide-react'
import { getPortfolioReceivables } from '../lib/receivables'
import { formatDate, formatKRW } from '../lib/format'
import type { Project } from '../types'
import { AppBrand } from './AppBrand'

interface ReceivablesDashboardProps {
  projects: Project[]
  onOpenProject: (projectId: string) => void
  showBack?: boolean
  onBack?: () => void
}

export function ReceivablesDashboard({
  projects,
  onOpenProject,
  showBack,
  onBack,
}: ReceivablesDashboardProps) {
  const data = getPortfolioReceivables(projects)
  const allClear = data.totalOutstanding <= 0 && data.pendingCount === 0

  return (
    <div className="receivables-page">
      <header className="receivables-page__hero">
        {showBack && onBack && (
          <button type="button" className="btn btn--ghost btn--sm receivables-page__back" onClick={onBack}>
            ← 홈으로
          </button>
        )}
        <div>
          <AppBrand size="sm" />
          <h1 className="receivables-page__title">미수금 현황</h1>
          <p className="muted">프로젝트별로 받아야 할 금액과 입금 회차를 확인하세요.</p>
        </div>

        <div className="receivables-summary">
          <article className={`receivables-summary__card ${data.totalOutstanding > 0 ? 'receivables-summary__card--primary' : ''}`}>
            <Banknote size={20} aria-hidden />
            <span className="label">총 미수금</span>
            <strong className={data.totalOutstanding > 0 ? 'warn-text' : 'profit'}>
              {formatKRW(data.totalOutstanding)}
            </strong>
            <span className="muted">
              {data.projectsWithBalance}개 프로젝트 · 미입금 {data.pendingCount}건
            </span>
          </article>
          <article className={`receivables-summary__card ${data.totalOverdue > 0 ? 'receivables-summary__card--danger' : ''}`}>
            <AlertTriangle size={20} aria-hidden />
            <span className="label">연체</span>
            <strong className={data.totalOverdue > 0 ? 'danger' : ''}>
              {formatKRW(data.totalOverdue)}
            </strong>
            <span className="muted">{data.overdueCount}건</span>
          </article>
          <article className="receivables-summary__card">
            <CalendarClock size={20} aria-hidden />
            <span className="label">7일 내 입금 예정</span>
            <strong>{formatKRW(data.totalUpcoming7d)}</strong>
            <span className="muted">예정일 기준</span>
          </article>
        </div>
      </header>

      {allClear ? (
        <div className="empty receivables-page__empty">
          <CheckCircle2 size={36} strokeWidth={1.5} aria-hidden />
          <p>현재 미수금이 없습니다.</p>
          <p className="muted">모든 프로젝트 입금이 완료되었거나, 계약·입금 회차가 등록되지 않았습니다.</p>
        </div>
      ) : (
        <>
          {data.allPending.length > 0 && (
            <section className="section receivables-section" aria-labelledby="pending-payments-heading">
              <header className="section__head">
                <div>
                  <h2 id="pending-payments-heading">미입금 회차</h2>
                  <p className="muted">예정일 순 · 연체 우선</p>
                </div>
              </header>
              <ul className="receivables-list">
                {data.allPending.map((item) => (
                  <li key={`${item.projectId}_${item.paymentId}`}>
                    <button
                      type="button"
                      className={`receivables-row ${item.isOverdue ? 'receivables-row--overdue' : ''}`}
                      onClick={() => onOpenProject(item.projectId)}
                    >
                      <div className="receivables-row__main">
                        <span className="receivables-row__title">
                          {item.projectName}
                          {item.client && <span className="muted"> · {item.client}</span>}
                        </span>
                        <span className="receivables-row__meta muted">
                          {item.label}
                          {item.dueDate ? (
                            <> · 예정 {formatDate(item.dueDate)}</>
                          ) : (
                            <> · 예정일 미정</>
                          )}
                          {item.isOverdue && (
                            <strong className="danger"> · {item.daysOverdue}일 연체</strong>
                          )}
                        </span>
                      </div>
                      <span className="receivables-row__amount">{formatKRW(item.amount)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="section receivables-section" aria-labelledby="by-project-heading">
            <header className="section__head">
              <div>
                <h2 id="by-project-heading">프로젝트별 미수금</h2>
                <p className="muted">계약 대비 입금 잔액</p>
              </div>
            </header>
            <div className="receivables-table-wrap">
              <table className="receivables-table">
                <thead>
                  <tr>
                    <th scope="col">프로젝트</th>
                    <th scope="col" className="num">계약</th>
                    <th scope="col" className="num">입금</th>
                    <th scope="col" className="num">미수금</th>
                    <th scope="col">다음 예정</th>
                    <th scope="col">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byProject.map((row) => (
                    <tr key={row.projectId}>
                      <td>
                        <button
                          type="button"
                          className="receivables-table__link"
                          onClick={() => onOpenProject(row.projectId)}
                        >
                          <strong>{row.projectName}</strong>
                          {row.client && <span className="muted">{row.client}</span>}
                        </button>
                      </td>
                      <td className="num">{formatKRW(row.revenue)}</td>
                      <td className="num profit">{formatKRW(row.received)}</td>
                      <td className="num">
                        <strong className={row.outstanding > 0 ? 'warn-text' : 'profit'}>
                          {formatKRW(row.outstanding)}
                        </strong>
                      </td>
                      <td>
                        {row.nextDueDate ? formatDate(row.nextDueDate) : '—'}
                      </td>
                      <td>
                        {row.overdueCount > 0 ? (
                          <span className="badge badge--danger">연체 {row.overdueCount}</span>
                        ) : row.pendingCount > 0 ? (
                          <span className="badge badge--warn">미입금 {row.pendingCount}</span>
                        ) : row.outstanding > 0 ? (
                          <span className="badge badge--warn">회차 미등록</span>
                        ) : (
                          <span className="badge badge--ok">완료</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>합계</td>
                    <td className="num">—</td>
                    <td className="num">—</td>
                    <td className="num">
                      <strong className="warn-text">{formatKRW(data.totalOutstanding)}</strong>
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
