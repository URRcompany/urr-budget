import { MonthlyLedger } from './MonthlyLedger'
import { OverdueAlert } from './OverdueAlert'
import type { Project } from '../types'

interface WelcomePanelProps {
  projects: Project[]
  ledgerMonth: string
  onMonthChange: (month: string) => void
  onOpenProject?: (id: string) => void
}

export function WelcomePanel({
  projects,
  ledgerMonth,
  onMonthChange,
  onOpenProject,
}: WelcomePanelProps) {
  return (
    <div className="welcome-panel welcome-panel--simple">
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
