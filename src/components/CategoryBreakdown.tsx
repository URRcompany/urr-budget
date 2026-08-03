import type { Category } from '../types'
import { formatCompactKRW, formatKRW } from '../lib/format'

interface CategoryBreakdownProps {
  categories: Array<Category & { spent: number }>
  onUpdatePlanned: (id: Category['id'], planned: number) => void
}

export function CategoryBreakdown({
  categories,
  onUpdatePlanned,
}: CategoryBreakdownProps) {
  const max = Math.max(
    ...categories.map((c) => Math.max(c.planned, c.spent)),
    1,
  )

  return (
    <div className="category-grid">
      {categories.map((c, i) => {
        const over = c.planned > 0 && c.spent > c.planned
        const spentPct = (c.spent / max) * 100
        const planPct = (c.planned / max) * 100
        return (
          <article
            key={c.id}
            className="category-card"
            style={{ animationDelay: `${120 + i * 50}ms` }}
          >
            <header className="category-card__head">
              <span
                className="dot"
                style={{ background: c.color }}
                aria-hidden
              />
              <h3>{c.name}</h3>
              {over && <span className="badge badge--warn">초과</span>}
            </header>

            <div className="category-card__bars" aria-hidden>
              <div className="bar bar--plan" style={{ width: `${planPct}%` }} />
              <div
                className="bar bar--spent"
                style={{
                  width: `${spentPct}%`,
                  background: c.color,
                }}
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
  )
}
