import { useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import type { Project } from '../../types'
import { useAuth } from '../../context/AuthContext'
import { buildRows, rowsToProjects, type ImportRow, type PayInfo } from '../../lib/calendarImport'
import { CALENDAR_SCOPE, CalendarApiError, findImportCalendars, listEvents } from '../../lib/googleCalendar'
import { dshort, won } from './format'

interface CalendarImportModalProps {
  projects: Project[]
  onClose: () => void
  onApply: (created: Project[], updated: Project[]) => void
}

type Phase =
  | { step: 'connect' }
  | { step: 'loading' }
  | { step: 'error'; message: string }
  | { step: 'pick'; rows: ImportRow[]; missing: string[] }

/** 지난 3개월 ~ 앞으로 6개월 */
function importRange() {
  const now = new Date()
  const min = new Date(now.getFullYear(), now.getMonth() - 3, 1)
  const max = new Date(now.getFullYear(), now.getMonth() + 7, 1)
  return { min, max }
}

function payLabel(pay: PayInfo): string {
  if (pay.kind === 'amount') return won(pay.amount)
  if (pay.kind === 'none') return '페이 없음'
  if (pay.kind === 'unknown') return '페이 미정'
  return '페이 안 적힘'
}

const rowKey = (r: ImportRow) => r.event.id

export function CalendarImportModal({ projects, onClose, onApply }: CalendarImportModalProps) {
  const { user } = useAuth()
  const [phase, setPhase] = useState<Phase>({ step: 'connect' })
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)

  const load = async (token: string) => {
    setPhase({ step: 'loading' })
    try {
      const { found, missing } = await findImportCalendars(token)
      if (!found.length) {
        setPhase({ step: 'error', message: "구글 캘린더에서 '촬영'이나 '업무' 캘린더를 찾지 못했어요." })
        return
      }
      const { min, max } = importRange()
      const byCalendar = await Promise.all(
        found.map(async (c) => ({ calendar: c.name, events: await listEvents(token, c.id, min, max) })),
      )
      const rows = buildRows(byCalendar, projects)
      setPicked(new Set(rows.filter((r) => r.preselect).map(rowKey)))
      setPhase({ step: 'pick', rows, missing })
    } catch (err) {
      const message = err instanceof CalendarApiError ? err.message : '캘린더를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'
      setPhase({ step: 'error', message })
    }
  }

  const connect = useGoogleLogin({
    flow: 'implicit',
    scope: CALENDAR_SCOPE,
    hint: user?.email,
    onSuccess: (res) => {
      // 권한 동의 화면에서 캘린더 항목을 끄면 토큰에 범위가 빠져 온다.
      if (!res.scope?.includes(CALENDAR_SCOPE)) {
        setPhase({ step: 'error', message: '캘린더 읽기 권한을 허용해야 가져올 수 있어요.' })
        return
      }
      void load(res.access_token)
    },
    onError: () => setPhase({ step: 'error', message: '구글 연결에 실패했어요. 다시 시도해 주세요.' }),
    onNonOAuthError: () => setPhase({ step: 'connect' }),
  })

  const rows = phase.step === 'pick' ? phase.rows : []
  const visible = rows.filter((r) => showAll || r.project || r.relevant)
  const hiddenCount = rows.length - visible.length
  const chosen = rows.filter((r) => picked.has(rowKey(r)) && r.state !== 'linked')
  const newCount = chosen.filter((r) => r.state === 'new').length
  const updCount = chosen.filter((r) => r.state === 'changed').length
  const matchCount = chosen.filter((r) => r.state === 'match').length

  const toggle = (r: ImportRow) =>
    setPicked((s) => {
      const next = new Set(s)
      if (next.has(rowKey(r))) next.delete(rowKey(r))
      else next.add(rowKey(r))
      return next
    })

  const apply = () => {
    const { created, updated } = rowsToProjects(chosen)
    onApply(created, updated)
    onClose()
  }

  return (
    <div className="lg-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lg-modal lg-cal">
        <h2>구글 캘린더에서 가져오기</h2>
        <p className="lg-meta" style={{ marginBottom: 14 }}>
          '촬영' 캘린더 일정을 프로젝트로 가져와요. 메모의 <b>페이:</b> 줄이 받을 금액이 되고(페이: 40 → 40만 원),
          페이가 미정이거나 안 적힌 일정은 금액 미정으로 들어가요. '페이: 없음'과 '업무' 일정은 기본으로 빼요.
        </p>

        {phase.step === 'connect' && (
          <div className="lg-cal-center">
            <button type="button" className="lg-btn lg-btn--primary" onClick={() => connect()}>
              구글 캘린더 연결
            </button>
            <p className="lg-meta">캘린더는 읽기만 해요. 연결은 이 창을 닫으면 끝나요.</p>
          </div>
        )}

        {phase.step === 'loading' && <div className="lg-cal-center lg-meta">캘린더를 읽는 중…</div>}

        {phase.step === 'error' && (
          <div className="lg-cal-center">
            <p className="lg-error">{phase.message}</p>
            <button type="button" className="lg-btn" onClick={() => connect()}>
              다시 연결
            </button>
          </div>
        )}

        {phase.step === 'pick' && (
          <>
            {phase.missing.length > 0 && (
              <p className="lg-meta">'{phase.missing.join("', '")}' 캘린더는 찾지 못해 건너뛰었어요.</p>
            )}
            <div className="lg-cal-list">
              {visible.length === 0 && <div className="lg-empty-li">가져올 일정이 없어요</div>}
              {visible.map((r) => {
                const done = r.state === 'linked'
                return (
                  <label key={rowKey(r)} className={`lg-cal-row ${done ? 'is-done' : ''}`}>
                    <input
                      type="checkbox"
                      checked={done || picked.has(rowKey(r))}
                      disabled={done}
                      onChange={() => toggle(r)}
                    />
                    <span className="lg-cal-date lg-num">{r.date ? dshort(r.date) : '—'}</span>
                    <span className="lg-cal-body">
                      <span className="lg-cal-title">
                        <span className="lg-badge lg-b-up">{r.calendar}</span>
                        {r.tentative && <span className="lg-badge lg-b-partial">미정</span>}
                        {r.title}
                      </span>
                      <span className="lg-meta">
                        {r.state === 'linked' && '이미 가져옴'}
                        {r.state === 'changed' &&
                          `캘린더가 바뀜 · ${r.project?.calendarPay ? won(r.project.calendarPay) : '금액 미정'} → ${payLabel(r.pay)}${
                            r.date && r.project && r.date !== r.project.date ? ` · 날짜 ${dshort(r.project.date)} → ${dshort(r.date)}` : ''
                          }`}
                        {r.state === 'new' && '새 프로젝트로 추가'}
                        {r.state === 'match' &&
                          `이미 있는 '${r.project?.name}'에 연결 (새로 추가 안 함)${
                            r.project && !r.project.amount && r.pay.kind === 'amount' ? ' · 받을 금액 채움' : ''
                          }`}
                      </span>
                    </span>
                    <span className={`lg-cal-pay lg-num ${r.pay.kind === 'amount' ? '' : 'lg-meta'}`}>
                      {payLabel(r.pay)}
                    </span>
                  </label>
                )
              })}
            </div>
            {(hiddenCount > 0 || showAll) && (
              <button type="button" className="lg-chip" style={{ marginTop: 10 }} onClick={() => setShowAll((v) => !v)}>
                {showAll ? '촬영 일정만 보기' : `페이 없음 · 업무 일정 ${hiddenCount}개도 보기`}
              </button>
            )}
            <p className="lg-meta" style={{ marginTop: 10 }}>
              이미 가져온 프로젝트를 고치면 받을 금액과 촬영일만 바뀌어요. 입금·인건비 기록은 그대로예요. 같은 날
              비슷한 이름의 프로젝트가 있으면 새로 만들지 않고 연결만 해요.
            </p>
          </>
        )}

        <div className="lg-mfoot">
          <span className="lg-spacer" />
          <button type="button" className="lg-btn" onClick={onClose}>
            닫기
          </button>
          {phase.step === 'pick' && (
            <button type="button" className="lg-btn lg-btn--primary" disabled={!chosen.length} onClick={apply}>
              {chosen.length
                ? [newCount && `${newCount}개 추가`, matchCount && `${matchCount}개 연결`, updCount && `${updCount}개 수정`].filter(Boolean).join(' · ')
                : '가져오기'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
