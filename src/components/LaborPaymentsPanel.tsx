import { useState } from 'react'
import { Check, Circle, Plus, Trash2, User } from 'lucide-react'
import type { LaborPayment } from '../types'
import { formatDate, formatKRW } from '../lib/format'

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
  const [adding, setAdding] = useState(false)
  const pct = stats.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 0

  return (
    <section className="section payment-panel" aria-labelledby="labor-pay-heading">
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
            <span className="muted payment-panel__hint-inline">
              · 지급 완료 시 지출 내역 자동 등록
            </span>
          </p>
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => setAdding((v) => !v)}
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

      {adding && (
        <LaborAddForm
          onSubmit={(data) => {
            onAdd(data)
            setAdding(false)
          }}
          onCancel={() => setAdding(false)}
        />
      )}

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
              className={`payment-row ${p.isPaid ? 'payment-row--done' : ''}`}
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
                  const name = prompt('이름', p.name)
                  if (name == null) return
                  const role = prompt('역할', p.role)
                  if (role == null) return
                  const amount = Number(prompt('금액 (원)', String(p.amount)) ?? p.amount)
                  if (!Number.isFinite(amount) || amount <= 0) return
                  onUpdate(p.id, {
                    ...p,
                    name: name.trim() || p.name,
                    role: role.trim(),
                    amount: Math.round(amount),
                  })
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
    </section>
  )
}

function LaborAddForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: Omit<LaborPayment, 'id'>) => void
  onCancel: () => void
}) {
  return (
    <form
      className="payment-add-form"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        onSubmit({
          name: String(fd.get('name') || ''),
          role: String(fd.get('role') || ''),
          amount: Math.max(0, Number(fd.get('amount')) || 0),
          workDate: String(fd.get('workDate') || ''),
          paidDate: '',
          isPaid: false,
          note: String(fd.get('note') || ''),
        })
      }}
    >
      <input name="name" required placeholder="이름" autoFocus />
      <input name="role" placeholder="역할 (예: DP, 조명)" />
      <input name="amount" type="number" min={0} step={100000} required placeholder="금액" />
      <input name="workDate" type="date" />
      <input name="note" placeholder="메모 (선택)" />
      <div className="form-actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
          취소
        </button>
        <button type="submit" className="btn btn--primary btn--sm">
          추가
        </button>
      </div>
    </form>
  )
}
