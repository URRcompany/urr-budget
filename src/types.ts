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
}

export interface Project {
  id: string
  name: string
  client: string
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
