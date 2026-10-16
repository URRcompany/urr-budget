import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createEmptyStore,
  type AppStore,
  type Entry,
  type EntryKind,
  type Project,
  type ProjectDraft,
} from '../types'
import { normalizeISODate, uid } from '../lib/format'
import { monthKey } from '../lib/money'
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
  return {
    id: raw.id || uid(),
    kind: raw.kind,
    title: String(raw.title ?? '').trim(),
    role: raw.kind === 'labor' ? String(raw.role ?? '').trim() : undefined,
    amount,
    date: typeof raw.date === 'string' ? raw.date : '',
  }
}

function normalizeProject(raw: Partial<Project>): Project | null {
  if (!raw || !raw.id) return null
  return {
    id: raw.id,
    name: String(raw.name ?? '').trim() || '새 프로젝트',
    client: String(raw.client ?? '').trim(),
    date: normalizeISODate(typeof raw.date === 'string' ? raw.date : ''),
    createdAt: raw.createdAt ?? new Date().toISOString(),
    entries: (Array.isArray(raw.entries) ? raw.entries : [])
      .map((e) => normalizeEntry(e))
      .filter((e): e is Entry => e !== null),
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
  const [month, setMonth] = useState(monthKey)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    }, 300)
    return () => window.clearTimeout(timer)
  }, [store])

  const activeProject = useMemo(
    () => store.projects.find((p) => p.id === store.activeProjectId) ?? null,
    [store],
  )

  const patchProject = useCallback(
    (projectId: string, updater: (p: Project) => Project) => {
      setStore((s) => ({
        ...s,
        projects: s.projects.map((p) => (p.id === projectId ? updater(p) : p)),
      }))
    },
    [],
  )

  const openProject = useCallback((id: string) => {
    setStore((s) => ({ ...s, activeProjectId: id }))
  }, [])

  const closeProject = useCallback(() => {
    setStore((s) => ({ ...s, activeProjectId: null }))
  }, [])

  const createProject = useCallback((input: ProjectDraft) => {
    const project: Project = {
      id: uid('p'),
      name: input.name.trim() || '새 프로젝트',
      client: input.client.trim(),
      date: normalizeISODate(input.date),
      entries: [],
      createdAt: new Date().toISOString(),
    }
    setStore((s) => ({
      ...s,
      projects: [project, ...s.projects],
      activeProjectId: project.id,
    }))
  }, [])

  const updateProject = useCallback(
    (id: string, patch: ProjectDraft) => {
      patchProject(id, (p) => ({
        ...p,
        name: patch.name.trim() || p.name,
        client: patch.client.trim(),
        date: normalizeISODate(patch.date),
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

  const addEntry = useCallback(
    (projectId: string, data: EntryInput) => {
      const entry = normalizeEntry({ ...data, id: uid() })
      if (!entry) return
      patchProject(projectId, (p) => ({ ...p, entries: [entry, ...p.entries] }))
    },
    [patchProject],
  )

  const updateEntry = useCallback(
    (projectId: string, entryId: string, data: EntryInput) => {
      const entry = normalizeEntry({ ...data, id: entryId })
      if (!entry) return
      patchProject(projectId, (p) => ({
        ...p,
        entries: p.entries.map((e) => (e.id === entryId ? entry : e)),
      }))
    },
    [patchProject],
  )

  const deleteEntry = useCallback(
    (projectId: string, entryId: string) => {
      patchProject(projectId, (p) => ({
        ...p,
        entries: p.entries.filter((e) => e.id !== entryId),
      }))
    },
    [patchProject],
  )

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
    activeProject,
    month,
    setMonth,
    openProject,
    closeProject,
    createProject,
    updateProject,
    deleteProject,
    addEntry,
    updateEntry,
    deleteEntry,
    exportBackup,
    importBackup,
  }
}
