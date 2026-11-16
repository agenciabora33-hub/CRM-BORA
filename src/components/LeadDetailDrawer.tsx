import { useEffect, useState } from 'react';
import {
  CalendarPlus,
  Clock,
  ExternalLink,
  FileText,
  MessageCircle,
  Phone,
  Plus,
  Save,
  Trash2,
  User,
  Users,
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

type ContactType = 'Ligação' | 'WhatsApp' | 'Pessoal';

export function LeadDetailDrawer({
  lead,
  teamMembers,
  activeUser,
  onClose,
  onSave,
  onDelete,
}: LeadDetailDrawerProps) {
  const [draft, setDraft] = useState<Lead | null>(lead);
  const [activeContactType, setActiveContactType] = useState<ContactType | null>(null);
  const [contactText, setContactText] = useState('');
  const [targetStatus, setTargetStatus] = useState<LeadStatus>(lead?.status || 'Para Prospectar');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!lead) {
      setDraft(null);
    } else if (!draft || lead.id !== draft.id) {
      setDraft({
        ...lead,
        serviceLogs: Array.isArray(lead.serviceLogs) ? lead.serviceLogs : [],
      });
      setActiveContactType(null);
      setContactText('');
      setTargetStatus(lead.status);
      setConfirmingDelete(false);
    }
  }, [lead]);

  if (!lead || !draft) return null;

  const whatsappUrl = buildWhatsAppUrl(draft.phone);

  const handleOpenContactForm = (type: ContactType) => {
    if (activeContactType === type) {
      setActiveContactType(null);
    } else {
      setActiveContactType(type);
      setTargetStatus(draft.status);
      setContactText(
        type === 'Ligação'
          ? 'Ligação realizada com o decisor.'
          : type === 'WhatsApp'
            ? 'Contato iniciado via WhatsApp.'
            : 'Reunião ou visita presencial realizada.'
      );
    }
  };

  const handleSaveContactRecord = () => {
    if (!contactText.trim() || !activeContactType) return;
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
      contactType: activeContactType,
      targetStatus,
      content: contactText.trim(),
    };

    const nextCallCount = activeContactType === 'Ligação' || activeContactType === 'WhatsApp' ? draft.callCount + 1 : draft.callCount;

    setDraft({
      ...draft,
      callCount: nextCallCount,
      status: targetStatus,
      serviceLogs: [newLog, ...(draft.serviceLogs || [])],
    });

    setActiveContactType(null);
    setContactText('');
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
    'w-full rounded-md border border-zinc-800 bg-[#09090B] px-2.5 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none';
  const labelClass = 'block text-[11px] font-medium text-zinc-300 mb-0.5 truncate';
  const telHref = draft.phone ? `tel:${draft.phone.replace(/[^\d+]/g, '')}` : null;

  const renderLinkButton = (raw: string, label: string) => {
    const href = normalizeExternalUrl(raw);
    if (!href) return null;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Abrir ${label}`}
        className="inline-flex items-center gap-1 text-[11px] text-orange-400 hover:text-orange-300 hover:underline shrink-0"
      >
        <ExternalLink className="h-3 w-3" />
        <span>Abrir</span>
      </a>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-lead-title"
        className="w-[90vw] h-[90vh] max-w-[1650px] max-h-[960px] bg-[#111114] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Top Header: Company Info + Large Prominent Decisor & Contact Phone */}
        <div className="px-5 py-3 border-b border-zinc-800 bg-[#09090B]/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <h2
                id="modal-lead-title"
                className="font-display text-base sm:text-lg font-bold tracking-tight text-zinc-100 truncate"
              >
                {draft.companyName || 'Detalhes do Lead'}
              </h2>
              <span className="text-xs font-semibold text-[#F97316] whitespace-nowrap">
                {draft.status}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
              Criado em {formatDateBR(draft.createdAt)} · Atualizado em {formatDateBR(draft.updatedAt)} · Resp.: {draft.owner}
            </p>
          </div>

          {/* Large Eye-Catching Decisor & Contact Phone Banner */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-5 rounded-xl border border-orange-500/35 bg-[#18181B] px-4 py-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-[#F97316]" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Decisor
                </span>
                <span
                  data-testid="lead-hero-decisor"
                  className="block font-display text-base sm:text-xl font-bold text-white leading-tight truncate max-w-[220px]"
                >
                  {draft.contactName.trim() || 'Não informado'}
                </span>
              </div>
            </div>

            <div className="hidden sm:block h-8 w-px bg-zinc-700" aria-hidden="true" />

            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Phone className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Telefone para Contato
                </span>
                {telHref ? (
                  <a
                    href={telHref}
                    data-testid="lead-hero-phone"
                    className="block font-mono tabular-nums text-base sm:text-xl font-bold text-[#F97316] hover:text-orange-300 leading-tight whitespace-nowrap transition-colors"
                  >
                    {draft.phone}
                  </a>
                ) : (
                  <span
                    data-testid="lead-hero-phone"
                    className="block font-mono text-base sm:text-lg font-semibold text-zinc-400 leading-tight"
                  >
                    Sem telefone
                  </span>
                )}
              </div>
            </div>

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Chamar no WhatsApp"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="hidden md:inline">WhatsApp</span>
              </a>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes do lead"
            className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 cursor-pointer transition-colors shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Content + Pinned Footer */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto lg:overflow-hidden p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-10 gap-4 sm:gap-5 min-h-0">
            {/* Left Column: 40% (lg:col-span-4) - Contact Action Buttons + Service Logs History */}
            <div className="lg:col-span-4 flex flex-col gap-3 min-h-0">
              <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-3.5 flex flex-col gap-2.5 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                    Registrar Contato & Evolução
                  </span>
                  <span className="font-mono tabular-nums text-xs text-orange-400 font-bold">
                    Total: {draft.callCount}
                  </span>
                </div>

                {/* 3 Clickable Contact Type Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenContactForm('Ligação')}
                    className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      activeContactType === 'Ligação'
                        ? 'bg-orange-500 text-white border-orange-400'
                        : 'bg-[#18181B] border-zinc-800 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>Ligação</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenContactForm('WhatsApp')}
                    className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      activeContactType === 'WhatsApp'
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-[#18181B] border-zinc-800 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenContactForm('Pessoal')}
                    className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      activeContactType === 'Pessoal'
                        ? 'bg-amber-600 text-white border-amber-500'
                        : 'bg-[#18181B] border-zinc-800 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    <span>Pessoal</span>
                  </button>
                </div>
              </div>

              {/* Active Contact Input Form */}
              {activeContactType && (
                <div className="rounded-xl border border-orange-500/40 bg-[#09090B] p-3.5 flex flex-col gap-2.5 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-orange-400">
                      Novo Registro de {activeContactType} ({activeUser})
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveContactType(null)}
                      aria-label="Fechar registro de contato"
                      className="text-zinc-400 hover:text-zinc-100 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div>
                    <label htmlFor="contact-text" className={labelClass}>
                      Detalhes do Contato / Atendimento
                    </label>
                    <textarea
                      id="contact-text"
                      rows={2}
                      value={contactText}
                      onChange={(e) => setContactText(e.target.value)}
                      placeholder="Descreva o que foi conversado..."
                      className="w-full rounded-md border border-zinc-800 bg-[#111114] px-2.5 py-1.5 text-xs text-zinc-100 focus:border-orange-500 focus:outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="target-status" className={labelClass}>
                      Avançar / Marcar Etapa no Funil
                    </label>
                    <select
                      id="target-status"
                      value={targetStatus}
                      onChange={(e) => setTargetStatus(e.target.value as LeadStatus)}
                      className="w-full rounded-md border border-zinc-800 bg-[#111114] px-2.5 py-1.5 text-xs text-zinc-100 focus:border-orange-500 focus:outline-none cursor-pointer"
                    >
                      {LEAD_STATUSES.map((st) => (
                        <option key={st} value={st} className="bg-[#18181B] text-zinc-100">
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveContactType(null)}
                      className="px-3 py-1.5 rounded-md border border-zinc-800 bg-[#18181B] text-xs font-medium text-zinc-300 hover:text-zinc-100 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveContactRecord}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#F97316] hover:bg-[#EA580C] text-xs font-semibold text-white cursor-pointer"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" />
                      <span>Salvar e Atualizar Funil</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Service Logs History */}
              <div className="flex-1 rounded-xl border border-zinc-800 bg-[#09090B] p-3.5 flex flex-col gap-2.5 min-h-[200px] overflow-hidden">
                <div className="flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-emerald-400" />
                    <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                      Histórico de Atendimentos
                    </h3>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-emerald-400 font-semibold">
                    {(draft.serviceLogs || []).length} registros
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
                  {(!draft.serviceLogs || draft.serviceLogs.length === 0) ? (
                    <div className="py-10 px-3 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                      Nenhum registro de atendimento realizado. Clique em Ligação, WhatsApp ou Pessoal acima para registrar.
                    </div>
                  ) : (
                    draft.serviceLogs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-lg border border-zinc-800 bg-[#18181B] p-2.5 flex flex-col gap-1 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-400 border-b border-zinc-800/80 pb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono tabular-nums text-emerald-400 font-semibold whitespace-nowrap">
                              {log.timestamp}
                            </span>
                            {log.contactType && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span
                                  className={`font-semibold whitespace-nowrap ${
                                    log.contactType === 'Ligação'
                                      ? 'text-orange-400'
                                      : log.contactType === 'WhatsApp'
                                        ? 'text-emerald-400'
                                        : 'text-amber-400'
                                  }`}
                                >
                                  {log.contactType}
                                </span>
                              </>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteServiceLog(log.id)}
                            aria-label={`Remover registro de ${log.timestamp}`}
                            title="Remover registro"
                            className="text-zinc-500 hover:text-red-400 cursor-pointer p-0.5 shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-zinc-100 whitespace-pre-wrap leading-snug">
                          {log.content}
                        </p>
                        <div className="text-[11px] text-zinc-400">
                          {log.targetStatus && (
                            <>
                              Etapa: <span className="text-[#F97316] font-medium">{log.targetStatus}</span> ·{' '}
                            </>
                          )}
                          <span>Por {log.author}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: 60% (lg:col-span-6) - Compact Zero-Scroll Layout: 1. Anotações, 2. Informações Cadastrais, 3. Presença Digital */}
            <div className="lg:col-span-6 flex flex-col gap-3 min-h-0 lg:overflow-y-auto pr-0.5">
              {/* 1. Anotações do Lead */}
              <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-3 flex flex-col gap-1.5 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-[#F97316]" />
                    <label htmlFor="ed-notes" className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                      Anotações do Lead
                    </label>
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    Briefings, acordos e notas livres
                  </span>
                </div>
                <textarea
                  id="ed-notes"
                  rows={2}
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  placeholder="Digite as anotações do lead..."
                  className="w-full rounded-md border border-zinc-800 bg-[#111114] px-2.5 py-1.5 text-xs text-zinc-100 leading-relaxed focus:border-orange-500 focus:outline-none resize-y min-h-[54px]"
                />
              </div>

              {/* 2. Informações Cadastrais (Compact 4-col grid so all 9 fields fit cleanly in 3 rows) */}
              <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-3 flex flex-col gap-2 shrink-0">
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  Informações Cadastrais
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  <div className="lg:col-span-2">
                    <label htmlFor="ed-company" className={labelClass}>
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
                    <label htmlFor="ed-status" className={labelClass}>
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
                    <label htmlFor="ed-owner" className={labelClass}>
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
                    <label htmlFor="ed-contact" className={labelClass}>
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
                    <label htmlFor="ed-phone" className={labelClass}>
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
                    <label htmlFor="ed-niche" className={labelClass}>
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
                    <label htmlFor="ed-value" className={labelClass}>
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
                      className="w-full rounded-md border border-zinc-800 bg-[#09090B] px-2.5 py-1.5 text-xs font-mono tabular-nums text-zinc-100 focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="ed-followup" className={labelClass}>
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

                  <div className="sm:col-span-1 lg:col-span-3">
                    <label htmlFor="ed-site" className={labelClass}>
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
                </div>
              </div>

              {/* 3. Presença Digital & Links (Compact 3-col grid so all 5 fields fit cleanly in 2 rows) */}
              <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-3 flex flex-col gap-2 shrink-0">
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  Presença Digital & Links
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <label htmlFor="ed-url-site" className="text-[11px] font-medium text-zinc-300 truncate">
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
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <label htmlFor="ed-url-gmn" className="text-[11px] font-medium text-zinc-300 truncate">
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
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <label htmlFor="ed-url-instagram" className="text-[11px] font-medium text-zinc-300 truncate">
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
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <label htmlFor="ed-url-facebook" className="text-[11px] font-medium text-zinc-300 truncate">
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

                  <div className="sm:col-span-2 lg:col-span-2">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <label htmlFor="ed-url-other" className="text-[11px] font-medium text-zinc-300 truncate">
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
            </div>
          </div>

          {/* Pinned Footer Actions */}
          <div className="shrink-0 px-5 py-3 border-t border-zinc-800 bg-[#09090B] flex items-center justify-between gap-3">
            {!confirmingDelete ? (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/15 transition-colors cursor-pointer"
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
                  className="rounded-lg bg-red-600 hover:bg-red-500 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
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

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg border border-zinc-800 bg-[#18181B] text-xs font-medium text-zinc-300 hover:text-zinc-100 cursor-pointer transition-colors"
              >
                Fechar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-1.5 rounded-lg bg-[#F97316] hover:bg-[#EA580C] text-xs font-semibold text-white cursor-pointer shadow-md transition-colors"
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
