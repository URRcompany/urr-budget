import {
  CheckCircle2,
  Receipt,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { getPortfolioTaxSummary } from '../lib/taxLedger'
import { formatDate, formatKRW } from '../lib/format'
import { resolveExpenseTax, vatModeLabel } from '../lib/vat'
import type { Project } from '../types'
import { AppBrand } from './AppBrand'

interface TaxInvoiceDashboardProps {
  projects: Project[]
  onOpenProject: (projectId: string) => void
  showBack?: boolean
  onBack?: () => void
}

export function TaxInvoiceDashboard({
  projects,
  onOpenProject,
  showBack,
  onBack,
}: TaxInvoiceDashboardProps) {
  const data = getPortfolioTaxSummary(projects)
  const allClear = data.attentionCount === 0

  return (
    <div className="receivables-page tax-page">
      <header className="receivables-page__hero">
        {showBack && onBack && (
          <button
            type="button"
            className="btn btn--ghost btn--sm receivables-page__back"
            onClick={onBack}
          >
            ← 홈으로
          </button>
        )}
        <div>
          <AppBrand size="sm" />
          <h1 className="receivables-page__title">세금·계산서 현황</h1>
          <p className="muted">
            매출 세금계산서 발행 여부와 매입 부가세·계산서 수령을 한곳에서 확인하세요.
          </p>
        </div>

        <div className="receivables-summary">
          <article
            className={`receivables-summary__card ${data.salesUnissuedCount > 0 ? 'receivables-summary__card--danger' : ''}`}
          >
            <TrendingUp size={20} aria-hidden />
            <span className="label">매출 계산서 미발행</span>
            <strong className={data.salesUnissuedCount > 0 ? 'danger' : 'profit'}>
              {data.salesUnissuedCount}건
            </strong>
            <span className="muted">{formatKRW(data.salesUnissuedAmount)}</span>
          </article>
          <article
            className={`receivables-summary__card ${data.purchaseUnreceivedCount > 0 ? 'receivables-summary__card--danger' : ''}`}
          >
            <TrendingDown size={20} aria-hidden />
            <span className="label">매입 계산서 미수령</span>
            <strong className={data.purchaseUnreceivedCount > 0 ? 'warn-text' : 'profit'}>
              {data.purchaseUnreceivedCount}건
            </strong>
            <span className="muted">
              합계 {formatKRW(data.purchaseUnreceivedTotal)} · VAT{' '}
              {formatKRW(data.purchaseUnreceivedVat)}
            </span>
          </article>
          <article className="receivables-summary__card receivables-summary__card--primary">
            <Receipt size={20} aria-hidden />
            <span className="label">매입 VAT 합계</span>
            <strong>{formatKRW(data.totalVat)}</strong>
            <span className="muted">
              공급가 {formatKRW(data.totalSupply)} · 합계{' '}
              {formatKRW(data.totalExpenseAmount)}
            </span>
          </article>
        </div>
      </header>

      {allClear && data.totalExpenseAmount === 0 && data.salesIssuedCount === 0 ? (
        <div className="empty receivables-page__empty">
          <CheckCircle2 size={36} strokeWidth={1.5} aria-hidden />
          <p>등록된 입금·지출이 없습니다.</p>
          <p className="muted">프로젝트에 입금 회차와 지출을 추가하면 세금 현황이 집계됩니다.</p>
        </div>
      ) : (
        <>
          <section className="section receivables-section" aria-labelledby="vat-mode-heading">
            <header className="section__head">
              <div>
                <h2 id="vat-mode-heading">부가세 구분 (매입)</h2>
                <p className="muted">지출 등록 시 선택한 VAT 방식별 합계</p>
              </div>
            </header>
            <div className="tax-vat-grid">
              {(['included', 'separate', 'exempt'] as const).map((mode) => {
                const row = data.vatByMode[mode]
                if (row.count === 0) return null
                return (
                  <article key={mode} className="tax-vat-card">
                    <h3>{vatModeLabel(mode)}</h3>
                    <dl>
                      <div>
                        <dt>건수</dt>
                        <dd>{row.count}건</dd>
                      </div>
                      <div>
                        <dt>공급가</dt>
                        <dd>{formatKRW(row.supply)}</dd>
                      </div>
                      <div>
                        <dt>부가세</dt>
                        <dd>{formatKRW(row.vat)}</dd>
                      </div>
                      <div>
                        <dt>합계</dt>
                        <dd>
                          <strong>{formatKRW(row.total)}</strong>
                        </dd>
                      </div>
                    </dl>
                  </article>
                )
              })}
            </div>
          </section>

          {data.salesUnissued.length > 0 && (
            <section className="section receivables-section" aria-labelledby="sales-unissued-heading">
              <header className="section__head">
                <div>
                  <h2 id="sales-unissued-heading">매출 세금계산서 미발행</h2>
                  <p className="muted">입금 완료 · 계산서 미발행 회차</p>
                </div>
              </header>
              <ul className="receivables-list">
                {data.salesUnissued.map((row) => (
                  <li key={`${row.projectId}_${row.paymentId}`}>
                    <button
                      type="button"
                      className="receivables-row receivables-row--overdue"
                      onClick={() => onOpenProject(row.projectId)}
                    >
                      <div className="receivables-row__main">
                        <span className="receivables-row__title">
                          {row.projectName}
                          {row.client && <span className="muted"> · {row.client}</span>}
                        </span>
                        <span className="receivables-row__meta muted">
                          {row.label} · 입금 {formatDate(row.paidDate)} ·{' '}
                          <strong className="warn-text">계산서 미발행</strong>
                        </span>
                      </div>
                      <span className="receivables-row__amount">{formatKRW(row.amount)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.purchaseUnreceived.length > 0 && (
            <section
              className="section receivables-section"
              aria-labelledby="purchase-unreceived-heading"
            >
              <header className="section__head">
                <div>
                  <h2 id="purchase-unreceived-heading">매입 계산서 미수령</h2>
                  <p className="muted">공급가·부가세·합계 · VAT 구분 포함</p>
                </div>
              </header>
              <div className="receivables-table-wrap">
                <table className="receivables-table tax-table">
                  <thead>
                    <tr>
                      <th scope="col">프로젝트 / 지출</th>
                      <th scope="col">VAT 구분</th>
                      <th scope="col" className="num">공급가</th>
                      <th scope="col" className="num">부가세</th>
                      <th scope="col" className="num">합계</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.purchaseUnreceived.map((row) => (
                      <tr key={`${row.projectId}_${row.expenseId}`}>
                        <td>
                          <button
                            type="button"
                            className="receivables-table__link"
                            onClick={() => onOpenProject(row.projectId)}
                          >
                            <strong>{row.title}</strong>
                            <span className="muted">
                              {row.projectName}
                              {row.vendor ? ` · ${row.vendor}` : ''} · {formatDate(row.date)}
                            </span>
                          </button>
                        </td>
                        <td>{row.vatModeLabel}</td>
                        <td className="num">{formatKRW(row.supply)}</td>
                        <td className="num">{formatKRW(row.vat)}</td>
                        <td className="num">
                          <strong>{formatKRW(row.total)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {allClear && data.totalExpenseAmount > 0 && (
            <div className="tax-all-clear">
              <CheckCircle2 size={20} aria-hidden />
              <span>
                미발행·미수령 건 없음 · 매출 발행 {data.salesIssuedCount}건 · 매입 수령{' '}
                {data.purchaseReceivedCount}건
              </span>
            </div>
          )}

          <section className="section receivables-section" aria-labelledby="all-purchases-heading">
            <header className="section__head">
              <div>
                <h2 id="all-purchases-heading">전체 매입 VAT 내역</h2>
                <p className="muted">모든 지출 · 공급가 / 부가세 / 합계 / 계산서 수령</p>
              </div>
            </header>
            {data.totalExpenseAmount === 0 ? (
              <p className="muted">등록된 지출이 없습니다.</p>
            ) : (
              <div className="receivables-table-wrap">
                <table className="receivables-table tax-table">
                  <thead>
                    <tr>
                      <th scope="col">프로젝트 / 지출</th>
                      <th scope="col">VAT 구분</th>
                      <th scope="col" className="num">공급가</th>
                      <th scope="col" className="num">부가세</th>
                      <th scope="col" className="num">합계</th>
                      <th scope="col">계산서</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.flatMap((p) =>
                      p.expenses.map((e) => {
                        const tax = resolveExpenseTax(e)
                        const received = e.invoiceReceived ?? false
                        return (
                          <tr key={e.id}>
                            <td>
                              <button
                                type="button"
                                className="receivables-table__link"
                                onClick={() => onOpenProject(p.id)}
                              >
                                <strong>{e.title}</strong>
                                <span className="muted">
                                  {p.name}
                                  {e.vendor ? ` · ${e.vendor}` : ''} · {formatDate(e.date)}
                                </span>
                              </button>
                            </td>
                            <td>{vatModeLabel(tax.mode)}</td>
                            <td className="num">{formatKRW(tax.supply)}</td>
                            <td className="num">{formatKRW(tax.vat)}</td>
                            <td className="num">{formatKRW(tax.total)}</td>
                            <td>
                              {received ? (
                                <span className="badge badge--ok">수령</span>
                              ) : (
                                <span className="badge badge--warn">미수령</span>
                              )}
                            </td>
                          </tr>
                        )
                      }),
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>합계</td>
                      <td />
                      <td className="num">{formatKRW(data.totalSupply)}</td>
                      <td className="num">{formatKRW(data.totalVat)}</td>
                      <td className="num">
                        <strong>{formatKRW(data.totalExpenseAmount)}</strong>
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
