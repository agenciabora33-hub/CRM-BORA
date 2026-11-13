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
  payload?: SyncActionPayload
): Promise<{ handled: boolean; data?: T }> {
  try {
    const proxyRes = await fetch('/api/sheets-proxy', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: url.trim(), method, payload }),
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
  error?: string;
}

function fetchLeadsViaJsonp(url: string): Promise<SheetsGetResponse> {
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

export async function fetchLeadsFromSheets(url: string, fallbackOwner: string): Promise<Lead[]> {
  const check = validateAppsScriptUrl(url);
  if (!check.valid) {
    throw new Error(check.reason || 'URL do Google Apps Script inválida.');
  }

  const proxied = await callViaProxy<SheetsGetResponse>(check.normalizedUrl, 'GET');

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

    const data = (await response.json()) as SheetsGetResponse;
    if (data.ok === false) {
      throw new Error(data.error || 'O Apps Script retornou um erro.');
    }

    const rawLeads = Array.isArray(data.leads) ? data.leads : [];
    return rawLeads.map((item) => normalizeLeadFromRemote(item, fallbackOwner));
  } catch (directErr) {
    // If browser CORS blocked direct fetch, fall back to JSONP supported by Code.gs
    if (
      directErr instanceof Error &&
      (directErr.name === 'TypeError' || directErr.message.toLowerCase().includes('failed to fetch'))
    ) {
      try {
        const jsonpData = await fetchLeadsViaJsonp(check.normalizedUrl);
        if (jsonpData.ok === false) {
          throw new Error(jsonpData.error || 'O Apps Script retornou um erro.');
        }
        const rawLeads = Array.isArray(jsonpData.leads) ? jsonpData.leads : [];
        return rawLeads.map((item) => normalizeLeadFromRemote(item, fallbackOwner));
      } catch (jsonpErr) {
        throw formatDirectFetchError(jsonpErr);
      }
    }
    throw formatDirectFetchError(directErr);
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
          body: JSON.stringify(payload),
        });
        return;
      } catch (noCorsErr) {
        throw formatDirectFetchError(noCorsErr);
      }
    }
    throw formatDirectFetchError(directErr);
  }
}
