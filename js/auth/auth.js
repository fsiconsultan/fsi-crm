// ================================
// CRM FSI - AUTH
// ================================

function setupEnglishStatusOptions() {

  const statusFilter =
    document.getElementById(
      "statusFilter"
    );

  const leadStatus =
    document.getElementById(
      "leadStatus"
    );

  if (statusFilter) {

    statusFilter.innerHTML = "";

    const allOption =
      document.createElement(
        "option"
      );

    allOption.value = "";

    allOption.textContent =
      "All Status";

    statusFilter.appendChild(
      allOption
    );

    LEAD_STATUSES.forEach(
      status => {

        const option =
          document.createElement(
            "option"
          );

        option.value =
          status;

        option.textContent =
          status;

        statusFilter.appendChild(
          option
        );

      }
    );

  }

  if (leadStatus) {

    leadStatus.innerHTML = "";

    LEAD_STATUSES.forEach(
      status => {

        const option =
          document.createElement(
            "option"
          );

        option.value =
          status;

        option.textContent =
          status;

        leadStatus.appendChild(
          option
        );

      }
    );

  }

}


// ================================
// AUTH SESSION
// ================================

async function checkSession() {

  try {

    const {
      data: { session },
      error
    } =
      await supabaseClient.auth.getSession();

    if (error) {

      console.error(error);

      showLogin();

      return;

    }

    if (!session) {

      showLogin();

      return;

    }

    currentUser =
      session.user;

    await loadProfile();

  } catch (error) {

    console.error(
      "checkSession error:",
      error
    );

    showLogin();

  }

}


// ================================
// LOGIN
// ================================

async function login() {

  const username =
    document
      .getElementById("loginUsername")
      .value
      .trim();

  const password =
    document
      .getElementById("loginPassword")
      .value;

  const message =
    document.getElementById(
      "loginMessage"
    );

  if (!username || !password) {

    message.textContent =
      "Username and password are required.";

    return;

  }

  message.textContent =
    "Logging in...";

  try {

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

    if (emailError) {

      console.error(
        emailError
      );

      message.textContent =
        emailError.message;

      return;

    }

    if (!email) {

      message.textContent =
        "Username not found or inactive.";

      return;

    }

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
        error
      );

      message.textContent =
        error.message;

      return;

    }

    currentUser =
      data.user;

    await loadProfile();

  } catch (error) {

    console.error(
      "login error:",
      error
    );

    message.textContent =
      "An error occurred while logging in.";

  }

}


// ================================
// LOAD USER PROFILE
// ================================

async function loadProfile() {

  if (!currentUser) {

    showLogin();

    return;

  }

  try {

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
        .single();

    if (error) {

      console.error(
        "Profile error:",
        error
      );

      alert(
        "User profile not found."
      );

      await logout();

      return;

    }

    currentProfile =
      data;

    updateUserInfo();

    setupRoleAccess();

    showApp();

    await loadSalesLookup();

    await loadFilterOptions();

    await loadLeads(1);

    await updateDashboard();

  } catch (error) {

    console.error(
      "loadProfile error:",
      error
    );

  }

}


// ================================
// SHOW / HIDE APP
// ================================

function showLogin() {

  const loginPage =
    document.getElementById(
      "loginPage"
    );

  const app =
    document.getElementById(
      "app"
    );

  if (loginPage) {

    loginPage.style.display =
      "flex";

  }

  if (app) {

    app.style.display =
      "none";

  }

}


function showApp() {

  const loginPage =
    document.getElementById(
      "loginPage"
    );

  const app =
    document.getElementById(
      "app"
    );

  if (loginPage) {

    loginPage.style.display =
      "none";

  }

  if (app) {

    app.style.display =
      "flex";

  }

  showDashboard();

}


// ================================
// USER INFO
// ================================

function updateUserInfo() {

  if (!currentProfile) return;

  const userInfo =
    document.getElementById(
      "userInfo"
    );

  const currentUserElement =
    document.getElementById(
      "currentUser"
    );

  if (userInfo) {

    const avatarUrl =
      currentProfile.avatar_url || "";

    userInfo.innerHTML = `
      ${
        avatarUrl
          ? `
            <img
              src="${escapeHTML(avatarUrl)}"
              alt="${escapeHTML(currentProfile.name || "")}"
              class="user-avatar"
            >
          `
          : ""
      }

      <strong>
        ${escapeHTML(
          currentProfile.name || ""
        )}
      </strong>

      <small>
        ${escapeHTML(
          currentProfile.role || ""
        )}
      </small>
    `;

  }

  if (currentUserElement) {

    currentUserElement.textContent =
      `${currentProfile.name} (${currentProfile.role})`;

  }

}


// ================================
// ROLE ACCESS
// ================================

function setupRoleAccess() {

  const manageSalesBtn =
    document.getElementById(
      "manageSalesBtn"
    );

  const mobileManageSalesBtn =
    document.getElementById(
      "mobileManageSalesBtn"
    );

  const salesFilter =
    document.getElementById(
      "salesFilter"
    );

  const salesDropdownContainer =
    document.getElementById(
      "salesDropdownContainer"
    );

  if (!currentProfile) return;

  const isAdmin =
    currentProfile.role ===
    "Admin";

  if (manageSalesBtn) {

    manageSalesBtn.style.display =
      isAdmin
        ? "block"
        : "none";

  }

  if (mobileManageSalesBtn) {

    mobileManageSalesBtn.style.display =
      isAdmin
        ? "block"
        : "none";

  }

  if (salesDropdownContainer) {

    salesDropdownContainer.style.display =
      isAdmin
        ? "block"
        : "none";

  }

  if (salesFilter) {

    salesFilter.style.display =
      isAdmin
        ? ""
        : "none";

  }

  setupSalesAssignmentAccess();

}


// ================================
// SALES ASSIGNMENT ACCESS
// ================================

function setupSalesAssignmentAccess() {

  const field =
    document.getElementById(
      "leadSalesAssign"
    );

  if (!field || !currentProfile)
    return;

  if (
    currentProfile.role ===
    "Admin"
  ) {

    field.disabled =
      false;

    field.style.display =
      "block";

  } else {

    field.disabled =
      true;

    field.style.display =
      "block";

  }

}
