import type { Project } from '../types'
import { normalizeISODate, uid } from './format'

/** 구글 캘린더 일정 중 가져오기에 필요한 부분 */
export interface CalendarEvent {
  id: string
  summary?: string
  description?: string
  status?: string
  start?: { date?: string; dateTime?: string }
}

/**
 * 캘린더 메모의 페이 줄을 읽은 결과.
 * - amount: 금액이 적혀 있음 (원 단위)
 * - none:   '페이: 없음'
 * - unknown: '페이: 미정' 등 숫자가 없음
 * - missing: 페이 줄 자체가 없음
 */
export type PayInfo =
  | { kind: 'amount'; amount: number }
  | { kind: 'none' }
  | { kind: 'unknown' }
  | { kind: 'missing' }

const PAY_LINE = /(?:^|\n)\s*(?:하루\s*)?페이\s*[:：]?\s*([^\n]*)/

/**
 * '페이: 40' → 40만 원. 1만 미만 숫자는 만 원 단위로 본다.
 * '페이: 400,000' · '페이: 40만' · '페이: 1,200만' 도 읽는다.
 */
export function parsePay(description: string | undefined): PayInfo {
  if (!description) return { kind: 'missing' }
  // 캘린더 메모는 HTML로 올 때가 있어 줄바꿈 태그를 풀고 나머지 태그는 지운다.
  const text = description
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
  const m = PAY_LINE.exec(text)
  if (!m) return { kind: 'missing' }
  const value = m[1].trim()
  if (/^(없음|무료|노페이|무페이)/.test(value)) return { kind: 'none' }
  const num = /([\d][\d,]*(?:\.\d+)?)\s*(만)?/.exec(value)
  if (!num) return { kind: 'unknown' }
  const n = Number(num[1].replace(/,/g, ''))
  if (!Number.isFinite(n) || n <= 0) return { kind: 'unknown' }
  const amount = num[2] || n < 10_000 ? Math.round(n * 10_000) : Math.round(n)
  return { kind: 'amount', amount }
}

/** 하루 종일 일정은 start.date, 시간 일정은 start.dateTime의 날짜 부분 */
export function eventDate(e: CalendarEvent): string {
  const raw = e.start?.date ?? e.start?.dateTime?.slice(0, 10) ?? ''
  return normalizeISODate(raw)
}

const TENTATIVE = /^\s*\(미정\)\s*/

export function isTentative(e: CalendarEvent): boolean {
  return TENTATIVE.test(e.summary ?? '')
}

/** 프로젝트 이름: '(미정) ' 머리표는 떼고 쓴다 */
export function eventTitle(e: CalendarEvent): string {
  return (e.summary ?? '').replace(TENTATIVE, '').trim() || '제목 없는 일정'
}

/**
 * new: 새 프로젝트로 추가
 * linked: 이미 이 일정과 연결됨
 * changed: 연결됐는데 캘린더 쪽 페이·날짜가 바뀜
 * match: 연결은 안 됐지만 같은 날·비슷한 이름의 프로젝트가 이미 있음 (손으로 넣었거나 예전에 옮긴 것)
 */
export type RowState = 'new' | 'linked' | 'changed' | 'match'

export interface ImportRow {
  event: CalendarEvent
  calendar: string
  date: string
  title: string
  pay: PayInfo
  tentative: boolean
  /** 이미 이 일정과 연결된 프로젝트 */
  project: Project | null
  state: RowState
  /** 처음 열었을 때 체크해 둘지 */
  preselect: boolean
}

// 이름 비교에서 빼는 흔한 낱말
const STOP_WORDS = new Set(['촬영', '감독', '촬영감독', '조명감독', '행사', '영상', '미정'])

function nameTokens(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .split(/[^0-9a-z가-힣]+/)
      .filter((t) => t.length >= 2 && !STOP_WORDS.has(t)),
  )
}

/** 같은 날 일정과 프로젝트가 같은 일인지: 이름에 겹치는 낱말이 하나라도 있으면 같은 일로 본다 */
function looksSame(title: string, projectName: string): boolean {
  const a = nameTokens(title)
  const b = nameTokens(projectName)
  for (const t of a) {
    if (b.has(t)) return true
    for (const u of b) if (t.includes(u) || u.includes(t)) return true
  }
  return false
}

function payAmount(pay: PayInfo): number {
  return pay.kind === 'amount' ? pay.amount : 0
}

export function buildRows(
  byCalendar: { calendar: string; events: CalendarEvent[] }[],
  projects: Project[],
): ImportRow[] {
  const linked = new Map(
    projects.filter((p) => p.calendarEventId).map((p) => [p.calendarEventId as string, p]),
  )
  // 캘린더와 연결 안 된 프로젝트 — 같은 일정을 또 추가하지 않도록 짝을 찾는다
  const unlinked = projects.filter((p) => !p.calendarEventId)
  const claimed = new Set<string>()
  const rows: ImportRow[] = []
  for (const { calendar, events } of byCalendar) {
    for (const event of events) {
      if (event.status === 'cancelled') continue
      const date = eventDate(event)
      const pay = parsePay(event.description)
      const tentative = isTentative(event)
      let project = linked.get(event.id) ?? null
      let state: RowState = 'new'
      if (!project && date) {
        const twin = unlinked.find(
          (p) => !claimed.has(p.id) && p.date === date && looksSame(eventTitle(event), p.name),
        )
        if (twin) {
          claimed.add(twin.id)
          project = twin
          state = 'match'
        }
      }
      if (project && state !== 'match') {
        const changed =
          payAmount(pay) !== (project.calendarPay ?? 0) || (!!date && date !== project.date)
        state = changed ? 'changed' : 'linked'
      }
      rows.push({
        event,
        calendar,
        date,
        title: eventTitle(event),
        pay,
        tentative,
        project,
        state,
        preselect:
          state === 'changed' ||
          state === 'match' ||
          (state === 'new' && pay.kind === 'amount' && !tentative),
      })
    }
  }
  return rows.sort((a, b) => (a.date || '9').localeCompare(b.date || '9'))
}

/** 고른 줄을 새 프로젝트 / 수정할 프로젝트로 나눈다 */
export function rowsToProjects(rows: ImportRow[]): { created: Project[]; updated: Project[] } {
  const created: Project[] = []
  const updated: Project[] = []
  for (const r of rows) {
    const amount = payAmount(r.pay)
    if (r.project && r.state === 'match') {
      // 이미 있는 프로젝트에 일정만 연결한다. 이름·날짜·입력해 둔 받을 금액은 그대로,
      // 받을 금액이 비어 있을 때만 캘린더 페이로 채운다.
      updated.push({
        ...r.project,
        amount: r.project.amount || amount,
        calendarEventId: r.event.id,
        calendarPay: amount,
      })
      continue
    }
    if (r.project) {
      // 입금·인건비 기록은 건드리지 않고 받을 금액과 촬영일만 캘린더에 맞춘다.
      updated.push({
        ...r.project,
        amount,
        date: r.date || r.project.date,
        calendarPay: amount,
      })
      continue
    }
    created.push({
      id: uid('p'),
      name: r.title,
      client: '',
      date: r.date,
      amount,
      dueDate: '',
      memo: `구글 캘린더 '${r.calendar}'에서 가져옴`,
      entries: [],
      createdAt: new Date().toISOString(),
      calendarEventId: r.event.id,
      calendarPay: amount,
    })
  }
  return { created, updated }
}
