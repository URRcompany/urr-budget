import { TrendingDown, TrendingUp } from 'lucide-react'
import { formatKRW } from '../lib/format'

interface ProfitSummaryProps {
  revenue: number
  spent: number
  netProfit: number
  margin: number | null
  budget: number
  remaining: number
  received: number
  outstanding: number
}

export function ProfitSummary({
  revenue,
  spent,
  netProfit,
  margin,
  budget,
  remaining,
  received,
  outstanding,
}: ProfitSummaryProps) {
  const positive = netProfit >= 0

  return (
    <section className="profit-panel" aria-labelledby="profit-heading">
      <header className="section__head">
        <div>
          <h2 id="profit-heading">최종 순수익</h2>
          <p className="muted">계약 금액 − 총 집행 비용</p>
        </div>
      </header>

      <div className="profit-panel__grid">
        <article className={`profit-hero ${positive ? '' : 'profit-hero--loss'}`}>
          <span className="label">순수익</span>
          <strong>
            {positive ? (
              <TrendingUp size={22} aria-hidden />
            ) : (
              <TrendingDown size={22} aria-hidden />
            )}
            {formatKRW(netProfit)}
          </strong>
          <p>
            {margin == null
              ? '계약 금액을 입력하면 마진율을 볼 수 있습니다'
              : `마진율 ${Math.round(margin * 100)}%`}
          </p>
        </article>

        <dl className="profit-facts">
          <div>
            <dt>계약·매출</dt>
            <dd>{formatKRW(revenue)}</dd>
          </div>
          <div>
            <dt>입금 완료</dt>
            <dd className="profit">{formatKRW(received)}</dd>
          </div>
          <div>
            <dt>미수금</dt>
            <dd className={outstanding > 0 ? 'warn-text' : 'profit'}>
              {formatKRW(outstanding)}
            </dd>
          </div>
          <div>
            <dt>총 집행 비용</dt>
            <dd>− {formatKRW(spent)}</dd>
          </div>
          <div>
            <dt>제작 예산</dt>
            <dd>{formatKRW(budget)}</dd>
          </div>
          <div>
            <dt>예산 잔여</dt>
            <dd className={remaining < 0 ? 'danger' : ''}>
              {remaining < 0 ? '− ' : ''}
              {formatKRW(Math.abs(remaining))}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
