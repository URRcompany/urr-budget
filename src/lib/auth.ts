import { jwtDecode } from 'jwt-decode'

export const AUTH_STORAGE_KEY = 'reelbudget.auth.v1'
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

export interface AuthUser {
  email: string
  name: string
  picture?: string
}

export interface AuthSession extends AuthUser {
  loggedInAt: number
}

interface GoogleJwtPayload {
  email?: string
  name?: string
  given_name?: string
  picture?: string
  exp?: number
}

export function getGoogleClientId(): string {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? ''
}

export function getAllowedEmails(): string[] {
  const raw = import.meta.env.VITE_ALLOWED_EMAILS ?? ''
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isEmailAllowed(email: string): boolean {
  const allowed = getAllowedEmails()
  if (allowed.length === 0) return false
  return allowed.includes(email.trim().toLowerCase())
}

export function verifyGoogleCredential(credential: string): AuthUser {
  const payload = jwtDecode<GoogleJwtPayload>(credential)
  if (!payload.email) {
    throw new Error('Google 계정 정보를 읽을 수 없습니다.')
  }
  if (!payload.exp || payload.exp * 1000 <= Date.now()) {
    throw new Error('로그인 토큰이 만료되었습니다. 다시 시도해 주세요.')
  }
  if (!isEmailAllowed(payload.email)) {
    throw new Error('접근 권한이 없는 계정입니다.')
  }
  const name =
    payload.name?.trim() ||
    payload.given_name?.trim() ||
    payload.email.split('@')[0]
  return {
    email: payload.email,
    name,
    picture: payload.picture,
  }
}

export function loadAuthSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as AuthSession
    if (!session.email || !session.loggedInAt) return null
    if (!session.name?.trim()) {
      session.name = session.email.split('@')[0]
    }
    if (Date.now() - session.loggedInAt > SESSION_MAX_AGE_MS) {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      return null
    }
    if (!isEmailAllowed(session.email)) {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

export function saveAuthSession(user: AuthUser): AuthSession {
  const session: AuthSession = { ...user, loggedInAt: Date.now() }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
  return session
}

export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}
