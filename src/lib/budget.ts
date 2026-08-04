import type { Category } from '../types'
import { DEFAULT_CATEGORY_DEFS } from '../types'

/** 영상제작 견적 기본 비율 (합 100%) */
export const DEFAULT_BUDGET_RATIOS: Record<string, number> = {
  labor: 0.25,
  cast: 0.15,
  meals: 0.03,
  transport: 0.02,
  equipment: 0.15,
  location: 0.1,
  art: 0.05,
  post: 0.15,
  insurance: 0.02,
  other: 0.08,
}

export function categoryPlannedTotal(categories: Category[]): number {
  return categories.reduce((sum, c) => sum + c.planned, 0)
}

export function categoryBudgetAllocation(
  totalBudget: number,
  categories: Category[],
): {
  planned: number
  unallocated: number
  overAllocated: number
  matchesBudget: boolean
} {
  const planned = categoryPlannedTotal(categories)
  const diff = totalBudget - planned
  return {
    planned,
    unallocated: Math.max(diff, 0),
    overAllocated: Math.max(-diff, 0),
    matchesBudget: totalBudget > 0 ? planned === totalBudget : planned === 0,
  }
}

/** 비율 프리셋으로 카테고리별 배정액 계산 (반올림 오차는 마지막 항목에 보정) */
export function allocateByRatios(
  totalBudget: number,
  categories: Category[],
  ratios: Record<string, number>,
): Record<string, number> {
  if (totalBudget <= 0 || categories.length === 0) {
    return Object.fromEntries(categories.map((c) => [c.id, 0]))
  }

  const result: Record<string, number> = {}
  let assigned = 0

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i]
    const isLast = i === categories.length - 1
    if (isLast) {
      result[cat.id] = Math.max(0, totalBudget - assigned)
    } else {
      const ratio = ratios[cat.id] ?? 0
      const amount = Math.round(totalBudget * ratio)
      result[cat.id] = amount
      assigned += amount
    }
  }

  return result
}

/** 견적 기본 비율 적용 (알려진 ID만, 나머지는 0) */
export function allocateByDefaultPreset(
  totalBudget: number,
  categories: Category[],
): Record<string, number> {
  const knownIds = new Set(DEFAULT_CATEGORY_DEFS.map((c) => c.id))
  const ratios: Record<string, number> = {}

  for (const cat of categories) {
    ratios[cat.id] = knownIds.has(cat.id) ? (DEFAULT_BUDGET_RATIOS[cat.id] ?? 0) : 0
  }

  const ratioSum = Object.values(ratios).reduce((s, r) => s + r, 0)
  if (ratioSum > 0 && ratioSum !== 1) {
    for (const id of Object.keys(ratios)) {
      ratios[id] = ratios[id] / ratioSum
    }
  }

  return allocateByRatios(totalBudget, categories, ratios)
}

/** 카테고리 수 균등 배분 */
export function allocateEqually(
  totalBudget: number,
  categories: Category[],
): Record<string, number> {
  if (totalBudget <= 0 || categories.length === 0) {
    return Object.fromEntries(categories.map((c) => [c.id, 0]))
  }

  const base = Math.floor(totalBudget / categories.length)
  let remainder = totalBudget - base * categories.length
  const result: Record<string, number> = {}

  for (const cat of categories) {
    const extra = remainder > 0 ? 1 : 0
    result[cat.id] = base + extra
    if (remainder > 0) remainder -= 1
  }

  return result
}

/** 미배정 잔액을 배정 0인 카테고리에 균등 배분 */
export function fillUnallocated(
  totalBudget: number,
  categories: Category[],
): Record<string, number> {
  const current = Object.fromEntries(categories.map((c) => [c.id, c.planned]))
  const planned = categoryPlannedTotal(categories)
  const remaining = totalBudget - planned
  if (remaining <= 0) return current

  const empty = categories.filter((c) => c.planned === 0)
  const targets = empty.length > 0 ? empty : categories
  const extra = allocateEqually(remaining, targets)

  for (const cat of targets) {
    current[cat.id] = (current[cat.id] ?? 0) + (extra[cat.id] ?? 0)
  }

  return current
}
