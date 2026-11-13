import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS } from '../data/seedLeads';
import { CURRENT_BRAND_VERSION, resolveInitialSettings } from './settingsMigration';

test('resolveInitialSettings prompts immediately on fresh open with Cláudio and Elis', () => {
  const result = resolveInitialSettings(null, DEFAULT_SETTINGS);
  assert.deepEqual(result.settings.teamMembers, ['Cláudio', 'Elis']);
  assert.equal(result.settings.activeUser, 'Cláudio');
  assert.equal(result.partnerConfirmed, false);
});

test('resolveInitialSettings migrates legacy Sócio 1/2 cache to Cláudio and Elis and prompts for choice', () => {
  const legacyRaw = JSON.stringify({
    companyName: 'Sua Agência',
    logoUrl: '',
    teamMembers: ['Sócio 1', 'Sócio 2'],
    activeUser: 'Sócio 1',
    brandVersion: 1,
  });
  const result = resolveInitialSettings(legacyRaw, DEFAULT_SETTINGS);
  assert.equal(result.settings.companyName, 'Bora CRM');
  assert.equal(result.settings.logoUrl, '/logo.jpg');
  assert.deepEqual(result.settings.teamMembers, ['Cláudio', 'Elis']);
  assert.equal(result.settings.activeUser, 'Cláudio');
  assert.equal(result.partnerConfirmed, false);
});

test('resolveInitialSettings preserves saved partner choice across sessions', () => {
  const savedRaw = JSON.stringify({
    companyName: 'Bora CRM',
    logoUrl: '/logo.jpg',
    teamMembers: ['Cláudio', 'Elis'],
    activeUser: 'Elis',
    appsScriptUrl: DEFAULT_SETTINGS.appsScriptUrl,
    brandVersion: CURRENT_BRAND_VERSION,
    partnerConfirmed: true,
  });
  const result = resolveInitialSettings(savedRaw, DEFAULT_SETTINGS);
  assert.equal(result.settings.activeUser, 'Elis');
  assert.equal(result.partnerConfirmed, true);
});

test('resolveInitialSettings preserves custom renamed partners', () => {
  const customRaw = JSON.stringify({
    companyName: 'Bora CRM',
    logoUrl: '/logo.jpg',
    teamMembers: ['Cláudio', 'Rafael'],
    activeUser: 'Rafael',
    brandVersion: 2,
    partnerConfirmed: true,
  });
  const result = resolveInitialSettings(customRaw, DEFAULT_SETTINGS);
  assert.deepEqual(result.settings.teamMembers, ['Cláudio', 'Rafael']);
  assert.equal(result.settings.activeUser, 'Rafael');
  assert.equal(result.partnerConfirmed, true);
});
