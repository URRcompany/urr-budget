import { Cloud, CloudOff, Loader2, AlertCircle, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCloudSyncStatus } from '../context/CloudSyncContext'

interface UserBarProps {
  compact?: boolean
}

function SyncIndicator({ compact }: { compact: boolean }) {
  const { status, enabled } = useCloudSyncStatus()
  if (!enabled) return null

  const labels: Record<string, string> = {
    idle: '동기화 대기',
    syncing: '동기화 중…',
    synced: '동기화됨',
    error: '동기화 오류',
  }

  const Icon =
    status === 'syncing'
      ? Loader2
      : status === 'error'
        ? AlertCircle
        : status === 'synced'
          ? Cloud
          : CloudOff

  return (
    <span
      className={`sync-badge sync-badge--${status}${compact ? ' sync-badge--compact' : ''}`}
      title={labels[status] ?? '동기화'}
      aria-label={labels[status] ?? '동기화'}
    >
      <Icon size={compact ? 13 : 14} className={status === 'syncing' ? 'spin' : undefined} />
      {!compact && <span>{labels[status]}</span>}
    </span>
  )
}

export function UserBar({ compact = false }: UserBarProps) {
  const { user, signOut } = useAuth()
  if (!user) return null

  return (
    <div className={`user-bar ${compact ? 'user-bar--compact' : ''}`}>
      {user.picture ? (
        <img
          className="user-bar__avatar"
          src={user.picture}
          alt=""
          width={compact ? 28 : 32}
          height={compact ? 28 : 32}
        />
      ) : (
        <span className="user-bar__avatar user-bar__avatar--fallback" aria-hidden>
          {(user.name || user.email).slice(0, 1)}
        </span>
      )}
      <div className="user-bar__info">
        <strong className="user-bar__name">{user.name || user.email}</strong>
        {!compact && <span className="user-bar__email muted">{user.email}</span>}
      </div>
      <SyncIndicator compact={compact} />
      <button
        type="button"
        className="btn btn--ghost btn--sm user-bar__logout"
        onClick={signOut}
        title="로그아웃"
      >
        <LogOut size={15} />
        {!compact && '로그아웃'}
      </button>
    </div>
  )
}
