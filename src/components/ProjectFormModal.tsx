import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'

interface ProjectFormModalProps {
  open: boolean
  title: string
  submitLabel: string
  initial?: { name: string; client: string }
  onClose: () => void
  onSubmit: (data: { name: string; client: string }) => void
}

export function ProjectFormModal({
  open,
  title,
  submitLabel,
  initial,
  onClose,
  onSubmit,
}: ProjectFormModalProps) {
  const [name, setName] = useState('')
  const [client, setClient] = useState('')
  const [error, setError] = useState('')

  const initialName = initial?.name ?? ''
  const initialClient = initial?.client ?? ''

  useEffect(() => {
    if (!open) return
    setName(initialName)
    setClient(initialClient)
    setError('')
  }, [open, initialName, initialClient])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('프로젝트 이름을 입력하세요.')
      return
    }
    onSubmit({ name, client })
    onClose()
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label="닫기" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <form className="form" onSubmit={submit}>
          <label className="field">
            <span>프로젝트 이름</span>
            <input
              value={name}
              placeholder="예: 브랜드 CF 촬영"
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </label>
          <label className="field">
            <span>
              클라이언트<em className="field__opt"> (선택)</em>
            </span>
            <input
              value={client}
              placeholder="예: ABC광고"
              onChange={(e) => setClient(e.target.value)}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn btn--primary">
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
