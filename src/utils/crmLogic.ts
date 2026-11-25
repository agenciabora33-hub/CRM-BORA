import { FollowUpUrgency, LEAD_STATUSES, Lead, LeadStatus, ServiceLog } from '../types/crm';

export const NICHE_SUGGESTIONS = [
  'Clínica',
  'Restaurante',
  'Advocacia',
  'Imobiliária',
  'Estética',
  'Outro',
] as const;

export function formatCurrencyBRL(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(safe);
}

export function getTodayIsoDate(referenceDate: Date = new Date()): string {
  const year = referenceDate.getFullYear();
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const day = String(referenceDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '—';
  const isoDateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDateMatch) {
    return `${isoDateMatch[3]}/${isoDateMatch[2]}/${isoDateMatch[1]}`;
  }
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return new Intl.DateTimeFormat('pt-BR').format(parsed);
}

export function getFollowUpUrgency(
  nextFollowUp: string,
  status: LeadStatus,
  referenceDate: Date = new Date()
): FollowUpUrgency {
  if (!nextFollowUp || status === 'Fechado (Ganho)' || status === 'Perdido') {
    return 'none';
  }
  const match = nextFollowUp.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return 'none';

  const todayStr = getTodayIsoDate(referenceDate);
  const targetStr = `${match[1]}-${match[2]}-${match[3]}`;

  if (targetStr < todayStr) return 'overdue';
  if (targetStr === todayStr) return 'today';

  const todayDate = new Date(`${todayStr}T00:00:00`);
  const targetDate = new Date(`${targetStr}T00:00:00`);
  const diffDays = Math.round((targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 3) return 'upcoming';
  return 'future';
}

export interface FollowUpAlertsResult {
  overdue: Lead[];
  today: Lead[];
  totalCount: number;
}

export function getFollowUpAlerts(
  leads: Lead[],
  referenceDate: Date = new Date()
): FollowUpAlertsResult {
  const overdue: Lead[] = [];
  const today: Lead[] = [];

  for (const lead of leads) {
    const urgency = getFollowUpUrgency(lead.nextFollowUp, lead.status, referenceDate);
    if (urgency === 'overdue') {
      overdue.push(lead);
    } else if (urgency === 'today') {
      today.push(lead);
    }
  }

  overdue.sort((a, b) => a.nextFollowUp.localeCompare(b.nextFollowUp) || a.companyName.localeCompare(b.companyName));
  today.sort((a, b) => a.companyName.localeCompare(b.companyName));

  return {
    overdue,
    today,
    totalCount: overdue.length + today.length,
  };
}

export function buildWhatsAppUrl(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return null;
  const normalized = digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`;
  return `https://wa.me/${normalized}`;
}

export function normalizeExternalUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('@')) {
    return `https://instagram.com/${trimmed.slice(1)}`;
  }
  if (trimmed.includes('.')) {
    return `https://${trimmed}`;
  }
  return null;
}

export function appendDatedNote(
  existingNotes: string,
  entry: string,
  author: string = 'Cláudio',
  date: Date = new Date()
): string {
  const trimmed = entry.trim();
  if (!trimmed) return existingNotes;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const authorTag = author ? ` - ${author}` : '';
  const formattedLine = `[${day}/${month}/${year} ${hours}:${minutes}${authorTag}] ${trimmed}`;
  if (!existingNotes.trim()) return formattedLine;
  return `${formattedLine}\n${existingNotes.trim()}`;
}

export interface LeadFilterOptions {
  search: string;
  owner: string;
  status: string;
  niche: string;
  followUpFilter: string;
  sortBy: string;
  onlyOverdue: boolean;
}

export function filterLeads(
  leads: Lead[],
  filters: Partial<LeadFilterOptions>,
  referenceDate: Date = new Date()
): Lead[] {
  const q = (filters.search ?? '').trim().toLowerCase();
  const owner = filters.owner ?? 'all';
  const status = filters.status ?? 'all';
  const niche = filters.niche ?? 'all';
  const followUpFilter = filters.followUpFilter ?? 'all';
  const onlyOverdue = Boolean(filters.onlyOverdue);
  const sortBy = filters.sortBy ?? 'recent';

  const filtered = leads.filter((lead) => {
    if (owner !== 'all' && lead.owner !== owner) {
      return false;
    }
    if (status !== 'all' && lead.status !== status) {
      return false;
    }
    if (niche !== 'all' && lead.niche !== niche) {
      return false;
    }
    const urgency = getFollowUpUrgency(lead.nextFollowUp, lead.status, referenceDate);
    if (onlyOverdue && urgency !== 'overdue') {
      return false;
    }
    if (followUpFilter === 'overdue' && urgency !== 'overdue') return false;
    if (followUpFilter === 'today' && urgency !== 'today') return false;
    if (followUpFilter === 'upcoming' && urgency !== 'upcoming' && urgency !== 'overdue' && urgency !== 'today') return false;

    if (q) {
      const logsText = (lead.serviceLogs || [])
        .map((log) => `${log.content} ${log.author} ${log.contactType || ''} ${log.targetStatus || ''}`)
        .join(' ');
      const haystack = [
        lead.companyName,
        lead.contactName,
        lead.niche,
        lead.phone,
        lead.websiteOrSocial,
        lead.websiteUrl,
        lead.googleBusinessUrl,
        lead.instagramUrl,
        lead.facebookUrl,
        lead.otherSocialUrl,
        lead.notes,
        lead.owner,
        logsText,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return filtered.sort((a, b) => {
    if (sortBy === 'valueDesc') {
      return (Number(b.estimatedValue) || 0) - (Number(a.estimatedValue) || 0);
    }
    if (sortBy === 'nameAsc') {
      return a.companyName.localeCompare(b.companyName);
    }
    const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return dateB - dateA;
  });
}

export interface DashboardMetrics {
  totalLeads: number;
  totalCalls: number;
  negotiatingCount: number;
  negotiatingValue: number;
  wonCount: number;
  wonValue: number;
  conversionRate: number;
  funnelData: { status: LeadStatus; shortLabel: string; count: number; value: number }[];
  ownerData: { owner: string; prospects: number; calls: number; wonValue: number }[];
  upcomingFollowUps: (Lead & { urgency: FollowUpUrgency })[];
}

const SHORT_STATUS_LABELS: Record<LeadStatus, string> = {
  'Para Prospectar': 'Prospectar',
  'Interesse / Conversa': 'Conversa',
  'Agendados': 'Agendados',
  'Reunião / Proposta': 'Proposta',
  'Fechado (Ganho)': 'Ganho',
  'Perdido': 'Perdido',
};

export function computeDashboardMetrics(
  leads: Lead[],
  teamMembers: [string, string],
  referenceDate: Date = new Date()
): DashboardMetrics {
  const totalLeads = leads.length;
  const totalCalls = leads.reduce((sum, l) => sum + (Number(l.callCount) || 0), 0);

  const negotiatingLeads = leads.filter((l) => l.status === 'Reunião / Proposta');
  const negotiatingCount = negotiatingLeads.length;
  const negotiatingValue = negotiatingLeads.reduce((sum, l) => sum + (Number(l.estimatedValue) || 0), 0);

  const wonLeads = leads.filter((l) => l.status === 'Fechado (Ganho)');
  const wonCount = wonLeads.length;
  const wonValue = wonLeads.reduce((sum, l) => sum + (Number(l.estimatedValue) || 0), 0);
  const conversionRate = totalLeads > 0 ? Math.round((wonCount / totalLeads) * 1000) / 10 : 0;

  const funnelData = LEAD_STATUSES.map((status) => {
    const matching = leads.filter((l) => l.status === status);
    return {
      status,
      shortLabel: SHORT_STATUS_LABELS[status],
      count: matching.length,
      value: matching.reduce((sum, l) => sum + (Number(l.estimatedValue) || 0), 0),
    };
  });

  const ownerNames = Array.from(
    new Set([...teamMembers, ...leads.map((l) => l.owner).filter(Boolean)])
  );

  const ownerData = ownerNames.map((owner) => {
    const memberLeads = leads.filter((l) => l.owner === owner);
    return {
      owner,
      prospects: memberLeads.length,
      calls: memberLeads.reduce((sum, l) => sum + (Number(l.callCount) || 0), 0),
      wonValue: memberLeads
        .filter((l) => l.status === 'Fechado (Ganho)')
        .reduce((sum, l) => sum + (Number(l.estimatedValue) || 0), 0),
    };
  });

  const upcomingFollowUps = leads
    .map((lead) => ({
      ...lead,
      urgency: getFollowUpUrgency(lead.nextFollowUp, lead.status, referenceDate),
    }))
    .filter((item) => item.urgency === 'overdue' || item.urgency === 'today' || item.urgency === 'upcoming')
    .sort((a, b) => a.nextFollowUp.localeCompare(b.nextFollowUp));

  return {
    totalLeads,
    totalCalls,
    negotiatingCount,
    negotiatingValue,
    wonCount,
    wonValue,
    conversionRate,
    funnelData,
    ownerData,
    upcomingFollowUps,
  };
}

export function generateCsvContent(leads: Lead[]): string {
  const headers = [
    'ID',
    'Empresa',
    'Decisor',
    'Telefone',
    'Resumo Presenca Digital',
    'URL do Site',
    'Google Meu Negocio',
    'Instagram',
    'Facebook',
    'Outras Midias',
    'Nicho',
    'Etapa',
    'Responsavel',
    'Ligacoes',
    'Valor Estimado (R$)',
    'Proximo Follow-up',
    'Observacoes',
    'Registros de Atendimento',
    'Criado em',
    'Atualizado em',
  ];

  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const formatLogsForCsv = (logs?: ServiceLog[]) =>
    (logs || [])
      .map((log) => {
        const meta = [log.timestamp, log.contactType, log.author, log.targetStatus]
          .filter(Boolean)
          .join(' | ');
        return `[${meta}] ${log.content}`;
      })
      .join(' || ');

  const rows = leads.map((l) =>
    [
      l.id,
      l.companyName,
      l.contactName,
      l.phone,
      l.websiteOrSocial,
      l.websiteUrl,
      l.googleBusinessUrl,
      l.instagramUrl,
      l.facebookUrl,
      l.otherSocialUrl,
      l.niche,
      l.status,
      l.owner,
      l.callCount,
      l.estimatedValue,
      l.nextFollowUp,
      l.notes,
      formatLogsForCsv(l.serviceLogs),
      l.createdAt,
      l.updatedAt,
    ]
      .map(escapeCell)
      .join(';')
  );

  return '\uFEFF' + [headers.map(escapeCell).join(';'), ...rows].join('\n');
}

export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `lead-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const VALID_CONTACT_TYPES = new Set(['Ligação', 'WhatsApp', 'Pessoal']);

export function normalizeLeadStatus(rawStatus: unknown): LeadStatus {
  const statusStr = String(rawStatus ?? '').trim();
  if (statusStr === 'Contato Feito') {
    return 'Agendados';
  }
  return (LEAD_STATUSES as readonly string[]).includes(statusStr)
    ? (statusStr as LeadStatus)
    : 'Para Prospectar';
}

function normalizeServiceLogItem(rawItem: unknown, fallbackOwner: string): ServiceLog | null {
  if (!rawItem || typeof rawItem !== 'object') return null;
  const item = rawItem as Record<string, unknown>;
  const content = String(item.content ?? '').trim();
  if (!content) return null;

  const rawContactType = typeof item.contactType === 'string' ? item.contactType.trim() : '';
  const contactType = VALID_CONTACT_TYPES.has(rawContactType)
    ? (rawContactType as ServiceLog['contactType'])
    : undefined;

  const rawTargetStatus = typeof item.targetStatus === 'string' ? item.targetStatus.trim() : '';
  const mappedTargetStatus = rawTargetStatus === 'Contato Feito' ? 'Agendados' : rawTargetStatus;
  const targetStatus = (LEAD_STATUSES as readonly string[]).includes(mappedTargetStatus)
    ? (mappedTargetStatus as LeadStatus)
    : undefined;

  return {
    id: String(item.id || generateUuid()),
    timestamp: String(item.timestamp || new Date().toLocaleString('pt-BR')),
    author: String(item.author || fallbackOwner),
    content,
    ...(contactType ? { contactType } : {}),
    ...(targetStatus ? { targetStatus } : {}),
  };
}

export function parseServiceLogsValue(rawValue: unknown, fallbackOwner: string): ServiceLog[] {
  if (Array.isArray(rawValue)) {
    return rawValue
      .map((item) => normalizeServiceLogItem(item, fallbackOwner))
      .filter((item): item is ServiceLog => item !== null);
  }
  if (typeof rawValue === 'string' && rawValue.trim()) {
    try {
      const parsed = JSON.parse(rawValue);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => normalizeServiceLogItem(item, fallbackOwner))
          .filter((item): item is ServiceLog => item !== null);
      }
    } catch {
      return [];
    }
  }
  return [];
}

export function normalizeLeadFromRemote(raw: Record<string, unknown>, fallbackOwner: string): Lead {
  const validStatus = normalizeLeadStatus(raw.status);

  const parsedServiceLogs = parseServiceLogsValue(raw.serviceLogs, fallbackOwner);

  return {
    id: String(raw.id || generateUuid()),
    createdAt: String(raw.createdAt || new Date().toISOString()),
    updatedAt: String(raw.updatedAt || new Date().toISOString()),
    owner: String(raw.owner || fallbackOwner),
    companyName: String(raw.companyName || 'Sem nome'),
    contactName: String(raw.contactName || ''),
    phone: String(raw.phone || ''),
    websiteOrSocial: String(raw.websiteOrSocial || ''),
    websiteUrl: String(raw.websiteUrl || ''),
    googleBusinessUrl: String(raw.googleBusinessUrl || ''),
    instagramUrl: String(raw.instagramUrl || ''),
    facebookUrl: String(raw.facebookUrl || ''),
    otherSocialUrl: String(raw.otherSocialUrl || ''),
    niche: String(raw.niche || 'Outro'),
    status: validStatus,
    callCount: Math.max(0, Number(raw.callCount) || 0),
    estimatedValue: Math.max(0, Number(raw.estimatedValue) || 0),
    nextFollowUp: raw.nextFollowUp ? String(raw.nextFollowUp).slice(0, 10) : '',
    notes: String(raw.notes || ''),
    serviceLogs: parsedServiceLogs,
  };
}

export function mergeServiceLogsById(
  primaryLogs: ServiceLog[] | undefined,
  secondaryLogs: ServiceLog[] | undefined,
  deletedLogIds?: ReadonlySet<string>
): ServiceLog[] {
  const seen = new Set<string>();
  const result: ServiceLog[] = [];

  for (const log of primaryLogs || []) {
    if (deletedLogIds?.has(log.id) || seen.has(log.id)) continue;
    seen.add(log.id);
    result.push(log);
  }

  for (const log of secondaryLogs || []) {
    if (deletedLogIds?.has(log.id) || seen.has(log.id)) continue;
    seen.add(log.id);
    result.push(log);
  }

  return result;
}

export interface MergeRemoteLeadsOptions {
  deletedLogIds?: ReadonlySet<string>;
  unparsedServiceLogIds?: ReadonlySet<string>;
}

export function mergeRemoteLeads(
  localLeads: Lead[],
  remoteLeads: Lead[],
  hasServiceLogsColumn: boolean,
  options: MergeRemoteLeadsOptions = {}
): Lead[] {
  const { deletedLogIds, unparsedServiceLogIds } = options;
  const localById = new Map(localLeads.map((lead) => [lead.id, lead]));

  return remoteLeads.map((remote) => {
    const local = localById.get(remote.id);
    if (!local) {
      return {
        ...remote,
        serviceLogs: (Array.isArray(remote.serviceLogs) ? remote.serviceLogs : []).filter(
          (l) => !deletedLogIds?.has(l.id)
        ),
      };
    }

    const localTs = Date.parse(local.updatedAt || '') || 0;
    const remoteTs = Date.parse(remote.updatedAt || '') || 0;
    const localLogs = Array.isArray(local.serviceLogs) ? local.serviceLogs : [];
    const remoteLogs = Array.isArray(remote.serviceLogs) ? remote.serviceLogs : [];
    const remoteWasCorrupted = Boolean(unparsedServiceLogIds?.has(remote.id));

    if (localTs > remoteTs) {
      return {
        ...local,
        serviceLogs: mergeServiceLogsById(localLogs, remoteLogs, deletedLogIds),
      };
    }

    if (!hasServiceLogsColumn || remoteWasCorrupted) {
      return {
        ...remote,
        serviceLogs: mergeServiceLogsById(localLogs, remoteLogs, deletedLogIds),
      };
    }

    return {
      ...remote,
      serviceLogs:
        remoteLogs.length > 0
          ? mergeServiceLogsById(remoteLogs, localTs === remoteTs ? localLogs : [], deletedLogIds)
          : localTs === remoteTs
            ? localLogs.filter((l) => !deletedLogIds?.has(l.id))
            : remoteLogs.filter((l) => !deletedLogIds?.has(l.id)),
    };
  });
}

export function mergeLeadBeforeSheetPush(
  localLead: Lead,
  remoteLead: Lead | undefined,
  deletedLogIds?: ReadonlySet<string>
): { mergedLead: Lead; gainedRemoteLogs: boolean } {
  const localLogs = Array.isArray(localLead.serviceLogs) ? localLead.serviceLogs : [];
  if (!remoteLead) {
    return {
      mergedLead: {
        ...localLead,
        serviceLogs: localLogs.filter((l) => !deletedLogIds?.has(l.id)),
      },
      gainedRemoteLogs: false,
    };
  }

  const remoteLogs = Array.isArray(remoteLead.serviceLogs) ? remoteLead.serviceLogs : [];
  const mergedLogs = mergeServiceLogsById(localLogs, remoteLogs, deletedLogIds);
  const localIds = new Set(localLogs.map((l) => l.id));
  const addedFromRemote = mergedLogs.filter((l) => !localIds.has(l.id)).length;

  const callCount =
    addedFromRemote > 0
      ? Math.max(Number(localLead.callCount) || 0, Number(remoteLead.callCount) || 0, mergedLogs.length)
      : Number(localLead.callCount) || 0;

  return {
    mergedLead: {
      ...localLead,
      serviceLogs: mergedLogs,
      callCount,
    },
    gainedRemoteLogs: addedFromRemote > 0,
  };
}

export function mergeLocalMutationWithLatest(
  queuedLead: Lead,
  currentStoreLead: Lead | undefined,
  deletedLogIds?: ReadonlySet<string>
): Lead {
  const queuedLogs = (Array.isArray(queuedLead.serviceLogs) ? queuedLead.serviceLogs : []).filter(
    (l) => !deletedLogIds?.has(l.id)
  );
  if (!currentStoreLead) {
    return { ...queuedLead, serviceLogs: queuedLogs };
  }

  const currentLogs = (
    Array.isArray(currentStoreLead.serviceLogs) ? currentStoreLead.serviceLogs : []
  ).filter((l) => !deletedLogIds?.has(l.id));

  const queuedTs = Date.parse(queuedLead.updatedAt || '') || 0;
  const currentTs = Date.parse(currentStoreLead.updatedAt || '') || 0;

  if (currentTs > queuedTs) {
    const mergedLogs = mergeServiceLogsById(currentLogs, queuedLogs, deletedLogIds);
    const currentIds = new Set(currentLogs.map((l) => l.id));
    const addedCount = mergedLogs.filter((l) => !currentIds.has(l.id)).length;
    return {
      ...currentStoreLead,
      serviceLogs: mergedLogs,
      callCount:
        addedCount > 0
          ? Math.max(Number(currentStoreLead.callCount) || 0, Number(queuedLead.callCount) || 0, mergedLogs.length)
          : Number(currentStoreLead.callCount) || 0,
    };
  }

  const mergedLogs = mergeServiceLogsById(queuedLogs, currentLogs, deletedLogIds);
  const queuedIds = new Set(queuedLogs.map((l) => l.id));
  const addedCount = mergedLogs.filter((l) => !queuedIds.has(l.id)).length;
  return {
    ...queuedLead,
    serviceLogs: mergedLogs,
    callCount:
      addedCount > 0
        ? Math.max(Number(queuedLead.callCount) || 0, Number(currentStoreLead.callCount) || 0, mergedLogs.length)
        : Number(queuedLead.callCount) || 0,
  };
}


