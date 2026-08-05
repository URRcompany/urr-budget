import type { Project } from '../types'
import {
  calcVatFromSupply,
  resolveExpenseTax,
  type VatMode,
} from './vat'

export type ContractFields = Pick<
  Project,
  'revenue' | 'totalBudget' | 'contractVatMode' | 'contractSupplyAmount' | 'contractVatAmount'
>

/** 프로젝트 계약 금액 (공급가·부가세·합계) */
export function resolveProjectContract(
  project: Pick<
    Project,
    'revenue' | 'contractVatMode' | 'contractSupplyAmount' | 'contractVatAmount'
  >,
) {
  const mode = project.contractVatMode ?? 'included'
  return resolveExpenseTax({
    amount: project.revenue,
    vatMode: mode,
    supplyAmount: project.contractSupplyAmount,
    vatAmount: project.contractVatAmount,
  })
}

/** 폼 입력 → revenue·totalBudget 동기화 (계약=예산) */
export function normalizeProjectContractInput(input: {
  amount: number
  vatMode: VatMode
}): ContractFields {
  const amount = Math.max(0, input.amount)
  const mode = input.vatMode

  if (mode === 'separate') {
    const supply = amount
    const vat = calcVatFromSupply(supply)
    const total = supply + vat
    return {
      revenue: total,
      totalBudget: total,
      contractVatMode: mode,
      contractSupplyAmount: supply,
      contractVatAmount: vat,
    }
  }

  if (mode === 'exempt') {
    return {
      revenue: amount,
      totalBudget: amount,
      contractVatMode: mode,
      contractSupplyAmount: amount,
      contractVatAmount: 0,
    }
  }

  const tax = resolveExpenseTax({ amount, vatMode: 'included' })
  return {
    revenue: tax.total,
    totalBudget: tax.total,
    contractVatMode: 'included',
    contractSupplyAmount: tax.supply,
    contractVatAmount: tax.vat,
  }
}

/** 기존 프로젝트 로드 시 totalBudget을 revenue와 맞춤 */
export function syncProjectContractBudget(
  project: Partial<Project> & Pick<Project, 'revenue'>,
): ContractFields {
  const revenue = Math.max(0, project.revenue ?? 0)
  const totalBudget = Math.max(0, project.totalBudget ?? revenue)
  const unified = Math.max(revenue, totalBudget)
  const tax = resolveProjectContract({
    revenue: unified,
    contractVatMode: project.contractVatMode,
    contractSupplyAmount: project.contractSupplyAmount,
    contractVatAmount: project.contractVatAmount,
  })
  return {
    revenue: unified,
    totalBudget: unified,
    contractVatMode: project.contractVatMode ?? 'included',
    contractSupplyAmount: project.contractSupplyAmount ?? tax.supply,
    contractVatAmount: project.contractVatAmount ?? tax.vat,
  }
}

export function contractAmountLabel(vatMode: VatMode): string {
  switch (vatMode) {
    case 'separate':
      return '계약 금액 (원, 부가세 제외)'
    case 'exempt':
      return '계약 금액 (원, 면세)'
    default:
      return '계약 금액 (원, 부가세 포함)'
  }
}
