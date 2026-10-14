import { useState, type FormEvent, type ReactNode } from 'react'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { ENTRY_KIND_LABEL, type Entry, type EntryKind } from '../types'
import type { EntryInput } from '../hooks/useStore'
import {
  formatAmountInput,
  formatKRW,
  formatShortDate,
  parseAmount,
} from '../lib/format'
import { todayISO } from '../lib/money'

interface KindConfig {
  titleLabel: string
  titlePlaceholder: string
  titleRequired: boolean
  dateLabel: string
  addLabel: string
  emptyText: string
}

const KIND_CONFIG: Record<EntryKind, KindConfig> = {
  income: {
    titleLabel: '메모',
    titlePlaceholder: '예: 계약금, 잔금',
    titleRequired: false,
    dateLabel: '받은 날',
    addLabel: '수입 추가',
    emptyText: '실제로 받은 금액을 입력하세요.',
  },
  labor: {
    titleLabel: '이름',
    titlePlaceholder: '예: 김촬영',
    titleRequired: true,
    dateLabel: '날짜',
    addLabel: '사람 추가',
    emptyText: '스태프별 인건비를 입력하세요.',
  },
  equipment: {
    titleLabel: '장비',
    titlePlaceholder: '예: 소니 FX6 2일',
    titleRequired: false,
    dateLabel: '날짜',
    addLabel: '장비 추가',
    emptyText: '장비 렌탈비를 입력하세요.',
  },
  misc: {
    titleLabel: '항목',
    titlePlaceholder: '예: 점심 식대, 테이프',
    titleRequired: false,
    dateLabel: '날짜',
    addLabel: '항목 추가',
    emptyText: '식비·비품 등을 입력하세요.',
  },
}

interface FormState {
  title: string
  role: string
  amount: string
  date: string
}

function emptyForm(): FormState {
  return { title: '', role: '', amount: '', date: todayISO() }
}

function formFromEntry(e: Entry): FormState {
  return {
    title: e.title,
    role: e.role ?? '',
    amount: e.amount ? e.amount.toLocaleString('ko-KR') : '',
    date: e.date,
  }
}

interface EntrySectionProps {
  kind: EntryKind
  entries: Entry[]
  total: number
  onAdd: (data: EntryInput) => void
  onUpdate: (id: string, data: EntryInput) => void
  onDelete: (id: string) => void
  children?: ReactNode
}

export function EntrySection({
  kind,
  entries,
  total,
  onAdd,
  onUpdate,
  onDelete,
  children,
}: EntrySectionProps) {
  const cfg = KIND_CONFIG[kind]
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState('')

  const startAdd = () => {
    setForm(emptyForm())
    setError('')
    setEditingId('new')
  }

  const startEdit = (e: Entry) => {
    setForm(formFromEntry(e))
    setError('')
    setEditingId(e.id)
  }

  const cancel = () => {
    setEditingId(null)
    setError('')
  }

  const submit = (ev: FormEvent) => {
    ev.preventDefault()
    const amount = parseAmount(form.amount)
    if (cfg.titleRequired && !form.title.trim()) {
      setError(`${cfg.titleLabel}을 입력하세요.`)
      return
    }
    if (amount <= 0) {
      setError('금액을 입력하세요.')
      return
    }
    if (!form.date) {
      setError('날짜를 입력하세요.')
      return
    }
    const data: EntryInput = {
      kind,
      title: form.title.trim(),
      role: kind === 'labor' ? form.role.trim() : undefined,
      amount,
      date: form.date,
    }
    if (editingId === 'new') onAdd(data)
    else if (editingId) onUpdate(editingId, data)
    setEditingId(null)
  }

  const formEl = editingId !== null && (
    <form className="entry-form" onSubmit={submit} aria-label={cfg.addLabel}>
      <div className={`entry-form__grid entry-form__grid--${kind}`}>
        <label className="field">
          <span>
            {cfg.titleLabel}
            {!cfg.titleRequired && <em className="field__opt"> (선택)</em>}
          </span>
          <input
            value={form.title}
            placeholder={cfg.titlePlaceholder}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            autoFocus
          />
        </label>
        {kind === 'labor' && (
          <label className="field">
            <span>
              역할<em className="field__opt"> (선택)</em>
            </span>
            <input
              value={form.role}
              placeholder="예: 촬영감독"
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            />
          </label>
        )}
        <label className="field">
          <span>금액 (원)</span>
          <input
            inputMode="numeric"
            value={form.amount}
            placeholder="0"
            onChange={(e) =>
              setForm((f) => ({ ...f, amount: formatAmountInput(e.target.value) }))
            }
          />
        </label>
        <label className="field">
          <span>{cfg.dateLabel}</span>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          />
        </label>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="entry-form__actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={cancel}>
          <X size={15} />
          취소
        </button>
        <button type="submit" className="btn btn--primary btn--sm">
          {editingId === 'new' ? '추가' : '저장'}
        </button>
      </div>
    </form>
  )

  return (
    <section className={`entry-section entry-section--${kind}`}>
      <header className="entry-section__head">
        <div>
          <h2>{ENTRY_KIND_LABEL[kind]}</h2>
          <p className="muted">{entries.length}건</p>
        </div>
        <strong className="entry-section__total tabular-nums">{formatKRW(total)}</strong>
      </header>

      {editingId === 'new' && formEl}

      {entries.length === 0 && editingId !== 'new' ? (
        <p className="entry-section__empty muted">{cfg.emptyText}</p>
      ) : (
        <ul className="entry-list">
          {entries.map((e) =>
            editingId === e.id ? (
              <li key={e.id}>{formEl}</li>
            ) : (
              <li key={e.id} className="entry-row">
                <div className="entry-row__main">
                  <strong>
                    {e.title || <span className="muted">{ENTRY_KIND_LABEL[kind]}</span>}
                  </strong>
                  <span className="muted">
                    {e.role ? `${e.role} · ` : ''}
                    {formatShortDate(e.date)}
                  </span>
                </div>
                <span className="entry-row__amount tabular-nums">{formatKRW(e.amount)}</span>
                <div className="entry-row__actions">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="수정"
                    onClick={() => startEdit(e)}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    aria-label="삭제"
                    onClick={() => {
                      if (confirm(`「${e.title || ENTRY_KIND_LABEL[kind]}」 ${formatKRW(e.amount)}을 삭제할까요?`)) {
                        onDelete(e.id)
                      }
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      {children}

      {editingId === null && (
        <button type="button" className="entry-section__add" onClick={startAdd}>
          <Plus size={16} />
          {cfg.addLabel}
        </button>
      )}
    </section>
  )
}
