import { useState, type CSSProperties } from 'react'
import { Plus } from 'lucide-react'
import { useStore } from './hooks/useStore'
import { ProjectList } from './components/ProjectList'
import { BudgetHero } from './components/BudgetHero'
import { ProfitSummary } from './components/ProfitSummary'
import { CategoryBreakdown } from './components/CategoryBreakdown'
import { ExpenseList } from './components/ExpenseList'
import { ExpenseForm } from './components/ExpenseForm'
import type { Expense } from './types'
import './App.css'

function App() {
  const {
    projects,
    activeProject,
    portfolio,
    filter,
    setFilter,
    projectStats,
    openProject,
    closeProject,
    createProject,
    deleteProject,
    updateProject,
    updateCategoryPlanned,
    addCategory,
    renameCategory,
    deleteCategory,
    addExpense,
    updateExpense,
    deleteExpense,
    resetSamples,
    categoryOf,
  } = useStore()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)

  if (!activeProject || !projectStats) {
    return (
      <div className="app">
        <ProjectList
          projects={projects}
          portfolio={portfolio}
          onOpen={openProject}
          onDelete={deleteProject}
          onCreate={createProject}
          onResetSamples={resetSamples}
        />
      </div>
    )
  }

  const {
    spent,
    remaining,
    usageRatio,
    netProfit,
    margin,
    byCategory,
    filteredExpenses,
  } = projectStats

  return (
    <div className="app">
      <BudgetHero
        project={activeProject}
        spent={spent}
        remaining={remaining}
        usageRatio={usageRatio}
        netProfit={netProfit}
        onBack={closeProject}
        onUpdate={(patch) => updateProject(activeProject.id, patch)}
      />

      <main className="main">
        <ProfitSummary
          revenue={activeProject.revenue}
          spent={spent}
          netProfit={netProfit}
          margin={margin}
          budget={activeProject.totalBudget}
          remaining={remaining}
        />

        <section className="section section--categories">
          <header className="section__head">
            <div>
              <h2>세부 비용 카테고리</h2>
              <p className="muted">인건비·식비·교통비·장비대여비 등으로 나눠 관리</p>
            </div>
          </header>
          <CategoryBreakdown
            categories={byCategory}
            onUpdatePlanned={(id, planned) =>
              updateCategoryPlanned(activeProject.id, id, planned)
            }
            onAddCategory={(name) => addCategory(activeProject.id, name)}
            onRenameCategory={(id, name) =>
              renameCategory(activeProject.id, id, name)
            }
            onDeleteCategory={(id) => deleteCategory(activeProject.id, id)}
          />
        </section>

        <section className="section section--expenses">
          <header className="section__head">
            <div>
              <h2>지출 내역</h2>
              <p className="muted">{filteredExpenses.length}건</p>
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
              onClick={() => setFilter('all')}
            >
              전체
            </button>
            {activeProject.categories.map((c) => (
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
                onClick={() => setFilter(c.id)}
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
            onDelete={(id) => deleteExpense(activeProject.id, id)}
          />
        </section>
      </main>

      <ExpenseForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        categories={activeProject.categories}
        initial={editing}
        onSubmit={(data) => {
          if (editing) updateExpense(activeProject.id, editing.id, data)
          else addExpense(activeProject.id, data)
        }}
      />
    </div>
  )
}

export default App
