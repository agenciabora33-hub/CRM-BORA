import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidAppsScriptUrl, validateAppsScriptUrl } from './sheetsSync';

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
