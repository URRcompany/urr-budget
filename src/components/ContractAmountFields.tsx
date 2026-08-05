import { useMemo } from 'react'
import type { Project } from '../types'
import {
  contractAmountLabel,
  normalizeProjectContractInput,
  resolveProjectContract,
} from '../lib/contract'
import { calcVatFromSupply, vatModeLabel, type VatMode } from '../lib/vat'
import { formatKRW } from '../lib/format'

export { contractAmountLabel } from '../lib/contract'

interface ContractAmountFieldsProps {
  defaultAmount?: number
  defaultVatMode?: VatMode
  amountName?: string
  vatModeName?: string
}

export function getContractFormDefaults(
  project?: Pick<
    Project,
    'revenue' | 'contractVatMode' | 'contractSupplyAmount' | 'contractVatAmount'
  >,
): { amount: number; vatMode: VatMode } {
  if (!project || project.revenue <= 0) {
    return { amount: 0, vatMode: 'separate' }
  }
  const mode = project.contractVatMode ?? 'included'
  const tax = resolveProjectContract(project)
  return {
    vatMode: mode,
    amount: mode === 'separate' ? tax.supply : tax.total,
  }
}

export function parseContractFormData(
  fd: FormData,
): ReturnType<typeof normalizeProjectContractInput> {
  const vatMode = (String(fd.get('contractVatMode') || 'separate') as VatMode) || 'separate'
  const amount = Math.max(0, Number(fd.get('contractAmount')) || 0)
  return normalizeProjectContractInput({ amount, vatMode })
}

export function ContractAmountFields({
  defaultAmount = 0,
  defaultVatMode = 'separate',
  amountName = 'contractAmount',
  vatModeName = 'contractVatMode',
}: ContractAmountFieldsProps) {
  useMemo(() => {
    return normalizeProjectContractInput({
      amount: defaultAmount,
      vatMode: defaultVatMode,
    })
  }, [defaultAmount, defaultVatMode])

  return (
    <>
      <label className="field">
        <span>부가세</span>
        <select name={vatModeName} defaultValue={defaultVatMode}>
          <option value="separate">별도 (공급가 + VAT 10%)</option>
          <option value="included">포함 (합계 입력)</option>
          <option value="exempt">면세</option>
        </select>
      </label>

      <label className="field">
        <span>{contractAmountLabel(defaultVatMode)}</span>
        <input
          name={amountName}
          type="number"
          min={0}
          step={100000}
          defaultValue={defaultAmount || ''}
          placeholder="0"
        />
      </label>

      <ContractAmountPreview amount={defaultAmount} vatMode={defaultVatMode} />

      {defaultAmount <= 0 && defaultVatMode === 'separate' && (
        <p className="form-hint muted">
          예: 공급가 10,000,000원 → VAT {formatKRW(calcVatFromSupply(10000000))} → 합계{' '}
          {formatKRW(10000000 + calcVatFromSupply(10000000))}
        </p>
      )}
    </>
  )
}

export function ContractAmountPreview({
  amount,
  vatMode,
}: {
  amount: number
  vatMode: VatMode
}) {
  if (amount <= 0) return null
  const fields = normalizeProjectContractInput({ amount, vatMode })
  const tax = resolveProjectContract(fields)
  return (
    <div className="form-hint vat-preview" role="status">
      {vatModeLabel(vatMode)} · 공급 {formatKRW(tax.supply)}
      {tax.vat > 0 && ` · VAT ${formatKRW(tax.vat)}`}
      {' · '}합계 <strong>{formatKRW(tax.total)}</strong>
    </div>
  )
}
