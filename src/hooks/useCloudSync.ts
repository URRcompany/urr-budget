import { useEffect, useRef, useState } from 'react'
import type { AppStore } from '../types'
import { useAuth } from '../context/AuthContext'
import {
  isCloudSyncConfigured,
  linkGoogleCredential,
  watchFirebaseUser,
} from '../lib/firebase'
import type { User } from 'firebase/auth'
import {
  pushCloudStore,
  resolveInitialStore,
  subscribeCloudStore,
  setLocalSyncMeta,
  toAppStore,
  mergePreservingLocalReceipts,
  type SyncStatus,
} from '../lib/cloudSync'

interface UseCloudSyncOptions {
  store: AppStore
  setStore: (store: AppStore) => void
  normalizeStore: (store: AppStore) => AppStore
}

/** Firebase 세션 복원 대기. 이보다 길면 GIS만 남은 상태로 보고 재로그인 유도 */
const FIREBASE_REAUTH_GRACE_MS = 5000

function syncErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  return '클라우드 동기화에 실패했습니다.'
}

export function useCloudSync({ store, setStore, normalizeStore }: UseCloudSyncOptions) {
  const { user, syncCredential, clearSyncCredential, signOut } = useAuth()
  const [status, setStatus] = useState<SyncStatus>(
    isCloudSyncConfigured() ? 'idle' : 'off',
  )
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const applyingRemoteRef = useRef(false)
  const initialSyncDoneRef = useRef(false)
  const uidRef = useRef<string | null>(null)
  // 초기/원격 적용으로 store가 바뀐 경우엔 다시 업로드하지 않기 위한 카운터
  const skipUploadsRef = useRef(0)
  // 우리가 방금 올린 쓰기의 updatedAt. onSnapshot 에코를 걸러 무한 루프 방지.
  const lastPushedUpdatedAtRef = useRef(0)
  const storeRef = useRef(store)
  const syncCredentialRef = useRef(syncCredential)
  const reauthTimerRef = useRef<number | null>(null)

  storeRef.current = store
  syncCredentialRef.current = syncCredential

  const clearReauthTimer = () => {
    if (reauthTimerRef.current != null) {
      window.clearTimeout(reauthTimerRef.current)
      reauthTimerRef.current = null
    }
  }

  // GIS 로그인 직후 Firebase Auth 연결
  useEffect(() => {
    if (!isCloudSyncConfigured() || !syncCredential) return
    let cancelled = false
    ;(async () => {
      try {
        setStatus('syncing')
        setErrorMessage(null)
        await linkGoogleCredential(syncCredential)
        if (!cancelled) clearSyncCredential()
      } catch (err) {
        if (!cancelled) {
          setStatus('error')
          setErrorMessage(syncErrorMessage(err))
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [syncCredential, clearSyncCredential])

  // Firebase 사용자 + 초기 동기화 + 실시간 구독
  useEffect(() => {
    if (!isCloudSyncConfigured() || !user) {
      setStatus(isCloudSyncConfigured() ? 'idle' : 'off')
      initialSyncDoneRef.current = false
      uidRef.current = null
      clearReauthTimer()
      return
    }

    let unsubRemote: (() => void) | null = null
    let cancelled = false

    // Firebase 로그인이 아직 진행 중일 수 있으므로 동기화 준비 상태로 표시한다.
    setStatus('syncing')
    setErrorMessage(null)

    const startForUser = async (fbUser: User) => {
      uidRef.current = fbUser.uid

      if (!initialSyncDoneRef.current) {
        setStatus('syncing')
        const { store: resolved, source, pushedAt } = await resolveInitialStore(
          fbUser.uid,
          storeRef.current,
        )
        if (cancelled) return
        if (pushedAt) lastPushedUpdatedAtRef.current = pushedAt
        applyingRemoteRef.current = true
        skipUploadsRef.current += 1
        setStore(normalizeStore(resolved))
        applyingRemoteRef.current = false
        initialSyncDoneRef.current = true
        setLastSyncedAt(Date.now())
        setStatus(source === 'empty' ? 'idle' : 'synced')
      }

      if (!unsubRemote && !cancelled) {
        unsubRemote = subscribeCloudStore(
          fbUser.uid,
          (remote) => {
            if (applyingRemoteRef.current) return
            // 우리가 방금 올린 쓰기가 되돌아온 에코는 무시한다(무한 루프 방지).
            if (remote.updatedAt === lastPushedUpdatedAtRef.current) return
            applyingRemoteRef.current = true
            skipUploadsRef.current += 1
            const merged = mergePreservingLocalReceipts(
              toAppStore(remote),
              storeRef.current,
            )
            setStore(normalizeStore(merged))
            setLocalSyncMeta(remote.updatedAt)
            applyingRemoteRef.current = false
            setLastSyncedAt(Date.now())
            setStatus('synced')
            setErrorMessage(null)
          },
          (err) => {
            setStatus('error')
            setErrorMessage(syncErrorMessage(err))
          },
        )
      }
    }

    const scheduleReauthIfNeeded = () => {
      if (reauthTimerRef.current != null) return
      reauthTimerRef.current = window.setTimeout(() => {
        reauthTimerRef.current = null
        if (cancelled || uidRef.current) return
        // 링킹 진행 중이면 조금 더 기다린다.
        if (syncCredentialRef.current) {
          scheduleReauthIfNeeded()
          return
        }
        // GIS 세션만 있고 Firebase Auth가 없음 → 새 Google 토큰이 필요.
        setStatus('needs_reauth')
        setErrorMessage('클라우드 동기화를 위해 다시 로그인해 주세요.')
        signOut()
      }, FIREBASE_REAUTH_GRACE_MS)
    }

    // 이벤트 기반 처리: Firebase 인증 상태가 준비되는 즉시(신규 로그인 후
    // linkGoogleCredential 완료 시점이든, 저장된 세션 복원 시점이든) 동기화를
    // 시작한다. 기존의 일회성 waitForFirebaseUser는 로그인 네트워크 왕복이 느린
    // 모바일에서 첫 콜백(null)에 먼저 resolve 되어 동기화가 아예 실행되지 않는
    // 레이스가 있었다.
    const unsubAuth = watchFirebaseUser((fbUser) => {
      if (cancelled) return
      if (fbUser) {
        clearReauthTimer()
        void startForUser(fbUser).catch((err) => {
          if (!cancelled) {
            setStatus('error')
            setErrorMessage(syncErrorMessage(err))
          }
        })
      } else {
        initialSyncDoneRef.current = false
        uidRef.current = null
        unsubRemote?.()
        unsubRemote = null
        if (syncCredentialRef.current) {
          setStatus('syncing')
        } else {
          setStatus('idle')
          scheduleReauthIfNeeded()
        }
      }
    })

    return () => {
      cancelled = true
      clearReauthTimer()
      unsubAuth()
      unsubRemote?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- store excluded: initial sync only
  }, [user?.email, setStore, normalizeStore, signOut])

  // 로컬 변경 → 클라우드 업로드 (debounce)
  useEffect(() => {
    const uid = uidRef.current
    if (!uid || !initialSyncDoneRef.current) return
    if (!isCloudSyncConfigured()) return

    // 초기 동기화/원격 수신으로 인해 store가 바뀐 경우는 업로드하지 않는다.
    // (이걸 올리면 onSnapshot 에코 → 재업로드가 반복되는 무한 루프가 생긴다.)
    if (skipUploadsRef.current > 0) {
      skipUploadsRef.current -= 1
      return
    }

    setStatus('syncing')
    const timer = window.setTimeout(() => {
      void pushCloudStore(uid, store)
        .then((ts) => {
          lastPushedUpdatedAtRef.current = ts
          setLastSyncedAt(ts)
          setStatus('synced')
          setErrorMessage(null)
        })
        .catch((err) => {
          setStatus('error')
          setErrorMessage(syncErrorMessage(err))
        })
    }, 1500)

    return () => window.clearTimeout(timer)
  }, [store])

  return {
    status,
    lastSyncedAt,
    errorMessage,
    enabled: isCloudSyncConfigured(),
  }
}
