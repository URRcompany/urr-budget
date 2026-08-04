import { useState, useMemo, type CSSProperties } from 'react'
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

type DetailTab = 'overview' | 'expenses' | 'payments' | 'ledger'

const TABS: { id: DetailTab; label: string }[] = [
  { id: 'overview', label: '개요' },
  { id: 'expenses', label: '지출' },
  { id: 'payments', label: '입금·인건비' },
  { id: 'ledger', label: '장부' },
]

interface ProjectDetailViewProps {
  project: Project
  spent: number
  remaining: number
  usageRatio: number
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
      Pick<Project, 'name' | 'client' | 'shootDate' | 'revenue' | 'totalBudget'>
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
  allProjects: Project[]
  ledgerMonth: string
  onMonthChange: (month: string) => void
  categoryOf: (id: string) => Category | undefined
}

export function ProjectDetailView({
  project,
  spent,
  remaining,
  usageRatio,
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
  allProjects,
  ledgerMonth,
  onMonthChange,
  categoryOf,
}: ProjectDetailViewProps) {
  const [tab, setTab] = useState<DetailTab>('overview')
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
        usageRatio={usageRatio}
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
        {tab === 'overview' && (
          <div className="detail-tab-panel">
            <OverdueAlert projects={[project]} />
            <div className="detail-export">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => exportProjectCSV(project)}
              >
                <Download size={15} />
                프로젝트 CSV 내보내기
              </button>
            </div>

            <ProfitSummary
              revenue={project.revenue}
              spent={spent}
              netProfit={netProfit}
              margin={margin}
              budget={project.totalBudget}
              remaining={remaining}
              received={received}
              outstanding={outstanding}
              cashInflow={cashFlow.inflow}
              cashOutflow={cashFlow.outflow}
              cashNet={cashFlow.net}
            />

            <section className="section section--categories">
              <header className="section__head">
                <div>
                  <h2>세부 비용 카테고리</h2>
                  <p className="muted">항목별 배정 예산과 집행 현황</p>
                </div>
              </header>
              <CategoryBreakdown
                totalBudget={project.totalBudget}
                categories={byCategory}
                laborCommitted={laborStats.total}
                onUpdatePlanned={onUpdateCategoryPlanned}
                onApplyAllocations={onApplyCategoryAllocations}
                onAddCategory={onAddCategory}
                onRenameCategory={onRenameCategory}
                onDeleteCategory={onDeleteCategory}
              />
            </section>
          </div>
        )}

        {tab === 'expenses' && (
          <div className="detail-tab-panel">
            <section className="section section--expenses">
              <header className="section__head">
                <div>
                  <h2>지출 내역</h2>
                  <p className="muted">
                    {filteredExpenses.length}건 · 발생 기준 집행 비용
                  </p>
                </div>
                <div className="section__actions">
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

              <div className="expense-callout" role="note">
                <p>
                  <strong>인건비</strong>는{' '}
                  <button
                    type="button"
                    className="expense-callout__link"
                    onClick={() => setTab('payments')}
                  >
                    입금·인건비 탭
                  </button>
                  에서 등록하세요. 지급 완료 시 이 목록에 자동으로 나타납니다.
                </p>
              </div>

              <div className="filters" role="tablist" aria-label="카테고리 필터">
                <button
                  type="button"
                  role="tab"
                  aria-selected={filter === 'all'}
                  className={`chip ${filter === 'all' ? 'chip--active' : ''}`}
                  onClick={() => onSetFilter('all')}
                >
                  전체
                </button>
                {project.categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="tab"
                    aria-selected={filter === c.id}
                    className={`chip ${filter === c.id ? 'chip--active' : ''}`}
                    style={
                      filter === c.id
                        ? ({ '--chip-accent': c.color } as CSSProperties)
                        : undefined
                    }
                    onClick={() => onSetFilter(c.id)}
                  >
                    <span className="chip__dot" style={{ background: c.color }} />
                    {c.name}
                  </button>
                ))}
              </div>

              <ExpenseList
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
