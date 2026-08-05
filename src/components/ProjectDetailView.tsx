import { useState, useMemo } from 'react'
import { Plus, Download } from 'lucide-react'
import type { Category, ClientPayment, Expense, LaborPayment, Project } from '../types'
import { projectCashFlow } from '../types'
import { BudgetHero } from './BudgetHero'
import { ProfitSummary } from './ProfitSummary'
import { ClientPaymentsPanel } from './ClientPaymentsPanel'
import { LaborPaymentsPanel } from './LaborPaymentsPanel'
import { CategoryBreakdown } from './CategoryBreakdown'
import { ExpenseList } from './ExpenseList'
import { ExpenseForm } from './ExpenseForm'
import { MonthlyLedger } from './MonthlyLedger'
import { LedgerTimeline } from './LedgerTimeline'
import { OverdueAlert } from './OverdueAlert'
import { exportProjectCSV } from '../lib/export'
import { exportQuotationPDF } from '../lib/quotation'

type DetailTab = 'budget' | 'payments' | 'ledger'

const TABS: { id: DetailTab; label: string }[] = [
  { id: 'budget', label: '예산·지출' },
  { id: 'payments', label: '입금·인건비' },
  { id: 'ledger', label: '장부' },
]

interface ProjectDetailViewProps {
  project: Project
  spent: number
  remaining: number
  committedRemaining: number
  unpaidLabor: number
  usageRatio: number
  committedUsageRatio: number
  netProfit: number
  margin: number | null
  received: number
  outstanding: number
  laborStats: {
    total: number
    paid: number
    unpaid: number
    paidCount: number
    unpaidCount: number
    allPaid: boolean
  }
  byCategory: Array<Category & { spent: number }>
  filteredExpenses: Expense[]
  filter: string | 'all'
  showBack: boolean
  onBack: () => void
  onUpdateProject: (
    patch: Partial<
      Pick<Project, 'name' | 'client' | 'shootDate' | 'revenue' | 'totalBudget' | 'budgetPreset'>
    >,
  ) => void
  onUpdateCategoryPlanned: (id: string, planned: number) => void
  onApplyCategoryAllocations: (allocations: Record<string, number>) => void
  onAddCategory: (name: string) => void
  onRenameCategory: (id: string, name: string) => void
  onDeleteCategory: (id: string) => void
  onSetFilter: (id: string | 'all') => void
  onAddExpense: (data: Omit<Expense, 'id'>) => void
  onUpdateExpense: (id: string, data: Omit<Expense, 'id'>) => void
  onDeleteExpense: (id: string) => void
  onAddClientPayment: (data: Omit<ClientPayment, 'id'>) => void
  onUpdateClientPayment: (id: string, data: Omit<ClientPayment, 'id'>) => void
  onDeleteClientPayment: (id: string) => void
  onToggleClientPaymentPaid: (id: string, isPaid: boolean) => void
  onToggleClientPaymentInvoice: (id: string, issued: boolean) => void
  onToggleExpenseInvoice: (id: string, received: boolean) => void
  onAddLaborPayment: (data: Omit<LaborPayment, 'id'>) => void
  onUpdateLaborPayment: (id: string, data: Omit<LaborPayment, 'id'>) => void
  onDeleteLaborPayment: (id: string) => void
  onToggleLaborPaymentPaid: (id: string, isPaid: boolean) => void
  onApplyClientPaymentTemplate: () => void
  allProjects: Project[]
  ledgerMonth: string
  onMonthChange: (month: string) => void
  categoryOf: (id: string) => Category | undefined
}

export function ProjectDetailView({
  project,
  spent,
  remaining,
  committedRemaining,
  unpaidLabor,
  usageRatio,
  committedUsageRatio,
  netProfit,
  margin,
  received,
  outstanding,
  laborStats,
  byCategory,
  filteredExpenses,
  filter,
  showBack,
  onBack,
  onUpdateProject,
  onUpdateCategoryPlanned,
  onApplyCategoryAllocations,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
  onSetFilter,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onAddClientPayment,
  onUpdateClientPayment,
  onDeleteClientPayment,
  onToggleClientPaymentPaid,
  onToggleClientPaymentInvoice,
  onToggleExpenseInvoice,
  onAddLaborPayment,
  onUpdateLaborPayment,
  onDeleteLaborPayment,
  onToggleLaborPaymentPaid,
  onApplyClientPaymentTemplate,
  allProjects,
  ledgerMonth,
  onMonthChange,
  categoryOf,
}: ProjectDetailViewProps) {
  const [tab, setTab] = useState<DetailTab>('budget')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)

  const cashFlow = projectCashFlow(project)

  const linkedExpenseIds = useMemo(
    () =>
      new Set(
        project.laborPayments
          .map((lp) => lp.expenseId)
          .filter((id): id is string => Boolean(id)),
      ),
    [project.laborPayments],
  )

  return (
    <>
      <BudgetHero
        project={project}
        spent={spent}
        remaining={remaining}
        committedRemaining={committedRemaining}
        unpaidLabor={unpaidLabor}
        usageRatio={usageRatio}
        committedUsageRatio={committedUsageRatio}
        netProfit={netProfit}
        showBack={showBack}
        onBack={onBack}
        onUpdate={onUpdateProject}
      />

      <nav className="detail-tabs" aria-label="프로젝트 메뉴">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`detail-tabs__btn ${tab === t.id ? 'detail-tabs__btn--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="main main--tabbed">
        {tab === 'budget' && (
          <div className="detail-tab-panel">
            <OverdueAlert projects={[project]} />

            <ProfitSummary
              compact
              revenue={project.revenue}
              spent={spent}
              netProfit={netProfit}
              margin={margin}
              budget={project.totalBudget}
              remaining={remaining}
              committedRemaining={committedRemaining}
              unpaidLabor={unpaidLabor}
              received={received}
              outstanding={outstanding}
              cashInflow={cashFlow.inflow}
              cashOutflow={cashFlow.outflow}
              cashNet={cashFlow.net}
            />

            <div className="detail-export">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => exportQuotationPDF(project)}
              >
                <Download size={15} />
                견적서 PDF
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => exportProjectCSV(project)}
              >
                <Download size={15} />
                CSV
              </button>
            </div>

            <section className="section section--categories">
              <header className="section__head section__head--compact">
                <h2>카테고리</h2>
              </header>
              <CategoryBreakdown
                simple
                totalBudget={project.totalBudget}
                categories={byCategory}
                budgetPreset={project.budgetPreset ?? 'general'}
                laborCommitted={laborStats.total}
                onUpdatePlanned={onUpdateCategoryPlanned}
                onApplyAllocations={onApplyCategoryAllocations}
                onPresetSelect={(presetId) =>
                  onUpdateProject({ budgetPreset: presetId })
                }
                onAddCategory={onAddCategory}
                onRenameCategory={onRenameCategory}
                onDeleteCategory={onDeleteCategory}
              />
            </section>

            <section className="section section--expenses">
              <header className="section__head">
                <div>
                  <h2>지출</h2>
                  <p className="muted">{filteredExpenses.length}건</p>
                </div>
                <div className="section__actions section__actions--wrap">
                  <label className="filter-select">
                    <span className="visually-hidden">카테고리 필터</span>
                    <select
                      value={filter}
                      onChange={(e) =>
                        onSetFilter(e.target.value as string | 'all')
                      }
                    >
                      <option value="all">전체 카테고리</option>
                      {project.categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => {
                      setEditing(null)
                      setFormOpen(true)
                    }}
                  >
                    <Plus size={18} />
                    지출 추가
                  </button>
                </div>
              </header>

              <ExpenseList
                simple
                expenses={filteredExpenses}
                categoryOf={categoryOf}
                linkedExpenseIds={linkedExpenseIds}
                onEdit={(e) => {
                  setEditing(e)
                  setFormOpen(true)
                }}
                onDelete={onDeleteExpense}
                onToggleInvoice={onToggleExpenseInvoice}
              />

              <p className="section-footnote muted">
                인건비는{' '}
                <button
                  type="button"
                  className="expense-callout__link"
                  onClick={() => setTab('payments')}
                >
                  입금·인건비
                </button>{' '}
                탭에서 등록하세요.
              </p>
            </section>
          </div>
        )}

        {tab === 'payments' && (
          <div className="detail-tab-panel detail-tab-panel--stack">
            <ClientPaymentsPanel
              payments={project.clientPayments}
              revenue={project.revenue}
              received={received}
              outstanding={outstanding}
              onAdd={onAddClientPayment}
              onUpdate={onUpdateClientPayment}
              onDelete={onDeleteClientPayment}
              onTogglePaid={onToggleClientPaymentPaid}
              onToggleInvoice={onToggleClientPaymentInvoice}
              onApplyTemplate={onApplyClientPaymentTemplate}
            />

            <LaborPaymentsPanel
              payments={project.laborPayments}
              stats={laborStats}
              onAdd={onAddLaborPayment}
              onUpdate={onUpdateLaborPayment}
              onDelete={onDeleteLaborPayment}
              onTogglePaid={onToggleLaborPaymentPaid}
            />
          </div>
        )}

        {tab === 'ledger' && (
          <div className="detail-tab-panel">
            <section className="section section--ledger-main">
              <MonthlyLedger
                projects={allProjects}
                month={ledgerMonth}
                projectId={project.id}
                projectName={project.name}
                onMonthChange={onMonthChange}
              />
              <LedgerTimeline
                projects={allProjects}
                month={ledgerMonth}
                projectId={project.id}
              />
            </section>
          </div>
        )}
      </main>

      <ExpenseForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        categories={project.categories}
        initial={editing}
        onSubmit={(data) => {
          if (editing) onUpdateExpense(editing.id, data)
          else onAddExpense(data)
        }}
      />
    </>
  )
}
