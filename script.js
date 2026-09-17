// ======================================================
// FSI CRM - SCRIPT.JS
// ======================================================


// ======================================================
// SUPABASE CONFIG
// ======================================================

const SUPABASE_URL =
  "https://yoyszukutqwoxxdolzcg.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_QcPULwc5-Axry0HRzfmq1A_CeXgiAHL";

const { createClient } = window.supabase;

const supabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


// ======================================================
// GLOBAL VARIABLES
// ======================================================

let currentUser = null;
let currentProfile = null;

let leads = [];
let salesUsers = [];


// ======================================================
// DOM READY
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    const loginForm =
      document.getElementById("loginForm");

    if (loginForm) {

      loginForm.addEventListener(
        "submit",
        (event) => {

          event.preventDefault();

          login();

        }
      );

    }

    await checkSession();

  }
);


// ======================================================
// LOGIN
// ======================================================

async function login() {

  const usernameInput =
    document.getElementById(
      "loginUsername"
    );

  const passwordInput =
    document.getElementById(
      "loginPassword"
    );

  const username =
    usernameInput
      ? usernameInput.value.trim()
      : "";

  const password =
    passwordInput
      ? passwordInput.value
      : "";

  if (!username || !password) {

    alert(
      "Username dan password wajib diisi."
    );

    return;

  }


  const loginButton =
    document.querySelector(
      "#loginPage button"
    );


  try {

    if (loginButton) {

      loginButton.disabled = true;

      loginButton.textContent =
        "LOGGING IN...";

    }


    // --------------------------------------------------
    // CARI EMAIL BERDASARKAN USERNAME
    // --------------------------------------------------

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
        "Username lookup error:",
        emailError
      );

      alert(
        "Gagal mencari username.\n\n" +
        emailError.message
      );

      return;

    }


    if (!email) {

      alert(
        "Username tidak ditemukan."
      );

      return;

    }


    // --------------------------------------------------
    // LOGIN SUPABASE AUTH
    // --------------------------------------------------

    const {
      data,
      error
    } =
      await supabaseClient.auth.signInWithPassword(
        {
          email: email,
          password: password
        }
      );


    if (error) {

      console.error(
        "Auth login error:",
        error
      );

      alert(
        "Username atau password salah."
      );

      return;

    }


    currentUser =
      data.user;


    // --------------------------------------------------
    // LOAD PROFILE
    // --------------------------------------------------

    const profileLoaded =
      await loadProfile();


    if (!profileLoaded) {

      await supabaseClient.auth.signOut();

      alert(
        "Profile CRM tidak ditemukan."
      );

      return;

    }


    // --------------------------------------------------
    // CHECK STATUS
    // --------------------------------------------------

    if (
      currentProfile.status !==
      "Active"
    ) {

      await supabaseClient.auth.signOut();

      alert(
        "Akun kamu sedang tidak aktif."
      );

      return;

    }


    // --------------------------------------------------
    // SHOW APPLICATION
    // --------------------------------------------------

    showApp();


    // --------------------------------------------------
    // LOAD DATA
    // --------------------------------------------------

    await loadLeads();


    if (
      currentProfile.role ===
      "Admin"
    ) {

      await loadSalesUsers();

    }


    showDashboard();

  }

  catch (error) {

    console.error(
      "Login error:",
      error
    );

    alert(
      error.message ||
      "Login gagal."
    );

  }

  finally {

    if (loginButton) {

      loginButton.disabled = false;

      loginButton.textContent =
        "LOGIN";

    }

  }

}


// ======================================================
// LOGOUT
// ======================================================

async function logout() {

  try {

    await supabaseClient.auth.signOut();

  }

  catch (error) {

    console.error(
      "Logout error:",
      error
    );

  }


  currentUser = null;
  currentProfile = null;

  leads = [];
  salesUsers = [];


  showLogin();

}


// ======================================================
// CHECK SESSION
// ======================================================

async function checkSession() {

  try {

    const {
      data: {
        session
      }
    } =
      await supabaseClient.auth.getSession();


    if (!session) {

      showLogin();

      return;

    }


    currentUser =
      session.user;


    const profileLoaded =
      await loadProfile();


    if (!profileLoaded) {

      await supabaseClient.auth.signOut();

      showLogin();

      return;

    }


    if (
      currentProfile.status !==
      "Active"
    ) {

      await supabaseClient.auth.signOut();

      showLogin();

      alert(
        "Akun kamu sedang tidak aktif."
      );

      return;

    }


    showApp();


    await loadLeads();


    if (
      currentProfile.role ===
      "Admin"
    ) {

      await loadSalesUsers();

    }


    showDashboard();

  }

  catch (error) {

    console.error(
      "Session error:",
      error
    );

    showLogin();

  }

}


// ======================================================
// LOAD PROFILE
// ======================================================

async function loadProfile() {

  if (!currentUser) {

    currentProfile = null;

    return false;

  }


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

    currentProfile = null;

    return false;

  }


  currentProfile =
    data;


  return true;

}


// ======================================================
// SHOW LOGIN
// ======================================================

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


  const password =
    document.getElementById(
      "loginPassword"
    );


  if (password) {

    password.value = "";

  }

}


// ======================================================
// SHOW APP
// ======================================================

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


  updateUserInfo();

  setupRoleAccess();

}


// ======================================================
// USER INFORMATION
// ======================================================

function updateUserInfo() {

  if (!currentProfile) {
    return;
  }


  const userInfo =
    document.getElementById(
      "userInfo"
    );

  const currentUserElement =
    document.getElementById(
      "currentUser"
    );


  const displayName =
    currentProfile.name ||
    currentProfile.username ||
    "";


  const displayRole =
    currentProfile.role ||
    "";


  if (userInfo) {

    userInfo.innerHTML = `
      <strong>
        ${escapeHTML(displayName)}
      </strong>

      <small>
        ${escapeHTML(displayRole)}
      </small>
    `;

  }


  if (currentUserElement) {

    currentUserElement.textContent =
      displayName;

  }

}


// ======================================================
// ROLE ACCESS
// ======================================================

function setupRoleAccess() {

  const manageSalesBtn =
    document.getElementById(
      "manageSalesBtn"
    );


  if (!manageSalesBtn) {
    return;
  }


  if (
    currentProfile &&
    currentProfile.role ===
    "Admin"
  ) {

    manageSalesBtn.style.display =
      "block";

  }

  else {

    manageSalesBtn.style.display =
      "none";

  }

}


// ======================================================
// DASHBOARD
// ======================================================

function showDashboard() {

  hideAllPages();


  const dashboardPage =
    document.getElementById(
      "dashboardPage"
    );


  if (dashboardPage) {

    dashboardPage.style.display =
      "block";

  }


  setPageTitle(
    "Dashboard"
  );


  updateDashboard();

}


// ======================================================
// MY LEADS
// ======================================================

function showLeads() {

  hideAllPages();


  const leadsPage =
    document.getElementById(
      "leadsPage"
    );


  if (leadsPage) {

    leadsPage.style.display =
      "block";

  }


  setPageTitle(
    "My Leads"
  );


  renderLeads();

}


// ======================================================
// MANAGE SALES
// ======================================================

function showSales() {

  if (
    !currentProfile ||
    currentProfile.role !==
    "Admin"
  ) {

    alert(
      "Hanya Admin yang dapat mengakses Manage Sales."
    );

    return;

  }


  hideAllPages();


  const salesPage =
    document.getElementById(
      "salesPage"
    );


  if (salesPage) {

    salesPage.style.display =
      "block";

  }


  setPageTitle(
    "Manage Sales"
  );


  loadSalesUsers();

}


// ======================================================
// HIDE ALL PAGES
// ======================================================

function hideAllPages() {

  const pages =
    document.querySelectorAll(
      ".content"
    );


  pages.forEach(
    (page) => {

      page.style.display =
        "none";

    }
  );

}


// ======================================================
// PAGE TITLE
// ======================================================

function setPageTitle(title) {

  const pageTitle =
    document.getElementById(
      "pageTitle"
    );


  if (pageTitle) {

    pageTitle.textContent =
      title;

  }

}


// ======================================================
// LOAD LEADS
// ======================================================

async function loadLeads() {

  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("leads")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    if (error) {

      console.error(
        "Load leads error:",
        error
      );

      alert(
        "Gagal mengambil data leads.\n\n" +
        error.message
      );

      return;

    }


    leads =
      data || [];


    updateDashboard();

    renderLeads();

  }

  catch (error) {

    console.error(
      "Load leads exception:",
      error
    );

  }

}


// ======================================================
// RENDER LEADS
// ======================================================

function renderLeads() {

  const tbody =
    document.getElementById(
      "leadsTable"
    );


  if (!tbody) {
    return;
  }


  const searchInput =
    document.getElementById(
      "leadSearch"
    );

  const statusFilter =
    document.getElementById(
      "statusFilter"
    );


  const search =
    searchInput
      ? searchInput.value
          .toLowerCase()
          .trim()
      : "";


  const selectedStatus =
    statusFilter
      ? statusFilter.value
      : "";


  let filteredLeads =
    [...leads];


  // --------------------------------------------------
  // SEARCH
  // --------------------------------------------------

  if (search) {

    filteredLeads =
      filteredLeads.filter(
        (lead) => {

          return (

            (lead.customer_name || "")
              .toLowerCase()
              .includes(search)

            ||

            (lead.phone || "")
              .toLowerCase()
              .includes(search)

            ||

            (lead.business || "")
              .toLowerCase()
              .includes(search)

            ||

            (lead.location || "")
              .toLowerCase()
              .includes(search)

          );

        }
      );

  }


  // --------------------------------------------------
  // STATUS FILTER
  // --------------------------------------------------

  if (selectedStatus) {

    filteredLeads =
      filteredLeads.filter(
        (lead) =>
          lead.status ===
          selectedStatus
      );

  }


  // --------------------------------------------------
  // EMPTY
  // --------------------------------------------------

  if (
    filteredLeads.length ===
    0
  ) {

    tbody.innerHTML = `
      <tr>
        <td
          colspan="10"
          style="text-align:center;"
        >
          Belum ada data lead.
        </td>
      </tr>
    `;

    return;

  }


  // --------------------------------------------------
  // TABLE
  // --------------------------------------------------

  tbody.innerHTML =
    filteredLeads
      .map(
        (lead) => {

          return `
            <tr>

              <td>
                ${escapeHTML(
                  lead.customer_name
                )}
              </td>

              <td>

                ${
                  lead.phone
                    ? `
                      <a
                        href="${whatsappLink(
                          lead.phone
                        )}"
                        target="_blank"
                        rel="noopener"
                      >
                        ${escapeHTML(
                          lead.phone
                        )}
                      </a>
                    `
                    : "-"
                }

              </td>

              <td>
                ${escapeHTML(
                  lead.business
                )}
              </td>

              <td>
                ${escapeHTML(
                  lead.location
                )}
              </td>

              <td>

                <span
                  class="status-badge ${statusClass(
                    lead.status
                  )}"
                >
                  ${escapeHTML(
                    lead.status ||
                    "-"
                  )}
                </span>

              </td>

              <td>
                ${formatDate(
                  lead.follow_up_date
                )}
              </td>

              <td>
                ${formatDate(
                  lead.appointment
                )}
              </td>

              <td>
                ${formatDate(
                  lead.quotation
                )}
              </td>

              <td>
                ${formatDate(
                  lead.closing
                )}
              </td>

              <td>

                <button
                  class="btn-small"
                  onclick="editLead('${lead.id}')"
                >
                  Edit
                </button>

                <button
                  class="btn-small btn-danger"
                  onclick="deleteLead('${lead.id}')"
                >
                  Delete
                </button>

              </td>

            </tr>
          `;

        }
      )
      .join("");

}


// ======================================================
// FILTER LEADS
// ======================================================

function filterLeads() {

  renderLeads();

}


// ======================================================
// OPEN LEAD MODAL
// ======================================================

function openLeadModal() {

  const modal =
    document.getElementById(
      "leadModal"
    );


  if (!modal) {
    return;
  }


  clearLeadForm();


  const title =
    document.getElementById(
      "leadModalTitle"
    );


  if (title) {

    title.textContent =
      "Add Lead";

  }


  modal.style.display =
    "flex";

}


// ======================================================
// CLOSE LEAD MODAL
// ======================================================

function closeLeadModal() {

  const modal =
    document.getElementById(
      "leadModal"
    );


  if (modal) {

    modal.style.display =
      "none";

  }

}


// ======================================================
// CLEAR LEAD FORM
// ======================================================

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


  ids.forEach(
    (id) => {

      const element =
        document.getElementById(
          id
        );


      if (!element) {
        return;
      }


      if (
        element.tagName ===
        "SELECT"
      ) {

        element.selectedIndex =
          0;

      }

      else {

        element.value =
          "";

      }

    }
  );

}


// ======================================================
// SAVE LEAD
// ======================================================

async function saveLead() {

  if (!currentProfile) {

    alert(
      "Session tidak ditemukan."
    );

    return;

  }


  const leadId =
    getValue("leadId");


  const payload = {

    customer_name:
      getValue("leadCustomer"),

    phone:
      getValue("leadPhone"),

    business:
      getValue("leadBusiness"),

    location:
      getValue("leadLocation"),

    status:
      getValue("leadStatus"),

    follow_up_date:
      getValue("leadFollowUp") ||
      null,

    appointment:
      getValue("leadAppointment") ||
      null,

    site_survey:
      getValue("leadSiteSurvey") ||
      null,

    quotation:
      getValue("leadQuotation") ||
      null,

    spk:
      getValue("leadSPK") ||
      null,

    closing:
      getValue("leadClosing") ||
      null,

    notes:
      getValue("leadNotes")

  };


  try {

    let result;


    // --------------------------------------------------
    // UPDATE
    // --------------------------------------------------

    if (leadId) {

      result =
        await supabaseClient
          .from("leads")
          .update(payload)
          .eq(
            "id",
            leadId
          );

    }


    // --------------------------------------------------
    // INSERT
    // --------------------------------------------------

    else {

      payload.sales_id =
        currentProfile.id;


      result =
        await supabaseClient
          .from("leads")
          .insert(
            payload
          );

    }


    if (result.error) {

      console.error(
        "Save lead error:",
        result.error
      );


      alert(
        result.error.message ||
        "Gagal menyimpan lead."
      );


      return;

    }


    alert(
      leadId
        ? "Lead berhasil diperbarui."
        : "Lead berhasil ditambahkan."
    );


    closeLeadModal();


    await loadLeads();


    showLeads();

  }

  catch (error) {

    console.error(
      "Save lead exception:",
      error
    );


    alert(
      "Terjadi kesalahan saat menyimpan lead."
    );

  }

}


// ======================================================
// EDIT LEAD
// ======================================================

function editLead(id) {

  const lead =
    leads.find(
      (item) =>
        item.id === id
    );


  if (!lead) {

    alert(
      "Data lead tidak ditemukan."
    );

    return;

  }


  setValue(
    "leadId",
    lead.id
  );


  setValue(
    "leadCustomer",
    lead.customer_name
  );


  setValue(
    "leadPhone",
    lead.phone
  );


  setValue(
    "leadBusiness",
    lead.business
  );


  setValue(
    "leadLocation",
    lead.location
  );


  setValue(
    "leadStatus",
    lead.status
  );


  setValue(
    "leadFollowUp",
    lead.follow_up_date
  );


  setValue(
    "leadAppointment",
    lead.appointment
  );


  setValue(
    "leadSiteSurvey",
    lead.site_survey
  );


  setValue(
    "leadQuotation",
    lead.quotation
  );


  setValue(
    "leadSPK",
    lead.spk
  );


  setValue(
    "leadClosing",
    lead.closing
  );


  setValue(
    "leadNotes",
    lead.notes
  );


  const title =
    document.getElementById(
      "leadModalTitle"
    );


  if (title) {

    title.textContent =
      "Edit Lead";

  }


  const modal =
    document.getElementById(
      "leadModal"
    );


  if (modal) {

    modal.style.display =
      "flex";

  }

}


// ======================================================
// DELETE LEAD
// ======================================================

async function deleteLead(id) {

  const lead =
    leads.find(
      (item) =>
        item.id === id
    );


  if (!lead) {
    return;
  }


  const confirmed =
    confirm(
      `Hapus lead "${
        lead.customer_name ||
        "ini"
      }"?`
    );


  if (!confirmed) {
    return;
  }


  const {
    error
  } =
    await supabaseClient
      .from("leads")
      .delete()
      .eq(
        "id",
        id
      );


  if (error) {

    console.error(
      "Delete lead error:",
      error
    );


    alert(
      error.message ||
      "Gagal menghapus lead."
    );


    return;

  }


  alert(
    "Lead berhasil dihapus."
  );


  await loadLeads();


  showLeads();

}


// ======================================================
// DASHBOARD STATISTICS
// ======================================================

function updateDashboard() {

  setText(
    "statTotal",
    leads.length
  );


  setText(
    "statNew",
    countStatus([
      "New"
    ])
  );


  setText(
    "statInterested",
    countStatus([
      "Interested"
    ])
  );


  setText(
    "statFollowUp",
    countStatus([
      "Follow-up",
      "Follow Up"
    ])
  );


  setText(
    "statAppointment",
    leads.filter(
      (lead) =>
        !!lead.appointment
    ).length
  );


  setText(
    "statSiteSurvey",
    leads.filter(
      (lead) =>
        !!lead.site_survey
    ).length
  );


  setText(
    "statQuotation",
    leads.filter(
      (lead) =>
        !!lead.quotation
    ).length
  );


  setText(
    "statClosing",
    leads.filter(
      (lead) =>
        !!lead.closing
    ).length
  );

}


// ======================================================
// COUNT STATUS
// ======================================================

function countStatus(
  statuses
) {

  return leads.filter(
    (lead) =>
      statuses.includes(
        lead.status
      )
  ).length;

}


// ======================================================
// LOAD SALES USERS
// ======================================================

async function loadSalesUsers() {

  if (
    !currentProfile ||
    currentProfile.role !==
    "Admin"
  ) {

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
        .order(
          "name",
          {
            ascending: true
          }
        );


    if (error) {

      console.error(
        "Load sales users error:",
        error
      );


      alert(
        "Gagal mengambil data Sales.\n\n" +
        error.message
      );


      return;

    }


    salesUsers =
      data || [];


    renderSalesUsers();

  }

  catch (error) {

    console.error(
      "Load sales users exception:",
      error
    );

  }

}


// ======================================================
// RENDER SALES USERS
// ======================================================

function renderSalesUsers() {

  const tbody =
    document.getElementById(
      "salesTable"
    );


  if (!tbody) {
    return;
  }


  if (
    salesUsers.length ===
    0
  ) {

    tbody.innerHTML = `
      <tr>
        <td
          colspan="6"
          style="text-align:center;"
        >
          Belum ada Sales.
        </td>
      </tr>
    `;

    return;

  }


  tbody.innerHTML =
    salesUsers
      .map(
        (sales) => {

          const leadCount =
            leads.filter(
              (lead) =>
                lead.sales_id ===
                sales.id
            ).length;


          return `
            <tr>

              <td>
                ${escapeHTML(
                  sales.name
                )}
              </td>

              <td>
                ${escapeHTML(
                  sales.username
                )}
              </td>

              <td>
                ${escapeHTML(
                  sales.role
                )}
              </td>

              <td>

                <span
                  class="status-badge ${
                    sales.status ===
                    "Active"
                      ? "status-active"
                      : "status-inactive"
                  }"
                >
                  ${escapeHTML(
                    sales.status
                  )}
                </span>

              </td>

              <td>
                ${leadCount}
              </td>

              <td>

                ${
                  sales.role ===
                  "Sales"

                    ? `
                      <button
                        class="btn-small"
                        onclick="toggleSalesStatus(
                          '${sales.id}',
                          '${sales.status}'
                        )"
                      >
                        ${
                          sales.status ===
                          "Active"
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

        }
      )
      .join("");

}


// ======================================================
// OPEN SALES MODAL
// ======================================================

function openSalesModal() {

  if (
    !currentProfile ||
    currentProfile.role !==
    "Admin"
  ) {

    alert(
      "Hanya Admin yang dapat membuat Sales."
    );

    return;

  }


  const modal =
    document.getElementById(
      "salesModal"
    );


  if (modal) {

    modal.style.display =
      "flex";

  }

}


// ======================================================
// CLOSE SALES MODAL
// ======================================================

function closeSalesModal() {

  const modal =
    document.getElementById(
      "salesModal"
    );


  if (modal) {

    modal.style.display =
      "none";

  }


  clearSalesForm();

}


// ======================================================
// CLEAR SALES FORM
// ======================================================

function clearSalesForm() {

  setValue(
    "salesName",
    ""
  );

  setValue(
    "salesUsername",
    ""
  );

  setValue(
    "salesPassword",
    ""
  );

}


// ======================================================
// CREATE SALES
// ======================================================

async function createSales() {

  if (
    !currentProfile ||
    currentProfile.role !==
    "Admin"
  ) {

    alert(
      "Hanya Admin yang dapat membuat Sales."
    );

    return;

  }


  const name =
    getValue(
      "salesName"
    );

  const username =
    getValue(
      "salesUsername"
    );

  const password =
    getValue(
      "salesPassword"
    );


  if (
    !name ||
    !username ||
    !password
  ) {

    alert(
      "Nama, username, dan password wajib diisi."
    );

    return;

  }


  if (
    password.length <
    6
  ) {

    alert(
      "Password minimal 6 karakter."
    );

    return;

  }


  /*
   * Untuk keamanan, pembuatan user Auth
   * tidak boleh dilakukan langsung dari browser.
   *
   * Nanti kita sambungkan dengan
   * Supabase Edge Function.
   */


  alert(
    "Form Sales sudah siap. Pembuatan akun Auth otomatis akan kita sambungkan melalui server."
  );

}


// ======================================================
// TOGGLE SALES STATUS
// ======================================================

async function toggleSalesStatus(
  id,
  currentStatus
) {

  if (
    !currentProfile ||
    currentProfile.role !==
    "Admin"
  ) {

    alert(
      "Hanya Admin yang dapat mengubah status Sales."
    );

    return;

  }


  const newStatus =
    currentStatus ===
    "Active"
      ? "Inactive"
      : "Active";


  const confirmed =
    confirm(
      `Ubah status Sales menjadi ${newStatus}?`
    );


  if (!confirmed) {
    return;
  }


  const {
    error
  } =
    await supabaseClient
      .from("sales_users")
      .update({
        status:
          newStatus
      })
      .eq(
        "id",
        id
      );


  if (error) {

    console.error(
      "Update sales status error:",
      error
    );


    alert(
      error.message ||
      "Gagal mengubah status."
    );


    return;

  }


  await loadSalesUsers();

}


// ======================================================
// WHATSAPP
// ======================================================

function whatsappLink(
  phone
) {

  const number =
    normalizePhone(
      phone
    );


  if (!number) {

    return "#";

  }


  return (
    "https://wa.me/" +
    number
  );

}


// ======================================================
// NORMALIZE PHONE
// ======================================================

function normalizePhone(
  phone
) {

  if (!phone) {
    return "";
  }


  let number =
    String(phone)
      .replace(
        /\D/g,
        ""
      );


  if (
    number.startsWith(
      "0"
    )
  ) {

    number =
      "62" +
      number.substring(1);

  }


  else if (
    number.startsWith(
      "8"
    )
  ) {

    number =
      "62" +
      number;

  }


  return number;

}


// ======================================================
// DATE FORMAT
// ======================================================

function formatDate(
  value
) {

  if (!value) {

    return "-";

  }


  const date =
    new Date(
      value
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return escapeHTML(
      String(value)
    );

  }


  return date.toLocaleDateString(
    "id-ID",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }
  );

}


// ======================================================
// STATUS CLASS
// ======================================================

function statusClass(
  status
) {

  if (!status) {
    return "";
  }


  const value =
    status.toLowerCase();


  if (
    value.includes(
      "new"
    ) ||
    value.includes(
      "baru"
    )
  ) {

    return "status-new";

  }


  if (
    value.includes(
      "interested"
    ) ||
    value.includes(
      "tertarik"
    )
  ) {

    return "status-interested";

  }


  if (
    value.includes(
      "follow"
    )
  ) {

    return "status-followup";

  }


  if (
    value.includes(
      "closing"
    ) ||
    value.includes(
      "closed"
    )
  ) {

    return "status-closing";

  }


  if (
    value.includes(
      "not"
    ) ||
    value.includes(
      "tidak"
    )
  ) {

    return "status-not-interested";

  }


  return "";

}


// ======================================================
// HTML ESCAPE
// ======================================================

function escapeHTML(
  value
) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";

  }


  return String(value)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}


// ======================================================
// GET VALUE
// ======================================================

function getValue(
  id
) {

  const element =
    document.getElementById(
      id
    );


  if (!element) {
    return "";
  }


  return element.value.trim();

}


// ======================================================
// SET VALUE
// ======================================================

function setValue(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );


  if (element) {

    element.value =
      value || "";

  }

}


// ======================================================
// SET TEXT
// ======================================================

function setText(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );


  if (element) {

    element.textContent =
      value ?? 0;

  }

}


// ======================================================
// CLOSE MODALS WHEN CLICKING OUTSIDE
// ======================================================

window.addEventListener(
  "click",
  (event) => {

    const leadModal =
      document.getElementById(
        "leadModal"
      );

    const salesModal =
      document.getElementById(
        "salesModal"
      );


    if (
      event.target ===
      leadModal
    ) {

      closeLeadModal();

    }


    if (
      event.target ===
      salesModal
    ) {

      closeSalesModal();

    }

  }
);


// ======================================================
// AUTH STATE CHANGE
// ======================================================

supabaseClient.auth.onAuthStateChange(
  async (
    event,
    session
  ) => {

    if (
      event ===
        "SIGNED_OUT" ||
      !session
    ) {

      currentUser = null;
      currentProfile = null;

      leads = [];
      salesUsers = [];

      showLogin();

      return;

    }


    if (
      event ===
        "SIGNED_IN" ||
      event ===
        "INITIAL_SESSION" ||
      event ===
        "TOKEN_REFRESHED"
    ) {

      currentUser =
        session.user;


      const profileLoaded =
        await loadProfile();


      if (!profileLoaded) {
        return;
      }


      if (
        currentProfile.status !==
        "Active"
      ) {

        await supabaseClient.auth.signOut();

        return;

      }


      showApp();


      await loadLeads();


      if (
        currentProfile.role ===
        "Admin"
      ) {

        await loadSalesUsers();

      }

    }

  }
);
