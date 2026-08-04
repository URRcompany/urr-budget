import { useEffect, useId, useState } from 'react'
import { X } from 'lucide-react'
import type { Category, Expense } from '../types'

interface ExpenseFormProps {
  open: boolean
  onClose: () => void
  categories: Category[]
  initial?: Expense | null
  onSubmit: (data: Omit<Expense, 'id'>) => void
}

export function ExpenseForm({
  open,
  onClose,
  categories,
  initial,
  onSubmit,
}: ExpenseFormProps) {
  const titleId = useId()
  const defaultCategory = categories[0]?.id ?? 'other'
  const [form, setForm] = useState({
    title: '',
    amount: '',
    categoryId: defaultCategory,
    date: new Date().toISOString().slice(0, 10),
    note: '',
    vendor: '',
    invoiceReceived: false,
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (initial) {
      setForm({
        title: initial.title,
        amount: String(initial.amount),
        categoryId: initial.categoryId,
        date: initial.date,
        note: initial.note,
        vendor: initial.vendor,
        invoiceReceived: initial.invoiceReceived ?? false,
      })
    } else {
      setForm({
        title: '',
        amount: '',
        categoryId: categories[0]?.id ?? 'other',
        date: new Date().toISOString().slice(0, 10),
        note: '',
        vendor: '',
        invoiceReceived: false,
      })
    }
    setError('')
  }, [open, initial, categories])

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
    if (!form.title.trim()) {
      setError('항목명을 입력해 주세요.')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('올바른 금액을 입력해 주세요.')
      return
    }
    onSubmit({
      title: form.title.trim(),
      amount: Math.round(amount),
      categoryId: form.categoryId,
      date: form.date,
      note: form.note.trim(),
      vendor: form.vendor.trim(),
      invoiceReceived: form.invoiceReceived,
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
          <h2 id={titleId}>{initial ? '지출 수정' : '지출 추가'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </header>

        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span>항목명</span>
            <input
              autoFocus
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="지출 항목"
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
              <span>날짜</span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </label>
          </div>

          <label className="field">
            <span>세부 카테고리</span>
            <select
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>거래처</span>
            <input
              value={form.vendor}
              onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
              placeholder="선택 사항"
            />
          </label>

          <label className="field">
            <span>메모</span>
            <textarea
              rows={2}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="선택 사항"
            />
          </label>

          <label className="field field--checkbox">
            <input
              type="checkbox"
              checked={form.invoiceReceived}
              onChange={(e) =>
                setForm((f) => ({ ...f, invoiceReceived: e.target.checked }))
              }
            />
            <span>거래처 계산서·세금계산서 수령</span>
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
