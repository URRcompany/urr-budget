import { useEffect, useId, useState } from 'react'
import { ImagePlus, Trash2, X } from 'lucide-react'
import type { Category, Expense } from '../types'
import { readReceiptFile } from '../lib/receipt'
import {
  calcVatFromSupply,
  normalizeExpenseTaxFields,
  resolveExpenseTax,
  vatModeLabel,
  type VatMode,
} from '../lib/vat'
import { formatKRW } from '../lib/format'

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
    supplyAmount: '',
    categoryId: defaultCategory,
    date: new Date().toISOString().slice(0, 10),
    note: '',
    vendor: '',
    invoiceReceived: false,
    vatMode: 'included' as VatMode,
    receiptDataUrl: '',
    receiptFileName: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (initial) {
      const tax = resolveExpenseTax(initial)
      setForm({
        title: initial.title,
        amount: String(initial.amount),
        supplyAmount: String(tax.supply || ''),
        categoryId: initial.categoryId,
        date: initial.date,
        note: initial.note,
        vendor: initial.vendor,
        invoiceReceived: initial.invoiceReceived ?? false,
        vatMode: initial.vatMode ?? 'included',
        receiptDataUrl: initial.receiptDataUrl ?? '',
        receiptFileName: initial.receiptFileName ?? '',
      })
    } else {
      setForm({
        title: '',
        amount: '',
        supplyAmount: '',
        categoryId: categories[0]?.id ?? 'other',
        date: new Date().toISOString().slice(0, 10),
        note: '',
        vendor: '',
        invoiceReceived: false,
        vatMode: 'included',
        receiptDataUrl: '',
        receiptFileName: '',
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

  const supplyNum = Number(String(form.supplyAmount).replace(/,/g, '')) || 0
  const amountNum = Number(String(form.amount).replace(/,/g, '')) || 0
  const previewTax = resolveExpenseTax({
    amount:
      form.vatMode === 'separate'
        ? supplyNum + calcVatFromSupply(supplyNum)
        : amountNum,
    vatMode: form.vatMode,
    supplyAmount: form.vatMode === 'separate' ? supplyNum : undefined,
    vatAmount:
      form.vatMode === 'separate' ? calcVatFromSupply(supplyNum) : undefined,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      setError('항목명을 입력해 주세요.')
      return
    }

    const draft: Omit<Expense, 'id'> = {
      title: form.title.trim(),
      amount:
        form.vatMode === 'separate'
          ? supplyNum + calcVatFromSupply(supplyNum)
          : amountNum,
      categoryId: form.categoryId,
      date: form.date,
      note: form.note.trim(),
      vendor: form.vendor.trim(),
      invoiceReceived: form.invoiceReceived,
      vatMode: form.vatMode,
      supplyAmount:
        form.vatMode === 'separate' ? supplyNum : previewTax.supply,
      vatAmount: previewTax.vat,
      receiptDataUrl: form.receiptDataUrl,
      receiptFileName: form.receiptFileName,
    }

    const normalized = normalizeExpenseTaxFields(draft)
    if (normalized.amount <= 0) {
      setError('올바른 금액을 입력해 주세요.')
      return
    }

    onSubmit({ ...draft, ...normalized })
    onClose()
  }

  const handleReceipt = async (file: File | null) => {
    if (!file) return
    try {
      const { dataUrl, fileName } = await readReceiptFile(file)
      setForm((f) => ({ ...f, receiptDataUrl: dataUrl, receiptFileName: fileName }))
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '영수증 첨부에 실패했습니다.')
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal modal--wide"
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

          <label className="field">
            <span>부가세</span>
            <select
              value={form.vatMode}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  vatMode: e.target.value as VatMode,
                }))
              }
            >
              <option value="included">포함 (합계 입력)</option>
              <option value="separate">별도 (공급가 + VAT)</option>
              <option value="exempt">면세</option>
            </select>
          </label>

          {form.vatMode === 'separate' ? (
            <div className="field-row">
              <label className="field">
                <span>공급가액 (원)</span>
                <input
                  inputMode="numeric"
                  value={form.supplyAmount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, supplyAmount: e.target.value }))
                  }
                  placeholder="0"
                />
              </label>
              <label className="field">
                <span>부가세 (10%)</span>
                <input
                  readOnly
                  value={formatKRW(calcVatFromSupply(supplyNum))}
                  className="field-readonly"
                />
              </label>
            </div>
          ) : (
            <label className="field">
              <span>{form.vatMode === 'exempt' ? '금액 (원)' : '합계 (원, VAT 포함)'}</span>
              <input
                inputMode="numeric"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0"
              />
            </label>
          )}

          <div className="form-hint vat-preview" role="status">
            {vatModeLabel(form.vatMode)} · 공급가 {formatKRW(previewTax.supply)}
            {previewTax.vat > 0 && ` · VAT ${formatKRW(previewTax.vat)}`}
            {' · '}합계 <strong>{formatKRW(previewTax.total)}</strong>
          </div>

          <div className="field-row">
            <label className="field">
              <span>날짜</span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </label>
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
          </div>

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

          <div className="field">
            <span>영수증·견적서 첨부</span>
            {form.receiptDataUrl ? (
              <div className="receipt-preview">
                <img src={form.receiptDataUrl} alt="첨부 영수증" />
                <div className="receipt-preview__meta">
                  <span className="muted">{form.receiptFileName}</span>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        receiptDataUrl: '',
                        receiptFileName: '',
                      }))
                    }
                  >
                    <Trash2 size={14} />
                    삭제
                  </button>
                </div>
              </div>
            ) : (
              <label className="receipt-upload">
                <ImagePlus size={18} />
                <span>이미지 선택 (JPG, PNG)</span>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    void handleReceipt(e.target.files?.[0] ?? null)
                    e.target.value = ''
                  }}
                />
              </label>
            )}
          </div>

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
