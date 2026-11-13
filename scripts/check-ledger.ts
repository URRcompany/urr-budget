/**
 * 정산장부(받을 돈 · 미수금) 계산과 개편 전 데이터 변환 검증.
 * Run: npx --yes tsx scripts/check-ledger.ts
 */
import assert from 'node:assert/strict'
import { laborAcrossProjects, projectLedger } from '../src/lib/money'
import { normalizeStore } from '../src/hooks/useStore'
import type { AppStore, Project } from '../src/types'

const base = (p: Partial<Project>): Project => ({
  id: 'p', name: 'X', client: '', date: '2026-10-01', amount: 0, dueDate: '', memo: '',
  entries: [], createdAt: '2026-01-01T00:00:00.000Z', ...p,
})

const today = '2026-11-14'

// 미수금
let l = projectLedger(base({ amount: 1_000_000 }), today)
assert.equal(l.status, 'unpaid'); assert.equal(l.due, 1_000_000); assert.equal(l.upcoming, false)

// 일부 입금 + 지출 + 미지급 인건비
l = projectLedger(base({
  amount: 1_000_000,
  dueDate: '2026-11-01',
  entries: [
    { id: 'a', kind: 'income', title: '계약금', amount: 300_000, date: '2026-10-01' },
    { id: 'b', kind: 'labor', title: '김', role: '', amount: 200_000, date: '2026-10-01', paid: false },
    { id: 'c', kind: 'labor', title: '이', role: '', amount: 100_000, date: '2026-10-01', paid: true },
    { id: 'd', kind: 'equipment', title: '렌탈', amount: 50_000, date: '2026-10-01' },
  ],
}), today)
assert.equal(l.status, 'partial'); assert.equal(l.due, 700_000); assert.equal(l.expense, 350_000)
assert.equal(l.profit, 650_000); assert.equal(l.laborUnpaid, 200_000); assert.equal(l.overdue, true)

// 전액 입금
l = projectLedger(base({ amount: 500_000, entries: [
  { id: 'a', kind: 'income', title: '', amount: 500_000, date: '2026-10-05' },
] }), today)
assert.equal(l.status, 'done'); assert.equal(l.due, 0); assert.equal(l.lastPay, '2026-10-05')

// 촬영 예정은 기한 지남으로 보지 않음
l = projectLedger(base({ amount: 250_000, date: '2026-11-20', dueDate: '2026-11-01' }), today)
assert.equal(l.upcoming, true); assert.equal(l.overdue, false)

// 개편 전 데이터: amount 없음 → 받은 돈 합계, 인건비는 지급한 것으로
const legacy = normalizeStore({
  version: 4,
  activeProjectId: null,
  projects: [{
    id: 'old', name: 'G마켓', client: '준우형', date: '2026-09-28', createdAt: '2026-10-16T00:00:00Z',
    entries: [
      { id: 'i', kind: 'income', title: '', amount: 650_000, date: '2026-09-28' },
      { id: 'w', kind: 'labor', title: '김건우', role: '스크립', amount: 150_000, date: '2026-09-28' },
    ],
  }],
} as unknown as AppStore)
const p = legacy.projects[0]
assert.equal(p.amount, 650_000); assert.equal(p.dueDate, ''); assert.equal(p.memo, '')
assert.equal(p.entries.find((e) => e.kind === 'labor')?.paid, true)
assert.equal(projectLedger(p, today).status, 'done')
// Firestore가 거절하는 undefined 값이 없어야 함
assert.ok(!JSON.stringify(legacy).includes('undefined'))
for (const e of p.entries) for (const v of Object.values(e)) assert.notEqual(v, undefined)

// 받을 금액 0(미정)은 그대로 유지
assert.equal(normalizeStore({ version: 4, activeProjectId: null, projects: [base({ id: 'z', amount: 0 })] }).projects[0].amount, 0)

// 사람별 인건비
const people = laborAcrossProjects([
  base({ id: '1', entries: [{ id: 'x', kind: 'labor', title: '김', role: 'AC', amount: 100_000, date: '', paid: false }] }),
  base({ id: '2', entries: [{ id: 'y', kind: 'labor', title: '김', role: 'DIT', amount: 50_000, date: '', paid: true }] }),
])
assert.equal(people.length, 1); assert.equal(people[0].total, 150_000); assert.equal(people[0].unpaid, 100_000)
assert.deepEqual(people[0].roles, ['AC', 'DIT'])

console.log('check-ledger: ok')
