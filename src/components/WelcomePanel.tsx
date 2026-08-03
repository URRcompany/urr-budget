import { Film } from 'lucide-react'

interface WelcomePanelProps {
  projectCount: number
}

export function WelcomePanel({ projectCount }: WelcomePanelProps) {
  return (
    <div className="welcome-panel">
      <div className="welcome-panel__icon" aria-hidden>
        <Film size={40} strokeWidth={1.5} />
      </div>
      <h2>프로젝트를 선택하세요</h2>
      <p className="muted">
        왼쪽 목록에서 프로젝트를 고르거나 새로 만들어 예산·지출·순수익을
        관리하세요.
      </p>
      {projectCount === 0 && (
        <p className="welcome-panel__hint">
          「새 프로젝트」 버튼으로 첫 프로젝트를 추가해 보세요.
        </p>
      )}
    </div>
  )
}
