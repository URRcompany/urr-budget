import { useState } from 'react'
import { Banknote, FolderPlus, Trash2 } from 'lucide-react'
import type { PortfolioView } from '../types'
import {
  projectClientPaymentProgress,
  projectLaborStats,
  projectNetProfit,
  projectSpent,
  type Project,
} from '../types'
import { formatCompactKRW, formatKRW } from '../lib/format'
import { BackupControls } from './BackupControls'
import { UserBar } from './UserBar'

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
  onSelect: (id: string) => void
  onShowReceivables: () => void
  onShowProjects: () => void
  onDelete: (id: string) => void
  onCreate: (input: {
    name: string
    client: string
    shootDate: string
    revenue: number
    totalBudget: number
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
  onSelect,
  onShowReceivables,
  onShowProjects,
  onDelete,
  onCreate,
  onExportBackup,
  onImportBackup,
}: ProjectSidebarProps) {
  const [creating, setCreating] = useState(false)

  return (
    <aside className="sidebar" aria-label="프로젝트 목록">
      <div className="sidebar__brand">
        <p className="sidebar__logo">ReelBudget</p>
        <span className="sidebar__badge">PC</span>
      </div>

      <div className="sidebar__portfolio">
        <div className="sidebar__stat">
          <span>합산 순수익</span>
          <strong className={portfolio.netProfit >= 0 ? 'profit' : 'danger'}>
            {formatCompactKRW(portfolio.netProfit)}
          </strong>
        </div>
        <div className="sidebar__stat-row">
          <div>
            <span>계약</span>
            <strong>{formatCompactKRW(portfolio.revenue)}</strong>
          </div>
          <div>
            <span>미수금</span>
            <strong className={totalOutstanding > 0 ? 'warn-text' : 'profit'}>
              {formatCompactKRW(totalOutstanding)}
            </strong>
          </div>
          <div>
            <span>프로젝트</span>
            <strong>{portfolio.count}</strong>
          </div>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="메뉴">
        <button
          type="button"
          className={`sidebar-nav-btn ${portfolioView === 'receivables' ? 'sidebar-nav-btn--active' : ''}`}
          onClick={onShowReceivables}
        >
          <Banknote size={16} />
          미수금 현황
          {totalOutstanding > 0 && (
            <span className="sidebar-nav-btn__badge">{formatCompactKRW(totalOutstanding)}</span>
          )}
        </button>
      </nav>

      <div className="sidebar__actions">
        <button
          type="button"
          className="btn btn--primary btn--block"
          onClick={() => setCreating((v) => !v)}
        >
          <FolderPlus size={16} />
          새 프로젝트
        </button>
        <BackupControls
          compact
          onExport={onExportBackup}
          onImport={onImportBackup}
        />
      </div>

      {creating && (
        <form
          className="sidebar__create"
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            onCreate({
              name: String(fd.get('name') || ''),
              client: String(fd.get('client') || ''),
              shootDate: String(fd.get('shootDate') || ''),
              revenue: Math.max(0, Number(fd.get('revenue')) || 0),
              totalBudget: Math.max(0, Number(fd.get('totalBudget')) || 0),
            })
            setCreating(false)
          }}
        >
          <input name="name" required placeholder="프로젝트명" autoFocus />
          <input name="client" placeholder="클라이언트" />
          <div className="sidebar__create-row">
            <input name="revenue" type="number" min={0} step={100000} placeholder="계약액" />
            <input
              name="totalBudget"
              type="number"
              min={0}
              step={100000}
              placeholder="예산"
            />
          </div>
          <input name="shootDate" type="date" />
          <div className="form-actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setCreating(false)}>
              취소
            </button>
            <button type="submit" className="btn btn--primary btn--sm">
              만들기
            </button>
          </div>
        </form>
      )}

      <nav className="sidebar__list" aria-label="프로젝트">
        {portfolioView === 'receivables' && (
          <button
            type="button"
            className="sidebar__back-projects muted"
            onClick={onShowProjects}
          >
            ← 프로젝트 목록으로
          </button>
        )}
        {projects.length === 0 ? (
          <p className="sidebar__empty muted">프로젝트가 없습니다</p>
        ) : (
          projects.map((p) => {
            const spent = projectSpent(p)
            const net = projectNetProfit(p)
            const active = p.id === activeProjectId
            const clientPay = projectClientPaymentProgress(p)
            const labor = projectLaborStats(p)
            return (
              <div
                key={p.id}
                className={`sidebar-item ${active ? 'sidebar-item--active' : ''}`}
              >
                <button
                  type="button"
                  className="sidebar-item__btn"
                  onClick={() => onSelect(p.id)}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="sidebar-item__name">{p.name}</span>
                  {p.client && (
                    <span className="sidebar-item__client">{p.client}</span>
                  )}
                  <span className="sidebar-item__meta">
                    <span className={net >= 0 ? 'profit' : 'danger'}>
                      {formatKRW(net)}
                    </span>
                    <span className="muted">집행 {formatCompactKRW(spent)}</span>
                  </span>
                  <span className="sidebar-item__flags">
                    {!clientPay.allPaid && p.clientPayments.length > 0 && (
                      <span className="sidebar-flag sidebar-flag--warn">미수</span>
                    )}
                    {clientPay.allPaid && p.clientPayments.length > 0 && (
                      <span className="sidebar-flag sidebar-flag--ok">입금완료</span>
                    )}
                    {labor.unpaidCount > 0 && (
                      <span className="sidebar-flag sidebar-flag--warn">
                        미지급 {labor.unpaidCount}
                      </span>
                    )}
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
                  <Trash2 size={14} />
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
