/**
 * GET MY LEADS
 */
function getMyLeads(token) {

  const session = requireLogin(token);

  if (session.role === 'Admin') {

    return getAllLeads(token);

  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(session.sheetName);

  if (!sheet) {
    throw new Error('Database Sales tidak ditemukan.');
  }

  return getSheetLeads(sheet);
}


/**
 * GET ALL LEADS FOR ADMIN
 */
function getAllLeads(token) {

  requireAdmin(token);

  const sales = getSales(token);
  const result = [];

  sales.forEach(function(salesUser) {

    if (!salesUser.sheetName) return;

    const sheet =
      SpreadsheetApp
        .getActiveSpreadsheet()
        .getSheetByName(salesUser.sheetName);

    if (!sheet) return;

    const leads = getSheetLeads(sheet);

    leads.forEach(function(lead) {
      lead.sales = salesUser.name;
      lead.salesUsername = salesUser.username;
      result.push(lead);
    });
  });

  return result;
}


/**
 * READ SHEET LEADS
 */
function getSheetLeads(sheet) {

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  const lastColumn =
    CONFIG.LEAD_HEADERS.length;

  const values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        lastColumn
      )
      .getValues();

  return values.map(function(row, index) {

    return {
      row: index + 2,
      leadId: row[0],
      customer: row[1],
      phone: row[2],
      business: row[3],
      location: row[4],
      status: row[5],
      followUp: formatDate(row[6]),
      appointment: formatDate(row[7]),
      siteSurvey: formatDate(row[8]),
      quotation: formatDate(row[9]),
      spk: formatDate(row[10]),
      closing: formatDate(row[11]),
      notes: row[12],
      createdAt: formatDate(row[13]),
      updatedAt: formatDate(row[14])
    };

  });
}


/**
 * ADD LEAD
 */
function addLead(token, lead) {

  const session = requireLogin(token);

  if (session.role === 'Admin') {

    if (!lead.username) {
      throw new Error('Sales harus dipilih.');
    }

    const sales =
      getSalesByUsername(lead.username);

    session.sheetName = sales.sheetName;
  }

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();

  const sheet =
    ss.getSheetByName(session.sheetName);

  if (!sheet) {
    throw new Error('Database Sales tidak ditemukan.');
  }

  const now = new Date();

  const leadId =
    'FSI-' +
    Utilities.formatDate(
      now,
      Session.getScriptTimeZone(),
      'yyyyMMddHHmmss'
    ) +
    '-' +
    Math.floor(Math.random() * 1000);

  const row = [
    leadId,
    lead.customer || '',
    normalizePhone(lead.phone || ''),
    lead.business || '',
    lead.location || '',
    lead.status || 'New',
    parseDate(lead.followUp),
    parseDate(lead.appointment),
    parseDate(lead.siteSurvey),
    parseDate(lead.quotation),
    parseDate(lead.spk),
    parseDate(lead.closing),
    lead.notes || '',
    now,
    now
  ];

  sheet.appendRow(row);

  return {
    success: true,
    message: 'Lead berhasil ditambahkan.',
    leadId: leadId
  };
}


/**
 * UPDATE LEAD
 */
function updateLead(token, lead) {

  const session = requireLogin(token);

  let sheetName = session.sheetName;

  if (session.role === 'Admin' && lead.username) {
    const sales =
      getSalesByUsername(lead.username);

    sheetName = sales.sheetName;
  }

  const sheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(sheetName);

  if (!sheet) {
    throw new Error('Database Sales tidak ditemukan.');
  }

  const rowNumber =
    Number(lead.row);

  if (rowNumber < 2) {
    throw new Error('Baris lead tidak valid.');
  }

  const now = new Date();

  const row = [
    lead.leadId,
    lead.customer || '',
    normalizePhone(lead.phone || ''),
    lead.business || '',
    lead.location || '',
    lead.status || 'New',
    parseDate(lead.followUp),
    parseDate(lead.appointment),
    parseDate(lead.siteSurvey),
    parseDate(lead.quotation),
    parseDate(lead.spk),
    parseDate(lead.closing),
    lead.notes || '',
    lead.createdAt || '',
    now
  ];

  sheet
    .getRange(
      rowNumber,
      1,
      1,
      CONFIG.LEAD_HEADERS.length
    )
    .setValues([row]);

  return {
    success: true,
    message: 'Lead berhasil diperbarui.'
  };
}


/**
 * DELETE LEAD
 */
function deleteLead(token, rowNumber) {

  const session = requireLogin(token);

  if (session.role !== 'Admin') {
    throw new Error(
      'Untuk keamanan, hanya Admin yang dapat menghapus lead.'
    );
  }

  const sheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(session.sheetName);

  if (!sheet) {
    throw new Error('Database tidak ditemukan.');
  }

  sheet.deleteRow(Number(rowNumber));

  return {
    success: true,
    message: 'Lead berhasil dihapus.'
  };
}


/**
 * NORMALIZE PHONE
 */
function normalizePhone(phone) {

  phone = String(phone)
    .replace(/[^\d+]/g, '');

  if (phone.startsWith('0')) {
    phone = '62' + phone.substring(1);
  }

  if (phone.startsWith('+')) {
    phone = phone.substring(1);
  }

  return phone;
}


/**
 * DATE PARSER
 */
function parseDate(value) {

  if (!value) return '';

  if (value instanceof Date) {
    return value;
  }

  const d = new Date(value);

  if (isNaN(d.getTime())) {
    return '';
  }

  return d;
}


/**
 * FORMAT DATE
 */
function formatDate(value) {

  if (!value) return '';

  if (!(value instanceof Date)) {
    return value;
  }

  return Utilities.formatDate(
    value,
    Session.getScriptTimeZone(),
    'yyyy-MM-dd'
  );
}
