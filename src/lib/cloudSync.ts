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

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'synced' | 'error'

const SYNC_META_KEY = 'reelbudget.sync.v1'

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

export async function fetchCloudStore(uid: string): Promise<CloudStorePayload | null> {
  const snap = await getDoc(storeDocRef(uid))
  if (!snap.exists()) return null
  const data = snap.data() as CloudStorePayload
  if (data.version !== 3 || !Array.isArray(data.projects)) return null
  return data
}

export async function pushCloudStore(uid: string, store: AppStore): Promise<number> {
  const updatedAt = Date.now()
  const payload: CloudStorePayload = {
    version: 3,
    projects: store.projects,
    activeProjectId: store.activeProjectId,
    updatedAt,
    updatedAtServer: serverTimestamp() as unknown as Timestamp,
  }
  await setDoc(storeDocRef(uid), payload, { merge: false })
  setLocalSyncMeta(updatedAt)
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

/** 최초 동기화: 클라우드·로컬 중 최신 데이터 선택 */
export async function resolveInitialStore(
  uid: string,
  localStore: AppStore,
): Promise<{ store: AppStore; source: 'cloud' | 'local' | 'empty' }> {
  const remote = await fetchCloudStore(uid)
  const localMeta = getLocalSyncMeta()
  const localHasData = localStore.projects.length > 0

  if (!remote) {
    if (localHasData) {
      await pushCloudStore(uid, localStore)
      return { store: localStore, source: 'local' }
    }
    return { store: localStore, source: 'empty' }
  }

  if (!localHasData || remote.updatedAt >= localMeta.updatedAt) {
    setLocalSyncMeta(remote.updatedAt)
    return { store: toAppStore(remote), source: 'cloud' }
  }

  await pushCloudStore(uid, localStore)
  return { store: localStore, source: 'local' }
}
