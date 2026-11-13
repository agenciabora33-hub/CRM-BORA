import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Database,
  RefreshCw,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { AgencySettings } from '../types/crm';
import { APPS_SCRIPT_CODE } from '../utils/appsScriptTemplate';
import { formatDateBR } from '../utils/crmLogic';
import { validateAppsScriptUrl } from '../utils/sheetsSync';

interface SyncResult {
  ok: boolean;
  message: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  settings: AgencySettings;
  isSyncing: boolean;
  onClose: () => void;
  onSaveSettings: (partial: Partial<AgencySettings>) => void;
  onTestAndSync: (url: string) => Promise<SyncResult>;
  onPushAll: (url?: string) => Promise<SyncResult>;
  onResetDemoData: () => void;
  onCopiedScript: () => void;
}

function compressImageDataUrl(rawDataUrl: string): Promise<string> {
  if (rawDataUrl.length <= 42000) {
    return Promise.resolve(rawDataUrl);
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxWidth = 360;
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(rawDataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const compressed = canvas.toDataURL('image/webp', 0.85);
      resolve(compressed.length < rawDataUrl.length ? compressed : rawDataUrl);
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

export function SettingsModal({
  isOpen,
  settings,
  isSyncing,
  onClose,
  onSaveSettings,
  onTestAndSync,
  onPushAll,
  onResetDemoData,
  onCopiedScript,
}: SettingsModalProps) {
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl);
  const [member1, setMember1] = useState(settings.teamMembers[0]);
  const [member2, setMember2] = useState(settings.teamMembers[1]);
  const [appsScriptUrl, setAppsScriptUrl] = useState(settings.appsScriptUrl);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [syncFeedback, setSyncFeedback] = useState<SyncResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCompanyName(settings.companyName);
      setLogoUrl(settings.logoUrl);
      setMember1(settings.teamMembers[0]);
      setMember2(settings.teamMembers[1]);
      setAppsScriptUrl(settings.appsScriptUrl);
      setLogoError('');
      setSyncFeedback(null);
    }
    // Reset local draft fields only when the modal is opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setLogoError('A imagem deve ter no máximo 1 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        const optimized = await compressImageDataUrl(reader.result);
        setLogoUrl(optimized);
        setLogoError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_CODE);
      setCopiedCode(true);
      onCopiedScript();
      window.setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      setShowCode(true);
    }
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    const m1 = member1.trim() || 'Cláudio';
    const m2 = member2.trim() || 'Elis';
    onSaveSettings({
      companyName: companyName.trim() || 'Bora CRM',
      logoUrl: logoUrl.trim(),
      teamMembers: [m1, m2],
      appsScriptUrl: appsScriptUrl.trim(),
    });
    onClose();
  };

  const urlValidation = validateAppsScriptUrl(appsScriptUrl);
  const urlIsValid = urlValidation.valid;

  const inputClass =
    'w-full rounded-md border border-zinc-800 bg-[#09090B] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-[2px] p-4"
    >
      <div className="bg-[#111114] border border-zinc-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 id="settings-modal-title" className="font-display text-base font-bold tracking-tight text-zinc-50">
              Conectar Planilha & Configurações
            </h2>
            <p className="text-xs text-zinc-400">
              Alterações na agência, sócios e logo sincronizam em tempo real para toda a equipe.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar configurações"
            className="p-1.5 rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body + Pinned Footer */}
        <form onSubmit={handleSaveGeneral} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
            {/* Section 1: Agency & Team */}
            <div className="flex flex-col gap-3.5">
              <h3 className="font-display text-sm font-semibold tracking-tight text-zinc-100">
                Identidade da Agência e Dupla de Vendas
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label htmlFor="cfg-company" className="block text-xs font-medium text-zinc-200 mb-1">
                    Nome da Empresa / Agência
                  </label>
                  <input
                    id="cfg-company"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: Bora CRM"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="cfg-m1" className="block text-xs font-medium text-zinc-200 mb-1">
                    Vendedor / Sócio 1
                  </label>
                  <input
                    id="cfg-m1"
                    type="text"
                    value={member1}
                    onChange={(e) => setMember1(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="cfg-m2" className="block text-xs font-medium text-zinc-200 mb-1">
                    Vendedor / Sócio 2
                  </label>
                  <input
                    id="cfg-m2"
                    type="text"
                    value={member2}
                    onChange={(e) => setMember2(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Logo Upload / URL */}
              <div className="rounded-lg border border-zinc-800 bg-[#09090B]/70 p-3.5 flex flex-col gap-3">
                <span className="text-xs font-medium text-zinc-200">Logo da Empresa</span>
                <div className="flex flex-wrap items-center gap-3">
                  {logoUrl ? (
                    <div className="h-11 px-2.5 py-1 rounded-md border border-zinc-800 bg-black flex items-center justify-center shrink-0">
                      <img
                        src={logoUrl}
                        alt="Prévia da logo"
                        referrerPolicy="no-referrer"
                        className="h-8 w-auto max-w-[140px] object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-11 px-3 rounded-md border border-zinc-800 bg-black flex items-center justify-center shrink-0">
                      <span className="font-display font-extrabold text-sm tracking-tight text-white">
                        bora<span className="text-[#F97316]">&gt;&gt;</span>
                      </span>
                    </div>
                  )}

                  <label className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-[#18181B] hover:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-100 cursor-pointer">
                    <Upload className="h-3.5 w-3.5 text-[#F97316]" />
                    <span>Enviar PNG/JPG/SVG</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={handleFileUpload}
                      className="sr-only"
                    />
                  </label>

                  {logoUrl !== '/logo.jpg' && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('/logo.jpg')}
                      className="text-xs text-orange-400 hover:text-orange-300 hover:underline cursor-pointer"
                    >
                      Usar logo Bora padrão
                    </button>
                  )}

                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="inline-flex items-center gap-1 text-xs text-red-400 hover:underline cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remover logo</span>
                    </button>
                  )}
                </div>

                <div>
                  <label htmlFor="cfg-logo-url" className="block text-[11px] text-zinc-400 mb-1">
                    Ou cole a URL da logo (recomendado para sincronizar entre dispositivos):
                  </label>
                  <input
                    id="cfg-logo-url"
                    type="text"
                    value={logoUrl.startsWith('data:') ? '' : logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://i.ibb.co/.../logo.jpg ou /logo.jpg"
                    className="w-full rounded-md border border-zinc-800 bg-[#09090B] px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                {logoError && <p className="text-xs text-red-400">{logoError}</p>}
              </div>
            </div>

            {/* Section 2: Google Sheets Integration */}
            <div className="pt-4 border-t border-zinc-800 flex flex-col gap-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-[#F97316]" />
                  <h3 className="font-display text-sm font-semibold tracking-tight text-zinc-100">
                    Integração em Tempo Real com Google Sheets
                  </h3>
                </div>
                {settings.lastSyncedAt && (
                  <span className="text-[11px] font-mono tabular-nums text-zinc-400">
                    Última sinc.: {formatDateBR(settings.lastSyncedAt)}
                  </span>
                )}
              </div>

              <div>
                <label htmlFor="cfg-sheets-url" className="block text-xs font-medium text-zinc-200 mb-1">
                  URL do Web App do Google Apps Script
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="cfg-sheets-url"
                    type="url"
                    value={appsScriptUrl}
                    onChange={(e) => {
                      setAppsScriptUrl(e.target.value);
                      if (syncFeedback) setSyncFeedback(null);
                    }}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 rounded-md border border-zinc-800 bg-[#09090B] px-3 py-2 text-xs font-mono text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={!urlIsValid || isSyncing}
                    onClick={async () => {
                      const result = await onTestAndSync(appsScriptUrl);
                      setSyncFeedback(result);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-50 px-3.5 py-2 text-xs font-semibold text-white whitespace-nowrap cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Testar e Sincronizar</span>
                  </button>
                </div>
                {appsScriptUrl.trim() && !urlValidation.valid ? (
                  <p className="text-xs text-amber-300 mt-1.5">{urlValidation.reason}</p>
                ) : (
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Deixe em branco para usar o Modo Local (dados salvos apenas neste navegador).
                  </p>
                )}

                {syncFeedback && (
                  <div
                    role="status"
                    className={`mt-2 rounded-md border px-3 py-2 text-xs leading-relaxed ${
                      syncFeedback.ok
                        ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200'
                        : 'border-red-500/40 bg-red-950/40 text-red-200'
                    }`}
                  >
                    {syncFeedback.message}
                  </div>
                )}
              </div>

              {urlIsValid && (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-[#09090B]/70 px-3.5 py-2.5">
                  <span className="text-xs text-zinc-400">
                    Deseja enviar todos os leads e configurações atuais para a planilha?
                  </span>
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={async () => {
                      const result = await onPushAll(appsScriptUrl);
                      setSyncFeedback(result);
                    }}
                    className="text-xs font-medium text-orange-400 hover:text-orange-300 hover:underline whitespace-nowrap cursor-pointer"
                  >
                    Enviar tudo agora
                  </button>
                </div>
              )}

              {/* Step-by-step Tutorial + Code.gs */}
              <div className="rounded-lg border border-zinc-800 bg-[#09090B]/70 p-4 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-100">
                    Código do Apps Script (inclui aba Leads + aba Config):
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCode((v) => !v)}
                      className="text-xs font-medium text-zinc-400 hover:text-zinc-100 cursor-pointer"
                    >
                      {showCode ? 'Ocultar código' : 'Ver Code.gs'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-[#18181B] hover:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-100 cursor-pointer"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Código copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-[#F97316]" />
                          <span>Copiar Código do Apps Script (Code.gs)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <ol className="list-decimal list-inside text-xs text-zinc-400 space-y-1.5 leading-relaxed">
                  <li>
                    Abra sua planilha no <strong className="text-zinc-200">Google Sheets</strong> e vá em <strong className="text-zinc-200">Extensões &gt; Apps Script</strong>.
                  </li>
                  <li>
                    Substitua o conteúdo de <code className="font-mono text-zinc-200">Code.gs</code> pelo código copiado acima e clique em Salvar.
                  </li>
                  <li>
                    Clique em <strong className="text-zinc-200">Implantar &gt; Gerenciar implantações &gt; Editar &gt; Nova versão</strong> (ou Nova implantação &gt; App da Web) com <strong className="text-zinc-200">Quem pode acessar: Qualquer pessoa</strong>.
                  </li>
                  <li>
                    Cole a URL <code className="font-mono text-zinc-200">/exec</code> no campo acima e clique em <strong className="text-zinc-200">Testar e Sincronizar</strong>.
                  </li>
                </ol>

                {showCode && (
                  <pre className="mt-1 max-h-56 overflow-auto rounded-md border border-zinc-800 bg-[#09090B] p-3 text-[11px] font-mono text-zinc-200 leading-relaxed">
                    <code>{APPS_SCRIPT_CODE}</code>
                  </pre>
                )}
              </div>
            </div>
          </div>

          {/* Pinned Footer */}
          <div className="shrink-0 px-5 py-3.5 border-t border-zinc-800 bg-[#111114] flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={onResetDemoData}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Restaurar leads de exemplo</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-md border border-zinc-800 bg-[#18181B] text-xs font-medium text-zinc-300 hover:text-zinc-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-md bg-[#F97316] hover:bg-[#EA580C] text-xs font-semibold text-white cursor-pointer"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
