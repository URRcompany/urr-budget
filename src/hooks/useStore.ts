import { useCallback, useEffect, useState } from 'react'
import {
  createEmptyStore,
  type AppStore,
  type Entry,
  type EntryKind,
  type Project,
} from '../types'
import { normalizeISODate, uid } from '../lib/format'
import { downloadStoreBackup, readBackupFile } from '../lib/backup'

const STORAGE_KEY = 'reelbudget.store.v4'

/** 개편 이전 데이터 — 새 구조로 옮기지 않고 삭제 */
const LEGACY_KEYS = [
  'reelbudget.store.v3',
  'reelbudget.store.v2',
  'reelbudget.project.v1',
  'reelbudget.sync.v1',
  'reelbudget.sync.dirty.v1',
]

const ENTRY_KINDS = new Set<EntryKind>(['income', 'labor', 'equipment', 'misc'])

function normalizeEntry(raw: Partial<Entry>): Entry | null {
  if (!raw || !raw.kind || !ENTRY_KINDS.has(raw.kind)) return null
  const amount = Math.max(0, Math.round(Number(raw.amount) || 0))
  const entry: Entry = {
    id: raw.id || uid(),
    kind: raw.kind,
    title: String(raw.title ?? '').trim(),
    amount,
    date: typeof raw.date === 'string' ? raw.date : '',
  }
  // Firestore는 undefined 값을 거절한다. 인건비가 아니면 role 키 자체를 두지 않는다.
  if (raw.kind === 'labor') {
    entry.role = String(raw.role ?? '').trim()
    // 개편 전 기록은 '나간 돈'이었으므로 지급한 것으로 본다.
    entry.paid = raw.paid === undefined ? true : Boolean(raw.paid)
  }
  return entry
}

function normalizeProject(raw: Partial<Project>): Project | null {
  if (!raw || !raw.id) return null
  const entries = (Array.isArray(raw.entries) ? raw.entries : [])
    .map((e) => normalizeEntry(e))
    .filter((e): e is Entry => e !== null)
  // 개편 전 프로젝트엔 받을 금액이 없다 → 받은 돈 합계를 받을 금액으로 본다.
  const legacyAmount = entries
    .filter((e) => e.kind === 'income')
    .reduce((sum, e) => sum + e.amount, 0)
  const amount =
    raw.amount === undefined || raw.amount === null
      ? legacyAmount
      : Math.max(0, Math.round(Number(raw.amount) || 0))
  return {
    id: raw.id,
    name: String(raw.name ?? '').trim() || '새 프로젝트',
    client: String(raw.client ?? '').trim(),
    date: normalizeISODate(typeof raw.date === 'string' ? raw.date : ''),
    amount,
    dueDate: normalizeISODate(typeof raw.dueDate === 'string' ? raw.dueDate : ''),
    memo: String(raw.memo ?? '').trim(),
    createdAt: raw.createdAt ?? new Date().toISOString(),
    entries,
  }
}

export function normalizeStore(raw: AppStore): AppStore {
  const projects = (Array.isArray(raw?.projects) ? raw.projects : [])
    .map((p) => normalizeProject(p))
    .filter((p): p is Project => p !== null)
  const activeProjectId =
    raw?.activeProjectId && projects.some((p) => p.id === raw.activeProjectId)
      ? raw.activeProjectId
      : null
  return { version: 4, projects, activeProjectId }
}

function loadStore(): AppStore {
  try {
    for (const key of LEGACY_KEYS) localStorage.removeItem(key)
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppStore
      if (parsed?.version === 4) return normalizeStore(parsed)
    }
  } catch {
    /* ignore */
  }
  return createEmptyStore()
}

export type EntryInput = Omit<Entry, 'id'>

export function useStore() {
  const [store, setStore] = useState<AppStore>(loadStore)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    }, 300)
    return () => window.clearTimeout(timer)
  }, [store])

  const patchProject = useCallback(
    (projectId: string, updater: (p: Project) => Project) => {
      setStore((s) => ({
        ...s,
        projects: s.projects.map((p) => (p.id === projectId ? updater(p) : p)),
      }))
    },
    [],
  )

  const saveProject = useCallback((input: Project) => {
    const project = normalizeProject(input)
    if (!project) return
    setStore((s) => {
      const exists = s.projects.some((p) => p.id === project.id)
      return {
        ...s,
        projects: exists
          ? s.projects.map((p) => (p.id === project.id ? project : p))
          : [project, ...s.projects],
      }
    })
  }, [])

  const addPayment = useCallback(
    (projectId: string, payment: { date: string; amount: number; memo: string }) => {
      const entry = normalizeEntry({
        id: uid(),
        kind: 'income',
        title: payment.memo,
        amount: payment.amount,
        date: payment.date,
      })
      if (!entry) return
      patchProject(projectId, (p) => ({ ...p, entries: [...p.entries, entry] }))
    },
    [patchProject],
  )

  const toggleLaborPaid = useCallback(
    (projectId: string, entryId: string) => {
      patchProject(projectId, (p) => ({
        ...p,
        entries: p.entries.map((e) =>
          e.id === entryId && e.kind === 'labor' ? { ...e, paid: !e.paid } : e,
        ),
      }))
    },
    [patchProject],
  )

  const deleteProject = useCallback((id: string) => {
    setStore((s) => ({
      ...s,
      projects: s.projects.filter((p) => p.id !== id),
      activeProjectId: s.activeProjectId === id ? null : s.activeProjectId,
    }))
  }, [])

  const exportBackup = useCallback(() => {
    downloadStoreBackup(store)
  }, [store])

  const importBackup = useCallback(async (file: File, mode: 'merge' | 'replace') => {
    const result = await readBackupFile(file)
    if (!result.ok) return { ok: false as const, error: result.error }

    const imported = normalizeStore(result.store)
    if (mode === 'replace') {
      setStore(imported)
      return { ok: true as const, projectCount: imported.projects.length }
    }

    setStore((s) => {
      const importedIds = new Set(imported.projects.map((p) => p.id))
      return {
        ...s,
        projects: [
          ...imported.projects,
          ...s.projects.filter((p) => !importedIds.has(p.id)),
        ],
      }
    })
    return { ok: true as const, projectCount: imported.projects.length }
  }, [])

  const replaceStore = useCallback((next: AppStore) => {
    setStore(normalizeStore(next))
  }, [])

  return {
    store,
    replaceStore,
    projects: store.projects,
    saveProject,
    deleteProject,
    addPayment,
    toggleLaborPaid,
    exportBackup,
    importBackup,
  }
}
