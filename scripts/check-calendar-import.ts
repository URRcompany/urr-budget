/**
 * 구글 캘린더 일정 → 프로젝트 가져오기 검증.
 * Run: npx --yes tsx scripts/check-calendar-import.ts
 */
import assert from 'node:assert/strict'
import { buildRows, parsePay, rowsToProjects, type CalendarEvent } from '../src/lib/calendarImport'
import { normalizeStore } from '../src/hooks/useStore'
import type { AppStore } from '../src/types'

// 페이 줄 읽기 — 실제 캘린더 메모 형식
assert.deepEqual(parsePay('아티스트 라이브클립 조명감독\n준비: 조명 무선 세팅\n페이: 40'), { kind: 'amount', amount: 400_000 })
assert.deepEqual(parsePay('캠 1대\n페이: 15'), { kind: 'amount', amount: 150_000 })
assert.deepEqual(parsePay('역할: 조명감독\n페이: 30'), { kind: 'amount', amount: 300_000 })
assert.deepEqual(parsePay('- 인터뷰 포함\n\n페이: 25'), { kind: 'amount', amount: 250_000 })
assert.deepEqual(parsePay('페이: 없음'), { kind: 'none' })
assert.deepEqual(parsePay('페이: 미정 — 확인 필요'), { kind: 'unknown' })
assert.deepEqual(parsePay('역할: 미정\n페이: 미정'), { kind: 'unknown' })
assert.deepEqual(parsePay('확인할 것: 16·20·23일 촬영 역할과 페이'), { kind: 'missing' })
assert.deepEqual(parsePay(undefined), { kind: 'missing' })
// 다른 표기
assert.deepEqual(parsePay('하루페이 25'), { kind: 'amount', amount: 250_000 })
assert.deepEqual(parsePay('페이: 40만'), { kind: 'amount', amount: 400_000 })
assert.deepEqual(parsePay('페이: 1,200만'), { kind: 'amount', amount: 12_000_000 })
assert.deepEqual(parsePay('페이: 400,000원'), { kind: 'amount', amount: 400_000 })
assert.deepEqual(parsePay('메모<br>페이: 40'), { kind: 'amount', amount: 400_000 })

const events: CalendarEvent[] = [
  { id: 'a', summary: '정섭감독 촬영 - 조명감독', description: '역할: 조명감독\n페이: 30', start: { date: '2026-11-23' } },
  { id: 'b', summary: '장애경제인대회 촬영', description: '페이: 25', start: { dateTime: '2026-11-18T10:00:00+09:00' } },
  { id: 'c', summary: '(미정) 정섭감독 촬영', description: '페이: 미정', start: { date: '2026-11-24' } },
  { id: 'd', summary: '1차 납품: 현대메디텍 브랜드필름', start: { date: '2026-11-26' } },
  { id: 'e', summary: '취소된 촬영', description: '페이: 10', status: 'cancelled', start: { date: '2026-11-20' } },
]
let rows = buildRows([{ calendar: '촬영', events }], [])
assert.equal(rows.length, 4, '취소된 일정은 빠진다')
assert.deepEqual(rows.map((r) => r.event.id), ['b', 'a', 'c', 'd'], '날짜순')
assert.equal(rows.find((r) => r.event.id === 'b')!.date, '2026-11-18')
assert.equal(rows.find((r) => r.event.id === 'a')!.preselect, true)
assert.equal(rows.find((r) => r.event.id === 'c')!.preselect, false, '미정 일정은 기본 해제')
assert.equal(rows.find((r) => r.event.id === 'c')!.title, '정섭감독 촬영', '(미정) 머리표 제거')
assert.equal(rows.find((r) => r.event.id === 'd')!.preselect, false, '페이 없는 일정은 기본 해제')

// 가져오기 → 프로젝트
const { created } = rowsToProjects(rows.filter((r) => r.preselect))
assert.equal(created.length, 2)
const p = created.find((x) => x.calendarEventId === 'a')!
assert.equal(p.amount, 300_000)
assert.equal(p.date, '2026-11-23')
assert.equal(p.calendarPay, 300_000)

// 저장 후 다시 열면 '이미 가져옴'
const withPayment = { ...p, entries: [{ id: 'i', kind: 'income' as const, title: '', amount: 100_000, date: '2026-11-30' }] }
rows = buildRows([{ calendar: '촬영', events }], [withPayment])
assert.equal(rows.find((r) => r.event.id === 'a')!.state, 'linked')

// 캘린더에서 페이가 바뀌면 '바뀜' → 금액만 고치고 입금 기록은 유지
const changedEvents = events.map((e) => (e.id === 'a' ? { ...e, description: '페이: 35' } : e))
rows = buildRows([{ calendar: '촬영', events: changedEvents }], [withPayment])
const row = rows.find((r) => r.event.id === 'a')!
assert.equal(row.state, 'changed')
assert.equal(row.preselect, true)
const { updated } = rowsToProjects([row])
assert.equal(updated[0].id, p.id)
assert.equal(updated[0].amount, 350_000)
assert.equal(updated[0].entries.length, 1, '입금 기록 유지')

// 저장소 정리: 캘린더 연결 정보는 남기고, 없는 프로젝트엔 키를 만들지 않는다 (Firestore undefined 방지)
const store = normalizeStore({
  version: 4,
  activeProjectId: null,
  projects: [p, { ...p, id: 'plain', calendarEventId: undefined, calendarPay: undefined }],
} as AppStore)
assert.equal(store.projects[0].calendarEventId, 'a')
assert.equal(store.projects[0].calendarPay, 300_000)
assert.equal('calendarEventId' in store.projects[1], false)
assert.equal('calendarPay' in store.projects[1], false)

console.log('calendar import ✓')
