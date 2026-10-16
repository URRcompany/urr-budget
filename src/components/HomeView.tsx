import { useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, FolderPlus } from 'lucide-react'
import type { Project, ProjectDraft } from '../types'
import {
  formatMonthLabel,
  monthKey,
  monthTotals,
  projectMonthTotals,
  projectTouchesMonth,
  shiftMonth,
  todayISO,
  type Totals,
} from '../lib/money'
import { formatCompactKRW, formatKRW, formatShortDate } from '../lib/format'
import { AppBrand } from './AppBrand'
import { UserBar } from './UserBar'
import { BackupControls } from './BackupControls'
import { SummaryCard } from './SummaryCard'
import { ProjectFormModal } from './ProjectFormModal'

interface HomeViewProps {
  projects: Project[]
  month: string
  onMonthChange: (month: string) => void
  onOpen: (id: string) => void
  onCreate: (data: ProjectDraft) => void
  onExportBackup: () => void
  onImportBackup: (
    file: File,
    mode: 'merge' | 'replace',
  ) => Promise<{ ok: boolean; error?: string; projectCount?: number }>
}

function ProjectRow({
  project,
  totals,
  onOpen,
}: {
  project: Project
  totals: Totals | null
  onOpen: (id: string) => void
}) {
  return (
    <li>
      <button type="button" className="project-row" onClick={() => onOpen(project.id)}>
        <span className="project-row__name">
          <strong>{project.name}</strong>
          {(project.date || project.client) && (
            <span className="muted">
              {[project.date ? formatShortDate(project.date) : '', project.client]
                .filter(Boolean)
                .join(' · ')}
            </span>
          )}
        </span>
        {totals ? (
          <>
            <span className="project-row__flow tabular-nums">
              <span className="amount-in">+{formatCompactKRW(totals.income)}</span>
              <span className="muted"> / </span>
              <span>−{formatCompactKRW(totals.expense)}</span>
            </span>
            <strong
              className={`project-row__profit tabular-nums ${totals.profit < 0 ? 'amount-loss' : ''}`}
            >
              {formatKRW(totals.profit)}
            </strong>
          </>
        ) : (
          <span className="project-row__flow muted">이 달 기록 없음</span>
        )}
        <ChevronRight size={18} className="project-row__go" aria-hidden />
      </button>
    </li>
  )
}

export function HomeView({
  projects,
  month,
  onMonthChange,
  onOpen,
  onCreate,
  onExportBackup,
  onImportBackup,
}: HomeViewProps) {
  const [creating, setCreating] = useState(false)
  const [showIdle, setShowIdle] = useState(false)
  const totals = monthTotals(projects, month)
  const isCurrentMonth = month === monthKey()
  const monthNum = Number(month.split('-')[1])
  const monthWord = isCurrentMonth ? '이번 달' : `${monthNum}월`

  const active: { project: Project; totals: Totals | null }[] = []
  const idle: Project[] = []
  for (const p of projects) {
    if (projectTouchesMonth(p, month)) {
      const hasEntries = p.entries.some((e) => e.date.startsWith(month))
      active.push({ project: p, totals: hasEntries ? projectMonthTotals(p, month) : null })
    } else {
      idle.push(p)
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <AppBrand size="sm" />
        <UserBar compact />
      </header>

      <nav className="month-switch" aria-label="월 선택">
        <button
          type="button"
          className="icon-btn"
          aria-label="이전 달"
          onClick={() => onMonthChange(shiftMonth(month, -1))}
        >
          <ChevronLeft size={20} />
        </button>
        <h1>{formatMonthLabel(month)}</h1>
        <button
          type="button"
          className="icon-btn"
          aria-label="다음 달"
          onClick={() => onMonthChange(shiftMonth(month, 1))}
        >
          <ChevronRight size={20} />
        </button>
        {!isCurrentMonth && (
          <button
            type="button"
            className="btn btn--ghost btn--sm month-switch__today"
            onClick={() => onMonthChange(monthKey())}
          >
            이번 달
          </button>
        )}
      </nav>

      <SummaryCard profitLabel={`${monthWord} 수익`} totals={totals} />

      <section className="panel">
        <header className="panel__head">
          <h2>{monthWord} 프로젝트</h2>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => setCreating(true)}
          >
            <FolderPlus size={16} />
            새 프로젝트
          </button>
        </header>

        {projects.length === 0 ? (
          <div className="empty">
            <p>아직 프로젝트가 없습니다.</p>
            <p className="muted">「새 프로젝트」를 눌러 시작하세요.</p>
          </div>
        ) : (
          <>
            {active.length === 0 ? (
              <p className="panel__empty muted">{monthWord}에 기록된 프로젝트가 없습니다.</p>
            ) : (
              <ul className="project-list">
                {active.map(({ project, totals: t }) => (
                  <ProjectRow key={project.id} project={project} totals={t} onOpen={onOpen} />
                ))}
              </ul>
            )}

            {idle.length > 0 && (
              <div className="idle-projects">
                <button
                  type="button"
                  className="idle-projects__toggle"
                  aria-expanded={showIdle}
                  onClick={() => setShowIdle((v) => !v)}
                >
                  기록 없는 프로젝트 {idle.length}개
                  <ChevronDown
                    size={16}
                    className={showIdle ? 'icon-rotated' : undefined}
                    aria-hidden
                  />
                </button>
                {showIdle && (
                  <ul className="project-list">
                    {idle.map((p) => (
                      <ProjectRow key={p.id} project={p} totals={null} onOpen={onOpen} />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </section>

      <footer className="shell__footer">
        <BackupControls compact onExport={onExportBackup} onImport={onImportBackup} />
      </footer>

      <ProjectFormModal
        open={creating}
        title="새 프로젝트"
        submitLabel="만들기"
        initial={{ name: '', client: '', date: todayISO() }}
        onClose={() => setCreating(false)}
        onSubmit={onCreate}
      />
    </div>
  )
}
