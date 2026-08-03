import { useState, type CSSProperties } from 'react'
import { Plus, Download } from 'lucide-react'
import type { Category, ClientPayment, Expense, LaborPayment, Project } from '../types'
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
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)

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

      <main className="main">
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
        <section className="section section--ledger-main">
          <MonthlyLedger
            projects={allProjects}
            month={ledgerMonth}
            projectId={project.id}
            projectName={project.name}
            onMonthChange={onMonthChange}
            compact
          />
          <LedgerTimeline
            projects={allProjects}
            month={ledgerMonth}
            projectId={project.id}
          />
        </section>

        <div className="main__split">
          <div className="main__col">
            <ProfitSummary
              revenue={project.revenue}
              spent={spent}
              netProfit={netProfit}
              margin={margin}
              budget={project.totalBudget}
              remaining={remaining}
              received={received}
              outstanding={outstanding}
            />

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

            <section className="section section--categories">
              <header className="section__head">
                <div>
                  <h2>세부 비용 카테고리</h2>
                  <p className="muted">인건비·식비·교통비·장비대여비 등</p>
                </div>
              </header>
              <CategoryBreakdown
                categories={byCategory}
                onUpdatePlanned={onUpdateCategoryPlanned}
                onAddCategory={onAddCategory}
                onRenameCategory={onRenameCategory}
                onDeleteCategory={onDeleteCategory}
              />
            </section>
          </div>

          <section className="section section--expenses main__col">
            <header className="section__head">
              <div>
              <h2>지출 내역</h2>
              <p className="muted">
                {filteredExpenses.length}건 · 문서 아이콘으로 계산서 수령 체크
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
              onEdit={(e) => {
                setEditing(e)
                setFormOpen(true)
              }}
              onDelete={onDeleteExpense}
              onToggleInvoice={onToggleExpenseInvoice}
            />
          </section>
        </div>
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
