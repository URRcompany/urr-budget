import { useState } from 'react'
import { Banknote, FileText, FolderPlus, Trash2 } from 'lucide-react'
import type { PortfolioView } from '../types'
import {
  projectNetProfit,
  projectSpent,
  type Project,
} from '../types'
import { formatCompactKRW, formatKRW } from '../lib/format'
import { BackupControls } from './BackupControls'
import { UserBar } from './UserBar'
import { ProjectCreateModal } from './ProjectCreateModal'
import { AppBrand } from './AppBrand'

interface ProjectSidebarProps {
  projects: Project[]
  activeProjectId: string | null
  portfolio: {
    count: number
    revenue: number
    spent: number
    netProfit: number
  }
  portfolioView: PortfolioView
  totalOutstanding: number
  taxAttentionCount: number
  onSelect: (id: string) => void
  onShowReceivables: () => void
  onShowTax: () => void
  onShowProjects: () => void
  onDelete: (id: string) => void
  onCreate: (input: {
    name: string
    client: string
    shootDate: string
    contractAmount: number
    contractVatMode?: 'included' | 'separate' | 'exempt'
  }) => void
  onExportBackup: () => void
  onImportBackup: (
    file: File,
    mode: 'merge' | 'replace',
  ) => Promise<{ ok: boolean; error?: string; projectCount?: number }>
}

export function ProjectSidebar({
  projects,
  activeProjectId,
  portfolio,
  portfolioView,
  totalOutstanding,
  taxAttentionCount,
  onSelect,
  onShowReceivables,
  onShowTax,
  onShowProjects,
  onDelete,
  onCreate,
  onExportBackup,
  onImportBackup,
}: ProjectSidebarProps) {
  const [creating, setCreating] = useState(false)

  return (
    <aside className="sidebar sidebar--simple" aria-label="프로젝트 목록">
      <div className="sidebar__brand">
        <AppBrand size="sm" inverted />
      </div>

      <div className="sidebar__summary">
        <div>
          <span>순수익</span>
          <strong className={portfolio.netProfit >= 0 ? 'profit' : 'danger'}>
            {formatCompactKRW(portfolio.netProfit)}
          </strong>
        </div>
        <div>
          <span>프로젝트</span>
          <strong>{portfolio.count}</strong>
        </div>
      </div>

      <nav className="sidebar__nav sidebar__nav--simple" aria-label="메뉴">
        <button
          type="button"
          className={`sidebar-nav-btn ${portfolioView === 'receivables' ? 'sidebar-nav-btn--active' : ''}`}
          onClick={onShowReceivables}
        >
          <Banknote size={15} />
          미수금
          {totalOutstanding > 0 && (
            <span className="sidebar-nav-btn__count">{formatCompactKRW(totalOutstanding)}</span>
          )}
        </button>
        <button
          type="button"
          className={`sidebar-nav-btn ${portfolioView === 'tax' ? 'sidebar-nav-btn--active' : ''}`}
          onClick={onShowTax}
        >
          <FileText size={15} />
          세금
          {taxAttentionCount > 0 && (
            <span className="sidebar-nav-btn__count">{taxAttentionCount}</span>
          )}
        </button>
      </nav>

      <div className="sidebar__actions">
        <button
          type="button"
          className="btn btn--primary btn--block btn--sm"
          onClick={() => setCreating(true)}
        >
          <FolderPlus size={15} />
          새 프로젝트
        </button>
        <BackupControls compact onExport={onExportBackup} onImport={onImportBackup} />
      </div>

      <ProjectCreateModal
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={onCreate}
      />

      <nav className="sidebar__list" aria-label="프로젝트">
        {(portfolioView !== 'projects' || activeProjectId) && (
          <button type="button" className="sidebar__back-projects" onClick={onShowProjects}>
            ← 홈
          </button>
        )}
        {projects.length === 0 ? (
          <p className="sidebar__empty muted">프로젝트 없음</p>
        ) : (
          projects.map((p) => {
            const net = projectNetProfit(p)
            const spent = projectSpent(p)
            const active = p.id === activeProjectId
            return (
              <div key={p.id} className={`sidebar-item ${active ? 'sidebar-item--active' : ''}`}>
                <button
                  type="button"
                  className="sidebar-item__btn"
                  onClick={() => onSelect(p.id)}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="sidebar-item__name">{p.name}</span>
                  <span className="sidebar-item__meta">
                    <span className={net >= 0 ? 'profit' : 'danger'}>{formatKRW(net)}</span>
                    <span className="muted">{formatCompactKRW(spent)}</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn--danger sidebar-item__delete"
                  aria-label={`${p.name} 삭제`}
                  onClick={() => {
                    if (confirm(`「${p.name}」 프로젝트를 삭제할까요?`)) {
                      onDelete(p.id)
                    }
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })
        )}
      </nav>

      <UserBar compact />
    </aside>
  )
}
