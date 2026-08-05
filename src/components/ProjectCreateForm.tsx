import { useState } from 'react'
import { contractAmountLabel } from '../lib/contract'
import { ContractAmountPreview } from './ContractAmountFields'
import type { VatMode } from '../lib/vat'

interface ProjectCreateFormProps {
  formId?: string
  onSubmit: (input: {
    name: string
    client: string
    shootDate: string
    contractAmount: number
    contractVatMode: VatMode
  }) => void
}

export function ProjectCreateForm({ formId, onSubmit }: ProjectCreateFormProps) {
  const [vatMode, setVatMode] = useState<VatMode>('separate')
  const [amount, setAmount] = useState('')

  return (
    <form
      id={formId}
      className="form project-create-form"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        onSubmit({
          name: String(fd.get('name') || ''),
          client: String(fd.get('client') || ''),
          shootDate: String(fd.get('shootDate') || ''),
          contractAmount: Math.max(0, Number(fd.get('contractAmount')) || 0),
          contractVatMode: (String(fd.get('contractVatMode') || 'separate') as VatMode) || 'separate',
        })
      }}
    >
      <label className="field">
        <span>프로젝트명</span>
        <input name="name" required placeholder="예: 브랜드 CF 30초" autoFocus />
      </label>
      <label className="field">
        <span>클라이언트</span>
        <input name="client" placeholder="선택 사항" />
      </label>
      <label className="field">
        <span>촬영일</span>
        <input name="shootDate" type="date" />
      </label>

      <label className="field">
        <span>부가세</span>
        <select
          name="contractVatMode"
          value={vatMode}
          onChange={(e) => setVatMode(e.target.value as VatMode)}
        >
          <option value="separate">별도 (공급가 + VAT 10%) — 기본</option>
          <option value="included">포함 (합계 입력)</option>
          <option value="exempt">면세</option>
        </select>
      </label>

      <label className="field">
        <span>{contractAmountLabel(vatMode)}</span>
        <input
          name="contractAmount"
          type="number"
          min={0}
          step={100000}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
        />
      </label>

      <ContractAmountPreview
        amount={Math.max(0, Number(amount) || 0)}
        vatMode={vatMode}
      />
    </form>
  )
}
