import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Download,
  ExternalLink,
  MessageCircle,
  Phone,
  Search,
  X,
} from 'lucide-react';
import { LEAD_STATUSES, Lead, LeadStatus } from '../types/crm';
import {
  buildWhatsAppUrl,
  filterLeads,
  formatCurrencyBRL,
  formatDateBR,
  generateCsvContent,
  getFollowUpUrgency,
  normalizeExternalUrl,
  NICHE_SUGGESTIONS,
} from '../utils/crmLogic';

interface TableViewProps {
  leads: Lead[];
  teamMembers: [string, string];
  onSelectLead: (lead: Lead) => void;
  onIncrementCall: (leadId: string) => void;
  onMoveStatus: (leadId: string, nextStatus: LeadStatus) => void;
  onNotifyExport: () => void;
}

export function TableView({
  leads,
  teamMembers,
  onSelectLead,
  onIncrementCall,
  onMoveStatus,
  onNotifyExport,
}: TableViewProps) {
  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [nicheFilter, setNicheFilter] = useState('all');
  const [followUpFilter, setFollowUpFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  const filteredLeads = useMemo(
    () =>
      filterLeads(leads, {
        search,
        owner: ownerFilter,
        status: statusFilter,
        niche: nicheFilter,
        followUpFilter,
        sortBy,
      }),
    [leads, ownerFilter, statusFilter, nicheFilter, followUpFilter, search, sortBy]
  );

  const hasActiveFilters =
    search.trim() !== '' ||
    ownerFilter !== 'all' ||
    statusFilter !== 'all' ||
    nicheFilter !== 'all' ||
    followUpFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setOwnerFilter('all');
    setStatusFilter('all');
    setNicheFilter('all');
    setFollowUpFilter('all');
    setSortBy('recent');
  };

  const handleExportCsv = () => {
    const csv = generateCsvContent(filteredLeads);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prospects-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onNotifyExport();
  };

  return (
    <section aria-label="Tabela de Prospects" className="flex flex-col gap-4">
      {/* Header + Export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-zinc-50">
            Lista de Prospects
          </h1>
          <p className="text-xs text-zinc-400">
            Exibindo{' '}
            <span className="font-mono tabular-nums font-medium text-zinc-100">
              {filteredLeads.length}
            </span>{' '}
            de{' '}
            <span className="font-mono tabular-nums font-medium text-zinc-100">
              {leads.length}
            </span>{' '}
            leads cadastrados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            aria-label="Ordenar tabela"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-md border border-zinc-800 bg-[#111114] px-2.5 py-1.5 text-xs text-zinc-200 focus:border-orange-500 focus:outline-none cursor-pointer"
          >
            <option value="recent">Mais recentes</option>
            <option value="valueDesc">Maior valor (R$)</option>
            <option value="nameAsc">Nome da empresa (A-Z)</option>
          </select>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-[#18181B] px-3 py-2 text-xs font-medium text-zinc-100 hover:bg-zinc-800 hover:border-zinc-700 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-[#F97316]" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
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
          <option value="all">Todos os responsáveis</option>
          {teamMembers.map((member) => (
            <option key={member} value={member}>
              {member}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrar por etapa do funil"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-zinc-800 bg-[#09090B] px-3 py-2 text-xs text-zinc-100 focus:border-orange-500 focus:outline-none cursor-pointer"
        >
          <option value="all">Todas as etapas</option>
          {LEAD_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrar por nicho"
          value={nicheFilter}
          onChange={(e) => setNicheFilter(e.target.value)}
          className="rounded-md border border-zinc-800 bg-[#09090B] px-3 py-2 text-xs text-zinc-100 focus:border-orange-500 focus:outline-none cursor-pointer"
        >
          <option value="all">Todos os nichos</option>
          {NICHE_SUGGESTIONS.map((niche) => (
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
          <option value="upcoming">Próximos</option>
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

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 bg-[#111114] overflow-hidden">
        {filteredLeads.length === 0 ? (
          <div className="py-12 px-4 text-center flex flex-col items-center gap-2">
            <p className="text-sm font-medium text-zinc-100">
              Nenhum prospect encontrado com os filtros atuais.
            </p>
            <p className="text-xs text-zinc-400">
              Ajuste sua busca ou limpe os filtros para visualizar todos os leads.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-2 rounded-md border border-zinc-700 bg-[#18181B] px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-800 cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-[#09090B]/70 text-xs font-medium text-zinc-400">
                  <th className="py-2.5 px-4">Empresa / Nicho</th>
                  <th className="py-2.5 px-3">Decisor / Presença Digital</th>
                  <th className="py-2.5 px-3">Etapa</th>
                  <th className="py-2.5 px-3">Resp.</th>
                  <th className="py-2.5 px-3 text-right">Valor Est.</th>
                  <th className="py-2.5 px-3">Follow-up</th>
                  <th className="py-2.5 px-3 text-right">Ligações</th>
                  <th className="py-2.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-sm">
                {filteredLeads.map((lead) => {
                  const urgency = getFollowUpUrgency(lead.nextFollowUp, lead.status);
                  const whatsappUrl = buildWhatsAppUrl(lead.phone);
                  const primaryLink =
                    normalizeExternalUrl(lead.websiteUrl) ||
                    normalizeExternalUrl(lead.instagramUrl) ||
                    normalizeExternalUrl(lead.googleBusinessUrl);

                  return (
                    <tr key={lead.id} className="hover:bg-zinc-900/60 transition-colors">
                      <td className="py-2.5 px-4 max-w-[230px]">
                        <button
                          type="button"
                          onClick={() => onSelectLead(lead)}
                          className="font-display font-semibold text-zinc-100 hover:text-orange-400 text-left truncate block w-full cursor-pointer"
                        >
                          {lead.companyName}
                        </button>
                        <span className="text-xs text-zinc-400">{lead.niche || 'Outro'}</span>
                      </td>

                      <td className="py-2.5 px-3 max-w-[220px]">
                        <div className="text-xs font-medium text-zinc-200 truncate">
                          {lead.contactName || '—'}
                        </div>
                        <div className="text-xs text-zinc-400 truncate flex items-center gap-1.5">
                          {primaryLink ? (
                            <a
                              href={primaryLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-orange-400 hover:text-orange-300 hover:underline truncate"
                            >
                              {lead.websiteOrSocial || lead.websiteUrl || lead.instagramUrl || lead.googleBusinessUrl}
                            </a>
                          ) : (
                            <span className="truncate">
                              {lead.websiteOrSocial || lead.phone || '—'}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <select
                          aria-label={`Etapa de ${lead.companyName}`}
                          value={lead.status}
                          onChange={(e) => onMoveStatus(lead.id, e.target.value as LeadStatus)}
                          className="rounded border border-zinc-800 bg-[#09090B] px-2 py-1 text-xs font-medium text-zinc-100 focus:border-orange-500 focus:outline-none cursor-pointer"
                        >
                          {LEAD_STATUSES.map((st) => (
                            <option key={st} value={st} className="bg-[#18181B] text-zinc-100">
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-2.5 px-3 text-xs text-zinc-200 whitespace-nowrap">
                        {lead.owner}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-xs text-zinc-100 whitespace-nowrap">
                        {formatCurrencyBRL(lead.estimatedValue)}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {lead.nextFollowUp ? (
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-mono tabular-nums ${
                              urgency === 'overdue'
                                ? 'text-red-400 font-semibold'
                                : urgency === 'today'
                                  ? 'text-amber-400 font-semibold'
                                  : 'text-zinc-400'
                            }`}
                          >
                            {urgency === 'overdue' && <AlertTriangle className="h-3 w-3" />}
                            {urgency === 'today' && <Clock className="h-3 w-3" />}
                            {formatDateBR(lead.nextFollowUp)}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-500">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onIncrementCall(lead.id)}
                          aria-label={`+1 Ligação para ${lead.companyName}`}
                          className="inline-flex items-center gap-1 rounded border border-zinc-800 bg-[#09090B] hover:bg-orange-500/15 hover:text-orange-300 hover:border-orange-500/40 px-2 py-1 text-xs font-mono tabular-nums text-zinc-100 transition-colors cursor-pointer"
                        >
                          <Phone className="h-3 w-3" />
                          <span>{lead.callCount}</span>
                          <span className="font-sans text-[11px] text-zinc-400">+1</span>
                        </button>
                      </td>

                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {whatsappUrl && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`WhatsApp de ${lead.companyName}`}
                              title="Abrir WhatsApp"
                              className="inline-flex items-center justify-center rounded p-1.5 text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => onSelectLead(lead)}
                            aria-label={`Detalhes de ${lead.companyName}`}
                            className="inline-flex items-center gap-1 rounded border border-zinc-800 bg-[#18181B] hover:bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-100 transition-colors cursor-pointer"
                          >
                            <ExternalLink className="h-3 w-3 text-zinc-400" />
                            <span>Abrir</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
