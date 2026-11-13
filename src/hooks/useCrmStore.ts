import { useCallback, useEffect, useRef, useState } from 'react';
import { createSeedLeads, DEFAULT_SETTINGS } from '../data/seedLeads';
import { AgencySettings, Lead, LeadStatus, ToastMessage } from '../types/crm';
import { appendDatedNote, generateUuid } from '../utils/crmLogic';
import {
  fetchWorkspaceFromSheets,
  isValidAppsScriptUrl,
  postToSheets,
  RemoteAgencySettings,
  SyncActionPayload,
} from '../utils/sheetsSync';

const LEADS_STORAGE_KEY = 'prospeccao_crm_leads_v1';
const SETTINGS_STORAGE_KEY = 'prospeccao_crm_settings_v1';
const AUTO_POLL_INTERVAL_MS = 12000;
const MUTATION_GRACE_MS = 4500;

interface StoredAgencySettings extends AgencySettings {
  logoRemoved?: boolean;
  brandVersion?: number;
}

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
        }));
      }
    }
  } catch {
    // fallback to seed
  }
  return createSeedLeads();
}

function loadInitialSettings(): AgencySettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredAgencySettings>;
      const members: [string, string] =
        Array.isArray(parsed.teamMembers) && parsed.teamMembers.length === 2
          ? [
              String(parsed.teamMembers[0] || 'Sócio 1'),
              String(parsed.teamMembers[1] || 'Sócio 2'),
            ]
          : DEFAULT_SETTINGS.teamMembers;

      const isLegacyBrand = !parsed.brandVersion || parsed.brandVersion < 2;
      const rawName = (parsed.companyName || '').trim();
      const companyName =
        !rawName || (isLegacyBrand && rawName === 'Sua Agência')
          ? DEFAULT_SETTINGS.companyName
          : rawName;

      const logoUrl =
        parsed.logoUrl && parsed.logoUrl.trim()
          ? parsed.logoUrl.trim()
          : parsed.logoRemoved
            ? ''
            : DEFAULT_SETTINGS.logoUrl;

      const appsScriptUrl =
        parsed.appsScriptUrl && parsed.appsScriptUrl.trim()
          ? parsed.appsScriptUrl.trim()
          : DEFAULT_SETTINGS.appsScriptUrl;

      return {
        companyName,
        logoUrl,
        teamMembers: members,
        activeUser:
          parsed.activeUser && members.includes(parsed.activeUser)
            ? parsed.activeUser
            : members[0],
        appsScriptUrl,
        lastSyncedAt: parsed.lastSyncedAt || null,
      };
    }
  } catch {
    // fallback to defaults
  }
  return DEFAULT_SETTINGS;
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
  const [settings, setSettings] = useState<AgencySettings>(loadInitialSettings);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const isSyncingRef = useRef(false);
  const lastLocalMutationAtRef = useRef(0);
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
      const toStore: StoredAgencySettings = {
        ...settings,
        brandVersion: 2,
        logoRemoved: settings.logoUrl === '',
      };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(toStore));
    } catch {
      // ignore storage quota errors
    }
  }, [settings]);

  const syncInBackground = useCallback(
    async (url: string, payload: SyncActionPayload) => {
      if (!isValidAppsScriptUrl(url)) return;
      try {
        await postToSheets(url, payload);
        setSettings((prev) => ({ ...prev, lastSyncedAt: new Date().toISOString() }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Falha na conexão';
        pushToast(`Salvo localmente, mas erro ao sincronizar: ${msg}`, 'error');
      }
    },
    [pushToast]
  );

  const silentRefreshFromSheets = useCallback(
    async (targetUrl: string, fallbackOwner: string, showFailureToast: boolean) => {
      if (!isValidAppsScriptUrl(targetUrl)) return;
      if (isSyncingRef.current) return;
      if (Date.now() - lastLocalMutationAtRef.current < MUTATION_GRACE_MS) return;

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
          setLeads(workspace.leads);
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
    [pushToast]
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
      const stamped: Lead = {
        ...updated,
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
      const updatedLead: Lead = {
        ...existing,
        callCount: nextCount,
        notes: appendDatedNote(
          existing.notes,
          `Ligação #${nextCount} realizada (${settings.activeUser})`
        ),
        updatedAt: new Date().toISOString(),
      };

      setLeads((prev) => prev.map((lead) => (lead.id === leadId ? updatedLead : lead)));
      pushToast('+1 ligação registrada', 'success');
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

  const setActiveUser = useCallback((user: string) => {
    setSettings((prev) => ({ ...prev, activeUser: user }));
  }, []);

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
          setLeads(remoteLeads);
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

  return {
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
  };
}
