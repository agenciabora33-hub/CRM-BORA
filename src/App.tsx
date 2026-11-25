import { useState } from 'react';
import { DashboardView } from './components/DashboardView';
import { FollowUpAlertBar } from './components/FollowUpAlertBar';
import { Header } from './components/Header';
import { KanbanBoard } from './components/KanbanBoard';
import { LeadDetailDrawer } from './components/LeadDetailDrawer';
import { NewProspectModal } from './components/NewProspectModal';
import { PartnerSelectModal } from './components/PartnerSelectModal';
import { SettingsModal } from './components/SettingsModal';
import { TableView } from './components/TableView';
import { ToastContainer } from './components/ToastContainer';
import { useCrmStore } from './hooks/useCrmStore';
import { AppView, Lead, LeadStatus } from './types/crm';

export default function App() {
  const {
    leads,
    settings,
    partnerConfirmed,
    isConnected,
    isSyncing,
    isSavingToSheets,
    corruptedRemoteLogIds,
    toasts,
    dismissToast,
    pushToast,
    createLead,
    updateLead,
    moveLeadStatus,
    incrementCall,
    deleteLead,
    setActiveUser,
    confirmActivePartner,
    updateSettings,
    syncFromSheets,
    pushAllToSheets,
    refreshOnLeadOpen,
    refreshLeadNow,
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
    refreshOnLeadOpen();
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col overflow-x-hidden">
      <Header
        activeView={activeView}
        onChangeView={setActiveView}
        settings={settings}
        isConnected={isConnected}
        isSyncing={isSyncing}
        isSavingToSheets={isSavingToSheets}
        onChangeActiveUser={setActiveUser}
        onManualSync={() => {
          void syncFromSheets();
        }}
        onOpenNewProspect={() => handleOpenNewProspect('Para Prospectar')}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="flex-1 max-w-[1760px] w-full min-w-0 mx-auto px-3 sm:px-5 pt-28 md:pt-20 pb-6">
        <FollowUpAlertBar leads={leads} onSelectLead={handleSelectLead} />

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
        activeUser={settings.activeUser}
        isConnected={isConnected}
        isSyncing={isSyncing}
        isSavingToSheets={isSavingToSheets}
        isCorruptedRemoteLogs={selectedLead ? corruptedRemoteLogIds.has(selectedLead.id) : false}
        onRefreshFromSheets={() => {
          void refreshLeadNow();
        }}
        onClose={() => setSelectedLeadId(null)}
        onSave={(updated, toastLabel) => updateLead(updated, toastLabel ?? 'Alterações salvas!')}
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

      <PartnerSelectModal
        isOpen={!partnerConfirmed}
        companyName={settings.companyName}
        logoUrl={settings.logoUrl}
        teamMembers={settings.teamMembers}
        initialSelected={settings.activeUser}
        onConfirm={confirmActivePartner}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
