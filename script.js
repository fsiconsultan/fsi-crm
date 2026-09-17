// ======================================================
// FSI CRM - SCRIPT.JS
// ======================================================

// =========================
// SUPABASE CONFIG
// =========================

const SUPABASE_URL = "https://yoyszukutqwoxxdolzcg.supabase.co/rest/v1/";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_QcPULwc5-Axry0HRzfmq1A_CeXgiAHL";

const { createClient } = window.supabase;

const supabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


// =========================
// GLOBAL VARIABLES
// =========================

let currentUser = null;
let currentProfile = null;
let leads = [];
let salesUsers = [];


// =========================
// DOM READY
// =========================

document.addEventListener("DOMContentLoaded", () => {
  checkSession();

  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      login();
    });
  }
});


// =========================
// LOGIN
// =========================

async function login() {
  const usernameInput = document.getElementById("loginUsername");
  const passwordInput = document.getElementById("loginPassword");
  const loginButton = document.querySelector("#loginForm button");

  const username = usernameInput?.value.trim();
  const password = passwordInput?.value;

  if (!username || !password) {
    alert("Username dan password wajib diisi.");
    return;
  }

  try {
    if (loginButton) {
      loginButton.disabled = true;
      loginButton.textContent = "Logging in...";
    }

    // Cari email berdasarkan username melalui RPC
    const { data: email, error: emailError } =
      await supabaseClient.rpc("get_login_email", {
        p_username: username
      });

    if (emailError) {
      console.error("Username lookup error:", emailError);
      throw new Error("Username tidak ditemukan atau sistem login belum siap.");
    }

    if (!email) {
      throw new Error("Username tidak ditemukan.");
    }

    // Login ke Supabase Auth
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

    if (error) {
      console.error("Auth login error:", error);
      throw new Error("Username atau password salah.");
    }

    currentUser = data.user;

    // Load profile
    await loadProfile();

    if (!currentProfile) {
      await supabaseClient.auth.signOut();
      throw new Error("Profile CRM tidak ditemukan.");
    }

    if (currentProfile.status !== "Active") {
      await supabaseClient.auth.signOut();
      throw new Error("Akun kamu sedang tidak aktif.");
    }

    showApp();

    await loadLeads();

    if (currentProfile.role === "Admin") {
      await loadSalesUsers();
    }

    showDashboard();

  } catch (error) {
    console.error(error);
    alert(error.message || "Login gagal.");
  } finally {
    if (loginButton) {
      loginButton.disabled = false;
      loginButton.textContent = "Login";
    }
  }
}


// =========================
// LOGOUT
// =========================

async function logout() {
  await supabaseClient.auth.signOut();

  currentUser = null;
  currentProfile = null;
  leads = [];
  salesUsers = [];

  showLogin();
}


// =========================
// SESSION CHECK
// =========================

async function checkSession() {
  try {
    const {
      data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) {
      showLogin();
      return;
    }

    currentUser = session.user;

    await loadProfile();

    if (!currentProfile) {
      await supabaseClient.auth.signOut();
      showLogin();
      return;
    }

    if (currentProfile.status !== "Active") {
      await supabaseClient.auth.signOut();
      showLogin();
      alert("Akun kamu sedang tidak aktif.");
      return;
    }

    showApp();

    await loadLeads();

    if (currentProfile.role === "Admin") {
      await loadSalesUsers();
    }

    showDashboard();

  } catch (error) {
    console.error("Session error:", error);
    showLogin();
  }
}


// =========================
// LOAD PROFILE
// =========================

async function loadProfile() {
  if (!currentUser) return;

  const { data, error } = await supabaseClient
    .from("sales_users")
    .select("*")
    .eq('"auth_user-id"', currentUser.id)
    .single();

  if (error) {
    console.error("Profile error:", error);
    currentProfile = null;
    return;
  }

  currentProfile = data;
}


// =========================
// SHOW LOGIN
// =========================

function showLogin() {
  const loginPage = document.getElementById("loginPage");
  const app = document.getElementById("app");

  if (loginPage) {
    loginPage.style.display = "flex";
  }

  if (app) {
    app.style.display = "none";
  }

  const username = document.getElementById("loginUsername");
  const password = document.getElementById("loginPassword");

  if (password) {
    password.value = "";
  }

  if (username) {
    username.focus();
  }
}


// =========================
// SHOW APP
// =========================

function showApp() {
  const loginPage = document.getElementById("loginPage");
  const app = document.getElementById("app");

  if (loginPage) {
    loginPage.style.display = "none";
  }

  if (app) {
    app.style.display = "flex";
  }

  updateUserInfo();
  setupRoleAccess();
}


// =========================
// USER INFO
// =========================

function updateUserInfo() {
  if (!currentProfile) return;

  const elements = [
    document.getElementById("currentUserName"),
    document.getElementById("userName"),
    document.getElementById("profileName")
  ];

  elements.forEach((element) => {
    if (element) {
      element.textContent = currentProfile.name || currentProfile.username;
    }
  });

  const roleElements = [
    document.getElementById("currentUserRole"),
    document.getElementById("userRole"),
    document.getElementById("profileRole")
  ];

  roleElements.forEach((element) => {
    if (element) {
      element.textContent = currentProfile.role || "";
    }
  });
}


// =========================
// ROLE ACCESS
// =========================

function setupRoleAccess() {
  const manageSalesMenu = document.getElementById("manageSalesMenu");

  if (manageSalesMenu) {
    manageSalesMenu.style.display =
      currentProfile?.role === "Admin" ? "block" : "none";
  }
}


// =========================
// PAGE NAVIGATION
// =========================

function showPage(pageName) {
  const pages = document.querySelectorAll(".page");

  pages.forEach((page) => {
    page.style.display = "none";
  });

  const targetPage = document.getElementById(`${pageName}Page`);

  if (targetPage) {
    targetPage.style.display = "block";
  }

  const menuItems = document.querySelectorAll("[data-page]");

  menuItems.forEach((item) => {
    item.classList.remove("active");

    if (item.dataset.page === pageName) {
      item.classList.add("active");
    }
  });

  if (pageName === "dashboard") {
    updateDashboard();
  }

  if (pageName === "leads") {
    renderLeads();
  }

  if (pageName === "sales" && currentProfile?.role === "Admin") {
    loadSalesUsers();
  }
}


function showDashboard() {
  showPage("dashboard");
}


// =========================
// LOAD LEADS
// =========================

async function loadLeads() {
  let query = supabaseClient
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error("Load leads error:", error);
    alert("Gagal mengambil data leads.");
    return;
  }

  leads = data || [];

  renderLeads();
  updateDashboard();
}


// =========================
// RENDER LEADS
// =========================

function renderLeads() {
  const tbody = document.getElementById("leadsTableBody");

  if (!tbody) return;

  const searchInput = document.getElementById("leadSearch");
  const statusFilter = document.getElementById("statusFilter");

  const search = searchInput
    ? searchInput.value.toLowerCase().trim()
    : "";

  const selectedStatus = statusFilter
    ? statusFilter.value
    : "";

  let filteredLeads = [...leads];

  if (search) {
    filteredLeads = filteredLeads.filter((lead) => {
      return (
        (lead.customer_name || "").toLowerCase().includes(search) ||
        (lead.phone || "").toLowerCase().includes(search) ||
        (lead.business || "").toLowerCase().includes(search) ||
        (lead.location || "").toLowerCase().includes(search)
      );
    });
  }

  if (selectedStatus) {
    filteredLeads = filteredLeads.filter(
      (lead) => lead.status === selectedStatus
    );
  }

  if (filteredLeads.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align:center;">
          Belum ada data lead.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredLeads.map((lead) => {
    return `
      <tr>
        <td>${escapeHTML(lead.customer_name)}</td>

        <td>
          ${
            lead.phone
              ? `<a href="${whatsappLink(lead.phone)}" target="_blank">
                  ${escapeHTML(lead.phone)}
                </a>`
              : "-"
          }
        </td>

        <td>${escapeHTML(lead.business)}</td>

        <td>${escapeHTML(lead.location)}</td>

        <td>
          <span class="status-badge ${statusClass(lead.status)}">
            ${escapeHTML(lead.status || "-")}
          </span>
        </td>

        <td>${formatDate(lead.follow_up_date)}</td>

        <td>${formatDate(lead.appointment)}</td>

        <td>${formatDate(lead.quotation)}</td>

        <td>${formatDate(lead.closing)}</td>

        <td>
          <button
            class="btn-small"
            onclick="editLead('${lead.id}')">
            Edit
          </button>

          <button
            class="btn-small btn-danger"
            onclick="deleteLead('${lead.id}')">
            Delete
          </button>
        </td>
      </tr>
    `;
  }).join("");
}


// =========================
// SEARCH / FILTER
// =========================

function filterLeads() {
  renderLeads();
}


// =========================
// OPEN ADD LEAD MODAL
// =========================

function openLeadModal() {
  const modal = document.getElementById("leadModal");

  if (!modal) return;

  clearLeadForm();

  const title = document.getElementById("leadModalTitle");

  if (title) {
    title.textContent = "Add New Lead";
  }

  modal.style.display = "flex";
}


// =========================
// CLOSE LEAD MODAL
// =========================

function closeLeadModal() {
  const modal = document.getElementById("leadModal");

  if (modal) {
    modal.style.display = "none";
  }
}


// =========================
// CLEAR LEAD FORM
// =========================

function clearLeadForm() {
  const ids = [
    "leadId",
    "leadCustomer",
    "leadPhone",
    "leadBusiness",
    "leadLocation",
    "leadStatus",
    "leadFollowUp",
    "leadAppointment",
    "leadSiteSurvey",
    "leadQuotation",
    "leadSPK",
    "leadClosing",
    "leadNotes"
  ];

  ids.forEach((id) => {
    const element = document.getElementById(id);

    if (!element) return;

    if (element.tagName === "SELECT") {
      element.selectedIndex = 0;
    } else {
      element.value = "";
    }
  });
}


// =========================
// SAVE LEAD
// =========================

async function saveLead() {
  if (!currentProfile) {
    alert("Session tidak ditemukan.");
    return;
  }

  const leadId = document.getElementById("leadId")?.value;

  const payload = {
    customer_name: getValue("leadCustomer"),
    phone: getValue("leadPhone"),
    business: getValue("leadBusiness"),
    location: getValue("leadLocation"),
    status: getValue("leadStatus"),
    follow_up_date: getValue("leadFollowUp") || null,
    appointment: getValue("leadAppointment") || null,
    site_survey: getValue("leadSiteSurvey") || null,
    quotation: getValue("leadQuotation") || null,
    spk: getValue("leadSPK") || null,
    closing: getValue("leadClosing") || null,
    notes: getValue("leadNotes")
  };

  try {
    let result;

    if (leadId) {
      // Update existing lead
      result = await supabaseClient
        .from("leads")
        .update(payload)
        .eq("id", leadId);

    } else {
      // Create new lead
      payload.sales_id = currentProfile.id;

      result = await supabaseClient
        .from("leads")
        .insert(payload);
    }

    if (result.error) {
      console.error("Save lead error:", result.error);
      alert(result.error.message || "Gagal menyimpan lead.");
      return;
    }

    alert(
      leadId
        ? "Lead berhasil diperbarui."
        : "Lead berhasil ditambahkan."
    );

    closeLeadModal();

    await loadLeads();

  } catch (error) {
    console.error(error);
    alert("Terjadi kesalahan saat menyimpan lead.");
  }
}


// =========================
// EDIT LEAD
// =========================

function editLead(id) {
  const lead = leads.find((item) => item.id === id);

  if (!lead) {
    alert("Data lead tidak ditemukan.");
    return;
  }

  setValue("leadId", lead.id);
  setValue("leadCustomer", lead.customer_name);
  setValue("leadPhone", lead.phone);
  setValue("leadBusiness", lead.business);
  setValue("leadLocation", lead.location);
  setValue("leadStatus", lead.status);
  setValue("leadFollowUp", lead.follow_up_date);
  setValue("leadAppointment", lead.appointment);
  setValue("leadSiteSurvey", lead.site_survey);
  setValue("leadQuotation", lead.quotation);
  setValue("leadSPK", lead.spk);
  setValue("leadClosing", lead.closing);
  setValue("leadNotes", lead.notes);

  const title = document.getElementById("leadModalTitle");

  if (title) {
    title.textContent = "Edit Lead";
  }

  const modal = document.getElementById("leadModal");

  if (modal) {
    modal.style.display = "flex";
  }
}


// =========================
// DELETE LEAD
// =========================

async function deleteLead(id) {
  const lead = leads.find((item) => item.id === id);

  if (!lead) return;

  const confirmed = confirm(
    `Hapus lead "${lead.customer_name || "ini"}"?`
  );

  if (!confirmed) return;

  const { error } = await supabaseClient
    .from("leads")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Delete lead error:", error);
    alert(error.message || "Gagal menghapus lead.");
    return;
  }

  alert("Lead berhasil dihapus.");

  await loadLeads();
}


// =========================
// DASHBOARD
// =========================

function updateDashboard() {
  setText("statTotal", leads.length);

  setText(
    "statNew",
    countStatus(["New", "Baru"])
  );

  setText(
    "statInterested",
    countStatus(["Interested", "Tertarik"])
  );

  setText(
    "statFollowUp",
    countStatus(["Follow Up", "Follow-up"])
  );

  setText(
    "statAppointment",
    leads.filter((lead) => !!lead.appointment).length
  );

  setText(
    "statSiteSurvey",
    leads.filter((lead) => !!lead.site_survey).length
  );

  setText(
    "statQuotation",
    leads.filter((lead) => !!lead.quotation).length
  );

  setText(
    "statClosing",
    leads.filter((lead) => !!lead.closing).length
  );
}


function countStatus(statuses) {
  return leads.filter((lead) =>
    statuses.includes(lead.status)
  ).length;
}


// =========================
// SALES MANAGEMENT
// =========================

async function loadSalesUsers() {
  if (currentProfile?.role !== "Admin") {
    return;
  }

  const { data, error } = await supabaseClient
    .from("sales_users")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Load sales users error:", error);
    alert("Gagal mengambil data Sales.");
    return;
  }

  salesUsers = data || [];

  renderSalesUsers();
}


// =========================
// RENDER SALES
// =========================

function renderSalesUsers() {
  const tbody = document.getElementById("salesTableBody");

  if (!tbody) return;

  if (salesUsers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;">
          Belum ada Sales.
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML = salesUsers.map((sales) => {
    const leadCount = leads.filter(
      (lead) => lead.sales_id === sales.id
    ).length;

    return `
      <tr>
        <td>${escapeHTML(sales.name)}</td>

        <td>${escapeHTML(sales.username)}</td>

        <td>${escapeHTML(sales.role)}</td>

        <td>
          <span class="status-badge ${
            sales.status === "Active"
              ? "status-active"
              : "status-inactive"
          }">
            ${escapeHTML(sales.status)}
          </span>
        </td>

        <td>${leadCount}</td>

        <td>
          ${
            sales.role === "Sales"
              ? `
                <button
                  class="btn-small"
                  onclick="toggleSalesStatus('${sales.id}', '${sales.status}')">
                  ${
                    sales.status === "Active"
                      ? "Deactivate"
                      : "Activate"
                  }
                </button>
              `
              : "-"
          }
        </td>
      </tr>
    `;
  }).join("");
}


// =========================
// CREATE SALES
// =========================

async function createSales() {
  if (currentProfile?.role !== "Admin") {
    alert("Hanya Admin yang dapat membuat Sales.");
    return;
  }

  const name = getValue("salesName");
  const username = getValue("salesUsername");
  const password = getValue("salesPassword");

  if (!name || !username || !password) {
    alert("Nama, username, dan password wajib diisi.");
    return;
  }

  alert(
    "Pembuatan akun Sales baru melalui Auth membutuhkan proses server-side. " +
    "Fitur ini akan kita sambungkan setelah login utama berhasil."
  );
}


// =========================
// TOGGLE SALES STATUS
// =========================

async function toggleSalesStatus(id, currentStatus) {
  if (currentProfile?.role !== "Admin") {
    alert("Hanya Admin yang dapat mengubah status Sales.");
    return;
  }

  const newStatus =
    currentStatus === "Active"
      ? "Inactive"
      : "Active";

  const confirmed = confirm(
    `Ubah status Sales menjadi ${newStatus}?`
  );

  if (!confirmed) return;

  const { error } = await supabaseClient
    .from("sales_users")
    .update({
      status: newStatus
    })
    .eq("id", id);

  if (error) {
    console.error("Update sales status error:", error);
    alert(error.message || "Gagal mengubah status.");
    return;
  }

  await loadSalesUsers();
}


// =========================
// MODAL SALES
// =========================

function openSalesModal() {
  const modal = document.getElementById("salesModal");

  if (modal) {
    modal.style.display = "flex";
  }
}


function closeSalesModal() {
  const modal = document.getElementById("salesModal");

  if (modal) {
    modal.style.display = "none";
  }

  clearSalesForm();
}


function clearSalesForm() {
  setValue("salesName", "");
  setValue("salesUsername", "");
  setValue("salesPassword", "");
}


// =========================
// WHATSAPP
// =========================

function whatsappLink(phone) {
  const number = normalizePhone(phone);

  if (!number) {
    return "#";
  }

  return `https://wa.me/${number}`;
}


function normalizePhone(phone) {
  if (!phone) return "";

  let number = String(phone).replace(/\D/g, "");

  if (number.startsWith("0")) {
    number = "62" + number.substring(1);
  }

  if (number.startsWith("8")) {
    number = "62" + number;
  }

  return number;
}


// =========================
// DATE FORMAT
// =========================

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return escapeHTML(String(value));
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}


// =========================
// STATUS CLASS
// =========================

function statusClass(status) {
  if (!status) return "";

  const value = status.toLowerCase();

  if (value.includes("new") || value.includes("baru")) {
    return "status-new";
  }

  if (
    value.includes("interested") ||
    value.includes("tertarik")
  ) {
    return "status-interested";
  }

  if (
    value.includes("follow") ||
    value.includes("follow-up")
  ) {
    return "status-followup";
  }

  if (
    value.includes("closing") ||
    value.includes("closed")
  ) {
    return "status-closing";
  }

  if (
    value.includes("not") ||
    value.includes("tidak")
  ) {
    return "status-not-interested";
  }

  return "";
}


// =========================
// HTML ESCAPE
// =========================

function escapeHTML(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// =========================
// HELPERS
// =========================

function getValue(id) {
  const element = document.getElementById(id);

  return element
    ? element.value.trim()
    : "";
}


function setValue(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.value = value || "";
  }
}


function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value ?? 0;
  }
}


// =========================
// CLOSE MODALS WHEN CLICKING OUTSIDE
// =========================

window.addEventListener("click", (event) => {
  const leadModal = document.getElementById("leadModal");
  const salesModal = document.getElementById("salesModal");

  if (event.target === leadModal) {
    closeLeadModal();
  }

  if (event.target === salesModal) {
    closeSalesModal();
  }
});


// =========================
// AUTH STATE LISTENER
// =========================

supabaseClient.auth.onAuthStateChange(
  async (event, session) => {
    if (event === "SIGNED_OUT" || !session) {
      currentUser = null;
      currentProfile = null;
      leads = [];
      salesUsers = [];

      showLogin();
      return;
    }

    if (
      event === "SIGNED_IN" ||
      event === "INITIAL_SESSION" ||
      event === "TOKEN_REFRESHED"
    ) {
      currentUser = session.user;

      await loadProfile();

      if (!currentProfile) {
        return;
      }

      if (currentProfile.status !== "Active") {
        await supabaseClient.auth.signOut();
        return;
      }

      showApp();

      await loadLeads();

      if (currentProfile.role === "Admin") {
        await loadSalesUsers();
      }

      showDashboard();
    }
  }
);
