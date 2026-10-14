export function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatCompactKRW(amount: number): string {
  if (Math.abs(amount) >= 100_000_000) {
    return `${(amount / 100_000_000).toFixed(1).replace(/\.0$/, '')}억`
  }
  if (Math.abs(amount) >= 10_000) {
    return `${Math.round(amount / 10_000).toLocaleString('ko-KR')}만`
  }
  return amount.toLocaleString('ko-KR')
}

/** 2026-03-15 → 3월 15일 */
export function formatShortDate(iso: string): string {
  if (!iso) return '—'
  const [, m, d] = iso.split('-').map(Number)
  if (!m || !d) return iso
  return `${m}월 ${d}일`
}

/** 입력값에서 숫자만 추출 */
export function parseAmount(raw: string): number {
  const digits = raw.replace(/[^\d]/g, '')
  return digits ? Number(digits) : 0
}

/** 입력 중 천 단위 콤마 */
export function formatAmountInput(raw: string): string {
  const n = parseAmount(raw)
  return n ? n.toLocaleString('ko-KR') : ''
}

export function uid(prefix = 'e'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}
