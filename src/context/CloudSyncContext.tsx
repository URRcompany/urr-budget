import { createContext, useContext, type ReactNode } from 'react'
import type { SyncStatus } from '../lib/cloudSync'

export interface CloudSyncContextValue {
  status: SyncStatus
  lastSyncedAt: number | null
  enabled: boolean
}

const CloudSyncContext = createContext<CloudSyncContextValue>({
  status: 'off',
  lastSyncedAt: null,
  enabled: false,
})

export function CloudSyncProvider({
  value,
  children,
}: {
  value: CloudSyncContextValue
  children: ReactNode
}) {
  return (
    <CloudSyncContext.Provider value={value}>{children}</CloudSyncContext.Provider>
  )
}

export function useCloudSyncStatus(): CloudSyncContextValue {
  return useContext(CloudSyncContext)
}
