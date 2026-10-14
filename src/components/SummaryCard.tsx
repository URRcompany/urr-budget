import type { Totals } from '../lib/money'
import { formatKRW } from '../lib/format'

interface SummaryCardProps {
  profitLabel: string
  totals: Totals
}

export function SummaryCard({ profitLabel, totals }: SummaryCardProps) {
  return (
    <section className="summary" aria-label="요약">
      <div className="summary__main">
        <span className="summary__label">{profitLabel}</span>
        <strong
          className={`summary__profit tabular-nums ${totals.profit < 0 ? 'summary__profit--loss' : ''}`}
        >
          {formatKRW(totals.profit)}
        </strong>
      </div>
      <div className="summary__flow">
        <div>
          <span className="summary__label">수입</span>
          <strong className="tabular-nums">{formatKRW(totals.income)}</strong>
        </div>
        <span className="summary__minus" aria-hidden>
          −
        </span>
        <div>
          <span className="summary__label">지출</span>
          <strong className="tabular-nums">{formatKRW(totals.expense)}</strong>
        </div>
      </div>
      <ul className="summary__breakdown">
        <li>
          <span>인건비</span>
          <strong className="tabular-nums">{formatKRW(totals.labor)}</strong>
        </li>
        <li>
          <span>장비 렌탈</span>
          <strong className="tabular-nums">{formatKRW(totals.equipment)}</strong>
        </li>
        <li>
          <span>식비·기타</span>
          <strong className="tabular-nums">{formatKRW(totals.misc)}</strong>
        </li>
      </ul>
    </section>
  )
}
