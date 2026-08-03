import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import {
  buildLedgerEntries,
  groupEntriesByDate,
  type LedgerEntry,
} from '../lib/ledger'
import type { Project } from '../types'
import { formatDate, formatKRW } from '../lib/format'

interface LedgerTimelineProps {
  projects: Project[]
  month: string
  projectId?: string
}

export function LedgerTimeline({ projects, month, projectId }: LedgerTimelineProps) {
  const entries = buildLedgerEntries(projects, { month, projectId })
  const groups = groupEntriesByDate(entries)

  if (entries.length === 0) {
    return (
      <section className="section ledger-timeline">
        <header className="section__head">
          <div>
            <h2>입출금 장부</h2>
            <p className="muted">이 달에 기록된 입금·지출이 없습니다</p>
          </div>
        </header>
        <div className="empty empty--compact">
          <p>입금 완료 처리 또는 지출을 추가하면 장부에 표시됩니다.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="section ledger-timeline" aria-labelledby="ledger-timeline-heading">
      <header className="section__head">
        <div>
          <h2 id="ledger-timeline-heading">입출금 장부</h2>
          <p className="muted">{entries.length}건 · 날짜순</p>
        </div>
      </header>

      <ol className="ledger-days">
        {groups.map(({ date, entries: dayEntries, net }) => (
          <li key={date} className="ledger-day">
            <header className="ledger-day__head">
              <time dateTime={date}>{formatDate(date)}</time>
              <span className={net >= 0 ? 'profit' : 'danger'}>
                {net >= 0 ? '+' : ''}
                {formatKRW(net)}
              </span>
            </header>
            <ul className="ledger-day__list">
              {dayEntries.map((e) => (
                <LedgerRow key={e.id} entry={e} showProject={!projectId} />
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  )
}

function LedgerRow({
  entry,
  showProject,
}: {
  entry: LedgerEntry
  showProject: boolean
}) {
  const income = entry.type === 'income'
  return (
    <li className={`ledger-row ${income ? 'ledger-row--in' : 'ledger-row--out'}`}>
      <span className={`ledger-row__icon ${income ? 'ledger-row__icon--in' : 'ledger-row__icon--out'}`}>
        {income ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
      </span>
      <div className="ledger-row__main">
        <span className="ledger-row__title">{entry.title}</span>
        <span className="ledger-row__meta muted">
          {income ? '매출 · 입금' : '매입 · '}
          {!income && entry.sublabel}
          {showProject && (
            <>
              {' · '}
              {entry.projectName}
            </>
          )}
        </span>
      </div>
      <span className={`ledger-row__amount ${income ? 'profit' : ''}`}>
        {income ? '+' : '−'}
        {formatKRW(entry.amount)}
      </span>
    </li>
  )
}
