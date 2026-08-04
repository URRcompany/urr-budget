import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { LoginScreen } from './LoginScreen'

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="login-screen login-screen--loading">
        <p className="muted">로딩 중…</p>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  return <>{children}</>
}
