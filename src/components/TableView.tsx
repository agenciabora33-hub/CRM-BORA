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
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  const filteredLeads = useMemo(
    () =>
      filterLeads(leads, {
        search,
        owner: ownerFilter,
        status: statusFilter,
        onlyOverdue,
      }),
    [leads, ownerFilter, onlyOverdue, search, statusFilter]
  );

  const hasActiveFilters =
    search.trim() !== '' || ownerFilter !== 'all' || statusFilter !== 'all' || onlyOverdue;

  const clearFilters = () => {
    setSearch('');
    setOwnerFilter('all');
    setStatusFilter('all');
    setOnlyOverdue(false);
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
          <h1 className="font-display text-lg font-semibold text-[#0F172A]">
            Lista de Prospects
          </h1>
          <p className="text-xs text-[#64748B]">
            Exibindo{' '}
            <span className="font-mono tabular-nums font-medium text-[#0F172A]">
              {filteredLeads.length}
            </span>{' '}
            de{' '}
            <span className="font-mono tabular-nums font-medium text-[#0F172A]">
              {leads.length}
            </span>{' '}
            leads cadastrados.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-medium text-[#0F172A] hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
        >
          <Download className="h-3.5 w-3.5 text-[#64748B]" />
          <span>Exportar CSV</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-3 flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por empresa, contato, nicho, telefone ou observação..."
            aria-label="Buscar prospects"
            className="w-full rounded-md border border-[#E2E8F0] bg-[#F8FAFC] pl-9 pr-3 py-2 text-sm text-[#0F172A] placeholder:text-[#64748B] focus:bg-white focus:border-[#2563EB] focus:outline-none"
          />
        </div>

        <select
          aria-label="Filtrar por responsável"
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
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
          className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
        >
          <option value="all">Todas as etapas</option>
          {LEAD_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setOnlyOverdue((v) => !v)}
          aria-pressed={onlyOverdue}
          className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
            onlyOverdue
              ? 'bg-red-50 border-red-200 text-[#DC2626]'
              : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Follow-up vencido</span>
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-2 text-xs font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 transition-colors whitespace-nowrap cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
            <span>Limpar</span>
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
        {filteredLeads.length === 0 ? (
          <div className="py-12 px-4 text-center flex flex-col items-center gap-2">
            <p className="text-sm font-medium text-[#0F172A]">
              Nenhum prospect encontrado com os filtros atuais.
            </p>
            <p className="text-xs text-[#64748B]">
              Ajuste sua busca ou limpe os filtros para visualizar todos os leads.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-medium text-[#0F172A] hover:bg-slate-100"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs font-medium text-[#64748B]">
                  <th className="py-2.5 px-4">Empresa / Nicho</th>
                  <th className="py-2.5 px-3">Decisor / Site</th>
                  <th className="py-2.5 px-3">Etapa</th>
                  <th className="py-2.5 px-3">Resp.</th>
                  <th className="py-2.5 px-3 text-right">Valor Est.</th>
                  <th className="py-2.5 px-3">Follow-up</th>
                  <th className="py-2.5 px-3 text-right">Ligações</th>
                  <th className="py-2.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-sm">
                {filteredLeads.map((lead) => {
                  const urgency = getFollowUpUrgency(lead.nextFollowUp, lead.status);
                  const whatsappUrl = buildWhatsAppUrl(lead.phone);

                  return (
                    <tr key={lead.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-2.5 px-4 max-w-[230px]">
                        <button
                          type="button"
                          onClick={() => onSelectLead(lead)}
                          className="font-medium text-[#0F172A] hover:text-[#2563EB] text-left truncate block w-full cursor-pointer"
                        >
                          {lead.companyName}
                        </button>
                        <span className="text-xs text-[#64748B]">{lead.niche || 'Outro'}</span>
                      </td>

                      <td className="py-2.5 px-3 max-w-[200px]">
                        <div className="text-xs font-medium text-[#0F172A] truncate">
                          {lead.contactName || '—'}
                        </div>
                        <div className="text-xs text-[#64748B] truncate">
                          {lead.websiteOrSocial || lead.phone || '—'}
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <select
                          aria-label={`Etapa de ${lead.companyName}`}
                          value={lead.status}
                          onChange={(e) => onMoveStatus(lead.id, e.target.value as LeadStatus)}
                          className="rounded border border-[#E2E8F0] bg-white px-2 py-1 text-xs font-medium text-[#0F172A] focus:border-[#2563EB] focus:outline-none cursor-pointer"
                        >
                          {LEAD_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-2.5 px-3 text-xs text-[#0F172A] whitespace-nowrap">
                        {lead.owner}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-xs text-[#0F172A] whitespace-nowrap">
                        {formatCurrencyBRL(lead.estimatedValue)}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {lead.nextFollowUp ? (
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-mono tabular-nums ${
                              urgency === 'overdue'
                                ? 'text-[#DC2626] font-semibold'
                                : urgency === 'today'
                                  ? 'text-[#D97706] font-semibold'
                                  : 'text-[#64748B]'
                            }`}
                          >
                            {urgency === 'overdue' && <AlertTriangle className="h-3 w-3" />}
                            {urgency === 'today' && <Clock className="h-3 w-3" />}
                            {formatDateBR(lead.nextFollowUp)}
                          </span>
                        ) : (
                          <span className="text-xs text-[#64748B]">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onIncrementCall(lead.id)}
                          aria-label={`+1 Ligação para ${lead.companyName}`}
                          className="inline-flex items-center gap-1 rounded border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-blue-50 hover:text-[#2563EB] px-2 py-1 text-xs font-mono tabular-nums text-[#0F172A] transition-colors cursor-pointer"
                        >
                          <Phone className="h-3 w-3" />
                          <span>{lead.callCount}</span>
                          <span className="font-sans text-[11px] text-[#64748B]">+1</span>
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
                              className="inline-flex items-center justify-center rounded p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => onSelectLead(lead)}
                            aria-label={`Detalhes de ${lead.companyName}`}
                            className="inline-flex items-center gap-1 rounded border border-[#E2E8F0] bg-white hover:bg-slate-50 px-2 py-1 text-xs font-medium text-[#0F172A] transition-colors cursor-pointer"
                          >
                            <ExternalLink className="h-3 w-3 text-[#64748B]" />
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
