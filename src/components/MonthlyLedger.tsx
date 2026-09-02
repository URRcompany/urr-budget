import { ChevronLeft, ChevronRight, Download, TrendingDown, TrendingUp } from 'lucide-react'
import {
  breakdownPurchases,
  formatMonthLabel,
  getAvailableMonths,
  getMonthStats,
  getYearOverview,
  shiftMonth,
  type MonthStats,
} from '../lib/ledger'
import { exportMonthlyLedgerCSV, exportYearlySummaryCSV } from '../lib/export'
import type { Project } from '../types'
import { formatCompactKRW, formatKRW } from '../lib/format'

interface MonthlyLedgerProps {
  projects: Project[]
  month: string
  projectId?: string
  projectName?: string
  onMonthChange: (month: string) => void
  compact?: boolean
}

export function MonthlyLedger({
  projects,
  month,
  projectId,
  projectName,
  onMonthChange,
  compact = false,
}: MonthlyLedgerProps) {
  const stats = getMonthStats(projects, month, projectId)
  const breakdown = breakdownPurchases(projects, month, projectId)
  const available = getAvailableMonths(projects)
  const year = Number(month.slice(0, 4))
  const yearOverview = getYearOverview(projects, year, projectId)
  const maxBar = Math.max(stats.sales, stats.purchases, 1)
  const salesPct = Math.round((stats.sales / maxBar) * 100)
  const purchasePct = Math.round((stats.purchases / maxBar) * 100)

  return (
    <section
      className={`ledger-month ${compact ? 'ledger-month--compact' : ''}`}
      aria-labelledby="ledger-month-heading"
    >
      <header className="ledger-month__head">
        <div>
          <h2 id="ledger-month-heading">
            {projectName ? `${projectName} · ` : ''}월별 장부
          </h2>
          {!compact && (
            <p className="muted">실입금(매출) − 지출·인건비(매입) = 순이익</p>
          )}
        </div>
        <div className="ledger-month__actions">
          <div className="ledger-month__nav">
            <button
              type="button"
              className="icon-btn"
              aria-label="이전 달"
              onClick={() => onMonthChange(shiftMonth(month, -1))}
            >
              <ChevronLeft size={20} />
            </button>
            <strong className="ledger-month__label">{formatMonthLabel(month)}</strong>
            <button
              type="button"
              className="icon-btn"
              aria-label="다음 달"
              onClick={() => onMonthChange(shiftMonth(month, 1))}
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="ledger-month__export">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => exportMonthlyLedgerCSV(projects, month, projectId)}
            >
              <Download size={15} />
              CSV
            </button>
            {!compact && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => exportYearlySummaryCSV(projects, year)}
              >
                <Download size={15} />
                {year}년 요약
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="ledger-kpi">
        <article className="ledger-kpi__card ledger-kpi__card--sales">
          <span className="label">매출</span>
          <strong>{formatKRW(stats.sales)}</strong>
          {!compact && <p>클라이언트 실입금 {stats.incomeCount}건</p>}
        </article>
        <article className="ledger-kpi__card ledger-kpi__card--purchase">
          <span className="label">매입</span>
          <strong>{formatKRW(stats.purchases)}</strong>
          {!compact && (
            <p>
              지출 {formatCompactKRW(breakdown.expenses)}
              {breakdown.labor > 0 && ` · 인건비 ${formatCompactKRW(breakdown.labor)}`}
            </p>
          )}
        </article>
        <article
          className={`ledger-kpi__card ledger-kpi__card--net ${stats.net >= 0 ? '' : 'ledger-kpi__card--loss'}`}
        >
          <span className="label">순이익</span>
          <strong>
            {!compact && stats.net >= 0 ? (
              <TrendingUp size={20} aria-hidden />
            ) : !compact ? (
              <TrendingDown size={20} aria-hidden />
            ) : null}
            {formatKRW(stats.net)}
          </strong>
          {!compact && (
            <p>{stats.net >= 0 ? '흑字' : '적자'} · {stats.expenseCount}건 지출</p>
          )}
        </article>
      </div>

      {!compact && (
        <>
          <div className="ledger-bars" aria-hidden>
            <div className="ledger-bar-row">
              <span>매출</span>
              <div className="ledger-bar-track">
                <div
                  className="ledger-bar-fill ledger-bar-fill--sales"
                  style={{ width: `${salesPct}%` }}
                />
              </div>
            </div>
            <div className="ledger-bar-row">
              <span>매입</span>
              <div className="ledger-bar-track">
                <div
                  className="ledger-bar-fill ledger-bar-fill--purchase"
                  style={{ width: `${purchasePct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="ledger-month-pills" role="tablist" aria-label="월 선택">
            {available.slice(0, 8).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={m === month}
                className={`chip ${m === month ? 'chip--active' : ''}`}
                onClick={() => onMonthChange(m)}
              >
                {formatMonthLabel(m).replace(/년 /, '.').replace(/월/, '')}
              </button>
            ))}
          </div>

          <YearStrip months={yearOverview.months} activeMonth={month} onSelect={onMonthChange} />
        </>
      )}
    </section>
  )
}

function YearStrip({
  months,
  activeMonth,
  onSelect,
}: {
  months: MonthStats[]
  activeMonth: string
  onSelect: (m: string) => void
}) {
  const max = Math.max(...months.map((m) => Math.max(m.sales, m.purchases)), 1)

  return (
    <div className="year-strip">
      <p className="year-strip__title muted">{months[0]?.month.slice(0, 4)}년 월별 순이익</p>
      <div className="year-strip__grid">
        {months.map((m) => {
          const h = Math.max(Math.round((Math.abs(m.net) / max) * 100), m.net !== 0 ? 8 : 4)
          const active = m.month === activeMonth
          return (
            <button
              key={m.month}
              type="button"
              className={`year-strip__cell ${active ? 'year-strip__cell--active' : ''}`}
              onClick={() => onSelect(m.month)}
              title={`${m.label}: ${formatKRW(m.net)}`}
            >
              <div
                className={`year-strip__bar ${m.net >= 0 ? 'year-strip__bar--up' : 'year-strip__bar--down'}`}
                style={{ height: `${h}%` }}
              />
              <span>{Number(m.month.slice(5))}월</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
