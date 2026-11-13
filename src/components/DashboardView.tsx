import { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  PhoneCall,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Lead } from '../types/crm';
import { computeDashboardMetrics, formatCurrencyBRL, formatDateBR } from '../utils/crmLogic';

interface DashboardViewProps {
  leads: Lead[];
  teamMembers: [string, string];
  onSelectLead: (lead: Lead) => void;
}

export function DashboardView({ leads, teamMembers, onSelectLead }: DashboardViewProps) {
  const metrics = useMemo(
    () => computeDashboardMetrics(leads, teamMembers),
    [leads, teamMembers]
  );

  return (
    <section aria-label="Dashboard de Prospecção" className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-lg font-semibold text-[#0F172A]">
          Dashboard de Prospecção
        </h1>
        <p className="text-xs text-[#64748B]">
          Métricas calculadas em tempo real a partir do funil de criação de sites.
        </p>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-[#64748B]">
            <span>Total de Prospects</span>
            <Users className="h-4 w-4 text-[#2563EB]" />
          </div>
          <div className="font-mono tabular-nums text-2xl font-semibold text-[#0F172A]">
            {metrics.totalLeads}
          </div>
          <p className="text-xs text-[#64748B]">Leads ativos e históricos no funil</p>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-[#64748B]">
            <span>Total de Ligações / Contatos</span>
            <PhoneCall className="h-4 w-4 text-[#2563EB]" />
          </div>
          <div className="font-mono tabular-nums text-2xl font-semibold text-[#0F172A]">
            {metrics.totalCalls}
          </div>
          <p className="text-xs text-[#64748B]">
            Média de{' '}
            <span className="font-mono tabular-nums">
              {metrics.totalLeads > 0 ? (metrics.totalCalls / metrics.totalLeads).toFixed(1) : '0.0'}
            </span>{' '}
            contatos por prospect
          </p>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-[#64748B]">
            <span>Em Negociação / Proposta</span>
            <TrendingUp className="h-4 w-4 text-[#D97706]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono tabular-nums text-2xl font-semibold text-[#0F172A]">
              {formatCurrencyBRL(metrics.negotiatingValue)}
            </span>
          </div>
          <p className="text-xs text-[#64748B]">
            <span className="font-mono tabular-nums font-medium text-[#0F172A]">
              {metrics.negotiatingCount}
            </span>{' '}
            {metrics.negotiatingCount === 1 ? 'proposta em aberto' : 'propostas em aberto'}
          </p>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-[#64748B]">
            <span>Vendas Fechadas (Ganhos)</span>
            <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
          </div>
          <div className="font-mono tabular-nums text-2xl font-semibold text-[#0F172A]">
            {formatCurrencyBRL(metrics.wonValue)}
          </div>
          <p className="text-xs text-[#64748B]">
            <span className="font-mono tabular-nums font-medium text-[#16A34A]">
              {metrics.wonCount} {metrics.wonCount === 1 ? 'venda' : 'vendas'}
            </span>{' '}
            ·{' '}
            <span className="font-mono tabular-nums">{metrics.conversionRate}%</span> de conversão
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Funnel Chart */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-sm font-semibold text-[#0F172A]">
                Funil de Leads por Etapa
              </h2>
              <p className="text-xs text-[#64748B]">Distribuição atual nas 6 colunas</p>
            </div>
          </div>

          <div className="h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={metrics.funnelData}
                margin={{ top: 8, right: 8, left: -20, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="shortLabel"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#F1F5F9' }}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.06)',
                  }}
                  formatter={(value) => [`${Number(value ?? 0)} leads`, 'Quantidade']}
                />
                <Bar dataKey="count" name="Leads" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Team Productivity Chart */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-sm font-semibold text-[#0F172A]">
                Produtividade da Dupla
              </h2>
              <p className="text-xs text-[#64748B]">
                Prospects cadastrados vs. ligações realizadas por responsável
              </p>
            </div>
          </div>

          <div className="h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={metrics.ownerData}
                margin={{ top: 8, right: 8, left: -20, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="owner"
                  tick={{ fontSize: 12, fill: '#0F172A' }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#F1F5F9' }}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.06)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar
                  dataKey="prospects"
                  name="Prospects"
                  fill="#2563EB"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={42}
                />
                <Bar
                  dataKey="calls"
                  name="Ligações"
                  fill="#0F172A"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={42}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Upcoming Follow-ups */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#2563EB]" />
            <h2 className="font-display text-sm font-semibold text-[#0F172A]">
              Próximos Follow-ups
            </h2>
          </div>
          <span className="text-xs text-[#64748B]">Vencidos e próximos 3 dias</span>
        </div>

        {metrics.upcomingFollowUps.length === 0 ? (
          <div className="py-10 px-4 text-center">
            <p className="text-sm font-medium text-[#0F172A]">
              Nenhum follow-up pendente para os próximos 3 dias.
            </p>
            <p className="text-xs text-[#64748B] mt-1">
              Defina datas de retorno nos cards do Kanban para acompanhá-los aqui.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs font-medium text-[#64748B]">
                  <th className="py-2.5 px-5">Empresa</th>
                  <th className="py-2.5 px-3">Contato</th>
                  <th className="py-2.5 px-3">Etapa</th>
                  <th className="py-2.5 px-3">Responsável</th>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-sm">
                {metrics.upcomingFollowUps.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-2.5 px-5 font-medium text-[#0F172A]">
                      {item.companyName}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-[#64748B]">
                      {item.contactName || item.phone || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-[#0F172A]">{item.status}</td>
                    <td className="py-2.5 px-3 text-xs text-[#64748B]">{item.owner}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium font-mono tabular-nums ${
                          item.urgency === 'overdue'
                            ? 'bg-red-50 text-[#DC2626] border border-red-200'
                            : item.urgency === 'today'
                              ? 'bg-amber-50 text-[#D97706] border border-amber-200'
                              : 'bg-slate-100 text-[#0F172A] border border-[#E2E8F0]'
                        }`}
                      >
                        {item.urgency === 'overdue' && <AlertTriangle className="h-3 w-3" />}
                        {item.urgency === 'today' && <Clock className="h-3 w-3" />}
                        {item.urgency === 'overdue'
                          ? `Atrasado · ${formatDateBR(item.nextFollowUp)}`
                          : item.urgency === 'today'
                            ? `Hoje · ${formatDateBR(item.nextFollowUp)}`
                            : formatDateBR(item.nextFollowUp)}
                      </span>
                    </td>
                    <td className="py-2.5 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectLead(item)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#2563EB] hover:underline cursor-pointer"
                      >
                        <span>Abrir card</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
