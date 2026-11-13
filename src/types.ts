/** 수입 / 인건비 / 장비 렌탈 / 식비·기타 */
export type EntryKind = 'income' | 'labor' | 'equipment' | 'misc'

export const EXPENSE_KINDS = ['labor', 'equipment', 'misc'] as const
export type ExpenseKind = (typeof EXPENSE_KINDS)[number]

export const ENTRY_KIND_LABEL: Record<EntryKind, string> = {
  income: '수입',
  labor: '인건비',
  equipment: '장비 렌탈',
  misc: '식비·기타',
}

export interface Entry {
  id: string
  kind: EntryKind
  /** 수입: 메모 · 인건비: 이름 · 장비/식비·기타: 항목명 */
  title: string
  /** 인건비 역할 (선택) */
  role?: string
  amount: number
  /** YYYY-MM-DD — 수입은 실제로 받은 날 */
  date: string
  /** 인건비 지급 여부 (인건비만) */
  paid?: boolean
}

export interface Project {
  id: string
  name: string
  client: string
  /** YYYY-MM-DD. 비어 있으면 날짜 없음 */
  date: string
  /** 받을 금액(계약 기준 실제 입금될 총액). 0 = 미정 */
  amount: number
  /** 입금 기한 YYYY-MM-DD (선택) */
  dueDate: string
  memo: string
  entries: Entry[]
  createdAt: string
}

export interface AppStore {
  version: 4
  projects: Project[]
  activeProjectId: string | null
}

export function createEmptyStore(): AppStore {
  return { version: 4, projects: [], activeProjectId: null }
}
