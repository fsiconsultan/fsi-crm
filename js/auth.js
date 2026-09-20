// ============================================================
// CRM FSI - AUTHENTICATION
// Supabase Auth + Username Login
// ============================================================

let currentUser = null;
let currentProfile = null;


// ============================================================
// HELPER: LOGIN MESSAGE
// ============================================================

function showLoginMessage(message, type = "error") {
  const el = document.getElementById("loginMessage");

  if (!el) {
    console.log(message);
    return;
  }

  el.textContent = message;
  el.className = "login-message " + type;
}


// ============================================================
// HELPER: LOGIN BUTTON
// ============================================================

function setLoginLoading(loading) {
  const button = document.querySelector(".login-btn");

  if (!button) return;

  if (loading) {
    button.disabled = true;
    button.dataset.originalText =
      button.textContent || "LOGIN";
    button.textContent = "LOGIN...";
  } else {
    button.disabled = false;
    button.textContent =
      button.dataset.originalText || "LOGIN";
  }
}


// ============================================================
// AMBIL EMAIL DARI USERNAME
// ============================================================

async function getLoginEmail(username) {

  const cleanUsername = String(username || "").trim();

  if (!cleanUsername) {
    throw new Error("Username wajib diisi.");
  }

  /*
   * RPC utama.
   *
   * Kita gunakan parameter p_username terlebih dahulu.
   * Jika database Anda menggunakan username, kita coba
   * fallback kedua.
   */

  let result = await supabaseClient.rpc(
    "get_login_email",
    {
      p_username: cleanUsername
    }
  );

  /*
   * Jika parameter pertama tidak cocok,
   * coba parameter username.
   */

  if (result.error) {

    const secondResult =
      await supabaseClient.rpc(
        "get_login_email",
        {
          username: cleanUsername
        }
      );

    if (!secondResult.error) {
      result = secondResult;
    }
  }

  if (result.error) {
    console.error(
      "get_login_email error:",
      result.error
    );

    throw new Error(
      "Username tidak ditemukan atau fungsi login belum dapat digunakan."
    );
  }

  let email = result.data;

  /*
   * RPC bisa mengembalikan:
   * - string
   * - object
   * - array
   */

  if (Array.isArray(email)) {

    if (email.length === 0) {
      throw new Error("Username tidak ditemukan.");
    }

    email = email[0];
  }

  if (
    email &&
    typeof email === "object"
  ) {

    email =
      email.email ||
      email.login_email ||
      email.get_login_email ||
      email.result;
  }

  email = String(email || "").trim();

  if (!email) {
    throw new Error("Email login tidak ditemukan.");
  }

  return email;
}


// ============================================================
// LOGIN
// ============================================================

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
    usernameInput.value.trim();

  const password =
    passwordInput.value;

  if (!username) {
    showLoginMessage(
      "Username wajib diisi."
    );
    usernameInput.focus();
    return;
  }

  if (!password) {
    showLoginMessage(
      "Password wajib diisi."
    );
    passwordInput.focus();
    return;
  }

  setLoginLoading(true);
  showLoginMessage("", "");

  try {

    // --------------------------------------------------------
    // 1. CARI EMAIL BERDASARKAN USERNAME
    // --------------------------------------------------------

    const email =
      await getLoginEmail(username);

    console.log(
      "Login username:",
      username
    );

    console.log(
      "Login email ditemukan:",
      email
    );


    // --------------------------------------------------------
    // 2. LOGIN SUPABASE AUTH
    // --------------------------------------------------------

    const {
      data,
      error
    } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {

      console.error(
        "Supabase login error:",
        error
      );

      throw new Error(
        "Username atau password salah."
      );
    }

    if (!data || !data.user) {
      throw new Error(
        "Login gagal. User tidak ditemukan."
      );
    }

    currentUser = data.user;


    // --------------------------------------------------------
    // 3. AMBIL PROFILE SALES / ADMIN
    // --------------------------------------------------------

    await loadCurrentProfile(
      currentUser.id
    );


    // --------------------------------------------------------
    // 4. VALIDASI PROFILE
    // --------------------------------------------------------

    if (!currentProfile) {

      await supabaseClient.auth.signOut();

      throw new Error(
        "Akun berhasil login, tetapi profile CRM tidak ditemukan."
      );
    }


    // --------------------------------------------------------
    // 5. CEK STATUS AKUN
    // --------------------------------------------------------

    const status =
      String(
        currentProfile.status || "active"
      ).toLowerCase();

    if (
      status === "inactive" ||
      status === "disabled" ||
      status === "false"
    ) {

      await supabaseClient.auth.signOut();

      currentUser = null;
      currentProfile = null;

      throw new Error(
        "Akun Anda sedang tidak aktif."
      );
    }


    // --------------------------------------------------------
    // 6. SIMPAN DATA KE WINDOW
    // --------------------------------------------------------

    window.currentUser =
      currentUser;

    window.currentProfile =
      currentProfile;


    // --------------------------------------------------------
    // 7. LOGIN BERHASIL
    // --------------------------------------------------------

    showLoginMessage(
      "Login berhasil. Membuka CRM...",
      "success"
    );


    // --------------------------------------------------------
    // 8. MASUK DASHBOARD
    // --------------------------------------------------------

    setTimeout(function () {

      window.location.href =
        "dashboard.html";

    }, 250);

  } catch (error) {

    console.error(
      "LOGIN ERROR:",
      error
    );

    showLoginMessage(
      error.message ||
      "Login gagal.",
      "error"
    );

  } finally {

    setLoginLoading(false);
  }
}


// ============================================================
// LOAD CURRENT PROFILE
// ============================================================

async function loadCurrentProfile(
  authUserId
) {

  if (!authUserId) {
    throw new Error(
      "User ID tidak ditemukan."
    );
  }

  /*
   * PENTING:
   *
   * Nama kolom database memang:
   *
   * auth_user-id
   *
   * menggunakan tanda MINUS.
   *
   * Jadi jangan diganti menjadi:
   * auth_user_id
   */

  const {
    data,
    error
  } = await supabaseClient
    .from("sales_users")
    .select("*")
    .eq(
      "auth_user-id",
      authUserId
    )
    .maybeSingle();

  if (error) {

    console.error(
      "Profile error:",
      error
    );

    throw new Error(
      "Profile user tidak dapat dibaca."
    );
  }

  if (!data) {

    console.error(
      "Profile tidak ditemukan untuk:",
      authUserId
    );

    currentProfile = null;

    return null;
  }

  currentProfile = data;

  window.currentProfile =
    currentProfile;

  return currentProfile;
}


// ============================================================
// GET PROFILE NAME
// ============================================================

function getProfileName() {

  if (!currentProfile) {
    return "User";
  }

  return (
    currentProfile.name ||
    currentProfile.full_name ||
    currentProfile.sales_name ||
    currentProfile.username ||
    currentProfile.nama ||
    "User"
  );
}


// ============================================================
// GET PROFILE ROLE
// ============================================================

function getProfileRole() {

  if (!currentProfile) {
    return "";
  }

  return String(
    currentProfile.role || ""
  ).trim();
}


// ============================================================
// GET USER INITIAL
// ============================================================

function getUserInitial() {

  const name =
    getProfileName();

  if (!name) {
    return "F";
  }

  return name
    .trim()
    .charAt(0)
    .toUpperCase();
}


// ============================================================
// SALES PHOTO
// ============================================================

function getSalesAvatar() {

  /*
   * Foto Rist
   *
   * Kita tidak mengubah database.
   */

  const salesAvatarMap = {

    "df7a9ddb-23e3-40ce-a53e-8befeaba71c5":
      "https://yoyszukutqwoxxdolzcg.supabase.co/storage/v1/object/public/sales-avatar/rist.jpeg"

  };

  if (!currentUser) {
    return "";
  }

  return (
    salesAvatarMap[currentUser.id] ||
    ""
  );
}


// ============================================================
// UPDATE HEADER USER
// ============================================================

function updateUserHeader() {

  const name =
    getProfileName();

  const role =
    getProfileRole();

  const initial =
    getUserInitial();

  const avatar =
    getSalesAvatar();


  // ----------------------------------------------------------
  // USER INFO
  // ----------------------------------------------------------

  const userInfo =
    document.getElementById("userInfo");

  if (userInfo) {

    userInfo.innerHTML = `
      <strong>${escapeHtml(name)}</strong>
      <small>${escapeHtml(role || "User")}</small>
    `;
  }


  // ----------------------------------------------------------
  // AVATAR
  // ----------------------------------------------------------

  const avatarEl =
    document.getElementById(
      "userAvatarInitial"
    );

  if (avatarEl) {

    if (avatar) {

      avatarEl.classList.add(
        "has-photo"
      );

      avatarEl.innerHTML = `
        <img
          src="${avatar}"
          alt="${escapeHtml(name)}"
          class="user-avatar-image"
          onerror="this.parentElement.classList.remove('has-photo'); this.parentElement.innerHTML='${escapeHtml(initial)}';"
        >
      `;

    } else {

      avatarEl.classList.remove(
        "has-photo"
      );

      avatarEl.textContent =
        initial;
    }
  }
}


// ============================================================
// LOGOUT
// ============================================================

async function logoutUser() {

  try {

    await supabaseClient.auth.signOut();

  } catch (error) {

    console.error(
      "Logout error:",
      error
    );

  } finally {

    currentUser = null;
    currentProfile = null;

    window.currentUser = null;
    window.currentProfile = null;

    window.location.href =
      "login.html";
  }
}


// Compatibility
window.logoutUser =
  logoutUser;


// ============================================================
// INITIALIZE AUTH
// ============================================================

async function initializeAuth() {

  try {

    const {
      data,
      error
    } = await supabaseClient.auth.getSession();

    if (error) {
      console.error(
        "Session error:",
        error
      );
      return;
    }

    const session =
      data && data.session;

    // --------------------------------------------------------
    // TIDAK ADA SESSION
    // --------------------------------------------------------

    if (!session || !session.user) {

      currentUser = null;
      currentProfile = null;

      return;
    }


    // --------------------------------------------------------
    // ADA SESSION
    // --------------------------------------------------------

    currentUser =
      session.user;

    await loadCurrentProfile(
      currentUser.id
    );


    if (currentProfile) {

      window.currentUser =
        currentUser;

      window.currentProfile =
        currentProfile;

      updateUserHeader();
    }

  } catch (error) {

    console.error(
      "initializeAuth error:",
      error
    );
  }
}


// ============================================================
// AUTH STATE LISTENER
// ============================================================

function listenAuthState() {

  supabaseClient.auth.onAuthStateChange(
    async function (
      event,
      session
    ) {

      console.log(
        "AUTH EVENT:",
        event
      );

      if (
        event === "SIGNED_OUT"
      ) {

        currentUser = null;
        currentProfile = null;

        window.currentUser = null;
        window.currentProfile = null;

        return;
      }

      if (
        session &&
        session.user
      ) {

        currentUser =
          session.user;

        /*
         * Jangan melakukan redirect
         * dari listener.
         *
         * Redirect login dilakukan
         * oleh fungsi login().
         */

        try {

          await loadCurrentProfile(
            currentUser.id
          );

          if (currentProfile) {
            updateUserHeader();
          }

        } catch (error) {

          console.error(
            "Auth state profile error:",
            error
          );
        }
      }
    }
  );
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(value) {

  return String(
    value == null ? "" : value
  )
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// ============================================================
// AUTO INIT
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  function () {

    initializeAuth();
    listenAuthState();

  }
);


// ============================================================
// GLOBAL
// ============================================================

window.login =
  login;

window.getLoginEmail =
  getLoginEmail;

window.loadCurrentProfile =
  loadCurrentProfile;

window.getProfileName =
  getProfileName;

window.getProfileRole =
  getProfileRole;

window.getUserInitial =
  getUserInitial;

window.getSalesAvatar =
  getSalesAvatar;

window.updateUserHeader =
  updateUserHeader;
