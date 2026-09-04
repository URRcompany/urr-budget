/** 프리랜서·외주 인건비 원천징수 (소득세 3% + 지방소득세 0.3%) */
export const WITHHOLDING_RATE = 0.033

export interface WithholdingBreakdown {
  /** 지급 총액 (계약·세전) */
  gross: number
  /** 원천세 (3.3%) */
  tax: number
  /** 실수령액 */
  net: number
  rate: number
}

export function calcWithholding(gross: number): WithholdingBreakdown {
  const amount = Math.max(0, Math.round(gross))
  const tax = Math.round(amount * WITHHOLDING_RATE)
  return {
    gross: amount,
    tax,
    net: Math.max(0, amount - tax),
    rate: WITHHOLDING_RATE,
  }
}

export function withholdingRateLabel(rate = WITHHOLDING_RATE): string {
  const pct = Math.round(rate * 1000) / 10
  return `${pct}%`
}

export function formatWithholdingNote(breakdown: WithholdingBreakdown): string {
  return `원천세 ${withholdingRateLabel(breakdown.rate)}`
}

/** 인건비 탭에서 지급 연동된 지출만 원천세 대상 (식비·장비대 등 일반 지출 제외) */
export function isLaborWithholdingExpense(
  expenseId: string,
  laborPayments: ReadonlyArray<{ expenseId?: string }>,
): boolean {
  return laborPayments.some((lp) => lp.expenseId === expenseId)
}

export function laborWithholdingExpenseIds(
  laborPayments: ReadonlyArray<{ expenseId?: string }>,
): Set<string> {
  const ids = new Set<string>()
  for (const lp of laborPayments) {
    if (lp.expenseId) ids.add(lp.expenseId)
  }
  return ids
}
