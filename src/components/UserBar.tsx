import { LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

interface UserBarProps {
  compact?: boolean
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
