import { TrendingDown, TrendingUp } from 'lucide-react'
import { formatKRW } from '../lib/format'

interface ProfitSummaryProps {
  revenue: number
  spent: number
  netProfit: number
  margin: number | null
  budget: number
  remaining: number
  committedRemaining: number
  unpaidLabor: number
  received: number
  outstanding: number
  cashInflow: number
  cashOutflow: number
  cashNet: number
}

export function ProfitSummary({
  revenue,
  spent,
  netProfit,
  margin,
  budget,
  remaining,
  committedRemaining,
  unpaidLabor,
  received,
  outstanding,
  cashInflow,
  cashOutflow,
  cashNet,
}: ProfitSummaryProps) {
  const positive = netProfit >= 0
  const cashPositive = cashNet >= 0

  return (
    <section className="profit-panel" aria-labelledby="profit-heading">
      <header className="section__head">
        <div>
          <h2 id="profit-heading">프로젝트 손익</h2>
          <p className="muted">발생 기준과 현금 기준을 구분해 확인하세요</p>
        </div>
      </header>

      <div className="profit-panel__grid profit-panel__grid--dual">
        <article className={`profit-hero ${positive ? '' : 'profit-hero--loss'}`}>
          <span className="label">
            <span className="basis-badge basis-badge--accrual">발생 기준</span>
            순수익
          </span>
          <strong>
            {positive ? (
              <TrendingUp size={22} aria-hidden />
            ) : (
              <TrendingDown size={22} aria-hidden />
            )}
            {formatKRW(netProfit)}
          </strong>
          <p>
            계약 {formatKRW(revenue)} − 집행 {formatKRW(spent)}
            {margin != null && ` · 마진 ${Math.round(margin * 100)}%`}
          </p>
        </article>

        <article className={`profit-hero profit-hero--cash ${cashPositive ? '' : 'profit-hero--loss'}`}>
          <span className="label">
            <span className="basis-badge basis-badge--cash">현금 기준</span>
            순현금
          </span>
          <strong>
            {cashPositive ? (
              <TrendingUp size={22} aria-hidden />
            ) : (
              <TrendingDown size={22} aria-hidden />
            )}
            {formatKRW(cashNet)}
          </strong>
          <p>
            입금 {formatKRW(cashInflow)} − 유출 {formatKRW(cashOutflow)}
          </p>
        </article>
      </div>

      <dl className="profit-facts profit-facts--wide">
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
        {unpaidLabor > 0 && (
          <div>
            <dt>약정 포함 잔여</dt>
            <dd className={committedRemaining < 0 ? 'danger' : 'warn-text'}>
              {committedRemaining < 0 ? '− ' : ''}
              {formatKRW(Math.abs(committedRemaining))}
              <span className="muted"> · 미지급 {formatKRW(unpaidLabor)}</span>
            </dd>
          </div>
        )}
      </dl>
    </section>
  )
}
