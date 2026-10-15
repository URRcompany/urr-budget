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
      <dl className="summary__flow">
        <div>
          <dt className="summary__label">들어온 돈</dt>
          <dd className="summary__in tabular-nums">+{formatKRW(totals.income)}</dd>
        </div>
        <div>
          <dt className="summary__label">나간 돈</dt>
          <dd className="summary__out tabular-nums">−{formatKRW(totals.expense)}</dd>
        </div>
      </dl>
      <ul className="summary__breakdown" aria-label="나간 돈 내역">
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
