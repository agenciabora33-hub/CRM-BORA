import {
  AlertTriangle,
  Clock,
  ExternalLink,
  Globe,
  MessageCircle,
  Phone,
  User,
} from 'lucide-react';
import { LEAD_STATUSES, Lead, LeadStatus } from '../types/crm';
import {
  buildWhatsAppUrl,
  formatCurrencyBRL,
  formatDateBR,
  getFollowUpUrgency,
  normalizeExternalUrl,
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

  const digitalLinks = [
    { label: 'Site', url: normalizeExternalUrl(lead.websiteUrl) },
    { label: 'Google', url: normalizeExternalUrl(lead.googleBusinessUrl) },
    { label: 'Instagram', url: normalizeExternalUrl(lead.instagramUrl) },
    { label: 'Facebook', url: normalizeExternalUrl(lead.facebookUrl) },
    { label: 'Mídia', url: normalizeExternalUrl(lead.otherSocialUrl) },
  ].filter((item): item is { label: string; url: string } => Boolean(item.url));

  return (
    <article
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      data-testid={`kanban-card-${lead.id}`}
      className="group rounded-lg bg-[#162033] border border-slate-800 p-3.5 hover:border-slate-700 transition-colors duration-150 cursor-grab active:cursor-grabbing flex flex-col gap-2.5"
    >
      {/* Top: Title button + clean unboxed metadata line */}
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => onSelect(lead)}
            aria-label={`Abrir detalhes de ${lead.companyName}`}
            className="text-left font-display font-semibold text-sm text-slate-100 hover:text-blue-400 transition-colors leading-snug line-clamp-2 cursor-pointer"
          >
            {lead.companyName}
          </button>
          {lead.estimatedValue > 0 && (
            <span className="font-mono tabular-nums text-xs font-medium text-slate-200 shrink-0">
              {formatCurrencyBRL(lead.estimatedValue)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
          <span className="font-medium text-slate-300">{lead.niche || 'Outro'}</span>
          <span aria-hidden="true">·</span>
          <span>{lead.owner}</span>
        </div>
      </div>

      {/* Middle: Contact & Digital Presence */}
      {(lead.contactName || lead.websiteOrSocial || digitalLinks.length > 0) && (
        <div className="flex flex-col gap-1.5 text-xs text-slate-400">
          {lead.contactName && (
            <div className="flex items-center gap-1.5 truncate">
              <User className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              <span className="truncate text-slate-200">{lead.contactName}</span>
            </div>
          )}
          {lead.websiteOrSocial && (
            <div className="flex items-center gap-1.5 truncate">
              <Globe className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              <span className="truncate">{lead.websiteOrSocial}</span>
            </div>
          )}
          {digitalLinks.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px]">
              {digitalLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 hover:underline"
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                  <span>{link.label}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Follow-up Urgency Indicator */}
      {(urgency === 'overdue' || urgency === 'today') && (
        <div
          className={`inline-flex items-center gap-1.5 self-start rounded px-2 py-0.5 text-xs font-medium ${
            urgency === 'overdue'
              ? 'bg-red-500/15 text-red-300 border border-red-500/30'
              : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
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
      <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onIncrementCall(lead.id)}
            aria-label={`+1 Ligação para ${lead.companyName}`}
            title="Registrar +1 ligação"
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-slate-900 hover:bg-blue-500/15 text-slate-100 hover:text-blue-300 border border-slate-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Phone className="h-3 w-3" />
            <span className="font-mono tabular-nums">{lead.callCount}</span>
            <span className="text-[11px] text-slate-400">+1</span>
          </button>

          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir WhatsApp de ${lead.companyName}`}
              title={`WhatsApp: ${lead.phone}`}
              className="inline-flex items-center justify-center rounded p-1.5 text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        <select
          aria-label={`Mover etapa de ${lead.companyName}`}
          value={lead.status}
          onChange={(e) => onMoveStatus(lead.id, e.target.value as LeadStatus)}
          className="max-w-[122px] truncate rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-[11px] font-medium text-slate-300 hover:text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          {LEAD_STATUSES.map((st) => (
            <option key={st} value={st} className="bg-slate-900 text-slate-100">
              {st}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}
