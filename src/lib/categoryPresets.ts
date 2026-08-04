import type { BudgetPresetId, Category } from '../types'
import { allocateByRatios } from './budget'

export interface BudgetPresetDef {
  id: BudgetPresetId
  label: string
  description: string
  ratios: Record<string, number>
}

function normalizeRatios(ratios: Record<string, number>): Record<string, number> {
  const sum = Object.values(ratios).reduce((s, r) => s + r, 0)
  if (sum <= 0) return ratios
  const out: Record<string, number> = {}
  for (const [id, r] of Object.entries(ratios)) {
    out[id] = r / sum
  }
  return out
}

export const BUDGET_PRESETS: BudgetPresetDef[] = [
  {
    id: 'general',
    label: '일반',
    description: '균형 잡힌 기본 견적 비율',
    ratios: normalizeRatios({
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
    }),
  },
  {
    id: 'cf',
    label: 'CF·브랜드',
    description: '출연·미술·후반 비중 높은 상업 광고',
    ratios: normalizeRatios({
      labor: 0.22,
      cast: 0.14,
      meals: 0.03,
      transport: 0.02,
      equipment: 0.16,
      location: 0.1,
      art: 0.09,
      post: 0.18,
      insurance: 0.03,
      other: 0.03,
    }),
  },
  {
    id: 'mv',
    label: '뮤직비디오',
    description: '장비·로케이션·촬영 인력 중심',
    ratios: normalizeRatios({
      labor: 0.28,
      cast: 0.08,
      meals: 0.04,
      transport: 0.05,
      equipment: 0.22,
      location: 0.14,
      art: 0.06,
      post: 0.1,
      insurance: 0.02,
      other: 0.01,
    }),
  },
  {
    id: 'docu',
    label: '다큐·인터뷰',
    description: '인력·후반·이동 비중 높은 다큐/인터뷰',
    ratios: normalizeRatios({
      labor: 0.35,
      cast: 0.05,
      meals: 0.05,
      transport: 0.08,
      equipment: 0.12,
      location: 0.08,
      art: 0.02,
      post: 0.2,
      insurance: 0.03,
      other: 0.02,
    }),
  },
]

export function getBudgetPreset(id: BudgetPresetId): BudgetPresetDef {
  return BUDGET_PRESETS.find((p) => p.id === id) ?? BUDGET_PRESETS[0]
}

export function allocateByBudgetPreset(
  totalBudget: number,
  categories: Category[],
  presetId: BudgetPresetId,
): Record<string, number> {
  const preset = getBudgetPreset(presetId)
  const ratios: Record<string, number> = {}
  for (const cat of categories) {
    ratios[cat.id] = preset.ratios[cat.id] ?? 0
  }
  const ratioSum = Object.values(ratios).reduce((s, r) => s + r, 0)
  if (ratioSum <= 0) {
    const equal = 1 / Math.max(categories.length, 1)
    for (const cat of categories) ratios[cat.id] = equal
  }
  return allocateByRatios(totalBudget, categories, ratios)
}
