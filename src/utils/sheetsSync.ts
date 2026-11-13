import { Lead } from '../types/crm';
import { normalizeLeadFromRemote } from './crmLogic';

export type SyncActionPayload =
  | { action: 'create'; lead: Lead }
  | { action: 'update'; lead: Lead }
  | { action: 'delete'; id: string }
  | { action: 'syncAll'; leads: Lead[] };

export function validateAppsScriptUrl(
  url: string
): { valid: true; normalizedUrl: string } | { valid: false; reason: string } {
  const trimmed = url.trim();
  if (!trimmed) {
    return { valid: false, reason: '' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      valid: false,
      reason: 'URL inválida. Cole o endereço completo começando com https://script.google.com/...',
    };
  }

  if (parsed.protocol !== 'https:') {
    return { valid: false, reason: 'A URL do Apps Script deve começar com https://' };
  }

  if (parsed.hostname === 'docs.google.com') {
    return {
      valid: false,
      reason:
        'Esse é o link da planilha. Use a URL do App da Web gerada em Extensões > Apps Script > Implantar (termina em /exec).',
    };
  }

  if (parsed.hostname !== 'script.google.com' && parsed.hostname !== 'script.googleusercontent.com') {
    return {
      valid: false,
      reason: 'A URL precisa ser do domínio script.google.com (App da Web do Google Apps Script).',
    };
  }

  if (parsed.pathname.endsWith('/dev')) {
    return {
      valid: false,
      reason:
        'URL de teste (/dev) exige login Google e bloqueia o CRM. Implante como App da Web e copie a URL que termina em /exec.',
    };
  }

  return { valid: true, normalizedUrl: parsed.toString() };
}

export function isValidAppsScriptUrl(url: string): boolean {
  return validateAppsScriptUrl(url).valid;
}

async function callViaProxy<T>(
  url: string,
  method: 'GET' | 'POST',
  payload?: SyncActionPayload
): Promise<{ handled: boolean; data?: T }> {
  try {
    const proxyRes = await fetch('/api/sheets-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: url.trim(), method, payload }),
    });

    // If running on a static-only host without Express backend, fall back to direct fetch
    if (proxyRes.status === 404 || proxyRes.status === 405) {
      return { handled: false };
    }

    const contentType = proxyRes.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { handled: false };
    }

    const json = (await proxyRes.json()) as T & { ok?: boolean; error?: string };
    if (!proxyRes.ok || json.ok === false) {
      throw new Error(json.error || `Erro HTTP ${proxyRes.status} ao comunicar com a planilha.`);
    }

    return { handled: true, data: json };
  } catch (err) {
    // Re-throw explicit application/validation errors from proxy
    if (err instanceof Error && !err.message.includes('Failed to fetch')) {
      throw err;
    }
    return { handled: false };
  }
}

function formatDirectFetchError(err: unknown): Error {
  if (err instanceof Error) {
    if (err.message.toLowerCase().includes('failed to fetch') || err.name === 'TypeError') {
      return new Error(
        'Bloqueio de conexão (CORS/Login). Confirme no Google Apps Script: Implantar > Gerenciar implantações > "Quem pode acessar: Qualquer pessoa" e use a URL /exec.'
      );
    }
    return err;
  }
  return new Error('Erro de rede ao conectar com o Google Apps Script.');
}

export async function fetchLeadsFromSheets(url: string, fallbackOwner: string): Promise<Lead[]> {
  const check = validateAppsScriptUrl(url);
  if (!check.valid) {
    throw new Error(check.reason || 'URL do Google Apps Script inválida.');
  }

  const proxied = await callViaProxy<{ ok?: boolean; leads?: Record<string, unknown>[]; error?: string }>(
    check.normalizedUrl,
    'GET'
  );

  if (proxied.handled && proxied.data) {
    const rawLeads = Array.isArray(proxied.data.leads) ? proxied.data.leads : [];
    return rawLeads.map((item) => normalizeLeadFromRemote(item, fallbackOwner));
  }

  try {
    const response = await fetch(check.normalizedUrl, {
      method: 'GET',
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status} ao consultar a planilha.`);
    }

    const data = (await response.json()) as {
      ok?: boolean;
      leads?: Record<string, unknown>[];
      error?: string;
    };
    if (data.ok === false) {
      throw new Error(data.error || 'O Apps Script retornou um erro.');
    }

    const rawLeads = Array.isArray(data.leads) ? data.leads : [];
    return rawLeads.map((item) => normalizeLeadFromRemote(item, fallbackOwner));
  } catch (err) {
    throw formatDirectFetchError(err);
  }
}

export async function postToSheets(url: string, payload: SyncActionPayload): Promise<void> {
  const check = validateAppsScriptUrl(url);
  if (!check.valid) {
    throw new Error(check.reason || 'URL do Google Apps Script inválida.');
  }

  const proxied = await callViaProxy<{ ok?: boolean; error?: string }>(
    check.normalizedUrl,
    'POST',
    payload
  );
  if (proxied.handled) {
    return;
  }

  try {
    const response = await fetch(check.normalizedUrl, {
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
  } catch (err) {
    throw formatDirectFetchError(err);
  }
}
