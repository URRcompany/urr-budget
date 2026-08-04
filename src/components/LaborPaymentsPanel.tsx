import { useState } from 'react'
import { Check, Circle, Pencil, Plus, Trash2, User } from 'lucide-react'
import type { LaborPayment } from '../types'
import { formatDate, formatKRW } from '../lib/format'
import { LaborPaymentForm } from './LaborPaymentForm'

interface LaborPaymentsPanelProps {
  payments: LaborPayment[]
  stats: {
    total: number
    paid: number
    unpaid: number
    paidCount: number
    unpaidCount: number
    allPaid: boolean
  }
  onAdd: (data: Omit<LaborPayment, 'id'>) => void
  onUpdate: (id: string, data: Omit<LaborPayment, 'id'>) => void
  onDelete: (id: string) => void
  onTogglePaid: (id: string, isPaid: boolean) => void
}

export function LaborPaymentsPanel({
  payments,
  stats,
  onAdd,
  onUpdate,
  onDelete,
  onTogglePaid,
}: LaborPaymentsPanelProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<LaborPayment | null>(null)
  const pct = stats.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 0

  const handleSubmit = (data: Omit<LaborPayment, 'id'>) => {
    if (editing) {
      const paidChanged = data.isPaid !== editing.isPaid
      if (paidChanged) {
        onUpdate(editing.id, {
          ...data,
          isPaid: editing.isPaid,
          paidDate: editing.paidDate,
          expenseId: editing.expenseId,
        })
        onTogglePaid(editing.id, data.isPaid)
      } else {
        onUpdate(editing.id, data)
      }
    } else {
      onAdd({ ...data, isPaid: false, paidDate: '', expenseId: undefined })
    }
  }

  return (
    <section className="section payment-panel payment-panel--labor" aria-labelledby="labor-pay-heading">
      <div className="labor-callout" role="note">
        <strong>인건비는 여기서만 등록하세요.</strong>
        <p>
          지급 완료 체크 시 <em>지출 내역</em>과 <em>인건비 카테고리</em>에 자동
          반영됩니다. 지출 탭에서 따로 입력할 필요가 없습니다.
        </p>
      </div>

      <header className="section__head">
        <div>
          <h2 id="labor-pay-heading">인건비 지급</h2>
          <p className="muted">
            지급 {formatKRW(stats.paid)} / 총 {formatKRW(stats.total)}
            {stats.unpaidCount > 0 && (
              <span className="badge badge--warn payment-panel__badge">
                미지급 {stats.unpaidCount}명
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus size={16} />
          인력 추가
        </button>
      </header>

      <div className="payment-summary">
        <div className="payment-summary__meter payment-summary__meter--labor" aria-hidden>
          <div className="payment-summary__fill" style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        <div className="payment-summary__row">
          <span>
            지급 완료 <strong className="profit">{formatKRW(stats.paid)}</strong>
          </span>
          <span>
            미지급{' '}
            <strong className={stats.unpaid > 0 ? 'warn-text' : 'profit'}>
              {formatKRW(stats.unpaid)}
            </strong>
          </span>
          <span className="muted">
            {stats.paidCount}/{payments.length}명
          </span>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="empty empty--compact">
          <p>등록된 인력이 없습니다.</p>
          <p className="muted">함께 일한 스태프를 추가하고 지급 여부를 체크하세요.</p>
        </div>
      ) : (
        <ul className="payment-list">
          {payments.map((p) => (
            <li
              key={p.id}
              className={`payment-row payment-row--labor ${p.isPaid ? 'payment-row--done' : ''}`}
            >
              <button
                type="button"
                className={`payment-check ${p.isPaid ? 'payment-check--done' : ''}`}
                onClick={() => onTogglePaid(p.id, !p.isPaid)}
                aria-label={p.isPaid ? '지급 완료 — 미지급으로 변경' : '지급 완료로 표시'}
              >
                {p.isPaid ? <Check size={16} /> : <Circle size={16} />}
              </button>
              <button
                type="button"
                className="payment-row__main"
                onClick={() => {
                  setEditing(p)
                  setFormOpen(true)
                }}
              >
                <span className="payment-row__title">
                  <User size={14} aria-hidden />
                  {p.name}
                  {p.role && <span className="payment-row__role">{p.role}</span>}
                </span>
                <span className="payment-row__meta muted">
                  {p.workDate && <>근무 {formatDate(p.workDate)} · </>}
                  {p.isPaid && p.paidDate
                    ? `지급 ${formatDate(p.paidDate)}`
                    : '미지급'}
                  {p.isPaid && p.expenseId && (
                    <> · <span className="link-badge">지출 연동</span></>
                  )}
                  {p.note && <> · {p.note}</>}
                </span>
              </button>
              <span className="payment-row__amount">{formatKRW(p.amount)}</span>
              <button
                type="button"
                className="icon-btn"
                aria-label="수정"
                onClick={() => {
                  setEditing(p)
                  setFormOpen(true)
                }}
              >
                <Pencil size={15} />
              </button>
              <button
                type="button"
                className="icon-btn icon-btn--danger"
                aria-label="삭제"
                onClick={() => {
                  if (confirm(`「${p.name}」 인건비 항목을 삭제할까요?`)) onDelete(p.id)
                }}
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <LaborPaymentForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        initial={editing}
        onSubmit={handleSubmit}
      />
    </section>
  )
}
