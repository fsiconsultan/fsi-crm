const CONFIG = {
  APP_NAME: 'CRM FSI',
  USERS_SHEET: 'USERS',
  SALES_SHEET_PREFIX: 'SALES_',

  USER_HEADERS: [
    'User ID',
    'Name',
    'Username',
    'Password',
    'Role',
    'Status',
    'Tanggal & Waktu'
  ],

  LEAD_HEADERS: [
    'Lead ID',
    'Customer',
    'Phone',
    'Business',
    'Location',
    'Status',
    'Follow-up',
    'Appointment',
    'Site Survey',
    'Quotation',
    'SPK',
    'Closing',
    'Notes',
    'Created At',
    'Updated At'
  ],

  STATUS_LIST: [
    'New',
    'Contacted',
    'Interested',
    'Follow-up',
    'Appointment',
    'Site Survey',
    'Quotation',
    'SPK',
    'Closing',
    'Not Interested'
  ]
};


// ===============================
// WEB APP
// ===============================

function doGet() {
  return HtmlService
    .createTemplateFromFile('Index')
    .evaluate()
    .setTitle(CONFIG.APP_NAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


function include(filename) {
  return HtmlService
    .createHtmlOutputFromFile(filename)
    .getContent();
}


// ===============================
// PASSWORD
// ===============================

function hashPassword(password) {
  const raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(password),
    Utilities.Charset.UTF_8
  );

  return raw
    .map(function(byte) {
      return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    })
    .join('');
}


// ===============================
// SESSION
// ===============================

function createSession(user) {
  const token = Utilities.getUuid();

  CacheService
    .getScriptCache()
    .put(
      'SESSION_' + token,
      JSON.stringify(user),
      21600
    );

  return token;
}


function getSession(token) {
  if (!token) return null;

  const cache = CacheService.getScriptCache();
  const data = cache.get('SESSION_' + token);

  if (!data) return null;

  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}


function logout(token) {
  if (token) {
    CacheService
      .getScriptCache()
      .remove('SESSION_' + token);
  }

  return {
    success: true
  };
}


// ===============================
// LOGIN CHECK
// ===============================

function requireLogin(token) {
  const user = getSession(token);

  if (!user) {
    throw new Error('Session expired. Silakan login kembali.');
  }

  return user;
}


function requireAdmin(token) {
  const user = requireLogin(token);

  if (String(user.role).toLowerCase() !== 'admin') {
    throw new Error('Akses hanya untuk Admin.');
  }

  return user;
}


// ===============================
// SETUP SYSTEM
// ===============================

function setupSystem() {

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let sheet = ss.getSheetByName(CONFIG.USERS_SHEET);

  // Buat USERS jika belum ada
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.USERS_SHEET);
  }

  // Pastikan header benar
  sheet
    .getRange(1, 1, 1, CONFIG.USER_HEADERS.length)
    .setValues([CONFIG.USER_HEADERS]);

  sheet.setFrozenRows(1);

  // Cek apakah Admin sudah ada
  const data = sheet.getDataRange().getValues();

  let adminExists = false;

  if (data.length > 1) {

    const headers = data[0];

    const usernameCol = headers.indexOf('Username');

    for (let i = 1; i < data.length; i++) {

      if (
        usernameCol >= 0 &&
        String(data[i][usernameCol]).trim().toLowerCase() === 'admin'
      ) {
        adminExists = true;
        break;
      }
    }
  }

  // Buat Admin jika belum ada
  if (!adminExists) {

    sheet.appendRow([
      1,
      'Admin',
      'admin',
      'FSIadmin2026',
      'Admin',
      'Active',
      new Date()
    ]);
  }

  return {
    success: true,
    message: 'System berhasil disiapkan.'
  };
}
