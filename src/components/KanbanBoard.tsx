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
  'Para Prospectar': 'bg-slate-400',
  'Contato Feito': 'bg-[#2563EB]',
  'Interesse / Conversa': 'bg-indigo-500',
  'Reunião / Proposta': 'bg-[#D97706]',
  'Fechado (Ganho)': 'bg-[#16A34A]',
  'Perdido': 'bg-slate-300',
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
          <h1 className="font-display text-lg font-semibold text-[#0F172A]">
            Funil de Prospecção
          </h1>
          <p className="text-xs text-[#64748B]">
            Arraste os cards entre colunas ou use o seletor rápido para atualizar a etapa.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-[#E2E8F0] rounded-lg p-1">
          <Filter className="h-3.5 w-3.5 text-[#64748B] ml-2" />
          <button
            type="button"
            onClick={() => setOwnerFilter('all')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              ownerFilter === 'all'
                ? 'bg-[#2563EB] text-white'
                : 'text-[#64748B] hover:text-[#0F172A]'
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
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  ownerFilter === member
                    ? 'bg-[#2563EB] text-white'
                    : 'text-[#64748B] hover:text-[#0F172A]'
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
                  ? 'bg-blue-50/70 border-[#2563EB]/50'
                  : 'bg-[#F1F5F9]/80 border-[#E2E8F0]'
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
                    <h2 className="font-display text-sm font-semibold text-[#0F172A] truncate">
                      {status}
                    </h2>
                  </div>
                  <p className="font-mono tabular-nums text-xs text-[#64748B] mt-0.5 pl-4">
                    {formatCurrencyBRL(columnTotalValue)}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-mono tabular-nums text-xs font-semibold text-[#64748B] bg-white border border-[#E2E8F0] rounded px-1.5 py-0.5">
                    {columnLeads.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenNewProspect(status)}
                    aria-label={`Adicionar prospect em ${status}`}
                    title={`Adicionar prospect em ${status}`}
                    className="p-1 rounded hover:bg-white text-[#64748B] hover:text-[#2563EB] transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Cards Stack */}
              <div className="flex flex-col gap-2.5 min-h-[120px]">
                {columnLeads.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-white/40 px-3 py-6 text-center">
                    <p className="text-xs text-[#64748B]">Nenhum lead nesta etapa</p>
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
