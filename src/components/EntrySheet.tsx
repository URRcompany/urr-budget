import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Trash2, X } from 'lucide-react'
import { ENTRY_KIND_LABEL, type Entry, type EntryKind } from '../types'
import type { EntryInput } from '../hooks/useStore'
import { formatAmountInput, formatKoreanAmount, parseAmount } from '../lib/format'
import { todayISO } from '../lib/money'

const KINDS: EntryKind[] = ['income', 'labor', 'equipment', 'misc']
const LAST_KIND_KEY = 'reelbudget.lastKind'

const TITLE_FIELD: Record<EntryKind, { label: string; placeholder: string; required: boolean }> = {
  income: { label: '메모', placeholder: '예: 계약금, 잔금', required: false },
  labor: { label: '이름', placeholder: '예: 김촬영', required: true },
  equipment: { label: '장비', placeholder: '예: 소니 FX6 2일', required: false },
  misc: { label: '항목', placeholder: '예: 점심 식대, 테이프', required: false },
}

function loadLastKind(): EntryKind {
  try {
    const raw = localStorage.getItem(LAST_KIND_KEY) as EntryKind | null
    return raw && KINDS.includes(raw) ? raw : 'income'
  } catch {
    return 'income'
  }
}

interface EntrySheetProps {
  open: boolean
  /** 수정할 기록. 없으면 새 기록 */
  entry: Entry | null
  onClose: () => void
  onSubmit: (data: EntryInput) => void
  onDelete: (id: string) => void
}

export function EntrySheet({ open, entry, onClose, onSubmit, onDelete }: EntrySheetProps) {
  const [kind, setKind] = useState<EntryKind>('income')
  const [title, setTitle] = useState('')
  const [role, setRole] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [error, setError] = useState('')
  const amountRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    if (entry) {
      setKind(entry.kind)
      setTitle(entry.title)
      setRole(entry.role ?? '')
      setAmount(entry.amount ? entry.amount.toLocaleString('ko-KR') : '')
      setDate(entry.date || todayISO())
    } else {
      setKind(loadLastKind())
      setTitle('')
      setRole('')
      setAmount('')
      setDate(todayISO())
    }
    setError('')
    const t = window.setTimeout(() => amountRef.current?.focus(), 50)
    return () => window.clearTimeout(t)
  }, [open, entry])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const field = TITLE_FIELD[kind]
  const amountNum = parseAmount(amount)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (amountNum <= 0) {
      setError('금액을 입력하세요.')
      amountRef.current?.focus()
      return
    }
    if (field.required && !title.trim()) {
      setError(`${field.label}을 입력하세요.`)
      return
    }
    if (!date) {
      setError('날짜를 입력하세요.')
      return
    }
    try {
      localStorage.setItem(LAST_KIND_KEY, kind)
    } catch {
      /* ignore */
    }
    onSubmit({
      kind,
      title: title.trim(),
      ...(kind === 'labor' ? { role: role.trim() } : {}),
      amount: amountNum,
      date,
    })
    onClose()
  }

  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={entry ? '기록 수정' : '기록하기'}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sheet__head">
          <h2>{entry ? '기록 수정' : '기록하기'}</h2>
          <button type="button" className="icon-btn" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <form className="sheet__form" onSubmit={submit}>
          <div className="kind-picker" role="radiogroup" aria-label="종류">
            {KINDS.map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                className={`kind-picker__btn ${kind === k ? 'kind-picker__btn--on' : ''} ${k === 'income' ? 'kind-picker__btn--income' : ''}`}
                onClick={() => {
                  setKind(k)
                  setError('')
                }}
              >
                {ENTRY_KIND_LABEL[k]}
              </button>
            ))}
          </div>

          <label className="amount-field">
            <span className="visually-hidden">금액</span>
            <span className={`amount-field__sign ${kind === 'income' ? 'amount-in' : ''}`}>
              {kind === 'income' ? '+' : '−'}
            </span>
            <input
              ref={amountRef}
              inputMode="numeric"
              aria-label="금액"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(formatAmountInput(e.target.value))}
            />
            <span className="amount-field__unit">원</span>
          </label>
          <p className="amount-field__hint muted" aria-live="polite">
            {amountNum > 0 ? formatKoreanAmount(amountNum) : '금액을 입력하세요'}
          </p>

          <div className={`sheet__fields ${kind === 'labor' ? 'sheet__fields--labor' : ''}`}>
            <label className="field">
              <span>
                {field.label}
                {!field.required && <em className="field__opt"> (선택)</em>}
              </span>
              <input
                value={title}
                placeholder={field.placeholder}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            {kind === 'labor' && (
              <label className="field">
                <span>
                  역할<em className="field__opt"> (선택)</em>
                </span>
                <input
                  value={role}
                  placeholder="예: 촬영감독"
                  onChange={(e) => setRole(e.target.value)}
                />
              </label>
            )}
            <label className="field">
              <span>{kind === 'income' ? '받은 날' : '날짜'}</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
          </div>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="sheet__actions">
            {entry && (
              <button
                type="button"
                className="btn btn--ghost btn--danger"
                onClick={() => {
                  if (confirm('이 기록을 삭제할까요?')) {
                    onDelete(entry.id)
                    onClose()
                  }
                }}
              >
                <Trash2 size={16} />
                삭제
              </button>
            )}
            <button type="submit" className="btn btn--primary sheet__submit">
              {entry ? '저장' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
