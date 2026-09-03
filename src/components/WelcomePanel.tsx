import { Banknote, FileText } from 'lucide-react'
import { MonthlyLedger } from './MonthlyLedger'
import { OverdueAlert } from './OverdueAlert'
import { formatCompactKRW, formatKRW } from '../lib/format'
import type { Project } from '../types'

interface WelcomePanelProps {
  projects: Project[]
  portfolio: {
    count: number
    netProfit: number
  }
  totalOutstanding: number
  taxAttentionCount: number
  ledgerMonth: string
  onMonthChange: (month: string) => void
  onOpenProject?: (id: string) => void
  onShowReceivables?: () => void
  onShowTax?: () => void
}

export function WelcomePanel({
  projects,
  portfolio,
  totalOutstanding,
  taxAttentionCount,
  ledgerMonth,
  onMonthChange,
  onOpenProject,
  onShowReceivables,
  onShowTax,
}: WelcomePanelProps) {
  return (
    <div className="welcome-panel welcome-panel--simple">
      <section className="home-summary home-summary--desktop" aria-label="요약">
        <div className="home-summary__main">
          <span className="label">전체 순수익</span>
          <strong className={portfolio.netProfit >= 0 ? 'profit' : 'danger'}>
            {formatKRW(portfolio.netProfit)}
          </strong>
        </div>
        <div className="home-summary__row">
          <div>
            <span className="label">미수금</span>
            <strong className={totalOutstanding > 0 ? 'warn-text' : undefined}>
              {formatCompactKRW(totalOutstanding)}
            </strong>
          </div>
          <div>
            <span className="label">프로젝트</span>
            <strong>{portfolio.count}</strong>
          </div>
        </div>
        {(onShowReceivables || onShowTax) && (
          <div className="home-summary__links">
            {onShowReceivables && (
              <button type="button" className="home-link" onClick={onShowReceivables}>
                <Banknote size={15} />
                미수금
              </button>
            )}
            {onShowTax && (
              <button type="button" className="home-link" onClick={onShowTax}>
                <FileText size={15} />
                세금
                {taxAttentionCount > 0 && (
                  <span className="home-link__dot" aria-label={`${taxAttentionCount}건`} />
                )}
              </button>
            )}
          </div>
        )}
      </section>

      <OverdueAlert projects={projects} onOpenProject={onOpenProject} />
      <MonthlyLedger
        compact
        projects={projects}
        month={ledgerMonth}
        onMonthChange={onMonthChange}
      />
      {projects.length === 0 && (
        <p className="welcome-panel__empty muted">왼쪽에서 새 프로젝트를 추가하세요.</p>
      )}
    </div>
  )
}
