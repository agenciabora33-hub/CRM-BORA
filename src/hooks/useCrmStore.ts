import { useCallback, useEffect, useRef, useState } from 'react';
import { createSeedLeads, DEFAULT_SETTINGS } from '../data/seedLeads';
import { AgencySettings, Lead, LeadStatus, ServiceLog, ToastMessage } from '../types/crm';
import {
  generateUuid,
  mergeLeadBeforeSheetPush,
  mergeRemoteLeads,
  parseServiceLogsValue,
} from '../utils/crmLogic';
import {
  fetchWorkspaceFromSheets,
  isValidAppsScriptUrl,
  postToSheets,
  RemoteAgencySettings,
  SyncActionPayload,
} from '../utils/sheetsSync';
import {
  CURRENT_BRAND_VERSION,
  PersistedAgencySettings,
  resolveInitialSettings,
} from '../utils/settingsMigration';

const LEADS_STORAGE_KEY = 'prospeccao_crm_leads_v1';
const SETTINGS_STORAGE_KEY = 'prospeccao_crm_settings_v1';
const AUTO_POLL_INTERVAL_MS = 12000;
const MUTATION_GRACE_MS = 4500;

function loadInitialLeads(): Lead[] {
  try {
    const raw = localStorage.getItem(LEADS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          ...item,
          websiteUrl: item.websiteUrl ?? '',
          googleBusinessUrl: item.googleBusinessUrl ?? '',
          instagramUrl: item.instagramUrl ?? '',
          facebookUrl: item.facebookUrl ?? '',
          otherSocialUrl: item.otherSocialUrl ?? '',
          serviceLogs: parseServiceLogsValue(item.serviceLogs, item.owner || DEFAULT_SETTINGS.activeUser),
        }));
      }
    }
  } catch {
    // fallback to seed
  }
  return createSeedLeads();
}

function loadInitialSettingsState() {
  try {
    return resolveInitialSettings(localStorage.getItem(SETTINGS_STORAGE_KEY), DEFAULT_SETTINGS);
  } catch {
    return { settings: DEFAULT_SETTINGS, partnerConfirmed: false };
  }
}

export interface NewLeadInput {
  companyName: string;
  phone: string;
  contactName: string;
  websiteOrSocial: string;
  websiteUrl: string;
  googleBusinessUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  otherSocialUrl: string;
  niche: string;
  status: LeadStatus;
  owner: string;
  estimatedValue: number;
  nextFollowUp: string;
  notes: string;
}

function mergeRemoteSettings(
  prev: AgencySettings,
  remote: RemoteAgencySettings | null,
  syncTimestamp: string
): AgencySettings {
  if (!remote) {
    return { ...prev, lastSyncedAt: syncTimestamp };
  }
  const nextMembers = remote.teamMembers ?? prev.teamMembers;
  const nextActive = nextMembers.includes(prev.activeUser) ? prev.activeUser : nextMembers[0];

  return {
    ...prev,
    companyName: remote.companyName || prev.companyName,
    logoUrl: remote.logoUrl !== undefined ? remote.logoUrl : prev.logoUrl,
    teamMembers: nextMembers,
    activeUser: nextActive,
    lastSyncedAt: syncTimestamp,
  };
}

export function useCrmStore() {
  const [leads, setLeads] = useState<Lead[]>(loadInitialLeads);
  const [initialSettingsState] = useState(loadInitialSettingsState);
  const [settings, setSettings] = useState<AgencySettings>(initialSettingsState.settings);
  const [partnerConfirmed, setPartnerConfirmed] = useState<boolean>(
    initialSettingsState.partnerConfirmed
  );
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingToSheets, setIsSavingToSheets] = useState(false);
  const [corruptedRemoteLogIds, setCorruptedRemoteLogIds] = useState<Set<string>>(() => new Set());

  const isSyncingRef = useRef(false);
  const lastLocalMutationAtRef = useRef(0);
  const lastOpenRefreshAtRef = useRef(0);
  const leadsRef = useRef<Lead[]>(leads);
  leadsRef.current = leads;
  const activeUserRef = useRef(settings.activeUser);
  activeUserRef.current = settings.activeUser;
  const deletedLogIdsRef = useRef<Set<string>>(new Set());
  const syncWriteQueueRef = useRef<Promise<void>>(Promise.resolve());
  const isConnected = isValidAppsScriptUrl(settings.appsScriptUrl);

  const pushToast = useCallback((message: string, variant: ToastMessage['variant'] = 'success') => {
    const id = generateUuid();
    setToasts((prev) => [...prev.slice(-3), { id, message, variant }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads));
    } catch {
      // ignore storage quota errors
    }
  }, [leads]);

  useEffect(() => {
    try {
      const toStore: PersistedAgencySettings = {
        ...settings,
        brandVersion: CURRENT_BRAND_VERSION,
        logoRemoved: settings.logoUrl === '',
        partnerConfirmed,
      };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(toStore));
    } catch {
      // ignore storage quota errors
    }
  }, [partnerConfirmed, settings]);

  const syncInBackground = useCallback(
    (url: string, payload: SyncActionPayload): Promise<void> => {
      if (!isValidAppsScriptUrl(url)) return Promise.resolve();

      const run = async () => {
        setIsSavingToSheets(true);
        try {
          let payloadToSend = payload;
          if (payload.action === 'update') {
            const latestLocal = leadsRef.current.find((l) => l.id === payload.lead.id) ?? payload.lead;
            let candidateLead = latestLocal;
            try {
              const workspace = await fetchWorkspaceFromSheets(url, activeUserRef.current);
              const remoteMatch = workspace.leads.find((l) => l.id === latestLocal.id);
              const { mergedLead, gainedRemoteLogs } = mergeLeadBeforeSheetPush(
                latestLocal,
                remoteMatch,
                deletedLogIdsRef.current
              );
              candidateLead = mergedLead;
              if (gainedRemoteLogs) {
                setLeads((prev) =>
                  prev.map((l) => (l.id === mergedLead.id ? mergedLead : l))
                );
              }
            } catch {
              // If pre-merge GET fails transiently, proceed with local state so save is never dropped
            }
            payloadToSend = { action: 'update', lead: candidateLead };
          }

          await postToSheets(url, payloadToSend);

          if (payloadToSend.action === 'update') {
            const healedId = payloadToSend.lead.id;
            setCorruptedRemoteLogIds((prev) => {
              if (!prev.has(healedId)) return prev;
              const next = new Set(prev);
              next.delete(healedId);
              return next;
            });
          }

          lastLocalMutationAtRef.current = Date.now();
          setSettings((prev) => ({ ...prev, lastSyncedAt: new Date().toISOString() }));
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Falha na conexão';
          pushToast(`Salvo localmente, mas erro ao sincronizar: ${msg}`, 'error');
        } finally {
          setIsSavingToSheets(false);
        }
      };

      const nextPromise = syncWriteQueueRef.current.then(run, run);
      syncWriteQueueRef.current = nextPromise;
      return nextPromise;
    },
    [pushToast]
  );

  const reconcileCorruptedRemoteLogs = useCallback(
    (targetUrl: string, unparsedIds: string[], localSnapshot: Lead[]) => {
      const localMap = new Map(localSnapshot.map((l) => [l.id, l]));
      const unresolved = new Set<string>();
      for (const id of unparsedIds) {
        const localLead = localMap.get(id);
        if (localLead && (localLead.serviceLogs?.length ?? 0) > 0) {
          // Auto-heal Sheet cell from valid local logs
          void syncInBackground(targetUrl, { action: 'update', lead: localLead });
        } else {
          unresolved.add(id);
        }
      }
      setCorruptedRemoteLogIds(unresolved);
    },
    [syncInBackground]
  );

  const silentRefreshFromSheets = useCallback(
    async (
      targetUrl: string,
      fallbackOwner: string,
      showFailureToast: boolean,
      options?: { ignoreGrace?: boolean }
    ) => {
      if (!isValidAppsScriptUrl(targetUrl)) return;
      if (isSyncingRef.current) return;
      if (!options?.ignoreGrace && Date.now() - lastLocalMutationAtRef.current < MUTATION_GRACE_MS) return;

      const startedAt = Date.now();
      isSyncingRef.current = true;
      setIsSyncing(true);
      try {
        const workspace = await fetchWorkspaceFromSheets(targetUrl, fallbackOwner);
        // If user edited something locally while request was in flight, avoid overwriting their local change
        if (lastLocalMutationAtRef.current > startedAt) {
          return;
        }
        if (workspace.leads.length > 0) {
          const unparsedSet = new Set(workspace.unparsedServiceLogIds);
          const localBefore = leadsRef.current;
          setLeads((prev) =>
            mergeRemoteLeads(prev, workspace.leads, workspace.hasServiceLogsColumn, {
              deletedLogIds: deletedLogIdsRef.current,
              unparsedServiceLogIds: unparsedSet,
            })
          );
          reconcileCorruptedRemoteLogs(targetUrl, workspace.unparsedServiceLogIds, localBefore);
        }
        const nowIso = new Date().toISOString();
        setSettings((prev) => mergeRemoteSettings(prev, workspace.settings, nowIso));
      } catch {
        if (showFailureToast) {
          pushToast('Não foi possível atualizar da planilha ao abrir. Usando cache local.', 'info');
        }
      } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [pushToast, reconcileCorruptedRemoteLogs]
  );

  // Initial background fetch when connected on mount
  useEffect(() => {
    if (!isValidAppsScriptUrl(settings.appsScriptUrl)) return;
    void silentRefreshFromSheets(settings.appsScriptUrl, settings.activeUser, true);
    // Only run on initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time multi-device sync: poll every 12s while tab is visible + refresh on focus/visibility
  useEffect(() => {
    if (!isValidAppsScriptUrl(settings.appsScriptUrl)) return;

    const triggerRefresh = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void silentRefreshFromSheets(settings.appsScriptUrl, settings.activeUser, false);
    };

    const intervalId = window.setInterval(triggerRefresh, AUTO_POLL_INTERVAL_MS);
    window.addEventListener('focus', triggerRefresh);
    document.addEventListener('visibilitychange', triggerRefresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', triggerRefresh);
      document.removeEventListener('visibilitychange', triggerRefresh);
    };
  }, [settings.activeUser, settings.appsScriptUrl, silentRefreshFromSheets]);

  const createLead = useCallback(
    (input: NewLeadInput): Lead => {
      lastLocalMutationAtRef.current = Date.now();
      const now = new Date().toISOString();
      const newLead: Lead = {
        id: generateUuid(),
        createdAt: now,
        updatedAt: now,
        owner: input.owner || settings.activeUser,
        companyName: input.companyName.trim(),
        contactName: input.contactName.trim(),
        phone: input.phone.trim(),
        websiteOrSocial: input.websiteOrSocial.trim(),
        websiteUrl: input.websiteUrl.trim(),
        googleBusinessUrl: input.googleBusinessUrl.trim(),
        instagramUrl: input.instagramUrl.trim(),
        facebookUrl: input.facebookUrl.trim(),
        otherSocialUrl: input.otherSocialUrl.trim(),
        niche: input.niche.trim() || 'Outro',
        status: input.status,
        callCount: 0,
        estimatedValue: Math.max(0, Number(input.estimatedValue) || 0),
        nextFollowUp: input.nextFollowUp || '',
        notes: input.notes.trim(),
        serviceLogs: [],
      };

      setLeads((prev) => [newLead, ...prev]);
      pushToast('Lead salvo!', 'success');
      void syncInBackground(settings.appsScriptUrl, { action: 'create', lead: newLead });
      return newLead;
    },
    [pushToast, settings.activeUser, settings.appsScriptUrl, syncInBackground]
  );

  const updateLead = useCallback(
    (updated: Lead, toastLabel: string = 'Lead atualizado!') => {
      lastLocalMutationAtRef.current = Date.now();
      const nextLogs = Array.isArray(updated.serviceLogs) ? updated.serviceLogs : [];
      const previousLead = leadsRef.current.find((l) => l.id === updated.id);
      if (previousLead && Array.isArray(previousLead.serviceLogs)) {
        const nextLogIds = new Set(nextLogs.map((l) => l.id));
        for (const prevLog of previousLead.serviceLogs) {
          if (!nextLogIds.has(prevLog.id)) {
            deletedLogIdsRef.current.add(prevLog.id);
          }
        }
      }
      for (const nextLog of nextLogs) {
        deletedLogIdsRef.current.delete(nextLog.id);
      }

      const stamped: Lead = {
        ...updated,
        serviceLogs: nextLogs,
        updatedAt: new Date().toISOString(),
      };
      setLeads((prev) => prev.map((l) => (l.id === stamped.id ? stamped : l)));
      if (toastLabel) {
        pushToast(toastLabel, 'success');
      }
      void syncInBackground(settings.appsScriptUrl, { action: 'update', lead: stamped });
    },
    [pushToast, settings.appsScriptUrl, syncInBackground]
  );

  const moveLeadStatus = useCallback(
    (leadId: string, nextStatus: LeadStatus) => {
      const existing = leads.find((l) => l.id === leadId);
      if (!existing || existing.status === nextStatus) return;

      lastLocalMutationAtRef.current = Date.now();
      const updatedLead: Lead = {
        ...existing,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      };

      setLeads((prev) => prev.map((lead) => (lead.id === leadId ? updatedLead : lead)));
      pushToast(`Movido para "${nextStatus}"`, 'info');
      void syncInBackground(settings.appsScriptUrl, { action: 'update', lead: updatedLead });
    },
    [leads, pushToast, settings.appsScriptUrl, syncInBackground]
  );

  const incrementCall = useCallback(
    (leadId: string) => {
      const existing = leads.find((l) => l.id === leadId);
      if (!existing) return;

      lastLocalMutationAtRef.current = Date.now();
      const nextCount = (Number(existing.callCount) || 0) + 1;
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const timestamp = `${day}/${month}/${year} ${hours}:${minutes}`;

      const newLog: ServiceLog = {
        id: generateUuid(),
        timestamp,
        author: settings.activeUser,
        contactType: 'Ligação',
        targetStatus: existing.status,
        content: `Ligação #${nextCount} realizada`,
      };

      const updatedLead: Lead = {
        ...existing,
        callCount: nextCount,
        serviceLogs: [newLog, ...(existing.serviceLogs || [])],
        updatedAt: now.toISOString(),
      };

      setLeads((prev) => prev.map((lead) => (lead.id === leadId ? updatedLead : lead)));
      pushToast('+1 ligação registrada nos registros de atendimento', 'success');
      void syncInBackground(settings.appsScriptUrl, { action: 'update', lead: updatedLead });
    },
    [leads, pushToast, settings.activeUser, settings.appsScriptUrl, syncInBackground]
  );

  const deleteLead = useCallback(
    (leadId: string) => {
      lastLocalMutationAtRef.current = Date.now();
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      pushToast('Lead excluído', 'info');
      void syncInBackground(settings.appsScriptUrl, { action: 'delete', id: leadId });
    },
    [pushToast, settings.appsScriptUrl, syncInBackground]
  );

  const setActiveUser = useCallback(
    (user: string) => {
      setSettings((prev) => ({ ...prev, activeUser: user }));
      setPartnerConfirmed(true);
      if (isValidAppsScriptUrl(settings.appsScriptUrl)) {
        void silentRefreshFromSheets(settings.appsScriptUrl, user, false);
      }
    },
    [settings.appsScriptUrl, silentRefreshFromSheets]
  );

  const confirmActivePartner = useCallback(
    (partner: string) => {
      setSettings((prev) => ({ ...prev, activeUser: partner }));
      setPartnerConfirmed(true);
      pushToast(`Operando como ${partner}!`, 'success');
      if (isValidAppsScriptUrl(settings.appsScriptUrl)) {
        void silentRefreshFromSheets(settings.appsScriptUrl, partner, false);
      }
    },
    [pushToast, settings.appsScriptUrl, silentRefreshFromSheets]
  );

  const updateSettings = useCallback(
    (partial: Partial<AgencySettings>) => {
      lastLocalMutationAtRef.current = Date.now();
      const nextMembers = partial.teamMembers ?? settings.teamMembers;
      const oldMembers = settings.teamMembers;
      const targetUrl = (partial.appsScriptUrl ?? settings.appsScriptUrl).trim();

      const nextCompanyName =
        partial.companyName !== undefined ? partial.companyName : settings.companyName;
      const nextLogoUrl = partial.logoUrl !== undefined ? partial.logoUrl : settings.logoUrl;

      let updatedLeadsSnapshot: Lead[] | null = null;
      if (partial.teamMembers) {
        const renamed = leads.map((lead) => {
          if (lead.owner === oldMembers[0] && nextMembers[0] !== oldMembers[0]) {
            return { ...lead, owner: nextMembers[0], updatedAt: new Date().toISOString() };
          }
          if (lead.owner === oldMembers[1] && nextMembers[1] !== oldMembers[1]) {
            return { ...lead, owner: nextMembers[1], updatedAt: new Date().toISOString() };
          }
          return lead;
        });
        const anyRenamed = renamed.some((l, idx) => l !== leads[idx]);
        if (anyRenamed) {
          updatedLeadsSnapshot = renamed;
          setLeads(renamed);
        }
      }

      setSettings((prev) => {
        const nextActive = nextMembers.includes(partial.activeUser ?? prev.activeUser)
          ? (partial.activeUser ?? prev.activeUser)
          : nextMembers[0];

        return {
          ...prev,
          ...partial,
          teamMembers: nextMembers,
          activeUser: nextActive,
        };
      });

      const remotePayload: RemoteAgencySettings = {
        companyName: nextCompanyName,
        logoUrl: nextLogoUrl,
        teamMembers: nextMembers,
      };

      if (nextLogoUrl.length > 49000) {
        pushToast(
          'Configurações salvas localmente. Dica: logos acima de 48 KB não cabem em uma célula da planilha — use uma URL de imagem para sincronizar entre dispositivos.',
          'info'
        );
      } else {
        pushToast('Configurações salvas e sincronizadas!', 'success');
      }

      if (isValidAppsScriptUrl(targetUrl)) {
        if (updatedLeadsSnapshot) {
          void syncInBackground(targetUrl, {
            action: 'syncAll',
            leads: updatedLeadsSnapshot,
            settings: remotePayload,
          });
        } else {
          void syncInBackground(targetUrl, {
            action: 'syncSettings',
            settings: remotePayload,
          });
        }
      }
    },
    [leads, pushToast, settings.appsScriptUrl, settings.companyName, settings.logoUrl, settings.teamMembers, syncInBackground]
  );

  const syncFromSheets = useCallback(
    async (overrideUrl?: string): Promise<{ ok: boolean; message: string }> => {
      const targetUrl = (overrideUrl ?? settings.appsScriptUrl).trim();
      if (!isValidAppsScriptUrl(targetUrl)) {
        const message = 'Informe uma URL válida do Google Apps Script (https://script.google.com/.../exec).';
        pushToast(message, 'error');
        return { ok: false, message };
      }
      isSyncingRef.current = true;
      setIsSyncing(true);
      try {
        const workspace = await fetchWorkspaceFromSheets(targetUrl, settings.activeUser);
        const remoteLeads = workspace.leads;
        const remoteSettings = workspace.settings;
        let successMessage: string;
        const currentSettingsPayload: RemoteAgencySettings = {
          companyName: settings.companyName,
          logoUrl: settings.logoUrl,
          teamMembers: settings.teamMembers,
        };

        if (remoteLeads.length === 0 && leads.length > 0) {
          await postToSheets(targetUrl, {
            action: 'syncAll',
            leads,
            settings: remoteSettings ? undefined : currentSettingsPayload,
          });
          successMessage = 'Planilha conectada e leads iniciais enviados!';
          pushToast(successMessage, 'success');
        } else {
          const unparsedSet = new Set(workspace.unparsedServiceLogIds);
          const localBefore = leadsRef.current;
          setLeads((prev) =>
            mergeRemoteLeads(prev, remoteLeads, workspace.hasServiceLogsColumn, {
              deletedLogIds: deletedLogIdsRef.current,
              unparsedServiceLogIds: unparsedSet,
            })
          );
          reconcileCorruptedRemoteLogs(targetUrl, workspace.unparsedServiceLogIds, localBefore);
          if (!remoteSettings) {
            void postToSheets(targetUrl, {
              action: 'syncSettings',
              settings: currentSettingsPayload,
            }).catch(() => undefined);
          }
          successMessage = `Sincronizado com Google Sheets (${remoteLeads.length} leads)`;
          pushToast(successMessage, 'success');
        }

        const nowIso = new Date().toISOString();
        setSettings((prev) => ({
          ...mergeRemoteSettings(prev, remoteSettings, nowIso),
          appsScriptUrl: targetUrl,
        }));
        return { ok: true, message: successMessage };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido';
        const fullMessage = `Erro ao conectar planilha: ${msg}`;
        pushToast(fullMessage, 'error');
        return { ok: false, message: fullMessage };
      } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [
      leads,
      pushToast,
      reconcileCorruptedRemoteLogs,
      settings.activeUser,
      settings.appsScriptUrl,
      settings.companyName,
      settings.logoUrl,
      settings.teamMembers,
    ]
  );

  const pushAllToSheets = useCallback(
    async (overrideUrl?: string): Promise<{ ok: boolean; message: string }> => {
      const targetUrl = (overrideUrl ?? settings.appsScriptUrl).trim();
      if (!isValidAppsScriptUrl(targetUrl)) {
        const message = 'Configure a URL da planilha antes de enviar.';
        pushToast(message, 'error');
        return { ok: false, message };
      }
      isSyncingRef.current = true;
      setIsSyncing(true);
      try {
        await postToSheets(targetUrl, {
          action: 'syncAll',
          leads,
          settings: {
            companyName: settings.companyName,
            logoUrl: settings.logoUrl,
            teamMembers: settings.teamMembers,
          },
        });
        setSettings((prev) => ({
          ...prev,
          appsScriptUrl: targetUrl,
          lastSyncedAt: new Date().toISOString(),
        }));
        const successMessage = 'Todos os leads e configurações enviados para a planilha!';
        pushToast(successMessage, 'success');
        return { ok: true, message: successMessage };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao enviar';
        const fullMessage = `Erro ao enviar dados: ${msg}`;
        pushToast(fullMessage, 'error');
        return { ok: false, message: fullMessage };
      } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [
      leads,
      pushToast,
      settings.appsScriptUrl,
      settings.companyName,
      settings.logoUrl,
      settings.teamMembers,
    ]
  );

  const resetDemoData = useCallback(() => {
    lastLocalMutationAtRef.current = Date.now();
    const fresh = createSeedLeads();
    setLeads(fresh);
    pushToast('Leads de exemplo restaurados!', 'info');
    if (isValidAppsScriptUrl(settings.appsScriptUrl)) {
      void syncInBackground(settings.appsScriptUrl, { action: 'syncAll', leads: fresh });
    }
  }, [pushToast, settings.appsScriptUrl, syncInBackground]);

  const refreshOnLeadOpen = useCallback(() => {
    if (!isValidAppsScriptUrl(settings.appsScriptUrl)) return;
    const now = Date.now();
    if (now - lastOpenRefreshAtRef.current < 2500) return;
    lastOpenRefreshAtRef.current = now;
    void silentRefreshFromSheets(settings.appsScriptUrl, settings.activeUser, false, {
      ignoreGrace: true,
    });
  }, [settings.activeUser, settings.appsScriptUrl, silentRefreshFromSheets]);

  const refreshLeadNow = useCallback(async () => {
    if (!isValidAppsScriptUrl(settings.appsScriptUrl)) return;
    await syncWriteQueueRef.current;
    await silentRefreshFromSheets(settings.appsScriptUrl, settings.activeUser, true, {
      ignoreGrace: true,
    });
  }, [settings.activeUser, settings.appsScriptUrl, silentRefreshFromSheets]);

  return {
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
  };
}
