import { useMemo } from 'react';
import { AlertTriangle, ChevronRight, Clock } from 'lucide-react';
import { Lead } from '../types/crm';
import { formatDateBR, getFollowUpAlerts } from '../utils/crmLogic';

interface FollowUpAlertBarProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

export function FollowUpAlertBar({ leads, onSelectLead }: FollowUpAlertBarProps) {
  const alerts = useMemo(() => getFollowUpAlerts(leads), [leads]);

  if (alerts.totalCount === 0) {
    return null;
  }

  const hasOverdue = alerts.overdue.length > 0;

  return (
    <section
      aria-label="Alertas de retorno de leads"
      data-testid="followup-alert-bar"
      className={`mb-4 rounded-xl border px-3.5 py-2.5 flex flex-col lg:flex-row lg:items-center gap-2.5 lg:gap-4 ${
        hasOverdue
          ? 'border-red-500/35 bg-red-950/15'
          : 'border-amber-500/35 bg-amber-950/15'
      }`}
    >
      {/* Left summary cluster */}
      <div className="flex items-center gap-2 shrink-0">
        {hasOverdue ? (
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" aria-hidden="true" />
        ) : (
          <Clock className="h-4 w-4 text-amber-400 shrink-0" aria-hidden="true" />
        )}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          <span className="font-display font-semibold text-zinc-100 tracking-tight">
            Retornos urgentes
          </span>
          <span className="text-zinc-600" aria-hidden="true">
            ·
          </span>
          {alerts.overdue.length > 0 && (
            <span className="font-medium text-red-300 tabular-nums">
              {alerts.overdue.length} em atraso
            </span>
          )}
          {alerts.overdue.length > 0 && alerts.today.length > 0 && (
            <span className="text-zinc-600" aria-hidden="true">
              ·
            </span>
          )}
          {alerts.today.length > 0 && (
            <span className="font-medium text-amber-300 tabular-nums">
              {alerts.today.length} para hoje
            </span>
          )}
        </div>
      </div>

      {/* Horizontal clickable strip of overdue + today leads */}
      <div className="kanban-scroll flex items-center gap-2 overflow-x-auto pb-0.5 flex-1 min-w-0">
        {alerts.overdue.map((lead) => {
          const shortDate = formatDateBR(lead.nextFollowUp).slice(0, 5);
          return (
            <button
              key={lead.id}
              type="button"
              onClick={() => onSelectLead(lead)}
              aria-label={`Abrir lead em atraso: ${lead.companyName}`}
              className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-red-500/35 bg-[#18181B]/90 hover:bg-red-950/40 hover:border-red-400/60 px-2.5 py-1.5 text-xs transition-colors cursor-pointer group"
            >
              <span className="font-mono tabular-nums text-[11px] font-semibold text-red-300">
                Atrasado {shortDate}
              </span>
              <span className="font-medium text-zinc-100 truncate max-w-[160px]">
                {lead.companyName}
              </span>
              {lead.owner && (
                <span className="text-[11px] text-zinc-400 hidden sm:inline">
                  · {lead.owner}
                </span>
              )}
              <ChevronRight className="h-3.5 w-3.5 text-zinc-500 group-hover:text-red-300 transition-colors shrink-0" />
            </button>
          );
        })}

        {alerts.today.map((lead) => (
          <button
            key={lead.id}
            type="button"
            onClick={() => onSelectLead(lead)}
            aria-label={`Abrir lead agendado para hoje: ${lead.companyName}`}
            className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-amber-500/35 bg-[#18181B]/90 hover:bg-amber-950/40 hover:border-amber-400/60 px-2.5 py-1.5 text-xs transition-colors cursor-pointer group"
          >
            <span className="text-[11px] font-semibold text-amber-300">
              Hoje
            </span>
            <span className="font-medium text-zinc-100 truncate max-w-[160px]">
              {lead.companyName}
            </span>
            {lead.owner && (
              <span className="text-[11px] text-zinc-400 hidden sm:inline">
                · {lead.owner}
              </span>
            )}
            <ChevronRight className="h-3.5 w-3.5 text-zinc-500 group-hover:text-amber-300 transition-colors shrink-0" />
          </button>
        ))}
      </div>
    </section>
  );
}
