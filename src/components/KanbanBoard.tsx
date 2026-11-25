import { useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { LEAD_STATUSES, Lead, LeadStatus } from '../types/crm';
import { filterLeads, formatCurrencyBRL, NICHE_SUGGESTIONS } from '../utils/crmLogic';
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
  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [nicheFilter, setNicheFilter] = useState<string>('all');
  const [followUpFilter, setFollowUpFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');

  const availableOwners = useMemo(
    () => Array.from(new Set([...teamMembers, ...leads.map((l) => l.owner.trim()).filter(Boolean)])),
    [leads, teamMembers]
  );

  const availableNiches = useMemo(
    () =>
      Array.from(
        new Set([...NICHE_SUGGESTIONS, ...leads.map((l) => l.niche.trim()).filter(Boolean)])
      ),
    [leads]
  );

  const visibleLeads = useMemo(
    () =>
      filterLeads(leads, {
        search,
        owner: ownerFilter,
        niche: nicheFilter,
        followUpFilter,
        sortBy,
      }),
    [leads, search, ownerFilter, nicheFilter, followUpFilter, sortBy]
  );

  const hasActiveFilters =
    search.trim() !== '' ||
    ownerFilter !== 'all' ||
    nicheFilter !== 'all' ||
    followUpFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setOwnerFilter('all');
    setNicheFilter('all');
    setFollowUpFilter('all');
    setSortBy('recent');
  };

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
      {/* Toolbar with Search and Enhanced Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-zinc-50">
              Funil de Prospecção
            </h1>
            <p className="text-xs text-zinc-400">
              Exibindo {visibleLeads.length} de {leads.length} leads no funil. Arraste cards entre etapas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              aria-label="Ordenar leads"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-md border border-zinc-800 bg-[#111114] px-2.5 py-1.5 text-xs text-zinc-200 focus:border-orange-500 focus:outline-none cursor-pointer"
            >
              <option value="recent">Mais recentes</option>
              <option value="valueDesc">Maior valor (R$)</option>
              <option value="nameAsc">Nome da empresa (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="rounded-xl border border-zinc-800 bg-[#111114] p-3 flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar diretamente por contato, empresa, telefone ou observação..."
              aria-label="Pesquisar diretamente por contato"
              className="w-full rounded-md border border-zinc-800 bg-[#09090B] pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none"
            />
          </div>

          <select
            aria-label="Filtrar por responsável"
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="rounded-md border border-zinc-800 bg-[#09090B] px-3 py-2 text-xs text-zinc-100 focus:border-orange-500 focus:outline-none cursor-pointer"
          >
            <option value="all">Todos os sócios ({leads.length})</option>
            {availableOwners.map((member) => {
              const count = leads.filter((l) => l.owner === member).length;
              return (
                <option key={member} value={member}>
                  {member} ({count})
                </option>
              );
            })}
          </select>

          <select
            aria-label="Filtrar por nicho"
            value={nicheFilter}
            onChange={(e) => setNicheFilter(e.target.value)}
            className="rounded-md border border-zinc-800 bg-[#09090B] px-3 py-2 text-xs text-zinc-100 focus:border-orange-500 focus:outline-none cursor-pointer"
          >
            <option value="all">Todos os nichos</option>
            {availableNiches.map((niche) => (
              <option key={niche} value={niche}>
                {niche}
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrar por follow-up"
            value={followUpFilter}
            onChange={(e) => setFollowUpFilter(e.target.value)}
            className="rounded-md border border-zinc-800 bg-[#09090B] px-3 py-2 text-xs text-zinc-100 focus:border-orange-500 focus:outline-none cursor-pointer"
          >
            <option value="all">Todos os follow-ups</option>
            <option value="overdue">Vencidos</option>
            <option value="today">Para hoje</option>
            <option value="upcoming">Vencidos + próximos 3 dias</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>Limpar filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* Responsive 6-Column Kanban Grid (all 6 stages visible simultaneously on lg+ without horizontal scroll) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 items-start pb-4">
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
              className={`w-full min-w-0 rounded-xl border p-2.5 flex flex-col gap-2.5 transition-colors duration-150 ${
                isDropTarget
                  ? 'bg-orange-950/30 border-orange-500/60'
                  : 'bg-[#111114] border-zinc-800'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-start justify-between gap-1.5 px-0.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 rounded-xs shrink-0 ${STAGE_DOT_COLORS[status]}`}
                    />
                    <h2
                      title={status}
                      className="font-display text-xs xl:text-sm font-semibold tracking-tight text-zinc-100 truncate"
                    >
                      {status}
                    </h2>
                  </div>
                  <p className="font-mono tabular-nums text-[11px] xl:text-xs text-zinc-400 mt-0.5 pl-3.5 truncate">
                    {formatCurrencyBRL(columnTotalValue)}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-mono tabular-nums text-[11px] font-semibold text-zinc-300 bg-[#09090B] border border-zinc-800 rounded px-1.5 py-0.5">
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
