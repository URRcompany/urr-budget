import { useState } from 'react'
import { FolderPlus, RotateCcw, Trash2 } from 'lucide-react'
import {
  projectClientPaymentProgress,
  projectLaborStats,
  projectNetProfit,
  projectSpent,
  type Project,
} from '../types'
import { formatCompactKRW, formatKRW } from '../lib/format'

interface ProjectSidebarProps {
  projects: Project[]
  activeProjectId: string | null
  portfolio: {
    count: number
    revenue: number
    spent: number
    netProfit: number
  }
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onCreate: (input: {
    name: string
    client: string
    shootDate: string
    revenue: number
    totalBudget: number
  }) => void
  onResetSamples: () => void
}

export function ProjectSidebar({
  projects,
  activeProjectId,
  portfolio,
  onSelect,
  onDelete,
  onCreate,
  onResetSamples,
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
            <span>집행</span>
            <strong>{formatCompactKRW(portfolio.spent)}</strong>
          </div>
          <div>
            <span>프로젝트</span>
            <strong>{portfolio.count}</strong>
          </div>
        </div>
      </div>

      <div className="sidebar__actions">
        <button
          type="button"
          className="btn btn--primary btn--block"
          onClick={() => setCreating((v) => !v)}
        >
          <FolderPlus size={16} />
          새 프로젝트
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm btn--block"
          onClick={() => {
            if (
              confirm(
                '샘플 프로젝트로 초기화할까요? 현재 데이터가 모두 덮어씌워집니다.',
              )
            ) {
              onResetSamples()
            }
          }}
        >
          <RotateCcw size={14} />
          샘플 불러오기
        </button>
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
    </aside>
  )
}
