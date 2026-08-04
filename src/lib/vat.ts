import type { Expense } from '../types'

export type VatMode = 'included' | 'separate' | 'exempt'

export const VAT_RATE = 0.1

export function calcVatFromSupply(supply: number): number {
  return Math.round(supply * VAT_RATE)
}

export function calcSupplyFromTotal(total: number): number {
  return Math.round(total / (1 + VAT_RATE))
}

export function resolveExpenseTax(expense: {
  amount: number
  vatMode?: VatMode
  supplyAmount?: number
  vatAmount?: number
}): { supply: number; vat: number; total: number; mode: VatMode } {
  const mode = expense.vatMode ?? 'included'
  const total = Math.max(0, expense.amount)

  if (mode === 'exempt') {
    return { supply: total, vat: 0, total, mode }
  }

  if (mode === 'separate') {
    const supply = Math.max(0, expense.supplyAmount ?? 0)
    const vat = expense.vatAmount ?? calcVatFromSupply(supply)
    return { supply, vat, total: supply + vat, mode }
  }

  const supply = expense.supplyAmount ?? calcSupplyFromTotal(total)
  const vat = expense.vatAmount ?? Math.max(0, total - supply)
  return { supply, vat, total, mode }
}

export function vatModeLabel(mode: VatMode): string {
  switch (mode) {
    case 'included':
      return '부가세 포함'
    case 'separate':
      return '부가세 별도'
    case 'exempt':
      return '면세'
  }
}

export function normalizeExpenseTaxFields(
  data: Omit<Expense, 'id'>,
): Pick<Expense, 'amount' | 'vatMode' | 'supplyAmount' | 'vatAmount'> {
  const mode = data.vatMode ?? 'included'
  const tax = resolveExpenseTax({ ...data, vatMode: mode })

  return {
    amount: tax.total,
    vatMode: mode,
    supplyAmount: tax.supply,
    vatAmount: tax.vat,
  }
}
