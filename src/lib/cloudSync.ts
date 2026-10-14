import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from 'firebase/firestore'
import type { AppStore } from '../types'
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

/**
 * 개편(v4) 데이터는 별도 문서에 저장한다. 이전 버전 앱이 같은 문서에
 * v3 데이터를 덮어써 새 데이터를 지우는 일을 막기 위함.
 */
const STORE_DOC_ID = 'storeV4'
const SYNC_META_KEY = 'reelbudget.sync.v4'
const SYNC_DIRTY_KEY = 'reelbudget.sync.dirty.v4'

export interface SyncMeta {
  updatedAt: number
}

export interface CloudStorePayload {
  version: 4
  projects: AppStore['projects']
  activeProjectId: string | null
  updatedAt: number
  updatedAtServer?: Timestamp | null
}

function storeDocRef(uid: string) {
  return doc(getFirestoreDb(), 'users', uid, 'data', STORE_DOC_ID)
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

function isValidPayload(data: Partial<CloudStorePayload> | undefined): data is CloudStorePayload {
  return data?.version === 4 && Array.isArray(data.projects)
}

function buildPayload(store: AppStore, updatedAt: number): CloudStorePayload {
  return {
    version: 4,
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
  return isValidPayload(data) ? data : null
}

export async function pushCloudStore(uid: string, store: AppStore): Promise<number> {
  const updatedAt = Date.now()
  const payload = buildPayload(store, updatedAt)

  if (JSON.stringify(payload).length > MAX_CLOUD_DOC_BYTES) {
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
      if (!isValidPayload(data)) return
      onRemote(data)
    },
    (err) => onError(err),
  )
}

export function toAppStore(payload: CloudStorePayload): AppStore {
  return {
    version: 4,
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
    version: 4,
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
    const merged = mergeStoresByProjectId(localStore, remoteStore)
    const pushedAt = await pushCloudStore(uid, merged)
    return {
      store: merged,
      source: projectIdsEqual(merged, localStore) ? 'local' : 'merged',
      pushedAt,
    }
  }

  const merged = mergeStoresByProjectId(remoteStore, localStore)
  setLocalSyncMeta(remote.updatedAt)

  if (!projectIdsEqual(merged, remoteStore)) {
    const pushedAt = await pushCloudStore(uid, merged)
    return { store: merged, source: 'merged', pushedAt }
  }

  clearLocalDirty()
  return { store: merged, source: 'cloud' }
}
