import { AlertTriangle, Clock, Globe, MessageCircle, Phone, User } from 'lucide-react';
import { LEAD_STATUSES, Lead, LeadStatus } from '../types/crm';
import {
  buildWhatsAppUrl,
  formatCurrencyBRL,
  formatDateBR,
  getFollowUpUrgency,
} from '../utils/crmLogic';

interface KanbanCardProps {
  lead: Lead;
  onSelect: (lead: Lead) => void;
  onIncrementCall: (leadId: string) => void;
  onMoveStatus: (leadId: string, nextStatus: LeadStatus) => void;
  onDragStart: (e: React.DragEvent<HTMLElement>, leadId: string) => void;
}

export function KanbanCard({
  lead,
  onSelect,
  onIncrementCall,
  onMoveStatus,
  onDragStart,
}: KanbanCardProps) {
  const urgency = getFollowUpUrgency(lead.nextFollowUp, lead.status);
  const whatsappUrl = buildWhatsAppUrl(lead.phone);

  return (
    <article
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      data-testid={`kanban-card-${lead.id}`}
      className="group rounded-lg bg-white border border-[#E2E8F0] p-3.5 hover:border-slate-300 transition-colors duration-150 cursor-grab active:cursor-grabbing flex flex-col gap-2.5"
    >
      {/* Top: Title button + clean unboxed metadata line */}
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => onSelect(lead)}
            aria-label={`Abrir detalhes de ${lead.companyName}`}
            className="text-left font-display font-semibold text-sm text-[#0F172A] hover:text-[#2563EB] transition-colors leading-snug line-clamp-2 cursor-pointer"
          >
            {lead.companyName}
          </button>
          {lead.estimatedValue > 0 && (
            <span className="font-mono tabular-nums text-xs font-medium text-[#0F172A] shrink-0">
              {formatCurrencyBRL(lead.estimatedValue)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[#64748B] truncate">
          <span className="font-medium text-slate-700">{lead.niche || 'Outro'}</span>
          <span aria-hidden="true">·</span>
          <span>{lead.owner}</span>
        </div>
      </div>

      {/* Middle: Contact & Website/Social */}
      <div className="flex flex-col gap-1 text-xs text-[#64748B]">
        {lead.contactName && (
          <div className="flex items-center gap-1.5 truncate">
            <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate text-[#0F172A]">{lead.contactName}</span>
          </div>
        )}
        {lead.websiteOrSocial && (
          <div className="flex items-center gap-1.5 truncate">
            <Globe className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{lead.websiteOrSocial}</span>
          </div>
        )}
      </div>

      {/* Follow-up Urgency Indicator (explicit icon + text, never hue-only) */}
      {(urgency === 'overdue' || urgency === 'today') && (
        <div
          className={`inline-flex items-center gap-1.5 self-start rounded px-2 py-0.5 text-xs font-medium ${
            urgency === 'overdue'
              ? 'bg-red-50 text-[#DC2626] border border-red-200'
              : 'bg-amber-50 text-[#D97706] border border-amber-200'
          }`}
        >
          {urgency === 'overdue' ? (
            <AlertTriangle className="h-3 w-3 shrink-0" />
          ) : (
            <Clock className="h-3 w-3 shrink-0" />
          )}
          <span>
            {urgency === 'overdue'
              ? `Atrasado (${formatDateBR(lead.nextFollowUp)})`
              : 'Retorno hoje'}
          </span>
        </div>
      )}

      {/* Footer Quick Actions */}
      <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onIncrementCall(lead.id)}
            aria-label={`+1 Ligação para ${lead.companyName}`}
            title="Registrar +1 ligação"
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-[#F8FAFC] hover:bg-blue-50 text-[#0F172A] hover:text-[#2563EB] border border-[#E2E8F0] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Phone className="h-3 w-3" />
            <span className="font-mono tabular-nums">{lead.callCount}</span>
            <span className="text-[11px] text-[#64748B]">+1</span>
          </button>

          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir WhatsApp de ${lead.companyName}`}
              title={`WhatsApp: ${lead.phone}`}
              className="inline-flex items-center justify-center rounded p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        <select
          aria-label={`Mover etapa de ${lead.companyName}`}
          value={lead.status}
          onChange={(e) => onMoveStatus(lead.id, e.target.value as LeadStatus)}
          className="max-w-[122px] truncate rounded border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 py-1 text-[11px] font-medium text-[#64748B] hover:text-[#0F172A] focus:outline-none focus:border-[#2563EB] cursor-pointer"
        >
          {LEAD_STATUSES.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}
