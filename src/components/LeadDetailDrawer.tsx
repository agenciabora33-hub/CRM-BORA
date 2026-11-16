import { useEffect, useState } from 'react';
import {
  CalendarPlus,
  ExternalLink,
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
  normalizeExternalUrl,
} from '../utils/crmLogic';

interface LeadDetailDrawerProps {
  lead: Lead | null;
  teamMembers: [string, string];
  activeUser: string;
  onClose: () => void;
  onSave: (updated: Lead) => void;
  onDelete: (leadId: string) => void;
}

export function LeadDetailDrawer({
  lead,
  teamMembers,
  activeUser,
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
    const author = activeUser || draft.owner || 'Cláudio';
    const updatedNotes = appendDatedNote(draft.notes, quickNote, author);
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

  const inputClass =
    'w-full rounded-md border border-zinc-800 bg-[#09090B] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none';

  const renderLinkButton = (raw: string, label: string) => {
    const href = normalizeExternalUrl(raw);
    if (!href) return null;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Abrir ${label}`}
        className="inline-flex items-center gap-1 text-[11px] text-orange-400 hover:text-orange-300 hover:underline"
      >
        <ExternalLink className="h-3 w-3" />
        <span>Abrir</span>
      </a>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-lead-title"
        className="w-full max-w-lg bg-[#111114] h-full border-l border-zinc-800 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              id="drawer-lead-title"
              className="font-display text-base font-bold tracking-tight text-zinc-50 truncate"
            >
              {draft.companyName || 'Detalhes do Lead'}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Criado em {formatDateBR(draft.createdAt)} · Atualizado em {formatDateBR(draft.updatedAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes do lead"
            className="p-1.5 rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Content + Pinned Footer */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
            {/* Quick Call & WhatsApp Strip */}
            <div className="rounded-lg border border-zinc-800 bg-[#09090B]/70 p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-400">Ligações:</span>
                <div className="inline-flex items-center rounded-md border border-zinc-800 bg-[#18181B]">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({ ...draft, callCount: Math.max(0, draft.callCount - 1) })
                    }
                    aria-label="Diminuir contagem de ligações"
                    className="p-1.5 text-zinc-400 hover:text-zinc-100 cursor-pointer"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-2.5 font-mono tabular-nums text-sm font-semibold text-zinc-100">
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
                    className="p-1.5 text-orange-400 hover:bg-orange-500/15 cursor-pointer"
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
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-medium transition-colors"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>Chamar no WhatsApp</span>
                </a>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                  <Phone className="h-3.5 w-3.5" />
                  Sem telefone válido
                </span>
              )}
            </div>

            {/* Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label htmlFor="ed-company" className="block text-xs font-medium text-zinc-200 mb-1">
                  Nome da Empresa <span className="text-red-400">*</span>
                </label>
                <input
                  id="ed-company"
                  type="text"
                  required
                  value={draft.companyName}
                  onChange={(e) => setDraft({ ...draft, companyName: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="ed-status" className="block text-xs font-medium text-zinc-200 mb-1">
                  Etapa do Funil
                </label>
                <select
                  id="ed-status"
                  value={draft.status}
                  onChange={(e) => setDraft({ ...draft, status: e.target.value as LeadStatus })}
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
                <label htmlFor="ed-owner" className="block text-xs font-medium text-zinc-200 mb-1">
                  Responsável
                </label>
                <select
                  id="ed-owner"
                  value={draft.owner}
                  onChange={(e) => setDraft({ ...draft, owner: e.target.value })}
                  className={inputClass}
                >
                  {Array.from(new Set([...teamMembers, draft.owner])).map((member) => (
                    <option key={member} value={member} className="bg-[#18181B] text-zinc-100">
                      {member}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="ed-contact" className="block text-xs font-medium text-zinc-200 mb-1">
                  Nome do Decisor
                </label>
                <input
                  id="ed-contact"
                  type="text"
                  value={draft.contactName}
                  onChange={(e) => setDraft({ ...draft, contactName: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="ed-phone" className="block text-xs font-medium text-zinc-200 mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  id="ed-phone"
                  type="text"
                  value={draft.phone}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="ed-niche" className="block text-xs font-medium text-zinc-200 mb-1">
                  Nicho / Segmento
                </label>
                <input
                  id="ed-niche"
                  type="text"
                  value={draft.niche}
                  onChange={(e) => setDraft({ ...draft, niche: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="ed-site" className="block text-xs font-medium text-zinc-200 mb-1">
                  Diagnóstico presença atual
                </label>
                <input
                  id="ed-site"
                  type="text"
                  value={draft.websiteOrSocial}
                  onChange={(e) => setDraft({ ...draft, websiteOrSocial: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="ed-value" className="block text-xs font-medium text-zinc-200 mb-1">
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
                  className="w-full rounded-md border border-zinc-800 bg-[#09090B] px-3 py-2 text-sm font-mono tabular-nums text-zinc-100 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="ed-followup" className="block text-xs font-medium text-zinc-200 mb-1">
                  Próximo Follow-up
                </label>
                <input
                  id="ed-followup"
                  type="date"
                  value={draft.nextFollowUp}
                  onChange={(e) => setDraft({ ...draft, nextFollowUp: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Digital Presence URLs */}
            <div className="pt-3 border-t border-zinc-800 flex flex-col gap-3">
              <span className="text-xs font-semibold text-zinc-200">
                Links e Presença Digital
              </span>
              <div className="grid grid-cols-1 gap-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="ed-url-site" className="text-xs font-medium text-zinc-300">
                      URL do Site
                    </label>
                    {renderLinkButton(draft.websiteUrl, 'Site')}
                  </div>
                  <input
                    id="ed-url-site"
                    type="text"
                    value={draft.websiteUrl}
                    onChange={(e) => setDraft({ ...draft, websiteUrl: e.target.value })}
                    placeholder="https://empresa.com.br"
                    className={inputClass}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="ed-url-gmn" className="text-xs font-medium text-zinc-300">
                      URL do Google Meu Negócio
                    </label>
                    {renderLinkButton(draft.googleBusinessUrl, 'Google Meu Negócio')}
                  </div>
                  <input
                    id="ed-url-gmn"
                    type="text"
                    value={draft.googleBusinessUrl}
                    onChange={(e) => setDraft({ ...draft, googleBusinessUrl: e.target.value })}
                    placeholder="https://maps.google.com/..."
                    className={inputClass}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="ed-url-instagram" className="text-xs font-medium text-zinc-300">
                      URL do Instagram
                    </label>
                    {renderLinkButton(draft.instagramUrl, 'Instagram')}
                  </div>
                  <input
                    id="ed-url-instagram"
                    type="text"
                    value={draft.instagramUrl}
                    onChange={(e) => setDraft({ ...draft, instagramUrl: e.target.value })}
                    placeholder="https://instagram.com/perfil"
                    className={inputClass}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="ed-url-facebook" className="text-xs font-medium text-zinc-300">
                      URL do Facebook
                    </label>
                    {renderLinkButton(draft.facebookUrl, 'Facebook')}
                  </div>
                  <input
                    id="ed-url-facebook"
                    type="text"
                    value={draft.facebookUrl}
                    onChange={(e) => setDraft({ ...draft, facebookUrl: e.target.value })}
                    placeholder="https://facebook.com/pagina"
                    className={inputClass}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="ed-url-other" className="text-xs font-medium text-zinc-300">
                      Outras mídias
                    </label>
                    {renderLinkButton(draft.otherSocialUrl, 'Outras mídias')}
                  </div>
                  <input
                    id="ed-url-other"
                    type="text"
                    value={draft.otherSocialUrl}
                    onChange={(e) => setDraft({ ...draft, otherSocialUrl: e.target.value })}
                    placeholder="LinkedIn, TikTok, YouTube..."
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Quick dated note adder */}
            <div className="pt-3 border-t border-zinc-800 flex flex-col gap-2">
              <label htmlFor="ed-quick-note" className="text-xs font-medium text-zinc-200 flex items-center justify-between">
                <span>Adicionar Nova Observação</span>
                <span className="text-[11px] text-orange-400 font-mono">Registra data, hora e {activeUser}</span>
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
                  placeholder="Ex: Cliente solicitou contato na próxima terça-feira..."
                  className="flex-1 rounded-md border border-zinc-800 bg-[#09090B] px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddDatedNote}
                  className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-[#18181B] hover:bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-100 whitespace-nowrap cursor-pointer"
                >
                  <CalendarPlus className="h-3.5 w-3.5 text-[#F97316]" />
                  <span>Adicionar Observação</span>
                </button>
              </div>
            </div>

            {/* Full Notes History */}
            <div className="flex-1 flex flex-col">
              <label htmlFor="ed-notes" className="block text-xs font-medium text-zinc-200 mb-1">
                Histórico de Observações
              </label>
              <textarea
                id="ed-notes"
                rows={4}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                className="w-full rounded-md border border-zinc-800 bg-[#09090B] px-3 py-2 text-xs text-zinc-100 leading-relaxed focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Pinned Footer Actions */}
          <div className="shrink-0 px-5 py-3.5 border-t border-zinc-800 bg-[#111114] flex items-center justify-between gap-2">
            {!confirmingDelete ? (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-medium text-red-400 hover:bg-red-500/15 transition-colors cursor-pointer"
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
                  className="rounded-md bg-red-600 hover:bg-red-500 px-3 py-1.5 text-xs font-medium text-white cursor-pointer"
                >
                  Confirmar exclusão
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-100 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-md border border-zinc-800 bg-[#18181B] text-xs font-medium text-zinc-300 hover:text-zinc-100 cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#F97316] hover:bg-[#EA580C] text-xs font-semibold text-white cursor-pointer"
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
