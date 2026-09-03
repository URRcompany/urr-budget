import { ChevronDown, FileText, Image, Link2, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Category, Expense } from '../types'
import { formatDate, formatKRW } from '../lib/format'
import { resolveExpenseTax, vatModeLabel } from '../lib/vat'
import { calcWithholding, withholdingRateLabel } from '../lib/withholding'

interface ExpenseListProps {
  expenses: Expense[]
  categoryOf: (id: Expense['categoryId']) => Category | undefined
  linkedExpenseIds?: Set<string>
  onEdit: (expense: Expense) => void
  onDelete: (id: string) => void
  onToggleInvoice?: (id: string, received: boolean) => void
  /** 간단 목록 (기본) */
  simple?: boolean
}

export function ExpenseList({
  expenses,
  categoryOf,
  linkedExpenseIds,
  onEdit,
  onDelete,
  onToggleInvoice,
  simple = true,
}: ExpenseListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (expenses.length === 0) {
    return (
      <div className="empty">
        <p>아직 등록된 지출이 없습니다.</p>
        <p className="muted">촬영 비용을 추가해 예산을 추적해 보세요.</p>
      </div>
    )
  }

  return (
    <ul className={`expense-list ${simple ? 'expense-list--simple' : ''}`}>
      {expenses.map((e, i) => {
        const cat = categoryOf(e.categoryId)
        const isLinked = linkedExpenseIds?.has(e.id) ?? false
        const tax = resolveExpenseTax(e)
        const hasReceipt = Boolean(e.receiptDataUrl)
        const expanded = expandedId === e.id

        if (simple) {
          return (
            <li
              key={e.id}
              className={`expense-row expense-row--simple ${isLinked ? 'expense-row--linked' : ''}`}
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <span
                className="expense-row__swatch"
                style={{ background: cat?.color ?? '#888' }}
                aria-hidden
              />
              <button
                type="button"
                className="expense-row__main expense-row__main--btn"
                onClick={() => setExpandedId(expanded ? null : e.id)}
                aria-expanded={expanded}
              >
                <div className="expense-row__title">
                  {e.title}
                  {isLinked && (
                    <span className="link-badge expense-row__link-badge">
                      <Link2 size={12} aria-hidden />
                      인건비
                    </span>
                  )}
                  {(e.invoiceReceived ?? false) === false && !isLinked && (
                    <span className="badge badge--warn badge--xs">계산서</span>
                  )}
                </div>
                <div className="expense-row__meta">
                  <span>{cat?.name ?? '기타'}</span>
                  <span aria-hidden>·</span>
                  <span>{formatDate(e.date)}</span>
                </div>
                {expanded && (
                  <div className="expense-row__detail">
                    {e.vendor && <p className="muted">거래처: {e.vendor}</p>}
                    {isLinked || e.categoryId === 'labor' ? (
                      <p className="muted">
                        {(() => {
                          const wh = calcWithholding(e.amount)
                          return `원천세 ${withholdingRateLabel()} ${formatKRW(wh.tax)} · 실수령 ${formatKRW(wh.net)}`
                        })()}
                      </p>
                    ) : tax.vat > 0 ? (
                      <p className="muted">
                        공급 {formatKRW(tax.supply)} + VAT {formatKRW(tax.vat)}
                      </p>
                    ) : (
                      <p className="muted">{vatModeLabel(tax.mode)}</p>
                    )}
                    {e.note && <p className="muted">{e.note}</p>}
                    {isLinked && (
                      <p className="muted">인건비 탭에서 수정·삭제하세요.</p>
                    )}
                  </div>
                )}
              </button>
              <div className="expense-row__amount">{formatKRW(e.amount)}</div>
              <div className="expense-row__actions">
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
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setExpandedId(expanded ? null : e.id)}
                  aria-label={expanded ? '접기' : '자세히'}
                >
                  <ChevronDown
                    size={16}
                    className={expanded ? 'icon-rotated' : ''}
                    aria-hidden
                  />
                </button>
              </div>
            </li>
          )
        }

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
                {(e.invoiceReceived ?? false) && !isLinked && e.categoryId !== 'labor' ? (
                  <>
                    <span aria-hidden>·</span>
                    <span className="profit">계산서 수령</span>
                  </>
                ) : !isLinked && e.categoryId !== 'labor' ? (
                  <>
                    <span aria-hidden>·</span>
                    <span className="warn-text">계산서 미수령</span>
                  </>
                ) : null}
                {isLinked || e.categoryId === 'labor' ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>
                      {(() => {
                        const wh = calcWithholding(e.amount)
                        return `원천세 ${withholdingRateLabel()} ${formatKRW(wh.tax)} · 실수령 ${formatKRW(wh.net)}`
                      })()}
                    </span>
                  </>
                ) : tax.vat > 0 ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>
                      공급 {formatKRW(tax.supply)} + VAT {formatKRW(tax.vat)}
                    </span>
                  </>
                ) : (
                  <>
                    <span aria-hidden>·</span>
                    <span>{vatModeLabel(tax.mode)}</span>
                  </>
                )}
                {hasReceipt && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="profit">영수증 첨부</span>
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
              {hasReceipt && (
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="영수증 보기"
                  title="영수증 보기"
                  onClick={() => {
                    const w = window.open('', '_blank', 'noopener,noreferrer')
                    if (w && e.receiptDataUrl) {
                      w.document.write(
                        `<html><body style="margin:0;background:#111;display:flex;justify-content:center;align-items:center;min-height:100vh"><img src="${e.receiptDataUrl}" style="max-width:100%;max-height:100vh" alt="영수증"/></body></html>`,
                      )
                      w.document.close()
                    }
                  }}
                >
                  <Image size={16} />
                </button>
              )}
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
