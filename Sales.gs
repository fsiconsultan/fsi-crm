// ========================================
// GET ALL SALES
// ========================================

function getSales(token) {

  requireAdmin(token);

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();

  const sheet =
    ss.getSheetByName(CONFIG.USERS_SHEET);

  if (!sheet) {
    throw new Error('Sheet USERS tidak ditemukan.');
  }

  const data =
    sheet.getDataRange().getValues();

  if (data.length <= 1) {
    return [];
  }

  const headers = data[0];

  const userIdCol =
    headers.indexOf('User ID');

  const nameCol =
    headers.indexOf('Name');

  const usernameCol =
    headers.indexOf('Username');

  const roleCol =
    headers.indexOf('Role');

  const statusCol =
    headers.indexOf('Status');

  const dateCol =
    headers.indexOf('Tanggal & Waktu');


  const result = [];


  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    const role =
      String(row[roleCol] || '').trim();


    if (role.toLowerCase() !== 'sales') {
      continue;
    }


    result.push({

      userId: row[userIdCol],

      name: row[nameCol],

      username: row[usernameCol],

      role: row[roleCol],

      status: row[statusCol],

      createdAt:
        dateCol >= 0
          ? formatDate(row[dateCol])
          : ''
    });
  }


  return result;
}



// ========================================
// CREATE SALES
// ========================================

function createSales(
  token,
  name,
  username,
  password
) {

  requireAdmin(token);


  name =
    String(name || '').trim();

  username =
    String(username || '').trim();

  password =
    String(password || '');


  if (!name) {
    throw new Error('Nama Sales wajib diisi.');
  }

  if (!username) {
    throw new Error('Username wajib diisi.');
  }

  if (!password) {
    throw new Error('Password wajib diisi.');
  }


  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const usersSheet =
    ss.getSheetByName(CONFIG.USERS_SHEET);


  if (!usersSheet) {
    throw new Error('Sheet USERS tidak ditemukan.');
  }


  const data =
    usersSheet.getDataRange().getValues();


  const headers = data[0];


  const userIdCol =
    headers.indexOf('User ID');

  const nameCol =
    headers.indexOf('Name');

  const usernameCol =
    headers.indexOf('Username');

  const passwordCol =
    headers.indexOf('Password');

  const roleCol =
    headers.indexOf('Role');

  const statusCol =
    headers.indexOf('Status');

  const dateCol =
    headers.indexOf('Tanggal & Waktu');


  // ========================================
  // CEK USERNAME
  // ========================================

  for (let i = 1; i < data.length; i++) {

    const existingUsername =
      String(data[i][usernameCol] || '')
        .trim()
        .toLowerCase();


    if (
      existingUsername ===
      username.toLowerCase()
    ) {

      throw new Error(
        'Username sudah digunakan.'
      );
    }
  }


  // ========================================
  // USER ID OTOMATIS
  // ========================================

  let maxId = 0;


  for (let i = 1; i < data.length; i++) {

    const id =
      parseInt(
        data[i][userIdCol],
        10
      );


    if (
      !isNaN(id) &&
      id > maxId
    ) {

      maxId = id;
    }
  }


  const newUserId =
    maxId + 1;


  // ========================================
  // TANGGAL & WAKTU
  // ========================================

  const createdAt =
    new Date();


  // ========================================
  // BUAT BARIS USER
  // ========================================

  const newRow =
    new Array(headers.length)
      .fill('');


  newRow[userIdCol] =
    newUserId;

  newRow[nameCol] =
    name;

  newRow[usernameCol] =
    username;

  newRow[passwordCol] =
    password;

  newRow[roleCol] =
    'Sales';

  newRow[statusCol] =
    'Active';

  if (dateCol >= 0) {

    newRow[dateCol] =
      createdAt;
  }


  usersSheet.appendRow(newRow);


  // ========================================
  // BUAT SHEET SALES
  // ========================================

  const sheetName =
    generateSalesSheetName(
      name,
      username
    );


  let salesSheet =
    ss.getSheetByName(sheetName);


  if (!salesSheet) {

    salesSheet =
      ss.insertSheet(sheetName);


    createLeadHeaders(
      salesSheet
    );
  }


  // ========================================
  // FORMAT TANGGAL
  // ========================================

  if (dateCol >= 0) {

    usersSheet
      .getRange(
        2,
        dateCol + 1,
        usersSheet.getLastRow() - 1,
        1
      )
      .setNumberFormat(
        'dd/MM/yyyy HH:mm:ss'
      );
  }


  return {

    success: true,

    message:
      'Sales berhasil dibuat.',

    sales: {

      userId:
        newUserId,

      name:
        name,

      username:
        username,

      role:
        'Sales',

      status:
        'Active',

      sheetName:
        sheetName,

      createdAt:
        formatDate(createdAt)
    }
  };
}



// ========================================
// GENERATE SALES SHEET NAME
// ========================================

function generateSalesSheetName(
  name,
  username
) {

  let baseName =
    username || name;


  baseName =
    String(baseName)
      .trim()
      .toUpperCase()
      .replace(
        /[^A-Z0-9_]/g,
        '_'
      );


  let sheetName =
    CONFIG.SALES_SHEET_PREFIX +
    baseName;


  sheetName =
    sheetName.substring(
      0,
      100
    );


  return sheetName;
}



// ========================================
// CREATE LEAD HEADERS
// ========================================

function createLeadHeaders(sheet) {

  const headers =
    CONFIG.LEAD_HEADERS;


  sheet
    .getRange(
      1,
      1,
      1,
      headers.length
    )
    .setValues([
      headers
    ]);


  sheet.setFrozenRows(1);


  // Format header
  sheet
    .getRange(
      1,
      1,
      1,
      headers.length
    )
    .setFontWeight('bold');
}



// ========================================
// UPDATE SALES
// ========================================

function updateSales(
  token,
  userId,
  name,
  username
) {

  requireAdmin(token);


  name =
    String(name || '').trim();

  username =
    String(username || '').trim();


  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const sheet =
    ss.getSheetByName(
      CONFIG.USERS_SHEET
    );


  const data =
    sheet.getDataRange().getValues();


  const headers =
    data[0];


  const userIdCol =
    headers.indexOf('User ID');

  const nameCol =
    headers.indexOf('Name');

  const usernameCol =
    headers.indexOf('Username');

  const roleCol =
    headers.indexOf('Role');


  for (let i = 1; i < data.length; i++) {

    if (
      String(data[i][userIdCol]) ===
      String(userId)
    ) {

      if (
        String(data[i][roleCol])
          .toLowerCase() !== 'sales'
      ) {

        throw new Error(
          'User bukan Sales.'
        );
      }


      // Cek username
      for (let j = 1; j < data.length; j++) {

        if (
          j !== i &&
          String(data[j][usernameCol])
            .toLowerCase() ===
          username.toLowerCase()
        ) {

          throw new Error(
            'Username sudah digunakan.'
          );
        }
      }


      sheet
        .getRange(
          i + 1,
          nameCol + 1
        )
        .setValue(name);


      sheet
        .getRange(
          i + 1,
          usernameCol + 1
        )
        .setValue(username);


      return {
        success: true,
        message:
          'Sales berhasil diperbarui.'
      };
    }
  }


  throw new Error(
    'Sales tidak ditemukan.'
  );
}



// ========================================
// DEACTIVATE
// ========================================

function deactivateSales(
  token,
  userId
) {

  requireAdmin(token);


  setSalesStatus(
    userId,
    'Inactive'
  );


  return {
    success: true,
    message:
      'Sales berhasil dinonaktifkan.'
  };
}



// ========================================
// ACTIVATE
// ========================================

function activateSales(
  token,
  userId
) {

  requireAdmin(token);


  setSalesStatus(
    userId,
    'Active'
  );


  return {
    success: true,
    message:
      'Sales berhasil diaktifkan.'
  };
}



// ========================================
// SET STATUS
// ========================================

function setSalesStatus(
  userId,
  status
) {

  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const sheet =
    ss.getSheetByName(
      CONFIG.USERS_SHEET
    );


  const data =
    sheet.getDataRange().getValues();


  const headers =
    data[0];


  const userIdCol =
    headers.indexOf('User ID');

  const roleCol =
    headers.indexOf('Role');

  const statusCol =
    headers.indexOf('Status');


  for (let i = 1; i < data.length; i++) {

    if (
      String(data[i][userIdCol]) ===
      String(userId) &&
      String(data[i][roleCol])
        .toLowerCase() === 'sales'
    ) {

      sheet
        .getRange(
          i + 1,
          statusCol + 1
        )
        .setValue(status);


      return;
    }
  }


  throw new Error(
    'Sales tidak ditemukan.'
  );
}



// ========================================
// RESET PASSWORD
// ========================================

function resetSalesPassword(
  token,
  userId,
  newPassword
) {

  requireAdmin(token);


  newPassword =
    String(newPassword || '');


  if (!newPassword) {

    throw new Error(
      'Password baru wajib diisi.'
    );
  }


  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const sheet =
    ss.getSheetByName(
      CONFIG.USERS_SHEET
    );


  const data =
    sheet.getDataRange().getValues();


  const headers =
    data[0];


  const userIdCol =
    headers.indexOf('User ID');

  const passwordCol =
    headers.indexOf('Password');

  const roleCol =
    headers.indexOf('Role');


  for (let i = 1; i < data.length; i++) {

    if (
      String(data[i][userIdCol]) ===
      String(userId) &&
      String(data[i][roleCol])
        .toLowerCase() === 'sales'
    ) {

      sheet
        .getRange(
          i + 1,
          passwordCol + 1
        )
        .setValue(newPassword);


      return {
        success: true,
        message:
          'Password berhasil direset.'
      };
    }
  }


  throw new Error(
    'Sales tidak ditemukan.'
  );
}



// ========================================
// FORMAT DATE
// ========================================

function formatDate(date) {

  if (!date) return '';

  if (
    Object.prototype.toString
      .call(date) !==
    '[object Date]'
  ) {

    date =
      new Date(date);
  }


  if (isNaN(date.getTime())) {
    return '';
  }


  return Utilities
    .formatDate(
      date,
      Session.getScriptTimeZone(),
      'dd/MM/yyyy HH:mm:ss'
    );
}
