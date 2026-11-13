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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-prospect-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[1px] p-4"
    >
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-lg w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h2 id="new-prospect-title" className="font-display text-base font-semibold text-[#0F172A]">
              Novo Prospect
            </h2>
            <p className="text-xs text-[#64748B]">
              Preenchimento rápido para prospecção ativa de sites.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal Novo Prospect"
            className="p-1.5 rounded-md text-[#64748B] hover:bg-slate-100 hover:text-[#0F172A] transition-colors cursor-pointer"
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
                <label htmlFor="np-company" className="block text-xs font-medium text-[#0F172A] mb-1">
                  Nome da Empresa <span className="text-[#DC2626]">*</span>
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
                  className={`w-full rounded-md border px-3 py-2 text-sm text-[#0F172A] focus:outline-none ${
                    error
                      ? 'border-[#DC2626] bg-red-50/40'
                      : 'border-[#E2E8F0] bg-white focus:border-[#2563EB]'
                  }`}
                />
                {error && <p className="text-xs text-[#DC2626] mt-1">{error}</p>}
              </div>

              <div>
                <label htmlFor="np-phone" className="block text-xs font-medium text-[#0F172A] mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  id="np-phone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="np-contact" className="block text-xs font-medium text-[#0F172A] mb-1">
                  Nome do Decisor
                </label>
                <input
                  id="np-contact"
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Ex: Dra. Camila"
                  className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="np-site" className="block text-xs font-medium text-[#0F172A] mb-1">
                  Site atual ou @Instagram
                </label>
                <input
                  id="np-site"
                  type="text"
                  value={websiteOrSocial}
                  onChange={(e) => setWebsiteOrSocial(e.target.value)}
                  placeholder="Ex: Não possui site, @clinica.sorriso ou site antigo"
                  className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                />
              </div>
            </div>

            {/* Niche Quick Suggestions */}
            <div>
              <span className="block text-xs font-medium text-[#0F172A] mb-1.5">Nicho / Segmento</span>
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
                          ? 'bg-[#2563EB] text-white border-[#2563EB]'
                          : 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] hover:text-[#0F172A]'
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
                className="w-full rounded-md border border-[#E2E8F0] px-3 py-1.5 text-xs text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
              />
            </div>

            {/* Secondary Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="np-status" className="block text-xs font-medium text-[#0F172A] mb-1">
                  Etapa inicial
                </label>
                <select
                  id="np-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as LeadStatus)}
                  className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                >
                  {LEAD_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="np-owner" className="block text-xs font-medium text-[#0F172A] mb-1">
                  Responsável
                </label>
                <select
                  id="np-owner"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                >
                  {teamMembers.map((member) => (
                    <option key={member} value={member}>
                      {member}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="np-value" className="block text-xs font-medium text-[#0F172A] mb-1">
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
                  className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm font-mono tabular-nums text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="np-followup" className="block text-xs font-medium text-[#0F172A] mb-1">
                  Próximo Follow-up
                </label>
                <input
                  id="np-followup"
                  type="date"
                  value={nextFollowUp}
                  onChange={(e) => setNextFollowUp(e.target.value)}
                  className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="np-notes" className="block text-xs font-medium text-[#0F172A] mb-1">
                  Observações
                </label>
                <textarea
                  id="np-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Pontos de melhoria no site, melhor horário para ligar..."
                  className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Pinned Actions */}
          <div className="shrink-0 px-5 py-3.5 border-t border-[#E2E8F0] bg-white flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-md border border-[#E2E8F0] bg-white text-xs font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="px-3.5 py-2 rounded-md border border-[#2563EB]/30 bg-blue-50 text-xs font-medium text-[#2563EB] hover:bg-blue-100 transition-colors cursor-pointer"
            >
              Salvar e cadastrar próximo
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#2563EB] hover:bg-blue-700 text-xs font-medium text-white transition-colors cursor-pointer"
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
