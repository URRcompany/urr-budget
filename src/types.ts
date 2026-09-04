export interface Category {
  id: string
  name: string
  color: string
  planned: number
}

export interface Expense {
  id: string
  title: string
  amount: number
  categoryId: string
  date: string
  note: string
  vendor: string
  /** 거래처 계산서·세금계산서 수령 여부 */
  invoiceReceived?: boolean
  /** 부가세 포함 / 별도 / 면세 */
  vatMode?: 'included' | 'separate' | 'exempt'
  /** 공급가액 */
  supplyAmount?: number
  /** 부가세 (10%) */
  vatAmount?: number
  /** 영수증·견적서 이미지 (JPEG data URL) */
  receiptDataUrl?: string
  receiptFileName?: string
}

/** 클라이언트 입금 회차 (선납금·잔금·중도금 등) */
export type ClientPaymentKind = 'advance' | 'balance' | 'interim' | 'custom'

/** 클라이언트 입금 회차 (계약금·중도금·잔금 등) */
export interface ClientPayment {
  id: string
  label: string
  amount: number
  dueDate: string
  paidDate: string
  isPaid: boolean
  note: string
  /** 선납금 / 잔금 / 중도금 구분 */
  kind?: ClientPaymentKind
  /** 클라이언트에게 세금계산서 발행 여부 */
  invoiceIssued?: boolean
  invoiceDate?: string
}

/** 스태프·외주 인건비 지급 (부가세 아님 — 원천세 3.3%) */
export interface LaborPayment {
  id: string
  name: string
  role: string
  /** 지급 총액(계약·세전). 원천세 3.3%는 이 금액 기준으로 계산 */
  amount: number
  workDate: string
  paidDate: string
  isPaid: boolean
  note: string
  /** 지급 시 자동 생성된 지출 ID (매입 이중집계 방지) */
  expenseId?: string
}

/** 예산 배분 프리셋 */
export type BudgetPresetId = 'general' | 'cf' | 'mv' | 'docu'

/** 홈 화면: 프로젝트 목록 / 미수금 / 세금·계산서 */
export type PortfolioView = 'projects' | 'receivables' | 'tax'

export interface Project {
  id: string
  name: string
  client: string
  shootDate: string
  /** 클라이언트 계약·매출 금액 (합계, VAT 포함 시) */
  revenue: number
  /** 제작 예산 — revenue와 동일하게 유지 */
  totalBudget: number
  /** 계약 금액 부가세 구분 (기본: 별도) */
  contractVatMode?: 'included' | 'separate' | 'exempt'
  contractSupplyAmount?: number
  contractVatAmount?: number
  /** 예산 배분 프리셋 (CF/MV/다큐 등) */
  budgetPreset?: BudgetPresetId
  categories: Category[]
  expenses: Expense[]
  clientPayments: ClientPayment[]
  laborPayments: LaborPayment[]
  createdAt: string
}

export interface AppStore {
  version: 3
  projects: Project[]
  activeProjectId: string | null
}

export const CATEGORY_PALETTE = [
  '#C4782A',
  '#2A6F7C',
  '#5B6B3A',
  '#8B4D6B',
  '#B85C38',
  '#3D6B5A',
  '#4A5E8C',
  '#6B5A3D',
  '#7A4E4E',
  '#4E6B7A',
  '#6B6B6B',
  '#8C6B3A',
]

/** 영상제작 세부 비용 카테고리 기본값 */
export const DEFAULT_CATEGORY_DEFS: Omit<Category, 'planned'>[] = [
  { id: 'labor', name: '인건비', color: '#2A6F7C' },
  { id: 'cast', name: '출연료', color: '#C4782A' },
  { id: 'meals', name: '식비', color: '#3D6B5A' },
  { id: 'transport', name: '교통비', color: '#4E6B7A' },
  { id: 'equipment', name: '장비대여비', color: '#5B6B3A' },
  { id: 'location', name: '로케이션비', color: '#8B4D6B' },
  { id: 'art', name: '미술·소품', color: '#B85C38' },
  { id: 'post', name: '후반작업', color: '#4A5E8C' },
  { id: 'insurance', name: '보험·허가', color: '#7A4E4E' },
  { id: 'other', name: '기타', color: '#6B6B6B' },
]

export function createDefaultCategories(
  planned: Partial<Record<string, number>> = {},
): Category[] {
  return DEFAULT_CATEGORY_DEFS.map((c) => ({
    ...c,
    planned: planned[c.id] ?? 0,
  }))
}

export function createEmptyProject(partial?: Partial<Project>): Project {
  const now = new Date().toISOString()
  return {
    id: `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: '새 프로젝트',
    client: '',
    shootDate: '',
    revenue: 0,
    totalBudget: 0,
    contractVatMode: 'separate',
    contractSupplyAmount: 0,
    contractVatAmount: 0,
    budgetPreset: 'general',
    categories: createDefaultCategories(),
    expenses: [],
    clientPayments: [],
    laborPayments: [],
    createdAt: now,
    ...partial,
  }
}


export function projectReceived(project: Project): number {
  return project.clientPayments
    .filter((p) => p.isPaid)
    .reduce((sum, p) => sum + p.amount, 0)
}

/** 입금 회차에 배정된 금액 합계 */
export function clientPaymentsScheduledTotal(payments: ClientPayment[]): number {
  return payments.reduce((sum, p) => sum + p.amount, 0)
}

/** 계약금액 대비 미배정·초과 배정 */
export function clientPaymentsAllocation(
  revenue: number,
  payments: ClientPayment[],
): {
  scheduled: number
  unallocated: number
  overAllocated: number
  matchesContract: boolean
} {
  const scheduled = clientPaymentsScheduledTotal(payments)
  const diff = revenue - scheduled
  return {
    scheduled,
    unallocated: Math.max(diff, 0),
    overAllocated: Math.max(-diff, 0),
    matchesContract: revenue > 0 ? scheduled === revenue : payments.length === 0,
  }
}

/** 프로젝트 현금 기준 유입·유출 (장부와 동일 로직) */
export function projectCashFlow(project: Project): {
  inflow: number
  outflow: number
  net: number
} {
  const inflow = projectReceived(project)
  let outflow = project.expenses.reduce((sum, e) => sum + e.amount, 0)
  for (const lp of project.laborPayments) {
    if (lp.isPaid && !lp.expenseId) outflow += lp.amount
  }
  return { inflow, outflow, net: inflow - outflow }
}

export function projectReceivableOutstanding(project: Project): number {
  return Math.max(project.revenue - projectReceived(project), 0)
}

export function projectClientPaymentProgress(project: Project): {
  paid: number
  total: number
  pending: number
  allPaid: boolean
  advancePaid: number
  advanceTotal: number
  balancePaid: number
  balanceTotal: number
  balanceOutstanding: number
} {
  const total = project.clientPayments.reduce((s, p) => s + p.amount, 0)
  const paid = project.clientPayments
    .filter((p) => p.isPaid)
    .reduce((s, p) => s + p.amount, 0)
  const advancePayments = project.clientPayments.filter((p) => p.kind === 'advance')
  const balancePayments = project.clientPayments.filter((p) => p.kind === 'balance')
  const advanceTotal = advancePayments.reduce((s, p) => s + p.amount, 0)
  const advancePaid = advancePayments
    .filter((p) => p.isPaid)
    .reduce((s, p) => s + p.amount, 0)
  const balanceTotal = balancePayments.reduce((s, p) => s + p.amount, 0)
  const balancePaid = balancePayments
    .filter((p) => p.isPaid)
    .reduce((s, p) => s + p.amount, 0)
  return {
    paid,
    total: total || project.revenue,
    pending: project.clientPayments.filter((p) => !p.isPaid).length,
    allPaid:
      project.clientPayments.length > 0 &&
      project.clientPayments.every((p) => p.isPaid),
    advancePaid,
    advanceTotal,
    balancePaid,
    balanceTotal,
    balanceOutstanding: Math.max(balanceTotal - balancePaid, 0),
  }
}

export function projectLaborStats(project: Project): {
  total: number
  paid: number
  unpaid: number
  paidCount: number
  unpaidCount: number
  allPaid: boolean
} {
  const total = project.laborPayments.reduce((s, p) => s + p.amount, 0)
  const paid = project.laborPayments
    .filter((p) => p.isPaid)
    .reduce((s, p) => s + p.amount, 0)
  const paidCount = project.laborPayments.filter((p) => p.isPaid).length
  const unpaidCount = project.laborPayments.filter((p) => !p.isPaid).length
  return {
    total,
    paid,
    unpaid: total - paid,
    paidCount,
    unpaidCount,
    allPaid: project.laborPayments.length > 0 && unpaidCount === 0,
  }
}

export function projectSpent(project: Project): number {
  return project.expenses.reduce((sum, e) => sum + e.amount, 0)
}

/** 미지급 인건비 (약정·확정 비용) */
export function projectUnpaidLabor(project: Project): number {
  return project.laborPayments
    .filter((p) => !p.isPaid)
    .reduce((sum, p) => sum + p.amount, 0)
}

/** 집행 + 미지급 인건비 (약정 포함) */
export function projectCommittedSpent(project: Project): number {
  return projectSpent(project) + projectUnpaidLabor(project)
}

/** 시스템 카테고리 — 삭제 불가 */
export const PROTECTED_CATEGORY_IDS = new Set(['labor'])

export function projectNetProfit(project: Project): number {
  return project.revenue - projectSpent(project)
}

export function projectMargin(project: Project): number | null {
  if (project.revenue <= 0) return null
  return projectNetProfit(project) / project.revenue
}
