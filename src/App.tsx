import { useEffect } from 'react'
import { useStore } from './hooks/useStore'
import { useIsDesktop } from './hooks/useIsDesktop'
import { ProjectList } from './components/ProjectList'
import { ProjectSidebar } from './components/ProjectSidebar'
import { ProjectDetailView } from './components/ProjectDetailView'
import { WelcomePanel } from './components/WelcomePanel'
import './App.css'

function App() {
  const isDesktop = useIsDesktop()
  const {
    projects,
    activeProject,
    activeProjectId,
    portfolio,
    filter,
    setFilter,
    ledgerMonth,
    setLedgerMonth,
    projectStats,
    openProject,
    closeProject,
    createProject,
    deleteProject,
    updateProject,
    updateCategoryPlanned,
    addCategory,
    renameCategory,
    deleteCategory,
    addExpense,
    updateExpense,
    deleteExpense,
    resetSamples,
    addClientPayment,
    updateClientPayment,
    deleteClientPayment,
    toggleClientPaymentPaid,
    addLaborPayment,
    updateLaborPayment,
    deleteLaborPayment,
    toggleLaborPaymentPaid,
    categoryOf,
  } = useStore()

  useEffect(() => {
    if (isDesktop && !activeProjectId && projects.length > 0) {
      openProject(projects[0].id)
    }
  }, [isDesktop, activeProjectId, projects, openProject])

  const detail =
    activeProject && projectStats ? (
      <ProjectDetailView
        project={activeProject}
        spent={projectStats.spent}
        remaining={projectStats.remaining}
        usageRatio={projectStats.usageRatio}
        netProfit={projectStats.netProfit}
        margin={projectStats.margin}
        received={projectStats.received}
        outstanding={projectStats.outstanding}
        laborStats={projectStats.laborStats}
        byCategory={projectStats.byCategory}
        filteredExpenses={projectStats.filteredExpenses}
        filter={filter}
        showBack={!isDesktop}
        onBack={closeProject}
        onUpdateProject={(patch) => updateProject(activeProject.id, patch)}
        onUpdateCategoryPlanned={(id, planned) =>
          updateCategoryPlanned(activeProject.id, id, planned)
        }
        onAddCategory={(name) => addCategory(activeProject.id, name)}
        onRenameCategory={(id, name) =>
          renameCategory(activeProject.id, id, name)
        }
        onDeleteCategory={(id) => deleteCategory(activeProject.id, id)}
        onSetFilter={setFilter}
        onAddExpense={(data) => addExpense(activeProject.id, data)}
        onUpdateExpense={(id, data) =>
          updateExpense(activeProject.id, id, data)
        }
        onDeleteExpense={(id) => deleteExpense(activeProject.id, id)}
        onAddClientPayment={(data) => addClientPayment(activeProject.id, data)}
        onUpdateClientPayment={(id, data) =>
          updateClientPayment(activeProject.id, id, data)
        }
        onDeleteClientPayment={(id) => deleteClientPayment(activeProject.id, id)}
        onToggleClientPaymentPaid={(id, isPaid) =>
          toggleClientPaymentPaid(activeProject.id, id, isPaid)
        }
        onAddLaborPayment={(data) => addLaborPayment(activeProject.id, data)}
        onUpdateLaborPayment={(id, data) =>
          updateLaborPayment(activeProject.id, id, data)
        }
        onDeleteLaborPayment={(id) => deleteLaborPayment(activeProject.id, id)}
        onToggleLaborPaymentPaid={(id, isPaid) =>
          toggleLaborPaymentPaid(activeProject.id, id, isPaid)
        }
        allProjects={projects}
        ledgerMonth={ledgerMonth}
        onMonthChange={setLedgerMonth}
        categoryOf={categoryOf}
      />
    ) : null

  if (isDesktop) {
    return (
      <div className="desktop-app">
        <ProjectSidebar
          projects={projects}
          activeProjectId={activeProjectId}
          portfolio={portfolio}
          onSelect={openProject}
          onDelete={deleteProject}
          onCreate={createProject}
          onResetSamples={resetSamples}
        />
        <div className="desktop-main">
          {detail ?? (
            <WelcomePanel
              projects={projects}
              ledgerMonth={ledgerMonth}
              onMonthChange={setLedgerMonth}
              onOpenProject={openProject}
            />
          )}
        </div>
      </div>
    )
  }

  if (!activeProject || !projectStats) {
    return (
      <div className="app">
        <ProjectList
          projects={projects}
          portfolio={portfolio}
          ledgerMonth={ledgerMonth}
          onMonthChange={setLedgerMonth}
          onOpen={openProject}
          onDelete={deleteProject}
          onCreate={createProject}
          onResetSamples={resetSamples}
        />
      </div>
    )
  }

  return <div className="app">{detail}</div>
}

export default App
