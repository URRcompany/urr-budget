import { useEffect, useRef, useState } from 'react'
import type { AppStore } from '../types'
import { useAuth } from '../context/AuthContext'
import {
  isCloudSyncConfigured,
  linkGoogleCredential,
  waitForFirebaseUser,
  watchFirebaseUser,
} from '../lib/firebase'
import {
  pushCloudStore,
  resolveInitialStore,
  subscribeCloudStore,
  setLocalSyncMeta,
  toAppStore,
  type SyncStatus,
} from '../lib/cloudSync'

interface UseCloudSyncOptions {
  store: AppStore
  setStore: (store: AppStore) => void
  normalizeStore: (store: AppStore) => AppStore
}

export function useCloudSync({ store, setStore, normalizeStore }: UseCloudSyncOptions) {
  const { user, syncCredential, clearSyncCredential } = useAuth()
  const [status, setStatus] = useState<SyncStatus>(
    isCloudSyncConfigured() ? 'idle' : 'off',
  )
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const applyingRemoteRef = useRef(false)
  const initialSyncDoneRef = useRef(false)
  const uidRef = useRef<string | null>(null)

  // GIS 로그인 직후 Firebase Auth 연결
  useEffect(() => {
    if (!isCloudSyncConfigured() || !syncCredential) return
    let cancelled = false
    ;(async () => {
      try {
        setStatus('syncing')
        await linkGoogleCredential(syncCredential)
        if (!cancelled) clearSyncCredential()
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [syncCredential, clearSyncCredential])

  // Firebase 사용자 + 초기 동기화 + 실시간 구독
  useEffect(() => {
    if (!isCloudSyncConfigured() || !user) {
      setStatus('off')
      initialSyncDoneRef.current = false
      uidRef.current = null
      return
    }

    let unsubRemote: (() => void) | null = null
    let cancelled = false

    const setup = async () => {
      setStatus('syncing')
      try {
        const fbUser = await waitForFirebaseUser()
        if (cancelled || !fbUser) {
          setStatus('idle')
          return
        }

        uidRef.current = fbUser.uid

        if (!initialSyncDoneRef.current) {
          const { store: resolved, source } = await resolveInitialStore(
            fbUser.uid,
            store,
          )
          if (cancelled) return
          applyingRemoteRef.current = true
          setStore(normalizeStore(resolved))
          applyingRemoteRef.current = false
          initialSyncDoneRef.current = true
          setLastSyncedAt(Date.now())
          setStatus(source === 'empty' ? 'idle' : 'synced')
        }

        unsubRemote = subscribeCloudStore(
          fbUser.uid,
          (remote) => {
            if (applyingRemoteRef.current) return
            applyingRemoteRef.current = true
            setStore(normalizeStore(toAppStore(remote)))
            setLocalSyncMeta(remote.updatedAt)
            applyingRemoteRef.current = false
            setLastSyncedAt(Date.now())
            setStatus('synced')
          },
          () => setStatus('error'),
        )
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    void setup()

    const unsubAuth = watchFirebaseUser((fbUser) => {
      if (!fbUser) {
        initialSyncDoneRef.current = false
        uidRef.current = null
        unsubRemote?.()
        unsubRemote = null
        setStatus('idle')
      }
    })

    return () => {
      cancelled = true
      unsubAuth()
      unsubRemote?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- store excluded: initial sync only
  }, [user?.email, setStore, normalizeStore])

  // 로컬 변경 → 클라우드 업로드 (debounce)
  useEffect(() => {
    const uid = uidRef.current
    if (!uid || !initialSyncDoneRef.current || applyingRemoteRef.current) return
    if (!isCloudSyncConfigured()) return

    setStatus('syncing')
    const timer = window.setTimeout(() => {
      void pushCloudStore(uid, store)
        .then((ts) => {
          setLastSyncedAt(ts)
          setStatus('synced')
        })
        .catch(() => setStatus('error'))
    }, 1500)

    return () => window.clearTimeout(timer)
  }, [store])

  return { status, lastSyncedAt, enabled: isCloudSyncConfigured() }
}
