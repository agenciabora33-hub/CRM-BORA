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
});
