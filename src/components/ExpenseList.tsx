import { FileText, Link2, Pencil, Trash2 } from 'lucide-react'
import type { Category, Expense } from '../types'
import { formatDate, formatKRW } from '../lib/format'

interface ExpenseListProps {
  expenses: Expense[]
  categoryOf: (id: Expense['categoryId']) => Category | undefined
  linkedExpenseIds?: Set<string>
  onEdit: (expense: Expense) => void
  onDelete: (id: string) => void
  onToggleInvoice?: (id: string, received: boolean) => void
}

export function ExpenseList({
  expenses,
  categoryOf,
  linkedExpenseIds,
  onEdit,
  onDelete,
  onToggleInvoice,
}: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <div className="empty">
        <p>아직 등록된 지출이 없습니다.</p>
        <p className="muted">촬영 비용을 추가해 예산을 추적해 보세요.</p>
      </div>
    )
  }

  return (
    <ul className="expense-list">
      {expenses.map((e, i) => {
        const cat = categoryOf(e.categoryId)
        const isLinked = linkedExpenseIds?.has(e.id) ?? false
        return (
          <li
            key={e.id}
            className={`expense-row ${isLinked ? 'expense-row--linked' : ''} ${!(e.invoiceReceived ?? false) ? 'expense-row--no-invoice' : ''}`}
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          >
            <span
              className="expense-row__swatch"
              style={{ background: cat?.color ?? '#888' }}
              aria-hidden
            />
            <div className="expense-row__main">
              <div className="expense-row__title">
                {e.title}
                {isLinked && (
                  <span className="link-badge expense-row__link-badge">
                    <Link2 size={12} aria-hidden />
                    인건비 연동
                  </span>
                )}
              </div>
              <div className="expense-row__meta">
                <span>{cat?.name ?? '기타'}</span>
                <span aria-hidden>·</span>
                <span>{formatDate(e.date)}</span>
                {e.vendor && (
                  <>
                    <span aria-hidden>·</span>
                    <span>{e.vendor}</span>
                  </>
                )}
                {(e.invoiceReceived ?? false) ? (
                  <>
                    <span aria-hidden>·</span>
                    <span className="profit">계산서 수령</span>
                  </>
                ) : (
                  <>
                    <span aria-hidden>·</span>
                    <span className="warn-text">계산서 미수령</span>
                  </>
                )}
              </div>
              {e.note && <p className="expense-row__note">{e.note}</p>}
              {isLinked && (
                <p className="expense-row__note muted">
                  인건비 탭에서 수정·삭제하세요. 금액은 지급 상태와 연동됩니다.
                </p>
              )}
            </div>
            <div className="expense-row__amount">{formatKRW(e.amount)}</div>
            <div className="expense-row__actions">
              {onToggleInvoice && !isLinked && (
                <button
                  type="button"
                  className={`icon-btn invoice-check-inline ${e.invoiceReceived ? 'invoice-check-inline--done' : ''}`}
                  onClick={() => onToggleInvoice(e.id, !(e.invoiceReceived ?? false))}
                  aria-label={
                    e.invoiceReceived ? '계산서 수령됨 — 취소' : '계산서 수령'
                  }
                  title={e.invoiceReceived ? '계산서 수령됨' : '계산서 수령'}
                >
                  <FileText size={16} />
                </button>
              )}
              {!isLinked && (
                <>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => onEdit(e)}
                    aria-label="수정"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    onClick={() => {
                      if (confirm(`「${e.title}」 지출을 삭제할까요?`)) onDelete(e.id)
                    }}
                    aria-label="삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
