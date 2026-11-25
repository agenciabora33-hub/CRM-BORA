import test from 'node:test';
import assert from 'node:assert/strict';
import { APPS_SCRIPT_CODE } from './appsScriptTemplate';
import { Lead } from '../types/crm';
import {
  formatDirectFetchError,
  isValidAppsScriptUrl,
  normalizeRemoteSettings,
  serializePayloadForSheets,
  validateAppsScriptUrl,
} from './sheetsSync';

test('validateAppsScriptUrl accepts valid /exec Apps Script URLs', () => {
  const res = validateAppsScriptUrl('https://script.google.com/macros/s/AKfycbx123/exec');
  assert.equal(res.valid, true);
  assert.equal(isValidAppsScriptUrl('https://script.google.com/a/macros/empresa.com/s/AKfy/exec'), true);
});

test('validateAppsScriptUrl rejects docs.google.com spreadsheet URLs with clear Portuguese message', () => {
  const res = validateAppsScriptUrl('https://docs.google.com/spreadsheets/d/12345/edit');
  assert.equal(res.valid, false);
  if (!res.valid) {
    assert.match(res.reason, /Apps Script/i);
  }
});

test('validateAppsScriptUrl rejects /dev test URLs with clear Portuguese message', () => {
  const res = validateAppsScriptUrl('https://script.google.com/macros/s/AKfycbx123/dev');
  assert.equal(res.valid, false);
  if (!res.valid) {
    assert.match(res.reason, /\/exec/);
  }
});

test('formatDirectFetchError never exposes raw Failed to fetch text', () => {
  const err = formatDirectFetchError(new TypeError('Failed to fetch'));
  assert.doesNotMatch(err.message, /Failed to fetch/);
  assert.match(err.message, /Qualquer pessoa/);
});

test('normalizeRemoteSettings validates and normalizes shared agency settings safely', () => {
  assert.equal(normalizeRemoteSettings(null), null);
  assert.equal(normalizeRemoteSettings({}), null);

  const normalized = normalizeRemoteSettings({
    companyName: '  Bora Digital  ',
    logoUrl: ' /logo.jpg ',
    teamMembers: ['Gabriel', ''],
    updatedAt: '2026-11-13T10:00:00.000Z',
  });

  assert.deepEqual(normalized, {
    companyName: 'Bora Digital',
    logoUrl: '/logo.jpg',
    teamMembers: ['Gabriel', 'Elis'],
    updatedAt: '2026-11-13T10:00:00.000Z',
  });
});

test('APPS_SCRIPT_CODE supports JSONP callback, header migration, serviceLogs, and Config settings sync', () => {
  assert.match(APPS_SCRIPT_CODE, /e\.parameter\.callback/);
  assert.match(APPS_SCRIPT_CODE, /ContentService\.MimeType\.JAVASCRIPT/);
  assert.match(APPS_SCRIPT_CODE, /missingHeaders/);
  assert.match(APPS_SCRIPT_CODE, /'serviceLogs'/);
  assert.match(APPS_SCRIPT_CODE, /typeof val === 'string'/);
  assert.match(APPS_SCRIPT_CODE, /JSON\.stringify\(logs\)/);
  assert.match(APPS_SCRIPT_CODE, /CONFIG_SHEET_NAME = 'Config'/);
  assert.match(APPS_SCRIPT_CODE, /syncSettings/);
  assert.match(APPS_SCRIPT_CODE, /readRemoteSettings/);
});

test('serializePayloadForSheets encodes serviceLogs as JSON string for create, update, and syncAll', () => {
  const lead: Lead = {
    id: 'lead-1',
    createdAt: '2026-11-24T10:00:00.000Z',
    updatedAt: '2026-11-24T12:00:00.000Z',
    owner: 'Elis',
    companyName: 'FB Climatização',
    contactName: 'Fernando',
    phone: '11999990000',
    websiteOrSocial: '',
    websiteUrl: '',
    googleBusinessUrl: '',
    instagramUrl: '',
    facebookUrl: '',
    otherSocialUrl: '',
    niche: 'Climatização',
    status: 'Agendados',
    callCount: 1,
    estimatedValue: 2500,
    nextFollowUp: '',
    notes: 'Anotação de teste',
    serviceLogs: [
      {
        id: 'log-1',
        timestamp: '24/11/2026 12:00',
        author: 'Elis',
        contactType: 'WhatsApp',
        targetStatus: 'Agendados',
        content: 'Primeiro contato via WhatsApp',
      },
    ],
  };

  const updatePayload = serializePayloadForSheets({ action: 'update', lead }) as {
    lead: { serviceLogs: unknown };
  };
  assert.equal(typeof updatePayload.lead.serviceLogs, 'string');
  assert.doesNotMatch(String(updatePayload.lead.serviceLogs), /\[object Object\]/);
  const parsed = JSON.parse(String(updatePayload.lead.serviceLogs));
  assert.equal(parsed[0].author, 'Elis');

  const syncAllPayload = serializePayloadForSheets({ action: 'syncAll', leads: [lead] }) as {
    leads: Array<{ serviceLogs: unknown }>;
  };
  assert.equal(typeof syncAllPayload.leads[0].serviceLogs, 'string');
});

