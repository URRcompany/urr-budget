import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  clearAuthSession,
  getAllowedEmails,
  getGoogleClientId,
  loadAuthSession,
  saveAuthSession,
  verifyGoogleCredential,
  type AuthSession,
  type AuthUser,
} from '../lib/auth'
import {
  isCloudSyncConfigured,
  linkGoogleCredential,
  signOutFirebase,
} from '../lib/firebase'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  clientId: string
  allowedConfigured: boolean
  error: string | null
  syncCredential: string | null
  signInWithCredential: (credential: string) => void
  signOut: () => void
  clearError: () => void
  clearSyncCredential: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncCredential, setSyncCredential] = useState<string | null>(null)

  const clientId = getGoogleClientId()
  const allowedConfigured = getAllowedEmails().length > 0

  useEffect(() => {
    const session = loadAuthSession()
    setUser(session)
    setLoading(false)
  }, [])

  const clearSyncCredential = useCallback(() => setSyncCredential(null), [])

  const signInWithCredential = useCallback((credential: string) => {
    void (async () => {
      try {
        const verified = verifyGoogleCredential(credential)
        const session: AuthSession = saveAuthSession(verified)
        setUser(session)
        setError(null)

        let firebaseLinked = !isCloudSyncConfigured()
        if (isCloudSyncConfigured()) {
          setSyncCredential(credential)
          try {
            await linkGoogleCredential(credential)
            setSyncCredential(null)
            firebaseLinked = true
          } catch {
            /* useCloudSync에서 syncCredential로 재시도 — 실패 시 Electron reload 금지 */
            firebaseLinked = false
          }
        }

        // Electron: OAuth 팝업 닫힌 뒤 메인 창이 하얗게 되는 경우 방지.
        // Firebase 링크가 끝나기 전에 reload하면 syncCredential이 사라지고
        // 클라우드 동기화가 '대기'에 영구 고착된다.
        if (window.electronAPI?.isDesktop && firebaseLinked) {
          window.location.reload()
        }
      } catch (err) {
        clearAuthSession()
        setUser(null)
        setSyncCredential(null)
        setError(err instanceof Error ? err.message : '로그인에 실패했습니다.')
      }
    })()
  }, [])

  const signOut = useCallback(() => {
    void signOutFirebase()
    clearAuthSession()
    setUser(null)
    setSyncCredential(null)
    setError(null)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const value = useMemo(
    () => ({
      user,
      loading,
      clientId,
      allowedConfigured,
      error,
      syncCredential,
      signInWithCredential,
      signOut,
      clearError,
      clearSyncCredential,
    }),
    [
      user,
      loading,
      clientId,
      allowedConfigured,
      error,
      syncCredential,
      signInWithCredential,
      signOut,
      clearError,
      clearSyncCredential,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
