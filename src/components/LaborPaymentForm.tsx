import { useEffect, useId, useState } from 'react'
import { X } from 'lucide-react'
import type { LaborPayment } from '../types'

interface LaborPaymentFormProps {
  open: boolean
  onClose: () => void
  initial?: LaborPayment | null
  onSubmit: (data: Omit<LaborPayment, 'id'>) => void
}

export function LaborPaymentForm({
  open,
  onClose,
  initial,
  onSubmit,
}: LaborPaymentFormProps) {
  const titleId = useId()
  const [form, setForm] = useState({
    name: '',
    role: '',
    amount: '',
    workDate: '',
    paidDate: '',
    isPaid: false,
    note: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (initial) {
      setForm({
        name: initial.name,
        role: initial.role,
        amount: String(initial.amount),
        workDate: initial.workDate,
        paidDate: initial.paidDate,
        isPaid: initial.isPaid,
        note: initial.note,
      })
    } else {
      setForm({
        name: '',
        role: '',
        amount: '',
        workDate: '',
        paidDate: '',
        isPaid: false,
        note: '',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = Number(String(form.amount).replace(/,/g, ''))
    if (!form.name.trim()) {
      setError('이름을 입력해 주세요.')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('올바른 금액을 입력해 주세요.')
      return
    }
    onSubmit({
      name: form.name.trim(),
      role: form.role.trim(),
      amount: Math.round(amount),
      workDate: form.workDate,
      paidDate: form.isPaid ? form.paidDate || new Date().toISOString().slice(0, 10) : '',
      isPaid: form.isPaid,
      note: form.note.trim(),
      expenseId: initial?.expenseId,
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
          <h2 id={titleId}>{initial ? '인건비 수정' : '인력 추가'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </header>

        <form className="form" onSubmit={handleSubmit}>
          <p className="form-hint muted">
            지급 완료로 표시하면 지출 내역에 자동 등록됩니다.
          </p>

          <div className="field-row">
            <label className="field">
              <span>이름</span>
              <input
                autoFocus
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="이름"
              />
            </label>
            <label className="field">
              <span>역할</span>
              <input
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                placeholder="DP, 조명, 편집 등"
              />
            </label>
          </div>

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
              <span>근무일</span>
              <input
                type="date"
                value={form.workDate}
                onChange={(e) => setForm((f) => ({ ...f, workDate: e.target.value }))}
              />
            </label>
          </div>

          <label className="field field--checkbox">
            <input
              type="checkbox"
              checked={form.isPaid}
              disabled={!initial}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  isPaid: e.target.checked,
                  paidDate: e.target.checked
                    ? f.paidDate || new Date().toISOString().slice(0, 10)
                    : '',
                }))
              }
            />
            <span>{initial ? '지급 완료' : '추가 후 목록에서 지급 완료 체크'}</span>
          </label>

          {form.isPaid && (
            <label className="field">
              <span>지급일</span>
              <input
                type="date"
                value={form.paidDate}
                onChange={(e) => setForm((f) => ({ ...f, paidDate: e.target.value }))}
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
