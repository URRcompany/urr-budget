import { useStore, normalizeStore } from './hooks/useStore'
import { useCloudSync } from './hooks/useCloudSync'
import { CloudSyncProvider } from './context/CloudSyncContext'
import { HomeView } from './components/HomeView'
import { ProjectView } from './components/ProjectView'
import './App.css'

function App() {
  const {
    store,
    replaceStore,
    projects,
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
  } = useStore()

  const cloudSync = useCloudSync({
    store,
    setStore: replaceStore,
    normalizeStore,
  })

  return (
    <CloudSyncProvider value={cloudSync}>
      {activeProject ? (
        <ProjectView
          project={activeProject}
          onBack={closeProject}
          onUpdate={(data) => updateProject(activeProject.id, data)}
          onDelete={() => deleteProject(activeProject.id)}
          onAddEntry={(data) => addEntry(activeProject.id, data)}
          onUpdateEntry={(id, data) => updateEntry(activeProject.id, id, data)}
          onDeleteEntry={(id) => deleteEntry(activeProject.id, id)}
        />
      ) : (
        <HomeView
          projects={projects}
          month={month}
          onMonthChange={setMonth}
          onOpen={openProject}
          onCreate={createProject}
          onExportBackup={exportBackup}
          onImportBackup={importBackup}
        />
      )}
    </CloudSyncProvider>
  )
}

export default App
