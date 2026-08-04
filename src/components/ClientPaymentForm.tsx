import { useEffect, useId, useState } from 'react'
import { X } from 'lucide-react'
import type { ClientPayment } from '../types'
import { formatKRW } from '../lib/format'

interface ClientPaymentFormProps {
  open: boolean
  onClose: () => void
  initial?: ClientPayment | null
  revenue: number
  scheduledTotal: number
  onSubmit: (data: Omit<ClientPayment, 'id'>) => void
}

export function ClientPaymentForm({
  open,
  onClose,
  initial,
  revenue,
  scheduledTotal,
  onSubmit,
}: ClientPaymentFormProps) {
  const titleId = useId()
  const [form, setForm] = useState({
    label: '',
    amount: '',
    dueDate: '',
    paidDate: '',
    isPaid: false,
    note: '',
    invoiceIssued: false,
    invoiceDate: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (initial) {
      setForm({
        label: initial.label,
        amount: String(initial.amount),
        dueDate: initial.dueDate,
        paidDate: initial.paidDate,
        isPaid: initial.isPaid,
        note: initial.note,
        invoiceIssued: initial.invoiceIssued ?? false,
        invoiceDate: initial.invoiceDate ?? '',
      })
    } else {
      setForm({
        label: '',
        amount: '',
        dueDate: '',
        paidDate: '',
        isPaid: false,
        note: '',
        invoiceIssued: false,
        invoiceDate: '',
      })
    }
    setError('')
  }, [open, initial])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const amountNum = Number(String(form.amount).replace(/,/g, ''))
  const otherScheduled = initial
    ? scheduledTotal - initial.amount
    : scheduledTotal
  const afterAdd = otherScheduled + (Number.isFinite(amountNum) ? amountNum : 0)
  const unallocated = Math.max(revenue - afterAdd, 0)
  const overAllocated = Math.max(afterAdd - revenue, 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.label.trim()) {
      setError('회차명을 입력해 주세요.')
      return
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError('올바른 금액을 입력해 주세요.')
      return
    }
    onSubmit({
      label: form.label.trim(),
      amount: Math.round(amountNum),
      dueDate: form.dueDate,
      paidDate: form.isPaid ? form.paidDate || new Date().toISOString().slice(0, 10) : '',
      isPaid: form.isPaid,
      note: form.note.trim(),
      invoiceIssued: form.invoiceIssued,
      invoiceDate:
        form.invoiceIssued && form.isPaid
          ? form.invoiceDate || new Date().toISOString().slice(0, 10)
          : '',
    })
    onClose()
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__head">
          <h2 id={titleId}>{initial ? '입금 회차 수정' : '입금 회차 추가'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </header>

        <form className="form" onSubmit={handleSubmit}>
          {revenue > 0 && (
            <div
              className={`form-hint ${overAllocated > 0 ? 'form-hint--warn' : ''}`}
              role="status"
            >
              계약 {formatKRW(revenue)} · 회차 합계 {formatKRW(afterAdd)}
              {overAllocated > 0 && (
                <strong> · 계약 초과 {formatKRW(overAllocated)}</strong>
              )}
              {unallocated > 0 && overAllocated === 0 && (
                <span> · 미배정 {formatKRW(unallocated)}</span>
              )}
            </div>
          )}

          <label className="field">
            <span>회차명</span>
            <input
              autoFocus
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="계약금, 중도금, 잔금 등"
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>금액 (원)</span>
              <input
                inputMode="numeric"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0"
              />
            </label>
            <label className="field">
              <span>입금 예정일</span>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </label>
          </div>

          <label className="field field--checkbox">
            <input
              type="checkbox"
              checked={form.isPaid}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  isPaid: e.target.checked,
                  paidDate: e.target.checked
                    ? f.paidDate || new Date().toISOString().slice(0, 10)
                    : '',
                  invoiceIssued: e.target.checked ? f.invoiceIssued : false,
                  invoiceDate: e.target.checked ? f.invoiceDate : '',
                }))
              }
            />
            <span>입금 완료</span>
          </label>

          {form.isPaid && (
            <div className="field-row">
              <label className="field">
                <span>실입금일</span>
                <input
                  type="date"
                  value={form.paidDate}
                  onChange={(e) => setForm((f) => ({ ...f, paidDate: e.target.value }))}
                />
              </label>
              <label className="field field--checkbox">
                <input
                  type="checkbox"
                  checked={form.invoiceIssued}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      invoiceIssued: e.target.checked,
                      invoiceDate: e.target.checked
                        ? f.invoiceDate || new Date().toISOString().slice(0, 10)
                        : '',
                    }))
                  }
                />
                <span>세금계산서 발행</span>
              </label>
            </div>
          )}

          {form.isPaid && form.invoiceIssued && (
            <label className="field">
              <span>계산서 발행일</span>
              <input
                type="date"
                value={form.invoiceDate}
                onChange={(e) => setForm((f) => ({ ...f, invoiceDate: e.target.value }))}
              />
            </label>
          )}

          <label className="field">
            <span>메모</span>
            <textarea
              rows={2}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="선택 사항"
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn btn--primary">
              {initial ? '저장' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
