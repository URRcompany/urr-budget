import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from 'firebase/firestore'
import type { AppStore, Expense, Project } from '../types'
import { getFirestoreDb } from './firebase'

export type SyncStatus =
  | 'off'
  | 'idle'
  | 'syncing'
  | 'synced'
  | 'error'
  | 'needs_reauth'

/** Firestore 문서 한도(1MiB)보다 여유를 둔 안전 상한 */
const MAX_CLOUD_DOC_BYTES = 900_000

const SYNC_META_KEY = 'reelbudget.sync.v1'
const SYNC_DIRTY_KEY = 'reelbudget.sync.dirty.v1'

export interface SyncMeta {
  updatedAt: number
}

export interface CloudStorePayload {
  version: 3
  projects: AppStore['projects']
  activeProjectId: string | null
  updatedAt: number
  updatedAtServer?: Timestamp | null
}

function storeDocRef(uid: string) {
  return doc(getFirestoreDb(), 'users', uid, 'data', 'store')
}

export function getLocalSyncMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY)
    if (!raw) return { updatedAt: 0 }
    return JSON.parse(raw) as SyncMeta
  } catch {
    return { updatedAt: 0 }
  }
}

export function setLocalSyncMeta(updatedAt: number): void {
  localStorage.setItem(SYNC_META_KEY, JSON.stringify({ updatedAt }))
}

/** 클라우드에 아직 반영되지 않은 로컬 변경 시각 */
export function getLocalDirtyAt(): number {
  try {
    const raw = localStorage.getItem(SYNC_DIRTY_KEY)
    if (!raw) return 0
    const parsed = JSON.parse(raw) as { dirtyAt?: number }
    return typeof parsed.dirtyAt === 'number' ? parsed.dirtyAt : 0
  } catch {
    return 0
  }
}

export function markLocalDirty(dirtyAt = Date.now()): void {
  const current = getLocalDirtyAt()
  if (dirtyAt < current) return
  localStorage.setItem(SYNC_DIRTY_KEY, JSON.stringify({ dirtyAt }))
}

export function clearLocalDirty(): void {
  localStorage.removeItem(SYNC_DIRTY_KEY)
}

function estimatePayloadBytes(payload: CloudStorePayload): number {
  // JS 문자열 길이 ≈ UTF-16 코드 유닛. JSON ASCII/UTF-8 근사로 충분.
  return JSON.stringify(payload).length
}

function stripExpenseReceipts(expense: Expense): Expense {
  if (!expense.receiptDataUrl) return expense
  return { ...expense, receiptDataUrl: '', receiptFileName: expense.receiptFileName ?? '' }
}

/** 영수증 base64가 Firestore 1MiB 한도를 넘기지 않도록 클라우드 페이로드에서 제거 */
export function stripReceiptsFromStore(store: AppStore): AppStore {
  return {
    ...store,
    projects: store.projects.map(
      (p): Project => ({
        ...p,
        expenses: p.expenses.map(stripExpenseReceipts),
      }),
    ),
  }
}

function buildPayload(store: AppStore, updatedAt: number): CloudStorePayload {
  return {
    version: 3,
    projects: store.projects,
    activeProjectId: store.activeProjectId,
    updatedAt,
    updatedAtServer: serverTimestamp() as unknown as Timestamp,
  }
}

export async function fetchCloudStore(uid: string): Promise<CloudStorePayload | null> {
  const snap = await getDoc(storeDocRef(uid))
  if (!snap.exists()) return null
  const data = snap.data() as CloudStorePayload
  if (data.version !== 3 || !Array.isArray(data.projects)) return null
  return data
}

export async function pushCloudStore(uid: string, store: AppStore): Promise<number> {
  const updatedAt = Date.now()
  let payload = buildPayload(store, updatedAt)

  if (estimatePayloadBytes(payload) > MAX_CLOUD_DOC_BYTES) {
    // 로컬에는 영수증을 유지하고, 클라우드에는 메타만 올린다.
    payload = buildPayload(stripReceiptsFromStore(store), updatedAt)
  }

  if (estimatePayloadBytes(payload) > MAX_CLOUD_DOC_BYTES) {
    throw new Error(
      '동기화 데이터가 너무 큽니다. 프로젝트 수를 줄이거나 백업 후 정리해 주세요.',
    )
  }

  await setDoc(storeDocRef(uid), payload, { merge: false })
  setLocalSyncMeta(updatedAt)
  clearLocalDirty()
  return updatedAt
}

export function subscribeCloudStore(
  uid: string,
  onRemote: (payload: CloudStorePayload) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    storeDocRef(uid),
    (snap) => {
      if (!snap.exists()) return
      const data = snap.data() as CloudStorePayload
      if (data.version !== 3 || !Array.isArray(data.projects)) return
      onRemote(data)
    },
    (err) => onError(err),
  )
}

export function toAppStore(payload: CloudStorePayload): AppStore {
  return {
    version: 3,
    projects: payload.projects,
    activeProjectId: payload.activeProjectId,
  }
}

/**
 * preferred 쪽 프로젝트를 우선으로 두고, other에만 있는 프로젝트는 뒤에 붙인다.
 * (동기화 재연결 시 한쪽만 있던 프로젝트가 사라지지 않게)
 */
export function mergeStoresByProjectId(
  preferred: AppStore,
  other: AppStore,
): AppStore {
  const preferredIds = new Set(preferred.projects.map((p) => p.id))
  const extras = other.projects.filter((p) => !preferredIds.has(p.id))
  const projects = extras.length
    ? [...preferred.projects, ...extras]
    : preferred.projects

  const activeProjectId =
    preferred.activeProjectId &&
    projects.some((p) => p.id === preferred.activeProjectId)
      ? preferred.activeProjectId
      : other.activeProjectId &&
          projects.some((p) => p.id === other.activeProjectId)
        ? other.activeProjectId
        : null

  return {
    version: 3,
    projects,
    activeProjectId,
  }
}

export function projectIdsEqual(a: AppStore, b: AppStore): boolean {
  if (a.projects.length !== b.projects.length) return false
  const ids = new Set(a.projects.map((p) => p.id))
  return b.projects.every((p) => ids.has(p.id))
}

/**
 * 클라우드에서 받은 store를 로컬에 적용할 때, 로컬에만 있는 영수증(base64)을
 * 같은 expense id에 대해 보존한다. (클라우드 페이로드가 영수증을 비운 경우 대비)
 */
export function mergePreservingLocalReceipts(
  remote: AppStore,
  local: AppStore,
): AppStore {
  const localReceipts = new Map<string, { receiptDataUrl: string; receiptFileName: string }>()
  for (const p of local.projects) {
    for (const e of p.expenses) {
      if (e.receiptDataUrl) {
        localReceipts.set(e.id, {
          receiptDataUrl: e.receiptDataUrl,
          receiptFileName: e.receiptFileName ?? '',
        })
      }
    }
  }
  if (localReceipts.size === 0) return remote

  return {
    ...remote,
    projects: remote.projects.map((p) => ({
      ...p,
      expenses: p.expenses.map((e) => {
        if (e.receiptDataUrl) return e
        const kept = localReceipts.get(e.id)
        if (!kept) return e
        return { ...e, ...kept }
      }),
    })),
  }
}

/**
 * 최초 동기화 시 로컬을 기준 데이터로 삼을지 여부.
 * dirtyAt: 아직 클라우드에 반영되지 않은 로컬 변경 시각
 */
export function shouldPreferLocalStore(options: {
  localHasData: boolean
  dirtyAt: number
  localMetaUpdatedAt: number
  remoteUpdatedAt: number
}): boolean {
  const { localHasData, dirtyAt, localMetaUpdatedAt, remoteUpdatedAt } = options
  return (
    localHasData &&
    (dirtyAt > remoteUpdatedAt || localMetaUpdatedAt > remoteUpdatedAt)
  )
}

/**
 * 최초 동기화: 클라우드·로컬을 비교하되, 어느 쪽이 이겨도
 * 반대쪽에만 있는 프로젝트는 버리지 않고 병합한다.
 */
export async function resolveInitialStore(
  uid: string,
  localStore: AppStore,
): Promise<{
  store: AppStore
  source: 'cloud' | 'local' | 'empty' | 'merged'
  pushedAt?: number
}> {
  const remote = await fetchCloudStore(uid)
  const localMeta = getLocalSyncMeta()
  const dirtyAt = getLocalDirtyAt()
  const localHasData = localStore.projects.length > 0

  if (!remote) {
    if (localHasData) {
      const pushedAt = await pushCloudStore(uid, localStore)
      return { store: localStore, source: 'local', pushedAt }
    }
    return { store: localStore, source: 'empty' }
  }

  const remoteStore = toAppStore(remote)
  // 로컬에 미동기화 변경이 있으면 로컬을 우선 기준으로 삼는다.
  // (이전에는 localMeta만 비교해서, 동기화 끊긴 동안 추가한 프로젝트가
  //  오래된 클라우드 데이터로 통째로 덮어써지는 문제가 있었다.)
  const preferLocal = shouldPreferLocalStore({
    localHasData,
    dirtyAt,
    localMetaUpdatedAt: localMeta.updatedAt,
    remoteUpdatedAt: remote.updatedAt,
  })

  if (!localHasData) {
    setLocalSyncMeta(remote.updatedAt)
    clearLocalDirty()
    return { store: remoteStore, source: 'cloud' }
  }

  if (preferLocal) {
    const merged = mergePreservingLocalReceipts(
      mergeStoresByProjectId(localStore, remoteStore),
      localStore,
    )
    const pushedAt = await pushCloudStore(uid, merged)
    return {
      store: merged,
      source: projectIdsEqual(merged, localStore) ? 'local' : 'merged',
      pushedAt,
    }
  }

  const merged = mergePreservingLocalReceipts(
    mergeStoresByProjectId(remoteStore, localStore),
    localStore,
  )
  setLocalSyncMeta(remote.updatedAt)

  // 클라우드가 기준이어도 로컬에만 있던 프로젝트는 살려 두고, 클라우드에 다시 올린다.
  if (!projectIdsEqual(merged, remoteStore)) {
    const pushedAt = await pushCloudStore(uid, merged)
    return { store: merged, source: 'merged', pushedAt }
  }

  clearLocalDirty()
  return { store: merged, source: 'cloud' }
}
