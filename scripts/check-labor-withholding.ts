/**
 * Labor withholding (3.3%) checks.
 * Run: npx --yes tsx scripts/check-labor-withholding.ts
 */
import assert from 'node:assert/strict'
import { calcWithholding, withholdingRateLabel } from '../src/lib/withholding'
import { resolveExpenseTax } from '../src/lib/vat'
import { getPortfolioTaxSummary } from '../src/lib/taxLedger'
import type { Project } from '../src/types'

const wh = calcWithholding(1_000_000)
assert.equal(wh.gross, 1_000_000)
assert.equal(wh.tax, 33_000)
assert.equal(wh.net, 967_000)
assert.equal(withholdingRateLabel(), '3.3%')

// Labor expense must be VAT-exempt (not 공급/부가세)
const laborExpenseTax = resolveExpenseTax({
  amount: 1_000_000,
  vatMode: 'exempt',
  supplyAmount: 1_000_000,
  vatAmount: 0,
})
assert.equal(laborExpenseTax.vat, 0)
assert.equal(laborExpenseTax.mode, 'exempt')

// Tax dashboard must ignore labor category for VAT purchase tracking
const project: Project = {
  id: 'p1',
  name: 'Test',
  client: '',
  shootDate: '',
  revenue: 0,
  totalBudget: 0,
  categories: [{ id: 'labor', name: '인건비', color: '#000', planned: 0 }],
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
    {
      id: 'e_gear',
      title: '장비',
      amount: 110_000,
      categoryId: 'gear',
      date: '2026-09-01',
      note: '',
      vendor: '렌탈',
      invoiceReceived: false,
      vatMode: 'included',
    },
  ],
  clientPayments: [],
  laborPayments: [],
  createdAt: '',
}

const summary = getPortfolioTaxSummary([project])
assert.equal(summary.purchaseUnreceivedCount, 1)
assert.equal(summary.purchaseUnreceived[0].expenseId, 'e_gear')
assert.ok(!summary.purchaseUnreceived.some((r) => r.expenseId === 'e_labor'))
assert.equal(summary.totalVat, resolveExpenseTax(project.expenses[1]).vat)

console.log('check-labor-withholding: ok')
