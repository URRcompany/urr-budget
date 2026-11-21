import { useEffect, useMemo, useState } from 'react'
import type { Project } from '../../types'
import {
  laborAcrossProjects,
  monthlyRevenue,
  projectLedger,
  projectTotals,
  todayISO,
  type Ledger,
} from '../../lib/money'
import { AppBrand } from '../AppBrand'
import { UserBar } from '../UserBar'
import { BackupControls } from '../BackupControls'
import { ProjectEditor } from './ProjectEditor'
import { QuickPayModal } from './QuickPayModal'
import { CalendarImportModal } from './CalendarImportModal'
import { getGoogleClientId } from '../../lib/auth'
import { dshort, manwon, won } from './format'

type Tab = 'projects' | 'monthly' | 'labor' | 'equip'
type Filter = 'open' | 'done' | 'all'

interface UiState {
  tab: Tab
  filter: Filter
  year: string
  open: string | null
  openPerson: string | null
  openMonth?: string | null
}

const UI_KEY = 'reelbudget.ui.v1'

function loadUi(): UiState {
  const base: UiState = {
    tab: 'projects',
    filter: 'open',
    year: 'all',
    open: null,
    openPerson: null,
  }
  try {
    return {
      ...base,
      ...(JSON.parse(localStorage.getItem(UI_KEY) || '{}') as Partial<UiState>),
    }
  } catch {
    return base
  }
}

interface LedgerHomeProps {
  projects: Project[]
  onSave: (project: Project) => void
  onDelete: (id: string) => void
  onPay: (projectId: string, payment: { date: string; amount: number; memo: string }) => void
  onToggleLaborPaid: (projectId: string, entryId: string) => void
  onCalendarImport: (created: Project[], updated: Project[]) => void
  onExportBackup: () => void
  onImportBackup: (
    file: File,
    mode: 'merge' | 'replace',
  ) => Promise<{ ok: boolean; error?: string; projectCount?: number }>
}

const yearOf = (p: Project) => (p.date ? p.date.slice(0, 4) : '미정')

export function LedgerHome(props: LedgerHomeProps) {
  const { projects } = props
  const [ui, setUi] = useState<UiState>(loadUi)
  const [editing, setEditing] = useState<Project | 'new' | null>(null)
  const [paying, setPaying] = useState<Project | null>(null)
  const [importing, setImporting] = useState(false)
  const canImport = !!getGoogleClientId()

  useEffect(() => {
    try {
      localStorage.setItem(UI_KEY, JSON.stringify(ui))
    } catch {
      /* ignore */
    }
  }, [ui])

  const patchUi = (patch: Partial<UiState>) => setUi((u) => ({ ...u, ...patch }))

  const years = useMemo(() => [...new Set(projects.map(yearOf))].sort().reverse(), [projects])
  const year = ui.year !== 'all' && !years.includes(ui.year) ? 'all' : ui.year
  const visible = useMemo(() => projects.filter((p) => year === 'all' || yearOf(p) === year), [projects, year])
  const ledgers = useMemo(() => new Map(visible.map((p) => [p.id, projectLedger(p)])), [visible])
  const L = (p: Project) => ledgers.get(p.id) ?? projectLedger(p)

  return (
    <div className="lg">
      <header className="lg-top">
        <AppBrand size="sm" />
        <UserBar compact />
      </header>

      <div className="lg-head">
        <h1>정산장부</h1>
        <select className="lg-input lg-year" value={year} onChange={(e) => patchUi({ year: e.target.value })}>
          <option value="all">전체 기간</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
              {y === '미정' ? '' : '년'}
            </option>
          ))}
        </select>
        {canImport && (
          <button type="button" className="lg-btn" onClick={() => setImporting(true)}>
            캘린더에서 가져오기
          </button>
        )}
        <button type="button" className="lg-btn lg-btn--primary" onClick={() => setEditing('new')}>
          + 프로젝트
        </button>
      </div>

      <Summary projects={visible} ledger={L} />

      <div className="lg-tabs" role="tablist">
        {(
          [
            ['projects', '프로젝트'],
            ['monthly', '월별'],
            ['labor', '인건비'],
            ['equip', '장비'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={ui.tab === key}
            className={ui.tab === key ? 'on' : ''}
            onClick={() => patchUi({ tab: key })}
          >
            {label}
          </button>
        ))}
      </div>

      {ui.tab === 'projects' && (
        <ProjectsTab
          all={projects}
          projects={visible}
          ledger={L}
          ui={ui}
          patchUi={patchUi}
          onNew={() => setEditing('new')}
          onEdit={setEditing}
          onPay={setPaying}
          onToggleLaborPaid={props.onToggleLaborPaid}
        />
      )}
      {ui.tab === 'labor' && (
        <LaborTab projects={visible} ui={ui} patchUi={patchUi} onToggleLaborPaid={props.onToggleLaborPaid} />
      )}
      {ui.tab === 'monthly' && <MonthlyTab projects={visible} ui={ui} patchUi={patchUi} />}
      {ui.tab === 'equip' && <EquipTab projects={visible} />}

      <footer className="lg-footer">
        <BackupControls compact onExport={props.onExportBackup} onImport={props.onImportBackup} />
      </footer>

      {editing && (
        <ProjectEditor
          project={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(p) => {
            props.onSave(p)
            patchUi({ open: p.id })
          }}
          onDelete={props.onDelete}
        />
      )}
      {importing && (
        <CalendarImportModal projects={projects} onClose={() => setImporting(false)} onApply={props.onCalendarImport} />
      )}
      {paying && (
        <QuickPayModal
          project={paying}
          onClose={() => setPaying(null)}
          onPay={(payment) => props.onPay(paying.id, payment)}
        />
      )}
    </div>
  )
}

/* ───────── 요약 ───────── */

function Summary({ projects, ledger }: { projects: Project[]; ledger: (p: Project) => Ledger }) {
  let due = 0,
    openCnt = 0,
    lateCnt = 0,
    upDue = 0,
    upCnt = 0
  const t = {
    amount: 0,
    received: 0,
    expense: 0,
    labor: 0,
    equipment: 0,
    misc: 0,
    profit: 0,
    laborUnpaid: 0,
  }
  for (const p of projects) {
    const l = ledger(p)
    t.amount += l.amount
    t.received += l.received
    t.expense += l.expense
    t.labor += l.labor
    t.equipment += l.equipment
    t.misc += l.misc
    t.profit += l.profit
    t.laborUnpaid += l.laborUnpaid
    if (l.upcoming) {
      if (l.status !== 'done') {
        upDue += l.due
        upCnt++
      }
      continue
    }
    due += l.due
    if (l.status !== 'done' && l.amount > 0) openCnt++
    if (l.overdue) lateCnt++
  }
  return (
    <div className="lg-summary">
      <div className={`lg-stat lg-stat--hero ${due ? '' : 'lg-stat--zero'}`}>
        <div className="k">아직 받을 돈 (촬영 끝난 것)</div>
        <div className="v lg-num">{won(due)}</div>
        <div className="d">
          {due ? `${openCnt}개 프로젝트${lateCnt ? ` · 기한 지난 ${lateCnt}건` : ''}` : '모두 입금 완료'}
          {upCnt ? ` · 촬영 예정 ${upCnt}건 ${won(upDue)} 별도` : ''}
        </div>
      </div>
      <div className="lg-stat">
        <div className="k">입금 받은 돈</div>
        <div className="v lg-num">{won(t.received)}</div>
        <div className="d">총 계약 {won(t.amount)}</div>
      </div>
      <div className="lg-stat">
        <div className="k">총 지출</div>
        <div className="v lg-num">{won(t.expense)}</div>
        <div className="d">
          인건비 {won(t.labor)} · 장비 {won(t.equipment)}
          {t.misc ? ` · 기타 ${won(t.misc)}` : ''}
        </div>
      </div>
      <div className="lg-stat">
        <div className="k">남는 돈 (계약 − 지출)</div>
        <div className="v lg-num">{won(t.profit)}</div>
        <div className="d">
          {t.laborUnpaid ? <span className="lg-red">인건비 미지급 {won(t.laborUnpaid)}</span> : '인건비 모두 지급'}
        </div>
      </div>
    </div>
  )
}

/* ───────── 프로젝트 탭 ───────── */

function ProjectsTab({
  all,
  projects,
  ledger,
  ui,
  patchUi,
  onNew,
  onEdit,
  onPay,
  onToggleLaborPaid,
}: {
  all: Project[]
  projects: Project[]
  ledger: (p: Project) => Ledger
  ui: UiState
  patchUi: (p: Partial<UiState>) => void
  onNew: () => void
  onEdit: (p: Project) => void
  onPay: (p: Project) => void
  onToggleLaborPaid: (projectId: string, entryId: string) => void
}) {
  if (!all.length) {
    return (
      <div className="lg-empty">
        <b>아직 프로젝트가 없어요</b>
        촬영한 프로젝트를 추가하면 받을 돈이 위에 바로 정리돼요.
        <br />
        <br />
        <button type="button" className="lg-btn lg-btn--primary" onClick={onNew}>
          + 첫 프로젝트 추가
        </button>
      </div>
    )
  }
  const open: Project[] = [],
    up: Project[] = [],
    done: Project[] = []
  for (const p of projects) {
    const l = ledger(p)
    if (l.status === 'done') done.push(p)
    else if (l.upcoming) up.push(p)
    else open.push(p)
  }
  const byDate = (a: Project, b: Project) => (a.date || '9').localeCompare(b.date || '9')
  open.sort(byDate)
  up.sort(byDate)
  done.sort((a, b) => ledger(b).lastPay.localeCompare(ledger(a).lastPay))
  const sumDue = (list: Project[]) => list.reduce((s, p) => s + ledger(p).due, 0)

  const card = (p: Project) => (
    <ProjectCard
      key={p.id}
      project={p}
      l={ledger(p)}
      open={ui.open === p.id}
      onToggle={() => patchUi({ open: ui.open === p.id ? null : p.id })}
      onEdit={() => onEdit(p)}
      onPay={() => onPay(p)}
      onToggleLaborPaid={(entryId) => onToggleLaborPaid(p.id, entryId)}
    />
  )

  return (
    <>
      <div className="lg-toolbar">
        {(
          [
            ['open', '받을 돈', open.length + up.length],
            ['done', '입금 완료', done.length],
            ['all', '전체', projects.length],
          ] as const
        ).map(([key, label, n]) => (
          <button
            key={key}
            type="button"
            className={`lg-chip ${ui.filter === key ? 'on' : ''}`}
            onClick={() => patchUi({ filter: key })}
          >
            {label}
            <b>{n}</b>
          </button>
        ))}
      </div>

      {ui.filter !== 'done' && (
        <>
          <div className="lg-sec">
            <span>받을 돈 · 오래된 촬영 순</span>
            <span className="lg-num">{won(sumDue(open))}</span>
          </div>
          {open.length ? open.map(card) : <div className="lg-empty-li">받을 돈이 남은 프로젝트가 없어요 👏</div>}
          {up.length > 0 && (
            <>
              <div className="lg-sec">
                <span>촬영 예정 · 가까운 순</span>
                <span className="lg-num">{won(sumDue(up))}</span>
              </div>
              {up.map(card)}
            </>
          )}
        </>
      )}
      {ui.filter !== 'open' && (
        <>
          <div className="lg-sec">
            <span>입금 완료</span>
            <span className="lg-num">{won(done.reduce((s, p) => s + ledger(p).received, 0))}</span>
          </div>
          {done.length ? done.map(card) : <div className="lg-empty-li">아직 없어요</div>}
        </>
      )}
    </>
  )
}

function Badges({ l }: { l: Ledger }) {
  if (l.upcoming && l.status === 'unpaid') return <span className="lg-badge lg-b-up">촬영 예정</span>
  const [label, cls] = {
    unpaid: ['미수금', 'lg-b-unpaid'],
    partial: ['일부 입금', 'lg-b-partial'],
    done: ['입금 완료', 'lg-b-done'],
  }[l.status]
  return (
    <>
      <span className={`lg-badge ${cls}`}>{label}</span>
      {l.upcoming && <span className="lg-badge lg-b-up">촬영 예정</span>}
      {l.overdue && <span className="lg-badge lg-b-late">기한 지남</span>}
    </>
  )
}

function ProjectCard({
  project: p,
  l,
  open,
  onToggle,
  onEdit,
  onPay,
  onToggleLaborPaid,
}: {
  project: Project
  l: Ledger
  open: boolean
  onToggle: () => void
  onEdit: () => void
  onPay: () => void
  onToggleLaborPaid: (entryId: string) => void
}) {
  const pct = l.amount ? Math.min(100, Math.round((l.received / l.amount) * 100)) : 0
  const payments = p.entries.filter((e) => e.kind === 'income')
  const labor = p.entries.filter((e) => e.kind === 'labor')
  const gear = p.entries.filter((e) => e.kind === 'equipment' || e.kind === 'misc')
  const meta = [p.client, p.date ? `촬영 ${p.date}` : ''].filter(Boolean).join(' · ')

  return (
    <div className="lg-card">
      <div
        className="lg-card-main"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={onToggle}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onToggle())}
      >
        <div>
          <div className="lg-ttl">
            <Badges l={l} />
            <span className="lg-name">{p.name}</span>
          </div>
          {meta && <div className="lg-meta">{meta}</div>}
        </div>
        <div className="lg-right">
          {l.status === 'done' ? (
            <>
              <div className="lbl">입금 완료{l.lastPay ? ` · ${dshort(l.lastPay)}` : ''}</div>
              <div className="big lg-green lg-num">{won(l.received)}</div>
            </>
          ) : (
            <>
              <div className="lbl">
                {l.upcoming ? '받을 예정' : '받을 돈'}
                {p.dueDate ? ` · ${dshort(p.dueDate)}까지` : ''}
              </div>
              <div className={`big lg-num ${l.upcoming ? '' : 'lg-red'}`}>{l.amount ? won(l.due) : '금액 미정'}</div>
            </>
          )}
        </div>
        {l.amount > 0 && l.status !== 'done' && (
          <div className="lg-bar">
            <i style={{ width: `${pct}%` }} />
          </div>
        )}
        <div className="lg-mini lg-num">
          <span>
            계약 <b>{won(l.amount)}</b>
          </span>
          <span>
            입금 <b>{won(l.received)}</b>
          </span>
          <span>
            지출 <b>{won(l.expense)}</b>
          </span>
          <span>
            남는 돈 <b>{won(l.profit)}</b>
          </span>
          {l.laborUnpaid > 0 && <span className="lg-red">인건비 미지급 {won(l.laborUnpaid)}</span>}
        </div>
      </div>

      {open && (
        <div className="lg-detail">
          <div className="lg-dgrid">
            <DBox title="입금 내역" total={l.received} empty="아직 입금 없음">
              {payments.map((e) => (
                <div className="lg-li" key={e.id}>
                  <span>
                    {e.date || '날짜 없음'} {e.title && <span className="s">{e.title}</span>}
                  </span>
                  <b className="lg-num">{won(e.amount)}</b>
                </div>
              ))}
            </DBox>
            <DBox title="인건비" total={l.labor} empty="없음">
              {labor.map((e) => (
                <div className="lg-li" key={e.id}>
                  <span>
                    {e.title || '?'} {e.role && <span className="s">{e.role}</span>}
                  </span>
                  <span className="lg-li-r">
                    <b className="lg-num">{won(e.amount)}</b>
                    <PaidToggle paid={!!e.paid} onClick={() => onToggleLaborPaid(e.id)} />
                  </span>
                </div>
              ))}
            </DBox>
            <DBox title="장비 · 기타" total={l.equipment + l.misc} empty="없음">
              {gear.map((e) => (
                <div className="lg-li" key={e.id}>
                  <span>
                    {e.title || (e.kind === 'equipment' ? '장비' : '기타')}{' '}
                    {e.kind === 'misc' && <span className="s">기타</span>}
                  </span>
                  <b className="lg-num">{won(e.amount)}</b>
                </div>
              ))}
            </DBox>
          </div>
          {p.memo && <div className="lg-memo">{p.memo}</div>}
          <div className="lg-dactions">
            {l.status !== 'done' && l.amount > 0 && (
              <button type="button" className="lg-btn lg-btn--pay" onClick={onPay}>
                입금 받음 처리
              </button>
            )}
            <button type="button" className="lg-btn" onClick={onEdit}>
              수정
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DBox({
  title,
  total,
  empty,
  children,
}: {
  title: string
  total: number
  empty: string
  children: React.ReactNode[]
}) {
  return (
    <div className="lg-dbox">
      <h4>
        <span>{title}</span>
        <span className="lg-num">{won(total)}</span>
      </h4>
      {children.length ? children : <div className="lg-empty-li">{empty}</div>}
    </div>
  )
}

function PaidToggle({ paid, onClick }: { paid: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`lg-paid ${paid ? 'on' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      {paid ? '지급함' : '미지급'}
    </button>
  )
}

/* ───────── 인건비 탭 ───────── */

function LaborTab({
  projects,
  ui,
  patchUi,
  onToggleLaborPaid,
}: {
  projects: Project[]
  ui: UiState
  patchUi: (p: Partial<UiState>) => void
  onToggleLaborPaid: (projectId: string, entryId: string) => void
}) {
  const people = laborAcrossProjects(projects)
  if (!people.length) {
    return (
      <div className="lg-empty">
        <b>인건비 기록이 없어요</b>
        프로젝트 수정 화면에서 스태프와 금액을 넣으면 여기서 사람별로 모아 보여줘요.
      </div>
    )
  }
  const total = people.reduce((s, m) => s + m.total, 0)
  const unpaid = people.reduce((s, m) => s + m.unpaid, 0)
  return (
    <>
      <div className="lg-sec">
        <span>사람별 · 미지급 많은 순</span>
        <span className="lg-num">
          총 {won(total)}
          {unpaid > 0 && <span className="lg-red"> · 미지급 {won(unpaid)}</span>}
        </span>
      </div>
      <table className="lg-table">
        <thead>
          <tr>
            <th>이름</th>
            <th>역할</th>
            <th className="r">건수</th>
            <th className="r">총액</th>
            <th className="r">미지급</th>
          </tr>
        </thead>
        <tbody>
          {people.map((m) => {
            const isOpen = ui.openPerson === m.name
            return [
              <tr key={m.name} className="clickable" onClick={() => patchUi({ openPerson: isOpen ? null : m.name })}>
                <td>
                  <b>{m.name}</b>
                </td>
                <td className="lg-meta">{m.roles.join(', ')}</td>
                <td className="r lg-num">{m.items.length}</td>
                <td className="r lg-num">{won(m.total)}</td>
                <td className={`r lg-num ${m.unpaid ? 'lg-red' : 'lg-meta'}`}>{m.unpaid ? won(m.unpaid) : '-'}</td>
              </tr>,
              ...(isOpen
                ? m.items
                    .slice()
                    .sort((a, b) => (b.project.date || '').localeCompare(a.project.date || ''))
                    .map(({ project, entry }) => (
                      <tr className="sub" key={entry.id}>
                        <td colSpan={3}>
                          {project.date} · {project.name}
                          {entry.role ? ` (${entry.role})` : ''}
                        </td>
                        <td className="r lg-num">{won(entry.amount)}</td>
                        <td className="r">
                          <PaidToggle paid={!!entry.paid} onClick={() => onToggleLaborPaid(project.id, entry.id)} />
                        </td>
                      </tr>
                    ))
                : []),
            ]
          })}
        </tbody>
      </table>
    </>
  )
}

/* ───────── 장비 탭 ───────── */

function EquipTab({ projects }: { projects: Project[] }) {
  const rows = projects.flatMap((project) =>
    project.entries.filter((e) => e.kind === 'equipment').map((entry) => ({ project, entry })),
  )
  if (!rows.length) {
    return (
      <div className="lg-empty">
        <b>장비 비용 기록이 없어요</b>
        프로젝트 수정 화면에서 렌탈·장비 비용을 넣으면 여기 모여요.
      </div>
    )
  }
  const byItem = new Map<string, number>()
  for (const { entry } of rows) {
    const k = entry.title.trim() || '장비 렌탈'
    byItem.set(k, (byItem.get(k) ?? 0) + entry.amount)
  }
  const items = [...byItem.entries()].sort((a, b) => b[1] - a[1])
  rows.sort((a, b) => (b.project.date || '').localeCompare(a.project.date || ''))
  return (
    <>
      <div className="lg-sec">
        <span>항목별 합계</span>
        <span className="lg-num">총 {won(rows.reduce((s, r) => s + r.entry.amount, 0))}</span>
      </div>
      <table className="lg-table">
        <thead>
          <tr>
            <th>항목</th>
            <th className="r">합계</th>
          </tr>
        </thead>
        <tbody>
          {items.map(([k, v]) => (
            <tr key={k}>
              <td>{k}</td>
              <td className="r lg-num">{won(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="lg-sec">
        <span>프로젝트별 내역</span>
      </div>
      <table className="lg-table">
        <thead>
          <tr>
            <th>촬영일</th>
            <th>프로젝트</th>
            <th>항목</th>
            <th className="r">금액</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ project, entry }) => (
            <tr key={entry.id}>
              <td className="lg-meta lg-num">{project.date || '-'}</td>
              <td>{project.name}</td>
              <td>{entry.title || '장비 렌탈'}</td>
              <td className="r lg-num">{won(entry.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

/* ───────── 월별 탭 ───────── */

function monthLabel(m: string): string {
  if (m === '미정') return '날짜 미정'
  return `${Number(m.slice(5))}월`
}

function MonthlyTab({
  projects,
  ui,
  patchUi,
}: {
  projects: Project[]
  ui: UiState
  patchUi: (p: Partial<UiState>) => void
}) {
  const rows = monthlyRevenue(projects)
  if (!rows.length) {
    return (
      <div className="lg-empty">
        <b>아직 프로젝트가 없어요</b>
        촬영일과 받을 금액을 넣으면 달마다 매출과 수익을 모아 보여줘요.
      </div>
    )
  }
  const thisMonth = todayISO().slice(0, 7)
  const max = Math.max(1, ...rows.map((r) => Math.max(r.sales, r.received)))
  const total = rows.reduce(
    (t, r) => ({
      sales: t.sales + r.sales,
      expense: t.expense + r.expense,
      profit: t.profit + r.profit,
      received: t.received + r.received,
      count: t.count + r.count,
    }),
    { sales: 0, expense: 0, profit: 0, received: 0, count: 0 },
  )
  const dated = rows.filter((r) => r.month !== '미정' && r.month <= thisMonth && r.count > 0)
  const avg = dated.length ? Math.round(dated.reduce((s, r) => s + r.sales, 0) / dated.length) : 0
  const cur = rows.find((r) => r.month === thisMonth)

  return (
    <>
      <div className="lg-summary lg-summary--3">
        <div className="lg-stat">
          <div className="k">이번 달 매출 ({Number(thisMonth.slice(5))}월)</div>
          <div className="v lg-num">{won(cur?.sales ?? 0)}</div>
          <div className="d">
            수익 {won(cur?.profit ?? 0)} · 입금 {won(cur?.received ?? 0)}
          </div>
        </div>
        <div className="lg-stat">
          <div className="k">월평균 매출</div>
          <div className="v lg-num">{won(avg)}</div>
          <div className="d">이번 달까지 촬영 있던 {dated.length}개월 기준</div>
        </div>
        <div className="lg-stat">
          <div className="k">{ui.year === 'all' ? '전체' : `${ui.year}년`} 합계</div>
          <div className="v lg-num">{won(total.sales)}</div>
          <div className="d">
            수익 {won(total.profit)} · {total.count}건
          </div>
        </div>
      </div>

      <div className="lg-sec">
        <span>월별 · 최근 달부터</span>
        <span>매출·수익은 촬영일, 입금은 들어온 날 기준</span>
      </div>
      <div className="lg-table-wrap">
        <table className="lg-table lg-month">
          <thead>
            <tr>
              <th>월</th>
              <th className="r">매출</th>
              <th className="r lg-hide-sm">지출</th>
              <th className="r">수익</th>
              <th className="r">입금</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const open = ui.openMonth === r.month
              const list = projects
                .filter((p) => (p.date ? p.date.slice(0, 7) : '미정') === r.month)
                .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
              const future = r.month !== '미정' && r.month > thisMonth
              return [
                <tr
                  key={r.month}
                  className={`clickable ${r.month === thisMonth ? 'is-now' : ''}`}
                  onClick={() => patchUi({ openMonth: open ? null : r.month })}
                >
                  <td>
                    <b>{monthLabel(r.month)}</b>
                    {r.month === thisMonth && <span className="lg-badge lg-b-partial lg-ml">이번 달</span>}
                    {future && <span className="lg-badge lg-b-up lg-ml">예정</span>}
                    <div className="lg-meta">
                      {r.month !== '미정' && `${r.month.slice(0, 4)} · `}
                      {r.count}건{r.undecided ? ` · 미정 ${r.undecided}` : ''}
                    </div>
                    <div className="lg-mbar" aria-hidden>
                      <i className="s" style={{ width: `${(r.sales / max) * 100}%` }} />
                      <i
                        className="p"
                        style={{
                          width: `${(Math.max(0, r.profit) / max) * 100}%`,
                        }}
                      />
                    </div>
                  </td>
                  <td className="r lg-num">
                    <Amt n={r.sales} />
                  </td>
                  <td className="r lg-num lg-hide-sm">{r.expense ? <Amt n={r.expense} /> : '-'}</td>
                  <td className={`r lg-num ${r.profit < 0 ? 'lg-red' : ''}`}>
                    <b>
                      <Amt n={r.profit} />
                    </b>
                  </td>
                  <td className="r lg-num lg-green">{r.received ? <Amt n={r.received} /> : '-'}</td>
                </tr>,
                ...(open
                  ? list.map((p) => {
                      const t = projectTotals(p)
                      return (
                        <tr className="sub" key={p.id}>
                          <td>
                            {p.date ? `${Number(p.date.slice(8))}일 · ` : ''}
                            {p.name}
                          </td>
                          <td className="r lg-num">{p.amount ? <Amt n={p.amount} /> : '금액 미정'}</td>
                          <td className="r lg-num lg-hide-sm">{t.expense ? <Amt n={t.expense} /> : '-'}</td>
                          <td className="r lg-num">
                            <Amt n={p.amount - t.expense} />
                          </td>
                          <td className="r lg-num">{t.income ? <Amt n={t.income} /> : '-'}</td>
                        </tr>
                      )
                    })
                  : []),
              ]
            })}
            <tr className="lg-total">
              <td>
                <b>합계</b>
              </td>
              <td className="r lg-num">
                <b>
                  <Amt n={total.sales} />
                </b>
              </td>
              <td className="r lg-num lg-hide-sm">
                <Amt n={total.expense} />
              </td>
              <td className="r lg-num">
                <b>
                  <Amt n={total.profit} />
                </b>
              </td>
              <td className="r lg-num">
                <Amt n={total.received} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="lg-meta" style={{ marginTop: 10 }}>
        달을 누르면 그 달 촬영한 프로젝트가 펼쳐져요. 매출은 받을 금액(계약) 합계라 아직 못 받은 돈도 들어가요 — 실제
        들어온 돈은 입금 칸을 보세요.
      </p>
    </>
  )
}

/** 넓은 화면은 원 단위, 좁은 화면은 만 원 단위 */
function Amt({ n }: { n: number }) {
  return (
    <>
      <span className="lg-full">{won(n)}</span>
      <span className="lg-short">{manwon(n)}</span>
    </>
  )
}
