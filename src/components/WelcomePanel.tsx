import { Film } from 'lucide-react'
import { MonthlyLedger } from './MonthlyLedger'
import { LedgerTimeline } from './LedgerTimeline'
import type { Project } from '../types'

interface WelcomePanelProps {
  projects: Project[]
  ledgerMonth: string
  onMonthChange: (month: string) => void
}

export function WelcomePanel({
  projects,
  ledgerMonth,
  onMonthChange,
}: WelcomePanelProps) {
  return (
    <div className="welcome-panel welcome-panel--ledger">
      <MonthlyLedger
        projects={projects}
        month={ledgerMonth}
        onMonthChange={onMonthChange}
      />
      <LedgerTimeline
        projects={projects}
        month={ledgerMonth}
      />
      {projects.length === 0 ? (
        <div className="welcome-panel__empty">
          <Film size={32} strokeWidth={1.5} aria-hidden />
          <p>프로젝트를 추가하면 월별 매출·매입 장부가 채워집니다.</p>
        </div>
      ) : (
        <p className="welcome-panel__hint muted">
          왼쪽에서 프로젝트를 선택하면 프로젝트별 장부를 볼 수 있습니다.
        </p>
      )}
    </div>
  )
}
