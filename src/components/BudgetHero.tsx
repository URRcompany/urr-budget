import { useState } from 'react'
import { ArrowLeft, Settings2 } from 'lucide-react'
import type { Project } from '../types'
import { formatKRW } from '../lib/format'

interface BudgetHeroProps {
  project: Project
  spent: number
  remaining: number
  usageRatio: number
  netProfit: number
  showBack?: boolean
  onBack: () => void
  onUpdate: (
    patch: Partial<
      Pick<Project, 'name' | 'client' | 'shootDate' | 'revenue' | 'totalBudget'>
    >,
  ) => void
}

export function BudgetHero({
  project,
  spent,
  remaining,
  usageRatio,
  netProfit,
  showBack = true,
  onBack,
  onUpdate,
}: BudgetHeroProps) {
  const [editing, setEditing] = useState(false)
  const over = remaining < 0
  const pct = Math.round(usageRatio * 100)

  return (
    <section className="hero hero--detail">
      <div className="hero__atmosphere" aria-hidden />
      <div className="hero__content">
        <div className="hero__nav">
          {showBack && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={onBack}>
              <ArrowLeft size={16} />
              프로젝트 목록
            </button>
          )}
          <p className="brand brand--sm">ReelBudget</p>
        </div>

        {editing ? (
          <form
            className="hero-edit"
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              onUpdate({
                name: String(fd.get('name') || project.name),
                client: String(fd.get('client') || ''),
                shootDate: String(fd.get('shootDate') || ''),
                revenue: Math.max(0, Number(fd.get('revenue')) || 0),
                totalBudget: Math.max(0, Number(fd.get('totalBudget')) || 0),
              })
              setEditing(false)
            }}
          >
            <label>
              프로젝트명
              <input name="name" defaultValue={project.name} required />
            </label>
            <label>
              클라이언트
              <input name="client" defaultValue={project.client} />
            </label>
            <label>
              촬영일
              <input name="shootDate" type="date" defaultValue={project.shootDate} />
            </label>
            <label>
              계약·매출 (원)
              <input
                name="revenue"
                type="number"
                min={0}
                step={100000}
                defaultValue={project.revenue}
                required
              />
            </label>
            <label>
              제작 예산 (원)
              <input
                name="totalBudget"
                type="number"
                min={0}
                step={100000}
                defaultValue={project.totalBudget}
                required
              />
            </label>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setEditing(false)}
              >
                취소
              </button>
              <button type="submit" className="btn btn--primary">
                저장
              </button>
            </div>
          </form>
        ) : (
          <>
            <h1 className="hero__title">{project.name}</h1>
            <p className="hero__sub">
              {project.client && <span>{project.client}</span>}
              {project.client && project.shootDate && <span aria-hidden> · </span>}
              {project.shootDate && (
                <span>
                  촬영{' '}
                  {new Intl.DateTimeFormat('ko-KR', {
                    month: 'long',
                    day: 'numeric',
                  }).format(new Date(project.shootDate + 'T00:00:00'))}
                </span>
              )}
            </p>

            <div className="hero__budget hero__budget--triple">
              <div className="hero__figure">
                <span className="label">계약·매출</span>
                <strong>{formatKRW(project.revenue)}</strong>
              </div>
              <div className="hero__figure">
                <span className="label">제작 예산</span>
                <strong className="hero__figure--secondary">
                  {formatKRW(project.totalBudget)}
                </strong>
              </div>
              <div className="hero__figure">
                <span className="label">
                  <span className="basis-badge basis-badge--accrual">발생</span>
                  순수익
                </span>
                <strong className={netProfit >= 0 ? '' : 'danger-text'}>
                  {formatKRW(netProfit)}
                </strong>
              </div>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setEditing(true)}
              >
                <Settings2 size={16} />
                프로젝트 설정
              </button>
            </div>
          </>
        )}

        <div className="meter" role="img" aria-label={`예산 사용률 ${pct}%`}>
          <div className="meter__track">
            <div
              className={`meter__fill ${over ? 'meter__fill--over' : ''}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <div className="meter__legend">
            <span>
              집행 <strong>{formatKRW(spent)}</strong>
            </span>
            <span className={over ? 'danger' : ''}>
              {over ? '예산 초과' : '예산 잔여'}{' '}
              <strong>{formatKRW(Math.abs(remaining))}</strong>
            </span>
            <span className="muted">{pct}%</span>
          </div>
        </div>
      </div>
    </section>
  )
}
