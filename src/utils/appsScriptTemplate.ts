export const APPS_SCRIPT_CODE = `// ============================================================================
// Mini-CRM Prospecção de Sites — Google Apps Script (Code.gs)
// Cole este código em Extensões > Apps Script na sua Planilha Google.
// ============================================================================

const SHEET_NAME = 'Leads';
const HEADERS = [
  'id',
  'createdAt',
  'updatedAt',
  'owner',
  'companyName',
  'contactName',
  'phone',
  'websiteOrSocial',
  'websiteUrl',
  'googleBusinessUrl',
  'instagramUrl',
  'facebookUrl',
  'otherSocialUrl',
  'niche',
  'status',
  'callCount',
  'estimatedValue',
  'nextFollowUp',
  'notes'
];

function getOrCreateLeadsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function leadToRow(lead) {
  return HEADERS.map(function (key) {
    var val = lead[key];
    if (key === 'callCount' || key === 'estimatedValue') {
      return Number(val) || 0;
    }
    return val !== undefined && val !== null ? String(val) : '';
  });
}

function rowToLead(row) {
  var obj = {};
  for (var i = 0; i < HEADERS.length; i++) {
    var key = HEADERS[i];
    var val = row[i];
    if (key === 'callCount' || key === 'estimatedValue') {
      obj[key] = Number(val) || 0;
    } else if (key === 'nextFollowUp' && val instanceof Date) {
      obj[key] = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    } else if ((key === 'createdAt' || key === 'updatedAt') && val instanceof Date) {
      obj[key] = val.toISOString();
    } else {
      obj[key] = val !== undefined && val !== null ? String(val) : '';
    }
  }
  return obj;
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    var sheet = getOrCreateLeadsSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return jsonResponse({ ok: true, leads: [] });
    }
    var values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
    var leads = values
      .filter(function (row) { return String(row[0] || '').trim() !== ''; })
      .map(rowToLead);

    return jsonResponse({ ok: true, leads: leads });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getOrCreateLeadsSheet();
    var body = JSON.parse(e.postData.contents || '{}');
    var action = body.action;

    if (action === 'syncAll') {
      var allLeads = Array.isArray(body.leads) ? body.leads : [];
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, HEADERS.length).clearContent();
      }
      if (allLeads.length > 0) {
        var rows = allLeads.map(leadToRow);
        sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
      }
      return jsonResponse({ ok: true, count: allLeads.length });
    }

    if (action === 'create') {
      var newLead = body.lead;
      if (!newLead || !newLead.id) {
        return jsonResponse({ ok: false, error: 'Lead inválido' });
      }
      sheet.appendRow(leadToRow(newLead));
      return jsonResponse({ ok: true, id: newLead.id });
    }

    if (action === 'update') {
      var updatedLead = body.lead;
      if (!updatedLead || !updatedLead.id) {
        return jsonResponse({ ok: false, error: 'ID ausente' });
      }
      var rowCount = sheet.getLastRow();
      if (rowCount > 1) {
        var ids = sheet.getRange(2, 1, rowCount - 1, 1).getValues();
        for (var i = 0; i < ids.length; i++) {
          if (String(ids[i][0]) === String(updatedLead.id)) {
            sheet.getRange(i + 2, 1, 1, HEADERS.length).setValues([leadToRow(updatedLead)]);
            return jsonResponse({ ok: true, id: updatedLead.id });
          }
        }
      }
      sheet.appendRow(leadToRow(updatedLead));
      return jsonResponse({ ok: true, id: updatedLead.id, inserted: true });
    }

    if (action === 'delete') {
      var targetId = body.id;
      var totalRows = sheet.getLastRow();
      if (totalRows > 1) {
        var idValues = sheet.getRange(2, 1, totalRows - 1, 1).getValues();
        for (var j = 0; j < idValues.length; j++) {
          if (String(idValues[j][0]) === String(targetId)) {
            sheet.deleteRow(j + 2);
            return jsonResponse({ ok: true, deleted: targetId });
          }
        }
      }
      return jsonResponse({ ok: true, deleted: null });
    }

    return jsonResponse({ ok: false, error: 'Ação desconhecida: ' + action });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  } finally {
    lock.releaseLock();
  }
}
`;
