import { useState } from 'react'
import { Clapperboard, LayoutGrid, Mic2, PieChart, RotateCcw, Sparkles } from 'lucide-react'
import type { BudgetPresetId, Category } from '../types'
import {
  allocateEqually,
  categoryBudgetAllocation,
  fillUnallocated,
} from '../lib/budget'
import { allocateByBudgetPreset, BUDGET_PRESETS } from '../lib/categoryPresets'
import { formatKRW } from '../lib/format'

const PRESET_ICONS: Record<BudgetPresetId, typeof PieChart> = {
  general: PieChart,
  cf: Clapperboard,
  mv: Mic2,
  docu: LayoutGrid,
}

interface BudgetAllocatorProps {
  totalBudget: number
  categories: Category[]
  budgetPreset?: BudgetPresetId
  onApplyAllocations: (allocations: Record<string, number>) => void
  onPresetSelect: (presetId: BudgetPresetId) => void
}

export function BudgetAllocator({
  totalBudget,
  categories,
  budgetPreset = 'general',
  onApplyAllocations,
  onPresetSelect,
}: BudgetAllocatorProps) {
  const [expanded, setExpanded] = useState(false)
  const allocation = categoryBudgetAllocation(totalBudget, categories)
  const hasBudget = totalBudget > 0

  const applyPreset = (allocations: Record<string, number>) => {
    onApplyAllocations(allocations)
  }

  const handleTypePreset = (id: BudgetPresetId) => {
    onPresetSelect(id)
    if (hasBudget) {
      applyPreset(allocateByBudgetPreset(totalBudget, categories, id))
    }
  }

  return (
    <div className="budget-allocator">
      <div className="budget-allocator__types">
        <span className="budget-allocator__types-label">프로젝트 유형</span>
        <div className="preset-chips" role="group" aria-label="예산 프리셋">
          {BUDGET_PRESETS.map((p) => {
            const Icon = PRESET_ICONS[p.id]
            return (
              <button
                key={p.id}
                type="button"
                className={`preset-chip ${budgetPreset === p.id ? 'preset-chip--active' : ''}`}
                title={p.description}
                onClick={() => handleTypePreset(p.id)}
              >
                <Icon size={14} aria-hidden />
                {p.label}
              </button>
            )
          })}
        </div>
        <p className="muted budget-allocator__preset-desc">
          {BUDGET_PRESETS.find((p) => p.id === budgetPreset)?.description}
        </p>
      </div>

      <div
        className={`allocation-banner allocation-banner--budget ${allocation.matchesBudget ? 'allocation-banner--ok' : hasBudget ? 'allocation-banner--warn' : ''}`}
        role="status"
      >
        <div className="budget-allocator__summary">
          <span>
            제작 예산 <strong>{formatKRW(totalBudget)}</strong>
          </span>
          <span aria-hidden>·</span>
          <span>
            배정 합계 <strong>{formatKRW(allocation.planned)}</strong>
          </span>
          {hasBudget && !allocation.matchesBudget && (
            <>
              <span aria-hidden>·</span>
              {allocation.overAllocated > 0 ? (
                <strong className="warn-text">
                  예산 초과 {formatKRW(allocation.overAllocated)}
                </strong>
              ) : (
                <span className="warn-text">
                  미배정 {formatKRW(allocation.unallocated)}
                </span>
              )}
            </>
          )}
          {hasBudget && allocation.matchesBudget && allocation.planned > 0 && (
            <span className="profit"> · 예산과 일치</span>
          )}
        </div>

        {!hasBudget && (
          <p className="budget-allocator__hint muted">
            프로젝트 설정에서 제작 예산을 입력하면 선택한 유형 비율로 배분할 수 있습니다.
          </p>
        )}
      </div>

      {hasBudget && (
        <div className="budget-allocator__actions">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() =>
              applyPreset(allocateByBudgetPreset(totalBudget, categories, budgetPreset))
            }
          >
            <PieChart size={15} />
            유형 비율 적용
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => applyPreset(allocateEqually(totalBudget, categories))}
          >
            <LayoutGrid size={15} />
            균등 배분
          </button>
          {allocation.unallocated > 0 && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() =>
                applyPreset(fillUnallocated(totalBudget, categories))
              }
            >
              <Sparkles size={15} />
              잔액 채우기
            </button>
          )}
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() =>
              applyPreset(Object.fromEntries(categories.map((c) => [c.id, 0])))
            }
          >
            <RotateCcw size={15} />
            배정 초기화
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? '세부 접기' : '세부 조정'}
          </button>
        </div>
      )}

      {hasBudget && expanded && (
        <div className="budget-allocator__table-wrap">
          <table className="budget-allocator__table">
            <thead>
              <tr>
                <th scope="col">카테고리</th>
                <th scope="col">배정액</th>
                <th scope="col">비율</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => {
                const pct =
                  totalBudget > 0
                    ? Math.round((c.planned / totalBudget) * 100)
                    : 0
                return (
                  <tr key={c.id}>
                    <td>
                      <span className="dot" style={{ background: c.color }} aria-hidden />
                      {c.name}
                    </td>
                    <td>
                      <input
                        className="inline-num budget-allocator__input"
                        type="number"
                        min={0}
                        step={100000}
                        value={c.planned || ''}
                        placeholder="0"
                        aria-label={`${c.name} 배정 예산`}
                        onChange={(e) =>
                          onApplyAllocations({
                            [c.id]: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </td>
                    <td className="muted">{pct}%</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>합계</td>
                <td>
                  <strong>{formatKRW(allocation.planned)}</strong>
                </td>
                <td className="muted">
                  {totalBudget > 0
                    ? `${Math.round((allocation.planned / totalBudget) * 100)}%`
                    : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
