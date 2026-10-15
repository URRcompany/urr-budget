/**
 * Pure-function checks for cloud sync merge helpers.
 * Run: npx --yes tsx scripts/check-cloud-sync.ts
 */
import assert from 'node:assert/strict'
import {
  mergeStoresByProjectId,
  projectIdsEqual,
  shouldPreferLocalStore,
} from '../src/lib/cloudSync'
import type { AppStore, Project } from '../src/types'

function project(id: string, name: string): Project {
  return { id, name, client: '', date: '', entries: [], createdAt: '2026-01-01T00:00:00.000Z' }
}

// —— 데이터 유실 방지: 프로젝트 ID 병합 ——
const localOnly: AppStore = {
  version: 4,
  activeProjectId: 'p_new',
  projects: [project('p_old', '기존'), project('p_new', '어제 추가')],
}
const cloudOld: AppStore = {
  version: 4,
  activeProjectId: 'p_old',
  projects: [project('p_old', '기존')],
}

const cloudPreferred = mergeStoresByProjectId(cloudOld, localOnly)
assert.equal(cloudPreferred.version, 4)
assert.equal(cloudPreferred.projects.length, 2)
assert.equal(cloudPreferred.projects.find((p) => p.id === 'p_new')?.name, '어제 추가')

const localPreferred = mergeStoresByProjectId(localOnly, cloudOld)
assert.equal(localPreferred.projects.length, 2)
assert.ok(projectIdsEqual(localPreferred, localOnly))

// dirty 없이 localMeta가 클라우드보다 오래되면 cloud가 이김
assert.equal(
  shouldPreferLocalStore({
    localHasData: true,
    dirtyAt: 0,
    localMetaUpdatedAt: 1000,
    remoteUpdatedAt: 2000,
  }),
  false,
)

// 미동기화 dirty가 있으면 로컬 우선
assert.equal(
  shouldPreferLocalStore({
    localHasData: true,
    dirtyAt: 3000,
    localMetaUpdatedAt: 1000,
    remoteUpdatedAt: 2000,
  }),
  true,
)

console.log('check-cloud-sync: ok')
