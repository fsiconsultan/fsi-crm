// ================================
// CRM FSI - SUPABASE CONFIG
// ================================

const SUPABASE_URL =
  "https://yoyszukutqwoxxdolzcg.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_QcPULwc5-Axry0HRzfmq1A_CeXgiAHL";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );


// ================================
// GLOBAL VARIABLES
// ================================

let currentUser = null;
let currentProfile = null;
let leadsData = [];
let salesUsersData = [];

let currentPage = 1;
const pageSize = 20;
let totalLeadsCount = 0;


// ================================
// CRM STATUS
// ================================

const LEAD_STATUSES = [
  "New",
  "Flyer Sent",
  "Interested",
  "Follow Up",
  "Closing",
  "Not Interested"
];


// ================================
// CUSTOMER PIPELINE
// ================================

const CUSTOMER_PIPELINE = [
  {
    key: "new",
    label: "New",
    field: null,
    status: "New",
    icon: "sparkles"
  },
  {
    key: "flyer",
    label: "Flyer Sent",
    field: null,
    status: "Flyer Sent",
    icon: "send"
  },
  {
    key: "interested",
    label: "Interested",
    field: null,
    status: "Interested",
    icon: "heart"
  },
  {
    key: "followup",
    label: "Follow Up",
    field: "follow_up_date",
    status: "Follow Up",
    icon: "phone-call"
  },
  {
    key: "appointment",
    label: "Appointment",
    field: "appointment",
    status: null,
    icon: "calendar-days"
  },
  {
    key: "survey",
    label: "Site Survey",
    field: "site_survey",
    status: null,
    icon: "map-pin"
  },
  {
    key: "quotation",
    label: "Quotation",
    field: "quotation",
    status: null,
    icon: "file-text"
  },
  {
    key: "spk",
    label: "SPK",
    field: "spk",
    status: null,
    icon: "file-check"
  },
  {
    key: "closing",
    label: "Closing",
    field: "closing",
    status: "Closing",
    icon: "badge-check"
  }
];

let crmActivePipelineStep = "new";


// ================================
// START APP
// ================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    console.log("CRM FSI started");

    setupModalEvents();

    setupEnglishStatusOptions();

    await checkSession();

  }
);


// ================================
// ENGLISH STATUS OPTIONS
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


// ================================
// NAVIGATION
// ================================

function hideAllPages() {

  const pages = [
    "dashboardPage",
    "leadsPage",
    "salesPage",
    "customerProfilePage",
    "appointmentPage",
    "dailyReportPage",
    "pltsCalculatorPage",
    "pltsSimulatorPage",
    "settingsPage"
  ];

  pages.forEach(id => {

    const element =
      document.getElementById(id);

    if (element) {

      element.style.display =
        "none";

    }

  });

}


function setPageTitle(title) {

  const titleElement =
    document.getElementById(
      "pageTitle"
    );

  if (titleElement) {

    titleElement.textContent =
      title;

  }

}


async function showDashboard() {

  hideAllPages();

  const page =
    document.getElementById(
      "dashboardPage"
    );

  if (page) {

    page.style.display =
      "block";

  }

  setPageTitle(
    "Dashboard"
  );

  await updateDashboard();

}


async function showLeads() {

  hideAllPages();

  const page =
    document.getElementById(
      "leadsPage"
    );

  if (page) {

    page.style.display =
      "block";

  }

  setPageTitle(
    currentProfile &&
    currentProfile.role === "Admin"
      ? "All Leads"
      : "My Leads"
  );

  await loadFilterOptions();

  await loadLeads(1);

}


async function showSales() {

  if (
    !currentProfile ||
    currentProfile.role !==
      "Admin"
  ) {

    alert(
      "Access denied."
    );

    return;

  }

  hideAllPages();

  const page =
    document.getElementById(
      "salesPage"
    );

  if (page) {

    page.style.display =
      "block";

  }

  setPageTitle(
    "Manage Sales"
  );

  await loadSalesUsers();

}


// ================================
// LOAD SALES LOOKUP
// ================================

async function loadSalesLookup() {

  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("sales_users")
        .select(
          "id, name, username, role, status, created_at"
        )
        .order(
          "name",
          {
            ascending: true
          }
        );

    if (error) {

      console.error(
        "Load sales lookup error:",
        error
      );

      return;

    }

    salesUsersData =
      data || [];

    populateSalesDropdowns();

  } catch (error) {

    console.error(
      "loadSalesLookup error:",
      error
    );

  }

}


// ================================
// POPULATE SALES DROPDOWNS
// ================================

function populateSalesDropdowns() {

  const salesFilter =
    document.getElementById(
      "salesFilter"
    );

  if (salesFilter) {

    const currentValue =
      salesFilter.value;

    salesFilter.innerHTML =
      "";

    const allOption =
      document.createElement(
        "option"
      );

    allOption.value =
      "";

    allOption.textContent =
      "All Sales";

    salesFilter.appendChild(
      allOption
    );

    salesUsersData
      .filter(
        sales =>
          sales.role === "Sales" &&
          sales.status !== "Inactive"
      )
      .forEach(
        sales => {

          const option =
            document.createElement(
              "option"
            );

          option.value =
            sales.id;

          option.textContent =
            sales.name ||
            sales.username ||
            "Sales";

          salesFilter.appendChild(
            option
          );

        }
      );

    if (
      salesUsersData.some(
        sales =>
          String(sales.id) ===
          String(currentValue)
      )
    ) {

      salesFilter.value =
        currentValue;

    } else {

      salesFilter.value =
        "";

    }

  }

  const salesDropdownMenu =
    document.getElementById(
      "salesDropdownMenu"
    );

  if (salesDropdownMenu) {

    salesDropdownMenu.innerHTML =
      "";

    const allSalesButton =
      document.createElement(
        "button"
      );

    allSalesButton.type =
      "button";

    allSalesButton.className =
      "nav-dropdown-item";

    allSalesButton.dataset.salesId =
      "";

    allSalesButton.textContent =
      "All Sales";

    allSalesButton.onclick =
      function(event) {

        event.stopPropagation();

        if (
          typeof selectSalesFilter ===
          "function"
        ) {

          selectSalesFilter(
            "",
            "All Sales"
          );

        } else {

          applyTopSalesFilter("");

        }

      };

    salesDropdownMenu.appendChild(
      allSalesButton
    );

    salesUsersData
      .filter(
        sales =>
          sales.role === "Sales" &&
          sales.status !== "Inactive"
      )
      .forEach(
        sales => {

          const salesButton =
            document.createElement(
              "button"
            );

          salesButton.type =
            "button";

          salesButton.className =
            "nav-dropdown-item";

          salesButton.dataset.salesId =
            sales.id;

          salesButton.textContent =
            sales.name ||
            sales.username ||
            "Sales";

          salesButton.onclick =
            function(event) {

              event.stopPropagation();

              if (
                typeof selectSalesFilter ===
                "function"
              ) {

                selectSalesFilter(
                  sales.id,
                  sales.name ||
                    sales.username ||
                    "Sales"
                );

              } else {

                applyTopSalesFilter(
                  sales.id
                );

              }

            };

          salesDropdownMenu.appendChild(
            salesButton
          );

        }
      );

  }

  const leadSalesAssign =
    document.getElementById(
      "leadSalesAssign"
    );

  if (leadSalesAssign) {

    const currentValue =
      leadSalesAssign.value;

    leadSalesAssign.innerHTML =
      "";

    const selectOption =
      document.createElement(
        "option"
      );

    selectOption.value =
      "";

    selectOption.textContent =
      "Select Sales";

    leadSalesAssign.appendChild(
      selectOption
    );

    salesUsersData
      .filter(
        sales =>
          sales.role === "Sales" &&
          sales.status !== "Inactive"
      )
      .forEach(
        sales => {

          const option =
            document.createElement(
              "option"
            );

          option.value =
            sales.id;

          option.textContent =
            sales.name ||
            sales.username ||
            "Sales";

          leadSalesAssign.appendChild(
            option
          );

        }
      );

    if (
      salesUsersData.some(
        sales =>
          String(sales.id) ===
          String(currentValue)
      )
    ) {

      leadSalesAssign.value =
        currentValue;

    }

    setupSalesAssignmentAccess();

  }

}


// ================================
// GET SALES NAME
// ================================

function getSalesName(id) {

  if (!id) {

    return "-";

  }

  const sales =
    salesUsersData.find(
      user =>
        String(user.id) ===
        String(id)
    );

  if (!sales) {

    return "-";

  }

  return (
    sales.name ||
    sales.username ||
    "-"
  );

}


// ================================
// LOAD FILTER OPTIONS
// ================================

async function loadFilterOptions() {

  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("leads")
        .select(
          "business, location"
        );

    if (error) {

      console.error(
        "Load filter options error:",
        error
      );

      return;

    }

    const leads =
      data || [];

    const businesses =
      [
        ...new Set(
          leads
            .map(
              lead =>
                getValue(
                  lead.business
                ).trim()
            )
            .filter(
              value =>
                value !== ""
            )
        )
      ].sort(
        (a, b) =>
          a.localeCompare(
            b
          )
      );

    const locations =
      [
        ...new Set(
          leads
            .map(
              lead =>
                getValue(
                  lead.location
                ).trim()
            )
            .filter(
              value =>
                value !== ""
            )
        )
      ].sort(
        (a, b) =>
          a.localeCompare(
            b
          )
      );

    populateFilter(
      "businessFilter",
      businesses,
      "All Business"
    );

    populateFilter(
      "locationFilter",
      locations,
      "All Location"
    );

    populateSalesDropdowns();

  } catch (error) {

    console.error(
      "loadFilterOptions error:",
      error
    );

  }

}


// ================================
// POPULATE FILTER DROPDOWN
// ================================

function populateFilter(
  id,
  values,
  defaultText
) {

  const select =
    document.getElementById(
      id
    );

  if (!select)
    return;

  const currentValue =
    select.value;

  select.innerHTML = "";

  const defaultOption =
    document.createElement(
      "option"
    );

  defaultOption.value =
    "";

  defaultOption.textContent =
    defaultText;

  select.appendChild(
    defaultOption
  );

  values.forEach(
    value => {

      const option =
        document.createElement(
          "option"
        );

      option.value =
        value;

      option.textContent =
        value;

      select.appendChild(
        option
      );

    }
  );

  if (
    values.includes(
      currentValue
    )
  ) {

    select.value =
      currentValue;

  } else {

    select.value =
      "";

  }

}


// ================================
// LOAD LEADS
// ================================

async function loadLeads(page = 1) {

  try {

    currentPage =
      Math.max(
        1,
        Number(page) || 1
      );

    if (
      !salesUsersData ||
      salesUsersData.length === 0
    ) {

      await loadSalesLookup();

    }

    const search =
      document
        .getElementById(
          "leadSearch"
        )
        ?.value
        .trim() || "";

    const status =
      document
        .getElementById(
          "statusFilter"
        )
        ?.value || "";

    const business =
      document
        .getElementById(
          "businessFilter"
        )
        ?.value || "";

    const location =
      document
        .getElementById(
          "locationFilter"
        )
        ?.value || "";

    const salesFilter =
      document
        .getElementById(
          "salesFilter"
        )
        ?.value || "";

    let query =
      supabaseClient
        .from("leads")
        .select(
          "*",
          {
            count: "exact"
          }
        );

    if (search) {

      const safeSearch =
        search
          .replace(
            /%/g,
            ""
          )
          .replace(
            /,/g,
            " "
          );

      query =
        query.or(
          [
            `customer_name.ilike.%${safeSearch}%`,
            `phone.ilike.%${safeSearch}%`,
            `email.ilike.%${safeSearch}%`,
            `business.ilike.%${safeSearch}%`,
            `location.ilike.%${safeSearch}%`
          ].join(",")
        );

    }

    if (status) {

      query =
        query.eq(
          "status",
          status
        );

    }

    if (business) {

      query =
        query.eq(
          "business",
          business
        );

    }

    if (location) {

      query =
        query.eq(
          "location",
          location
        );

    }

    if (
      salesFilter &&
      currentProfile &&
      currentProfile.role ===
        "Admin"
    ) {

      query =
        query.eq(
          "sales_id",
          salesFilter
        );

    }

    const from =
      (currentPage - 1) *
      pageSize;

    const to =
      from +
      pageSize -
      1;

    query =
      query
        .order(
          "created_at",
          {
            ascending: false
          }
        )
        .range(
          from,
          to
        );

    const {
      data,
      error,
      count
    } =
      await query;

    if (error) {

      console.error(
        "Load leads error:",
        error
      );

      alert(
        error.message
      );

      return;

    }

    leadsData =
      data || [];

    totalLeadsCount =
      count || 0;

    renderLeads(
      leadsData
    );

    updatePagination();

  } catch (error) {

    console.error(
      "loadLeads error:",
      error
    );

  }

}


// ================================
// PAGINATION
// ================================

function updatePagination() {

  const paginationInfo =
    document.getElementById(
      "paginationInfo"
    );

  const pageIndicator =
    document.getElementById(
      "pageIndicator"
    );

  const prevBtn =
    document.getElementById(
      "prevBtn"
    );

  const nextBtn =
    document.getElementById(
      "nextBtn"
    );

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalLeadsCount /
        pageSize
      )
    );

  if (paginationInfo) {

    const start =
      totalLeadsCount === 0
        ? 0
        : (
            (currentPage - 1) *
            pageSize
          ) + 1;

    const end =
      Math.min(
        currentPage *
          pageSize,
        totalLeadsCount
      );

    paginationInfo.textContent =
      `${start}-${end} of ${totalLeadsCount} leads`;

  }

  if (pageIndicator) {

    pageIndicator.textContent =
      `Page ${currentPage} / ${totalPages}`;

  }

  if (prevBtn) {

    prevBtn.disabled =
      currentPage <= 1;

  }

  if (nextBtn) {

    nextBtn.disabled =
      currentPage >= totalPages;

  }

}


function changePage(direction) {

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalLeadsCount /
        pageSize
      )
    );

  const newPage =
    currentPage +
    Number(direction);

  if (
    newPage < 1 ||
    newPage > totalPages
  ) {

    return;

  }

  loadLeads(
    newPage
  );

}


// ================================
// RENDER LEADS
// ================================

function renderLeads(data) {

  const table =
    document.getElementById(
      "leadsTable"
    );

  if (!table) return;

  table.innerHTML =
    "";

  if (
    !data ||
    data.length === 0
  ) {

    table.innerHTML = `
      <tr>
        <td
          colspan="10"
          style="text-align:center;">
          No leads found
        </td>
      </tr>
    `;

    return;

  }

  data.forEach(
    lead => {

      const tr =
        document.createElement(
          "tr"
        );

      const salesName =
        getSalesName(
          lead.sales_id
        );

      const displayStatus =
        normalizeLeadStatus(
          lead.status
        );

      tr.innerHTML = `

        <td>
          ${escapeHTML(
            getValue(
              lead.customer_name
            )
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
                  rel="noopener noreferrer"
                  class="wa-link">
                  ${escapeHTML(
                    lead.phone
                  )}
                </a>
              `
              : "-"
          }
        </td>

        <td>
          ${
            lead.email
              ? `
                <a
                  href="mailto:${escapeHTML(
                    lead.email
                  )}">
                  ${escapeHTML(
                    lead.email
                  )}
                </a>
              `
              : "-"
          }
        </td>

        <td>
          ${escapeHTML(
            getValue(
              lead.business
            )
          )}
        </td>

        <td>
          ${escapeHTML(
            getValue(
              lead.location
            )
          )}
        </td>

        <td>
          ${
            salesName !== "-"
              ? escapeHTML(
                  salesName
                )
              : "-"
          }
        </td>

        <td>
          <span
            class="status-badge ${statusClass(
              displayStatus
            )}">
            ${escapeHTML(
              displayStatus
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

          <div class="crm-lead-actions">

            <button
              type="button"
              class="primary-btn small-btn"
              onclick="crmOpenCustomerProfile('${lead.id}')">
              Profile
            </button>

            <button
              type="button"
              class="secondary-btn small-btn"
              onclick="deleteLead('${lead.id}')">
              Delete
            </button>

          </div>

        </td>

      `;

      table.appendChild(
        tr
      );

    }
  );

}


// ================================
// NORMALIZE STATUS
// ================================

function normalizeLeadStatus(status) {

  if (!status)
    return "New";

  const value =
    String(status)
      .trim()
      .toLowerCase();

  const map = {

    "new":
      "New",

    "belum dihubungi":
      "New",

    "flyer sent":
      "Flyer Sent",

    "tertarik":
      "Interested",

    "interested":
      "Interested",

    "follow up":
      "Follow Up",

    "follow-up":
      "Follow Up",

    "closing":
      "Closing",

    "tidak tertarik":
      "Not Interested",

    "not interested":
      "Not Interested"

  };

  return (
    map[value] ||
    status
  );

}


// ================================
// FILTER LEADS
// ================================

function filterLeads() {

  loadLeads(1);

}


// ================================
// SEARCH INPUT
// ================================

function onSearchInput() {

  loadLeads(1);

}


// ================================
// ADD LEAD MODAL
// ================================

function openLeadModal() {

  console.log(
    "openLeadModal clicked"
  );

  const modal =
    document.getElementById(
      "leadModal"
    );

  if (!modal) {

    alert(
      "Lead modal not found."
    );

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

  modal.classList.add(
    "show"
  );

  modal.style.display =
    "flex";

}


function closeLeadModal() {

  const modal =
    document.getElementById(
      "leadModal"
    );

  if (!modal) return;

  modal.classList.remove(
    "show"
  );

  modal.style.display =
    "none";

}


function clearLeadForm() {

  setValue(
    "leadId",
    ""
  );

  setValue(
    "leadCustomer",
    ""
  );

  setValue(
    "leadPhone",
    ""
  );

  setValue(
    "leadEmail",
    ""
  );

  setValue(
    "leadBusiness",
    ""
  );

  setValue(
    "leadLocation",
    ""
  );

  setValue(
    "leadStatus",
    "New"
  );

  setValue(
    "leadSalesAssign",
    currentProfile &&
    currentProfile.role ===
      "Sales"
      ? currentProfile.id
      : ""
  );

  setValue(
    "leadFollowUp",
    ""
  );

  setValue(
    "leadAppointment",
    ""
  );

  setValue(
    "leadSiteSurvey",
    ""
  );

  setValue(
    "leadQuotation",
    ""
  );

  setValue(
    "leadSPK",
    ""
  );

  setValue(
    "leadClosing",
    ""
  );

  setValue(
    "leadNotes",
    ""
  );

  setupSalesAssignmentAccess();

}


// ================================
// SAVE LEAD
// ================================

async function saveLead() {

  if (!currentProfile) {

    alert(
      "User profile is not ready."
    );

    return;

  }

  const customer =
    document
      .getElementById(
        "leadCustomer"
      )
      .value
      .trim();

  if (!customer) {

    alert(
      "Customer name is required."
    );

    return;

  }

  const leadId =
    document.getElementById(
      "leadId"
    ).value;

  const payload = {

    customer_name:
      document
        .getElementById(
          "leadCustomer"
        )
        .value
        .trim(),

    phone:
      document
        .getElementById(
          "leadPhone"
        )
        .value
        .trim(),

    email:
      document
        .getElementById(
          "leadEmail"
        )
        .value
        .trim(),

    business:
      document
        .getElementById(
          "leadBusiness"
        )
        .value
        .trim(),

    location:
      document
        .getElementById(
          "leadLocation"
        )
        .value
        .trim(),

    status:
      normalizeLeadStatus(
        document.getElementById(
          "leadStatus"
        ).value
      ),

    follow_up_date:
      document.getElementById(
        "leadFollowUp"
      ).value ||
      null,

    appointment:
      document.getElementById(
        "leadAppointment"
      ).value ||
      null,

    site_survey:
      document.getElementById(
        "leadSiteSurvey"
      ).value ||
      null,

    quotation:
      document.getElementById(
        "leadQuotation"
      ).value ||
      null,

    spk:
      document.getElementById(
        "leadSPK"
      ).value ||
      null,

    closing:
      document.getElementById(
        "leadClosing"
      ).value ||
      null,

    notes:
      document
        .getElementById(
          "leadNotes"
        )
        .value
        .trim()

  };

  const selectedSales =
    document.getElementById(
      "leadSalesAssign"
    )?.value || "";

  if (
    currentProfile.role ===
    "Admin"
  ) {

    payload.sales_id =
      selectedSales ||
      null;

  } else {

    payload.sales_id =
      currentProfile.id;

  }

  try {

    if (leadId) {

      payload.updated_by =
        currentProfile.id;

      const {
        error
      } =
        await supabaseClient
          .from("leads")
          .update(
            payload
          )
          .eq(
            "id",
            leadId
          );

      if (error) {

        console.error(
          error
        );

        alert(
          "Failed to update lead:\n" +
          error.message
        );

        return;

      }

      alert(
        "Lead updated successfully."
      );

    } else {

      payload.created_by =
        currentProfile.id;

      payload.updated_by =
        currentProfile.id;

      const {
        error
      } =
        await supabaseClient
          .from("leads")
          .insert([
            payload
          ]);

      if (error) {

        console.error(
          error
        );

        alert(
          "Failed to add lead:\n" +
          error.message
        );

        return;

      }

      alert(
        "Lead added successfully."
      );

    }

    closeLeadModal();

    await loadFilterOptions();

    await loadLeads(
      currentPage
    );

    await updateDashboard();

  } catch (error) {

    console.error(
      "saveLead error:",
      error
    );

    alert(
      "An error occurred:\n" +
      error.message
    );

  }

}


// ============================================================
// EDIT CUSTOMER
// ============================================================

async function editLead(id) {

  console.log(
    "Edit Customer ID:",
    id
  );

  if (!id) {

    alert(
      "Customer ID not found."
    );

    return;

  }

  if (
    typeof window.crmOpenCustomerProfile ===
    "function"
  ) {

    await window.crmOpenCustomerProfile(
      id
    );

    return;

  }

}


// ============================================================
// OPEN CUSTOMER PROFILE
// ============================================================

window.crmOpenCustomerProfile =
  async function (id) {

    console.log(
      "Opening Customer Workspace:",
      id
    );

    if (!id) {

      alert(
        "Customer ID not found."
      );

      return;

    }

    try {

      const {
        data,
        error
      } =
        await supabaseClient
          .from("leads")
          .select("*")
          .eq(
            "id",
            id
          )
          .single();

      if (error) {

        console.error(
          "Customer Profile Error:",
          error
        );

        alert(
          "Failed to load customer:\n" +
          error.message
        );

        return;

      }

      if (!data) {

        alert(
          "Customer not found."
        );

        return;

      }

      window.crmCurrentCustomerId =
        data.id;

      window.crmCurrentCustomer =
        data;

      crmActivePipelineStep =
        crmGetCurrentPipelineKey(
          data
        );

      crmRenderCustomerWorkspace(
        data
      );

      crmShowProfilePage();

      setPageTitle(
        "Customer Profile"
      );

      window.scrollTo(
        {
          top: 0,
          behavior: "smooth"
        }
      );

    } catch (error) {

      console.error(
        "crmOpenCustomerProfile error:",
        error
      );

      alert(
        "An error occurred:\n" +
        error.message
      );

    }

  };


// ============================================================
// SHOW CUSTOMER PROFILE PAGE
// ============================================================

function crmShowProfilePage() {

  const pages = [
    "dashboardPage",
    "leadsPage",
    "salesPage",
    "customerProfilePage",
    "appointmentPage",
    "dailyReportPage",
    "pltsCalculatorPage",
    "pltsSimulatorPage",
    "settingsPage"
  ];

  pages.forEach(
    id => {

      const page =
        document.getElementById(
          id
        );

      if (!page) return;

      page.style.display =
        id ===
        "customerProfilePage"
          ? "block"
          : "none";

    }
  );

}


// ============================================================
// GET CURRENT PIPELINE STEP
// ============================================================

function crmGetCurrentPipelineKey(
  customer
) {

  if (!customer)
    return "new";

  if (
    customer.closing
  ) {

    return "closing";

  }

  if (
    customer.spk
  ) {

    return "spk";

  }

  if (
    customer.quotation
  ) {

    return "quotation";

  }

  if (
    customer.site_survey
  ) {

    return "survey";

  }

  if (
    customer.appointment
  ) {

    return "appointment";

  }

  const status =
    normalizeLeadStatus(
      customer.status
    );

  if (
    status ===
    "Follow Up"
  ) {

    return "followup";

  }

  if (
    status ===
    "Interested"
  ) {

    return "interested";

  }

  if (
    status ===
    "Flyer Sent"
  ) {

    return "flyer";

  }

  return "new";

}


// ============================================================
// PIPELINE COMPLETION
// ============================================================

function crmIsPipelineCompleted(
  customer,
  step
) {

  if (!customer)
    return false;

  const status =
    normalizeLeadStatus(
      customer.status
    );

  if (
    step.key ===
    "new"
  ) {

    return true;

  }

  if (
    step.key ===
    "flyer"
  ) {

    return (
      status === "Flyer Sent" ||
      status === "Interested" ||
      status === "Follow Up" ||
      status === "Closing" ||
      !!customer.appointment ||
      !!customer.site_survey ||
      !!customer.quotation ||
      !!customer.spk ||
      !!customer.closing
    );

  }

  if (
    step.key ===
    "interested"
  ) {

    return (
      status === "Interested" ||
      status === "Follow Up" ||
      status === "Closing" ||
      !!customer.appointment ||
      !!customer.site_survey ||
      !!customer.quotation ||
      !!customer.spk ||
      !!customer.closing
    );

  }

  if (
    step.key ===
    "followup"
  ) {

    return (
      status === "Follow Up" ||
      status === "Closing" ||
      !!customer.follow_up_date ||
      !!customer.appointment ||
      !!customer.site_survey ||
      !!customer.quotation ||
      !!customer.spk ||
      !!customer.closing
    );

  }

  if (
    step.key ===
    "appointment"
  ) {

    return !!customer.appointment;

  }

  if (
    step.key ===
    "survey"
  ) {

    return !!customer.site_survey;

  }

  if (
    step.key ===
    "quotation"
  ) {

    return !!customer.quotation;

  }

  if (
    step.key ===
    "spk"
  ) {

    return !!customer.spk;

  }

  if (
    step.key ===
    "closing"
  ) {

    return (
      normalizeLeadStatus(
        customer.status
      ) === "Closing" ||
      !!customer.closing
    );

  }

  return false;

}


// ============================================================
// PIPELINE PROGRESS
// ============================================================

function crmGetPipelineProgress(
  customer
) {

  const total =
    CUSTOMER_PIPELINE.length;

  const completed =
    CUSTOMER_PIPELINE.filter(
      step =>
        crmIsPipelineCompleted(
          customer,
          step
        )
    ).length;

  return Math.round(
    (
      completed /
      total
    ) *
    100
  );

}


// ============================================================
// RENDER CUSTOMER WORKSPACE
// ============================================================

function crmRenderCustomerWorkspace(
  customer
) {

  const page =
    document.getElementById(
      "customerProfilePage"
    );

  if (!page) {

    console.error(
      "customerProfilePage not found."
    );

    alert(
      "Customer page not found."
    );

    return;

  }

  const customerName =
    getValue(
      customer.customer_name
    ) ||
    "Customer";

  const phone =
    getValue(
      customer.phone
    );

  const email =
    getValue(
      customer.email
    );

  const business =
    getValue(
      customer.business
    );

  const location =
    getValue(
      customer.location
    );

  const status =
    normalizeLeadStatus(
      customer.status
    );

  const salesName =
    getSalesName(
      customer.sales_id
    );

  const progress =
    crmGetPipelineProgress(
      customer
    );

  const initial =
    crmGetInitial(
      customerName
    );

  page.innerHTML = `

    <div class="crm-workspace">

      <div class="crm-workspace-top">

        <button
          type="button"
          class="crm-workspace-back"
          onclick="crmCancelCustomerEdit()">
          <span>←</span>
          Customers
        </button>

        <div class="crm-workspace-top-actions">

          ${
            phone
              ? `
                <button
                  type="button"
                  class="crm-workspace-action crm-action-wa"
                  onclick="crmProfileWhatsApp()">
                  <span>WhatsApp</span>
                </button>
              `
              : ""
          }

          ${
            email
              ? `
                <button
                  type="button"
                  class="crm-workspace-action"
                  onclick="crmProfileEmail()">
                  <span>Email</span>
                </button>
              `
              : ""
          }

          <button
            type="button"
            class="crm-workspace-action crm-action-appointment"
            onclick="crmProfileAppointment()">
            <span>Appointment</span>
          </button>

        </div>

      </div>


      <section class="crm-customer-hero">

        <div class="crm-customer-hero-main">

          <div class="crm-customer-avatar">
            ${escapeHTML(initial)}
          </div>

          <div class="crm-customer-identity">

            <div class="crm-customer-name-line">

              <h1>
                ${escapeHTML(
                  customerName
                )}
              </h1>

              <span class="crm-workspace-status ${statusClass(status)}">
                ${escapeHTML(status)}
              </span>

            </div>

            <div class="crm-customer-meta">

              ${
                business
                  ? `
                    <span>
                      ${escapeHTML(business)}
                    </span>
                  `
                  : ""
              }

              ${
                location
                  ? `
                    <span>
                      ${escapeHTML(location)}
                    </span>
                  `
                  : ""
              }

              ${
                salesName !== "-"
                  ? `
                    <span>
                      Sales: ${escapeHTML(salesName)}
                    </span>
                  `
                  : ""
              }

            </div>

          </div>

        </div>


        <div class="crm-progress-box">

          <div class="crm-progress-label">

            <span>
              Pipeline Progress
            </span>

            <strong>
              ${progress}%
            </strong>

          </div>

          <div class="crm-progress-track">

            <div
              class="crm-progress-value"
              style="width:${progress}%">
            </div>

          </div>

        </div>

      </section>


      <section class="crm-pipeline-card">

        <div class="crm-section-heading">

          <div>

            <span class="crm-section-kicker">
              SALES JOURNEY
            </span>

            <h2>
              Customer Pipeline
            </h2>

            <p>
              Select a stage to update customer progress.
            </p>

          </div>

          <div class="crm-pipeline-current">

            <span>
              Current Stage
            </span>

            <strong>
              ${escapeHTML(
                crmGetPipelineLabel(
                  crmGetCurrentPipelineKey(
                    customer
                  )
                )
              )}
            </strong>

          </div>

        </div>


        <div class="crm-modern-pipeline">

          ${CUSTOMER_PIPELINE
            .map(
              (
                step,
                index
              ) =>
                crmRenderPipelineStep(
                  customer,
                  step,
                  index
                )
            )
            .join("")}

        </div>

      </section>


      <div
        id="crmPipelinePanel"
        class="crm-pipeline-panel">
      </div>


      <div class="crm-workspace-grid">


        <section class="crm-workspace-card">

          <div class="crm-card-heading">

            <div>

              <span class="crm-section-kicker">
                CUSTOMER
              </span>

              <h2>
                Customer Information
              </h2>

            </div>

            <span class="crm-card-number">
              01
            </span>

          </div>


          <div class="crm-form-grid">

            <div class="crm-modern-field crm-field-wide">

              <label>
                Customer Name
              </label>

              <input
                id="crmEditCustomerName"
                type="text"
                value="${escapeHTML(customerName)}"
                placeholder="Customer name"
              >

            </div>


            <div class="crm-modern-field">

              <label>
                Phone / WhatsApp
              </label>

              <input
                id="crmEditPhone"
                type="text"
                value="${escapeHTML(phone)}"
                placeholder="Phone / WhatsApp"
              >

            </div>


            <div class="crm-modern-field">

              <label>
                Email
              </label>

              <input
                id="crmEditEmail"
                type="email"
                value="${escapeHTML(email)}"
                placeholder="Email"
              >

            </div>


            <div class="crm-modern-field">

              <label>
                Business
              </label>

              <input
                id="crmEditBusiness"
                type="text"
                value="${escapeHTML(business)}"
                placeholder="Business"
              >

            </div>


            <div class="crm-modern-field">

              <label>
                Location
              </label>

              <input
                id="crmEditLocation"
                type="text"
                value="${escapeHTML(location)}"
                placeholder="Location"
              >

            </div>


            <div class="crm-modern-field">

              <label>
                Sales
              </label>

              <select
                id="crmEditSales">
              </select>

            </div>

          </div>

        </section>


        <section class="crm-workspace-card">

          <div class="crm-card-heading">

            <div>

              <span class="crm-section-kicker">
                NOTES
              </span>

              <h2>
                Customer Notes
              </h2>

            </div>

            <span class="crm-card-number">
              02
            </span>

          </div>


          <div class="crm-modern-field">

            <label>
              Internal Notes
            </label>

            <textarea
              id="crmEditNotes"
              rows="10"
              placeholder="Write customer notes, requirements, budget, discussion, or next action..."
            >${escapeHTML(
              customer.notes || ""
            )}</textarea>

          </div>

        </section>


      </div>


      <section class="crm-save-bar">

        <div class="crm-save-info">

          <strong>
            Customer Workspace
          </strong>

          <span>
            Changes will be saved to the CRM database.
          </span>

        </div>


        <div class="crm-save-actions">

          <button
            type="button"
            class="crm-cancel-button"
            onclick="crmCancelCustomerEdit()">
            Cancel
          </button>

          <button
            type="button"
            id="crmEditSaveButton"
            class="crm-save-button"
            onclick="crmSaveCustomerEdit()">
            Save Changes
          </button>

        </div>

      </section>

    </div>

  `;

  crmPopulateEditSales(
    customer.sales_id || ""
  );

  crmRenderPipelinePanel(
    customer,
    crmActivePipelineStep
  );

  crmAddWorkspaceStyles();

}


// ============================================================
// RENDER PIPELINE STEP
// ============================================================

function crmRenderPipelineStep(
  customer,
  step,
  index
) {

  const completed =
    crmIsPipelineCompleted(
      customer,
      step
    );

  const active =
    crmActivePipelineStep ===
    step.key;

  const current =
    crmGetCurrentPipelineKey(
      customer
    ) ===
    step.key;

  return `

    <button
      type="button"
      class="
        crm-modern-pipeline-step
        ${completed ? "is-completed" : ""}
        ${active ? "is-active" : ""}
        ${current ? "is-current" : ""}
      "
      onclick="crmSelectPipelineStep('${step.key}')">

      <span class="crm-pipeline-step-number">
        ${
          completed
            ? "✓"
            : index + 1
        }
      </span>

      <span class="crm-pipeline-step-text">
        ${escapeHTML(step.label)}
      </span>

      ${
        current
          ? `
            <span class="crm-pipeline-current-dot">
              Current
            </span>
          `
          : ""
      }

    </button>

    ${
      index <
      CUSTOMER_PIPELINE.length - 1
        ? `
          <span
            class="
              crm-modern-pipeline-line
              ${
                completed
                  ? "is-completed"
                  : ""
              }
            ">
          </span>
        `
        : ""
    }

  `;

}


// ============================================================
// SELECT PIPELINE STEP
// ============================================================

window.crmSelectPipelineStep =
  function (stepKey) {

    const step =
      CUSTOMER_PIPELINE.find(
        item =>
          item.key ===
          stepKey
      );

    if (!step) return;

    crmActivePipelineStep =
      stepKey;

    const customer =
      window.crmCurrentCustomer;

    if (!customer) return;

    crmRenderCustomerWorkspace(
      customer
    );

    window.scrollTo(
      {
        top: 0,
        behavior: "smooth"
      }
    );

  };


// ============================================================
// RENDER PIPELINE PANEL
// ============================================================

function crmRenderPipelinePanel(
  customer,
  stepKey
) {

  const panel =
    document.getElementById(
      "crmPipelinePanel"
    );

  if (!panel) return;

  const step =
    CUSTOMER_PIPELINE.find(
      item =>
        item.key ===
        stepKey
    ) ||
    CUSTOMER_PIPELINE[0];

  const completed =
    crmIsPipelineCompleted(
      customer,
      step
    );

  const dateValue =
    step.field
      ? customer[step.field] || ""
      : "";

  const currentStatus =
    normalizeLeadStatus(
      customer.status
    );

  let body = "";

  if (
    step.key ===
    "new"
  ) {

    body = `

      <div class="crm-stage-info">

        <div class="crm-stage-icon">
          ✦
        </div>

        <div>

          <strong>
            New Customer
          </strong>

          <p>
            Customer has been added to the CRM and is ready for first contact.
          </p>

        </div>

      </div>


      <div class="crm-stage-action-row">

        <span class="crm-stage-status-pill ${statusClass(currentStatus)}">
          ${escapeHTML(currentStatus)}
        </span>

        <button
          type="button"
          class="crm-stage-save-button"
          onclick="crmSavePipelineStage('new')">
          Mark New
        </button>

      </div>

    `;

  }


  else if (
    step.key ===
    "flyer"
  ) {

    body = `

      <div class="crm-stage-info">

        <div class="crm-stage-icon">
          ↗
        </div>

        <div>

          <strong>
            Flyer Sent
          </strong>

          <p>
            Record that the customer has received the initial FSI information or flyer.
          </p>

        </div>

      </div>


      <div class="crm-stage-action-row">

        <span class="crm-stage-status-pill">
          ${
            currentStatus ===
            "Flyer Sent"
              ? "Completed"
              : "Not completed"
          }
        </span>

        <button
          type="button"
          class="crm-stage-save-button"
          onclick="crmSavePipelineStage('flyer')">
          Mark Flyer Sent
        </button>

      </div>

    `;

  }


  else if (
    step.key ===
    "interested"
  ) {

    body = `

      <div class="crm-stage-info">

        <div class="crm-stage-icon">
          ♥
        </div>

        <div>

          <strong>
            Interested
          </strong>

          <p>
            Use this stage when the customer has shown interest in PLTS or requested more information.
          </p>

        </div>

      </div>


      <div class="crm-stage-action-row">

        <span class="crm-stage-status-pill">
          ${
            currentStatus ===
            "Interested"
              ? "Customer Interested"
              : "Not selected"
          }
        </span>

        <button
          type="button"
          class="crm-stage-save-button"
          onclick="crmSavePipelineStage('interested')">
          Mark Interested
        </button>

      </div>

    `;

  }


  else {

    const stageDescription =
      crmGetStageDescription(
        step.key
      );

    body = `

      <div class="crm-stage-info">

        <div class="crm-stage-icon">
          ${crmGetStageIcon(step.key)}
        </div>

        <div>

          <strong>
            ${escapeHTML(step.label)}
          </strong>

          <p>
            ${escapeHTML(stageDescription)}
          </p>

        </div>

      </div>


      <div class="crm-stage-date-area">

        <div class="crm-modern-field">

          <label>
            ${escapeHTML(step.label)} Date
          </label>

          <input
            id="crmPipelineDateInput"
            type="date"
            value="${escapeHTML(dateValue)}"
          >

        </div>


        <div class="crm-stage-complete-box">

          <span class="crm-stage-status-dot ${
            completed
              ? "completed"
              : ""
          }"></span>

          <span>
            ${
              completed
                ? `${escapeHTML(step.label)} completed`
                : `${escapeHTML(step.label)} not completed`
            }
          </span>

        </div>

      </div>


      <div class="crm-stage-action-row">

        <button
          type="button"
          class="crm-stage-save-button"
          onclick="crmSavePipelineStage('${step.key}')">
          ${
            completed
              ? "Update Stage"
              : `Complete ${escapeHTML(step.label)}`
          }
        </button>

      </div>

    `;

  }


  panel.innerHTML = `

    <div class="crm-stage-panel-inner">

      <div class="crm-stage-panel-heading">

        <div>

          <span class="crm-section-kicker">
            ACTIVE STAGE
          </span>

          <h3>
            ${escapeHTML(step.label)}
          </h3>

        </div>

        <span class="crm-stage-panel-number">
          ${CUSTOMER_PIPELINE.findIndex(
            item =>
              item.key ===
              step.key
          ) + 1}
          /${CUSTOMER_PIPELINE.length}
        </span>

      </div>

      ${body}

    </div>

  `;

}


// ============================================================
// SAVE PIPELINE STAGE
// ============================================================

window.crmSavePipelineStage =
  async function (stepKey) {

    if (!currentProfile) {

      alert(
        "User profile is not ready."
      );

      return;

    }

    const customer =
      window.crmCurrentCustomer;

    if (!customer) {

      alert(
        "Customer not selected."
      );

      return;

    }

    const step =
      CUSTOMER_PIPELINE.find(
        item =>
          item.key ===
          stepKey
      );

    if (!step) return;

    const payload = {
      updated_by:
        currentProfile.id
    };


    if (
      step.key ===
      "new"
    ) {

      payload.status =
        "New";

    }


    if (
      step.key ===
      "flyer"
    ) {

      payload.status =
        "Flyer Sent";

    }


    if (
      step.key ===
      "interested"
    ) {

      payload.status =
        "Interested";

    }


    if (
      step.key ===
      "followup"
    ) {

      const date =
        document.getElementById(
          "crmPipelineDateInput"
        )?.value || "";

      payload.status =
        "Follow Up";

      payload.follow_up_date =
        date ||
        null;

    }


    if (
      step.key ===
      "appointment"
    ) {

      const date =
        document.getElementById(
          "crmPipelineDateInput"
        )?.value || "";

      payload.appointment =
        date ||
        null;

    }


    if (
      step.key ===
      "survey"
    ) {

      const date =
        document.getElementById(
          "crmPipelineDateInput"
        )?.value || "";

      payload.site_survey =
        date ||
        null;

    }


    if (
      step.key ===
      "quotation"
    ) {

      const date =
        document.getElementById(
          "crmPipelineDateInput"
        )?.value || "";

      payload.quotation =
        date ||
        null;

    }


    if (
      step.key ===
      "spk"
    ) {

      const date =
        document.getElementById(
          "crmPipelineDateInput"
        )?.value || "";

      payload.spk =
        date ||
        null;

    }


    if (
      step.key ===
      "closing"
    ) {

      const date =
        document.getElementById(
          "crmPipelineDateInput"
        )?.value || "";

      payload.status =
        "Closing";

      payload.closing =
        date ||
        null;

    }


    const button =
      document.querySelector(
        "#crmPipelinePanel .crm-stage-save-button"
      );

    try {

      if (button) {

        button.disabled =
          true;

        button.textContent =
          "Saving...";

      }

      const {
        data,
        error
      } =
        await supabaseClient
          .from("leads")
          .update(
            payload
          )
          .eq(
            "id",
            customer.id
          )
          .select("*")
          .single();

      if (error) {

        console.error(
          "Pipeline save error:",
          error
        );

        alert(
          "Failed to update pipeline:\n" +
          error.message
        );

        return;

      }

      window.crmCurrentCustomer =
        data;

      window.crmCurrentCustomerId =
        data.id;

      crmActivePipelineStep =
        stepKey;

      await loadLeads(
        currentPage
      );

      await loadFilterOptions();

      await updateDashboard();

      crmRenderCustomerWorkspace(
        data
      );

      setPageTitle(
        "Customer Profile"
      );

    } catch (error) {

      console.error(
        "crmSavePipelineStage error:",
        error
      );

      alert(
        "An error occurred:\n" +
        error.message
      );

    } finally {

      if (button) {

        button.disabled =
          false;

      }

    }

  };


// ============================================================
// STAGE DESCRIPTION
// ============================================================

function crmGetStageDescription(
  key
) {

  const descriptions = {

    followup:
      "Set the next follow-up date so the sales team knows when to contact the customer again.",

    appointment:
      "Schedule the customer appointment and keep the planned date visible in the pipeline.",

    survey:
      "Record the site survey date for the PLTS project.",

    quotation:
      "Record the date when the quotation was prepared or delivered.",

    spk:
      "Record the SPK date when the customer moves into the agreement stage.",

    closing:
      "Record the closing date when the customer successfully reaches the closing stage."

  };

  return (
    descriptions[key] ||
    "Update the customer pipeline stage."
  );

}


// ============================================================
// STAGE ICON
// ============================================================

function crmGetStageIcon(
  key
) {

  const icons = {

    followup:
      "☎",

    appointment:
      "▣",

    survey:
      "⌖",

    quotation:
      "▤",

    spk:
      "✓",

    closing:
      "★"

  };

  return (
    icons[key] ||
    "•"
  );

}


// ============================================================
// PIPELINE LABEL
// ============================================================

function crmGetPipelineLabel(
  key
) {

  const step =
    CUSTOMER_PIPELINE.find(
      item =>
        item.key ===
        key
    );

  return step
    ? step.label
    : "New";

}


// ============================================================
// INITIAL
// ============================================================

function crmGetInitial(
  name
) {

  if (!name)
    return "C";

  const words =
    String(name)
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    words.length ===
    1
  ) {

    return words[0]
      .substring(
        0,
        1
      )
      .toUpperCase();

  }

  return (
    words[0].substring(
      0,
      1
    ) +
    words[1].substring(
      0,
      1
    )
  ).toUpperCase();

}


// ============================================================
// SAVE CUSTOMER FULL WORKSPACE
// ============================================================

window.crmSaveCustomerEdit =
  async function () {

    if (!currentProfile) {

      alert(
        "User profile is not ready."
      );

      return;

    }

    const id =
      window.crmCurrentCustomerId;

    if (!id) {

      alert(
        "Customer ID not found."
      );

      return;

    }

    const customerName =
      document.getElementById(
        "crmEditCustomerName"
      )?.value
      .trim() || "";

    if (!customerName) {

      alert(
        "Customer name is required."
      );

      return;

    }

    const payload = {

      customer_name:
        customerName,

      phone:
        document.getElementById(
          "crmEditPhone"
        )?.value
        .trim() || "",

      email:
        document.getElementById(
          "crmEditEmail"
        )?.value
        .trim() || "",

      business:
        document.getElementById(
          "crmEditBusiness"
        )?.value
        .trim() || "",

      location:
        document.getElementById(
          "crmEditLocation"
        )?.value
        .trim() || "",

      notes:
        document.getElementById(
          "crmEditNotes"
        )?.value
        .trim() || "",

      updated_by:
        currentProfile.id

    };

    const selectedSales =
      document.getElementById(
        "crmEditSales"
      )?.value || "";

    if (
      currentProfile.role ===
      "Admin"
    ) {

      payload.sales_id =
        selectedSales ||
        null;

    } else {

      payload.sales_id =
        currentProfile.id;

    }

    const saveButton =
      document.getElementById(
        "crmEditSaveButton"
      );

    try {

      if (saveButton) {

        saveButton.disabled =
          true;

        saveButton.textContent =
          "Saving...";

      }

      const {
        data,
        error
      } =
        await supabaseClient
          .from("leads")
          .update(
            payload
          )
          .eq(
            "id",
            id
          )
          .select("*")
          .single();

      if (error) {

        console.error(
          "Save customer edit error:",
          error
        );

        alert(
          "Failed to update customer:\n" +
          error.message
        );

        return;

      }

      window.crmCurrentCustomerId =
        data.id;

      window.crmCurrentCustomer =
        data;

      await loadFilterOptions();

      await loadLeads(
        currentPage
      );

      await updateDashboard();

      crmRenderCustomerWorkspace(
        data
      );

      crmShowProfilePage();

      setPageTitle(
        "Customer Profile"
      );

      window.scrollTo(
        {
          top: 0,
          behavior: "smooth"
        }
      );

    } catch (error) {

      console.error(
        "crmSaveCustomerEdit error:",
        error
      );

      alert(
        "An error occurred:\n" +
        error.message
      );

    } finally {

      if (saveButton) {

        saveButton.disabled =
          false;

        saveButton.textContent =
          "Save Changes";

      }

    }

  };


// ============================================================
// POPULATE EDIT SALES
// ============================================================

function crmPopulateEditSales(
  selectedSalesId
) {

  const select =
    document.getElementById(
      "crmEditSales"
    );

  if (!select)
    return;

  select.innerHTML =
    "";

  const selectOption =
    document.createElement(
      "option"
    );

  selectOption.value =
    "";

  selectOption.textContent =
    "Select Sales";

  select.appendChild(
    selectOption
  );

  salesUsersData
    .filter(
      sales =>
        sales.role ===
        "Sales" &&
        sales.status !== "Inactive"
    )
    .forEach(
      sales => {

        const option =
          document.createElement(
            "option"
          );

        option.value =
          sales.id;

        option.textContent =
          sales.name ||
          sales.username ||
          "Sales";

        if (
          String(sales.id) ===
          String(selectedSalesId)
        ) {

          option.selected =
            true;

        }

        select.appendChild(
          option
        );

      }
    );

  if (
    currentProfile &&
    currentProfile.role !==
      "Admin"
  ) {

    select.value =
      currentProfile.id;

    select.disabled =
      true;

  } else {

    select.disabled =
      false;

  }

}


// ============================================================
// CANCEL CUSTOMER PAGE
// ============================================================

window.crmCancelCustomerEdit =
  function () {

    window.crmCurrentCustomerId =
      null;

    window.crmCurrentCustomer =
      null;

    crmActivePipelineStep =
      "new";

    if (
      typeof window.crmNavigate ===
      "function"
    ) {

      window.crmNavigate(
        "leads"
      );

    } else {

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
        currentProfile &&
        currentProfile.role === "Admin"
          ? "All Leads"
          : "My Leads"
      );

    }

    window.scrollTo(
      {
        top: 0,
        behavior: "smooth"
      }
    );

    loadLeads(
      currentPage
    );

  };


// ============================================================
// LEGACY PROFILE FUNCTION
// ============================================================

window.crmRenderCustomerProfile =
  function (customer) {

    if (!customer)
      return;

    window.crmCurrentCustomerId =
      customer.id;

    window.crmCurrentCustomer =
      customer;

    crmActivePipelineStep =
      crmGetCurrentPipelineKey(
        customer
      );

    crmRenderCustomerWorkspace(
      customer
    );

    crmShowProfilePage();

    setPageTitle(
      "Customer Profile"
    );

  };


// ============================================================
// PROFILE WHATSAPP
// ============================================================

window.crmProfileWhatsApp =
  function () {

    const customer =
      window.crmCurrentCustomer;

    if (
      !customer ||
      !customer.phone
    ) {

      alert(
        "Customer phone number not available."
      );

      return;

    }

    const link =
      whatsappLink(
        customer.phone
      );

    if (
      link &&
      link !== "#"
    ) {

      window.open(
        link,
        "_blank",
        "noopener,noreferrer"
      );

    }

  };


// ============================================================
// PROFILE EMAIL
// ============================================================

window.crmProfileEmail =
  function () {

    const customer =
      window.crmCurrentCustomer;

    if (
      !customer ||
      !customer.email
    ) {

      alert(
        "Customer email not available."
      );

      return;

    }

    window.location.href =
      "mailto:" +
      customer.email;

  };


// ============================================================
// PROFILE APPOINTMENT
// ============================================================

window.crmProfileAppointment =
  function () {

    const customer =
      window.crmCurrentCustomer;

    if (!customer) {

      alert(
        "Customer not selected."
      );

      return;

    }

    window.crmAppointmentCustomerId =
      customer.id;

    window.crmAppointmentCustomer =
      customer;

    if (
      typeof window.crmNavigate ===
      "function"
    ) {

      window.crmNavigate(
        "appointment"
      );

    } else {

      crmShowSimplePage(
        "appointmentPage"
      );

    }

  };


// ============================================================
// SIMPLE PAGE
// ============================================================

function crmShowSimplePage(
  pageId
) {

  const pages = [
    "dashboardPage",
    "leadsPage",
    "salesPage",
    "customerProfilePage",
    "appointmentPage",
    "dailyReportPage",
    "pltsCalculatorPage",
    "pltsSimulatorPage",
    "settingsPage"
  ];

  pages.forEach(
    function (id) {

      const page =
        document.getElementById(
          id
        );

      if (page) {

        page.style.display =
          id === pageId
            ? "block"
            : "none";

      }

    }
  );

}


// ============================================================
// MODERN CUSTOMER WORKSPACE CSS
// ============================================================

function crmAddWorkspaceStyles() {

  if (
    document.getElementById(
      "crmWorkspaceStyles"
    )
  ) {

    return;

  }

  const style =
    document.createElement(
      "style"
    );

  style.id =
    "crmWorkspaceStyles";

  style.textContent = `

    .crm-workspace {

      width: 100%;

      max-width: 1400px;

      margin: 0 auto;

      padding-bottom: 40px;

      animation:
        crmWorkspaceIn
        .22s
        ease-out;

    }


    @keyframes crmWorkspaceIn {

      from {

        opacity: 0;

        transform:
          translateY(8px);

      }

      to {

        opacity: 1;

        transform:
          translateY(0);

      }

    }


    .crm-workspace-top {

      display:
        flex;

      align-items:
        center;

      justify-content:
        space-between;

      gap:
        14px;

      margin-bottom:
        16px;

    }


    .crm-workspace-back {

      border:
        0;

      background:
        transparent;

      color:
        #475569;

      font:
        inherit;

      font-weight:
        700;

      cursor:
        pointer;

      padding:
        9px 0;

      display:
        inline-flex;

      align-items:
        center;

      gap:
        8px;

    }


    .crm-workspace-back:hover {

      color:
        #0f172a;

    }


    .crm-workspace-top-actions {

      display:
        flex;

      gap:
        8px;

      flex-wrap:
        wrap;

      justify-content:
        flex-end;

    }


    .crm-workspace-action {

      border:
        1px solid
        #dbe2ea;

      background:
        #ffffff;

      color:
        #334155;

      border-radius:
        10px;

      padding:
        9px 13px;

      font-size:
        12px;

      font-weight:
        700;

      cursor:
        pointer;

      transition:
        .18s ease;

    }


    .crm-workspace-action:hover {

      border-color:
        #94a3b8;

      transform:
        translateY(-1px);

    }


    .crm-action-wa {

      color:
        #15803d;

    }


    .crm-action-appointment {

      background:
        #0f172a;

      border-color:
        #0f172a;

      color:
        white;

    }


    .crm-customer-hero {

      display:
        flex;

      align-items:
        center;

      justify-content:
        space-between;

      gap:
        30px;

      padding:
        28px;

      margin-bottom:
        18px;

      border:
        1px solid
        rgba(226,232,240,.9);

      border-radius:
        22px;

      background:
        linear-gradient(
          135deg,
          #ffffff,
          #f8fafc
        );

      box-shadow:
        0 16px 45px
        rgba(15,23,42,.07);

    }


    .crm-customer-hero-main {

      display:
        flex;

      align-items:
        center;

      gap:
        17px;

      min-width:
        0;

    }


    .crm-customer-avatar {

      width:
        68px;

      height:
        68px;

      min-width:
        68px;

      border-radius:
        20px;

      display:
        flex;

      align-items:
        center;

      justify-content:
        center;

      background:
        linear-gradient(
          135deg,
          #0f172a,
          #475569
        );

      color:
        white;

      font-size:
        22px;

      font-weight:
        800;

      box-shadow:
        0 8px 22px
        rgba(15,23,42,.18);

    }


    .crm-customer-identity {

      min-width:
        0;

    }


    .crm-customer-name-line {

      display:
        flex;

      align-items:
        center;

      gap:
        10px;

      flex-wrap:
        wrap;

    }


    .crm-customer-name-line h1 {

      margin:
        0;

      color:
        #0f172a;

      font-size:
        clamp(
          23px,
          3vw,
          32px
        );

      line-height:
        1.1;

      font-weight:
        850;

      letter-spacing:
        -.03em;

    }


    .crm-workspace-status {

      display:
        inline-flex;

      align-items:
        center;

      padding:
        5px 9px;

      border-radius:
        999px;

      font-size:
        10px;

      font-weight:
        800;

      background:
        #f1f5f9;

      color:
        #475569;

    }


    .crm-customer-meta {

      display:
        flex;

      flex-wrap:
        wrap;

      gap:
        8px 18px;

      margin-top:
        8px;

      color:
        #64748b;

      font-size:
        12px;

      font-weight:
        600;

    }


    .crm-progress-box {

      width:
        min(
          310px,
          100%
        );

      min-width:
        220px;

    }


    .crm-progress-label {

      display:
        flex;

      justify-content:
        space-between;

      align-items:
        center;

      margin-bottom:
        8px;

      color:
        #64748b;

      font-size:
        11px;

      font-weight:
        700;

    }


    .crm-progress-label strong {

      color:
        #0f172a;

      font-size:
        18px;

    }


    .crm-progress-track {

      height:
        8px;

      overflow:
        hidden;

      border-radius:
        999px;

      background:
        #e2e8f0;

    }


    .crm-progress-value {

      height:
        100%;

      border-radius:
        inherit;

      background:
        linear-gradient(
          90deg,
          #0f172a,
          #64748b
        );

      transition:
        width
        .35s
        ease;

    }


    .crm-pipeline-card {

      padding:
        24px;

      margin-bottom:
        18px;

      border:
        1px solid
        #e2e8f0;

      border-radius:
        20px;

      background:
        #ffffff;

      box-shadow:
        0 10px 35px
        rgba(15,23,42,.05);

    }


    .crm-section-heading {

      display:
        flex;

      align-items:
        flex-start;

      justify-content:
        space-between;

      gap:
        20px;

      margin-bottom:
        20px;

    }


    .crm-section-kicker {

      display:
        block;

      margin-bottom:
        5px;

      color:
        #94a3b8;

      font-size:
        10px;

      font-weight:
        850;

      letter-spacing:
        .14em;

    }


    .crm-section-heading h2,

    .crm-card-heading h2 {

      margin:
        0;

      color:
        #0f172a;

      font-size:
        18px;

      font-weight:
        800;

      letter-spacing:
        -.015em;

    }


    .crm-section-heading p {

      margin:
        5px 0 0;

      color:
        #64748b;

      font-size:
        12px;

    }


    .crm-pipeline-current {

      text-align:
        right;

      white-space:
        nowrap;

    }


    .crm-pipeline-current span {

      display:
        block;

      color:
        #94a3b8;

      font-size:
        10px;

      font-weight:
        700;

      text-transform:
        uppercase;

      letter-spacing:
        .08em;

    }


    .crm-pipeline-current strong {

      display:
        block;

      margin-top:
        4px;

      color:
        #0f172a;

      font-size:
        13px;

    }


    .crm-modern-pipeline {

      display:
        flex;

      align-items:
        flex-start;

      width:
        100%;

      overflow-x:
        auto;

      padding:
        6px 2px 8px;

      scrollbar-width:
        thin;

    }


    .crm-modern-pipeline-step {

      position:
        relative;

      width:
        88px;

      min-width:
        88px;

      border:
        0;

      background:
        transparent;

      padding:
        0;

      cursor:
        pointer;

      color:
        inherit;

      text-align:
        center;

    }


    .crm-pipeline-step-number {

      display:
        flex;

      align-items:
        center;

      justify-content:
        center;

      width:
        36px;

      height:
        36px;

      margin:
        0 auto 8px;

      border:
        2px solid
        #dbe2ea;

      border-radius:
        50%;

      background:
        #f8fafc;

      color:
        #64748b;

      font-size:
        11px;

      font-weight:
        850;

      transition:
        .18s ease;

    }


    .crm-modern-pipeline-step:hover
    .crm-pipeline-step-number {

      border-color:
        #64748b;

      transform:
        translateY(-2px);

    }


    .crm-modern-pipeline-step.is-completed
    .crm-pipeline-step-number {

      background:
        #0f172a;

      border-color:
        #0f172a;

      color:
        white;

    }


    .crm-modern-pipeline-step.is-active
    .crm-pipeline-step-number {

      box-shadow:
        0 0 0 4px
        rgba(15,23,42,.08);

    }


    .crm-modern-pipeline-step.is-current
    .crm-pipeline-step-text {

      color:
        #0f172a;

      font-weight:
        850;

    }


    .crm-pipeline-step-text {

      display:
        block;

      color:
        #64748b;

      font-size:
        10px;

      line-height:
        1.25;

      font-weight:
        700;

    }


    .crm-pipeline-current-dot {

      display:
        inline-block;

      margin-top:
        5px;

      padding:
        2px 6px;

      border-radius:
        999px;

      background:
        #f1f5f9;

      color:
        #475569;

      font-size:
        8px;

      font-weight:
        800;

    }


    .crm-modern-pipeline-line {

      flex:
        1;

      min-width:
        20px;

      height:
        2px;

      margin-top:
        17px;

      background:
        #e2e8f0;

    }


    .crm-modern-pipeline-line.is-completed {

      background:
        #0f172a;

    }


    .crm-pipeline-panel {

      margin-bottom:
        18px;

      border:
        1px solid
        #dbe2ea;

      border-radius:
        18px;

      background:
        #f8fafc;

      overflow:
        hidden;

    }


    .crm-stage-panel-inner {

      padding:
        22px;

    }


    .crm-stage-panel-heading {

      display:
        flex;

      align-items:
        center;

      justify-content:
        space-between;

      gap:
        20px;

      margin-bottom:
        17px;

    }


    .crm-stage-panel-heading h3 {

      margin:
        0;

      color:
        #0f172a;

      font-size:
        20px;

      font-weight:
        800;

    }


    .crm-stage-panel-number {

      color:
        #94a3b8;

      font-size:
        11px;

      font-weight:
        800;

    }


    .crm-stage-info {

      display:
        flex;

      align-items:
        flex-start;

      gap:
        13px;

      padding:
        15px;

      border:
        1px solid
        #e2e8f0;

      border-radius:
        14px;

      background:
        white;

      margin-bottom:
        15px;

    }


    .crm-stage-icon {

      width:
        38px;

      height:
        38px;

      min-width:
        38px;

      border-radius:
        11px;

      display:
        flex;

      align-items:
        center;

      justify-content:
        center;

      background:
        #0f172a;

      color:
        white;

      font-size:
        16px;

      font-weight:
        800;

    }


    .crm-stage-info strong {

      display:
        block;

      color:
        #0f172a;

      font-size:
        14px;

    }


    .crm-stage-info p {

      margin:
        4px 0 0;

      color:
        #64748b;

      font-size:
        12px;

      line-height:
        1.55;

    }


    .crm-stage-date-area {

      display:
        grid;

      grid-template-columns:
        minmax(
          0,
          1fr
        )
        minmax(
          230px,
          1fr
        );

      gap:
        15px;

      align-items:
        end;

    }


    .crm-stage-complete-box {

      display:
        flex;

      align-items:
        center;

      gap:
        9px;

      min-height:
        45px;

      padding:
        0 13px;

      border:
        1px solid
        #e2e8f0;

      border-radius:
        12px;

      background:
        white;

      color:
        #64748b;

      font-size:
        12px;

      font-weight:
        700;

    }


    .crm-stage-status-dot {

      width:
        10px;

      height:
        10px;

      border-radius:
        50%;

      background:
        #cbd5e1;

    }


    .crm-stage-status-dot.completed {

      background:
        #16a34a;

      box-shadow:
        0 0 0 4px
        rgba(22,163,74,.1);

    }


    .crm-stage-action-row {

      display:
        flex;

      align-items:
        center;

      justify-content:
        space-between;

      gap:
        12px;

      margin-top:
        15px;

    }


    .crm-stage-status-pill {

      display:
        inline-flex;

      align-items:
        center;

      min-height:
        32px;

      padding:
        6px 10px;

      border-radius:
        999px;

      background:
        #f1f5f9;

      color:
        #475569;

      font-size:
        10px;

      font-weight:
        800;

    }


    .crm-stage-save-button {

      border:
        0;

      border-radius:
        10px;

      padding:
        10px 15px;

      background:
        #0f172a;

      color:
        white;

      font-size:
        11px;

      font-weight:
        800;

      cursor:
        pointer;

      transition:
        .18s ease;

    }


    .crm-stage-save-button:hover {

      transform:
        translateY(-1px);

      background:
        #1e293b;

    }


    .crm-stage-save-button:disabled {

      opacity:
        .55;

      cursor:
        wait;

    }


    .crm-workspace-grid {

      display:
        grid;

      grid-template-columns:
        minmax(
          0,
          1.45fr
        )
        minmax(
          300px,
          .8fr
        );

      gap:
        18px;

    }


    .crm-workspace-card {

      padding:
        23px;

      border:
        1px solid
        #e2e8f0;

      border-radius:
        18px;

      background:
        white;

      box-shadow:
        0 8px 28px
        rgba(15,23,42,.045);

    }


    .crm-card-heading {

      display:
        flex;

      align-items:
        flex-start;

      justify-content:
        space-between;

      gap:
        15px;

      margin-bottom:
        18px;

    }


    .crm-card-number {

      color:
        #cbd5e1;

      font-size:
        12px;

      font-weight:
        850;

    }


    .crm-form-grid {

      display:
        grid;

      grid-template-columns:
        repeat(
          2,
          minmax(
            0,
            1fr
          )
        );

      gap:
        15px;

    }


    .crm-field-wide {

      grid-column:
        1 / -1;

    }


    .crm-modern-field {

      display:
        flex;

      flex-direction:
        column;

      gap:
        6px;

    }


    .crm-modern-field label {

      color:
        #475569;

      font-size:
        11px;

      font-weight:
        800;

    }


    .crm-modern-field input,

    .crm-modern-field select,

    .crm-modern-field textarea {

      width:
        100%;

      box-sizing:
        border-box;

      border:
        1px solid
        #dbe2ea;

      border-radius:
        11px;

      background:
        #ffffff;

      color:
        #0f172a;

      padding:
        11px 12px;

      font:
        inherit;

      font-size:
        13px;

      outline:
        none;

      transition:
        border
        .18s
        ease,
        box-shadow
        .18s
        ease;

    }


    .crm-modern-field input:focus,

    .crm-modern-field select:focus,

    .crm-modern-field textarea:focus {

      border-color:
        #64748b;

      box-shadow:
        0 0 0 3px
        rgba(100,116,139,.12);

    }


    .crm-modern-field textarea {

      min-height:
        205px;

      resize:
        vertical;

      line-height:
        1.6;

    }


    .crm-save-bar {

      display:
        flex;

      align-items:
        center;

      justify-content:
        space-between;

      gap:
        18px;

      margin-top:
        18px;

      padding:
        17px 20px;

      border:
        1px solid
        #e2e8f0;

      border-radius:
        16px;

      background:
        #ffffff;

      box-shadow:
        0 8px 28px
        rgba(15,23,42,.045);

    }


    .crm-save-info {

      min-width:
        0;

    }


    .crm-save-info strong {

      display:
        block;

      color:
        #0f172a;

      font-size:
        13px;

    }


    .crm-save-info span {

      display:
        block;

      margin-top:
        3px;

      color:
        #94a3b8;

      font-size:
        11px;

    }


    .crm-save-actions {

      display:
        flex;

      align-items:
        center;

      gap:
        8px;

    }


    .crm-cancel-button {

      border:
        1px solid
        #dbe2ea;

      border-radius:
        10px;

      padding:
        10px 15px;

      background:
        white;

      color:
        #475569;

      font-size:
        11px;

      font-weight:
        800;

      cursor:
        pointer;

    }


    .crm-save-button {

      border:
        0;

      border-radius:
        10px;

      padding:
        10px 18px;

      background:
        #0f172a;

      color:
        white;

      font-size:
        11px;

      font-weight:
        800;

      cursor:
        pointer;

      transition:
        .18s ease;

    }


    .crm-save-button:hover {

      background:
        #1e293b;

      transform:
        translateY(-1px);

    }


    .crm-save-button:disabled {

      opacity:
        .55;

      cursor:
        wait;

    }


    .crm-lead-actions {

      display:
        flex;

      align-items:
        center;

      justify-content:
        center;

      gap:
        6px;

      flex-wrap:
        wrap;

    }


    .crm-lead-actions .small-btn {

      margin:
        0;

      white-space:
        nowrap;

    }


    @media (max-width: 950px) {

      .crm-customer-hero {

        align-items:
          flex-start;

        flex-direction:
          column;

      }


      .crm-progress-box {

        width:
          100%;

      }


      .crm-workspace-grid {

        grid-template-columns:
          1fr;

      }

    }


    @media (max-width: 700px) {

      .crm-workspace-top {

        align-items:
          flex-start;

        flex-direction:
          column;

      }


      .crm-workspace-top-actions {

        width:
          100%;

        justify-content:
          flex-start;

      }


      .crm-customer-hero {

        padding:
          20px;

      }


      .crm-pipeline-card {

        padding:
          18px;

      }


      .crm-section-heading {

        flex-direction:
          column;

      }


      .crm-pipeline-current {

        text-align:
          left;

      }


      .crm-stage-date-area {

        grid-template-columns:
          1fr;

      }


      .crm-form-grid {

        grid-template-columns:
          1fr;

      }


      .crm-field-wide {

        grid-column:
          auto;

      }


      .crm-save-bar {

        align-items:
          stretch;

        flex-direction:
          column;

      }


      .crm-save-actions {

        width:
          100%;

      }


      .crm-save-actions button {

        flex:
          1;

      }

    }


    @media (max-width: 480px) {

      .crm-customer-hero-main {

        align-items:
          flex-start;

      }


      .crm-customer-avatar {

        width:
          55px;

        height:
          55px;

        min-width:
          55px;

        border-radius:
          16px;

      }


      .crm-customer-name-line h1 {

        font-size:
          23px;

      }


      .crm-workspace-card {

        padding:
          18px;

      }


      .crm-stage-panel-inner {

        padding:
          17px;

      }


      .crm-stage-action-row {

        align-items:
          stretch;

        flex-direction:
          column;

      }


      .crm-stage-save-button {

        width:
          100%;

      }

    }

  `;

  document.head.appendChild(
    style
  );

}


// ============================================================
// DELETE LEAD
// ============================================================

async function deleteLead(id) {

  const confirmDelete =
    confirm(
      "Delete this lead?"
    );

  if (!confirmDelete)
    return;

  try {

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
        error
      );

      alert(
        "Failed to delete lead:\n" +
        error.message
      );

      return;

    }

    if (
      String(
        window.crmCurrentCustomerId
      ) ===
      String(id)
    ) {

      window.crmCurrentCustomerId =
        null;

      window.crmCurrentCustomer =
        null;

    }

    await loadFilterOptions();

    await loadLeads(
      currentPage
    );

    await updateDashboard();

  } catch (error) {

    console.error(
      error
    );

    alert(
      error.message
    );

  }

}


// ================================
// DASHBOARD
// ================================

async function updateDashboard() {

  if (!currentProfile)
    return;

  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("leads")
        .select(
          "status, appointment, site_survey, quotation, closing"
        );

    if (error) {

      console.error(
        error
      );

      return;

    }

    const dataList =
      data || [];

    setText(
      "statTotal",
      dataList.length
    );

    setText(
      "statNew",
      countNormalizedStatus(
        dataList,
        "New"
      )
    );

    setText(
      "statInterested",
      countNormalizedStatus(
        dataList,
        "Interested"
      )
    );

    setText(
      "statFollowUp",
      countNormalizedStatus(
        dataList,
        "Follow Up"
      )
    );

    setText(
      "statAppointment",
      countDateField(
        dataList,
        "appointment"
      )
    );

    setText(
      "statSiteSurvey",
      countDateField(
        dataList,
        "site_survey"
      )
    );

    setText(
      "statQuotation",
      countDateField(
        dataList,
        "quotation"
      )
    );

    setText(
      "statClosing",
      countClosing(
        dataList
      )
    );

  } catch (error) {

    console.error(
      error
    );

  }

}


// ================================
// COUNT NORMALIZED STATUS
// ================================

function countNormalizedStatus(
  data,
  status
) {

  return data.filter(
    item =>
      normalizeLeadStatus(
        item.status
      ) === status
  ).length;

}


// ================================
// COUNT DATE FIELD
// ================================

function countDateField(
  data,
  field
) {

  return data.filter(
    item =>
      item[field] !== null &&
      item[field] !== undefined &&
      item[field] !== ""
  ).length;

}


// ================================
// COUNT CLOSING
// ================================

function countClosing(
  data
) {

  return data.filter(
    item =>
      normalizeLeadStatus(
        item.status
      ) === "Closing" ||
      (
        item.closing !== null &&
        item.closing !== undefined &&
        item.closing !== ""
      )
  ).length;

}


// ================================
// OLD HELPER COMPATIBILITY
// ================================

function countStatus(
  data,
  status
) {

  return data.filter(
    item =>
      normalizeLeadStatus(
        item.status
      ) ===
      normalizeLeadStatus(
        status
      )
  ).length;

}


// ================================
// MANAGE SALES
// ================================

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
          "created_at",
          {
            ascending: true
          }
        );

    if (error) {

      console.error(
        error
      );

      alert(
        error.message
      );

      return;

    }

    salesUsersData =
      data || [];

    salesUsersData.sort(
      (a, b) =>
        String(
          a.name ||
          a.username ||
          ""
        ).localeCompare(
          String(
            b.name ||
            b.username ||
            ""
          ),
          undefined,
          {
            sensitivity:
              "base"
          }
        )
    );

    renderSalesUsers(
      salesUsersData
    );

    populateSalesDropdowns();

  } catch (error) {

    console.error(
      error
    );

  }

}


// ================================
// RENDER SALES
// ================================

function renderSalesUsers(
  data
) {

  const table =
    document.getElementById(
      "salesTable"
    );

  if (!table)
    return;

  table.innerHTML =
    "";

  if (
    !data ||
    data.length === 0
  ) {

    table.innerHTML = `
      <tr>
        <td
          colspan="6"
          style="text-align:center;">
          No sales found
        </td>
      </tr>
    `;

    return;

  }

  data.forEach(
    sales => {

      const tr =
        document.createElement(
          "tr"
        );

      tr.innerHTML = `

        <td>
          ${escapeHTML(
            getValue(
              sales.name
            )
          )}
        </td>

        <td>
          ${escapeHTML(
            getValue(
              sales.username
            )
          )}
        </td>

        <td>
          ${escapeHTML(
            getValue(
              sales.role
            )
          )}
        </td>

        <td>

          <span
            class="status-badge ${
              sales.status ===
              "Active"
                ? "status-active"
                : "status-inactive"
            }">

            ${escapeHTML(
              getValue(
                sales.status
              )
            )}

          </span>

        </td>

        <td>
          ${
            sales.created_at
              ? formatDateTime(
                  sales.created_at
                )
              : "-"
          }
        </td>

        <td>

          <button
            class="secondary-btn small-btn"
            onclick="toggleSalesStatus(
              '${sales.id}',
              '${sales.status}'
            )">

            ${
              sales.status ===
              "Active"
                ? "Deactivate"
                : "Activate"
            }

          </button>

        </td>

      `;

      table.appendChild(
        tr
      );

    }
  );

}


// ================================
// SALES MODAL
// ================================

function openSalesModal() {

  const modal =
    document.getElementById(
      "salesModal"
    );

  if (!modal) {

    alert(
      "Sales modal not found."
    );

    return;

  }

  clearSalesForm();

  modal.classList.add(
    "show"
  );

  modal.style.display =
    "flex";

}


function closeSalesModal() {

  const modal =
    document.getElementById(
      "salesModal"
    );

  if (!modal)
    return;

  modal.classList.remove(
    "show"
  );

  modal.style.display =
    "none";

}


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


// ================================
// CREATE SALES
// ================================

async function createSales() {

  const name =
    document
      .getElementById(
        "salesName"
      )
      .value
      .trim();

  const username =
    document
      .getElementById(
        "salesUsername"
      )
      .value
      .trim();

  const password =
    document
      .getElementById(
        "salesPassword"
      )
      .value;

  if (
    !name ||
    !username ||
    !password
  ) {

    alert(
      "Name, username and password are required."
    );

    return;

  }

  if (
    password.length < 6
  ) {

    alert(
      "Password must be at least 6 characters."
    );

    return;

  }

  if (
    !currentProfile ||
    currentProfile.role !==
      "Admin"
  ) {

    alert(
      "Only Admin can create Sales accounts."
    );

    return;

  }

  const confirmCreate =
    confirm(
      `Create Sales account "${name}" with username "${username}"?`
    );

  if (!confirmCreate)
    return;

  const createButton =
    document.querySelector(
      "#salesModal .primary-btn"
    );

  try {

    if (createButton) {

      createButton.disabled =
        true;

      createButton.textContent =
        "CREATING...";

    }

    const {
      data,
      error
    } =
      await supabaseClient.functions.invoke(
        "create-sales",
        {
          body: {
            name:
              name,
            username:
              username,
            password:
              password
          }
        }
      );

    if (error) {

      console.error(
        "Create Sales Function Error:",
        error
      );

      alert(
        "Failed to create Sales:\n\n" +
        error.message
      );

      return;

    }

    if (
      data &&
      data.error
    ) {

      console.error(
        "Create Sales Server Error:",
        data
      );

      alert(
        data.error +
        (
          data.detail
            ? "\n\n" +
              data.detail
            : ""
        )
      );

      return;

    }

    alert(
      "Sales created successfully!\n\n" +
      "Name: " +
      name +
      "\n" +
      "Username: " +
      username
    );

    clearSalesForm();

    closeSalesModal();

    await loadSalesUsers();

    await loadSalesLookup();

    await loadLeads(
      currentPage
    );

  } catch (error) {

    console.error(
      "createSales error:",
      error
    );

    alert(
      "An error occurred while creating Sales:\n\n" +
      error.message
    );

  } finally {

    if (createButton) {

      createButton.disabled =
        false;

      createButton.textContent =
        "CREATE SALES";

    }

  }

}


// ================================
// TOGGLE SALES STATUS
// ================================

async function toggleSalesStatus(
  id,
  currentStatus
) {

  const newStatus =
    currentStatus ===
    "Active"
      ? "Inactive"
      : "Active";

  const confirmChange =
    confirm(
      `Change Sales status to ${newStatus}?`
    );

  if (!confirmChange)
    return;

  try {

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
        error
      );

      alert(
        error.message
      );

      return;

    }

    await loadSalesUsers();

    await loadSalesLookup();

    await loadLeads(
      currentPage
    );

  } catch (error) {

    console.error(
      error
    );

    alert(
      error.message
    );

  }

}


// ================================
// WHATSAPP
// ================================

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

  return `https://wa.me/${number}`;

}


function normalizePhone(
  phone
) {

  if (!phone)
    return "";

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
      number.substring(
        1
      );

  }

  if (
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


// ============================================================
// MODAL EVENTS
// ============================================================

function setupModalEvents() {

  const leadModal =
    document.getElementById(
      "leadModal"
    );

  const salesModal =
    document.getElementById(
      "salesModal"
    );

  if (leadModal) {

    leadModal.addEventListener(
      "click",
      function(event) {

        if (
          event.target ===
          leadModal
        ) {

          closeLeadModal();

        }

      }
    );

  }

  if (salesModal) {

    salesModal.addEventListener(
      "click",
      function(event) {

        if (
          event.target ===
          salesModal
        ) {

          closeSalesModal();

        }

      }
    );

  }

}


// ================================
// LOGOUT
// ================================

async function logout() {

  try {

    await supabaseClient.auth.signOut();

  } catch (error) {

    console.error(
      error
    );

  }

  currentUser =
    null;

  currentProfile =
    null;

  leadsData =
    [];

  salesUsersData =
    [];

  currentPage =
    1;

  totalLeadsCount =
    0;

  window.crmCurrentCustomerId =
    null;

  window.crmCurrentCustomer =
    null;

  crmActivePipelineStep =
    "new";

  showLogin();

}


// ================================
// HELPER FUNCTIONS
// ================================

function formatDate(
  date
) {

  if (!date)
    return "-";

  try {

    const d =
      new Date(
        date +
        "T00:00:00"
      );

    if (
      isNaN(
        d.getTime()
      )
    ) {

      return date;

    }

    return d.toLocaleDateString(
      "en-US",
      {
        day:
          "2-digit",
        month:
          "2-digit",
        year:
          "numeric"
      }
    );

  } catch {

    return date;

  }

}


function formatDateTime(
  date
) {

  if (!date)
    return "-";

  try {

    const d =
      new Date(
        date
      );

    if (
      isNaN(
        d.getTime()
      )
    ) {

      return date;

    }

    return d.toLocaleDateString(
      "en-US",
      {
        day:
          "2-digit",
        month:
          "2-digit",
        year:
          "numeric"
      }
    );

  } catch {

    return date;

  }

}


function statusClass(
  status
) {

  if (!status)
    return "";

  return (
    "status-" +
    String(status)
      .toLowerCase()
      .replace(
        /\s+/g,
        "-"
      )
  );

}


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


function getValue(
  value
) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return "";

  }

  return String(value);

}


function setValue(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );

  if (!element)
    return;

  element.value =
    value === null ||
    value === undefined
      ? ""
      : value;

}


function setText(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );

  if (!element)
    return;

  element.textContent =
    value;

}


// ================================
// TOP NAV SALES FILTER
// ================================

function applyTopSalesFilter(
  salesId
) {

  const salesFilter =
    document.getElementById(
      "salesFilter"
    );

  if (salesFilter) {

    salesFilter.value =
      salesId || "";

  }

  showLeads();

}


// ================================
// UPDATE TOP NAV SALES BUTTON
// ================================

function updateSalesDropdownButton(
  salesName
) {

  const button =
    document.getElementById(
      "salesDropdownBtn"
    );

  if (!button)
    return;

  const text =
    button.querySelector(
      "span"
    );

  if (text) {

    text.textContent =
      salesName || "Sales";

  }

}


// ================================
// SUPABASE AUTH STATE
// ================================

supabaseClient.auth.onAuthStateChange(
  async (
    event,
    session
  ) => {

    console.log(
      "Auth event:",
      event
    );

    if (
      session &&
      !currentProfile
    ) {

      currentUser =
        session.user;

      setTimeout(
        async () => {

          await loadProfile();

        },
        100
      );

    }

    if (!session) {

      currentUser =
        null;

      currentProfile =
        null;

      window.crmCurrentCustomerId =
        null;

      window.crmCurrentCustomer =
        null;

      showLogin();

    }

  }
);


// ============================================================
// GLOBAL COMPATIBILITY
// ============================================================

window.openCustomerProfile =
  window.crmOpenCustomerProfile;

window.crmProfileEdit =
  function () {

    const id =
      window.crmCurrentCustomerId;

    if (id) {

      window.crmOpenCustomerProfile(
        id
      );

    }

  };

window.crmProfileWhatsApp =
  window.crmProfileWhatsApp;

window.crmProfileEmail =
  window.crmProfileEmail;

window.crmProfileAppointment =
  window.crmProfileAppointment;

window.crmSaveCustomerEdit =
  window.crmSaveCustomerEdit;

window.crmCancelCustomerEdit =
  window.crmCancelCustomerEdit;
