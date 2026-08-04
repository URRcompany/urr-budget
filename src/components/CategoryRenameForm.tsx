import { useEffect, useId, useState } from 'react'
import { X } from 'lucide-react'

interface CategoryRenameFormProps {
  open: boolean
  onClose: () => void
  initialName: string
  onSubmit: (name: string) => void
}

export function CategoryRenameForm({
  open,
  onClose,
  initialName,
  onSubmit,
}: CategoryRenameFormProps) {
  const titleId = useId()
  const [name, setName] = useState(initialName)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setName(initialName)
    setError('')
  }, [open, initialName])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('카테고리 이름을 입력해 주세요.')
      return
    }
    onSubmit(trimmed)
    onClose()
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal modal--narrow"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__head">
          <h2 id={titleId}>카테고리 이름 변경</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </header>

        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span>카테고리명</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="카테고리명"
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn btn--primary">
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
