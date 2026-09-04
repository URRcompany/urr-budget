/**
 * Labor withholding (3.3%) checks — only laborPayment-linked expenses.
 * Run: npx --yes tsx scripts/check-labor-withholding.ts
 */
import assert from 'node:assert/strict'
import { calcWithholding, laborWithholdingExpenseIds, withholdingRateLabel } from '../src/lib/withholding'
import { resolveExpenseTax } from '../src/lib/vat'
import { getPortfolioTaxSummary } from '../src/lib/taxLedger'
import type { Project } from '../src/types'
import { normalizeImportedStore } from '../src/hooks/useStore'

const wh = calcWithholding(1_000_000)
assert.equal(wh.gross, 1_000_000)
assert.equal(wh.tax, 33_000)
assert.equal(wh.net, 967_000)
assert.equal(withholdingRateLabel(), '3.3%')

const ids = laborWithholdingExpenseIds([
  { expenseId: 'e_labor' },
  { expenseId: undefined },
  {},
])
assert.ok(ids.has('e_labor'))
assert.equal(ids.size, 1)

const project: Project = {
  id: 'p1',
  name: 'Test',
  client: '',
  shootDate: '',
  revenue: 0,
  totalBudget: 0,
  categories: [
    { id: 'labor', name: '인건비', color: '#000', planned: 0 },
    { id: 'meals', name: '식비', color: '#000', planned: 0 },
    { id: 'equipment', name: '장비대여비', color: '#000', planned: 0 },
  ],
  expenses: [
    {
      id: 'e_labor',
      title: '김씨 인건비',
      amount: 1_000_000,
      categoryId: 'labor',
      date: '2026-09-01',
      note: '',
      vendor: '김씨',
      invoiceReceived: true,
      vatMode: 'exempt',
      supplyAmount: 1_000_000,
      vatAmount: 0,
    },
    // 식비를 실수로 labor 카테고리+exempt로 저장한 경우 → 부가세 집계에 포함되어야 함
    {
      id: 'e_meals_wrong_cat',
      title: '촬영 식비',
      amount: 110_000,
      categoryId: 'labor',
      date: '2026-09-01',
      note: '',
      vendor: '식당',
      invoiceReceived: false,
      vatMode: 'exempt',
      vatAmount: 0,
    },
    {
      id: 'e_gear',
      title: '장비대여',
      amount: 220_000,
      categoryId: 'equipment',
      date: '2026-09-01',
      note: '',
      vendor: '렌탈',
      invoiceReceived: false,
      vatMode: 'included',
    },
  ],
  clientPayments: [],
  laborPayments: [
    {
      id: 'lp1',
      name: '김씨',
      role: 'DP',
      amount: 1_000_000,
      workDate: '',
      paidDate: '2026-09-01',
      isPaid: true,
      note: '',
      expenseId: 'e_labor',
    },
  ],
  createdAt: '',
}

const normalized = normalizeImportedStore({
  version: 3,
  activeProjectId: null,
  projects: [project],
})
const p = normalized.projects[0]
const meals = p.expenses.find((e) => e.id === 'e_meals_wrong_cat')!
const labor = p.expenses.find((e) => e.id === 'e_labor')!
assert.equal(labor.vatMode, 'exempt')
assert.equal(meals.vatMode, 'included')
assert.ok((meals.vatAmount ?? 0) > 0)

const summary = getPortfolioTaxSummary([p])
assert.ok(!summary.purchaseUnreceived.some((r) => r.expenseId === 'e_labor'))
assert.ok(summary.purchaseUnreceived.some((r) => r.expenseId === 'e_meals_wrong_cat'))
assert.ok(summary.purchaseUnreceived.some((r) => r.expenseId === 'e_gear'))
assert.equal(summary.totalVat, resolveExpenseTax(meals).vat + resolveExpenseTax(p.expenses.find((e) => e.id === 'e_gear')!).vat)

console.log('check-labor-withholding: ok')
