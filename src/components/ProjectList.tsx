import { useState } from 'react'
import { Banknote, FileText, FolderPlus, Trash2 } from 'lucide-react'
import {
  projectClientPaymentProgress,
  projectLaborStats,
  projectNetProfit,
  projectSpent,
  type Project,
} from '../types'
import { formatCompactKRW, formatKRW } from '../lib/format'
import { AppBrand } from './AppBrand'
import { UserBar } from './UserBar'
import { BackupControls } from './BackupControls'
import { ProjectCreateModal } from './ProjectCreateModal'
import { getMonthStats, monthKey } from '../lib/ledger'
import { MonthlyLedger } from './MonthlyLedger'
import { OverdueAlert } from './OverdueAlert'

interface ProjectListProps {
  projects: Project[]
  portfolio: {
    count: number
    revenue: number
    spent: number
    netProfit: number
  }
  totalOutstanding: number
  taxAttentionCount: number
  ledgerMonth: string
  onMonthChange: (month: string) => void
  onOpen: (id: string) => void
  onShowReceivables: () => void
  onShowTax: () => void
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

export function ProjectList({
  projects,
  portfolio,
  totalOutstanding,
  taxAttentionCount,
  ledgerMonth,
  onMonthChange,
  onOpen,
  onShowReceivables,
  onShowTax,
  onDelete,
  onCreate,
  onExportBackup,
  onImportBackup,
}: ProjectListProps) {
  const [creating, setCreating] = useState(false)
  const thisMonth = getMonthStats(projects, monthKey())

  return (
    <div className="home home--simple">
      <header className="home-top">
        <AppBrand />
        <UserBar compact />
      </header>

      <section className="home-summary" aria-label="요약">
        <div className="home-summary__main">
          <span className="label">이번 달 순이익</span>
          <strong className={thisMonth.net >= 0 ? 'profit' : 'danger'}>
            {formatKRW(thisMonth.net)}
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
        <div className="home-summary__links">
          <button type="button" className="home-link" onClick={onShowReceivables}>
            <Banknote size={15} />
            미수금
          </button>
          <button type="button" className="home-link" onClick={onShowTax}>
            <FileText size={15} />
            세금
            {taxAttentionCount > 0 && (
              <span className="home-link__dot" aria-label={`${taxAttentionCount}건`} />
            )}
          </button>
        </div>
      </section>

      <section className="section section--ledger section--compact">
        <OverdueAlert projects={projects} onOpenProject={onOpen} />
        <MonthlyLedger
          compact
          projects={projects}
          month={ledgerMonth}
          onMonthChange={onMonthChange}
        />
      </section>

      <section className="section">
        <header className="section__head section__head--tight">
          <h2>프로젝트</h2>
          <div className="section__actions">
            <BackupControls compact onExport={onExportBackup} onImport={onImportBackup} />
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => setCreating(true)}
            >
              <FolderPlus size={16} />
              새 프로젝트
            </button>
          </div>
        </header>

        {projects.length === 0 ? (
          <div className="empty empty--simple">
            <p>프로젝트가 없습니다.</p>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setCreating(true)}
            >
              <FolderPlus size={16} />
              첫 프로젝트 만들기
            </button>
          </div>
        ) : (
          <ul className="project-list">
            {projects.map((p) => {
              const spent = projectSpent(p)
              const net = projectNetProfit(p)
              const clientPay = projectClientPaymentProgress(p)
              const labor = projectLaborStats(p)
              const hasAlert =
                (!clientPay.allPaid && p.clientPayments.length > 0) || labor.unpaidCount > 0
              return (
                <li key={p.id} className="project-row">
                  <button
                    type="button"
                    className="project-row__body"
                    onClick={() => onOpen(p.id)}
                  >
                    <div className="project-row__text">
                      <strong>{p.name}</strong>
                      {p.client && <span className="muted">{p.client}</span>}
                    </div>
                    <div className="project-row__meta">
                      <span className={net >= 0 ? 'profit' : 'danger'}>{formatKRW(net)}</span>
                      <span className="muted">집행 {formatCompactKRW(spent)}</span>
                      {hasAlert && <span className="project-row__alert" aria-hidden />}
                    </div>
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger project-row__delete"
                    aria-label={`${p.name} 삭제`}
                    onClick={() => {
                      if (confirm(`「${p.name}」 프로젝트를 삭제할까요?`)) {
                        onDelete(p.id)
                      }
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <ProjectCreateModal
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={onCreate}
      />
    </div>
  )
}
