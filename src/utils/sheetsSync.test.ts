import test from 'node:test';
import assert from 'node:assert/strict';
import { APPS_SCRIPT_CODE } from './appsScriptTemplate';
import {
  formatDirectFetchError,
  isValidAppsScriptUrl,
  normalizeRemoteSettings,
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

test('APPS_SCRIPT_CODE supports JSONP callback, header migration, and Config settings sync', () => {
  assert.match(APPS_SCRIPT_CODE, /e\.parameter\.callback/);
  assert.match(APPS_SCRIPT_CODE, /ContentService\.MimeType\.JAVASCRIPT/);
  assert.match(APPS_SCRIPT_CODE, /missingHeaders/);
  assert.match(APPS_SCRIPT_CODE, /CONFIG_SHEET_NAME = 'Config'/);
  assert.match(APPS_SCRIPT_CODE, /syncSettings/);
  assert.match(APPS_SCRIPT_CODE, /readRemoteSettings/);
});
