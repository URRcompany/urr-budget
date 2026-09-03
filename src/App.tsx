import { useState, type ReactNode } from 'react'
import { useStore, normalizeImportedStore } from './hooks/useStore'
import { useCloudSync } from './hooks/useCloudSync'
import { CloudSyncProvider } from './context/CloudSyncContext'
import { useIsDesktop } from './hooks/useIsDesktop'
import { ProjectList } from './components/ProjectList'
import { ProjectSidebar } from './components/ProjectSidebar'
import { ProjectDetailView } from './components/ProjectDetailView'
import { WelcomePanel } from './components/WelcomePanel'
import { ReceivablesDashboard } from './components/ReceivablesDashboard'
import { TaxInvoiceDashboard } from './components/TaxInvoiceDashboard'
import { getPortfolioReceivables } from './lib/receivables'
import { getPortfolioTaxSummary } from './lib/taxLedger'
import type { PortfolioView } from './types'
import './App.css'

function App() {
  const isDesktop = useIsDesktop()
  const [portfolioView, setPortfolioView] = useState<PortfolioView>('projects')
  const {
    store,
    replaceStore,
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
    setCategoriesPlannedBulk,
    addCategory,
    renameCategory,
    deleteCategory,
    addExpense,
    updateExpense,
    deleteExpense,
    addClientPayment,
    updateClientPayment,
    deleteClientPayment,
    toggleClientPaymentPaid,
    toggleClientPaymentInvoice,
    toggleExpenseInvoice,
    addLaborPayment,
    updateLaborPayment,
    deleteLaborPayment,
    toggleLaborPaymentPaid,
    applyClientPaymentTemplate,
    applyAdvanceBalanceTemplate,
    exportBackup,
    importBackup,
    categoryOf,
  } = useStore()

  const cloudSync = useCloudSync({
    store,
    setStore: replaceStore,
    normalizeStore: normalizeImportedStore,
  })

  const receivables = getPortfolioReceivables(projects)
  const taxSummary = getPortfolioTaxSummary(projects)

  const goHome = () => {
    setPortfolioView('projects')
    closeProject()
  }

  const openProjectFromPortfolio = (id: string) => {
    setPortfolioView('projects')
    openProject(id)
  }

  const detail =
    activeProject && projectStats ? (
      <ProjectDetailView
        project={activeProject}
        spent={projectStats.spent}
        remaining={projectStats.remaining}
        committedRemaining={projectStats.committedRemaining}
        unpaidLabor={projectStats.unpaidLabor}
        usageRatio={projectStats.usageRatio}
        committedUsageRatio={projectStats.committedUsageRatio}
        netProfit={projectStats.netProfit}
        margin={projectStats.margin}
        received={projectStats.received}
        outstanding={projectStats.outstanding}
        laborStats={projectStats.laborStats}
        byCategory={projectStats.byCategory}
        filteredExpenses={projectStats.filteredExpenses}
        filter={filter}
        showBack
        onBack={goHome}
        onUpdateProject={(patch) => updateProject(activeProject.id, patch)}
        onUpdateCategoryPlanned={(id, planned) =>
          updateCategoryPlanned(activeProject.id, id, planned)
        }
        onApplyCategoryAllocations={(allocations) =>
          setCategoriesPlannedBulk(activeProject.id, allocations)
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
        onToggleClientPaymentInvoice={(id, issued) =>
          toggleClientPaymentInvoice(activeProject.id, id, issued)
        }
        onToggleExpenseInvoice={(id, received) =>
          toggleExpenseInvoice(activeProject.id, id, received)
        }
        onAddLaborPayment={(data) => addLaborPayment(activeProject.id, data)}
        onUpdateLaborPayment={(id, data) =>
          updateLaborPayment(activeProject.id, id, data)
        }
        onDeleteLaborPayment={(id) => deleteLaborPayment(activeProject.id, id)}
        onToggleLaborPaymentPaid={(id, isPaid) =>
          toggleLaborPaymentPaid(activeProject.id, id, isPaid)
        }
        onApplyClientPaymentTemplate={() =>
          applyClientPaymentTemplate(activeProject.id, activeProject.revenue)
        }
        onApplyAdvanceBalanceTemplate={(advancePercent) =>
          applyAdvanceBalanceTemplate(activeProject.id, activeProject.revenue, advancePercent)
        }
        allProjects={projects}
        ledgerMonth={ledgerMonth}
        onMonthChange={setLedgerMonth}
        categoryOf={categoryOf}
      />
    ) : null

  let content: ReactNode

  if (isDesktop) {
    content = (
      <div className="desktop-app">
        <ProjectSidebar
          projects={projects}
          activeProjectId={activeProjectId}
          portfolio={portfolio}
          portfolioView={portfolioView}
          totalOutstanding={receivables.totalOutstanding}
          taxAttentionCount={taxSummary.attentionCount}
          onSelect={(id) => {
            setPortfolioView('projects')
            openProject(id)
          }}
          onShowReceivables={() => {
            closeProject()
            setPortfolioView('receivables')
          }}
          onShowTax={() => {
            closeProject()
            setPortfolioView('tax')
          }}
          onShowProjects={goHome}
          onDelete={deleteProject}
          onCreate={createProject}
          onExportBackup={exportBackup}
          onImportBackup={importBackup}
        />
        <div className="desktop-main">
          {portfolioView === 'receivables' ? (
            <ReceivablesDashboard
              projects={projects}
              showBack
              onBack={goHome}
              onOpenProject={openProjectFromPortfolio}
            />
          ) : portfolioView === 'tax' ? (
            <TaxInvoiceDashboard
              projects={projects}
              showBack
              onBack={goHome}
              onOpenProject={openProjectFromPortfolio}
            />
          ) : (
            detail ?? (
              <WelcomePanel
                projects={projects}
                portfolio={portfolio}
                totalOutstanding={receivables.totalOutstanding}
                taxAttentionCount={taxSummary.attentionCount}
                ledgerMonth={ledgerMonth}
                onMonthChange={setLedgerMonth}
                onOpenProject={openProject}
                onShowReceivables={() => {
                  closeProject()
                  setPortfolioView('receivables')
                }}
                onShowTax={() => {
                  closeProject()
                  setPortfolioView('tax')
                }}
              />
            )
          )}
        </div>
      </div>
    )
  } else if (portfolioView === 'receivables') {
    content = (
      <div className="app">
        <ReceivablesDashboard
          projects={projects}
          showBack
          onBack={goHome}
          onOpenProject={openProjectFromPortfolio}
        />
      </div>
    )
  } else if (portfolioView === 'tax') {
    content = (
      <div className="app">
        <TaxInvoiceDashboard
          projects={projects}
          showBack
          onBack={goHome}
          onOpenProject={openProjectFromPortfolio}
        />
      </div>
    )
  } else if (!activeProject || !projectStats) {
    content = (
      <div className="app">
        <ProjectList
          projects={projects}
          portfolio={portfolio}
          totalOutstanding={receivables.totalOutstanding}
          ledgerMonth={ledgerMonth}
          onMonthChange={setLedgerMonth}
          onOpen={openProject}
          onShowReceivables={() => setPortfolioView('receivables')}
          onShowTax={() => setPortfolioView('tax')}
          taxAttentionCount={taxSummary.attentionCount}
          onDelete={deleteProject}
          onCreate={createProject}
          onExportBackup={exportBackup}
          onImportBackup={importBackup}
        />
      </div>
    )
  } else {
    content = <div className="app">{detail}</div>
  }

  return (
    <CloudSyncProvider value={cloudSync}>{content}</CloudSyncProvider>
  )
}

export default App
