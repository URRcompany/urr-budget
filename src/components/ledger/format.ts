export function won(n: number): string {
  return `${(Number(n) || 0).toLocaleString('ko-KR')}원`
}

/** 2026-11-04 → 11/4 */
export function dshort(iso: string): string {
  const p = iso.split('-')
  return p.length === 3 ? `${Number(p[1])}/${Number(p[2])}` : iso
}
