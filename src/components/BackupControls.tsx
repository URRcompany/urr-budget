import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'

interface BackupControlsProps {
  onExport: () => void
  onImport: (file: File, mode: 'merge' | 'replace') => Promise<{ ok: boolean; error?: string; projectCount?: number }>
  compact?: boolean
}

export function BackupControls({ onExport, onImport, compact = false }: BackupControlsProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const handleFile = async (file: File) => {
    setImporting(true)
    setMessage(null)

    const replace = confirm(
      '「전체 교체」: 기존 데이터를 백업으로 덮어씁니다.\n「확인」= 전체 교체 · 「취소」= 병합(같은 ID는 덮어쓰기)',
    )
    const mode = replace ? 'replace' : 'merge'

    if (
      mode === 'replace' &&
      !confirm('정말로 모든 프로젝트를 백업으로 교체할까요? 되돌릴 수 없습니다.')
    ) {
      setImporting(false)
      return
    }

    const result = await onImport(file, mode)
    setImporting(false)

    if (result.ok) {
      setMessage({
        type: 'ok',
        text: `${result.projectCount ?? 0}개 프로젝트를 ${mode === 'replace' ? '복원' : '병합'}했습니다.`,
      })
    } else {
      setMessage({ type: 'err', text: result.error ?? '가져오기에 실패했습니다.' })
    }
  }

  return (
    <div className={`backup-controls ${compact ? 'backup-controls--compact' : ''}`}>
      <div className="backup-controls__actions">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={onExport}
          title="전체 데이터 JSON 백업"
        >
          <Download size={15} />
          {compact ? '백업' : '백업 내보내기'}
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={importing}
          onClick={() => inputRef.current?.click()}
          title="JSON 백업 파일 가져오기"
        >
          <Upload size={15} />
          {importing ? '가져오는 중…' : compact ? '복원' : '백업 가져오기'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void handleFile(file)
          }}
        />
      </div>
      {message && (
        <p
          className={`backup-controls__msg ${message.type === 'err' ? 'backup-controls__msg--err' : ''}`}
          role="status"
        >
          {message.text}
        </p>
      )}
    </div>
  )
}
