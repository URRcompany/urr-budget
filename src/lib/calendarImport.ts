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

export type RowState = 'new' | 'linked' | 'changed'

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
  const rows: ImportRow[] = []
  for (const { calendar, events } of byCalendar) {
    for (const event of events) {
      if (event.status === 'cancelled') continue
      const date = eventDate(event)
      const pay = parsePay(event.description)
      const tentative = isTentative(event)
      const project = linked.get(event.id) ?? null
      let state: RowState = 'new'
      if (project) {
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
          state === 'changed' || (state === 'new' && pay.kind === 'amount' && !tentative),
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
