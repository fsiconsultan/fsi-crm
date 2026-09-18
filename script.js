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

// PAGINATION
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
              alt="${escapeHTML(currentProfile.name)}"
              class="user-avatar"
            >
          `
          : ""
      }

      <strong>
        ${escapeHTML(
          currentProfile.name
        )}
      </strong>

      <small>
        ${escapeHTML(
          currentProfile.role
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


  if (!currentProfile) return;


  const isAdmin =
    currentProfile.role ===
    "Admin";


  // DESKTOP MANAGE SALES
  if (manageSalesBtn) {

    manageSalesBtn.style.display =
      isAdmin
        ? "block"
        : "none";

  }


  // MOBILE MANAGE SALES
  if (mobileManageSalesBtn) {

    mobileManageSalesBtn.style.display =
      isAdmin
        ? "block"
        : "none";

  }


  // SALES FILTER
  if (salesFilter) {

    salesFilter.style.display =
      isAdmin
        ? ""
        : "none";

  }


  // SALES ASSIGNMENT FIELD
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
    "salesPage"
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


  // Admin sees all leads.
  // Sales sees their own leads.
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


    console.log(
      "Sales lookup loaded:",
      salesUsersData
    );


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

  // ================================
  // ADMIN SALES FILTER
  // ================================

  const salesFilter =
    document.getElementById(
      "salesFilter"
    );


  if (salesFilter) {

    const currentValue =
      salesFilter.value;


    salesFilter.innerHTML = "";


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


    salesUsersData.forEach(
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


  // ================================
  // LEAD ASSIGNMENT
  // ================================

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


    salesUsersData.forEach(
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


    // Keep Sales dropdown populated
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
// PAGINATION
// 20 LEADS PER PAGE
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


    // ================================
    // GET FILTER VALUES
    // ================================

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


    // ADMIN SALES FILTER
    const salesFilter =
      document
        .getElementById(
          "salesFilter"
        )
        ?.value || "";


    // ================================
    // SUPABASE QUERY
    // ================================

    let query =
      supabaseClient
        .from("leads")
        .select(
          "*",
          {
            count: "exact"
          }
        );


    // ================================
    // SEARCH
    // Customer / Phone / Email /
    // Business / Location
    // ================================

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


    // ================================
    // STATUS FILTER
    // ================================

    if (status) {

      query =
        query.eq(
          "status",
          status
        );

    }


    // ================================
    // BUSINESS FILTER
    // ================================

    if (business) {

      query =
        query.eq(
          "business",
          business
        );

    }


    // ================================
    // LOCATION FILTER
    // ================================

    if (location) {

      query =
        query.eq(
          "location",
          location
        );

    }


    // ================================
    // SALES FILTER
    // ADMIN ONLY
    // ================================

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


    // ================================
    // PAGINATION
    // ================================

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

        <!-- CUSTOMER -->
        <td>
          ${escapeHTML(
            getValue(
              lead.customer_name
            )
          )}
        </td>

        <!-- PHONE / WHATSAPP -->
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

        <!-- EMAIL -->
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

        <!-- BUSINESS -->
        <td>
          ${escapeHTML(
            getValue(
              lead.business
            )
          )}
        </td>

        <!-- LOCATION -->
        <td>
          ${escapeHTML(
            getValue(
              lead.location
            )
          )}
        </td>

        <!-- SALES -->
        <td>
          ${
            salesName !== "-"
              ? escapeHTML(
                  salesName
                )
              : "-"
          }
        </td>

        <!-- STATUS -->
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

        <!-- FOLLOW UP -->
        <td>
          ${formatDate(
            lead.follow_up_date
          )}
        </td>

        <!-- NEXT STEP -->
        <td>
          ${formatDate(
            lead.appointment
          )}
        </td>

        <!-- ACTION -->
        <td>

          <button
            class="secondary-btn small-btn"
            onclick="editLead('${lead.id}')">
            Edit
          </button>

          <button
            class="secondary-btn small-btn"
            onclick="deleteLead('${lead.id}')">
            Delete
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
// NORMALIZE OLD STATUS VALUES
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
      document.getElementById(
        "leadNotes"
      ).value
      .trim()

  };


  // ================================
  // SALES ASSIGNMENT
  // ================================

  const selectedSales =
    document.getElementById(
      "leadSalesAssign"
    )?.value || "";


  if (
    currentProfile.role ===
    "Admin"
  ) {

    // Admin can assign or
    // remove Sales assignment.
    payload.sales_id =
      selectedSales ||
      null;

  } else {

    // Sales can only assign
    // leads to themselves.
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

    }

    else {

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


// ================================
// EDIT LEAD
// ================================

async function editLead(id) {

  console.log(
    "Edit Lead ID:",
    id
  );


  let lead =
    leadsData.find(
      item =>
        String(item.id) ===
        String(id)
    );


  if (!lead) {

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
        .maybeSingle();


    if (error) {

      console.error(
        "Get lead for edit error:",
        error
      );

      alert(
        "Failed to get lead:\n" +
        error.message
      );

      return;

    }


    if (!data) {

      alert(
        "Lead not found."
      );

      return;

    }


    lead =
      data;

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
    "leadEmail",
    lead.email
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
    normalizeLeadStatus(
      lead.status
    )
  );


  // RESTORE ASSIGNED SALES
  setValue(
    "leadSalesAssign",
    lead.sales_id || ""
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


  setupSalesAssignmentAccess();


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


  if (!modal) {

    alert(
      "Lead modal not found."
    );

    return;

  }


  modal.classList.add(
    "show"
  );

  modal.style.display =
    "flex";

}


// ================================
// DELETE LEAD
// ================================

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


    // TOTAL
    setText(
      "statTotal",
      dataList.length
    );


    // NEW
    setText(
      "statNew",
      countNormalizedStatus(
        dataList,
        "New"
      )
    );


    // INTERESTED
    setText(
      "statInterested",
      countNormalizedStatus(
        dataList,
        "Interested"
      )
    );


    // FOLLOW UP
    setText(
      "statFollowUp",
      countNormalizedStatus(
        dataList,
        "Follow Up"
      )
    );


    // APPOINTMENT
    setText(
      "statAppointment",
      countDateField(
        dataList,
        "appointment"
      )
    );


    // SITE SURVEY
    setText(
      "statSiteSurvey",
      countDateField(
        dataList,
        "site_survey"
      )
    );


    // QUOTATION
    setText(
      "statQuotation",
      countDateField(
        dataList,
        "quotation"
      )
    );


    // CLOSING
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


    console.log(
      "Calling Edge Function create-sales..."
    );


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


    console.log(
      "Create Sales response:",
      data,
      error
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


// ================================
// MODAL EVENTS
// ================================

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

      showLogin();

    }

  }
);
