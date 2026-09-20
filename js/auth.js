document.addEventListener("DOMContentLoaded", () => {
  const path = location.pathname.toLowerCase();
  const isLogin = path.endsWith("/login.html") || path.endsWith("/") || path.endsWith("/index.html");

  if (isLogin) {
    $("loginForm")?.addEventListener("submit", e => { e.preventDefault(); login(); });
    $("togglePassword")?.addEventListener("click", () => {
      const input = $("loginPassword"), icon = $("togglePassword").querySelector("i");
      input.type = input.type === "password" ? "text" : "password";
      icon.className = input.type === "password" ? "fa-regular fa-eye" : "fa-regular fa-eye-slash";
    });
    $("forgotPasswordBtn")?.addEventListener("click", () => showToast("Hubungi Admin FSI untuk reset password.", "info"));
    checkSession();
  } else {
    requireSession();
  }
});

async function checkSession() {
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error || !session) return;
    currentUser = session.user;
    await loadProfile(false);
  } catch (e) {
    console.error(e);
  }
}

async function requireSession() {
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error || !session) {
      window.location.replace("login.html");
      return;
    }
    currentUser = session.user;
    await loadProfile(true);
  } catch (e) {
    console.error(e);
    window.location.replace("login.html");
  }
}

async function login() {
  const username = $("loginUsername")?.value.trim();
  const password = $("loginPassword")?.value;
  const message = $("loginMessage");

  if (!username || !password) {
    if (message) message.textContent = "Username dan password wajib diisi.";
    return;
  }

  setButtonLoading($("loginButton"), true, "Login");
  if (message) message.textContent = "Logging in...";

  try {
    const { data: email, error: emailError } = await supabaseClient.rpc(
      "get_login_email",
      { p_username: username }
    );

    if (emailError) throw emailError;
    if (!email) throw new Error("Username tidak ditemukan atau tidak aktif.");

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    currentUser = data.user;
    await loadProfile(false);

  } catch (e) {
    console.error(e);
    if (message) message.textContent = e.message || "Login gagal.";
  } finally {
    setButtonLoading($("loginButton"), false, "Login");
  }
}

async function loadProfile(redirectAfterLoad = true) {
  if (!currentUser) {
    window.location.replace("login.html");
    return;
  }

  const { data, error } = await supabaseClient
    .from("sales_users")
    .select("*")
    .eq("auth_user-id", currentUser.id)
    .single();

  if (error || !data) {
    console.error(error);
    showToast("User profile tidak ditemukan.", "error");

    await supabaseClient.auth.signOut();

    if (location.pathname.toLowerCase().endsWith("/login.html")) return;

    window.location.replace("login.html");
    return;
  }

  currentProfile = data;

  updateUserInfo();
  setupRoleAccess();

  if (redirectAfterLoad) {
    await initializeCurrentPage();
  } else {
    window.location.replace("dashboard.html");
  }
}

function updateUserInfo() {
  const name = currentProfile?.name || currentProfile?.username || "User";
  const role = currentProfile?.role || "Sales";

  if ($("userInfo")) {
    $("userInfo").innerHTML =
      `<strong>${escapeHTML(name)}</strong><small>${escapeHTML(role)}</small>`;
  }

  if ($("userAvatarInitial")) {
    $("userAvatarInitial").textContent =
      name.charAt(0).toUpperCase();
  }
}

function setupRoleAccess() {
  const admin = currentProfile?.role === "Admin";

  document.querySelectorAll(".admin-only").forEach(x => {
    x.style.display = admin ? "flex" : "none";
  });

  if ($("salesDropdownContainer")) {
    $("salesDropdownContainer").style.display =
      admin ? "block" : "none";
  }

  const assign = $("leadSalesAssign");

  if (assign) {
    assign.disabled = !admin;
  }
}

async function initializeCurrentPage() {
  const page = getCurrentPageName();

  if (page === "dashboard") {
    await loadSalesLookup();
    await updateDashboard();
    return;
  }

  if (page === "leads") {
    await loadSalesLookup();
    await loadFilterOptions();
    await loadLeads(1);

    const params = new URLSearchParams(location.search);

    if (params.get("add") === "1") openLeadModal();
    if (params.get("edit")) await editLead(params.get("edit"));

    return;
  }

  if (page === "sales") {
    if (currentProfile?.role !== "Admin") {
      showToast("Access denied.", "error");
      window.location.replace("dashboard.html");
      return;
    }

    await loadSalesLookup();
    await loadSalesUsers();

    return;
  }

  if (page === "customer-profile") {
    await loadSalesLookup();

    const id = new URLSearchParams(location.search).get("id");

    if (!id) {
      $("customerProfileContent").innerHTML =
        '<div class="empty-state"><h3>Customer tidak ditemukan</h3><p>ID customer tidak tersedia.</p></div>';
      return;
    }

    await loadCustomerProfilePage(id);
  }
}

function getCurrentPageName() {
  const file = location.pathname.split("/").pop().toLowerCase();

  if (file === "dashboard.html") return "dashboard";
  if (file === "leads.html") return "leads";
  if (file === "sales.html") return "sales";
  if (file === "customer-profile.html") return "customer-profile";

  return "unknown";
}

async function logout() {
  try {
    await supabaseClient.auth.signOut();
  } finally {
    currentUser = null;
    currentProfile = null;
    window.location.replace("login.html");
  }
}
