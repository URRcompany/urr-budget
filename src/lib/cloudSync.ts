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

/** 최초 동기화: 클라우드·로컬 중 최신 데이터 선택 */
export async function resolveInitialStore(
  uid: string,
  localStore: AppStore,
): Promise<{
  store: AppStore
  source: 'cloud' | 'local' | 'empty'
  pushedAt?: number
}> {
  const remote = await fetchCloudStore(uid)
  const localMeta = getLocalSyncMeta()
  const localHasData = localStore.projects.length > 0

  if (!remote) {
    if (localHasData) {
      const pushedAt = await pushCloudStore(uid, localStore)
      return { store: localStore, source: 'local', pushedAt }
    }
    return { store: localStore, source: 'empty' }
  }

  if (!localHasData || remote.updatedAt >= localMeta.updatedAt) {
    setLocalSyncMeta(remote.updatedAt)
    return {
      store: mergePreservingLocalReceipts(toAppStore(remote), localStore),
      source: 'cloud',
    }
  }

  const pushedAt = await pushCloudStore(uid, localStore)
  return { store: localStore, source: 'local', pushedAt }
}
