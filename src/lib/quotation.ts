import type { Project } from '../types'
import { categoryPlannedTotal } from './budget'
import { COMPANY_NAME, APP_NAME } from './brand'
import { formatDate, formatKRW } from './format'
import { calcSupplyFromTotal, VAT_RATE } from './vat'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildQuotationHTML(project: Project): string {
  const plannedTotal = categoryPlannedTotal(project.categories)
  const quoteTotal = project.revenue > 0 ? project.revenue : plannedTotal
  const supply = calcSupplyFromTotal(quoteTotal)
  const vat = quoteTotal - supply
  const today = formatDate(new Date().toISOString().slice(0, 10))
  const shoot = project.shootDate ? formatDate(project.shootDate) : '협의'

  const rows = project.categories
    .filter((c) => c.planned > 0)
    .map(
      (c) => `
      <tr>
        <td>${escapeHtml(c.name)}</td>
        <td class="num">${formatKRW(c.planned)}</td>
        <td class="num">${quoteTotal > 0 ? `${Math.round((c.planned / quoteTotal) * 100)}%` : '—'}</td>
      </tr>`,
    )
    .join('')

  const emptyRow =
    rows ||
    `<tr><td colspan="3" class="muted">카테고리 배정 예산이 없습니다. 개요 탭에서 배분 후 다시 출력하세요.</td></tr>`

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>견적서 — ${escapeHtml(project.name)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
      color: #14181f;
      margin: 0;
      padding: 40px 48px;
      line-height: 1.5;
    }
    h1 { font-size: 1.75rem; margin: 0 0 0.25rem; letter-spacing: -0.02em; }
    .sub { color: #6b7380; margin-bottom: 2rem; font-size: 0.9rem; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem 2rem; margin-bottom: 2rem; font-size: 0.92rem; }
    .meta dt { color: #6b7380; margin-bottom: 0.15rem; }
    .meta dd { margin: 0; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; font-size: 0.92rem; }
    th, td { border: 1px solid #dfe3e8; padding: 0.55rem 0.65rem; text-align: left; }
    th { background: #f4f6f8; font-weight: 600; }
    td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
    .totals { margin-left: auto; width: min(100%, 320px); font-size: 0.95rem; }
    .totals div { display: flex; justify-content: space-between; padding: 0.35rem 0; border-bottom: 1px solid #eef1f4; }
    .totals .grand { font-size: 1.15rem; font-weight: 700; border-bottom: none; padding-top: 0.5rem; }
    .note { margin-top: 2rem; font-size: 0.82rem; color: #6b7380; }
    .brand-company { font-size: 1rem; color: #14181f; font-weight: 800; margin-bottom: 0.15rem; letter-spacing: -0.02em; }
    .brand-app { font-size: 0.85rem; color: #c4782a; font-weight: 700; margin-bottom: 0.5rem; }
    @media print {
      body { padding: 24px 32px; }
      @page { margin: 16mm; }
    }
  </style>
</head>
<body>
  <p class="brand-company">${escapeHtml(COMPANY_NAME)}</p>
  <p class="brand-app">${escapeHtml(APP_NAME)}</p>
  <h1>영상 제작 견적서</h1>
  <p class="sub">작성일 ${today}</p>

  <dl class="meta">
    <div><dt>프로젝트</dt><dd>${escapeHtml(project.name)}</dd></div>
    <div><dt>클라이언트</dt><dd>${escapeHtml(project.client || '—')}</dd></div>
    <div><dt>촬영 예정</dt><dd>${shoot}</dd></div>
    <div><dt>견적 유효</dt><dd>발행일로부터 30일</dd></div>
  </dl>

  <table>
    <thead>
      <tr>
        <th>항목</th>
        <th class="num">금액</th>
        <th class="num">비율</th>
      </tr>
    </thead>
    <tbody>${emptyRow}</tbody>
  </table>

  <div class="totals">
    <div><span>공급가액</span><span>${formatKRW(supply)}</span></div>
    <div><span>부가세 (${Math.round(VAT_RATE * 100)}%)</span><span>${formatKRW(vat)}</span></div>
    <div class="grand"><span>합계</span><span>${formatKRW(quoteTotal)}</span></div>
  </div>

  <p class="note">
    · 본 견적은 ${escapeHtml(COMPANY_NAME)} ${escapeHtml(APP_NAME)} 프로젝트 배정 예산을 기준으로 작성되었습니다.<br />
    · 실제 집행액은 촬영·후반 진행에 따라 변동될 수 있습니다.<br />
    · PDF 저장: 인쇄 대화상자에서 「PDF로 저장」을 선택하세요.
  </p>
</body>
</html>`
}

/** 배정 합계와 견적(계약) 금액 불일치 여부 */
export function quotationMismatch(project: Project): {
  mismatch: boolean
  plannedTotal: number
  quoteTotal: number
} {
  const plannedTotal = categoryPlannedTotal(project.categories)
  const quoteTotal = project.revenue > 0 ? project.revenue : plannedTotal
  return {
    mismatch:
      project.revenue > 0 && plannedTotal > 0 && plannedTotal !== quoteTotal,
    plannedTotal,
    quoteTotal,
  }
}

/** 견적서 HTML을 열고 인쇄(PDF 저장) 대화상자 표시 */
export function exportQuotationPDF(project: Project): boolean {
  const { mismatch, plannedTotal, quoteTotal } = quotationMismatch(project)
  if (mismatch) {
    const diff = Math.abs(plannedTotal - quoteTotal)
    const ok = confirm(
      `카테고리 배정 합계(${formatKRW(plannedTotal)})와 견적 금액(${formatKRW(quoteTotal)})이 ${formatKRW(diff)} 차이납니다.\n그래도 견적서를 출력할까요?`,
    )
    if (!ok) return false
  }

  const html = buildQuotationHTML(project)
  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700')
  if (!win) {
    alert('팝업이 차단되었습니다. 브라우저에서 팝업을 허용해 주세요.')
    return false
  }
  win.document.open()
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => {
    win.print()
  }, 350)
  return true
}
