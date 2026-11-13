import { Lead } from '../types/crm';
import { normalizeLeadFromRemote } from './crmLogic';

export type SyncActionPayload =
  | { action: 'create'; lead: Lead }
  | { action: 'update'; lead: Lead }
  | { action: 'delete'; id: string }
  | { action: 'syncAll'; leads: Lead[] };

export function isValidAppsScriptUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' && parsed.hostname.includes('google.com');
  } catch {
    return false;
  }
}

export async function fetchLeadsFromSheets(url: string, fallbackOwner: string): Promise<Lead[]> {
  const response = await fetch(url.trim(), {
    method: 'GET',
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Erro HTTP ${response.status} ao consultar a planilha.`);
  }

  const data = (await response.json()) as { ok?: boolean; leads?: Record<string, unknown>[]; error?: string };
  if (data.ok === false) {
    throw new Error(data.error || 'O Apps Script retornou um erro.');
  }

  const rawLeads = Array.isArray(data.leads) ? data.leads : [];
  return rawLeads.map((item) => normalizeLeadFromRemote(item, fallbackOwner));
}

export async function postToSheets(url: string, payload: SyncActionPayload): Promise<void> {
  const response = await fetch(url.trim(), {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    redirect: 'follow',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Erro HTTP ${response.status} ao enviar dados para a planilha.`);
  }

  const data = (await response.json()) as { ok?: boolean; error?: string };
  if (data.ok === false) {
    throw new Error(data.error || 'Falha ao atualizar a planilha.');
  }
}
