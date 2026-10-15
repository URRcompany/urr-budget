import { useCallback, useState } from 'react'
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { ENTRY_KIND_LABEL, type Entry, type EntryKind, type Project } from '../types'
import type { EntryInput } from '../hooks/useStore'
import { groupEntriesByDate, laborByPerson, projectTotals } from '../lib/money'
import { formatCompactKRW, formatKRW, formatShortDate } from '../lib/format'
import { UserBar } from './UserBar'
import { SummaryCard } from './SummaryCard'
import { EntrySheet } from './EntrySheet'
import { ProjectFormModal } from './ProjectFormModal'

type Filter = 'all' | EntryKind

const FILTERS: Filter[] = ['all', 'income', 'labor', 'equipment', 'misc']

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
  const [editingProject, setEditingProject] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)

  const closeProjectEdit = useCallback(() => setEditingProject(false), [])
  const closeSheet = useCallback(() => {
    setSheetOpen(false)
    setEditingEntry(null)
  }, [])

  const totals = projectTotals(project)
  const people = laborByPerson(project)
  const visible =
    filter === 'all' ? project.entries : project.entries.filter((e) => e.kind === filter)
  const groups = groupEntriesByDate(visible)

  const countOf = (f: Filter) =>
    f === 'all' ? project.entries.length : project.entries.filter((e) => e.kind === f).length

  return (
    <div className="shell shell--with-fab">
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
            onClick={() => setEditingProject(true)}
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

      <SummaryCard profitLabel="프로젝트 수익 (누적)" totals={totals} />

      {people.length > 0 && (
        <section className="people-line" aria-label="사람별 인건비">
          <span className="people-line__label">인건비 사람별</span>
          <ul>
            {people.map((p) => (
              <li key={p.name}>
                <strong>{p.name}</strong>{' '}
                <span className="tabular-nums">{formatCompactKRW(p.amount)}</span>
                {p.count > 1 && <span className="muted"> ({p.count}건)</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel ledger">
        <div className="filter-chips" role="tablist" aria-label="종류 필터">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              className={`chip ${filter === f ? 'chip--on' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? '전체' : ENTRY_KIND_LABEL[f]}
              <span className="chip__count">{countOf(f)}</span>
            </button>
          ))}
        </div>

        {groups.length === 0 ? (
          <div className="empty">
            <p>{filter === 'all' ? '아직 기록이 없습니다.' : `${ENTRY_KIND_LABEL[filter]} 기록이 없습니다.`}</p>
            <p className="muted">아래 「기록하기」를 눌러 추가하세요.</p>
          </div>
        ) : (
          <div className="ledger__groups">
            {groups.map((g) => (
              <section key={g.date} className="ledger__group">
                <h3 className="ledger__date">{formatShortDate(g.date)}</h3>
                <ul className="ledger__list">
                  {g.entries.map((e) => {
                    const isIncome = e.kind === 'income'
                    return (
                      <li key={e.id}>
                        <button
                          type="button"
                          className="ledger-row"
                          onClick={() => {
                            setEditingEntry(e)
                            setSheetOpen(true)
                          }}
                        >
                          <span className="ledger-row__main">
                            <strong>{e.title || ENTRY_KIND_LABEL[e.kind]}</strong>
                            <span className="ledger-row__meta">
                              <span className={`kind-tag ${isIncome ? 'kind-tag--income' : ''}`}>
                                {ENTRY_KIND_LABEL[e.kind]}
                              </span>
                              {e.role && <span className="muted">{e.role}</span>}
                            </span>
                          </span>
                          <span
                            className={`ledger-row__amount tabular-nums ${isIncome ? 'amount-in' : ''}`}
                          >
                            {isIncome ? '+' : '−'}
                            {formatKRW(e.amount)}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>

      <div className="fab-bar">
        <button
          type="button"
          className="btn btn--primary fab"
          onClick={() => {
            setEditingEntry(null)
            setSheetOpen(true)
          }}
        >
          <Plus size={20} />
          기록하기
        </button>
      </div>

      <EntrySheet
        open={sheetOpen}
        entry={editingEntry}
        onClose={closeSheet}
        onSubmit={(data) => {
          if (editingEntry) onUpdateEntry(editingEntry.id, data)
          else onAddEntry(data)
        }}
        onDelete={onDeleteEntry}
      />

      <ProjectFormModal
        open={editingProject}
        title="프로젝트 수정"
        submitLabel="저장"
        initial={{ name: project.name, client: project.client }}
        onClose={closeProjectEdit}
        onSubmit={onUpdate}
      />
    </div>
  )
}
