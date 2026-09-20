// ============================================================
// CRM FSI - AUTHENTICATION
// Username -> get_login_email -> Supabase Auth
// Admin & Sales
// ============================================================

/* ============================================================
   AVATAR SALES
============================================================ */

const SALES_AVATAR_MAP = {
  "df7a9ddb-23e3-40ce-a53e-8befeaba71c5":
    "https://yoyszukutqwoxxdolzcg.supabase.co/storage/v1/object/public/sales-avatar/rist.jpeg"
};


/* ============================================================
   HELPER
============================================================ */

function getSalesAvatar(profile) {
  if (!profile) return "";

  const authId =
    profile["auth_user-id"] ||
    profile.auth_user_id ||
    profile.auth_userId ||
    "";

  return SALES_AVATAR_MAP[String(authId)] || "";
}


function getProfileName(profile) {
  if (!profile) return "User";

  return (
    profile.name ||
    profile.full_name ||
    profile.sales_name ||
    profile.username ||
    profile.nama ||
    "User"
  );
}


function getProfileRole(profile) {
  if (!profile) return "";

  return String(
    profile.role ||
    profile.user_role ||
    ""
  ).trim();
}


function getUserInitial(name) {
  const text = String(name || "User").trim();

  if (!text) return "U";

  return text
    .charAt(0)
    .toUpperCase();
}


/* ============================================================
   LOGIN MESSAGE
============================================================ */

function showLoginMessage(message, type = "error") {
  const el = document.getElementById("loginMessage");

  if (!el) return;

  el.textContent = message || "";
  el.className = "login-message " + type;
}


function clearLoginMessage() {
  const el = document.getElementById("loginMessage");

  if (!el) return;

  el.textContent = "";
  el.className = "login-message";
}


/* ============================================================
   LOGIN BUTTON LOADING
============================================================ */

function setLoginLoading(isLoading) {
  const button =
    document.querySelector(".login-btn") ||
    document.querySelector('button[type="submit"]');

  if (!button) return;

  if (!button.dataset.originalText) {
    button.dataset.originalText =
      button.textContent.trim() || "LOGIN";
  }

  button.disabled = isLoading;

  if (isLoading) {
    button.textContent = "LOGIN...";
  } else {
    button.textContent =
      button.dataset.originalText || "LOGIN";
  }
}


/* ============================================================
   AMBIL EMAIL DARI USERNAME
============================================================ */

async function getLoginEmail(username) {
  const cleanUsername =
    String(username || "").trim();

  if (!cleanUsername) {
    throw new Error("Username wajib diisi.");
  }

  /*
   * RPC utama
   */
  let result = await supabaseClient.rpc(
    "get_login_email",
    {
      p_username: cleanUsername
    }
  );

  /*
   * Jika RPC mengembalikan error karena parameter
   * berbeda, coba parameter username.
   */
  if (result.error) {
    const firstError = result.error;

    const retry = await supabaseClient.rpc(
      "get_login_email",
      {
        username: cleanUsername
      }
    );

    if (!retry.error) {
      result = retry;
    } else {
      throw firstError;
    }
  }

  if (result.error) {
    throw result.error;
  }

  let data = result.data;

  /*
   * Supabase bisa mengembalikan:
   *
   * "email@example.com"
   *
   * atau
   *
   * { email: "email@example.com" }
   *
   * atau array hasil RPC.
   */

  if (Array.isArray(data)) {
    data = data[0];
  }

  if (typeof data === "string") {
    return data.trim();
  }

  if (data && typeof data === "object") {
    const email =
      data.email ||
      data.login_email ||
      data.get_login_email ||
      data.result ||
      data.value;

    if (email) {
      return String(email).trim();
    }
  }

  if (!data) {
    throw new Error(
      "Username tidak ditemukan."
    );
  }

  throw new Error(
    "Email login tidak berhasil ditemukan."
  );
}


/* ============================================================
   LOGIN UTAMA
============================================================ */

async function login() {
  const usernameInput =
    document.getElementById("loginUsername");

  const passwordInput =
    document.getElementById("loginPassword");

  if (!usernameInput || !passwordInput) {
    console.error(
      "Input login tidak ditemukan."
    );

    return;
  }

  const username =
    String(usernameInput.value || "").trim();

  const password =
    String(passwordInput.value || "");

  clearLoginMessage();

  if (!username) {
    showLoginMessage(
      "Username wajib diisi.",
      "error"
    );

    usernameInput.focus();
    return;
  }

  if (!password) {
    showLoginMessage(
      "Password wajib diisi.",
      "error"
    );

    passwordInput.focus();
    return;
  }

  try {
    setLoginLoading(true);

    showLoginMessage(
      "Memproses login...",
      "loading"
    );

    /*
     * STEP 1
     * Username -> Email
     */
    const email =
      await getLoginEmail(username);

    if (!email) {
      throw new Error(
        "Email akun tidak ditemukan."
      );
    }

    /*
     * STEP 2
     * Email + Password -> Supabase Auth
     */
    const {
      data,
      error
    } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      console.error(
        "Supabase Auth error:",
        error
      );

      throw new Error(
        "Username atau password salah."
      );
    }

    if (!data || !data.user) {
      throw new Error(
        "Login gagal. User Auth tidak ditemukan."
      );
    }

    currentUser = data.user;

    /*
     * STEP 3
     * Ambil profile dari sales_users
     */
    const profile =
      await loadCurrentProfile(
        data.user
      );

    if (!profile) {
      await supabaseClient.auth.signOut();

      throw new Error(
        "Akun berhasil login, tetapi profile Admin/Sales tidak ditemukan."
      );
    }

    currentProfile = profile;

    /*
     * STEP 4
     * Cek status akun jika kolom tersedia
     */
    const accountStatus =
      String(
        profile.status ||
        profile.account_status ||
        ""
      )
        .trim()
        .toLowerCase();

    if (
      accountStatus &&
      [
        "inactive",
        "disabled",
        "nonaktif",
        "false"
      ].includes(accountStatus)
    ) {
      await supabaseClient.auth.signOut();

      throw new Error(
        "Akun ini sedang tidak aktif."
      );
    }

    /*
     * STEP 5
     * Update global user
     */
    window.currentUser = currentUser;
    window.currentProfile = currentProfile;

    /*
     * STEP 6
     * Berhasil
     */
    showLoginMessage(
      "Login berhasil. Membuka CRM...",
      "success"
    );

    /*
     * Jika login page menggunakan struktur
     * terpisah seperti project sekarang,
     * langsung masuk dashboard.
     */
    setTimeout(() => {
      window.location.href =
        "dashboard.html";
    }, 250);

  } catch (error) {
    console.error(
      "LOGIN ERROR:",
      error
    );

    let message =
      error?.message ||
      "Login gagal.";

    /*
     * Pesan yang lebih mudah dipahami
     */
    if (
      message.includes(
        "Invalid login credentials"
      )
    ) {
      message =
        "Username atau password salah.";
    }

    if (
      message.includes(
        "Email not confirmed"
      )
    ) {
      message =
        "Email akun belum dikonfirmasi.";
    }

    showLoginMessage(
      message,
      "error"
    );

  } finally {
    setLoginLoading(false);
  }
}


/* ============================================================
   LOAD CURRENT PROFILE
============================================================ */

async function loadCurrentProfile(user = null) {
  try {
    let authUser = user;

    if (!authUser) {
      const result =
        await supabaseClient.auth.getUser();

      if (result.error) {
        throw result.error;
      }

      authUser = result.data.user;
    }

    if (!authUser) {
      currentProfile = null;
      window.currentProfile = null;
      return null;
    }

    /*
     * PENTING:
     *
     * Nama kolom database adalah:
     * "auth_user-id"
     *
     * BUKAN:
     * auth_user_id
     */
    const {
      data,
      error
    } = await supabaseClient
      .from(CRM_CONFIG.salesTable)
      .select("*")
      .eq(
        "auth_user-id",
        authUser.id
      )
      .maybeSingle();

    if (error) {
      console.error(
        "PROFILE QUERY ERROR:",
        error
      );

      throw error;
    }

    currentProfile = data || null;
    window.currentProfile =
      currentProfile;

    return currentProfile;

  } catch (error) {
    console.error(
      "loadCurrentProfile error:",
      error
    );

    currentProfile = null;
    window.currentProfile = null;

    return null;
  }
}


/* ============================================================
   GET CURRENT AUTH USER
============================================================ */

async function getCurrentAuthUser() {
  try {
    const {
      data,
      error
    } = await supabaseClient.auth.getUser();

    if (error) {
      console.error(
        "getCurrentAuthUser error:",
        error
      );

      return null;
    }

    return data?.user || null;

  } catch (error) {
    console.error(
      error
    );

    return null;
  }
}


/* ============================================================
   UPDATE HEADER USER
============================================================ */

function updateUserHeader() {
  const profile =
    currentProfile ||
    window.currentProfile;

  const user =
    currentUser ||
    window.currentUser;

  const name =
    getProfileName(profile);

  const role =
    getProfileRole(profile) ||
    "User";

  const avatarInitial =
    document.getElementById(
      "userAvatarInitial"
    );

  const userInfo =
    document.getElementById(
      "userInfo"
    );

  /*
   * Avatar
   */
  if (avatarInitial) {
    const avatarUrl =
      getSalesAvatar(profile);

    if (avatarUrl) {
      avatarInitial.innerHTML =
        `<img
          src="${avatarUrl}"
          alt="${name}"
          class="user-avatar-image"
        >`;

      avatarInitial.classList.add(
        "has-photo"
      );
    } else {
      avatarInitial.textContent =
        getUserInitial(name);

      avatarInitial.classList.remove(
        "has-photo"
      );
    }
  }

  /*
   * User info
   */
  if (userInfo) {
    userInfo.innerHTML = `
      <strong>${escapeHtml(name)}</strong>
      <small>${escapeHtml(role)}</small>
    `;
  }

  /*
   * Dropdown profile
   */
  const dropdownUser =
    document.getElementById(
      "currentUser"
    );

  if (dropdownUser) {
    dropdownUser.innerHTML = `
      <strong>${escapeHtml(name)}</strong>
      <small>${escapeHtml(role)}</small>
    `;
  }

  /*
   * Fallback untuk halaman yang belum memakai
   * avatar element baru.
   */
  if (!avatarInitial && user) {
    const oldUserInfo =
      document.getElementById(
        "userInfo"
      );

    if (oldUserInfo) {
      oldUserInfo.textContent =
        name;
    }
  }
}


/* ============================================================
   ESCAPE HTML
============================================================ */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* ============================================================
   INITIALIZE AUTH
============================================================ */

async function initializeAuth() {
  try {
    const user =
      await getCurrentAuthUser();

    /*
     * BELUM LOGIN
     */
    if (!user) {
      currentUser = null;
      currentProfile = null;

      window.currentUser = null;
      window.currentProfile = null;

      return null;
    }

    /*
     * SUDAH LOGIN
     */
    currentUser = user;
    window.currentUser = user;

    const profile =
      await loadCurrentProfile(user);

    /*
     * Jika user Auth ada tetapi profile tidak ada,
     * jangan biarkan masuk ke CRM.
     */
    if (!profile) {
      console.warn(
        "Auth user ada tetapi profile sales_users tidak ditemukan."
      );

      await supabaseClient.auth.signOut();

      currentUser = null;
      currentProfile = null;

      window.currentUser = null;
      window.currentProfile = null;

      return null;
    }

    currentProfile = profile;
    window.currentProfile = profile;

    updateUserHeader();

    return profile;

  } catch (error) {
    console.error(
      "initializeAuth error:",
      error
    );

    return null;
  }
}


/* ============================================================
   LOGOUT
============================================================ */

async function logoutUser() {
  try {
    await supabaseClient.auth.signOut();
  } catch (error) {
    console.error(
      "Logout error:",
      error
    );
  }

  currentUser = null;
  currentProfile = null;

  window.currentUser = null;
  window.currentProfile = null;

  /*
   * Selalu kembali ke login.
   */
  const currentPath =
    window.location.pathname;

  if (
    currentPath.includes(
      "/pages/"
    )
  ) {
    window.location.href =
      "login.html";
  } else {
    window.location.href =
      "pages/login.html";
  }
}


/* Alias agar tombol lama tetap bekerja */
window.logoutUser =
  logoutUser;

window.logout =
  logoutUser;

window.signOutUser =
  logoutUser;


/* ============================================================
   AUTH STATE LISTENER
============================================================ */

function listenAuthState() {
  if (
    !supabaseClient ||
    !supabaseClient.auth
  ) {
    return;
  }

  supabaseClient.auth.onAuthStateChange(
    async (event, session) => {

      console.log(
        "AUTH EVENT:",
        event
      );

      /*
       * SIGNED OUT
       */
      if (event === "SIGNED_OUT") {
        currentUser = null;
        currentProfile = null;

        window.currentUser = null;
        window.currentProfile = null;

        return;
      }

      /*
       * SIGNED IN / INITIAL SESSION
       *
       * Jangan melakukan redirect di sini.
       * login() sendiri yang mengarahkan ke dashboard.
       */
      if (
        event === "SIGNED_IN" ||
        event === "INITIAL_SESSION"
      ) {
        if (!session?.user) {
          return;
        }

        currentUser =
          session.user;

        window.currentUser =
          session.user;

        /*
         * Jangan await terlalu banyak pekerjaan
         * langsung di callback auth.
         */
        setTimeout(async () => {
          const profile =
            await loadCurrentProfile(
              session.user
            );

          if (profile) {
            currentProfile =
              profile;

            window.currentProfile =
              profile;

            updateUserHeader();
          }
        }, 0);
      }
    }
  );
}


/* ============================================================
   AUTO INITIALIZE
============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  async function () {

    /*
     * Pastikan tombol login menggunakan
     * fungsi login() global.
     */
    window.login = login;

    /*
     * Jangan jalankan initializeAuth
     * sebelum Supabase tersedia.
     */
    if (
      typeof supabaseClient ===
      "undefined"
    ) {
      console.error(
        "supabaseClient belum tersedia. Periksa config.js."
      );

      return;
    }

    /*
     * Dengarkan perubahan session.
     */
    listenAuthState();

    /*
     * Cek session yang sudah ada.
     */
    await initializeAuth();

    /*
     * Update header jika sudah login.
     */
    updateUserHeader();
  }
);
