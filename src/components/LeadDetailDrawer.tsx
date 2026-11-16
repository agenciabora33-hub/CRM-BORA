import { useEffect, useState } from 'react';
import {
  CalendarPlus,
  Clock,
  ExternalLink,
  FileText,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  Save,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { LEAD_STATUSES, Lead, LeadStatus, ServiceLog } from '../types/crm';
import {
  buildWhatsAppUrl,
  formatDateBR,
  generateUuid,
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
  const [newServiceLogText, setNewServiceLogText] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!lead) {
      setDraft(null);
    } else if (!draft || lead.id !== draft.id) {
      setDraft({
        ...lead,
        serviceLogs: Array.isArray(lead.serviceLogs) ? lead.serviceLogs : [],
      });
      setNewServiceLogText('');
      setConfirmingDelete(false);
    }
  }, [lead]);

  if (!lead || !draft) return null;

  const whatsappUrl = buildWhatsAppUrl(draft.phone);

  const handleAddServiceLog = () => {
    if (!newServiceLogText.trim()) return;
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timestamp = `${day}/${month}/${year} ${hours}:${minutes}`;

    const newLog: ServiceLog = {
      id: generateUuid(),
      timestamp,
      author: activeUser || draft.owner || 'Cláudio',
      content: newServiceLogText.trim(),
    };

    setDraft({
      ...draft,
      serviceLogs: [newLog, ...(draft.serviceLogs || [])],
    });
    setNewServiceLogText('');
  };

  const handleDeleteServiceLog = (logId: string) => {
    setDraft({
      ...draft,
      serviceLogs: (draft.serviceLogs || []).filter((l) => l.id !== logId),
    });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-lead-title"
        className="w-[90vw] h-[90vh] max-w-[1550px] max-h-[940px] bg-[#111114] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between gap-3 bg-[#09090B]/60 shrink-0">
          <div className="min-w-0">
            <h2
              id="modal-lead-title"
              className="font-display text-lg font-bold tracking-tight text-zinc-50 truncate"
            >
              {draft.companyName || 'Detalhes do Lead'}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Criado em {formatDateBR(draft.createdAt)} · Atualizado em {formatDateBR(draft.updatedAt)} · Responsável: <span className="text-orange-400 font-semibold">{draft.owner}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes do lead"
            className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Content + Pinned Footer */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
            {/* Left Column: Lead Info & Digital Presence (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              {/* Quick Call & WhatsApp Strip */}
              <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-zinc-300">Contatos Realizados:</span>
                  <div className="inline-flex items-center rounded-lg border border-zinc-800 bg-[#18181B]">
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({ ...draft, callCount: Math.max(0, draft.callCount - 1) })
                      }
                      aria-label="Diminuir ligações"
                      className="p-2 text-zinc-400 hover:text-zinc-100 cursor-pointer"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="px-3 font-mono tabular-nums text-sm font-bold text-zinc-100">
                      {draft.callCount}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextCount = draft.callCount + 1;
                        const now = new Date();
                        const day = String(now.getDate()).padStart(2, '0');
                        const month = String(now.getMonth() + 1).padStart(2, '0');
                        const year = now.getFullYear();
                        const hours = String(now.getHours()).padStart(2, '0');
                        const minutes = String(now.getMinutes()).padStart(2, '0');
                        const timestamp = `${day}/${month}/${year} ${hours}:${minutes}`;
                        const newLog: ServiceLog = {
                          id: generateUuid(),
                          timestamp,
                          author: activeUser,
                          content: `Ligação #${nextCount} realizada`,
                        };
                        setDraft({
                          ...draft,
                          callCount: nextCount,
                          serviceLogs: [newLog, ...(draft.serviceLogs || [])],
                        });
                      }}
                      aria-label="Registrar +1 ligação"
                      className="p-2 text-orange-400 hover:bg-orange-500/15 cursor-pointer rounded-r-lg"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {whatsappUrl ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-semibold transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Chamar no WhatsApp</span>
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
                    <Phone className="h-4 w-4" />
                    Sem telefone válido
                  </span>
                )}
              </div>

              {/* Main Fields Grid */}
              <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-4 flex flex-col gap-4">
                <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                  Informações Cadastrais
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label htmlFor="ed-company" className="block text-xs font-medium text-zinc-300 mb-1">
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
                    <label htmlFor="ed-status" className="block text-xs font-medium text-zinc-300 mb-1">
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
                    <label htmlFor="ed-owner" className="block text-xs font-medium text-zinc-300 mb-1">
                      Sócio Responsável
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
                    <label htmlFor="ed-contact" className="block text-xs font-medium text-zinc-300 mb-1">
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
                    <label htmlFor="ed-phone" className="block text-xs font-medium text-zinc-300 mb-1">
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
                    <label htmlFor="ed-niche" className="block text-xs font-medium text-zinc-300 mb-1">
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
                    <label htmlFor="ed-site" className="block text-xs font-medium text-zinc-300 mb-1">
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
                    <label htmlFor="ed-value" className="block text-xs font-medium text-zinc-300 mb-1">
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
                    <label htmlFor="ed-followup" className="block text-xs font-medium text-zinc-300 mb-1">
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
              </div>

              {/* Digital Presence URLs */}
              <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-4 flex flex-col gap-3">
                <span className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                  Presença Digital & Links
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        Google Meu Negócio
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
                        Instagram
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
                        Facebook
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
                </div>
              </div>
            </div>

            {/* Right Column: Separated Anotações and Registros de Atendimento (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-5 min-h-0">
              {/* 1. Anotações Gerais */}
              <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#F97316]" />
                  <label htmlFor="ed-notes" className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                    Anotações Gerais do Lead
                  </label>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Bloco de notas geral sobre o prospect, briefings e acordos.
                </p>
                <textarea
                  id="ed-notes"
                  rows={4}
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  placeholder="Digite as anotações gerais sobre a empresa..."
                  className="w-full rounded-md border border-zinc-800 bg-[#111114] px-3 py-2 text-xs text-zinc-100 leading-relaxed focus:border-orange-500 focus:outline-none resize-y"
                />
              </div>

              {/* 2. Registros de Atendimento (Strictly separated with date, time, and author) */}
              <div className="flex-1 rounded-xl border border-zinc-800 bg-[#09090B] p-4 flex flex-col gap-3 min-h-[300px]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                      Registros de Atendimento
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                    {(draft.serviceLogs || []).length} registros
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Histórico oficial de contatos e interações (inserido pelo usuário com data e hora).
                </p>

                {/* Add new service log input */}
                <div className="flex flex-col gap-2 bg-[#111114] p-3 rounded-lg border border-zinc-800">
                  <label htmlFor="new-service-log" className="text-[11px] font-medium text-zinc-300 flex items-center justify-between">
                    <span>Novo Registro de Atendimento</span>
                    <span className="text-orange-400 font-mono">Autor: {activeUser}</span>
                  </label>
                  <textarea
                    id="new-service-log"
                    rows={2}
                    value={newServiceLogText}
                    onChange={(e) => setNewServiceLogText(e.target.value)}
                    placeholder="Descreva o atendimento ou contato realizado..."
                    className="w-full rounded-md border border-zinc-800 bg-[#09090B] px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddServiceLog}
                      className="inline-flex items-center gap-1.5 rounded-md bg-[#F97316] hover:bg-[#EA580C] px-3 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer shadow-xs"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" />
                      <span>Adicionar Registro com Data e Hora</span>
                    </button>
                  </div>
                </div>

                {/* Timeline list of service logs */}
                <div className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-[160px] max-h-[320px] pr-1">
                  {(!draft.serviceLogs || draft.serviceLogs.length === 0) ? (
                    <div className="py-8 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                      Nenhum registro de atendimento cadastrado ainda.
                    </div>
                  ) : (
                    draft.serviceLogs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-lg border border-zinc-800 bg-[#18181B] p-3 flex flex-col gap-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-400 border-b border-zinc-800/80 pb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-emerald-400 font-semibold">{log.timestamp}</span>
                            <span className="text-zinc-500">·</span>
                            <span className="inline-flex items-center gap-1 text-zinc-300 font-medium">
                              <User className="h-3 w-3 text-[#F97316]" />
                              {log.author}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteServiceLog(log.id)}
                            title="Remover registro"
                            className="text-zinc-500 hover:text-red-400 cursor-pointer p-0.5"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-zinc-100 whitespace-pre-wrap leading-relaxed">
                          {log.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pinned Footer Actions */}
          <div className="shrink-0 px-6 py-4 border-t border-zinc-800 bg-[#09090B] flex items-center justify-between gap-3">
            {!confirmingDelete ? (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/15 transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
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
                  className="rounded-lg bg-red-600 hover:bg-red-500 px-3 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  Confirmar exclusão
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-100 cursor-pointer px-2"
                >
                  Cancelar
                </button>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-zinc-800 bg-[#18181B] text-xs font-medium text-zinc-300 hover:text-zinc-100 cursor-pointer transition-colors"
              >
                Fechar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-xs font-semibold text-white cursor-pointer shadow-md transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>Salvar alterações</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
