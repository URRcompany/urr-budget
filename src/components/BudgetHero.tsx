import { useState } from 'react'
import { ArrowLeft, Settings2 } from 'lucide-react'
import type { Project } from '../types'
import { formatKRW } from '../lib/format'
import { resolveProjectContract } from '../lib/contract'
import { vatModeLabel, type VatMode } from '../lib/vat'
import {
  contractAmountLabel,
  ContractAmountPreview,
  getContractFormDefaults,
  parseContractFormData,
} from './ContractAmountFields'
import { AppBrand } from './AppBrand'
import { UserBar } from './UserBar'

interface BudgetHeroProps {
  project: Project
  spent: number
  remaining: number
  committedRemaining: number
  unpaidLabor: number
  usageRatio: number
  committedUsageRatio: number
  netProfit: number
  showBack?: boolean
  onBack: () => void
  onUpdate: (
    patch: Partial<
      Pick<
        Project,
        | 'name'
        | 'client'
        | 'shootDate'
        | 'revenue'
        | 'totalBudget'
        | 'contractVatMode'
        | 'contractSupplyAmount'
        | 'contractVatAmount'
      >
    >,
  ) => void
}

export function BudgetHero({
  project,
  spent,
  remaining,
  committedRemaining,
  unpaidLabor,
  usageRatio,
  committedUsageRatio,
  netProfit,
  showBack = true,
  onBack,
  onUpdate,
}: BudgetHeroProps) {
  const [editing, setEditing] = useState(false)
  const defaults = getContractFormDefaults(project)
  const [vatMode, setVatMode] = useState<VatMode>(defaults.vatMode)
  const [amount, setAmount] = useState(String(defaults.amount || ''))
  const contract = resolveProjectContract(project)
  const over = remaining < 0
  const committedOver = committedRemaining < 0
  const pct = Math.round(usageRatio * 100)
  const committedPct = Math.round(committedUsageRatio * 100)

  const openEdit = () => {
    const d = getContractFormDefaults(project)
    setVatMode(d.vatMode)
    setAmount(String(d.amount || ''))
    setEditing(true)
  }

  return (
    <section className="hero hero--detail">
      <div className="hero__atmosphere" aria-hidden />
      <div className="hero__content">
        <div className="hero__nav">
          {showBack && (
            <button type="button" className="btn btn--ghost btn--sm hero__back" onClick={onBack}>
              <ArrowLeft size={16} />
              ← 홈으로
            </button>
          )}
          <AppBrand size="sm" />
          <UserBar compact />
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
                ...parseContractFormData(fd),
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
              부가세
              <select
                name="contractVatMode"
                value={vatMode}
                onChange={(e) => setVatMode(e.target.value as VatMode)}
              >
                <option value="separate">별도 (공급가 + VAT)</option>
                <option value="included">포함 (합계)</option>
                <option value="exempt">면세</option>
              </select>
            </label>
            <label>
              {contractAmountLabel(vatMode)}
              <input
                name="contractAmount"
                type="number"
                min={0}
                step={100000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </label>
            <ContractAmountPreview
              amount={Math.max(0, Number(amount) || 0)}
              vatMode={vatMode}
            />
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
                <span className="label">계약 금액 (합계)</span>
                <strong>{formatKRW(contract.total)}</strong>
                <p className="hero__vat-note muted">
                  {vatModeLabel(contract.mode)}
                  {contract.vat > 0
                    ? ` · 공급 ${formatKRW(contract.supply)} + VAT ${formatKRW(contract.vat)}`
                    : ` · 공급 ${formatKRW(contract.supply)}`}
                </p>
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
                onClick={openEdit}
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
            {unpaidLabor > 0 && (
              <div
                className="meter__fill meter__fill--committed"
                style={{
                  width: `${Math.min(committedPct, 100)}%`,
                }}
                title={`약정 포함 ${committedPct}%`}
              />
            )}
          </div>
          <div className="meter__legend">
            <span>
              집행 <strong>{formatKRW(spent)}</strong>
            </span>
            {unpaidLabor > 0 && (
              <span className="warn-text">
                약정 <strong>{formatKRW(unpaidLabor)}</strong>
              </span>
            )}
            <span className={over ? 'danger' : ''}>
              {over ? '예산 초과' : '예산 잔여'}{' '}
              <strong>{formatKRW(Math.abs(remaining))}</strong>
            </span>
            {unpaidLabor > 0 && (
              <span className={committedOver ? 'danger' : 'muted'}>
                약정 잔여 <strong>{formatKRW(Math.abs(committedRemaining))}</strong>
              </span>
            )}
            <span className="muted">{pct}%</span>
          </div>
        </div>
      </div>
    </section>
  )
}
