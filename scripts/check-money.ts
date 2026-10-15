/**
 * 수입·인건비·월 수익 계산 검증.
 * Run: npx --yes tsx scripts/check-money.ts
 */
import assert from 'node:assert/strict'
import {
  groupEntriesByDate,
  laborByPerson,
  monthTotals,
  projectMonthTotals,
  projectTotals,
  projectTouchesMonth,
  shiftMonth,
} from '../src/lib/money'
import {
  parseAmount,
  formatAmountInput,
  formatKoreanAmount,
  normalizeISODate,
} from '../src/lib/format'
import type { Entry, Project } from '../src/types'

let n = 0
function entry(partial: Omit<Entry, 'id'>): Entry {
  n += 1
  return { id: `e${n}`, ...partial }
}

const cf: Project = {
  id: 'p1',
  name: 'CF',
  client: 'ABC',
  date: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  entries: [
    entry({ kind: 'income', title: '계약금', amount: 3_000_000, date: '2026-09-20' }),
    entry({ kind: 'income', title: '잔금', amount: 2_000_000, date: '2026-10-15' }),
    entry({ kind: 'labor', title: '김촬영', role: '촬영감독', amount: 800_000, date: '2026-10-02' }),
    entry({ kind: 'labor', title: '이조명', amount: 400_000, date: '2026-10-02' }),
    entry({ kind: 'labor', title: '김촬영', amount: 300_000, date: '2026-10-03' }),
    entry({ kind: 'equipment', title: 'FX6', amount: 250_000, date: '2026-10-02' }),
    entry({ kind: 'misc', title: '식대', amount: 90_000, date: '2026-10-02' }),
  ],
}

const mv: Project = {
  id: 'p2',
  name: 'MV',
  client: '',
  date: '2026-11-02',
  createdAt: '2026-01-01T00:00:00.000Z',
  entries: [
    entry({ kind: 'income', title: '', amount: 1_500_000, date: '2026-10-28' }),
    entry({ kind: 'labor', title: '박편집', amount: 500_000, date: '2026-11-01' }),
  ],
}

const t = projectTotals(cf)
assert.equal(t.income, 5_000_000)
assert.equal(t.labor, 1_500_000)
assert.equal(t.equipment, 250_000)
assert.equal(t.misc, 90_000)
assert.equal(t.expense, 1_840_000)
assert.equal(t.profit, 3_160_000)

const people = laborByPerson(cf)
assert.deepEqual(people[0], { name: '김촬영', amount: 1_100_000, count: 2 })
assert.deepEqual(people[1], { name: '이조명', amount: 400_000, count: 1 })

const oct = monthTotals([cf, mv], '2026-10')
assert.equal(oct.income, 3_500_000)
assert.equal(oct.labor, 1_500_000)
assert.equal(oct.expense, 1_840_000)
assert.equal(oct.profit, 1_660_000)

const sep = monthTotals([cf, mv], '2026-09')
assert.equal(sep.income, 3_000_000)
assert.equal(sep.profit, 3_000_000)

const nov = projectMonthTotals(mv, '2026-11')
assert.equal(nov.profit, -500_000)

assert.equal(shiftMonth('2026-01', -1), '2025-12')
assert.equal(shiftMonth('2026-12', 1), '2027-01')

assert.equal(parseAmount('1,200,000원'), 1_200_000)
assert.equal(formatAmountInput('1200000'), '1,200,000')
assert.equal(formatAmountInput('abc'), '')

const groups = groupEntriesByDate(cf.entries)
assert.equal(groups[0].date, '2026-10-15')
assert.equal(groups[1].date, '2026-10-03')
assert.equal(groups[2].date, '2026-10-02')
assert.equal(groups[2].entries.length, 4)
assert.equal(groups[groups.length - 1].date, '2026-09-20')

assert.equal(formatKoreanAmount(800_000), '80만 원')
assert.equal(formatKoreanAmount(1_234_567), '123만 4,567원')
assert.equal(formatKoreanAmount(150_000_000), '1억 5,000만 원')
assert.equal(formatKoreanAmount(9_000), '9,000원')

assert.equal(normalizeISODate('2026-11-02'), '2026-11-02')
assert.equal(normalizeISODate('2026-02-31'), '')
assert.equal(normalizeISODate(''), '')
assert.equal(projectTouchesMonth(mv, '2026-11'), true)
assert.equal(projectTouchesMonth(mv, '2026-12'), false)
assert.equal(projectTouchesMonth({ ...mv, date: '2026-12-01', entries: [] }, '2026-12'), true)

console.log('check-money: ok')
