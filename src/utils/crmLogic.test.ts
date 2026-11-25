import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendDatedNote,
  buildWhatsAppUrl,
  computeDashboardMetrics,
  filterLeads,
  formatCurrencyBRL,
  formatDateBR,
  generateCsvContent,
  getFollowUpUrgency,
  mergeLeadBeforeSheetPush,
  mergeLocalMutationWithLatest,
  mergeRemoteLeads,
  normalizeExternalUrl,
  normalizeLeadFromRemote,
} from './crmLogic';
import { Lead } from '../types/crm';

const sampleLeads: Lead[] = [
  {
    id: '1',
    createdAt: '2026-11-10T10:00:00.000Z',
    updatedAt: '2026-11-12T10:00:00.000Z',
    owner: 'Ana',
    companyName: 'Clínica Vida',
    contactName: 'Dr. João',
    phone: '(11) 99999-1234',
    websiteOrSocial: '@clinicavida',
    websiteUrl: 'https://clinicavida.com.br',
    googleBusinessUrl: '',
    instagramUrl: 'https://instagram.com/clinicavida',
    facebookUrl: '',
    otherSocialUrl: '',
    niche: 'Clínica',
    status: 'Reunião / Proposta',
    callCount: 3,
    estimatedValue: 5000,
    nextFollowUp: '2026-11-13',
    notes: 'Interessado em agendamento online',
  },
  {
    id: '2',
    createdAt: '2026-11-08T10:00:00.000Z',
    updatedAt: '2026-11-11T10:00:00.000Z',
    owner: 'Bruno',
    companyName: 'Bistrô Central',
    contactName: 'Mariana',
    phone: '5511988887777',
    websiteOrSocial: 'Não possui site',
    websiteUrl: '',
    googleBusinessUrl: 'https://maps.google.com/?q=Bistro+Central',
    instagramUrl: '',
    facebookUrl: '',
    otherSocialUrl: '',
    niche: 'Restaurante',
    status: 'Contato Feito',
    callCount: 2,
    estimatedValue: 3000,
    nextFollowUp: '2026-11-11',
    notes: 'Cardápio digital',
  },
  {
    id: '3',
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-12T10:00:00.000Z',
    owner: 'Ana',
    companyName: 'Advocacia Silva',
    contactName: 'Dra. Paula',
    phone: '(21) 98111-2233',
    websiteOrSocial: 'site antigo',
    websiteUrl: '',
    googleBusinessUrl: '',
    instagramUrl: '',
    facebookUrl: '',
    otherSocialUrl: '',
    niche: 'Advocacia',
    status: 'Fechado (Ganho)',
    callCount: 4,
    estimatedValue: 4000,
    nextFollowUp: '2026-11-05',
    notes: 'Contrato assinado',
  },
];

const refDate = new Date('2026-11-13T12:00:00');

test('follow-up urgency classifies overdue, today, upcoming, and closed leads', () => {
  assert.equal(getFollowUpUrgency('2026-11-11', 'Contato Feito', refDate), 'overdue');
  assert.equal(getFollowUpUrgency('2026-11-13', 'Reunião / Proposta', refDate), 'today');
  assert.equal(getFollowUpUrgency('2026-11-15', 'Para Prospectar', refDate), 'upcoming');
  assert.equal(getFollowUpUrgency('2026-11-25', 'Para Prospectar', refDate), 'future');
  assert.equal(getFollowUpUrgency('2026-11-05', 'Fechado (Ganho)', refDate), 'none');
  assert.equal(getFollowUpUrgency('2026-11-05', 'Perdido', refDate), 'none');
});

test('WhatsApp URL normalizes Brazilian phone numbers cleanly', () => {
  assert.equal(buildWhatsAppUrl('(11) 99999-1234'), 'https://wa.me/5511999991234');
  assert.equal(buildWhatsAppUrl('5511988887777'), 'https://wa.me/5511988887777');
  assert.equal(buildWhatsAppUrl('123'), null);
});

test('dates and BRL currency format properly', () => {
  assert.equal(formatDateBR('2026-11-13'), '13/11/2026');
  assert.equal(formatDateBR(''), '—');
  assert.match(formatCurrencyBRL(4800), /R\$\s*4\.800,00/);
});

test('appendDatedNote prepends dated entry with time and author cleanly', () => {
  const updated = appendDatedNote('Nota antiga', 'Ligação sem resposta', 'Cláudio', refDate);
  assert.equal(updated, '[13/11/2026 12:00 - Cláudio] Ligação sem resposta\nNota antiga');
});

test('filterLeads combines search, owner, status, and overdue filters', () => {
  assert.equal(
    filterLeads(sampleLeads, { search: 'Bistrô', owner: 'all', status: 'all', onlyOverdue: false }, refDate).length,
    1
  );
  assert.equal(
    filterLeads(sampleLeads, { search: '', owner: 'Ana', status: 'all', onlyOverdue: false }, refDate).length,
    2
  );
  assert.equal(
    filterLeads(sampleLeads, { search: '', owner: 'all', status: 'all', onlyOverdue: true }, refDate).length,
    1
  );
});

test('computeDashboardMetrics calculates KPIs, funnel, owner stats, and due follow-ups', () => {
  const metrics = computeDashboardMetrics(sampleLeads, ['Ana', 'Bruno'], refDate);
  assert.equal(metrics.totalLeads, 3);
  assert.equal(metrics.totalCalls, 9);
  assert.equal(metrics.negotiatingCount, 1);
  assert.equal(metrics.negotiatingValue, 5000);
  assert.equal(metrics.wonCount, 1);
  assert.equal(metrics.wonValue, 4000);
  assert.equal(metrics.conversionRate, 33.3);
  assert.equal(metrics.upcomingFollowUps.length, 2);
  assert.equal(metrics.upcomingFollowUps[0].id, '2');
  assert.equal(metrics.ownerData.find((o) => o.owner === 'Ana')?.calls, 7);
});

test('generateCsvContent and normalizeLeadFromRemote preserve lead fields', () => {
  const csv = generateCsvContent(sampleLeads);
  assert.ok(csv.includes('"Clínica Vida"'));
  const normalized = normalizeLeadFromRemote({ companyName: 'Teste', callCount: '5', status: 'Invalid' }, 'Ana');
  assert.equal(normalized.callCount, 5);
  assert.equal(normalized.status, 'Para Prospectar');
  assert.equal(normalized.owner, 'Ana');
  assert.equal(normalized.websiteUrl, '');
  assert.equal(normalized.googleBusinessUrl, '');
});

test('normalizeExternalUrl handles full URLs, bare domains, and @handles', () => {
  assert.equal(normalizeExternalUrl('https://site.com.br'), 'https://site.com.br');
  assert.equal(normalizeExternalUrl('minhaempresa.com.br'), 'https://minhaempresa.com.br');
  assert.equal(normalizeExternalUrl('@agenciabora'), 'https://instagram.com/agenciabora');
  assert.equal(normalizeExternalUrl('   '), null);
});

test('normalizeLeadFromRemote preserves full serviceLogs metadata from JSON string or array', () => {
  const logs = [
    {
      id: 'log-1',
      timestamp: '17/11/2026 14:20',
      author: 'Cláudio',
      contactType: 'WhatsApp',
      targetStatus: 'Reunião / Proposta',
      content: 'Enviou briefing completo por mensagem.',
    },
  ];

  const normalizedFromString = normalizeLeadFromRemote(
    {
      id: 'lead-10',
      companyName: 'Padaria Central',
      serviceLogs: JSON.stringify(logs),
    },
    'Elis'
  );

  assert.equal(normalizedFromString.serviceLogs?.length, 1);
  assert.equal(normalizedFromString.serviceLogs?.[0].contactType, 'WhatsApp');
  assert.equal(normalizedFromString.serviceLogs?.[0].targetStatus, 'Reunião / Proposta');
  assert.equal(normalizedFromString.serviceLogs?.[0].author, 'Cláudio');
  assert.equal(normalizedFromString.serviceLogs?.[0].content, 'Enviou briefing completo por mensagem.');

  const csv = generateCsvContent([normalizedFromString]);
  assert.match(csv, /Registros de Atendimento/);
  assert.match(csv, /Enviou briefing completo por mensagem\./);
  assert.equal(
    filterLeads([normalizedFromString], { search: 'briefing completo' }).length,
    1
  );
});

test('mergeRemoteLeads preserves local serviceLogs when remote Sheet lacks serviceLogs column or local is newer', () => {
  const localLead: Lead = {
    ...sampleLeads[0],
    updatedAt: '2026-11-17T12:00:00.000Z',
    serviceLogs: [
      {
        id: 'log-local-1',
        timestamp: '17/11/2026 12:00',
        author: 'Cláudio',
        contactType: 'Pessoal',
        targetStatus: 'Reunião / Proposta',
        content: 'Visita presencial concluída.',
      },
    ],
  };

  // Case 1: Remote Code.gs has not been updated yet (hasServiceLogsColumn = false)
  const remoteWithoutCol: Lead = {
    ...sampleLeads[0],
    updatedAt: '2026-11-17T12:05:00.000Z',
    serviceLogs: [],
  };
  const mergedLegacy = mergeRemoteLeads([localLead], [remoteWithoutCol], false);
  assert.equal(mergedLegacy[0].serviceLogs?.length, 1);
  assert.equal(mergedLegacy[0].serviceLogs?.[0].content, 'Visita presencial concluída.');

  // Case 2: Remote has serviceLogs column AND newer timestamp
  const remoteWithCol: Lead = {
    ...sampleLeads[0],
    updatedAt: '2026-11-17T12:10:00.000Z',
    serviceLogs: [
      {
        id: 'log-remote-2',
        timestamp: '17/11/2026 12:10',
        author: 'Elis',
        contactType: 'Ligação',
        targetStatus: 'Fechado (Ganho)',
        content: 'Fechou contrato!',
      },
    ],
  };
  const mergedWithCol = mergeRemoteLeads([localLead], [remoteWithCol], true);
  assert.equal(mergedWithCol[0].serviceLogs?.[0].id, 'log-remote-2');

  // Case 3: Local edit is strictly newer than remote (offline edit protection)
  const staleRemote: Lead = {
    ...sampleLeads[0],
    updatedAt: '2026-11-17T11:50:00.000Z',
    serviceLogs: [],
  };
  const mergedLocalNewer = mergeRemoteLeads([localLead], [staleRemote], true);
  assert.equal(mergedLocalNewer[0].serviceLogs?.[0].id, 'log-local-1');

  // Case 4: Both partners added distinct logs concurrently (local newer or equal timestamp merges remote log too)
  const newerLocalLead: Lead = {
    ...localLead,
    updatedAt: '2026-11-17T12:12:00.000Z',
  };
  const mergedConcurrent = mergeRemoteLeads([newerLocalLead], [remoteWithCol], true, {
    deletedLogIds: new Set<string>(),
  });
  assert.deepEqual(
    mergedConcurrent[0].serviceLogs?.map((l) => l.id),
    ['log-local-1', 'log-remote-2']
  );

  const sameTsLocalLead: Lead = {
    ...localLead,
    updatedAt: remoteWithCol.updatedAt,
  };
  const mergedSameTs = mergeRemoteLeads([sameTsLocalLead], [remoteWithCol], true, {
    deletedLogIds: new Set<string>(),
  });
  assert.deepEqual(
    mergedSameTs[0].serviceLogs?.map((l) => l.id),
    ['log-remote-2', 'log-local-1']
  );

  // Case 5: Remote has corrupted "[object Object]" cell (unparsedServiceLogIds), preserve valid local logs
  const corruptedRemote: Lead = {
    ...sampleLeads[0],
    updatedAt: '2026-11-17T12:20:00.000Z',
    serviceLogs: [],
  };
  const mergedCorrupted = mergeRemoteLeads([localLead], [corruptedRemote], true, {
    unparsedServiceLogIds: new Set([localLead.id]),
  });
  assert.equal(mergedCorrupted[0].serviceLogs?.length, 1);
  assert.equal(mergedCorrupted[0].serviceLogs?.[0].id, 'log-local-1');

  // Case 6: Intentional deletion on this device (deletedLogIds) is not resurrected by remote
  const mergedDeleted = mergeRemoteLeads(
    [{ ...localLead, serviceLogs: [] }],
    [remoteWithCol],
    true,
    { deletedLogIds: new Set(['log-remote-2']) }
  );
  assert.equal(mergedDeleted[0].serviceLogs?.length, 0);
});

test('mergeLeadBeforeSheetPush merges remote partner serviceLogs without overwriting them on save', () => {
  const localEdited: Lead = {
    ...sampleLeads[0],
    callCount: 1,
    serviceLogs: [
      {
        id: 'log-claudio',
        timestamp: '24/11/2026 15:00',
        author: 'Cláudio',
        contactType: 'Ligação',
        targetStatus: 'Reunião / Proposta',
        content: 'Ligação feita por Cláudio.',
      },
    ],
  };

  const remoteFromElis: Lead = {
    ...sampleLeads[0],
    callCount: 1,
    serviceLogs: [
      {
        id: 'log-elis',
        timestamp: '24/11/2026 14:58',
        author: 'Elis',
        contactType: 'WhatsApp',
        targetStatus: 'Contato Feito',
        content: 'Mensagem enviada pela Elis.',
      },
    ],
  };

  const result = mergeLeadBeforeSheetPush(localEdited, remoteFromElis, new Set());
  assert.equal(result.gainedRemoteLogs, true);
  assert.equal(result.mergedLead.callCount, 2);
  assert.deepEqual(
    result.mergedLead.serviceLogs?.map((l) => l.id),
    ['log-claudio', 'log-elis']
  );

  // Respect deletedLogIds so an intentionally removed log isn't re-added on push
  const withDeleted = mergeLeadBeforeSheetPush(
    localEdited,
    remoteFromElis,
    new Set(['log-elis'])
  );
  assert.equal(withDeleted.gainedRemoteLogs, false);
  assert.deepEqual(
    withDeleted.mergedLead.serviceLogs?.map((l) => l.id),
    ['log-claudio']
  );
});

test('mergeLocalMutationWithLatest never loses newly saved logs against stale store snapshot and merges concurrent updates', () => {
  const oldLog = {
    id: 'log-old',
    timestamp: '24/11/2026 10:00',
    author: 'Cláudio',
    contactType: 'Ligação' as const,
    targetStatus: 'Contato Feito' as const,
    content: 'Primeiro contato.',
  };
  const newLog = {
    id: 'log-new',
    timestamp: '25/11/2026 09:30',
    author: 'Cláudio',
    contactType: 'WhatsApp' as const,
    targetStatus: 'Reunião / Proposta' as const,
    content: 'Atendimento real salvo no Sheets.',
  };
  const storeExtraLog = {
    id: 'log-partner-sync',
    timestamp: '25/11/2026 09:31',
    author: 'Elis',
    contactType: 'Pessoal' as const,
    targetStatus: 'Reunião / Proposta' as const,
    content: 'Visita confirmada pela Elis.',
  };

  // Case 1: Stale store snapshot before React render (queuedLead is newer and contains newLog)
  const queuedLead: Lead = {
    ...sampleLeads[0],
    updatedAt: '2026-11-25T09:30:05.000Z',
    callCount: 2,
    status: 'Reunião / Proposta',
    serviceLogs: [newLog, oldLog],
  };
  const staleStoreLead: Lead = {
    ...sampleLeads[0],
    updatedAt: '2026-11-24T10:00:00.000Z',
    callCount: 1,
    status: 'Contato Feito',
    serviceLogs: [oldLog],
  };
  const mergedStale = mergeLocalMutationWithLatest(queuedLead, staleStoreLead, new Set());
  assert.equal(mergedStale.status, 'Reunião / Proposta');
  assert.equal(mergedStale.callCount, 2);
  assert.deepEqual(
    mergedStale.serviceLogs?.map((l) => l.id),
    ['log-new', 'log-old']
  );

  // Case 2: Store lead became newer (e.g. partner log merged while queued), keep newer fields AND both logs
  const newerStoreLead: Lead = {
    ...sampleLeads[0],
    updatedAt: '2026-11-25T09:31:00.000Z',
    callCount: 2,
    status: 'Reunião / Proposta',
    notes: 'Atualizado pela Elis',
    serviceLogs: [storeExtraLog, oldLog],
  };
  const mergedNewerStore = mergeLocalMutationWithLatest(queuedLead, newerStoreLead, new Set());
  assert.equal(mergedNewerStore.notes, 'Atualizado pela Elis');
  assert.equal(mergedNewerStore.callCount, 3);
  assert.deepEqual(
    mergedNewerStore.serviceLogs?.map((l) => l.id),
    ['log-partner-sync', 'log-old', 'log-new']
  );

  // Case 3: deletedLogIds excludes intentionally deleted logs from both snapshots
  const mergedWithDelete = mergeLocalMutationWithLatest(
    queuedLead,
    newerStoreLead,
    new Set(['log-old', 'log-partner-sync'])
  );
  assert.deepEqual(
    mergedWithDelete.serviceLogs?.map((l) => l.id),
    ['log-new']
  );
});



