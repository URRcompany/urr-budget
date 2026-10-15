import type { AppStore } from '../types'

export const BACKUP_MIME = 'application/json'

/** 백업 JSON 직렬화 */
export function serializeStore(store: AppStore): string {
  return JSON.stringify(store, null, 2)
}

/** 백업 파일 다운로드 */
export function downloadStoreBackup(store: AppStore): void {
  const blob = new Blob([serializeStore(store)], { type: BACKUP_MIME })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `reelbudget-backup-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export type BackupParseResult =
  | { ok: true; store: AppStore }
  | { ok: false; error: string }

/** 백업 JSON 파싱 (구조 검증만, 정규화는 useStore에서) */
export function parseStoreBackup(raw: string): BackupParseResult {
  try {
    const parsed = JSON.parse(raw) as Partial<AppStore> & { version?: number }
    if (parsed?.version !== 4) {
      return {
        ok: false,
        error: '이전 버전 백업은 가져올 수 없습니다. (개편 후 만든 백업만 지원)',
      }
    }
    if (!Array.isArray(parsed.projects)) {
      return { ok: false, error: '프로젝트 목록이 없습니다.' }
    }
    return {
      ok: true,
      store: {
        version: 4,
        projects: parsed.projects,
        activeProjectId:
          typeof parsed.activeProjectId === 'string' ? parsed.activeProjectId : null,
      },
    }
  } catch {
    return { ok: false, error: 'JSON 파일을 읽을 수 없습니다.' }
  }
}

/** 파일 선택으로 백업 읽기 */
export function readBackupFile(file: File): Promise<BackupParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(parseStoreBackup(String(reader.result ?? '')))
    }
    reader.onerror = () => {
      resolve({ ok: false, error: '파일을 읽을 수 없습니다.' })
    }
    reader.readAsText(file)
  })
}
