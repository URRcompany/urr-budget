import { useCallback, useState } from 'react'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import type { Project } from '../types'
import type { EntryInput } from '../hooks/useStore'
import { entriesOfKind, laborByPerson, projectTotals } from '../lib/money'
import { formatKRW } from '../lib/format'
import { UserBar } from './UserBar'
import { SummaryCard } from './SummaryCard'
import { EntrySection } from './EntrySection'
import { ProjectFormModal } from './ProjectFormModal'

interface ProjectViewProps {
  project: Project
  onBack: () => void
  onUpdate: (data: { name: string; client: string }) => void
  onDelete: () => void
  onAddEntry: (data: EntryInput) => void
  onUpdateEntry: (id: string, data: EntryInput) => void
  onDeleteEntry: (id: string) => void
}

export function ProjectView({
  project,
  onBack,
  onUpdate,
  onDelete,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
}: ProjectViewProps) {
  const [editing, setEditing] = useState(false)
  const closeEdit = useCallback(() => setEditing(false), [])
  const totals = projectTotals(project)
  const people = laborByPerson(project)
  const hasRepeatPeople = people.some((p) => p.count > 1)

  const sectionProps = {
    onAdd: onAddEntry,
    onUpdate: onUpdateEntry,
    onDelete: onDeleteEntry,
  }

  return (
    <div className="shell">
      <header className="topbar">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onBack}>
          <ArrowLeft size={16} />
          전체
        </button>
        <UserBar compact />
      </header>

      <section className="project-head">
        <div className="project-head__text">
          <h1>{project.name}</h1>
          {project.client && <p className="muted">{project.client}</p>}
        </div>
        <div className="project-head__actions">
          <button
            type="button"
            className="icon-btn"
            aria-label="프로젝트 이름 수정"
            onClick={() => setEditing(true)}
          >
            <Pencil size={17} />
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--danger"
            aria-label="프로젝트 삭제"
            onClick={() => {
              if (confirm(`「${project.name}」 프로젝트와 모든 기록을 삭제할까요?`)) onDelete()
            }}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </section>

      <SummaryCard profitLabel="프로젝트 수익" totals={totals} />

      <div className="entry-grid">
        <div className="entry-col">
          <EntrySection
            kind="income"
            entries={entriesOfKind(project, 'income')}
            total={totals.income}
            {...sectionProps}
          />
          <EntrySection
            kind="labor"
            entries={entriesOfKind(project, 'labor')}
            total={totals.labor}
            {...sectionProps}
          >
            {hasRepeatPeople && (
              <div className="people-summary" aria-label="사람별 인건비 합계">
                <h3>사람별 합계</h3>
                <ul>
                  {people.map((p) => (
                    <li key={p.name}>
                      <span>
                        {p.name}
                        {p.count > 1 && <em className="muted"> · {p.count}건</em>}
                      </span>
                      <strong className="tabular-nums">{formatKRW(p.amount)}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </EntrySection>
        </div>
        <div className="entry-col">
          <EntrySection
            kind="equipment"
            entries={entriesOfKind(project, 'equipment')}
            total={totals.equipment}
            {...sectionProps}
          />
          <EntrySection
            kind="misc"
            entries={entriesOfKind(project, 'misc')}
            total={totals.misc}
            {...sectionProps}
          />
        </div>
      </div>

      <ProjectFormModal
        open={editing}
        title="프로젝트 수정"
        submitLabel="저장"
        initial={{ name: project.name, client: project.client }}
        onClose={closeEdit}
        onSubmit={onUpdate}
      />
    </div>
  )
}
