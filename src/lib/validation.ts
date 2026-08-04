import { formatKRW } from '../lib/format'
import { categoryBudgetAllocation } from './budget'
import type { Category } from '../types'

/** 예산 초과 배분 시 확인 — false면 취소 */
export function confirmBudgetOverAllocation(
  totalBudget: number,
  categories: Category[],
  nextAllocations: Record<string, number>,
): boolean {
  if (totalBudget <= 0) return true

  const merged = categories.map((c) => ({
    ...c,
    planned: nextAllocations[c.id] ?? c.planned,
  }))
  const { overAllocated } = categoryBudgetAllocation(totalBudget, merged)
  if (overAllocated <= 0) return true

  return confirm(
    `제작 예산을 ${formatKRW(overAllocated)} 초과 배분합니다.\n그래도 적용할까요?`,
  )
}
