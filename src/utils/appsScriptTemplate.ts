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
    return { sheet: sheet, headers: HEADERS.slice() };
  }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow === 0 || lastCol === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    return { sheet: sheet, headers: HEADERS.slice() };
  }

  var currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
    return String(h || '').trim();
  });

  var missingHeaders = HEADERS.filter(function (h) {
    return currentHeaders.indexOf(h) === -1;
  });

  if (missingHeaders.length > 0) {
    var startCol = currentHeaders.length + 1;
    sheet.getRange(1, startCol, 1, missingHeaders.length).setValues([missingHeaders]);
    sheet.getRange(1, startCol, 1, missingHeaders.length).setFontWeight('bold');
    currentHeaders = currentHeaders.concat(missingHeaders);
  }

  return { sheet: sheet, headers: currentHeaders };
}

function leadToRow(lead, activeHeaders) {
  return activeHeaders.map(function (key) {
    var val = lead[key];
    if (key === 'callCount' || key === 'estimatedValue') {
      return Number(val) || 0;
    }
    return val !== undefined && val !== null ? String(val) : '';
  });
}

function rowToLead(row, activeHeaders) {
  var obj = {};
  for (var i = 0; i < activeHeaders.length; i++) {
    var key = activeHeaders[i];
    if (!key) continue;
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

function jsonResponse(payload, callbackName) {
  var json = JSON.stringify(payload);
  if (callbackName && /^[a-zA-Z_$][0-9a-zA-Z_$.]*$/.test(String(callbackName))) {
    return ContentService
      .createTextOutput(callbackName + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var callback = (e && e.parameter && e.parameter.callback) ? e.parameter.callback : '';
  try {
    var info = getOrCreateLeadsSheet();
    var sheet = info.sheet;
    var activeHeaders = info.headers;
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return jsonResponse({ ok: true, leads: [] }, callback);
    }
    var values = sheet.getRange(2, 1, lastRow - 1, activeHeaders.length).getValues();
    var idIndex = activeHeaders.indexOf('id');
    var checkCol = idIndex >= 0 ? idIndex : 0;
    var leads = values
      .filter(function (row) { return String(row[checkCol] || '').trim() !== ''; })
      .map(function (row) { return rowToLead(row, activeHeaders); });

    return jsonResponse({ ok: true, leads: leads }, callback);
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message }, callback);
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var info = getOrCreateLeadsSheet();
    var sheet = info.sheet;
    var activeHeaders = info.headers;
    var rawBody = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var body = JSON.parse(rawBody);
    var action = body.action;

    if (action === 'syncAll') {
      var allLeads = Array.isArray(body.leads) ? body.leads : [];
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, activeHeaders.length).clearContent();
      }
      if (allLeads.length > 0) {
        var rows = allLeads.map(function (lead) { return leadToRow(lead, activeHeaders); });
        sheet.getRange(2, 1, rows.length, activeHeaders.length).setValues(rows);
      }
      return jsonResponse({ ok: true, count: allLeads.length });
    }

    if (action === 'create') {
      var newLead = body.lead;
      if (!newLead || !newLead.id) {
        return jsonResponse({ ok: false, error: 'Lead inválido' });
      }
      sheet.appendRow(leadToRow(newLead, activeHeaders));
      return jsonResponse({ ok: true, id: newLead.id });
    }

    if (action === 'update') {
      var updatedLead = body.lead;
      if (!updatedLead || !updatedLead.id) {
        return jsonResponse({ ok: false, error: 'ID ausente' });
      }
      var idIdx = activeHeaders.indexOf('id');
      var idCol = idIdx >= 0 ? idIdx + 1 : 1;
      var rowCount = sheet.getLastRow();
      if (rowCount > 1) {
        var ids = sheet.getRange(2, idCol, rowCount - 1, 1).getValues();
        for (var i = 0; i < ids.length; i++) {
          if (String(ids[i][0]) === String(updatedLead.id)) {
            sheet.getRange(i + 2, 1, 1, activeHeaders.length).setValues([leadToRow(updatedLead, activeHeaders)]);
            return jsonResponse({ ok: true, id: updatedLead.id });
          }
        }
      }
      sheet.appendRow(leadToRow(updatedLead, activeHeaders));
      return jsonResponse({ ok: true, id: updatedLead.id, inserted: true });
    }

    if (action === 'delete') {
      var targetId = body.id;
      var delIdIdx = activeHeaders.indexOf('id');
      var delIdCol = delIdIdx >= 0 ? delIdIdx + 1 : 1;
      var totalRows = sheet.getLastRow();
      if (totalRows > 1) {
        var idValues = sheet.getRange(2, delIdCol, totalRows - 1, 1).getValues();
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
