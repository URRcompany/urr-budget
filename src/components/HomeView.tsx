import { useState } from 'react'
import { ChevronLeft, ChevronRight, FolderPlus } from 'lucide-react'
import type { Project } from '../types'
import {
  formatMonthLabel,
  monthKey,
  monthTotals,
  projectTotals,
  shiftMonth,
} from '../lib/money'
import { formatKRW } from '../lib/format'
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
  onCreate: (data: { name: string; client: string }) => void
  onExportBackup: () => void
  onImportBackup: (
    file: File,
    mode: 'merge' | 'replace',
  ) => Promise<{ ok: boolean; error?: string; projectCount?: number }>
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
  const totals = monthTotals(projects, month)
  const isCurrentMonth = month === monthKey()
  const monthNum = Number(month.split('-')[1])

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

      <SummaryCard
        profitLabel={isCurrentMonth ? '이번 달 수익' : `${monthNum}월 수익`}
        totals={totals}
      />

      <section className="panel">
        <header className="panel__head">
          <h2>프로젝트</h2>
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
            <p className="muted">프로젝트를 만들고 수입·인건비·지출을 입력하세요.</p>
          </div>
        ) : (
          <ul className="project-list">
            {projects.map((p) => {
              const t = projectTotals(p)
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    className="project-row"
                    onClick={() => onOpen(p.id)}
                  >
                    <div className="project-row__name">
                      <strong>{p.name}</strong>
                      {p.client && <span className="muted">{p.client}</span>}
                    </div>
                    <dl className="project-row__nums">
                      <div>
                        <dt>수입</dt>
                        <dd className="tabular-nums">{formatKRW(t.income)}</dd>
                      </div>
                      <div>
                        <dt>인건비</dt>
                        <dd className="tabular-nums">{formatKRW(t.labor)}</dd>
                      </div>
                      <div>
                        <dt>수익</dt>
                        <dd
                          className={`tabular-nums ${t.profit < 0 ? 'danger' : 'profit'}`}
                        >
                          {formatKRW(t.profit)}
                        </dd>
                      </div>
                    </dl>
                    <ChevronRight size={18} className="project-row__go" aria-hidden />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <footer className="shell__footer">
        <BackupControls compact onExport={onExportBackup} onImport={onImportBackup} />
      </footer>

      <ProjectFormModal
        open={creating}
        title="새 프로젝트"
        submitLabel="만들기"
        onClose={() => setCreating(false)}
        onSubmit={onCreate}
      />
    </div>
  )
}
