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

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  clientId: string
  allowedConfigured: boolean
  error: string | null
  signInWithCredential: (credential: string) => void
  signOut: () => void
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const clientId = getGoogleClientId()
  const allowedConfigured = getAllowedEmails().length > 0

  useEffect(() => {
    const session = loadAuthSession()
    setUser(session)
    setLoading(false)
  }, [])

  const signInWithCredential = useCallback((credential: string) => {
    try {
      const verified = verifyGoogleCredential(credential)
      const session: AuthSession = saveAuthSession(verified)
      setUser(session)
      setError(null)
    } catch (err) {
      clearAuthSession()
      setUser(null)
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.')
    }
  }, [])

  const signOut = useCallback(() => {
    clearAuthSession()
    setUser(null)
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
      signInWithCredential,
      signOut,
      clearError,
    }),
    [
      user,
      loading,
      clientId,
      allowedConfigured,
      error,
      signInWithCredential,
      signOut,
      clearError,
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
