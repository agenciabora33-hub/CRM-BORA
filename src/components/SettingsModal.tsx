import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Database,
  Globe,
  RefreshCw,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { AgencySettings } from '../types/crm';
import { APPS_SCRIPT_CODE } from '../utils/appsScriptTemplate';
import { formatDateBR } from '../utils/crmLogic';
import { isValidAppsScriptUrl } from '../utils/sheetsSync';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AgencySettings;
  isSyncing: boolean;
  onClose: () => void;
  onSaveSettings: (partial: Partial<AgencySettings>) => void;
  onTestAndSync: (url: string) => Promise<boolean>;
  onPushAll: () => Promise<boolean>;
  onResetDemoData: () => void;
  onCopiedScript: () => void;
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

  useEffect(() => {
    if (isOpen) {
      setCompanyName(settings.companyName);
      setLogoUrl(settings.logoUrl);
      setMember1(settings.teamMembers[0]);
      setMember2(settings.teamMembers[1]);
      setAppsScriptUrl(settings.appsScriptUrl);
      setLogoError('');
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setLogoError('A imagem deve ter no máximo 1 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoUrl(reader.result);
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
    const m1 = member1.trim() || 'Sócio 1';
    const m2 = member2.trim() || 'Sócio 2';
    onSaveSettings({
      companyName: companyName.trim() || 'Sua Agência',
      logoUrl: logoUrl.trim(),
      teamMembers: [m1, m2],
      appsScriptUrl: appsScriptUrl.trim(),
    });
    onClose();
  };

  const urlIsValid = isValidAppsScriptUrl(appsScriptUrl);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[1px] p-4"
    >
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-lg w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h2 id="settings-modal-title" className="font-display text-base font-semibold text-[#0F172A]">
              Conectar Planilha & Configurações
            </h2>
            <p className="text-xs text-[#64748B]">
              Personalize sua agência, equipe de vendas e sincronização gratuita com Google Sheets.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar configurações"
            className="p-1.5 rounded-md text-[#64748B] hover:bg-slate-100 hover:text-[#0F172A] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body + Pinned Footer */}
        <form onSubmit={handleSaveGeneral} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
            {/* Section 1: Agency & Team */}
            <div className="flex flex-col gap-3.5">
              <h3 className="font-display text-sm font-semibold text-[#0F172A]">
                Identidade da Agência e Dupla de Vendas
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label htmlFor="cfg-company" className="block text-xs font-medium text-[#0F172A] mb-1">
                    Nome da Empresa / Agência
                  </label>
                  <input
                    id="cfg-company"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: Studio Web Digital"
                    className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="cfg-m1" className="block text-xs font-medium text-[#0F172A] mb-1">
                    Vendedor / Sócio 1
                  </label>
                  <input
                    id="cfg-m1"
                    type="text"
                    value={member1}
                    onChange={(e) => setMember1(e.target.value)}
                    className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="cfg-m2" className="block text-xs font-medium text-[#0F172A] mb-1">
                    Vendedor / Sócio 2
                  </label>
                  <input
                    id="cfg-m2"
                    type="text"
                    value={member2}
                    onChange={(e) => setMember2(e.target.value)}
                    className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>

              {/* Logo Upload / URL */}
              <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 flex flex-col gap-3">
                <span className="text-xs font-medium text-[#0F172A]">Logo da Empresa</span>
                <div className="flex flex-wrap items-center gap-3">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Prévia da logo"
                      referrerPolicy="no-referrer"
                      className="h-10 w-10 rounded-md object-contain border border-[#E2E8F0] bg-white shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-md border border-[#E2E8F0] bg-white flex items-center justify-center text-[#2563EB] shrink-0">
                      <Globe className="h-5 w-5" />
                    </div>
                  )}

                  <label className="inline-flex items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-medium text-[#0F172A] cursor-pointer">
                    <Upload className="h-3.5 w-3.5 text-[#64748B]" />
                    <span>Enviar PNG/JPG/SVG</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={handleFileUpload}
                      className="sr-only"
                    />
                  </label>

                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="inline-flex items-center gap-1 text-xs text-[#DC2626] hover:underline cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remover logo</span>
                    </button>
                  )}
                </div>

                <div>
                  <label htmlFor="cfg-logo-url" className="block text-[11px] text-[#64748B] mb-1">
                    Ou cole a URL da logo (opcional):
                  </label>
                  <input
                    id="cfg-logo-url"
                    type="text"
                    value={logoUrl.startsWith('data:') ? '' : logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://suaagencia.com.br/logo.png"
                    className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                {logoError && <p className="text-xs text-[#DC2626]">{logoError}</p>}
              </div>
            </div>

            {/* Section 2: Google Sheets Integration */}
            <div className="pt-4 border-t border-[#E2E8F0] flex flex-col gap-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-[#2563EB]" />
                  <h3 className="font-display text-sm font-semibold text-[#0F172A]">
                    Integração Gratuita com Google Sheets
                  </h3>
                </div>
                {settings.lastSyncedAt && (
                  <span className="text-[11px] text-[#64748B]">
                    Última sinc.: {formatDateBR(settings.lastSyncedAt)}
                  </span>
                )}
              </div>

              <div>
                <label htmlFor="cfg-sheets-url" className="block text-xs font-medium text-[#0F172A] mb-1">
                  URL do Web App do Google Apps Script
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="cfg-sheets-url"
                    type="url"
                    value={appsScriptUrl}
                    onChange={(e) => setAppsScriptUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 rounded-md border border-[#E2E8F0] px-3 py-2 text-xs font-mono text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={!urlIsValid || isSyncing}
                    onClick={() => onTestAndSync(appsScriptUrl)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 px-3.5 py-2 text-xs font-medium text-white whitespace-nowrap cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Testar e Sincronizar</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#64748B] mt-1">
                  Deixe em branco para usar o Modo Local (dados salvos no navegador).
                </p>
              </div>

              {urlIsValid && (
                <div className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5">
                  <span className="text-xs text-[#64748B]">
                    Deseja sobrescrever a planilha com seus dados locais atuais?
                  </span>
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={() => onPushAll()}
                    className="text-xs font-medium text-[#2563EB] hover:underline whitespace-nowrap cursor-pointer"
                  >
                    Enviar todos os leads
                  </button>
                </div>
              )}

              {/* Step-by-step Tutorial + Code.gs */}
              <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#0F172A]">
                    Passo a passo para conectar em 2 minutos:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCode((v) => !v)}
                      className="text-xs font-medium text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                    >
                      {showCode ? 'Ocultar código' : 'Ver Code.gs'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-medium text-[#0F172A] cursor-pointer"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-[#16A34A]" />
                          <span>Código copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-[#2563EB]" />
                          <span>Copiar Código do Apps Script (Code.gs)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <ol className="list-decimal list-inside text-xs text-[#64748B] space-y-1.5 leading-relaxed">
                  <li>
                    Crie uma nova planilha no <strong className="text-[#0F172A]">Google Sheets</strong>.
                  </li>
                  <li>
                    No menu superior, vá em <strong className="text-[#0F172A]">Extensões &gt; Apps Script</strong>.
                  </li>
                  <li>
                    Apague o código padrão, cole o código copiado de <code className="font-mono text-[#0F172A]">Code.gs</code> e clique em Salvar.
                  </li>
                  <li>
                    Clique em <strong className="text-[#0F172A]">Implantar &gt; Nova implantação &gt; App da Web</strong>, configure <strong className="text-[#0F172A]">Executar como: Eu</strong> e <strong className="text-[#0F172A]">Quem pode acessar: Qualquer pessoa</strong>.
                  </li>
                  <li>
                    Copie a <strong className="text-[#0F172A]">URL do App da Web</strong> gerada, cole no campo acima e clique em <strong className="text-[#0F172A]">Testar e Sincronizar</strong>.
                  </li>
                </ol>

                {showCode && (
                  <pre className="mt-1 max-h-56 overflow-auto rounded-md border border-[#E2E8F0] bg-[#0F172A] p-3 text-[11px] font-mono text-slate-100 leading-relaxed">
                    <code>{APPS_SCRIPT_CODE}</code>
                  </pre>
                )}
              </div>
            </div>
          </div>

          {/* Pinned Footer */}
          <div className="shrink-0 px-5 py-3.5 border-t border-[#E2E8F0] bg-white flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={onResetDemoData}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B] hover:text-[#0F172A] cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Restaurar leads de exemplo</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-md border border-[#E2E8F0] bg-white text-xs font-medium text-[#64748B] hover:text-[#0F172A] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-md bg-[#2563EB] hover:bg-blue-700 text-xs font-medium text-white cursor-pointer"
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
