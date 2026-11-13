import { useState } from 'react';
import { DashboardView } from './components/DashboardView';
import { Header } from './components/Header';
import { KanbanBoard } from './components/KanbanBoard';
import { LeadDetailDrawer } from './components/LeadDetailDrawer';
import { NewProspectModal } from './components/NewProspectModal';
import { SettingsModal } from './components/SettingsModal';
import { TableView } from './components/TableView';
import { ToastContainer } from './components/ToastContainer';
import { useCrmStore } from './hooks/useCrmStore';
import { AppView, Lead, LeadStatus } from './types/crm';

export default function App() {
  const {
    leads,
    settings,
    isConnected,
    isSyncing,
    toasts,
    dismissToast,
    pushToast,
    createLead,
    updateLead,
    moveLeadStatus,
    incrementCall,
    deleteLead,
    setActiveUser,
    updateSettings,
    syncFromSheets,
    pushAllToSheets,
    resetDemoData,
  } = useCrmStore();

  const [activeView, setActiveView] = useState<AppView>('kanban');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newModalStatus, setNewModalStatus] = useState<LeadStatus>('Para Prospectar');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const selectedLead = leads.find((l) => l.id === selectedLeadId) ?? null;

  const handleOpenNewProspect = (initialStatus: LeadStatus = 'Para Prospectar') => {
    setNewModalStatus(initialStatus);
    setIsNewModalOpen(true);
  };

  const handleSelectLead = (lead: Lead) => {
    setSelectedLeadId(lead.id);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col">
      <Header
        activeView={activeView}
        onChangeView={setActiveView}
        settings={settings}
        isConnected={isConnected}
        isSyncing={isSyncing}
        onChangeActiveUser={setActiveUser}
        onManualSync={() => {
          void syncFromSheets();
        }}
        onOpenNewProspect={() => handleOpenNewProspect('Para Prospectar')}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-5">
        {activeView === 'kanban' && (
          <KanbanBoard
            leads={leads}
            teamMembers={settings.teamMembers}
            onSelectLead={handleSelectLead}
            onIncrementCall={incrementCall}
            onMoveStatus={moveLeadStatus}
            onOpenNewProspect={handleOpenNewProspect}
          />
        )}

        {activeView === 'dashboard' && (
          <DashboardView
            leads={leads}
            teamMembers={settings.teamMembers}
            onSelectLead={handleSelectLead}
          />
        )}

        {activeView === 'table' && (
          <TableView
            leads={leads}
            teamMembers={settings.teamMembers}
            onSelectLead={handleSelectLead}
            onIncrementCall={incrementCall}
            onMoveStatus={moveLeadStatus}
            onNotifyExport={() => pushToast('CSV exportado com sucesso!', 'success')}
          />
        )}
      </main>

      <NewProspectModal
        isOpen={isNewModalOpen}
        defaultOwner={settings.activeUser}
        defaultStatus={newModalStatus}
        teamMembers={settings.teamMembers}
        onClose={() => setIsNewModalOpen(false)}
        onCreate={createLead}
      />

      <LeadDetailDrawer
        lead={selectedLead}
        teamMembers={settings.teamMembers}
        onClose={() => setSelectedLeadId(null)}
        onSave={(updated) => updateLead(updated, 'Alterações salvas!')}
        onDelete={deleteLead}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        isSyncing={isSyncing}
        onClose={() => setIsSettingsOpen(false)}
        onSaveSettings={updateSettings}
        onTestAndSync={syncFromSheets}
        onPushAll={pushAllToSheets}
        onResetDemoData={resetDemoData}
        onCopiedScript={() => pushToast('Código Code.gs copiado para a área de transferência!', 'info')}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
