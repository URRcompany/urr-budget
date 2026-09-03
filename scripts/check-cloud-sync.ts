/**
 * Pure-function checks for cloud sync payload helpers.
 * Run: npx --yes tsx scripts/check-cloud-sync.ts
 */
import assert from 'node:assert/strict'
import {
  stripReceiptsFromStore,
  mergePreservingLocalReceipts,
  mergeStoresByProjectId,
  projectIdsEqual,
  shouldPreferLocalStore,
} from '../src/lib/cloudSync'
import type { AppStore, Project } from '../src/types'

function emptyProject(partial: Partial<Project> & Pick<Project, 'id' | 'name'>): Project {
  return {
    id: partial.id,
    name: partial.name,
    client: partial.client ?? '',
    shootDate: partial.shootDate ?? '',
    revenue: partial.revenue ?? 0,
    totalBudget: partial.totalBudget ?? 0,
    budgetPreset: partial.budgetPreset ?? '',
    contractVatMode: partial.contractVatMode ?? 'separate',
    contractSupplyAmount: partial.contractSupplyAmount ?? 0,
    contractVatAmount: partial.contractVatAmount ?? 0,
    categories: partial.categories ?? [{ id: 'labor', name: '인건비', color: '#000', planned: 0 }],
    expenses: partial.expenses ?? [],
    clientPayments: partial.clientPayments ?? [],
    laborPayments: partial.laborPayments ?? [],
  }
}

function makeStore(receiptDataUrl = ''): AppStore {
  return {
    version: 3,
    activeProjectId: 'p1',
    projects: [
      emptyProject({
        id: 'p1',
        name: 'Test',
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
      }),
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

// —— 데이터 유실 방지: 프로젝트 ID 병합 ——
const localOnly: AppStore = {
  version: 3,
  activeProjectId: 'p_new',
  projects: [
    emptyProject({ id: 'p_old', name: '기존' }),
    emptyProject({ id: 'p_new', name: '어제 추가' }),
  ],
}
const cloudOld: AppStore = {
  version: 3,
  activeProjectId: 'p_old',
  projects: [emptyProject({ id: 'p_old', name: '기존' })],
}

const cloudPreferred = mergeStoresByProjectId(cloudOld, localOnly)
assert.equal(cloudPreferred.projects.length, 2)
assert.ok(cloudPreferred.projects.some((p) => p.id === 'p_new'))
assert.equal(cloudPreferred.projects.find((p) => p.id === 'p_new')?.name, '어제 추가')

const localPreferred = mergeStoresByProjectId(localOnly, cloudOld)
assert.equal(localPreferred.projects.length, 2)
assert.ok(projectIdsEqual(localPreferred, localOnly))

// 이전 버그 재현: dirty 없이 localMeta가 클라우드보다 오래되면 cloud가 이김
assert.equal(
  shouldPreferLocalStore({
    localHasData: true,
    dirtyAt: 0,
    localMetaUpdatedAt: 1000,
    remoteUpdatedAt: 2000,
  }),
  false,
)

// 수정 후: 미동기화 dirty가 있으면 로컬 우선
assert.equal(
  shouldPreferLocalStore({
    localHasData: true,
    dirtyAt: 3000,
    localMetaUpdatedAt: 1000,
    remoteUpdatedAt: 2000,
  }),
  true,
)

// cloud가 이겨도 병합하면 로컬 전용 프로젝트는 유지
assert.equal(
  mergeStoresByProjectId(cloudOld, localOnly).projects.map((p) => p.id).sort().join(','),
  'p_new,p_old',
)

console.log('check-cloud-sync: ok')
