function login(username, password) {

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.USERS_SHEET);

  if (!sheet) {
    return {
      success: false,
      message: 'Sheet USERS tidak ditemukan.'
    };
  }

  const data = sheet.getDataRange().getValues();

  if (data.length < 2) {
    return {
      success: false,
      message: 'Belum ada data user.'
    };
  }

  const headers = data[0];

  const userIdCol = headers.indexOf('User ID');
  const nameCol = headers.indexOf('Name');
  const usernameCol = headers.indexOf('Username');
  const passwordCol = headers.indexOf('Password');
  const roleCol = headers.indexOf('Role');
  const statusCol = headers.indexOf('Status');

  username = String(username || '').trim();
  password = String(password || '');

  for (let i = 1; i < data.length; i++) {

    const row = data[i];

    const dbUsername =
      String(row[usernameCol] || '').trim();

    if (
      dbUsername.toLowerCase() !==
      username.toLowerCase()
    ) {
      continue;
    }

    // ===============================
    // STATUS
    // ===============================

    const status =
      String(row[statusCol] || '').trim();

    if (status.toLowerCase() !== 'active') {

      return {
        success: false,
        message: 'Akun Anda tidak aktif.'
      };
    }


    // ===============================
    // PASSWORD
    // ===============================

    const storedPassword =
      String(row[passwordCol] || '');

    const passwordMatch =
      storedPassword === password ||
      storedPassword === hashPassword(password);

    if (!passwordMatch) {

      return {
        success: false,
        message: 'Username atau password salah.'
      };
    }


    // ===============================
    // USER DATA
    // ===============================

    const user = {

      userId: row[userIdCol],

      name: row[nameCol],

      username: row[usernameCol],

      role: row[roleCol],

      status: row[statusCol]
    };


    // ===============================
    // SALES SHEET
    // ===============================

    if (
      String(user.role).toLowerCase() === 'sales'
    ) {

      user.sheetName =
        generateSalesSheetName(
          user.name,
          user.username
        );

    } else {

      user.sheetName = '';
    }


    // ===============================
    // SESSION
    // ===============================

    const token = createSession(user);


    return {

      success: true,

      token: token,

      user: user
    };
  }


  return {
    success: false,
    message: 'Username atau password salah.'
  };
}


// ===============================
// CURRENT USER
// ===============================

function getCurrentUser(token) {

  const user = getSession(token);

  if (!user) {

    return {
      success: false,
      message: 'Session expired. Silakan login kembali.'
    };
  }


  return {
    success: true,
    user: user
  };
}
