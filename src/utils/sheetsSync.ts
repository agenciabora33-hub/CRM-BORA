import { Lead } from '../types/crm';
import { normalizeLeadFromRemote } from './crmLogic';

export interface RemoteAgencySettings {
  companyName?: string;
  logoUrl?: string;
  teamMembers?: [string, string];
  updatedAt?: string;
}

export interface SheetsFetchResult {
  leads: Lead[];
  settings: RemoteAgencySettings | null;
  hasServiceLogsColumn: boolean;
  unparsedServiceLogIds: string[];
}

export type SyncActionPayload =
  | { action: 'create'; lead: Lead }
  | { action: 'update'; lead: Lead }
  | { action: 'delete'; id: string }
  | { action: 'syncAll'; leads: Lead[]; settings?: RemoteAgencySettings }
  | { action: 'syncSettings'; settings: RemoteAgencySettings };

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

export function normalizeRemoteSettings(raw: unknown): RemoteAgencySettings | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const obj = raw as Record<string, unknown>;
  const normalized: RemoteAgencySettings = {};
  let hasData = false;

  if (typeof obj.companyName === 'string' && obj.companyName.trim()) {
    normalized.companyName = obj.companyName.trim();
    hasData = true;
  }

  if (typeof obj.logoUrl === 'string') {
    normalized.logoUrl = obj.logoUrl.trim();
    hasData = true;
  }

  if (Array.isArray(obj.teamMembers) && obj.teamMembers.length === 2) {
    const m1 = String(obj.teamMembers[0] ?? '').trim() || 'Cláudio';
    const m2 = String(obj.teamMembers[1] ?? '').trim() || 'Elis';
    normalized.teamMembers = [m1, m2];
    hasData = true;
  }

  if (typeof obj.updatedAt === 'string' && obj.updatedAt.trim()) {
    normalized.updatedAt = obj.updatedAt.trim();
  }

  return hasData ? normalized : null;
}

export function formatDirectFetchError(err: unknown): Error {
  if (err instanceof Error) {
    const msgLower = err.message.toLowerCase();
    if (
      err.name === 'TypeError' ||
      msgLower.includes('failed to fetch') ||
      msgLower.includes('load failed') ||
      msgLower.includes('networkerror') ||
      msgLower.includes('network request failed')
    ) {
      return new Error(
        'Bloqueio de conexão (CORS/Login). No Google Apps Script: clique em Implantar > Gerenciar implantações > Editar, selecione "Quem pode acessar: Qualquer pessoa", implante uma Nova versão e use a URL /exec.'
      );
    }
    return err;
  }
  return new Error('Erro de rede ao conectar com o Google Apps Script.');
}

async function callViaProxy<T>(
  url: string,
  method: 'GET' | 'POST',
  payload?: unknown
): Promise<{ handled: boolean; data?: T }> {
  try {
    const bodyStr = JSON.stringify({ url: url.trim(), method, payload });
    const proxyRes = await fetch('/api/sheets-proxy', {
      method: 'POST',
      credentials: 'include',
      keepalive: bodyStr.length < 60000,
      headers: {
        'Content-Type': 'application/json',
      },
      body: bodyStr,
    });

    // If running on a static-only host or redirected by hosting auth proxy, fall back cleanly
    if (proxyRes.status === 404 || proxyRes.status === 405 || proxyRes.type === 'opaqueredirect') {
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
    // Fall back to direct/JSONP path on network/proxy unavailability; re-throw explicit proxy JSON errors
    if (err instanceof Error && err.name !== 'TypeError') {
      const lower = err.message.toLowerCase();
      if (!lower.includes('failed to fetch') && !lower.includes('load failed') && !lower.includes('network')) {
        throw err;
      }
    }
    return { handled: false };
  }
}

interface SheetsGetResponse {
  ok?: boolean;
  leads?: Record<string, unknown>[];
  settings?: unknown;
  error?: string;
}

function fetchWorkspaceViaJsonp(url: string): Promise<SheetsGetResponse> {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('JSONP indisponível fora do navegador.'));
  }

  return new Promise((resolve, reject) => {
    const callbackName = `__crmSheetsCb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const win = window as unknown as Record<string, unknown>;
    const script = document.createElement('script');
    let settled = false;

    const cleanup = () => {
      try {
        delete win[callbackName];
      } catch {
        win[callbackName] = undefined;
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Tempo esgotado ao aguardar resposta JSONP do Google Apps Script.'));
    }, 12000);

    win[callbackName] = (data: SheetsGetResponse) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanup();
      reject(new TypeError('Failed to fetch'));
    };

    const target = new URL(url);
    target.searchParams.set('callback', callbackName);
    target.searchParams.set('_ts', String(Date.now()));
    script.src = target.toString();
    script.async = true;
    document.head.appendChild(script);
  });
}

export function serializeLeadForSheets(lead: Lead): Record<string, unknown> {
  const logs = Array.isArray(lead.serviceLogs) ? [...lead.serviceLogs] : [];
  let serializedLogs = JSON.stringify(logs);
  while (serializedLogs.length > 48000 && logs.length > 1) {
    logs.pop();
    serializedLogs = JSON.stringify(logs);
  }
  return {
    ...lead,
    serviceLogs: serializedLogs,
  };
}

export function serializePayloadForSheets(payload: SyncActionPayload): Record<string, unknown> {
  if (payload.action === 'create' || payload.action === 'update') {
    return {
      ...payload,
      lead: serializeLeadForSheets(payload.lead),
    };
  }
  if (payload.action === 'syncAll') {
    return {
      ...payload,
      leads: payload.leads.map(serializeLeadForSheets),
    };
  }
  return payload as unknown as Record<string, unknown>;
}

function parseWorkspaceResponse(data: SheetsGetResponse, fallbackOwner: string): SheetsFetchResult {
  const rawLeads = Array.isArray(data.leads) ? data.leads : [];
  const hasServiceLogsColumn = rawLeads.some((item) =>
    Object.prototype.hasOwnProperty.call(item, 'serviceLogs')
  );
  const unparsedServiceLogIds: string[] = [];
  const leads = rawLeads.map((item) => {
    const normalized = normalizeLeadFromRemote(item, fallbackOwner);
    const rawLogs = item.serviceLogs;
    if (
      typeof rawLogs === 'string' &&
      rawLogs.trim() !== '' &&
      rawLogs.trim() !== '[]' &&
      (normalized.serviceLogs?.length ?? 0) === 0
    ) {
      unparsedServiceLogIds.push(normalized.id);
    }
    return normalized;
  });

  return {
    leads,
    settings: normalizeRemoteSettings(data.settings),
    hasServiceLogsColumn,
    unparsedServiceLogIds,
  };
}

export async function fetchWorkspaceFromSheets(
  url: string,
  fallbackOwner: string
): Promise<SheetsFetchResult> {
  const check = validateAppsScriptUrl(url);
  if (!check.valid) {
    throw new Error(check.reason || 'URL do Google Apps Script inválida.');
  }

  const proxied = await callViaProxy<SheetsGetResponse>(check.normalizedUrl, 'GET');

  if (proxied.handled && proxied.data) {
    return parseWorkspaceResponse(proxied.data, fallbackOwner);
  }

  try {
    const response = await fetch(check.normalizedUrl, {
      method: 'GET',
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status} ao consultar a planilha.`);
    }

    const data = (await response.json()) as SheetsGetResponse;
    if (data.ok === false) {
      throw new Error(data.error || 'O Apps Script retornou um erro.');
    }

    return parseWorkspaceResponse(data, fallbackOwner);
  } catch (directErr) {
    // If browser CORS blocked direct fetch, fall back to JSONP supported by Code.gs
    if (
      directErr instanceof Error &&
      (directErr.name === 'TypeError' || directErr.message.toLowerCase().includes('failed to fetch'))
    ) {
      try {
        const jsonpData = await fetchWorkspaceViaJsonp(check.normalizedUrl);
        if (jsonpData.ok === false) {
          throw new Error(jsonpData.error || 'O Apps Script retornou um erro.');
        }
        return parseWorkspaceResponse(jsonpData, fallbackOwner);
      } catch (jsonpErr) {
        throw formatDirectFetchError(jsonpErr);
      }
    }
    throw formatDirectFetchError(directErr);
  }
}

export async function fetchLeadsFromSheets(url: string, fallbackOwner: string): Promise<Lead[]> {
  const result = await fetchWorkspaceFromSheets(url, fallbackOwner);
  return result.leads;
}

export async function postToSheets(url: string, payload: SyncActionPayload): Promise<void> {
  const check = validateAppsScriptUrl(url);
  if (!check.valid) {
    throw new Error(check.reason || 'URL do Google Apps Script inválida.');
  }

  const wirePayload = serializePayloadForSheets(payload);

  const proxied = await callViaProxy<{ ok?: boolean; error?: string }>(
    check.normalizedUrl,
    'POST',
    wirePayload
  );
  if (proxied.handled) {
    return;
  }

  const serializedBody = JSON.stringify(wirePayload);

  try {
    const response = await fetch(check.normalizedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      redirect: 'follow',
      body: serializedBody,
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status} ao enviar dados para a planilha.`);
    }

    const data = (await response.json()) as { ok?: boolean; error?: string };
    if (data.ok === false) {
      throw new Error(data.error || 'Falha ao atualizar a planilha.');
    }
  } catch (directErr) {
    // When proxy is unavailable and Google Apps Script 302 redirect omits CORS headers,
    // no-cors still delivers the text/plain POST body cleanly to doPost(e).
    if (
      directErr instanceof Error &&
      (directErr.name === 'TypeError' || directErr.message.toLowerCase().includes('failed to fetch'))
    ) {
      try {
        await fetch(check.normalizedUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: serializedBody,
        });
        return;
      } catch (noCorsErr) {
        throw formatDirectFetchError(noCorsErr);
      }
    }
    throw formatDirectFetchError(directErr);
  }
}
