import { useState } from 'react'
import { FolderPlus, RotateCcw, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import {
  projectClientPaymentProgress,
  projectLaborStats,
  projectMargin,
  projectNetProfit,
  projectSpent,
  type Project,
} from '../types'
import { formatDate, formatKRW } from '../lib/format'
import { getMonthStats, monthKey } from '../lib/ledger'
import { MonthlyLedger } from './MonthlyLedger'
import { LedgerTimeline } from './LedgerTimeline'
import { OverdueAlert } from './OverdueAlert'

interface ProjectListProps {
  projects: Project[]
  portfolio: {
    count: number
    revenue: number
    spent: number
    netProfit: number
  }
  ledgerMonth: string
  onMonthChange: (month: string) => void
  onOpen: (id: string) => void
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

export function ProjectList({
  projects,
  portfolio,
  ledgerMonth,
  onMonthChange,
  onOpen,
  onDelete,
  onCreate,
  onResetSamples,
}: ProjectListProps) {
  const [creating, setCreating] = useState(false)
  const thisMonth = getMonthStats(projects, monthKey())

  return (
    <div className="home">
      <header className="home-hero">
        <div className="home-hero__atmosphere" aria-hidden />
        <div className="home-hero__content">
          <p className="brand">ReelBudget</p>
          <h1 className="home-hero__title">영상제작 프로젝트 예산</h1>
          <p className="home-hero__sub">
            월별 매출·매입 장부로 이번 달 수익을 바로 확인하세요.
          </p>

          <div className="portfolio-strip portfolio-strip--ledger">
            <div>
              <span className="label">이번 달 매출</span>
              <strong className="profit">{formatKRW(thisMonth.sales)}</strong>
            </div>
            <div>
              <span className="label">이번 달 매입</span>
              <strong>{formatKRW(thisMonth.purchases)}</strong>
            </div>
            <div>
              <span className="label">이번 달 순이익</span>
              <strong className={thisMonth.net >= 0 ? 'profit' : 'danger'}>
                {formatKRW(thisMonth.net)}
              </strong>
            </div>
            <div>
              <span className="label">전체 프로젝트</span>
              <strong>{portfolio.count}</strong>
            </div>
          </div>
        </div>
      </header>

      <section className="section section--ledger">
        <OverdueAlert projects={projects} onOpenProject={onOpen} />
        <MonthlyLedger
          projects={projects}
          month={ledgerMonth}
          onMonthChange={onMonthChange}
        />
        <LedgerTimeline projects={projects} month={ledgerMonth} />
      </section>

      <section className="section">
        <header className="section__head">
          <div>
            <h2>프로젝트</h2>
            <p className="muted">카드를 눌러 예산·지출을 관리합니다</p>
          </div>
          <div className="section__actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
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
              <RotateCcw size={15} />
              샘플 불러오기
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setCreating(true)}
            >
              <FolderPlus size={18} />
              새 프로젝트
            </button>
          </div>
        </header>

        {creating && (
          <ProjectCreateForm
            onCancel={() => setCreating(false)}
            onSubmit={(data) => {
              onCreate(data)
              setCreating(false)
            }}
          />
        )}

        {projects.length === 0 ? (
          <div className="empty">
            <p>프로젝트가 없습니다.</p>
            <p className="muted">새 프로젝트를 만들어 예산을 시작해 보세요.</p>
          </div>
        ) : (
          <ul className="project-grid">
            {projects.map((p, i) => {
              const spent = projectSpent(p)
              const net = projectNetProfit(p)
              const margin = projectMargin(p)
              const clientPay = projectClientPaymentProgress(p)
              const labor = projectLaborStats(p)
              const budgetPct =
                p.totalBudget > 0
                  ? Math.min(Math.round((spent / p.totalBudget) * 100), 999)
                  : 0
              return (
                <li
                  key={p.id}
                  className="project-card"
                  style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
                >
                  <button
                    type="button"
                    className="project-card__body"
                    onClick={() => onOpen(p.id)}
                  >
                    <div className="project-card__top">
                      <h3>{p.name}</h3>
                      {p.client && <p className="muted">{p.client}</p>}
                    </div>
                    <dl className="project-card__stats">
                      <div>
                        <dt>계약</dt>
                        <dd>{formatKRW(p.revenue)}</dd>
                      </div>
                      <div>
                        <dt>집행</dt>
                        <dd>{formatKRW(spent)}</dd>
                      </div>
                      <div>
                        <dt>순수익</dt>
                        <dd className={net >= 0 ? 'profit' : 'danger'}>
                          {net >= 0 ? (
                            <TrendingUp size={14} aria-hidden />
                          ) : (
                            <TrendingDown size={14} aria-hidden />
                          )}
                          {formatKRW(net)}
                        </dd>
                      </div>
                    </dl>
                    <div className="project-card__foot">
                      <span className="muted">
                        {p.shootDate ? formatDate(p.shootDate) : '촬영일 미정'}
                      </span>
                      <span className="project-card__flags">
                        {!clientPay.allPaid && p.clientPayments.length > 0 && (
                          <span className="badge badge--warn">미수</span>
                        )}
                        {labor.unpaidCount > 0 && (
                          <span className="badge badge--warn">
                            미지급 {labor.unpaidCount}
                          </span>
                        )}
                        {clientPay.allPaid && p.clientPayments.length > 0 && (
                          <span className="badge badge--ok">입금완료</span>
                        )}
                      </span>
                      <span className="muted">
                        예산 {budgetPct}%
                        {margin != null &&
                          ` · 마진 ${Math.round(margin * 100)}%`}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger project-card__delete"
                    aria-label={`${p.name} 삭제`}
                    onClick={() => {
                      if (confirm(`「${p.name}」 프로젝트를 삭제할까요?`)) {
                        onDelete(p.id)
                      }
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function ProjectCreateForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void
  onSubmit: (input: {
    name: string
    client: string
    shootDate: string
    revenue: number
    totalBudget: number
  }) => void
}) {
  return (
    <form
      className="create-form"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        onSubmit({
          name: String(fd.get('name') || ''),
          client: String(fd.get('client') || ''),
          shootDate: String(fd.get('shootDate') || ''),
          revenue: Math.max(0, Number(fd.get('revenue')) || 0),
          totalBudget: Math.max(0, Number(fd.get('totalBudget')) || 0),
        })
      }}
    >
      <div className="field-row field-row--3">
        <label className="field">
          <span>프로젝트명</span>
          <input name="name" required placeholder="예: CF — 가을 캠페인" autoFocus />
        </label>
        <label className="field">
          <span>클라이언트</span>
          <input name="client" placeholder="선택 사항" />
        </label>
        <label className="field">
          <span>촬영일</span>
          <input name="shootDate" type="date" />
        </label>
      </div>
      <div className="field-row">
        <label className="field">
          <span>계약·매출 (원)</span>
          <input name="revenue" type="number" min={0} step={100000} placeholder="0" />
        </label>
        <label className="field">
          <span>제작 예산 (원)</span>
          <input
            name="totalBudget"
            type="number"
            min={0}
            step={100000}
            placeholder="0"
          />
        </label>
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          취소
        </button>
        <button type="submit" className="btn btn--primary">
          만들기
        </button>
      </div>
    </form>
  )
}
