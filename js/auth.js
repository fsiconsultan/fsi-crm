// ========================================
// CRM FSI - AUTHENTICATION
// ========================================

document.addEventListener("DOMContentLoaded", () => {
  const isLoginPage =
    window.location.pathname.toLowerCase().endsWith("login.html") ||
    window.location.pathname === "/" ||
    window.location.pathname.endsWith("/");

  if (isLoginPage) {
    setupLoginPage();
    checkSession();
  } else {
    requireSession();
  }
});


// ========================================
// LOGIN PAGE
// ========================================

function setupLoginPage() {
  const loginForm = $("loginForm");

  if (loginForm) {
    loginForm.addEventListener(
      "submit",
      handleLogin
    );
  }

  $("togglePassword")?.addEventListener(
    "click",
    () => {
      const passwordInput = $("loginPassword");

      if (!passwordInput) return;

      const isPassword =
        passwordInput.type === "password";

      passwordInput.type =
        isPassword
          ? "text"
          : "password";

      const icon =
        $("togglePassword")?.querySelector("i");

      if (icon) {
        icon.className =
          isPassword
            ? "fa-solid fa-eye-slash"
            : "fa-solid fa-eye";
      }
    }
  );

  $("forgotPasswordBtn")?.addEventListener(
    "click",
    () => {
      showToast(
        "Silakan hubungi Admin untuk reset password.",
        "info"
      );
    }
  );
}


// ========================================
// HANDLE LOGIN
// ========================================

async function handleLogin(event) {
  event.preventDefault();

  const username =
    $("loginUsername")?.value.trim() || "";

  const password =
    $("loginPassword")?.value || "";

  const button =
    $("loginButton");

  if (!username || !password) {
    showLoginMessage(
      "Username dan password wajib diisi."
    );
    return;
  }

  clearLoginMessage();

  if (button) {
    setButtonLoading(
      button,
      true,
      "Login"
    );
  }

  try {

    // ------------------------------------
    // 1. CARI EMAIL BERDASARKAN USERNAME
    // ------------------------------------

    const {
      data: emailData,
      error: emailError
    } = await supabaseClient.rpc(
      "get_login_email",
      {
        p_username: username
      }
    );

    console.log(
      "get_login_email:",
      emailData,
      emailError
    );

    if (emailError) {
      throw new Error(
        emailError.message ||
        "Gagal mencari akun."
      );
    }

    let email = null;

    // RPC bisa mengembalikan string
    if (typeof emailData === "string") {
      email = emailData;
    }

    // RPC bisa mengembalikan object
    if (
      emailData &&
      typeof emailData === "object"
    ) {
      email =
        emailData.email ||
        emailData.login_email ||
        emailData.get_login_email ||
        null;
    }

    // RPC bisa mengembalikan array
    if (
      Array.isArray(emailData) &&
      emailData.length
    ) {
      const first =
        emailData[0];

      if (typeof first === "string") {
        email = first;
      } else if (first) {
        email =
          first.email ||
          first.login_email ||
          first.get_login_email ||
          null;
      }
    }

    if (!email) {
      throw new Error(
        "Akun tidak ditemukan."
      );
    }

    email =
      String(email).trim();

    console.log(
      "Login email:",
      email
    );


    // ------------------------------------
    // 2. LOGIN SUPABASE AUTH
    // ------------------------------------

    const {
      data,
      error
    } =
      await supabaseClient.auth.signInWithPassword({
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

    if (!data?.user) {
      throw new Error(
        "Login gagal. User tidak ditemukan."
      );
    }

    currentUser =
      data.user;


    // ------------------------------------
    // 3. LOAD PROFILE
    // ------------------------------------

    await loadProfile(
      true
    );

  } catch (error) {

    console.error(
      "handleLogin:",
      error
    );

    showLoginMessage(
      error.message ||
      "Login gagal."
    );

  } finally {

    if (button) {
      setButtonLoading(
        button,
        false,
        "Login"
      );
    }
  }
}


// ========================================
// LOAD PROFILE
// ========================================

async function loadProfile(
  redirectAfterLoad = false
) {

  if (!currentUser) {
    return;
  }

  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from(
          CRM_CONFIG.salesTable
        )
        .select("*")
        .eq(
          "auth_user-id",
          currentUser.id
        )
        .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      await supabaseClient.auth.signOut();

      throw new Error(
        "Akun berhasil login, tetapi profile CRM tidak ditemukan."
      );
    }

    currentProfile =
      data;

    console.log(
      "Current profile:",
      currentProfile
    );

    updateUserInfo();

    setupRoleAccess();

    if (redirectAfterLoad) {

      const role =
        String(
          currentProfile.role || ""
        ).toLowerCase();

      if (role === "admin") {

        window.location.href =
          "dashboard.html";

      } else {

        window.location.href =
          "dashboard.html";
      }
    }

  } catch (error) {

    console.error(
      "loadProfile:",
      error
    );

    await supabaseClient.auth.signOut();

    currentUser = null;
    currentProfile = null;

    if (
      window.location.pathname
        .toLowerCase()
        .endsWith("login.html")
    ) {
      showLoginMessage(
        error.message ||
        "Profile pengguna tidak ditemukan."
      );
    } else {
      window.location.href =
        "login.html";
    }
  }
}


// ========================================
// CHECK SESSION
// ========================================

async function checkSession() {

  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth.getSession();

    if (error) {
      console.error(
        "checkSession:",
        error
      );
      return;
    }

    if (
      data?.session?.user
    ) {

      currentUser =
        data.session.user;

      await loadProfile(
        true
      );
    }

  } catch (error) {

    console.error(
      "checkSession:",
      error
    );
  }
}


// ========================================
// REQUIRE SESSION
// ========================================

async function requireSession() {

  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth.getSession();

    if (error) {
      throw error;
    }

    if (
      !data?.session?.user
    ) {

      window.location.href =
        "login.html";

      return;
    }

    currentUser =
      data.session.user;

    await loadProfile(
      false
    );

    initializeCurrentPage();

  } catch (error) {

    console.error(
      "requireSession:",
      error
    );

    window.location.href =
      "login.html";
  }
}


// ========================================
// UPDATE USER INFO
// ========================================

function updateUserInfo() {

  if (!currentProfile) {
    return;
  }

  const name =
    currentProfile.name ||
    currentProfile.username ||
    "User";

  const role =
    currentProfile.role ||
    "Sales";

  const initial =
    name
      .charAt(0)
      .toUpperCase();

  const avatar =
    $("userAvatarInitial");

  if (avatar) {
    avatar.textContent =
      initial;
  }

  const info =
    $("userInfo");

  if (info) {

    info.innerHTML = `
      <strong>
        ${escapeHTML(name)}
      </strong>

      <small>
        ${escapeHTML(role)}
      </small>
    `;
  }
}


// ========================================
// ROLE ACCESS
// ========================================

function setupRoleAccess() {

  const isAdmin =
    String(
      currentProfile?.role || ""
    ).toLowerCase() ===
    "admin";

  document
    .querySelectorAll(".admin-only")
    .forEach(
      (element) => {
        element.style.display =
          isAdmin
            ? ""
            : "none";
      }
    );

  const salesAssign =
    $("leadSalesAssign");

  if (salesAssign) {

    salesAssign.disabled =
      !isAdmin;

    if (!isAdmin) {
      salesAssign.value =
        currentProfile?.id || "";
    }
  }
}


// ========================================
// CURRENT PAGE
// ========================================

function initializeCurrentPage() {

  const path =
    window.location.pathname
      .toLowerCase();

  if (
    path.endsWith(
      "dashboard.html"
    )
  ) {

    if (
      typeof updateDashboard ===
      "function"
    ) {
      updateDashboard();
    }

    return;
  }

  if (
    path.endsWith(
      "leads.html"
    )
  ) {

    if (
      typeof loadSalesLookup ===
      "function"
    ) {
      loadSalesLookup();
    }

    if (
      typeof loadFilterOptions ===
      "function"
    ) {
      loadFilterOptions();
    }

    if (
      typeof loadLeads ===
      "function"
    ) {
      loadLeads();
    }

    return;
  }

  if (
    path.endsWith(
      "sales.html"
    )
  ) {

    const isAdmin =
      String(
        currentProfile?.role || ""
      ).toLowerCase() ===
      "admin";

    if (!isAdmin) {

      window.location.href =
        "dashboard.html";

      return;
    }

    if (
      typeof loadSalesUsers ===
      "function"
    ) {
      loadSalesUsers();
    }

    return;
  }

  if (
    path.endsWith(
      "customer-profile.html"
    )
  ) {

    const params =
      new URLSearchParams(
        window.location.search
      );

    const id =
      params.get("id");

    if (
      id &&
      typeof loadCustomerProfilePage ===
      "function"
    ) {
      loadCustomerProfilePage(id);
    }

    return;
  }
}


// ========================================
// LOGIN MESSAGE
// ========================================

function showLoginMessage(
  message
) {

  const element =
    $("loginMessage");

  if (!element) {
    return;
  }

  element.textContent =
    message;

  element.className =
    "login-message error";

  element.style.display =
    "block";
}


function clearLoginMessage() {

  const element =
    $("loginMessage");

  if (!element) {
    return;
  }

  element.textContent =
    "";

  element.style.display =
    "none";
}


// ========================================
// LOGOUT
// ========================================

async function logout() {

  try {

    await supabaseClient.auth.signOut();

  } catch (error) {

    console.error(
      "logout:",
      error
    );

  } finally {

    currentUser = null;
    currentProfile = null;

    window.location.href =
      "login.html";
  }
}
