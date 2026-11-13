import { useEffect, useState } from 'react';
import {
  CalendarPlus,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { LEAD_STATUSES, Lead, LeadStatus } from '../types/crm';
import {
  appendDatedNote,
  buildWhatsAppUrl,
  formatDateBR,
} from '../utils/crmLogic';

interface LeadDetailDrawerProps {
  lead: Lead | null;
  teamMembers: [string, string];
  onClose: () => void;
  onSave: (updated: Lead) => void;
  onDelete: (leadId: string) => void;
}

export function LeadDetailDrawer({
  lead,
  teamMembers,
  onClose,
  onSave,
  onDelete,
}: LeadDetailDrawerProps) {
  const [draft, setDraft] = useState<Lead | null>(lead);
  const [quickNote, setQuickNote] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    setDraft(lead);
    setQuickNote('');
    setConfirmingDelete(false);
  }, [lead]);

  if (!lead || !draft) return null;

  const whatsappUrl = buildWhatsAppUrl(draft.phone);

  const handleAddDatedNote = () => {
    if (!quickNote.trim()) return;
    const updatedNotes = appendDatedNote(draft.notes, quickNote);
    const nextDraft = { ...draft, notes: updatedNotes };
    setDraft(nextDraft);
    setQuickNote('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.companyName.trim()) return;
    onSave(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/35 backdrop-blur-[1px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-lead-title"
        className="w-full max-w-lg bg-white h-full border-l border-[#E2E8F0] shadow-xl flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              id="drawer-lead-title"
              className="font-display text-base font-semibold text-[#0F172A] truncate"
            >
              {draft.companyName || 'Detalhes do Lead'}
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Criado em {formatDateBR(draft.createdAt)} · Atualizado em {formatDateBR(draft.updatedAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes do lead"
            className="p-1.5 rounded-md text-[#64748B] hover:bg-slate-100 hover:text-[#0F172A] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Content + Pinned Footer */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
            {/* Quick Call & WhatsApp Strip */}
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#64748B]">Ligações:</span>
                <div className="inline-flex items-center rounded-md border border-[#E2E8F0] bg-white">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({ ...draft, callCount: Math.max(0, draft.callCount - 1) })
                    }
                    aria-label="Diminuir contagem de ligações"
                    className="p-1.5 text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-2.5 font-mono tabular-nums text-sm font-semibold text-[#0F172A]">
                    {draft.callCount}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        callCount: draft.callCount + 1,
                        notes: appendDatedNote(
                          draft.notes,
                          `Ligação #${draft.callCount + 1} registrada`
                        ),
                      })
                    }
                    aria-label="Aumentar contagem de ligações"
                    className="p-1.5 text-[#2563EB] hover:bg-blue-50 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-medium transition-colors"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>Chamar no WhatsApp</span>
                </a>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-[#64748B]">
                  <Phone className="h-3.5 w-3.5" />
                  Sem telefone válido
                </span>
              )}
            </div>

            {/* Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label htmlFor="ed-company" className="block text-xs font-medium text-[#0F172A] mb-1">
                  Nome da Empresa <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  id="ed-company"
                  type="text"
                  required
                  value={draft.companyName}
                  onChange={(e) => setDraft({ ...draft, companyName: e.target.value })}
                  className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="ed-status" className="block text-xs font-medium text-[#0F172A] mb-1">
                  Etapa do Funil
                </label>
                <select
                  id="ed-status"
                  value={draft.status}
                  onChange={(e) => setDraft({ ...draft, status: e.target.value as LeadStatus })}
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
                <label htmlFor="ed-owner" className="block text-xs font-medium text-[#0F172A] mb-1">
                  Responsável
                </label>
                <select
                  id="ed-owner"
                  value={draft.owner}
                  onChange={(e) => setDraft({ ...draft, owner: e.target.value })}
                  className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                >
                  {Array.from(new Set([...teamMembers, draft.owner])).map((member) => (
                    <option key={member} value={member}>
                      {member}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="ed-contact" className="block text-xs font-medium text-[#0F172A] mb-1">
                  Nome do Decisor
                </label>
                <input
                  id="ed-contact"
                  type="text"
                  value={draft.contactName}
                  onChange={(e) => setDraft({ ...draft, contactName: e.target.value })}
                  className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="ed-phone" className="block text-xs font-medium text-[#0F172A] mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  id="ed-phone"
                  type="text"
                  value={draft.phone}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                  className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="ed-niche" className="block text-xs font-medium text-[#0F172A] mb-1">
                  Nicho / Segmento
                </label>
                <input
                  id="ed-niche"
                  type="text"
                  value={draft.niche}
                  onChange={(e) => setDraft({ ...draft, niche: e.target.value })}
                  className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="ed-site" className="block text-xs font-medium text-[#0F172A] mb-1">
                  Site atual / @Instagram
                </label>
                <input
                  id="ed-site"
                  type="text"
                  value={draft.websiteOrSocial}
                  onChange={(e) => setDraft({ ...draft, websiteOrSocial: e.target.value })}
                  className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="ed-value" className="block text-xs font-medium text-[#0F172A] mb-1">
                  Valor Estimado (R$)
                </label>
                <input
                  id="ed-value"
                  type="number"
                  min="0"
                  step="100"
                  value={draft.estimatedValue}
                  onChange={(e) =>
                    setDraft({ ...draft, estimatedValue: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm font-mono tabular-nums text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="ed-followup" className="block text-xs font-medium text-[#0F172A] mb-1">
                  Próximo Follow-up
                </label>
                <input
                  id="ed-followup"
                  type="date"
                  value={draft.nextFollowUp}
                  onChange={(e) => setDraft({ ...draft, nextFollowUp: e.target.value })}
                  className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                />
              </div>
            </div>

            {/* Quick dated note adder */}
            <div className="pt-2 border-t border-[#E2E8F0] flex flex-col gap-2">
              <label htmlFor="ed-quick-note" className="text-xs font-medium text-[#0F172A]">
                Registrar anotação rápida
              </label>
              <div className="flex gap-2">
                <input
                  id="ed-quick-note"
                  type="text"
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddDatedNote();
                    }
                  }}
                  placeholder="Ex: Enviei proposta comercial por WhatsApp..."
                  className="flex-1 rounded-md border border-[#E2E8F0] px-3 py-1.5 text-xs text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddDatedNote}
                  className="inline-flex items-center gap-1 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-[#0F172A] whitespace-nowrap cursor-pointer"
                >
                  <CalendarPlus className="h-3.5 w-3.5 text-[#2563EB]" />
                  <span>Adicionar nota com data de hoje</span>
                </button>
              </div>
            </div>

            {/* Full Notes History */}
            <div className="flex-1 flex flex-col">
              <label htmlFor="ed-notes" className="block text-xs font-medium text-[#0F172A] mb-1">
                Histórico de Observações
              </label>
              <textarea
                id="ed-notes"
                rows={4}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                className="w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-xs text-[#0F172A] leading-relaxed focus:border-[#2563EB] focus:outline-none"
              />
            </div>
          </div>

          {/* Pinned Footer Actions */}
          <div className="shrink-0 px-5 py-3.5 border-t border-[#E2E8F0] bg-white flex items-center justify-between gap-2">
            {!confirmingDelete ? (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-medium text-[#DC2626] hover:bg-red-50 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Excluir lead</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onDelete(draft.id);
                    onClose();
                  }}
                  className="rounded-md bg-[#DC2626] hover:bg-red-700 px-3 py-1.5 text-xs font-medium text-white cursor-pointer"
                >
                  Confirmar exclusão
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="text-xs text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-md border border-[#E2E8F0] bg-white text-xs font-medium text-[#64748B] hover:text-[#0F172A] cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#2563EB] hover:bg-blue-700 text-xs font-medium text-white cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Salvar alterações</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
