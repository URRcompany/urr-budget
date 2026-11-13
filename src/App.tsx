import { useStore, normalizeStore } from './hooks/useStore'
import { useCloudSync } from './hooks/useCloudSync'
import { CloudSyncProvider } from './context/CloudSyncContext'
import { LedgerHome } from './components/ledger/LedgerHome'
import './App.css'
import './styles/ledger.css'

function App() {
  const {
    store,
    replaceStore,
    projects,
    saveProject,
    deleteProject,
    addPayment,
    toggleLaborPaid,
    exportBackup,
    importBackup,
  } = useStore()

  const cloudSync = useCloudSync({
    store,
    setStore: replaceStore,
    normalizeStore,
  })

  return (
    <CloudSyncProvider value={cloudSync}>
      <LedgerHome
        projects={projects}
        onSave={saveProject}
        onDelete={deleteProject}
        onPay={addPayment}
        onToggleLaborPaid={toggleLaborPaid}
        onExportBackup={exportBackup}
        onImportBackup={importBackup}
      />
    </CloudSyncProvider>
  )
}

export default App
