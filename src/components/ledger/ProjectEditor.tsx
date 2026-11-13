import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import type { Entry, EntryKind, Project } from '../../types'
import { projectLedger, todayISO } from '../../lib/money'
import { uid } from '../../lib/format'
import { MoneyInput } from './MoneyInput'
import { won } from './format'

interface ProjectEditorProps {
  project: Project | null
  onClose: () => void
  onSave: (project: Project) => void
  onDelete: (id: string) => void
}

type Row = Entry

function blankProject(): Project {
  return {
    id: uid('p'),
    name: '',
    client: '',
    date: todayISO(),
    amount: 0,
    dueDate: '',
    memo: '',
    entries: [],
    createdAt: new Date().toISOString(),
  }
}

const SECTIONS: { kind: EntryKind; title: string; add: string; itemPh: string }[] = [
  { kind: 'income', title: '입금 내역', add: '입금 추가 (계약금·잔금 나눠서 가능)', itemPh: '메모 (예: 계약금)' },
  { kind: 'labor', title: '인건비', add: '스태프 추가', itemPh: '이름' },
  { kind: 'equipment', title: '장비 비용', add: '장비 추가', itemPh: '항목 (예: 카메라 렌탈)' },
  { kind: 'misc', title: '기타 지출', add: '기타 지출 추가', itemPh: '항목 (예: 식대, 교통비)' },
]

export function ProjectEditor({ project, onClose, onSave, onDelete }: ProjectEditorProps) {
  const isNew = !project
  const [draft, setDraft] = useState<Project>(() => project ?? blankProject())
  const [sureDelete, setSureDelete] = useState(false)
  const [error, setError] = useState('')

  const set = <K extends keyof Project>(key: K, value: Project[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const rows = (kind: EntryKind) => draft.entries.filter((e) => e.kind === kind)

  const patchRow = (id: string, patch: Partial<Row>) =>
    setDraft((d) => ({ ...d, entries: d.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) }))

  const addRow = (kind: EntryKind) => {
    const row: Row = {
      id: uid(),
      kind,
      title: '',
      amount: 0,
      date: kind === 'income' ? todayISO() : draft.date || todayISO(),
    }
    if (kind === 'labor') {
      row.role = ''
      row.paid = false
    }
    setDraft((d) => ({ ...d, entries: [...d.entries, row] }))
  }

  const removeRow = (id: string) =>
    setDraft((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.name.trim()) {
      setError('프로젝트명을 입력해 주세요')
      return
    }
    // 빈 줄은 버리고, 지출 날짜가 비어 있으면 촬영일로 채운다.
    const entries = draft.entries
      .filter((r) => r.amount > 0 || r.title.trim())
      .map((r) => (r.kind !== 'income' && !r.date ? { ...r, date: draft.date || todayISO() } : r))
    onSave({ ...draft, entries })
    onClose()
  }

  const l = projectLedger(draft)

  return (
    <div className="lg-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="lg-modal" onSubmit={submit}>
        <h2>{isNew ? '새 프로젝트' : '프로젝트 수정'}</h2>
        <div className="lg-fgrid">
          <label className="lg-field lg-field--full">
            <span>프로젝트명</span>
            <input
              className="lg-input"
              autoFocus
              value={draft.name}
              placeholder="예: OO브랜드 광고 촬영"
              onChange={(e) => set('name', e.target.value)}
            />
          </label>
          <label className="lg-field">
            <span>클라이언트</span>
            <input
              className="lg-input"
              value={draft.client}
              placeholder="회사 / 담당자"
              onChange={(e) => set('client', e.target.value)}
            />
          </label>
          <label className="lg-field">
            <span>촬영일</span>
            <input className="lg-input" type="date" value={draft.date} onChange={(e) => set('date', e.target.value)} />
          </label>
          <label className="lg-field">
            <span>받을 금액 (실제 입금될 총액)</span>
            <MoneyInput value={draft.amount} onChange={(v) => set('amount', v)} />
          </label>
          <label className="lg-field">
            <span>입금 기한 (선택)</span>
            <input className="lg-input" type="date" value={draft.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
          </label>
        </div>

        {SECTIONS.map((sec) => {
          const list = rows(sec.kind)
          const total = list.reduce((s, r) => s + r.amount, 0)
          return (
            <section className="lg-msec" key={sec.kind}>
              <header>
                <h3>{sec.title}</h3>
                {list.length > 0 && <span className="lg-num">{won(total)}</span>}
              </header>
              {list.map((r) => (
                <div className={`lg-row lg-row--${sec.kind}`} key={r.id}>
                  {sec.kind === 'income' && (
                    <input
                      className="lg-input"
                      type="date"
                      aria-label="입금일"
                      value={r.date}
                      onChange={(e) => patchRow(r.id, { date: e.target.value })}
                    />
                  )}
                  <input
                    className="lg-input"
                    placeholder={sec.itemPh}
                    value={r.title}
                    onChange={(e) => patchRow(r.id, { title: e.target.value })}
                  />
                  {sec.kind === 'labor' && (
                    <input
                      className="lg-input"
                      placeholder="역할 (예: 1st AC)"
                      value={r.role ?? ''}
                      onChange={(e) => patchRow(r.id, { role: e.target.value })}
                    />
                  )}
                  <MoneyInput value={r.amount} ariaLabel="금액" onChange={(v) => patchRow(r.id, { amount: v })} />
                  {sec.kind === 'labor' && (
                    <label className="lg-chk">
                      <input
                        type="checkbox"
                        checked={!!r.paid}
                        onChange={(e) => patchRow(r.id, { paid: e.target.checked })}
                      />
                      지급함
                    </label>
                  )}
                  <button type="button" className="lg-x" aria-label="삭제" onClick={() => removeRow(r.id)}>
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button type="button" className="lg-add" onClick={() => addRow(sec.kind)}>
                + {sec.add}
              </button>
            </section>
          )
        })}

        <section className="lg-msec">
          <label className="lg-field">
            <span>메모</span>
            <input
              className="lg-input"
              value={draft.memo}
              placeholder="세금계산서 발행 여부 등"
              onChange={(e) => set('memo', e.target.value)}
            />
          </label>
        </section>

        <div className="lg-preview lg-num">
          <div>
            아직 받을 돈<b className={l.due ? 'lg-red' : 'lg-green'}>{won(l.due)}</b>
          </div>
          <div>
            총 지출<b>{won(l.expense)}</b>
          </div>
          <div>
            남는 돈<b>{won(l.profit)}</b>
          </div>
        </div>

        {error && <p className="lg-error">{error}</p>}

        <div className="lg-mfoot">
          {!isNew && (
            <button
              type="button"
              className={`lg-btn ${sureDelete ? 'lg-btn--danger-solid' : 'lg-btn--danger'}`}
              onClick={() => {
                if (sureDelete) {
                  onDelete(draft.id)
                  onClose()
                } else setSureDelete(true)
              }}
            >
              {sureDelete ? '정말 삭제할까요?' : '삭제'}
            </button>
          )}
          <span className="lg-spacer" />
          <button type="button" className="lg-btn" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="lg-btn lg-btn--primary">
            저장
          </button>
        </div>
      </form>
    </div>
  )
}
