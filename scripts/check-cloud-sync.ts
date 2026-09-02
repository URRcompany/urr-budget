/**
 * Pure-function checks for cloud sync payload helpers.
 * Run: npx --yes tsx scripts/check-cloud-sync.ts
 */
import assert from 'node:assert/strict'
import {
  stripReceiptsFromStore,
  mergePreservingLocalReceipts,
} from '../src/lib/cloudSync'
import type { AppStore } from '../src/types'

function makeStore(receiptDataUrl = ''): AppStore {
  return {
    version: 3,
    activeProjectId: 'p1',
    projects: [
      {
        id: 'p1',
        name: 'Test',
        client: '',
        shootDate: '',
        revenue: 0,
        totalBudget: 0,
        budgetPreset: '',
        contractVatMode: 'separate',
        contractSupplyAmount: 0,
        contractVatAmount: 0,
        categories: [{ id: 'labor', name: '인건비', color: '#000', planned: 0 }],
        expenses: [
          {
            id: 'e1',
            title: '식비',
            amount: 1000,
            categoryId: 'labor',
            date: '2026-01-01',
            note: '',
            vendor: '',
            invoiceReceived: false,
            vatMode: 'included',
            receiptDataUrl,
            receiptFileName: receiptDataUrl ? 'r.jpg' : '',
          },
        ],
        clientPayments: [],
        laborPayments: [],
      },
    ],
  }
}

const receiptUrl = 'data:image/jpeg;base64,' + 'A'.repeat(50_000)
const withReceipt = makeStore(receiptUrl)
assert.equal(withReceipt.projects[0].expenses[0].receiptDataUrl, receiptUrl)

const stripped = stripReceiptsFromStore(withReceipt)
assert.equal(stripped.projects[0].expenses[0].receiptDataUrl, '')
assert.equal(withReceipt.projects[0].expenses[0].receiptDataUrl, receiptUrl)

const remote = stripReceiptsFromStore(withReceipt)
const merged = mergePreservingLocalReceipts(remote, withReceipt)
assert.equal(merged.projects[0].expenses[0].receiptDataUrl, receiptUrl)

const huge = makeStore('data:image/jpeg;base64,' + 'B'.repeat(950_000))
const hugeStripped = stripReceiptsFromStore(huge)
assert.ok(JSON.stringify(huge).length > 900_000)
assert.ok(JSON.stringify(hugeStripped).length < 50_000)

console.log('check-cloud-sync: ok')
