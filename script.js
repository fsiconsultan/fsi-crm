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
          sales.role === "Sales"
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

        }

      };


    salesDropdownMenu.appendChild(
      allSalesButton
    );


    salesUsersData
      .filter(
        sales =>
          sales.role === "Sales"
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
          sales.role === "Sales"
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


// ============================================================
// EDIT CUSTOMER
// ============================================================
// Tetap dipertahankan untuk kompatibilitas.
// Customer dari Database menggunakan Profile.
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


  /*
   * Profile adalah halaman edit customer.
   * Jadi editLead diarahkan ke fungsi Profile yang sama.
   */

  if (
    typeof window.crmOpenCustomerProfile ===
    "function"
  ) {

    await window.crmOpenCustomerProfile(
      id
    );

    return;

  }


  /*
   * Fallback jika fungsi Profile belum tersedia.
   */

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
        "Get customer for edit error:",
        error
      );

      alert(
        "Failed to get customer:\n" +
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


    lead =
      data;

  }


  window.crmCurrentCustomerId =
    lead.id;

  window.crmCurrentCustomer =
    lead;


  crmRenderCustomerEditPage(
    lead
  );


  crmShowProfilePageFallback();


  window.scrollTo(
    {
      top: 0,
      behavior: "smooth"
    }
  );

}


// ============================================================
// SAVE CUSTOMER FROM FULL PAGE EDIT
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

      status:
        normalizeLeadStatus(
          document.getElementById(
            "crmEditStatus"
          )?.value || "New"
        ),

      follow_up_date:
        document.getElementById(
          "crmEditFollowUp"
        )?.value ||
        null,

      appointment:
        document.getElementById(
          "crmEditAppointment"
        )?.value ||
        null,

      site_survey:
        document.getElementById(
          "crmEditSiteSurvey"
        )?.value ||
        null,

      quotation:
        document.getElementById(
          "crmEditQuotation"
        )?.value ||
        null,

      spk:
        document.getElementById(
          "crmEditSPK"
        )?.value ||
        null,

      closing:
        document.getElementById(
          "crmEditClosing"
        )?.value ||
        null,

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


      alert(
        "Customer updated successfully."
      );


      await loadFilterOptions();

      await loadLeads(
        currentPage
      );

      await updateDashboard();


      // ==================================================
      // RENDER DATA CUSTOMER TERBARU
      // ==================================================

      crmRenderCustomerEditPage(
        data
      );


      // ==================================================
      // TETAP DI CUSTOMER PROFILE
      // GUNAKAN NAVIGASI CRM YANG SAMA
      // ==================================================

      if (
        typeof window.crmNavigate ===
        "function"
      ) {

        window.crmNavigate(
          "customerProfile"
        );

      } else {

        crmShowProfilePageFallback();

      }


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
          "SAVE CHANGES";

      }

    }

  };


// ============================================================
// RENDER FULL PAGE CUSTOMER EDIT
// ============================================================

function crmRenderCustomerEditPage(
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
    );


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


  const salesId =
    customer.sales_id ||
    "";


  page.innerHTML = `

    <div class="crm-full-edit-page">

      <div class="crm-edit-toolbar">

        <button
          type="button"
          class="crm-back-btn"
          onclick="crmCancelCustomerEdit()">
          ← Back to Customers
        </button>


        <div class="crm-edit-toolbar-title">

          <span class="eyebrow">
            CUSTOMER PROFILE
          </span>

          <h2>
            ${escapeHTML(
              customerName ||
              "Customer"
            )}
          </h2>

          <p>
            View and update customer information and sales progress.
          </p>

        </div>

      </div>


      <!-- =========================
           BASIC INFORMATION
      ========================== -->

      <div class="panel crm-edit-card">

        <div class="panel-header">

          <div>

            <div class="eyebrow">
              CUSTOMER INFORMATION
            </div>

            <h3 class="panel-title">
              Basic Information
            </h3>

          </div>

        </div>


        <div class="crm-edit-grid">


          <div class="crm-edit-field">

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


          <div class="crm-edit-field">

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


          <div class="crm-edit-field">

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


          <div class="crm-edit-field">

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


          <div class="crm-edit-field">

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


          <div class="crm-edit-field">

            <label>
              Status
            </label>

            <select
              id="crmEditStatus">
            </select>

          </div>


          <div class="crm-edit-field">

            <label>
              Sales
            </label>

            <select
              id="crmEditSales">
            </select>

          </div>


        </div>

      </div>


      <!-- =========================
           SALES PIPELINE
      ========================== -->

      <div class="panel crm-edit-card">

        <div class="panel-header">

          <div>

            <div class="eyebrow">
              SALES PIPELINE
            </div>

            <h3 class="panel-title">
              Customer Progress
            </h3>

          </div>

        </div>


        <div class="crm-edit-grid">


          <div class="crm-edit-field">

            <label>
              Follow Up
            </label>

            <input
              id="crmEditFollowUp"
              type="date"
              value="${escapeHTML(
                customer.follow_up_date || ""
              )}"
            >

          </div>


          <div class="crm-edit-field">

            <label>
              Appointment
            </label>

            <input
              id="crmEditAppointment"
              type="date"
              value="${escapeHTML(
                customer.appointment || ""
              )}"
            >

          </div>


          <div class="crm-edit-field">

            <label>
              Site Survey
            </label>

            <input
              id="crmEditSiteSurvey"
              type="date"
              value="${escapeHTML(
                customer.site_survey || ""
              )}"
            >

          </div>


          <div class="crm-edit-field">

            <label>
              Quotation
            </label>

            <input
              id="crmEditQuotation"
              type="date"
              value="${escapeHTML(
                customer.quotation || ""
              )}"
            >

          </div>


          <div class="crm-edit-field">

            <label>
              SPK
            </label>

            <input
              id="crmEditSPK"
              type="date"
              value="${escapeHTML(
                customer.spk || ""
              )}"
            >

          </div>


          <div class="crm-edit-field">

            <label>
              Closing
            </label>

            <input
              id="crmEditClosing"
              type="date"
              value="${escapeHTML(
                customer.closing || ""
              )}"
            >

          </div>


        </div>

      </div>


      <!-- =========================
           NOTES
      ========================== -->

      <div class="panel crm-edit-card">

        <div class="panel-header">

          <div>

            <div class="eyebrow">
              NOTES
            </div>

            <h3 class="panel-title">
              Customer Notes
            </h3>

          </div>

        </div>


        <div class="crm-edit-field">

          <label>
            Notes
          </label>

          <textarea
            id="crmEditNotes"
            rows="7"
            placeholder="Customer notes..."
          >${escapeHTML(
            customer.notes || ""
          )}</textarea>

        </div>

      </div>


      <!-- =========================
           ACTIONS
      ========================== -->

      <div class="crm-edit-actions">

        <button
          type="button"
          class="secondary-btn"
          onclick="crmCancelCustomerEdit()">
          CANCEL
        </button>

        <button
          type="button"
          id="crmEditSaveButton"
          class="primary-btn"
          onclick="crmSaveCustomerEdit()">
          SAVE CHANGES
        </button>

      </div>


    </div>

  `;


  crmPopulateEditStatus(
    status
  );


  crmPopulateEditSales(
    salesId
  );


  crmAddEditPageStyles();

}


// ============================================================
// EDIT STATUS DROPDOWN
// ============================================================

function crmPopulateEditStatus(
  selectedStatus
) {

  const select =
    document.getElementById(
      "crmEditStatus"
    );


  if (!select)
    return;


  select.innerHTML =
    "";


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


      if (
        status ===
        selectedStatus
      ) {

        option.selected =
          true;

      }


      select.appendChild(
        option
      );

    }
  );

}


// ============================================================
// EDIT SALES DROPDOWN
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
        "Sales"
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

  }

}


// ============================================================
// CANCEL CUSTOMER PAGE
// ============================================================
// Kembali langsung ke Database Customer.
// ============================================================

window.crmCancelCustomerEdit =
  function () {

    /*
     * Gunakan sistem navigasi CRM utama.
     * Ini mencegah bentrok antara script.js
     * dengan crmNavigate() di index.html.
     */

    if (
      typeof window.crmNavigate ===
      "function"
    ) {

      window.crmNavigate(
        "leads"
      );

    } else {

      /*
       * Fallback jika crmNavigate belum tersedia.
       */

      const customerPage =
        document.getElementById(
          "customerProfilePage"
        );


      if (customerPage) {

        customerPage.style.display =
          "none";

      }


      const allPages = [

        "dashboardPage",
        "leadsPage",
        "salesPage",
        "appointmentPage",
        "dailyReportPage",
        "pltsCalculatorPage",
        "pltsSimulatorPage",
        "settingsPage"

      ];


      allPages.forEach(
        pageId => {

          const page =
            document.getElementById(
              pageId
            );


          if (page) {

            page.style.display =
              pageId === "leadsPage"
                ? "block"
                : "none";

          }

        }
      );


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
            sensitivity: "base"
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


// ============================================================
// CUSTOMER PROFILE / CUSTOMER EDIT MODULE
// ============================================================

(function () {

  "use strict";


  // ==========================================================
  // CUSTOMER STATE
  // ==========================================================

  window.crmCurrentCustomerId = null;
  window.crmCurrentCustomer = null;


  // ==========================================================
  // OPEN CUSTOMER PROFILE
  // ==========================================================
  // Profile sekarang langsung menjadi halaman edit customer.
  // ==========================================================

  window.crmOpenCustomerProfile =
    async function (id) {

      console.log(
        "Opening Customer Profile:",
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


        // ==========================================
        // SIMPAN CUSTOMER YANG SEDANG DIBUKA
        // ==========================================

        window.crmCurrentCustomerId =
          data.id;

        window.crmCurrentCustomer =
          data;


        // ==========================================
        // RENDER CUSTOMER EDIT PAGE
        // ==========================================

        crmRenderCustomerEditPage(
          data
        );


        // ==========================================
        // BUKA HALAMAN CUSTOMER PROFILE
        // MENGGUNAKAN NAVIGASI CRM UTAMA
        // ==========================================

        if (
          typeof window.crmNavigate ===
          "function"
        ) {

          window.crmNavigate(
            "customerProfile"
          );

        } else {

          /*
           * Fallback hanya jika crmNavigate
           * belum tersedia.
           */

          crmShowProfilePageFallback();

        }


        // ==========================================
        // UPDATE PAGE TITLE
        // ==========================================

        setPageTitle(
          "Customer Profile"
        );


        // ==========================================
        // SCROLL KE ATAS
        // ==========================================

        window.scrollTo(
          {
            top: 0,
            behavior: "smooth"
          }
        );


        console.log(
          "Customer Profile opened:",
          data
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


  // ==========================================================
  // SHOW PROFILE PAGE FALLBACK
  // ==========================================================

  function crmShowProfilePageFallback() {

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
            id ===
            "customerProfilePage"
              ? "block"
              : "none";

        }

      }
    );


    setPageTitle(
      "Customer Profile"
    );

  }


  // ==========================================================
  // LEGACY PROFILE RENDER
  // ==========================================================

  function crmRenderCustomerProfile(
    customer
  ) {

    window.crmCurrentCustomerId =
      customer.id;

    window.crmCurrentCustomer =
      customer;

    crmRenderCustomerEditPage(
      customer
    );

  }


  // ==========================================================
  // PIPELINE STEP
  // ==========================================================

  function crmPipelineStep(
    label,
    date,
    completed
  ) {

    return `

      <div
        class="crm-pipeline-step ${
          completed
            ? "completed"
            : ""
        }">

        <div class="crm-pipeline-dot">

          ${
            completed
              ? "✓"
              : ""
          }

        </div>

        <div class="crm-pipeline-label">

          <strong>
            ${escapeHTML(
              label
            )}
          </strong>

          <span>

            ${
              date
                ? crmFormatProfileDate(
                    date
                  )
                : "Not yet"
            }

          </span>

        </div>

      </div>

    `;

  }


  // ==========================================================
  // PIPELINE CONNECTOR
  // ==========================================================

  function crmPipelineLine() {

    return `

      <div
        class="crm-pipeline-connector">
      </div>

    `;

  }


  // ==========================================================
  // TIMELINE ITEM
  // ==========================================================

  function crmTimelineItem(
    label,
    date,
    completed
  ) {

    if (!completed) {

      return "";

    }


    return `

      <div class="crm-timeline-item">

        <div class="crm-timeline-dot">
          ✓
        </div>

        <div class="crm-timeline-content">

          <strong>
            ${escapeHTML(
              label
            )}
          </strong>

          <span>
            ${crmFormatProfileDate(
              date
            )}
          </span>

        </div>

      </div>

    `;

  }


  // ==========================================================
  // DATE FORMAT
  // ==========================================================

  function crmFormatProfileDate(
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

        return String(
          date
        );

      }


      return d.toLocaleDateString(
        "id-ID",
        {
          day:
            "2-digit",

          month:
            "short",

          year:
            "numeric"
        }
      );


    } catch {

      return String(
        date
      );

    }

  }


  // ==========================================================
  // PROFILE EDIT COMPATIBILITY
  // ==========================================================

  window.crmProfileEdit =
    function () {

      const id =
        window.crmCurrentCustomerId;


      if (!id) {

        alert(
          "Customer not selected."
        );

        return;

      }


      editLead(
        id
      );

    };


  // ==========================================================
  // WHATSAPP
  // ==========================================================

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


  // ==========================================================
  // EMAIL
  // ==========================================================

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


  // ==========================================================
  // APPOINTMENT
  // ==========================================================

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


  // ==========================================================
  // SIMPLE PAGE FALLBACK
  // ==========================================================

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


  // ==========================================================
  // PROFILE / CUSTOMER CSS
  // ==========================================================

  function crmAddProfileStyles() {

    if (
      document.getElementById(
        "crmProfileDynamicStyles"
      )
    ) {

      return;

    }


    const style =
      document.createElement(
        "style"
      );


    style.id =
      "crmProfileDynamicStyles";


    style.textContent = `

      .crm-lead-actions {

        display: flex;

        align-items: center;

        justify-content: center;

        gap: 6px;

        flex-wrap: wrap;

      }


      .crm-lead-actions .small-btn {

        margin: 0;

        white-space: nowrap;

      }


      .crm-profile-header {

        display: flex;

        align-items: center;

        gap: 18px;

        padding: 24px;

        margin-bottom: 20px;

        border-radius: 20px;

        background:
          linear-gradient(
            135deg,
            rgba(255,255,255,.94),
            rgba(245,247,250,.86)
          );

        border:
          1px solid
          rgba(255,255,255,.75);

        box-shadow:
          0 14px 40px
          rgba(15,23,42,.08);

      }


      .crm-profile-avatar {

        width: 64px;

        height: 64px;

        min-width: 64px;

        border-radius: 18px;

        display: flex;

        align-items: center;

        justify-content: center;

        font-size: 25px;

        font-weight: 800;

        background:
          linear-gradient(
            135deg,
            #111827,
            #374151
          );

        color: white;

      }


      .crm-profile-heading {

        flex: 1;

        min-width: 0;

      }


      .crm-profile-name-row {

        display: flex;

        align-items: center;

        gap: 12px;

        flex-wrap: wrap;

      }


      .crm-profile-name-row h2 {

        margin: 0;

        font-size: 25px;

        font-weight: 800;

        color: #0f172a;

      }


      .crm-profile-heading p {

        margin:
          5px 0 0;

        color:
          #64748b;

      }


      .crm-profile-actions {

        display: flex;

        gap: 8px;

        flex-wrap: wrap;

        justify-content: flex-end;

      }


      .crm-profile-grid {

        display: grid;

        grid-template-columns:
          minmax(0, 1.5fr)
          minmax(280px, 1fr);

        gap: 20px;

        margin-bottom: 20px;

      }


      .crm-profile-card {

        margin-bottom: 20px;

      }


      .crm-info-grid {

        display: grid;

        grid-template-columns:
          repeat(
            2,
            minmax(0, 1fr)
          );

        gap: 16px;

      }


      .crm-info-item {

        padding:
          14px 16px;

        border-radius:
          14px;

        background:
          rgba(
            248,
            250,
            252,
            .9
          );

        border:
          1px solid
          #e2e8f0;

      }


      .crm-info-item span {

        display: block;

        margin-bottom: 6px;

        font-size: 12px;

        color:
          #64748b;

        font-weight: 600;

      }


      .crm-info-item strong {

        display: block;

        color:
          #0f172a;

        word-break:
          break-word;

      }


      .crm-profile-notes {

        min-height: 120px;

        padding: 16px;

        border-radius:
          14px;

        background:
          #f8fafc;

        border:
          1px solid
          #e2e8f0;

        white-space:
          pre-wrap;

        color:
          #334155;

        line-height:
          1.6;

      }


      .crm-profile-pipeline {

        display: flex;

        align-items:
          flex-start;

        width: 100%;

        overflow-x:
          auto;

        padding:
          10px 4px 16px;

      }


      .crm-pipeline-step {

        min-width:
          105px;

        text-align:
          center;

        flex-shrink:
          0;

      }


      .crm-pipeline-dot {

        width: 34px;

        height: 34px;

        margin:
          0 auto 9px;

        border-radius:
          50%;

        display: flex;

        align-items:
          center;

        justify-content:
          center;

        background:
          #e2e8f0;

        color:
          #64748b;

        font-weight:
          800;

        border:
          3px solid white;

        box-shadow:
          0 0 0 1px
          #cbd5e1;

      }


      .crm-pipeline-step.completed
      .crm-pipeline-dot {

        background:
          #16a34a;

        color:
          white;

        box-shadow:
          0 0 0 1px
          #16a34a;

      }


      .crm-pipeline-label strong {

        display: block;

        font-size:
          12px;

        color:
          #0f172a;

      }


      .crm-pipeline-label span {

        display: block;

        margin-top:
          4px;

        font-size:
          10px;

        color:
          #64748b;

      }


      .crm-pipeline-connector {

        height:
          2px;

        flex:
          1;

        min-width:
          20px;

        margin-top:
          16px;

        background:
          #e2e8f0;

      }


      .crm-profile-timeline {

        display: flex;

        flex-direction:
          column;

      }


      .crm-timeline-item {

        display: flex;

        align-items:
          center;

        gap:
          13px;

        padding:
          13px 0;

        border-bottom:
          1px solid
          #e2e8f0;

      }


      .crm-timeline-item:last-child {

        border-bottom:
          0;

      }


      .crm-timeline-dot {

        width:
          30px;

        height:
          30px;

        min-width:
          30px;

        border-radius:
          50%;

        display: flex;

        align-items:
          center;

        justify-content:
          center;

        background:
          #16a34a;

        color:
          white;

        font-size:
          13px;

        font-weight:
          800;

      }


      .crm-timeline-content {

        display: flex;

        flex-direction:
          column;

        gap:
          3px;

      }


      .crm-timeline-content strong {

        font-size:
          14px;

        color:
          #0f172a;

      }


      .crm-timeline-content span {

        font-size:
          12px;

        color:
          #64748b;

      }


      .crm-full-edit-page {

        width:
          100%;

        max-width:
          1200px;

        margin:
          0 auto;

      }


      .crm-edit-toolbar {

        display:
          flex;

        align-items:
          flex-start;

        justify-content:
          space-between;

        gap:
          20px;

        margin-bottom:
          22px;

        padding:
          4px 0;

      }


      .crm-edit-toolbar-title {

        flex:
          1;

        text-align:
          right;

      }


      .crm-edit-toolbar-title h2 {

        margin:
          2px 0 4px;

        font-size:
          26px;

        font-weight:
          800;

        color:
          #0f172a;

      }


      .crm-edit-toolbar-title p {

        margin:
          0;

        color:
          #64748b;

        font-size:
          13px;

      }


      .crm-edit-layout {

        display:
          flex;

        flex-direction:
          column;

        gap:
          20px;

      }


      .crm-edit-card {

        margin:
          0 !important;

      }


      .crm-edit-grid {

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
          18px;

      }


      .crm-edit-field {

        display:
          flex;

        flex-direction:
          column;

        gap:
          7px;

      }


      .crm-edit-field label {

        font-size:
          12px;

        font-weight:
          700;

        color:
          #475569;

      }


      .crm-edit-field input,

      .crm-edit-field select,

      .crm-edit-field textarea {

        width:
          100%;

        box-sizing:
          border-box;

        border:
          1px solid
          #dbe2ea;

        border-radius:
          12px;

        background:
          #ffffff;

        color:
          #0f172a;

        padding:
          12px 13px;

        font:
          inherit;

        outline:
          none;

        transition:
          .2s ease;

      }


      .crm-edit-field input:focus,

      .crm-edit-field select:focus,

      .crm-edit-field textarea:focus {

        border-color:
          #94a3b8;

        box-shadow:
          0 0 0 3px
          rgba(
            148,
            163,
            184,
            .15
          );

      }


      .crm-edit-field textarea {

        resize:
          vertical;

        min-height:
          150px;

        line-height:
          1.6;

      }


      .crm-edit-actions {

        display:
          flex;

        justify-content:
          flex-end;

        align-items:
          center;

        gap:
          10px;

        padding:
          4px 0 30px;

      }


      @media (max-width: 800px) {

        .crm-profile-header {

          align-items:
            flex-start;

          flex-wrap:
            wrap;

        }


        .crm-profile-actions {

          width:
            100%;

          justify-content:
            flex-start;

        }


        .crm-profile-grid {

          grid-template-columns:
            1fr;

        }


        .crm-info-grid {

          grid-template-columns:
            1fr;

        }


        .crm-edit-grid {

          grid-template-columns:
            1fr;

        }


        .crm-edit-toolbar {

          flex-direction:
            column;

        }


        .crm-edit-toolbar-title {

          text-align:
            left;

          width:
            100%;

        }

      }


      @media (max-width: 600px) {

        .crm-lead-actions {

          flex-direction:
            column;

          align-items:
            stretch;

        }


        .crm-lead-actions .small-btn {

          width:
            100%;

        }


        .crm-edit-actions {

          flex-direction:
            column-reverse;

          align-items:
            stretch;

        }


        .crm-edit-actions button {

          width:
            100%;

        }

      }


      @media (max-width: 480px) {

        .crm-profile-header {

          padding:
            18px;

        }


        .crm-profile-name-row h2 {

          font-size:
            21px;

        }


        .crm-profile-actions {

          flex-direction:
            column;

        }


        .crm-profile-actions button {

          width:
            100%;

        }


        .crm-edit-toolbar-title h2 {

          font-size:
            22px;

        }

      }

    `;


    document.head.appendChild(
      style
    );

  }


  // ==========================================================
  // EDIT PAGE CSS
  // ==========================================================

  function crmAddEditPageStyles() {

    if (
      document.getElementById(
        "crmEditPageStyles"
      )
    ) {

      return;

    }


    const style =
      document.createElement(
        "style"
      );


    style.id =
      "crmEditPageStyles";


    style.textContent = `

      .crm-full-edit-page {

        animation:
          crmEditPageIn
          .18s
          ease-out;

      }


      @keyframes crmEditPageIn {

        from {

          opacity:
            0;

          transform:
            translateY(
              6px
            );

        }

        to {

          opacity:
            1;

          transform:
            translateY(
              0
            );

        }

      }

    `;


    document.head.appendChild(
      style
    );

  }


  // ==========================================================
  // GLOBAL PROFILE FUNCTIONS
  // ==========================================================

  window.crmRenderCustomerProfile =
    crmRenderCustomerProfile;

  window.crmShowProfilePageFallback =
    crmShowProfilePageFallback;

})();


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
  window.crmProfileEdit;

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
