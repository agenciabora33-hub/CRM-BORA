import { useState } from 'react';
import { Filter, Plus } from 'lucide-react';
import { LEAD_STATUSES, Lead, LeadStatus } from '../types/crm';
import { formatCurrencyBRL } from '../utils/crmLogic';
import { KanbanCard } from './KanbanCard';

interface KanbanBoardProps {
  leads: Lead[];
  teamMembers: [string, string];
  onSelectLead: (lead: Lead) => void;
  onIncrementCall: (leadId: string) => void;
  onMoveStatus: (leadId: string, nextStatus: LeadStatus) => void;
  onOpenNewProspect: (initialStatus?: LeadStatus) => void;
}

const STAGE_DOT_COLORS: Record<LeadStatus, string> = {
  'Para Prospectar': 'bg-zinc-400',
  'Contato Feito': 'bg-sky-400',
  'Interesse / Conversa': 'bg-orange-400',
  'Reunião / Proposta': 'bg-amber-400',
  'Fechado (Ganho)': 'bg-emerald-400',
  'Perdido': 'bg-zinc-600',
};

export function KanbanBoard({
  leads,
  teamMembers,
  onSelectLead,
  onIncrementCall,
  onMoveStatus,
  onOpenNewProspect,
}: KanbanBoardProps) {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<LeadStatus | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<string>('all');

  const visibleLeads =
    ownerFilter === 'all' ? leads : leads.filter((lead) => lead.owner === ownerFilter);

  const handleDragStart = (e: React.DragEvent<HTMLElement>, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, status: LeadStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, status: LeadStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedLeadId;
    setDragOverColumn(null);
    setDraggedLeadId(null);
    if (id) {
      onMoveStatus(id, status);
    }
  };

  return (
    <section aria-label="Quadro Kanban de Prospecção" className="flex flex-col gap-4">
      {/* Compact Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-zinc-50">
            Funil de Prospecção
          </h1>
          <p className="text-xs text-zinc-400">
            Arraste os cards entre colunas ou use o seletor rápido para atualizar a etapa em tempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 bg-[#111114] border border-zinc-800 rounded-lg p-1">
          <Filter className="h-3.5 w-3.5 text-zinc-500 ml-2 mr-0.5" />
          <button
            type="button"
            onClick={() => setOwnerFilter('all')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              ownerFilter === 'all'
                ? 'bg-[#F97316] text-white'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            Todos ({leads.length})
          </button>
          {teamMembers.map((member) => {
            const count = leads.filter((l) => l.owner === member).length;
            return (
              <button
                key={member}
                type="button"
                onClick={() => setOwnerFilter(member)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  ownerFilter === member
                    ? 'bg-[#F97316] text-white'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                {member} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Horizontal 6-Column Kanban Grid */}
      <div className="kanban-scroll flex gap-3 overflow-x-auto pb-4 items-start">
        {LEAD_STATUSES.map((status) => {
          const columnLeads = visibleLeads.filter((l) => l.status === status);
          const columnTotalValue = columnLeads.reduce(
            (sum, l) => sum + (Number(l.estimatedValue) || 0),
            0
          );
          const isDropTarget = dragOverColumn === status;

          return (
            <div
              key={status}
              data-testid={`kanban-col-${status}`}
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={() => setDragOverColumn((prev) => (prev === status ? null : prev))}
              onDrop={(e) => handleDrop(e, status)}
              className={`w-[268px] sm:w-[272px] shrink-0 rounded-xl border p-3 flex flex-col gap-3 transition-colors duration-150 ${
                isDropTarget
                  ? 'bg-orange-950/30 border-orange-500/60'
                  : 'bg-[#111114] border-zinc-800'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-start justify-between gap-2 px-0.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 rounded-xs shrink-0 ${STAGE_DOT_COLORS[status]}`}
                    />
                    <h2 className="font-display text-sm font-semibold tracking-tight text-zinc-100 truncate">
                      {status}
                    </h2>
                  </div>
                  <p className="font-mono tabular-nums text-xs text-zinc-400 mt-0.5 pl-4">
                    {formatCurrencyBRL(columnTotalValue)}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-mono tabular-nums text-xs font-semibold text-zinc-300 bg-[#09090B] border border-zinc-800 rounded px-1.5 py-0.5">
                    {columnLeads.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenNewProspect(status)}
                    aria-label={`Adicionar prospect em ${status}`}
                    title={`Adicionar prospect em ${status}`}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-orange-400 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Cards Stack */}
              <div className="flex flex-col gap-2.5 min-h-[120px]">
                {columnLeads.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-zinc-800 bg-[#09090B]/50 px-3 py-6 text-center">
                    <p className="text-xs text-zinc-500">Nenhum lead nesta etapa</p>
                  </div>
                ) : (
                  columnLeads.map((lead) => (
                    <KanbanCard
                      key={lead.id}
                      lead={lead}
                      onSelect={onSelectLead}
                      onIncrementCall={onIncrementCall}
                      onMoveStatus={onMoveStatus}
                      onDragStart={handleDragStart}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
