import { useState, type FormEvent } from 'react'
import type { Project } from '../../types'
import { projectLedger, todayISO } from '../../lib/money'
import { MoneyInput } from './MoneyInput'
import { won } from './format'

interface QuickPayModalProps {
  project: Project
  onClose: () => void
  onPay: (payment: { date: string; amount: number; memo: string }) => void
}

export function QuickPayModal({ project, onClose, onPay }: QuickPayModalProps) {
  const l = projectLedger(project)
  const [amount, setAmount] = useState(l.due)
  const [date, setDate] = useState(todayISO())
  const [memo, setMemo] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!amount) return
    onPay({ date, amount, memo: memo.trim() })
    onClose()
  }

  return (
    <div className="lg-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="lg-modal lg-modal--sm" onSubmit={submit}>
        <h2>입금 받음 처리</h2>
        <p className="lg-meta" style={{ marginBottom: 14 }}>
          {project.name} · 남은 금액 {won(l.due)}
        </p>
        <div className="lg-fgrid">
          <label className="lg-field">
            <span>입금액</span>
            <MoneyInput value={amount} onChange={setAmount} autoFocus />
          </label>
          <label className="lg-field">
            <span>입금일</span>
            <input className="lg-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="lg-field lg-field--full">
            <span>메모 (선택)</span>
            <input
              className="lg-input"
              value={memo}
              placeholder={l.received ? '잔금' : '전액'}
              onChange={(e) => setMemo(e.target.value)}
            />
          </label>
        </div>
        <div className="lg-mfoot">
          <span className="lg-spacer" />
          <button type="button" className="lg-btn" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="lg-btn lg-btn--pay" disabled={!amount}>
            입금 기록
          </button>
        </div>
      </form>
    </div>
  )
}
