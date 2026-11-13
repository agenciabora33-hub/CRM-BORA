import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

interface ProxyRequestBody {
  url?: string;
  method?: 'GET' | 'POST';
  payload?: unknown;
}

function validateScriptUrl(rawUrl: string): { valid: true; url: string } | { valid: false; error: string } {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: false, error: 'Informe a URL do Web App do Google Apps Script.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'A URL informada é inválida. Ela deve começar com https://script.google.com/...' };
  }

  if (parsed.protocol !== 'https:') {
    return { valid: false, error: 'A URL do Google Apps Script deve usar HTTPS.' };
  }

  if (parsed.hostname === 'docs.google.com') {
    return {
      valid: false,
      error:
        'Você colou o link da planilha do Google Sheets. É necessário colar a URL do App da Web gerada em Extensões > Apps Script > Implantar (termina em /exec).',
    };
  }

  if (parsed.hostname !== 'script.google.com' && parsed.hostname !== 'script.googleusercontent.com') {
    return {
      valid: false,
      error: 'A URL deve pertencer ao domínio script.google.com (Web App do Google Apps Script).',
    };
  }

  if (parsed.pathname.endsWith('/dev')) {
    return {
      valid: false,
      error:
        'Você colou a URL de teste (/dev), que exige login na sua conta Google. Use a URL de produção que termina em /exec.',
    };
  }

  return { valid: true, url: parsed.toString() };
}

function diagnoseHtmlResponse(html: string, finalUrl: string): string {
  const lower = html.toLowerCase();
  if (
    finalUrl.includes('accounts.google.com') ||
    lower.includes('servicelogin') ||
    lower.includes('accounts.google.com') ||
    lower.includes('fazer login') ||
    lower.includes('sign in')
  ) {
    return 'O Google exigiu login para acessar o script. No Apps Script, vá em Implantar > Gerenciar implantações > Editar, mude "Quem pode acessar" para "Qualquer pessoa" e clique em Implantar.';
  }

  if (lower.includes('script function not found') || lower.includes('função de script não encontrada')) {
    return 'A função doGet/doPost não foi encontrada no Apps Script. Cole todo o código Code.gs, salve e faça uma Nova implantação.';
  }

  if (lower.includes('page not found') || lower.includes('página não encontrada') || lower.includes('não existe')) {
    return 'URL de implantação não encontrada. Verifique se copiou a URL completa do App da Web (/exec).';
  }

  return 'O Google Apps Script retornou uma página HTML em vez de JSON. Verifique se o código Code.gs foi salvo e publicado em uma Nova implantação com acesso para "Qualquer pessoa".';
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  app.post('/api/sheets-proxy', async (req, res) => {
    const body = (req.body || {}) as ProxyRequestBody;
    const rawUrl = typeof body.url === 'string' ? body.url : '';
    const method = body.method === 'POST' ? 'POST' : 'GET';

    const validation = validateScriptUrl(rawUrl);
    if (!validation.valid) {
      res.status(400).json({ ok: false, error: validation.error });
      return;
    }

    try {
      const fetchOptions: RequestInit = {
        method,
        redirect: 'follow',
        headers:
          method === 'POST'
            ? { 'Content-Type': 'text/plain;charset=utf-8' }
            : { Accept: 'application/json' },
        ...(method === 'POST' ? { body: JSON.stringify(body.payload ?? {}) } : {}),
      };

      const upstream = await fetch(validation.url, fetchOptions);
      const text = await upstream.text();

      try {
        const json = JSON.parse(text) as { ok?: boolean; error?: string };
        res.status(upstream.ok ? 200 : upstream.status).json(json);
        return;
      } catch {
        const message = diagnoseHtmlResponse(text, upstream.url || '');
        res.status(502).json({ ok: false, error: message });
        return;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro de rede ao acessar o Google Apps Script.';
      res.status(502).json({
        ok: false,
        error: `Não foi possível conectar ao Google Apps Script (${msg}). Verifique sua conexão e a URL informada.`,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CRM server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
