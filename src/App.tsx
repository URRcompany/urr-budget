import { useState } from 'react'
import { Plus, RotateCcw } from 'lucide-react'
import { useProject } from './hooks/useProject'
import { BudgetHero } from './components/BudgetHero'
import { CategoryBreakdown } from './components/CategoryBreakdown'
import { ExpenseList } from './components/ExpenseList'
import { ExpenseForm } from './components/ExpenseForm'
import type { CategoryId, Expense } from './types'
import './App.css'

function App() {
  const {
    project,
    filter,
    setFilter,
    spent,
    remaining,
    usageRatio,
    byCategory,
    filteredExpenses,
    updateMeta,
    updateCategoryPlanned,
    addExpense,
    updateExpense,
    deleteExpense,
    resetSample,
    categoryOf,
  } = useProject()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)

  return (
    <div className="app">
      <BudgetHero
        project={project}
        spent={spent}
        remaining={remaining}
        usageRatio={usageRatio}
        onUpdate={updateMeta}
      />

      <main className="main">
        <section className="section section--categories">
          <header className="section__head">
            <div>
              <h2>카테고리별 배정</h2>
              <p className="muted">항목별 계획 대비 집행 현황</p>
            </div>
          </header>
          <CategoryBreakdown
            categories={byCategory}
            onUpdatePlanned={updateCategoryPlanned}
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
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  if (confirm('샘플 프로젝트로 초기화할까요? 현재 데이터가 덮어씌워집니다.')) {
                    resetSample()
                  }
                }}
              >
                <RotateCcw size={15} />
                샘플 불러오기
              </button>
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
            {project.categories.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={filter === c.id}
                className={`chip ${filter === c.id ? 'chip--active' : ''}`}
                style={
                  filter === c.id
                    ? ({ '--chip-accent': c.color } as React.CSSProperties)
                    : undefined
                }
                onClick={() => setFilter(c.id as CategoryId)}
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
            onDelete={deleteExpense}
          />
        </section>
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
          if (editing) updateExpense(editing.id, data)
          else addExpense(data)
        }}
      />
    </div>
  )
}

export default App
