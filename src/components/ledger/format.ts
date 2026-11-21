export function won(n: number): string {
  return `${(Number(n) || 0).toLocaleString('ko-KR')}원`
}

/** 2026-11-04 → 11/4 */
export function dshort(iso: string): string {
  const p = iso.split('-')
  return p.length === 3 ? `${Number(p[1])}/${Number(p[2])}` : iso
}

/** 2,720,000 → 272만, 15,000 → 1.5만 (좁은 화면용) */
export function manwon(n: number): string {
  const v = Number(n) || 0
  if (Math.abs(v) < 10_000) return `${v.toLocaleString('ko-KR')}원`
  return `${(v / 10_000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}만`
}
