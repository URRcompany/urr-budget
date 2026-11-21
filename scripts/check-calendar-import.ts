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
assert.equal(rows.find((r) => r.event.id === 'c')!.preselect, true, '촬영 캘린더의 미정 일정도 금액 미정으로 가져온다')
assert.equal(rows.find((r) => r.event.id === 'c')!.title, '정섭감독 촬영', '(미정) 머리표 제거')
assert.equal(rows.find((r) => r.event.id === 'd')!.preselect, true, '촬영 캘린더는 페이 줄이 없어도 가져온다')

// 가져오기 → 프로젝트
const { created } = rowsToProjects(rows.filter((r) => r.preselect))
assert.equal(created.length, 4)
assert.equal(created.find((x) => x.calendarEventId === 'c')!.amount, 0, '페이 미정은 금액 미정(0)')
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

// 캘린더와 연결 안 된 기존 프로젝트(손으로 넣었거나 예전에 옮긴 것)는 새로 추가하지 않고 연결한다
{
  const existing = (id: string, name: string, date: string, amount: number) => ({
    id, name, client: '', date, amount, dueDate: '', memo: '', entries: [], createdAt: '2026-11-14T00:00:00.000Z',
  })
  const projects = [
    existing('p1', '장애경제인대회 촬영', '2026-11-18', 250_000),
    existing('p2', '아티스트 라이브클립 (조명감독)', '2026-11-18', 400_000),
    existing('p3', '구로성심병원', '2026-12-09', 0),
    existing('p4', '구로성심병원', '2026-11-04', 420_000),
  ]
  const ev = (id: string, summary: string, date: string, description: string): CalendarEvent => ({
    id, summary, description, start: { date },
  })
  const r = buildRows([{ calendar: '촬영', events: [
    ev('e1', '장애경제인대회 촬영', '2026-11-18', '페이: 25'),
    ev('e2', '정섭감독 촬영 - 아티스트 라이브클립 조명감독', '2026-11-18', '페이: 40'),
    ev('e3', '현길감독 촬영 - 구로성심병원', '2026-12-09', '페이: 30'),
    ev('e4', '새 촬영', '2026-11-30', '페이: 20'),
  ] }], projects)
  const byId = Object.fromEntries(r.map((x) => [x.event.id, x]))
  assert.equal(byId.e1.state, 'match'); assert.equal(byId.e1.project?.id, 'p1')
  assert.equal(byId.e2.state, 'match'); assert.equal(byId.e2.project?.id, 'p2')
  assert.equal(byId.e3.state, 'match'); assert.equal(byId.e3.project?.id, 'p3', '날짜가 같은 쪽과만 짝')
  assert.equal(byId.e4.state, 'new')
  const { created, updated } = rowsToProjects(r)
  assert.equal(created.length, 1, '새 일정만 추가')
  const u3 = updated.find((p) => p.id === 'p3')!
  assert.equal(u3.amount, 300_000, '받을 금액이 비어 있으면 채움'); assert.equal(u3.calendarEventId, 'e3')
  const u2 = updated.find((p) => p.id === 'p2')!
  assert.equal(u2.amount, 400_000); assert.equal(u2.name, '아티스트 라이브클립 (조명감독)', '이름은 그대로')
  // 연결 후 다시 열면 '이미 가져옴'
  const again = buildRows([{ calendar: '촬영', events: [ev('e3', '현길감독 촬영 - 구로성심병원', '2026-12-09', '페이: 30')] }], [u3])
  assert.equal(again[0].state, 'linked')
  console.log('calendar import (기존 프로젝트 연결) ✓')
}

// '페이: 없음' 촬영과 '업무' 캘린더 일정은 기본으로 빼고, 업무 일정이라도 페이가 적혀 있으면 넣는다
{
  const ev = (id: string, summary: string, description?: string): CalendarEvent => ({ id, summary, description, start: { date: '2026-11-16' } })
  const r = buildRows([
    { calendar: '촬영', events: [ev('n', '정섭감독 촬영 - 조명감독+촬영감독', '페이: 없음'), ev('m', '(미정) 마켓 612 촬영 - 기간 중 2회차', '11/30~12/4 중 2회차')] },
    { calendar: '업무', events: [ev('w1', '최준범 대표님 사무실 방문', '시간: 미정'), ev('w2', '편집 외주', '페이: 20')] },
  ], [])
  const by = Object.fromEntries(r.map((x) => [x.event.id, x]))
  assert.equal(by.n.relevant, false); assert.equal(by.n.preselect, false, '페이 없음은 뺀다')
  assert.equal(by.m.relevant, true); assert.equal(by.m.preselect, true, '(미정) 촬영도 넣는다')
  assert.equal(by.m.title, '마켓 612 촬영 - 기간 중 2회차')
  assert.equal(by.w1.preselect, false, '업무 일정은 뺀다')
  assert.equal(by.w2.preselect, true, '업무라도 페이가 있으면 넣는다')
  console.log('calendar import (가져올 범위) ✓')
}
