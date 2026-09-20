// ======================================================
// CRM FSI - AUTH
// ======================================================
// Login, session, profile, role access,
// dan inisialisasi halaman CRM.
// ======================================================


// ======================================================
// DOM READY
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

  const path =
    location.pathname.toLowerCase();

  const isLogin =
    path.endsWith("/login.html") ||
    path.endsWith("/") ||
    path.endsWith("/index.html");


  // ====================================================
  // LOGIN PAGE
  // ====================================================

  if (isLogin) {

    $("loginForm")?.addEventListener(
      "submit",
      event => {
        event.preventDefault();
        login();
      }
    );


    $("togglePassword")?.addEventListener(
      "click",
      () => {

        const input =
          $("loginPassword");

        const icon =
          $("togglePassword")
            ?.querySelector("i");


        if (!input) {
          return;
        }


        input.type =
          input.type === "password"
            ? "text"
            : "password";


        if (icon) {

          icon.className =
            input.type === "password"
              ? "fa-regular fa-eye"
              : "fa-regular fa-eye-slash";

        }

      }
    );


    $("forgotPasswordBtn")?.addEventListener(
      "click",
      () => {

        showToast(
          "Hubungi Admin FSI untuk reset password.",
          "info"
        );

      }
    );


    checkSession();

    return;
  }


  // ====================================================
  // INTERNAL PAGE
  // ====================================================

  requireSession();

});


// ======================================================
// CHECK SESSION
// ======================================================

async function checkSession() {

  try {

    const {
      data: { session },
      error
    } =
      await supabaseClient.auth.getSession();


    if (error) {

      console.error(
        "SESSION ERROR:",
        error
      );

      return;
    }


    if (!session) {
      return;
    }


    currentUser =
      session.user;


    console.log(
      "AUTH SESSION BERHASIL"
    );

    console.log(
      "USER ID:",
      currentUser.id
    );

    console.log(
      "EMAIL:",
      currentUser.email
    );


    await loadProfile(false);

  } catch (error) {

    console.error(
      "CHECK SESSION ERROR:",
      error
    );

  }

}


// ======================================================
// REQUIRE SESSION
// ======================================================

async function requireSession() {

  try {

    const {
      data: { session },
      error
    } =
      await supabaseClient.auth.getSession();


    if (error) {

      console.error(
        "SESSION ERROR:",
        error
      );

      window.location.replace(
        "login.html"
      );

      return;
    }


    if (!session) {

      window.location.replace(
        "login.html"
      );

      return;
    }


    currentUser =
      session.user;


    console.log(
      "REQUIRE SESSION BERHASIL"
    );

    console.log(
      "USER ID:",
      currentUser.id
    );

    console.log(
      "EMAIL:",
      currentUser.email
    );


    await loadProfile(true);

  } catch (error) {

    console.error(
      "REQUIRE SESSION ERROR:",
      error
    );

    window.location.replace(
      "login.html"
    );

  }

}


// ======================================================
// LOGIN
// ======================================================

async function login() {

  const username =
    $("loginUsername")
      ?.value
      .trim();


  const password =
    $("loginPassword")
      ?.value;


  const message =
    $("loginMessage");


  if (!username || !password) {

    if (message) {

      message.textContent =
        "Username dan password wajib diisi.";

    }

    return;
  }


  const loginButton =
    $("loginButton");


  if (loginButton) {

    setButtonLoading(
      loginButton,
      true,
      "Login"
    );

  }


  if (message) {

    message.textContent =
      "Logging in...";

  }


  try {

    // ==================================================
    // 1. CARI EMAIL BERDASARKAN USERNAME
    // ==================================================

    console.log(
      "Mencari username:",
      username
    );


    const {
      data: email,
      error: emailError
    } =
      await supabaseClient.rpc(
        "get_login_email",
        {
          p_username:
            username
        }
      );


    console.log(
      "RPC EMAIL:",
      email
    );


    console.log(
      "RPC ERROR:",
      emailError
    );


    if (emailError) {

      throw new Error(
        "Gagal mencari username: " +
        emailError.message
      );

    }


    if (!email) {

      throw new Error(
        "Username tidak ditemukan atau tidak aktif."
      );

    }


    // ==================================================
    // 2. LOGIN SUPABASE AUTH
    // ==================================================

    console.log(
      "Login menggunakan email:",
      email
    );


    const {
      data,
      error
    } =
      await supabaseClient.auth.signInWithPassword({

        email:
          email,

        password:
          password

      });


    console.log(
      "AUTH DATA:",
      data
    );


    console.log(
      "AUTH ERROR:",
      error
    );


    if (error) {

      throw new Error(
        "Login Auth gagal: " +
        error.message
      );

    }


    if (!data?.user) {

      throw new Error(
        "Login berhasil tetapi User Auth tidak ditemukan."
      );

    }


    currentUser =
      data.user;


    console.log(
      "LOGIN AUTH BERHASIL"
    );


    console.log(
      "AUTH USER ID:",
      currentUser.id
    );


    // ==================================================
    // 3. LOAD PROFILE CRM
    // ==================================================

    await loadProfile(false);

  } catch (error) {

    console.error(
      "LOGIN ERROR:",
      error
    );


    if (message) {

      message.textContent =
        error.message ||
        "Login gagal.";

    }

  } finally {

    if (loginButton) {

      setButtonLoading(
        loginButton,
        false,
        "Login"
      );

    }

  }

}


// ======================================================
// LOAD PROFILE
// ======================================================

async function loadProfile(
  redirectAfterLoad = true
) {

  if (!currentUser) {

    console.error(
      "CURRENT USER KOSONG"
    );


    if (
      location.pathname
        .toLowerCase()
        .endsWith("/login.html")
    ) {

      return;
    }


    window.location.replace(
      "login.html"
    );

    return;
  }


  console.log(
    "--------------------------------"
  );

  console.log(
    "MENCARI PROFILE SALES"
  );

  console.log(
    "AUTH USER ID:",
    currentUser.id
  );

  console.log(
    "--------------------------------"
  );


  // ====================================================
  // QUERY SALES_USERS
  // ====================================================

  const {
    data,
    error
  } =
    await supabaseClient
      .from("sales_users")
      .select("*")
      .eq(
        "auth_user-id",
        currentUser.id
      )
      .maybeSingle();


  console.log(
    "SALES PROFILE:",
    data
  );


  console.log(
    "SALES PROFILE ERROR:",
    error
  );


  // ====================================================
  // ERROR
  // ====================================================

  if (error) {

    console.error(
      "ERROR MEMBACA sales_users:",
      error
    );


    const message =
      $("loginMessage");


    if (message) {

      message.textContent =
        "Login Auth berhasil, tetapi profile CRM gagal dibaca: " +
        error.message;

    }


    return;
  }


  // ====================================================
  // PROFILE TIDAK ADA
  // ====================================================

  if (!data) {

    console.error(
      "PROFILE SALES TIDAK DITEMUKAN"
    );


    const message =
      $("loginMessage");


    if (message) {

      message.textContent =
        "Login Auth berhasil, tetapi data user tidak ditemukan di sales_users.";

    }


    return;
  }


  // ====================================================
  // PROFILE BERHASIL
  // ====================================================

  currentProfile =
    data;


  console.log(
    "--------------------------------"
  );

  console.log(
    "PROFILE BERHASIL"
  );

  console.log(
    "NAME:",
    currentProfile.name
  );

  console.log(
    "USERNAME:",
    currentProfile.username
  );

  console.log(
    "ROLE:",
    currentProfile.role
  );

  console.log(
    "AUTH USER ID:",
    currentProfile["auth_user-id"]
  );

  console.log(
    "--------------------------------"
  );


  updateUserInfo();

  setupRoleAccess();


  // ====================================================
  // INITIALIZE / REDIRECT
  // ====================================================

  if (redirectAfterLoad) {

    await initializeCurrentPage();

  } else {

    window.location.replace(
      "dashboard.html"
    );

  }

}


// ======================================================
// USER INFO
// ======================================================

function updateUserInfo() {

  const name =
    currentProfile?.name ||
    currentProfile?.username ||
    "User";


  const role =
    currentProfile?.role ||
    "Sales";


  if ($("userInfo")) {

    $("userInfo").innerHTML =
      `<strong>${escapeHTML(name)}</strong>
       <small>${escapeHTML(role)}</small>`;

  }


  if ($("userAvatarInitial")) {

    $("userAvatarInitial")
      .textContent =
        name
          .charAt(0)
          .toUpperCase();

  }

}


// ======================================================
// ROLE ACCESS
// ======================================================

function setupRoleAccess() {

  const isAdmin =
    currentProfile?.role === "Admin";


  document
    .querySelectorAll(".admin-only")
    .forEach(element => {

      element.style.display =
        isAdmin
          ? "flex"
          : "none";

    });


  if ($("salesDropdownContainer")) {

    $("salesDropdownContainer")
      .style.display =
        isAdmin
          ? "block"
          : "none";

  }


  const assign =
    $("leadSalesAssign");


  if (assign) {

    assign.disabled =
      !isAdmin;

  }

}


// ======================================================
// INITIALIZE CURRENT PAGE
// ======================================================

async function initializeCurrentPage() {

  const page =
    getCurrentPageName();


  console.log(
    "CURRENT PAGE:",
    page
  );


  // ====================================================
  // DASHBOARD
  // ====================================================

  if (page === "dashboard") {

    if (
      typeof loadSalesLookup ===
      "function"
    ) {

      await loadSalesLookup();

    }


    if (
      typeof updateDashboard ===
      "function"
    ) {

      await updateDashboard();

    }


    return;
  }


  // ====================================================
  // LEADS
  // ====================================================

  if (page === "leads") {

    if (
      typeof loadSalesLookup ===
      "function"
    ) {

      await loadSalesLookup();

    }


    if (
      typeof loadFilterOptions ===
      "function"
    ) {

      await loadFilterOptions();

    }


    if (
      typeof loadLeads ===
      "function"
    ) {

      await loadLeads(1);

    }


    const params =
      new URLSearchParams(
        location.search
      );


    if (
      params.get("add") === "1" &&
      typeof openLeadModal ===
      "function"
    ) {

      openLeadModal();

    }


    if (
      params.get("edit") &&
      typeof editLead ===
      "function"
    ) {

      await editLead(
        params.get("edit")
      );

    }


    return;
  }


  // ====================================================
  // MANAGE SALES
  // ====================================================

  if (page === "sales") {

    if (
      currentProfile?.role !==
      "Admin"
    ) {

      showToast(
        "Access denied.",
        "error"
      );


      window.location.replace(
        "dashboard.html"
      );


      return;
    }


    /*
      PENTING:

      Jangan hanya memanggil
      loadSalesUsers().

      initializeSalesPage()
      bertugas memasang event,
      membuka Add New Sales,
      search, form submit,
      photo preview, kemudian
      memuat database Sales.
    */

    if (
      typeof initializeSalesPage ===
      "function"
    ) {

      await initializeSalesPage();

    } else if (
      typeof loadSalesUsers ===
      "function"
    ) {

      // Fallback jika sales.js
      // belum termuat.

      await loadSalesUsers();

    }


    return;
  }


  // ====================================================
  // CUSTOMER PROFILE
  // ====================================================

  if (
    page ===
    "customer-profile"
  ) {

    if (
      typeof loadSalesLookup ===
      "function"
    ) {

      await loadSalesLookup();

    }


    const id =
      new URLSearchParams(
        location.search
      )
        .get("id");


    if (!id) {

      if (
        $("customerProfileContent")
      ) {

        $("customerProfileContent")
          .innerHTML =
            `
              <div class="empty-state">

                <h3>
                  Customer tidak ditemukan
                </h3>

                <p>
                  ID customer tidak tersedia.
                </p>

              </div>
            `;

      }


      return;
    }


    if (
      typeof loadCustomerProfilePage ===
      "function"
    ) {

      await loadCustomerProfilePage(
        id
      );

    }

  }

}


// ======================================================
// CURRENT PAGE
// ======================================================

function getCurrentPageName() {

  const file =
    location.pathname
      .split("/")
      .pop()
      .toLowerCase();


  if (
    file ===
    "dashboard.html"
  ) {

    return "dashboard";

  }


  if (
    file ===
    "leads.html"
  ) {

    return "leads";

  }


  if (
    file ===
    "sales.html"
  ) {

    return "sales";

  }


  if (
    file ===
    "customer-profile.html"
  ) {

    return "customer-profile";

  }


  return "unknown";

}


// ======================================================
// LOGOUT
// ======================================================

async function logout() {

  try {

    await supabaseClient
      .auth
      .signOut();

  } finally {

    currentUser =
      null;

    currentProfile =
      null;


    window.location.replace(
      "login.html"
    );

  }

}
