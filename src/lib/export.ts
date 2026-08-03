import {
  buildLedgerEntries,
  formatMonthLabel,
  getMonthStats,
  type LedgerEntry,
} from './ledger'
import type { Project } from '../types'
import { getOverduePayments } from './receivables'

function escapeCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`
}

function rowsToCSV(rows: (string | number)[][]): string {
  const bom = '\uFEFF'
  const body = rows.map((row) => row.map(escapeCell).join(',')).join('\n')
  return bom + body
}

function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function ledgerRow(entry: LedgerEntry): (string | number)[] {
  return [
    entry.date,
    entry.type === 'income' ? '매출' : '매입',
    entry.title,
    entry.projectName,
    entry.sublabel ?? '',
    entry.type === 'income' ? entry.amount : -entry.amount,
    entry.sourceType,
  ]
}

/** 월별 입출금 장부 CSV */
export function exportMonthlyLedgerCSV(
  projects: Project[],
  month: string,
  projectId?: string,
) {
  const entries = buildLedgerEntries(projects, { month, projectId })
  const stats = getMonthStats(projects, month, projectId)
  const label = formatMonthLabel(month).replace(/\s/g, '')
  const scope = projectId
    ? projects.find((p) => p.id === projectId)?.name ?? 'project'
    : '전체'

  const rows: (string | number)[][] = [
    ['ReelBudget 월별 장부'],
    ['기간', formatMonthLabel(month)],
    ['범위', scope],
    ['매출', stats.sales],
    ['매입', stats.purchases],
    ['순이익', stats.net],
    [],
    ['날짜', '구분', '항목', '프로젝트', '세부', '금액', '출처'],
    ...entries.map(ledgerRow),
  ]

  downloadCSV(`ReelBudget_${label}_${scope}.csv`, rowsToCSV(rows))
}

/** 프로젝트 전체 요약 CSV */
export function exportProjectCSV(project: Project) {
  const rows: (string | number)[][] = [
    ['ReelBudget 프로젝트 내보내기'],
    ['프로젝트', project.name],
    ['클라이언트', project.client],
    ['계약금액', project.revenue],
    ['제작예산', project.totalBudget],
    [],
    ['[클라이언트 입금]'],
    ['회차', '금액', '예정일', '입금일', '상태', '계산서발행', '발행일', '메모'],
    ...project.clientPayments.map((cp) => [
      cp.label,
      cp.amount,
      cp.dueDate,
      cp.paidDate,
      cp.isPaid ? '입금완료' : '미입금',
      cp.invoiceIssued ? '발행' : '미발행',
      cp.invoiceDate ?? '',
      cp.note,
    ]),
    [],
    ['[지출 내역]'],
    ['항목', '금액', '날짜', '카테고리', '거래처', '계산서수령', '메모'],
    ...project.expenses.map((e) => {
      const cat = project.categories.find((c) => c.id === e.categoryId)
      return [
        e.title,
        e.amount,
        e.date,
        cat?.name ?? '',
        e.vendor,
        e.invoiceReceived ? '수령' : '미수령',
        e.note,
      ]
    }),
    [],
    ['[인건비 지급]'],
    ['이름', '역할', '금액', '근무일', '지급일', '상태', '지출연동', '메모'],
    ...project.laborPayments.map((lp) => [
      lp.name,
      lp.role,
      lp.amount,
      lp.workDate,
      lp.paidDate,
      lp.isPaid ? '지급완료' : '미지급',
      lp.expenseId ? '연동됨' : '',
      lp.note,
    ]),
  ]

  downloadCSV(`ReelBudget_${project.name.replace(/\s/g, '_')}.csv`, rowsToCSV(rows))
}

/** 전체 프로젝트 연간 요약 CSV */
export function exportYearlySummaryCSV(projects: Project[], year: number) {
  const rows: (string | number)[][] = [
    ['ReelBudget 연간 요약'],
    ['연도', year],
    [],
    ['월', '매출', '매입', '순이익'],
  ]

  for (let m = 1; m <= 12; m++) {
    const month = `${year}-${String(m).padStart(2, '0')}`
    const stats = getMonthStats(projects, month)
    rows.push([formatMonthLabel(month), stats.sales, stats.purchases, stats.net])
  }

  const overdue = getOverduePayments(projects)
  if (overdue.length > 0) {
    rows.push([], ['[연체 미수금]'], ['프로젝트', '회차', '금액', '예정일', '연체일수'])
    for (const o of overdue) {
      rows.push([
        o.projectName,
        o.payment.label,
        o.payment.amount,
        o.payment.dueDate,
        o.daysOverdue,
      ])
    }
  }

  downloadCSV(`ReelBudget_${year}년_요약.csv`, rowsToCSV(rows))
}
