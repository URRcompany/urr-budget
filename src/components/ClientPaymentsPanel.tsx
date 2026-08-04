import { useState } from 'react'
import { Check, Circle, FileText, Plus, Trash2 } from 'lucide-react'
import type { ClientPayment } from '../types'
import { formatDate, formatKRW } from '../lib/format'
import { daysOverdue, isPaymentOverdue } from '../lib/receivables'

interface ClientPaymentsPanelProps {
  payments: ClientPayment[]
  revenue: number
  received: number
  outstanding: number
  onAdd: (data: Omit<ClientPayment, 'id'>) => void
  onUpdate: (id: string, data: Omit<ClientPayment, 'id'>) => void
  onDelete: (id: string) => void
  onTogglePaid: (id: string, isPaid: boolean) => void
  onToggleInvoice: (id: string, issued: boolean) => void
}

export function ClientPaymentsPanel({
  payments,
  revenue,
  received,
  outstanding,
  onAdd,
  onUpdate,
  onDelete,
  onTogglePaid,
  onToggleInvoice,
}: ClientPaymentsPanelProps) {
  const [adding, setAdding] = useState(false)
  const pendingCount = payments.filter((p) => !p.isPaid).length
  const overdueCount = payments.filter((p) => isPaymentOverdue(p)).length
  const unissuedCount = payments.filter((p) => p.isPaid && !(p.invoiceIssued ?? false)).length
  const pct = revenue > 0 ? Math.round((received / revenue) * 100) : 0

  return (
    <section className="section payment-panel" aria-labelledby="client-pay-heading">
      <header className="section__head">
        <div>
          <h2 id="client-pay-heading">클라이언트 입금</h2>
          <p className="muted">
            입금 {formatKRW(received)} / 계약 {formatKRW(revenue)}
            {overdueCount > 0 && (
              <span className="badge badge--danger payment-panel__badge">
                연체 {overdueCount}건
              </span>
            )}
            {unissuedCount > 0 && (
              <span className="badge badge--warn payment-panel__badge">
                계산서 미발행 {unissuedCount}건
              </span>
            )}
            {pendingCount > 0 && overdueCount === 0 && (
              <span className="badge badge--warn payment-panel__badge">
                미수 {pendingCount}건
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => setAdding((v) => !v)}
        >
          <Plus size={16} />
          입금 회차 추가
        </button>
      </header>

      <div className="payment-summary">
        <div className="payment-summary__meter" aria-hidden>
          <div className="payment-summary__fill" style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        <div className="payment-summary__row">
          <span>
            입금 완료 <strong className="profit">{formatKRW(received)}</strong>
          </span>
          <span>
            미수금{' '}
            <strong className={outstanding > 0 ? 'warn-text' : 'profit'}>
              {formatKRW(outstanding)}
            </strong>
          </span>
          <span className="muted">{pct}%</span>
        </div>
      </div>

      {adding && (
        <PaymentAddForm
          onSubmit={(data) => {
            onAdd(data)
            setAdding(false)
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {payments.length === 0 ? (
        <div className="empty empty--compact">
          <p>입금 회차가 없습니다.</p>
          <p className="muted">계약금·중도금·잔금 등을 추가해 입금·계산서 발행을 확인하세요.</p>
        </div>
      ) : (
        <ul className="payment-list">
          {payments.map((p) => (
            <PaymentRow
              key={p.id}
              payment={p}
              onToggle={() => onTogglePaid(p.id, !p.isPaid)}
              onToggleInvoice={() => onToggleInvoice(p.id, !p.invoiceIssued)}
              onEdit={() => {
                const label = prompt('회차명', p.label)
                if (label == null) return
                const amount = Number(
                  prompt('금액 (원)', String(p.amount)) ?? p.amount,
                )
                if (!Number.isFinite(amount) || amount <= 0) return
                onUpdate(p.id, {
                  ...p,
                  label: label.trim() || p.label,
                  amount: Math.round(amount),
                })
              }}
              onDelete={() => {
                if (confirm(`「${p.label}」 입금 회차를 삭제할까요?`)) onDelete(p.id)
              }}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function PaymentRow({
  payment,
  onToggle,
  onToggleInvoice,
  onEdit,
  onDelete,
}: {
  payment: ClientPayment
  onToggle: () => void
  onToggleInvoice: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const overdue = isPaymentOverdue(payment)
  const overdueDays = daysOverdue(payment)
  const needsInvoice = payment.isPaid && !(payment.invoiceIssued ?? false)

  return (
    <li
      className={`payment-row ${payment.isPaid ? 'payment-row--done' : ''} ${overdue ? 'payment-row--overdue' : ''} ${needsInvoice ? 'payment-row--no-invoice' : ''}`}
    >
      <button
        type="button"
        className={`payment-check ${payment.isPaid ? 'payment-check--done' : ''}`}
        onClick={onToggle}
        aria-label={payment.isPaid ? '입금 완료 — 미입금으로 변경' : '입금 완료로 표시'}
      >
        {payment.isPaid ? <Check size={16} /> : <Circle size={16} />}
      </button>
      <button type="button" className="payment-row__main" onClick={onEdit}>
        <span className="payment-row__title">{payment.label}</span>
        <span className="payment-row__meta muted">
          {payment.dueDate && <>예정 {formatDate(payment.dueDate)} · </>}
          {overdue && (
            <strong className="danger">{overdueDays}일 연체 · </strong>
          )}
          {payment.isPaid && payment.paidDate
            ? `입금 ${formatDate(payment.paidDate)}`
            : !overdue
              ? '미입금'
              : '미입금'}
          {payment.invoiceIssued && payment.invoiceDate && (
            <> · 계산서 {formatDate(payment.invoiceDate)}</>
          )}
          {needsInvoice && (
            <strong className="warn-text"> · 계산서 미발행</strong>
          )}
          {payment.note && <> · {payment.note}</>}
        </span>
      </button>
      <button
        type="button"
        className={`invoice-check ${payment.invoiceIssued ? 'invoice-check--done' : ''} ${!payment.isPaid ? 'invoice-check--disabled' : ''}`}
        onClick={onToggleInvoice}
        disabled={!payment.isPaid}
        title={
          payment.isPaid
            ? payment.invoiceIssued
              ? '계산서 발행 완료'
              : '계산서 발행 완료로 표시'
            : '입금 후 계산서 발행 체크 가능'
        }
        aria-label={
          payment.invoiceIssued ? '계산서 발행됨 — 취소' : '계산서 발행 완료'
        }
      >
        <FileText size={15} />
      </button>
      <span className="payment-row__amount">{formatKRW(payment.amount)}</span>
      <button
        type="button"
        className="icon-btn icon-btn--danger"
        aria-label="삭제"
        onClick={onDelete}
      >
        <Trash2 size={15} />
      </button>
    </li>
  )
}

function PaymentAddForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: Omit<ClientPayment, 'id'>) => void
  onCancel: () => void
}) {
  return (
    <form
      className="payment-add-form"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        onSubmit({
          label: String(fd.get('label') || '입금'),
          amount: Math.max(0, Number(fd.get('amount')) || 0),
          dueDate: String(fd.get('dueDate') || ''),
          paidDate: '',
          isPaid: false,
          note: String(fd.get('note') || ''),
          invoiceIssued: false,
          invoiceDate: '',
        })
      }}
    >
      <input name="label" required placeholder="회차명" autoFocus />
      <input name="amount" type="number" min={0} step={100000} required placeholder="금액" />
      <input name="dueDate" type="date" />
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
