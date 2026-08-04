import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { Category } from '../types'
import { formatCompactKRW, formatKRW } from '../lib/format'

interface CategoryBreakdownProps {
  categories: Array<Category & { spent: number }>
  onUpdatePlanned: (id: string, planned: number) => void
  onAddCategory: (name: string) => void
  onRenameCategory: (id: string, name: string) => void
  onDeleteCategory: (id: string) => void
}

export function CategoryBreakdown({
  categories,
  onUpdatePlanned,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
}: CategoryBreakdownProps) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const max = Math.max(
    ...categories.map((c) => Math.max(c.planned, c.spent)),
    1,
  )

  return (
    <div className="category-block">
      <div className="category-grid">
        {categories.map((c, i) => {
          const over = c.planned > 0 && c.spent > c.planned
          const spentPct = (c.spent / max) * 100
          const planPct = (c.planned / max) * 100
          return (
            <article
              key={c.id}
              className="category-card"
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
                    onClick={() => {
                      const next = prompt('카테고리 이름', c.name)
                      if (next) onRenameCategory(c.id, next)
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    aria-label={`${c.name} 삭제`}
                    disabled={categories.length <= 1}
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
                      onChange={(e) =>
                        onUpdatePlanned(c.id, Number(e.target.value) || 0)
                      }
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
    </div>
  )
}
