import { useState } from 'react'
import { ChevronDown, Pencil, Plus, Settings2, Trash2 } from 'lucide-react'
import type { BudgetPresetId, Category } from '../types'
import { PROTECTED_CATEGORY_IDS } from '../types'
import { formatCompactKRW, formatKRW } from '../lib/format'
import { confirmBudgetOverAllocation } from '../lib/validation'
import { CategoryRenameForm } from './CategoryRenameForm'
import { BudgetAllocator } from './BudgetAllocator'

interface CategoryBreakdownProps {
  totalBudget: number
  categories: Array<Category & { spent: number }>
  budgetPreset?: BudgetPresetId
  laborCommitted?: number
  onUpdatePlanned: (id: string, planned: number) => void
  onApplyAllocations: (allocations: Record<string, number>) => void
  onPresetSelect: (presetId: BudgetPresetId) => void
  onAddCategory: (name: string) => void
  onRenameCategory: (id: string, name: string) => void
  onDeleteCategory: (id: string) => void
  /** 간단 목록 (기본) */
  simple?: boolean
}

export function CategoryBreakdown({
  totalBudget,
  categories,
  budgetPreset,
  laborCommitted = 0,
  onUpdatePlanned,
  onApplyAllocations,
  onPresetSelect,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
  simple = true,
}: CategoryBreakdownProps) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null)
  const [showAllocator, setShowAllocator] = useState(false)
  const [manageMode, setManageMode] = useState(false)
  const max = Math.max(
    ...categories.map((c) => Math.max(c.planned, c.spent)),
    1,
  )

  if (simple) {
    return (
      <div className="category-block category-block--simple">
        <div className="category-block__toolbar">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setShowAllocator((v) => !v)}
            aria-expanded={showAllocator}
          >
            <ChevronDown
              size={14}
              className={showAllocator ? 'icon-rotated' : ''}
              aria-hidden
            />
            예산 자동 배분
          </button>
          <button
            type="button"
            className={`btn btn--ghost btn--sm ${manageMode ? 'btn--active' : ''}`}
            onClick={() => setManageMode((v) => !v)}
          >
            <Settings2 size={14} />
            {manageMode ? '완료' : '카테고리 관리'}
          </button>
        </div>

        {showAllocator && (
          <BudgetAllocator
            totalBudget={totalBudget}
            categories={categories}
            budgetPreset={budgetPreset}
            onApplyAllocations={onApplyAllocations}
            onPresetSelect={onPresetSelect}
          />
        )}

        <ul className="category-simple-list">
          {categories.map((c) => {
            const over = c.planned > 0 && c.spent > c.planned
            const pct =
              c.planned > 0
                ? Math.min(100, Math.round((c.spent / c.planned) * 100))
                : c.spent > 0
                  ? 100
                  : 0
            const isLabor = c.id === 'labor'
            return (
              <li key={c.id} className="category-simple-row">
                <span
                  className="category-simple-row__dot"
                  style={{ background: c.color }}
                  aria-hidden
                />
                <div className="category-simple-row__main">
                  <div className="category-simple-row__head">
                    <strong>{c.name}</strong>
                    {over && <span className="badge badge--warn">초과</span>}
                    {isLabor && laborCommitted > 0 && (
                      <span className="muted"> · 입금·인건비 탭</span>
                    )}
                  </div>
                  <div
                    className="category-simple-row__bar"
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span
                      className="category-simple-row__fill"
                      style={{ width: `${pct}%`, background: c.color }}
                    />
                  </div>
                  <p className="category-simple-row__meta muted">
                    집행 {formatKRW(c.spent)}
                    {c.planned > 0 && ` · 배정 ${formatKRW(c.planned)}`}
                  </p>
                </div>
                {manageMode && (
                  <div className="category-simple-row__edit">
                    <input
                      className="inline-num inline-num--sm"
                      type="number"
                      min={0}
                      step={100000}
                      value={c.planned || ''}
                      placeholder="배정"
                      aria-label={`${c.name} 배정 예산`}
                      onChange={(e) => {
                        const planned = Number(e.target.value) || 0
                        const next = { [c.id]: planned }
                        if (
                          !confirmBudgetOverAllocation(
                            totalBudget,
                            categories.map(({ id, name, color, planned: p }) => ({
                              id,
                              name,
                              color,
                              planned: p,
                            })),
                            next,
                          )
                        ) {
                          return
                        }
                        onUpdatePlanned(c.id, planned)
                      }}
                    />
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`${c.name} 이름 변경`}
                      onClick={() => setRenaming({ id: c.id, name: c.name })}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn--danger"
                      aria-label={`${c.name} 삭제`}
                      disabled={
                        categories.length <= 1 || PROTECTED_CATEGORY_IDS.has(c.id)
                      }
                      onClick={() => {
                        if (
                          confirm(
                            `「${c.name}」 카테고리를 삭제할까요? 해당 지출은 다른 카테고리로 이동합니다.`,
                          )
                        ) {
                          onDeleteCategory(c.id)
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        {manageMode &&
          (adding ? (
            <form
              className="category-add"
              onSubmit={(e) => {
                e.preventDefault()
                if (!newName.trim()) return
                onAddCategory(newName)
                setNewName('')
                setAdding(false)
              }}
            >
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="카테고리명"
              />
              <button type="submit" className="btn btn--primary btn--sm">
                추가
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  setAdding(false)
                  setNewName('')
                }}
              >
                취소
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="btn btn--ghost category-add-btn"
              onClick={() => setAdding(true)}
            >
              <Plus size={16} />
              카테고리 추가
            </button>
          ))}

        <CategoryRenameForm
          open={renaming != null}
          onClose={() => setRenaming(null)}
          initialName={renaming?.name ?? ''}
          onSubmit={(name) => {
            if (renaming) onRenameCategory(renaming.id, name)
          }}
        />
      </div>
    )
  }

  return (
    <div className="category-block">
      <BudgetAllocator
        totalBudget={totalBudget}
        categories={categories}
        budgetPreset={budgetPreset}
        onApplyAllocations={onApplyAllocations}
        onPresetSelect={onPresetSelect}
      />

      <div className="category-grid">
        {categories.map((c, i) => {
          const over = c.planned > 0 && c.spent > c.planned
          const spentPct = (c.spent / max) * 100
          const planPct = (c.planned / max) * 100
          const isLabor = c.id === 'labor'
          return (
            <article
              key={c.id}
              className={`category-card ${isLabor ? 'category-card--labor' : ''}`}
              style={{ animationDelay: `${120 + i * 40}ms` }}
            >
              <header className="category-card__head">
                <span
                  className="dot"
                  style={{ background: c.color }}
                  aria-hidden
                />
                <h3>{c.name}</h3>
                {over && <span className="badge badge--warn">초과</span>}
                <div className="category-card__tools">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`${c.name} 이름 변경`}
                    onClick={() => setRenaming({ id: c.id, name: c.name })}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    aria-label={`${c.name} 삭제`}
                    disabled={categories.length <= 1 || PROTECTED_CATEGORY_IDS.has(c.id)}
                    title={PROTECTED_CATEGORY_IDS.has(c.id) ? '시스템 카테고리는 삭제할 수 없습니다' : undefined}
                    onClick={() => {
                      if (
                        confirm(
                          `「${c.name}」 카테고리를 삭제할까요? 해당 지출은 다른 카테고리로 이동합니다.`,
                        )
                      ) {
                        onDeleteCategory(c.id)
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </header>

              {isLabor && laborCommitted > 0 && (
                <p className="category-card__labor-note">
                  약정 인건비 {formatKRW(laborCommitted)} · 지출 {formatKRW(c.spent)}
                  <span className="muted"> · 입금·인건비 탭에서 관리</span>
                </p>
              )}

              <div className="category-card__bars" aria-hidden>
                <div className="bar bar--plan" style={{ width: `${planPct}%` }} />
                <div
                  className="bar bar--spent"
                  style={{ width: `${spentPct}%`, background: c.color }}
                />
              </div>

              <dl className="category-card__stats">
                <div>
                  <dt>집행</dt>
                  <dd>{formatKRW(c.spent)}</dd>
                </div>
                <div>
                  <dt>배정</dt>
                  <dd>
                    <input
                      className="inline-num"
                      type="number"
                      min={0}
                      step={100000}
                      value={c.planned || ''}
                      placeholder="0"
                      aria-label={`${c.name} 배정 예산`}
                      onChange={(e) => {
                        const planned = Number(e.target.value) || 0
                        const next = { [c.id]: planned }
                        if (
                          !confirmBudgetOverAllocation(
                            totalBudget,
                            categories.map(({ id, name, color, planned: p }) => ({
                              id,
                              name,
                              color,
                              planned: p,
                            })),
                            next,
                          )
                        ) {
                          return
                        }
                        onUpdatePlanned(c.id, planned)
                      }}
                    />
                  </dd>
                </div>
              </dl>
              <p className="category-card__hint muted">
                배정 {formatCompactKRW(c.planned)} · 남은{' '}
                {formatCompactKRW(Math.max(c.planned - c.spent, 0))}
              </p>
            </article>
          )
        })}
      </div>

      {adding ? (
        <form
          className="category-add"
          onSubmit={(e) => {
            e.preventDefault()
            if (!newName.trim()) return
            onAddCategory(newName)
            setNewName('')
            setAdding(false)
          }}
        >
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="카테고리명"
          />
          <button type="submit" className="btn btn--primary btn--sm">
            추가
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              setAdding(false)
              setNewName('')
            }}
          >
            취소
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="btn btn--ghost category-add-btn"
          onClick={() => setAdding(true)}
        >
          <Plus size={16} />
          세부 카테고리 추가
        </button>
      )}

      <CategoryRenameForm
        open={renaming != null}
        onClose={() => setRenaming(null)}
        initialName={renaming?.name ?? ''}
        onSubmit={(name) => {
          if (renaming) onRenameCategory(renaming.id, name)
        }}
      />
    </div>
  )
}
