import { Cloud, CloudOff, Loader2, AlertCircle, LogOut, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCloudSyncStatus } from '../context/CloudSyncContext'

interface UserBarProps {
  compact?: boolean
}

function SyncIndicator({ compact }: { compact: boolean }) {
  const { status, enabled, errorMessage } = useCloudSyncStatus()
  if (!enabled) return null

  const labels: Record<string, string> = {
    idle: '동기화 대기',
    syncing: '동기화 중…',
    synced: '동기화됨',
    error: '동기화 오류',
    needs_reauth: '재로그인 필요',
  }

  const Icon =
    status === 'syncing'
      ? Loader2
      : status === 'error' || status === 'needs_reauth'
        ? status === 'needs_reauth'
          ? RefreshCw
          : AlertCircle
        : status === 'synced'
          ? Cloud
          : CloudOff

  const title =
    errorMessage && (status === 'error' || status === 'needs_reauth')
      ? errorMessage
      : (labels[status] ?? '동기화')

  return (
    <span
      className={`sync-badge sync-badge--${status}${compact ? ' sync-badge--compact' : ''}`}
      title={title}
      aria-label={title}
    >
      <Icon size={compact ? 13 : 14} className={status === 'syncing' ? 'spin' : undefined} />
      {!compact && <span>{labels[status]}</span>}
    </span>
  )
}

export function UserBar({ compact = false }: UserBarProps) {
  const { user, signOut } = useAuth()
  if (!user) return null

  const displayName = user.name || user.email.split('@')[0]

  return (
    <div className={`user-bar ${compact ? 'user-bar--compact user-bar--minimal' : ''}`}>
      {user.picture ? (
        <img
          className="user-bar__avatar"
          src={user.picture}
          alt=""
          width={compact ? 26 : 32}
          height={compact ? 26 : 32}
        />
      ) : (
        <span className="user-bar__avatar user-bar__avatar--fallback" aria-hidden>
          {displayName.slice(0, 1)}
        </span>
      )}
      {!compact && (
        <div className="user-bar__info">
          <strong className="user-bar__name">{displayName}</strong>
          <span className="user-bar__email muted">{user.email}</span>
        </div>
      )}
      {compact && <span className="user-bar__name user-bar__name--compact">{displayName}</span>}
      <SyncIndicator compact={compact} />
      <button
        type="button"
        className="btn btn--ghost btn--sm user-bar__logout"
        onClick={signOut}
        title="로그아웃"
        aria-label="로그아웃"
      >
        <LogOut size={15} />
      </button>
    </div>
  )
}
