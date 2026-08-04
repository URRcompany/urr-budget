import { useState } from 'react'
import { LayoutGrid, PieChart, RotateCcw, Sparkles } from 'lucide-react'
import type { Category } from '../types'
import {
  allocateByDefaultPreset,
  allocateEqually,
  categoryBudgetAllocation,
  fillUnallocated,
} from '../lib/budget'
import { formatKRW } from '../lib/format'

interface BudgetAllocatorProps {
  totalBudget: number
  categories: Category[]
  onApplyAllocations: (allocations: Record<string, number>) => void
}

export function BudgetAllocator({
  totalBudget,
  categories,
  onApplyAllocations,
}: BudgetAllocatorProps) {
  const [expanded, setExpanded] = useState(false)
  const allocation = categoryBudgetAllocation(totalBudget, categories)
  const hasBudget = totalBudget > 0

  const applyPreset = (allocations: Record<string, number>) => {
    onApplyAllocations(allocations)
  }

  return (
    <div className="budget-allocator">
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
            프로젝트 설정에서 제작 예산을 입력하면 카테고리에 배분할 수 있습니다.
          </p>
        )}
      </div>

      {hasBudget && (
        <div className="budget-allocator__actions">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => applyPreset(allocateByDefaultPreset(totalBudget, categories))}
          >
            <PieChart size={15} />
            견적 비율 적용
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
