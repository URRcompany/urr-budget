import { useEffect, useId } from 'react'
import { X } from 'lucide-react'
import { ProjectCreateForm } from './ProjectCreateForm'

interface ProjectCreateModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (input: {
    name: string
    client: string
    shootDate: string
    revenue: number
    totalBudget: number
  }) => void
}

export function ProjectCreateModal({ open, onClose, onSubmit }: ProjectCreateModalProps) {
  const titleId = useId()
  const formId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="modal-backdrop modal-backdrop--center"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="modal modal--create-project"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__head">
          <h2 id={titleId}>새 프로젝트</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </header>

        <ProjectCreateForm
          formId={formId}
          onSubmit={(data) => {
            onSubmit(data)
            onClose()
          }}
        />

        <div className="modal__foot form-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            취소
          </button>
          <button type="submit" form={formId} className="btn btn--primary">
            만들기
          </button>
        </div>
      </div>
    </div>
  )
}
