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
        <h1 className="font-display text-lg font-semibold text-slate-100">
          Dashboard de Prospecção
        </h1>
        <p className="text-xs text-slate-400">
          Métricas calculadas em tempo real a partir do funil de criação de sites.
        </p>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>Total de Prospects</span>
            <Users className="h-4 w-4 text-blue-400" />
          </div>
          <div className="font-mono tabular-nums text-2xl font-semibold text-slate-50">
            {metrics.totalLeads}
          </div>
          <p className="text-xs text-slate-400">Leads ativos e históricos no funil</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>Total de Ligações / Contatos</span>
            <PhoneCall className="h-4 w-4 text-blue-400" />
          </div>
          <div className="font-mono tabular-nums text-2xl font-semibold text-slate-50">
            {metrics.totalCalls}
          </div>
          <p className="text-xs text-slate-400">
            Média de{' '}
            <span className="font-mono tabular-nums text-slate-200">
              {metrics.totalLeads > 0 ? (metrics.totalCalls / metrics.totalLeads).toFixed(1) : '0.0'}
            </span>{' '}
            contatos por prospect
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>Em Negociação / Proposta</span>
            <TrendingUp className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono tabular-nums text-2xl font-semibold text-slate-50">
              {formatCurrencyBRL(metrics.negotiatingValue)}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            <span className="font-mono tabular-nums font-medium text-slate-200">
              {metrics.negotiatingCount}
            </span>{' '}
            {metrics.negotiatingCount === 1 ? 'proposta em aberto' : 'propostas em aberto'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span>Vendas Fechadas (Ganhos)</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="font-mono tabular-nums text-2xl font-semibold text-slate-50">
            {formatCurrencyBRL(metrics.wonValue)}
          </div>
          <p className="text-xs text-slate-400">
            <span className="font-mono tabular-nums font-medium text-emerald-400">
              {metrics.wonCount} {metrics.wonCount === 1 ? 'venda' : 'vendas'}
            </span>{' '}
            ·{' '}
            <span className="font-mono tabular-nums text-slate-200">{metrics.conversionRate}%</span> de conversão
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Funnel Chart */}
        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-100">
                Funil de Leads por Etapa
              </h2>
              <p className="text-xs text-slate-400">Distribuição atual nas 6 colunas</p>
            </div>
          </div>

          <div className="h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={metrics.funnelData}
                margin={{ top: 8, right: 8, left: -20, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
                <XAxis
                  dataKey="shortLabel"
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#1E293B' }}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '8px',
                    border: '1px solid #334155',
                    color: '#F1F5F9',
                    fontSize: '12px',
                  }}
                  itemStyle={{ color: '#F1F5F9' }}
                  labelStyle={{ color: '#94A3B8' }}
                  formatter={(value) => [`${Number(value ?? 0)} leads`, 'Quantidade']}
                />
                <Bar dataKey="count" name="Leads" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Team Productivity Chart */}
        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-100">
                Produtividade da Dupla
              </h2>
              <p className="text-xs text-slate-400">
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
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
                <XAxis
                  dataKey="owner"
                  tick={{ fontSize: 12, fill: '#E2E8F0' }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#1E293B' }}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '8px',
                    border: '1px solid #334155',
                    color: '#F1F5F9',
                    fontSize: '12px',
                  }}
                  itemStyle={{ color: '#F1F5F9' }}
                  labelStyle={{ color: '#94A3B8' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px', color: '#CBD5E1' }} />
                <Bar
                  dataKey="prospects"
                  name="Prospects"
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={42}
                />
                <Bar
                  dataKey="calls"
                  name="Ligações"
                  fill="#38BDF8"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={42}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Upcoming Follow-ups */}
      <div className="rounded-xl border border-slate-800 bg-[#0F172A] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-400" />
            <h2 className="font-display text-sm font-semibold text-slate-100">
              Próximos Follow-ups
            </h2>
          </div>
          <span className="text-xs text-slate-400">Vencidos e próximos 3 dias</span>
        </div>

        {metrics.upcomingFollowUps.length === 0 ? (
          <div className="py-10 px-4 text-center">
            <p className="text-sm font-medium text-slate-200">
              Nenhum follow-up pendente para os próximos 3 dias.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Defina datas de retorno nos cards do Kanban para acompanhá-los aqui.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-medium text-slate-400">
                  <th className="py-2.5 px-5">Empresa</th>
                  <th className="py-2.5 px-3">Contato</th>
                  <th className="py-2.5 px-3">Etapa</th>
                  <th className="py-2.5 px-3">Responsável</th>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {metrics.upcomingFollowUps.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 px-5 font-medium text-slate-100">
                      {item.companyName}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-slate-400">
                      {item.contactName || item.phone || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-slate-200">{item.status}</td>
                    <td className="py-2.5 px-3 text-xs text-slate-400">{item.owner}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium font-mono tabular-nums ${
                          item.urgency === 'overdue'
                            ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                            : item.urgency === 'today'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-200 border border-slate-700'
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
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:underline cursor-pointer"
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
