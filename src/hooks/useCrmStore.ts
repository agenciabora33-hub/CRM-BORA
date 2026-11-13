import { useCallback, useEffect, useState } from 'react';
import { createSeedLeads, DEFAULT_SETTINGS } from '../data/seedLeads';
import { AgencySettings, Lead, LeadStatus, ToastMessage } from '../types/crm';
import { appendDatedNote, generateUuid } from '../utils/crmLogic';
import { fetchLeadsFromSheets, isValidAppsScriptUrl, postToSheets } from '../utils/sheetsSync';

const LEADS_STORAGE_KEY = 'prospeccao_crm_leads_v1';
const SETTINGS_STORAGE_KEY = 'prospeccao_crm_settings_v1';

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
      const parsed = JSON.parse(raw) as Partial<AgencySettings>;
      const members: [string, string] =
        Array.isArray(parsed.teamMembers) && parsed.teamMembers.length === 2
          ? [
              String(parsed.teamMembers[0] || 'Sócio 1'),
              String(parsed.teamMembers[1] || 'Sócio 2'),
            ]
          : DEFAULT_SETTINGS.teamMembers;
      return {
        companyName: parsed.companyName || DEFAULT_SETTINGS.companyName,
        logoUrl: parsed.logoUrl || '',
        teamMembers: members,
        activeUser:
          parsed.activeUser && members.includes(parsed.activeUser)
            ? parsed.activeUser
            : members[0],
        appsScriptUrl: parsed.appsScriptUrl || '',
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

export function useCrmStore() {
  const [leads, setLeads] = useState<Lead[]>(loadInitialLeads);
  const [settings, setSettings] = useState<AgencySettings>(loadInitialSettings);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

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
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore storage quota errors
    }
  }, [settings]);

  const syncInBackground = useCallback(
    async (
      url: string,
      payload:
        | { action: 'create'; lead: Lead }
        | { action: 'update'; lead: Lead }
        | { action: 'delete'; id: string }
    ) => {
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

  // Initial background fetch when connected on mount
  useEffect(() => {
    if (!isValidAppsScriptUrl(settings.appsScriptUrl)) return;
    let cancelled = false;
    setIsSyncing(true);
    fetchLeadsFromSheets(settings.appsScriptUrl, settings.activeUser)
      .then((remoteLeads) => {
        if (cancelled) return;
        if (remoteLeads.length > 0) {
          setLeads(remoteLeads);
        }
        setSettings((prev) => ({ ...prev, lastSyncedAt: new Date().toISOString() }));
      })
      .catch(() => {
        if (!cancelled) {
          pushToast('Não foi possível atualizar da planilha ao abrir. Usando cache local.', 'info');
        }
      })
      .finally(() => {
        if (!cancelled) setIsSyncing(false);
      });
    return () => {
      cancelled = true;
    };
    // Only run on initial mount if already configured
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createLead = useCallback(
    (input: NewLeadInput): Lead => {
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
      const nextMembers = partial.teamMembers ?? settings.teamMembers;
      const oldMembers = settings.teamMembers;

      // If partner names were renamed, update matching lead owners outside setSettings updater
      if (partial.teamMembers) {
        setLeads((currLeads) =>
          currLeads.map((lead) => {
            if (lead.owner === oldMembers[0] && nextMembers[0] !== oldMembers[0]) {
              return { ...lead, owner: nextMembers[0] };
            }
            if (lead.owner === oldMembers[1] && nextMembers[1] !== oldMembers[1]) {
              return { ...lead, owner: nextMembers[1] };
            }
            return lead;
          })
        );
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
      pushToast('Configurações salvas!', 'success');
    },
    [pushToast, settings.teamMembers]
  );

  const syncFromSheets = useCallback(
    async (overrideUrl?: string): Promise<{ ok: boolean; message: string }> => {
      const targetUrl = (overrideUrl ?? settings.appsScriptUrl).trim();
      if (!isValidAppsScriptUrl(targetUrl)) {
        const message = 'Informe uma URL válida do Google Apps Script (https://script.google.com/.../exec).';
        pushToast(message, 'error');
        return { ok: false, message };
      }
      setIsSyncing(true);
      try {
        const remoteLeads = await fetchLeadsFromSheets(targetUrl, settings.activeUser);
        let successMessage: string;
        if (remoteLeads.length === 0 && leads.length > 0) {
          // Remote sheet is empty on first connection: upload local leads automatically
          await postToSheets(targetUrl, { action: 'syncAll', leads });
          successMessage = 'Planilha conectada e leads iniciais enviados!';
          pushToast(successMessage, 'success');
        } else {
          setLeads(remoteLeads);
          successMessage = `Sincronizado com Google Sheets (${remoteLeads.length} leads)`;
          pushToast(successMessage, 'success');
        }
        setSettings((prev) => ({
          ...prev,
          appsScriptUrl: targetUrl,
          lastSyncedAt: new Date().toISOString(),
        }));
        return { ok: true, message: successMessage };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido';
        const fullMessage = `Erro ao conectar planilha: ${msg}`;
        pushToast(fullMessage, 'error');
        return { ok: false, message: fullMessage };
      } finally {
        setIsSyncing(false);
      }
    },
    [leads, pushToast, settings.activeUser, settings.appsScriptUrl]
  );

  const pushAllToSheets = useCallback(
    async (overrideUrl?: string): Promise<{ ok: boolean; message: string }> => {
      const targetUrl = (overrideUrl ?? settings.appsScriptUrl).trim();
      if (!isValidAppsScriptUrl(targetUrl)) {
        const message = 'Configure a URL da planilha antes de enviar.';
        pushToast(message, 'error');
        return { ok: false, message };
      }
      setIsSyncing(true);
      try {
        await postToSheets(targetUrl, { action: 'syncAll', leads });
        setSettings((prev) => ({
          ...prev,
          appsScriptUrl: targetUrl,
          lastSyncedAt: new Date().toISOString(),
        }));
        const successMessage = 'Todos os leads locais enviados para a planilha!';
        pushToast(successMessage, 'success');
        return { ok: true, message: successMessage };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao enviar';
        const fullMessage = `Erro ao enviar dados: ${msg}`;
        pushToast(fullMessage, 'error');
        return { ok: false, message: fullMessage };
      } finally {
        setIsSyncing(false);
      }
    },
    [leads, pushToast, settings.appsScriptUrl]
  );

  const resetDemoData = useCallback(() => {
    const fresh = createSeedLeads();
    setLeads(fresh);
    pushToast('Leads de exemplo restaurados!', 'info');
  }, [pushToast]);

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
