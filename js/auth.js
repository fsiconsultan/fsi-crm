// ======================================================
// CRM FSI - AUTH
// ======================================================

document.addEventListener("DOMContentLoaded", () => {

  const path = location.pathname.toLowerCase();

  const isLogin =
    path.endsWith("/login.html") ||
    path.endsWith("/") ||
    path.endsWith("/index.html");


  // ====================================================
  // LOGIN PAGE
  // ====================================================

  if (isLogin) {

    $("loginForm")?.addEventListener("submit", e => {
      e.preventDefault();
      login();
    });


    $("togglePassword")?.addEventListener("click", () => {

      const input = $("loginPassword");
      const icon = $("togglePassword")?.querySelector("i");

      if (!input) return;

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

    });


    $("forgotPasswordBtn")?.addEventListener("click", () => {

      showToast(
        "Hubungi Admin FSI untuk reset password.",
        "info"
      );

    });


    checkSession();

  } else {

    requireSession();

  }

});


// ======================================================
// CHECK SESSION
// ======================================================

async function checkSession() {

  try {

    const {
      data: { session },
      error
    } = await supabaseClient.auth.getSession();


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


    currentUser = session.user;


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

  } catch (e) {

    console.error(
      "CHECK SESSION ERROR:",
      e
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
    } = await supabaseClient.auth.getSession();


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


    currentUser = session.user;


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

  } catch (e) {

    console.error(
      "REQUIRE SESSION ERROR:",
      e
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
    $("loginUsername")?.value.trim();

  const password =
    $("loginPassword")?.value;

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
    // 1. CARI EMAIL DARI USERNAME
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
          p_username: username
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
        email: email,
        password: password
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
    // 3. LOAD PROFILE
    // ==================================================

    await loadProfile(false);

  } catch (e) {

    console.error(
      "LOGIN ERROR:",
      e
    );


    if (message) {

      message.textContent =
        e.message ||
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
    "================================"
  );

  console.log(
    "MENCARI PROFILE SALES"
  );

  console.log(
    "AUTH USER ID:",
    currentUser.id
  );

  console.log(
    "================================"
  );


  // ====================================================
  // QUERY SALES USERS
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
  // ERROR PROFILE
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
    "================================"
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
    "================================"
  );


  updateUserInfo();

  setupRoleAccess();


  // ====================================================
  // INITIALIZE HALAMAN
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

    $("userAvatarInitial").textContent =
      name
        .charAt(0)
        .toUpperCase();

  }

}


// ======================================================
// ROLE ACCESS
// ======================================================

function setupRoleAccess() {

  const admin =
    currentProfile?.role === "Admin";


  document
    .querySelectorAll(".admin-only")
    .forEach(element => {

      element.style.display =
        admin
          ? "flex"
          : "none";

    });


  if ($("salesDropdownContainer")) {

    $("salesDropdownContainer").style.display =
      admin
        ? "block"
        : "none";

  }


  const assign =
    $("leadSalesAssign");


  if (assign) {

    assign.disabled =
      !admin;

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

    try {

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

    } catch (error) {

      console.error(
        "DASHBOARD ERROR:",
        error
      );

    }

    return;

  }


  // ====================================================
  // LEADS
  // ====================================================

  if (page === "leads") {

    console.log(
      "================================"
    );

    console.log(
      "CRM FSI - MEMUAT LEADS"
    );

    console.log(
      "================================"
    );


    try {

      // ------------------------------------------------
      // JALANKAN INITIALIZER LEADS
      // ------------------------------------------------

      if (
        typeof initializeLeadsPage ===
        "function"
      ) {

        console.log(
          "Menjalankan initializeLeadsPage()"
        );


        await initializeLeadsPage();


      } else {

        console.warn(
          "initializeLeadsPage tidak ditemukan."
        );


        // ----------------------------------------------
        // FALLBACK
        // ----------------------------------------------

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

      }


      // ------------------------------------------------
      // URL ADD
      // ------------------------------------------------

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


      // ------------------------------------------------
      // URL EDIT
      // ------------------------------------------------

      if (
        params.get("edit") &&
        typeof editLead ===
        "function"
      ) {

        await editLead(
          params.get("edit")
        );

      }


      console.log(
        "CRM FSI - LEADS SELESAI"
      );


    } catch (error) {

      console.error(
        "CRM FSI - LEADS ERROR:",
        error
      );


      if (
        typeof showToast ===
        "function"
      ) {

        showToast(
          "Gagal memuat database Leads: " +
          (
            error.message ||
            "Unknown error"
          ),
          "error"
        );

      }

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


    try {

      if (
        typeof loadSalesLookup ===
        "function"
      ) {

        await loadSalesLookup();

      }


      if (
        typeof loadSalesUsers ===
        "function"
      ) {

        await loadSalesUsers();

      }

    } catch (error) {

      console.error(
        "SALES PAGE ERROR:",
        error
      );

    }


    return;

  }


  // ====================================================
  // CUSTOMER PROFILE
  // ====================================================

  if (page === "customer-profile") {

    try {

      if (
        typeof loadSalesLookup ===
        "function"
      ) {

        await loadSalesLookup();

      }


      const id =
        new URLSearchParams(
          location.search
        ).get("id");


      if (!id) {

        if (
          $("customerProfileContent")
        ) {

          $("customerProfileContent").innerHTML =
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

    } catch (error) {

      console.error(
        "CUSTOMER PROFILE ERROR:",
        error
      );

    }


    return;

  }

}


// ======================================================
// GET CURRENT PAGE
// ======================================================

function getCurrentPageName() {

  const file =
    location.pathname
      .split("/")
      .pop()
      .toLowerCase();


  if (
    file === "dashboard.html"
  ) {

    return "dashboard";

  }


  if (
    file === "leads.html"
  ) {

    return "leads";

  }


  if (
    file === "sales.html"
  ) {

    return "sales";

  }


  if (
    file === "customer-profile.html"
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

    await supabaseClient.auth.signOut();

  } finally {

    currentUser = null;

    currentProfile = null;


    window.location.replace(
      "login.html"
    );

  }

}
