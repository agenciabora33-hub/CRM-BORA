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
      className="group rounded-lg bg-[#18181B] border border-zinc-800 p-2.5 xl:p-3 hover:border-zinc-700 transition-colors duration-150 cursor-grab active:cursor-grabbing flex flex-col gap-2 min-w-0"
    >
      {/* Top: Title button + clean unboxed metadata line */}
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-start justify-between gap-1.5 min-w-0">
          <button
            type="button"
            onClick={() => onSelect(lead)}
            aria-label={`Abrir detalhes de ${lead.companyName}`}
            className="text-left font-display font-semibold text-xs xl:text-sm text-zinc-100 hover:text-orange-400 transition-colors leading-snug line-clamp-2 cursor-pointer min-w-0"
          >
            {lead.companyName}
          </button>
          {lead.estimatedValue > 0 && (
            <span className="font-mono tabular-nums text-[11px] xl:text-xs font-medium text-zinc-200 shrink-0">
              {formatCurrencyBRL(lead.estimatedValue)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-zinc-400 truncate">
          <span className="font-medium text-zinc-300">{lead.niche || 'Outro'}</span>
          <span aria-hidden="true">·</span>
          <span>{lead.owner}</span>
        </div>
      </div>

      {/* Middle: Contact & Digital Presence */}
      {(lead.contactName || lead.websiteOrSocial || digitalLinks.length > 0) && (
        <div className="flex flex-col gap-1.5 text-xs text-zinc-400">
          {lead.contactName && (
            <div className="flex items-center gap-1.5 truncate">
              <User className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
              <span className="truncate text-zinc-200">{lead.contactName}</span>
            </div>
          )}
          {lead.websiteOrSocial && (
            <div className="flex items-center gap-1.5 truncate">
              <Globe className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
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
                  className="inline-flex items-center gap-1 text-orange-400 hover:text-orange-300 hover:underline"
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
      <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-1.5 min-w-0">
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onIncrementCall(lead.id)}
            aria-label={`+1 Ligação para ${lead.companyName}`}
            title="Registrar +1 ligação"
            className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[11px] xl:text-xs font-medium bg-[#09090B] hover:bg-orange-500/15 text-zinc-100 hover:text-orange-300 border border-zinc-800 hover:border-orange-500/40 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Phone className="h-3 w-3 shrink-0" />
            <span className="font-mono tabular-nums">{lead.callCount}</span>
            <span className="text-[10px] text-zinc-400">+1</span>
          </button>

          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir WhatsApp de ${lead.companyName}`}
              title={`WhatsApp: ${lead.phone}`}
              className="inline-flex items-center justify-center rounded p-1.5 text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors shrink-0"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        <select
          aria-label={`Mover etapa de ${lead.companyName}`}
          value={lead.status}
          onChange={(e) => onMoveStatus(lead.id, e.target.value as LeadStatus)}
          className="min-w-0 flex-1 truncate rounded border border-zinc-800 bg-[#09090B] px-1.5 py-1 text-[11px] font-medium text-zinc-300 hover:text-zinc-100 focus:outline-none focus:border-orange-500 cursor-pointer"
        >
          {LEAD_STATUSES.map((st) => (
            <option key={st} value={st} className="bg-[#18181B] text-zinc-100">
              {st}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}
