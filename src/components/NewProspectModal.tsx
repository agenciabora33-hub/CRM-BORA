import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { LEAD_STATUSES, LeadStatus } from '../types/crm';
import { NICHE_SUGGESTIONS } from '../utils/crmLogic';
import { NewLeadInput } from '../hooks/useCrmStore';

interface NewProspectModalProps {
  isOpen: boolean;
  defaultOwner: string;
  defaultStatus: LeadStatus;
  teamMembers: [string, string];
  onClose: () => void;
  onCreate: (input: NewLeadInput) => void;
}

export function NewProspectModal({
  isOpen,
  defaultOwner,
  defaultStatus,
  teamMembers,
  onClose,
  onCreate,
}: NewProspectModalProps) {
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [contactName, setContactName] = useState('');
  const [websiteOrSocial, setWebsiteOrSocial] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [googleBusinessUrl, setGoogleBusinessUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [otherSocialUrl, setOtherSocialUrl] = useState('');
  const [niche, setNiche] = useState('');
  const [status, setStatus] = useState<LeadStatus>(defaultStatus);
  const [owner, setOwner] = useState(defaultOwner);
  const [estimatedValue, setEstimatedValue] = useState('');
  const [nextFollowUp, setNextFollowUp] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const companyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStatus(defaultStatus);
      setOwner(defaultOwner);
      setError('');
      window.setTimeout(() => {
        companyInputRef.current?.focus();
      }, 40);
    }
  }, [defaultOwner, defaultStatus, isOpen]);

  if (!isOpen) return null;

  const resetForNext = () => {
    setCompanyName('');
    setPhone('');
    setContactName('');
    setWebsiteOrSocial('');
    setWebsiteUrl('');
    setGoogleBusinessUrl('');
    setInstagramUrl('');
    setFacebookUrl('');
    setOtherSocialUrl('');
    setNiche('');
    setEstimatedValue('');
    setNextFollowUp('');
    setNotes('');
    setError('');
    window.setTimeout(() => {
      companyInputRef.current?.focus();
    }, 30);
  };

  const handleSave = (keepOpen: boolean) => {
    if (!companyName.trim()) {
      setError('Informe o nome da empresa para cadastrar o prospect.');
      companyInputRef.current?.focus();
      return;
    }

    onCreate({
      companyName,
      phone,
      contactName,
      websiteOrSocial,
      websiteUrl,
      googleBusinessUrl,
      instagramUrl,
      facebookUrl,
      otherSocialUrl,
      niche,
      status,
      owner,
      estimatedValue: Number(estimatedValue) || 0,
      nextFollowUp,
      notes,
    });

    if (keepOpen) {
      resetForNext();
    } else {
      resetForNext();
      onClose();
    }
  };

  const inputClass =
    'w-full rounded-md border border-zinc-800 bg-[#09090B] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-prospect-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-[2px] p-4"
    >
      <div className="bg-[#111114] border border-zinc-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 id="new-prospect-title" className="font-display text-base font-bold tracking-tight text-zinc-50">
              Novo Prospect
            </h2>
            <p className="text-xs text-zinc-400">
              Preenchimento rápido para prospecção ativa de sites.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal Novo Prospect"
            className="p-1.5 rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body + Pinned Footer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave(false);
          }}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
            {/* Primary top fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label htmlFor="np-company" className="block text-xs font-medium text-zinc-200 mb-1">
                  Nome da Empresa <span className="text-red-400">*</span>
                </label>
                <input
                  ref={companyInputRef}
                  id="np-company"
                  type="text"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Ex: Clínica Odontológica Sorriso"
                  className={`w-full rounded-md border px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none ${
                    error
                      ? 'border-red-500 bg-red-950/30'
                      : 'border-zinc-800 bg-[#09090B] focus:border-orange-500'
                  }`}
                />
                {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
              </div>

              <div>
                <label htmlFor="np-phone" className="block text-xs font-medium text-zinc-200 mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  id="np-phone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="np-contact" className="block text-xs font-medium text-zinc-200 mb-1">
                  Nome do Decisor
                </label>
                <input
                  id="np-contact"
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Ex: Dra. Camila"
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="np-site-summary" className="block text-xs font-medium text-zinc-200 mb-1">
                  Diagnóstico rápido da presença atual
                </label>
                <input
                  id="np-site-summary"
                  type="text"
                  value={websiteOrSocial}
                  onChange={(e) => setWebsiteOrSocial(e.target.value)}
                  placeholder="Ex: Não possui site, site antigo sem responsividade..."
                  className={inputClass}
                />
              </div>
            </div>

            {/* Niche Quick Suggestions */}
            <div>
              <span className="block text-xs font-medium text-zinc-200 mb-1.5">Nicho / Segmento</span>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {NICHE_SUGGESTIONS.map((item) => {
                  const selected = niche === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setNiche(item)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[#F97316] text-white border-[#F97316]'
                          : 'bg-[#18181B] text-zinc-300 border-zinc-800 hover:text-zinc-100 hover:border-zinc-700'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
              <input
                aria-label="Nicho personalizado"
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="Selecione acima ou digite o segmento..."
                className="w-full rounded-md border border-zinc-800 bg-[#09090B] px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none"
              />
            </div>

            {/* Secondary Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="np-status" className="block text-xs font-medium text-zinc-200 mb-1">
                  Etapa inicial
                </label>
                <select
                  id="np-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as LeadStatus)}
                  className={inputClass}
                >
                  {LEAD_STATUSES.map((st) => (
                    <option key={st} value={st} className="bg-[#18181B] text-zinc-100">
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="np-owner" className="block text-xs font-medium text-zinc-200 mb-1">
                  Responsável
                </label>
                <select
                  id="np-owner"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className={inputClass}
                >
                  {Array.from(new Set([...teamMembers, owner].filter(Boolean))).map((member) => (
                    <option key={member} value={member} className="bg-[#18181B] text-zinc-100">
                      {member}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="np-value" className="block text-xs font-medium text-zinc-200 mb-1">
                  Valor Estimado (R$)
                </label>
                <input
                  id="np-value"
                  type="number"
                  min="0"
                  step="100"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  placeholder="Ex: 3500"
                  className="w-full rounded-md border border-zinc-800 bg-[#09090B] px-3 py-2 text-sm font-mono tabular-nums text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="np-followup" className="block text-xs font-medium text-zinc-200 mb-1">
                  Próximo Follow-up
                </label>
                <input
                  id="np-followup"
                  type="date"
                  value={nextFollowUp}
                  onChange={(e) => setNextFollowUp(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Digital Presence URLs right before Observações */}
            <div className="pt-3 border-t border-zinc-800 flex flex-col gap-3">
              <span className="text-xs font-semibold text-zinc-200">
                Links e Presença Digital
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="np-url-site" className="block text-xs font-medium text-zinc-300 mb-1">
                    URL do Site
                  </label>
                  <input
                    id="np-url-site"
                    type="text"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://empresa.com.br"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="np-url-gmn" className="block text-xs font-medium text-zinc-300 mb-1">
                    URL do Google Meu Negócio
                  </label>
                  <input
                    id="np-url-gmn"
                    type="text"
                    value={googleBusinessUrl}
                    onChange={(e) => setGoogleBusinessUrl(e.target.value)}
                    placeholder="https://maps.google.com/..."
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="np-url-instagram" className="block text-xs font-medium text-zinc-300 mb-1">
                    URL do Instagram
                  </label>
                  <input
                    id="np-url-instagram"
                    type="text"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    placeholder="https://instagram.com/perfil"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="np-url-facebook" className="block text-xs font-medium text-zinc-300 mb-1">
                    URL do Facebook
                  </label>
                  <input
                    id="np-url-facebook"
                    type="text"
                    value={facebookUrl}
                    onChange={(e) => setFacebookUrl(e.target.value)}
                    placeholder="https://facebook.com/pagina"
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="np-url-other" className="block text-xs font-medium text-zinc-300 mb-1">
                    Outras mídias
                  </label>
                  <input
                    id="np-url-other"
                    type="text"
                    value={otherSocialUrl}
                    onChange={(e) => setOtherSocialUrl(e.target.value)}
                    placeholder="LinkedIn, TikTok, YouTube, Linktree..."
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Observações */}
            <div>
              <label htmlFor="np-notes" className="block text-xs font-medium text-zinc-200 mb-1">
                Observações
              </label>
              <textarea
                id="np-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Pontos de melhoria no site, melhor horário para ligar..."
                className="w-full rounded-md border border-zinc-800 bg-[#09090B] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Pinned Actions */}
          <div className="shrink-0 px-5 py-3.5 border-t border-zinc-800 bg-[#111114] flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-md border border-zinc-800 bg-[#18181B] text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="px-3.5 py-2 rounded-md border border-orange-500/40 bg-orange-500/15 text-xs font-medium text-orange-300 hover:bg-orange-500/25 transition-colors cursor-pointer"
            >
              Salvar e cadastrar próximo
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#F97316] hover:bg-[#EA580C] text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Salvar Prospect</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
