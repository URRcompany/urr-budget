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

/** 1234567 → "123만 4,567원", 800000 → "80만 원" */
export function formatKoreanAmount(amount: number): string {
  const n = Math.max(0, Math.round(amount))
  if (n === 0) return '0원'
  const eok = Math.floor(n / 100_000_000)
  const man = Math.floor((n % 100_000_000) / 10_000)
  const rest = n % 10_000
  const parts: string[] = []
  if (eok) parts.push(`${eok.toLocaleString('ko-KR')}억`)
  if (man) parts.push(`${man.toLocaleString('ko-KR')}만`)
  if (rest) parts.push(rest.toLocaleString('ko-KR'))
  return rest ? `${parts.join(' ')}원` : `${parts.join(' ')} 원`
}

/** 달력에 있는 YYYY-MM-DD만 남긴다. 그 외는 빈 문자열 */
export function normalizeISODate(raw: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return ''
  const [y, m, d] = raw.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return ''
  return raw
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
