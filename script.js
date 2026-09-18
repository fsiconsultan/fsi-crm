/* =========================================================
   FSI CRM — SCRIPT.JS
   Supabase CRM
   ========================================================= */


/* =========================================================
   SUPABASE CONFIG
   ========================================================= */

const SUPABASE_URL =
  "https://yoyszukutqwoxxdolzcg.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_QcPULwc5-Axry0HRzfmq1A_CeXgiAHL";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let currentUser = null;
let currentProfile = null;

let leadsData = [];
let salesUsersData = [];

let currentPage = 1;
const pageSize = 20;
let totalLeadsCount = 0;


/* =========================================================
   LEAD STATUS
   ========================================================= */

const LEAD_STATUSES = [
  "New",
  "Flyer Sent",
  "Interested",
  "Follow Up",
  "Closing",
  "Not Interested"
];


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", async function () {

  setupModalEvents();
  setupEnglishStatusOptions();

  await checkSession();

});


/* =========================================================
   SESSION
   ========================================================= */

async function checkSession() {

  try {

    const {
      data,
      error
    } = await supabaseClient.auth.getSession();

    if (error) {

      console.error(
        "Session error:",
        error
      );

      showLogin();

      return;
    }

    if (data && data.session) {

      currentUser = data.session.user;

      await loadProfile();

    } else {

      showLogin();

    }

  } catch (error) {

    console.error(
      "checkSession error:",
      error
    );

    showLogin();

  }

}


/* =========================================================
   LOGIN
   ========================================================= */

async function login() {

  const usernameEl =
    document.getElementById("loginUsername");

  const passwordEl =
    document.getElementById("loginPassword");

  const messageEl =
    document.getElementById("loginMessage");

  if (!usernameEl || !passwordEl) {
    return;
  }

  const username =
    usernameEl.value.trim();

  const password =
    passwordEl.value;

  if (!username || !password) {

    if (messageEl) {
      messageEl.textContent =
        "Username dan password wajib diisi.";
    }

    return;
  }

  if (messageEl) {
    messageEl.textContent =
      "Logging in...";
  }

  try {

    /*
      Username -> email melalui RPC
      yang sudah digunakan oleh sistem sebelumnya.
    */

    const {
      data: emailData,
      error: emailError
    } = await supabaseClient.rpc(
      "get_login_email",
      {
        p_username: username
      }
    );

    if (emailError) {

      console.error(
        "get_login_email error:",
        emailError
      );

      throw new Error(
        emailError.message ||
        "Username tidak ditemukan."
      );
    }

    let loginEmail = null;

    if (typeof emailData === "string") {

      loginEmail = emailData;

    } else if (
      Array.isArray(emailData) &&
      emailData.length > 0
    ) {

      const row = emailData[0];

      loginEmail =
        row.email ||
        row.login_email ||
        row.get_login_email ||
        Object.values(row)[0];

    } else if (
      emailData &&
      typeof emailData === "object"
    ) {

      loginEmail =
        emailData.email ||
        emailData.login_email ||
        emailData.get_login_email ||
        Object.values(emailData)[0];

    }

    if (!loginEmail) {

      throw new Error(
        "Username tidak ditemukan."
      );
    }


    const {
      data,
      error
    } = await supabaseClient.auth.signInWithPassword({
      email: loginEmail,
      password: password
    });


    if (error) {

      console.error(
        "Supabase login error:",
        error
      );

      throw new Error(
        error.message ||
        "Username atau password salah."
      );
    }


    currentUser =
      data.user || null;


    if (!currentUser) {

      throw new Error(
        "User login tidak ditemukan."
      );
    }


    if (messageEl) {
      messageEl.textContent = "";
    }


    await loadProfile();

  } catch (error) {

    console.error(
      "Login error:",
      error
    );

    if (messageEl) {

      messageEl.textContent =
        error.message ||
        "Login gagal.";

    }

  }

}


/* =========================================================
   LOAD PROFILE
   ========================================================= */

async function loadProfile() {

  if (!currentUser) {
    return;
  }

  try {

    const {
      data,
      error
    } = await supabaseClient
      .from("sales_users")
      .select("*")
      .eq("auth_user-id", currentUser.id)
      .single();


    if (error) {

      console.error(
        "loadProfile error:",
        error
      );

      /*
        Jangan langsung logout jika profile
        belum ditemukan karena error bisa berasal
        dari query / RLS.
      */

      throw new Error(
        "Profile user tidak dapat dimuat: " +
        error.message
      );
    }


    currentProfile = data;


    console.log(
      "Current profile:",
      currentProfile
    );


    showApp();


    setupRoleAccess();


    await loadSalesLookup();

    populateSalesDropdowns();

    await loadFilterOptions();

    await loadLeads(1);

    await updateDashboard();


    updateUserUI();


  } catch (error) {

    console.error(
      "Profile loading error:",
      error
    );

    alert(
      error.message ||
      "Profile tidak dapat dimuat."
    );

  }

}


/* =========================================================
   SHOW / HIDE LOGIN
   ========================================================= */

function showLogin() {

  const loginPage =
    document.getElementById("loginPage");

  const app =
    document.getElementById("app");

  if (loginPage) {
    loginPage.style.display = "flex";
  }

  if (app) {
    app.style.display = "none";
  }

}


function showApp() {

  const loginPage =
    document.getElementById("loginPage");

  const app =
    document.getElementById("app");

  if (loginPage) {
    loginPage.style.display = "none";
  }

  if (app) {
    app.style.display = "block";
  }

}


/* =========================================================
   USER UI
   ========================================================= */

function updateUserUI() {

  const userInfo =
    document.getElementById("userInfo");

  const currentUserEl =
    document.getElementById("currentUser");


  const name =
    currentProfile?.name ||
    currentProfile?.username ||
    currentUser?.email ||
    "User";


  const role =
    currentProfile?.role ||
    "";


  if (userInfo) {

    userInfo.textContent =
      role
        ? `${name} · ${role}`
        : name;

  }


  if (currentUserEl) {

    currentUserEl.textContent =
      role
        ? `${name} — ${role}`
        : name;

  }

}


/* =========================================================
   ROLE HELPERS
   ========================================================= */

function isAdmin() {

  const role =
    String(
      currentProfile?.role || ""
    ).toLowerCase();

  return role === "admin";

}


function isSales() {

  const role =
    String(
      currentProfile?.role || ""
    ).toLowerCase();

  return role === "sales";

}


/* =========================================================
   ROLE ACCESS
   ========================================================= */

function setupRoleAccess() {

  const manageSalesBtn =
    document.getElementById(
      "manageSalesBtn"
    );

  const mobileManageSalesBtn =
    document.getElementById(
      "mobileManageSalesBtn"
    );

  const salesDropdownContainer =
    document.getElementById(
      "salesDropdownContainer"
    );

  const salesFilter =
    document.getElementById(
      "salesFilter"
    );


  if (isAdmin()) {

    if (manageSalesBtn) {
      manageSalesBtn.style.display =
        "flex";
    }

    if (mobileManageSalesBtn) {
      mobileManageSalesBtn.style.display =
        "flex";
    }

    if (salesDropdownContainer) {
      salesDropdownContainer.style.display =
        "block";
    }

    if (salesFilter) {
      salesFilter.style.display =
        "block";
    }

  } else {

    if (manageSalesBtn) {
      manageSalesBtn.style.display =
        "none";
    }

    if (mobileManageSalesBtn) {
      mobileManageSalesBtn.style.display =
        "none";
    }

    if (salesDropdownContainer) {
      salesDropdownContainer.style.display =
        "none";
    }

    if (salesFilter) {
      salesFilter.style.display =
        "none";
    }

  }


  setupSalesAssignmentAccess();

}


/* =========================================================
   SALES ASSIGNMENT ACCESS
   ========================================================= */

function setupSalesAssignmentAccess() {

  const salesAssign =
    document.getElementById(
      "leadSalesAssign"
    );

  if (!salesAssign) {
    return;
  }

  if (isAdmin()) {

    salesAssign.disabled = false;

  } else {

    salesAssign.disabled = true;

  }

}


/* =========================================================
   SALES LOOKUP
   ========================================================= */

async function loadSalesLookup() {

  try {

    const {
      data,
      error
    } = await supabaseClient
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
        "loadSalesLookup error:",
        error
      );

      salesUsersData = [];

      return;

    }


    salesUsersData =
      data || [];


  } catch (error) {

    console.error(
      "Sales lookup error:",
      error
    );

    salesUsersData = [];

  }

}


/* =========================================================
   POPULATE SALES DROPDOWNS
   ========================================================= */

function populateSalesDropdowns() {

  const salesFilter =
    document.getElementById(
      "salesFilter"
    );

  const salesMenu =
    document.getElementById(
      "salesDropdownMenu"
    );

  const salesAssign =
    document.getElementById(
      "leadSalesAssign"
    );


  /*
    SALES FILTER
  */

  if (salesFilter) {

    const currentValue =
      salesFilter.value || "";

    salesFilter.innerHTML = `
      <option value="">
        All Sales
      </option>
    `;

    salesUsersData
      .filter(user =>
        String(user.role || "")
          .toLowerCase() === "sales"
      )
      .forEach(user => {

        const option =
          document.createElement("option");

        option.value =
          user.id;

        option.textContent =
          user.name ||
          user.username ||
          "Sales";

        salesFilter.appendChild(
          option
        );

      });


    salesFilter.value =
      currentValue;

  }


  /*
    TOP NAV SALES DROPDOWN
  */

  if (salesMenu) {

    salesMenu.innerHTML = `
      <button
        type="button"
        class="nav-dropdown-item"
        data-sales-id=""
        onclick="selectSalesFilter('', 'All Sales')"
      >
        All Sales
      </button>
    `;


    salesUsersData
      .filter(user =>
        String(user.role || "")
          .toLowerCase() === "sales"
      )
      .forEach(user => {

        const button =
          document.createElement("button");

        button.type =
          "button";

        button.className =
          "nav-dropdown-item";

        button.dataset.salesId =
          user.id;

        button.textContent =
          user.name ||
          user.username ||
          "Sales";

        button.onclick =
          function () {

            selectSalesFilter(
              user.id,
              user.name ||
              user.username
            );

          };


        salesMenu.appendChild(
          button
        );

      });

  }


  /*
    LEAD ASSIGNMENT
  */

  if (salesAssign) {

    const currentValue =
      salesAssign.value || "";

    salesAssign.innerHTML = `
      <option value="">
        Select Sales
      </option>
    `;


    salesUsersData
      .filter(user =>
        String(user.role || "")
          .toLowerCase() === "sales"
      )
      .forEach(user => {

        const option =
          document.createElement("option");

        option.value =
          user.id;

        option.textContent =
          user.name ||
          user.username ||
          "Sales";

        salesAssign.appendChild(
          option
        );

      });


    salesAssign.value =
      currentValue;

  }


}


/* =========================================================
   FILTER OPTIONS
   ========================================================= */

async function loadFilterOptions() {

  try {

    const {
      data,
      error
    } = await supabaseClient
      .from("leads")
      .select(
        "business, location"
      );


    if (error) {

      console.error(
        "loadFilterOptions error:",
        error
      );

      return;

    }


    const businessValues =
      [
        ...new Set(
          (data || [])
            .map(row =>
              row.business
            )
            .filter(Boolean)
        )
      ]
      .sort();


    const locationValues =
      [
        ...new Set(
          (data || [])
            .map(row =>
              row.location
            )
            .filter(Boolean)
        )
      ]
      .sort();


    const businessFilter =
      document.getElementById(
        "businessFilter"
      );

    const locationFilter =
      document.getElementById(
        "locationFilter"
      );


    if (businessFilter) {

      const currentValue =
        businessFilter.value;

      businessFilter.innerHTML = `
        <option value="">
          All Business
        </option>
      `;


      businessValues.forEach(value => {

        const option =
          document.createElement("option");

        option.value =
          value;

        option.textContent =
          value;

        businessFilter.appendChild(
          option
        );

      });


      businessFilter.value =
        currentValue;

    }


    if (locationFilter) {

      const currentValue =
        locationFilter.value;

      locationFilter.innerHTML = `
        <option value="">
          All Location
        </option>
      `;


      locationValues.forEach(value => {

        const option =
          document.createElement("option");

        option.value =
          value;

        option.textContent =
          value;

        locationFilter.appendChild(
          option
        );

      });


      locationFilter.value =
        currentValue;

    }


  } catch (error) {

    console.error(
      "Filter options error:",
      error
    );

  }

}


/* =========================================================
   LOAD LEADS
   ========================================================= */

async function loadLeads(
  page = 1
) {

  currentPage =
    Math.max(
      1,
      Number(page) || 1
    );


  const search =
    document.getElementById(
      "leadSearch"
    )?.value.trim() || "";


  const status =
    document.getElementById(
      "statusFilter"
    )?.value || "";


  const business =
    document.getElementById(
      "businessFilter"
    )?.value || "";


  const location =
    document.getElementById(
      "locationFilter"
    )?.value || "";


  const salesFilter =
    document.getElementById(
      "salesFilter"
    );


  try {

    let query =
      supabaseClient
        .from("leads")
        .select(
          `
            id,
            customer_name,
            phone,
            email,
            business,
            location,
            status,
            follow_up_date,
            notes,
            created_at,
            sales_id,
            appointment,
            site_survey,
            quotation,
            spk,
            closing
          `,
          {
            count: "exact"
          }
        );


    /*
      SALES USER:
      hanya boleh melihat lead miliknya.
    */

    if (isSales()) {

      if (!currentProfile?.id) {

        console.error(
          "Sales profile ID tidak tersedia."
        );

        leadsData = [];

        renderLeads();

        return;

      }

      query =
        query.eq(
          "sales_id",
          currentProfile.id
        );

    }


    /*
      ADMIN SALES FILTER
    */

    if (
      isAdmin() &&
      salesFilter &&
      salesFilter.value
    ) {

      query =
        query.eq(
          "sales_id",
          salesFilter.value
        );

    }


    /*
      SEARCH
    */

    if (search) {

      const escapedSearch =
        search
          .replace(/%/g, "\\%")
          .replace(/_/g, "\\_")
          .replace(/,/g, "");

      query =
        query.or(
          [
            `customer_name.ilike.%${escapedSearch}%`,
            `phone.ilike.%${escapedSearch}%`,
            `email.ilike.%${escapedSearch}%`,
            `business.ilike.%${escapedSearch}%`,
            `location.ilike.%${escapedSearch}%`
          ].join(",")
        );

    }


    /*
      FILTER STATUS
    */

    if (status) {

      query =
        query.eq(
          "status",
          status
        );

    }


    /*
      FILTER BUSINESS
    */

    if (business) {

      query =
        query.eq(
          "business",
          business
        );

    }


    /*
      FILTER LOCATION
    */

    if (location) {

      query =
        query.eq(
          "location",
          location
        );

    }


    /*
      PAGINATION
    */

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
    } = await query;


    if (error) {

      console.error(
        "loadLeads error:",
        error
      );

      leadsData = [];

      totalLeadsCount = 0;

      renderLeads();

      return;

    }


    leadsData =
      data || [];

    totalLeadsCount =
      Number(count || 0);


    renderLeads();


  } catch (error) {

    console.error(
      "Unexpected loadLeads error:",
      error
    );

    leadsData = [];

    totalLeadsCount = 0;

    renderLeads();

  }

}


/* =========================================================
   RENDER LEADS
   ========================================================= */

function renderLeads() {

  const table =
    document.getElementById(
      "leadsTable"
    );

  if (!table) {
    return;
  }


  table.innerHTML = "";


  if (!leadsData.length) {

    table.innerHTML = `
      <tr>
        <td
          colspan="10"
          style="text-align:center; padding:30px;"
        >
          No leads found.
        </td>
      </tr>
    `;

    updatePagination();

    return;

  }


  leadsData.forEach(lead => {

    const row =
      document.createElement("tr");


    const status =
      normalizeLeadStatus(
        lead.status
      );


    const sales =
      getSalesName(
        lead.sales_id
      );


    const followUp =
      lead.follow_up_date
        ? formatDate(
            lead.follow_up_date
          )
        : "-";


    const nextStep =
      getNextStep(
        lead
      );


    row.innerHTML = `

      <td>
        <strong>
          ${escapeHtml(
            lead.customer_name || "-"
          )}
        </strong>
      </td>


      <td>
        ${
          lead.phone
            ? `
              <a
                href="${getWhatsAppLink(
                  lead.phone
                )}"
                target="_blank"
                rel="noopener"
                class="whatsapp-link"
              >
                ${escapeHtml(
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
                href="mailto:${escapeAttribute(
                  lead.email
                )}"
              >
                ${escapeHtml(
                  lead.email
                )}
              </a>
            `
            : "-"
        }
      </td>


      <td>
        ${escapeHtml(
          lead.business || "-"
        )}
      </td>


      <td>
        ${escapeHtml(
          lead.location || "-"
        )}
      </td>


      <td>
        ${escapeHtml(
          sales || "-"
        )}
      </td>


      <td>
        <span class="status-badge ${getStatusClass(status)}">
          ${escapeHtml(status)}
        </span>
      </td>


      <td>
        ${followUp}
      </td>


      <td>
        ${escapeHtml(nextStep)}
      </td>


      <td>
        <div class="table-actions">

          <button
            type="button"
            class="secondary-btn small-btn"
            onclick="editLead('${lead.id}')"
          >
            Edit
          </button>

          <button
            type="button"
            class="danger-btn small-btn"
            onclick="deleteLead('${lead.id}')"
          >
            Delete
          </button>

        </div>
      </td>

    `;


    table.appendChild(
      row
    );

  });


  updatePagination();

}


/* =========================================================
   PAGINATION
   ========================================================= */

function updatePagination() {

  const info =
    document.getElementById(
      "paginationInfo"
    );

  const indicator =
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


  const total =
    Number(
      totalLeadsCount || 0
    );


  const totalPages =
    Math.max(
      1,
      Math.ceil(
        total / pageSize
      )
    );


  const start =
    total === 0
      ? 0
      : (
          (currentPage - 1) *
          pageSize
        ) + 1;


  const end =
    total === 0
      ? 0
      : Math.min(
          currentPage *
          pageSize,
          total
        );


  if (info) {

    info.textContent =
      `Showing ${start} to ${end} of ${total} leads`;

  }


  if (indicator) {

    indicator.textContent =
      `Page ${currentPage} of ${totalPages}`;

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


/* =========================================================
   CHANGE PAGE
   ========================================================= */

function changePage(
  direction
) {

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


/* =========================================================
   SEARCH
   ========================================================= */

let searchTimer = null;

function onSearchInput() {

  clearTimeout(
    searchTimer
  );


  searchTimer =
    setTimeout(
      function () {

        loadLeads(1);

      },
      300
    );

}


/* =========================================================
   NORMALIZE STATUS
   ========================================================= */

function normalizeLeadStatus(
  status
) {

  const value =
    String(
      status || ""
    ).trim();


  const map = {

    "Belum Dihubungi":
      "New",

    "Belum dihubungi":
      "New",

    "New":
      "New",

    "Flyer Sent":
      "Flyer Sent",

    "Tertarik":
      "Interested",

    "Interested":
      "Interested",

    "Follow Up":
      "Follow Up",

    "Followup":
      "Follow Up",

    "Follow-up":
      "Follow Up",

    "Closing":
      "Closing",

    "Tidak Tertarik":
      "Not Interested",

    "Tidak tertarik":
      "Not Interested",

    "Not Interested":
      "Not Interested"

  };


  return (
    map[value] ||
    value ||
    "New"
  );

}


/* =========================================================
   STATUS CLASS
   ========================================================= */

function getStatusClass(
  status
) {

  switch (
    normalizeLeadStatus(status)
  ) {

    case "New":
      return "status-new";

    case "Flyer Sent":
      return "status-flyer";

    case "Interested":
      return "status-interested";

    case "Follow Up":
      return "status-followup";

    case "Closing":
      return "status-closing";

    case "Not Interested":
      return "status-not-interested";

    default:
      return "";

  }

}


/* =========================================================
   SET STATUS OPTIONS
   ========================================================= */

function setupEnglishStatusOptions() {

  const select =
    document.getElementById(
      "leadStatus"
    );

  if (!select) {
    return;
  }


  /*
    Tetap menyimpan nilai database
    yang sekarang digunakan.
  */

  select.innerHTML = `

    <option value="New">
      New
    </option>

    <option value="Flyer Sent">
      Flyer Sent
    </option>

    <option value="Interested">
      Interested
    </option>

    <option value="Follow Up">
      Follow Up
    </option>

    <option value="Closing">
      Closing
    </option>

    <option value="Not Interested">
      Not Interested
    </option>

  `;

}


/* =========================================================
   DASHBOARD — IMPORTANT
   ========================================================= */

/*
  Ini bagian utama yang diperbaiki.

  Dashboard TIDAK mengambil angka dari leadsData,
  karena leadsData hanya berisi 20 lead pada halaman aktif.

  Dashboard mengambil langsung seluruh lead yang
  boleh dilihat oleh user dari Supabase.
*/

async function updateDashboard() {

  console.log(
    "========== DASHBOARD REFRESH =========="
  );

  console.log(
    "User:",
    currentUser?.id
  );

  console.log(
    "Profile:",
    currentProfile
  );


  try {

    let query =
      supabaseClient
        .from("leads")
        .select(
          `
            id,
            status,
            appointment,
            site_survey,
            quotation,
            closing,
            sales_id
          `
        );


    /*
      SALES:
      hanya hitung lead miliknya.
    */

    if (isSales()) {

      if (!currentProfile?.id) {

        console.error(
          "Dashboard: currentProfile.id tidak tersedia."
        );

        resetDashboard();

        return;

      }


      query =
        query.eq(
          "sales_id",
          currentProfile.id
        );

    }


    /*
      ADMIN:
      tidak diberikan filter sales_id,
      sehingga menghitung seluruh lead.
    */


    const {
      data,
      error
    } = await query;


    if (error) {

      console.error(
        "DASHBOARD SUPABASE ERROR:",
        error
      );

      resetDashboard();

      return;

    }


    const dataList =
      Array.isArray(data)
        ? data
        : [];


    /*
      LOG PENTING
      -------------------------------------
      Ini akan menunjukkan jumlah data
      yang benar-benar diterima Dashboard
      dari Supabase.
    */

    console.log(
      "Dashboard menerima data dari Supabase:",
      dataList.length,
      "leads"
    );


    /*
      HITUNG STATISTIK
    */

    const total =
      dataList.length;


    const newLeads =
      countNormalizedStatus(
        dataList,
        "New"
      );


    const interested =
      countNormalizedStatus(
        dataList,
        "Interested"
      );


    const followUp =
      countNormalizedStatus(
        dataList,
        "Follow Up"
      );


    const appointment =
      countDateField(
        dataList,
        "appointment"
      );


    const siteSurvey =
      countDateField(
        dataList,
        "site_survey"
      );


    const quotation =
      countDateField(
        dataList,
        "quotation"
      );


    const closing =
      countClosing(
        dataList
      );


    /*
      UPDATE DOM
    */

    setText(
      "statTotal",
      total
    );


    setText(
      "statNew",
      newLeads
    );


    setText(
      "statInterested",
      interested
    );


    setText(
      "statFollowUp",
      followUp
    );


    setText(
      "statAppointment",
      appointment
    );


    setText(
      "statSiteSurvey",
      siteSurvey
    );


    setText(
      "statQuotation",
      quotation
    );


    setText(
      "statClosing",
      closing
    );


    console.log(
      "DASHBOARD RESULT:",
      {
        total,
        newLeads,
        interested,
        followUp,
        appointment,
        siteSurvey,
        quotation,
        closing
      }
    );


  } catch (error) {

    console.error(
      "Unexpected dashboard error:",
      error
    );

    resetDashboard();

  }

}


/* =========================================================
   RESET DASHBOARD
   ========================================================= */

function resetDashboard() {

  setText(
    "statTotal",
    0
  );

  setText(
    "statNew",
    0
  );

  setText(
    "statInterested",
    0
  );

  setText(
    "statFollowUp",
    0
  );

  setText(
    "statAppointment",
    0
  );

  setText(
    "statSiteSurvey",
    0
  );

  setText(
    "statQuotation",
    0
  );

  setText(
    "statClosing",
    0
  );

}


/* =========================================================
   DASHBOARD COUNT HELPERS
   ========================================================= */

function countNormalizedStatus(
  data,
  target
) {

  return data.filter(
    row =>
      normalizeLeadStatus(
        row.status
      ) === target
  ).length;

}


function countDateField(
  data,
  field
) {

  return data.filter(
    row => {

      const value =
        row[field];

      return (
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
      );

    }
  ).length;

}


function countClosing(
  data
) {

  return data.filter(
    row => {

      const status =
        normalizeLeadStatus(
          row.status
        );


      const closingDate =
        row.closing;


      return (
        status === "Closing" ||
        (
          closingDate !== null &&
          closingDate !== undefined &&
          String(
            closingDate
          ).trim() !== ""
        )
      );

    }
  ).length;

}


/* =========================================================
   SET TEXT
   ========================================================= */

function setText(
  id,
  value
) {

  const element =
    document.getElementById(id);


  if (!element) {

    console.warn(
      `Dashboard element #${id} tidak ditemukan.`
    );

    return;

  }


  element.textContent =
    Number.isFinite(
      Number(value)
    )
      ? Number(value).toLocaleString("id-ID")
      : String(value ?? "0");

}


/* =========================================================
   SHOW DASHBOARD
   ========================================================= */

async function showDashboard() {

  hideAllPages();


  const dashboard =
    document.getElementById(
      "dashboardPage"
    );


  if (dashboard) {

    dashboard.style.display =
      "block";

  }


  setText(
    "pageTitle",
    "Dashboard"
  );


  setActiveNav(
    "dashboardNav"
  );


  /*
    PENTING:
    setiap kali Dashboard dibuka,
    ambil ulang data dari Supabase.
  */

  await updateDashboard();

}


/* =========================================================
   SHOW LEADS
   ========================================================= */

async function showLeads() {

  hideAllPages();


  const leads =
    document.getElementById(
      "leadsPage"
    );


  if (leads) {

    leads.style.display =
      "block";

  }


  setText(
    "pageTitle",
    "My Leads"
  );


  setActiveNav(
    "leadsNav"
  );


  /*
    Refresh data setiap kali My Leads dibuka.
  */

  await loadFilterOptions();

  await loadSalesLookup();

  populateSalesDropdowns();

  await loadLeads(
    currentPage || 1
  );

}


/* =========================================================
   SHOW SALES
   ========================================================= */

async function showSales() {

  if (!isAdmin()) {

    console.warn(
      "Akses Manage Sales ditolak."
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


  setText(
    "pageTitle",
    "Manage Sales"
  );


  setActiveNav();


  await loadSalesTable();

}


/* =========================================================
   HIDE ALL PAGES
   ========================================================= */

function hideAllPages() {

  const pages = [
    "dashboardPage",
    "leadsPage",
    "salesPage"
  ];


  pages.forEach(
    id => {

      const element =
        document.getElementById(
          id
        );

      if (element) {

        element.style.display =
          "none";

      }

    }
  );

}


/* =========================================================
   ACTIVE NAV
   ========================================================= */

function setActiveNav(
  activeId
) {

  document
    .querySelectorAll(
      ".nav-link"
    )
    .forEach(
      button => {

        button.classList.remove(
          "active"
        );

      }
    );


  if (!activeId) {
    return;
  }


  const active =
    document.getElementById(
      activeId
    );


  if (active) {

    active.classList.add(
      "active"
    );

  }

}


/* =========================================================
   OPEN LEAD MODAL
   ========================================================= */

function openLeadModal(
  lead = null
) {

  const modal =
    document.getElementById(
      "leadModal"
    );


  if (!modal) {
    return;
  }


  resetLeadForm();


  const title =
    document.getElementById(
      "leadModalTitle"
    );


  if (lead) {

    if (title) {
      title.textContent =
        "Edit Lead";
    }


    fillLeadForm(
      lead
    );

  } else {

    if (title) {
      title.textContent =
        "Add Lead";
    }


    /*
      Default Sales untuk Sales user.
    */

    if (
      isSales() &&
      currentProfile?.id
    ) {

      const salesAssign =
        document.getElementById(
          "leadSalesAssign"
        );

      if (salesAssign) {

        salesAssign.value =
          currentProfile.id;

      }

    }

  }


  modal.style.display =
    "flex";

}


/* =========================================================
   CLOSE LEAD MODAL
   ========================================================= */

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


/* =========================================================
   RESET LEAD FORM
   ========================================================= */

function resetLeadForm() {

  const fields = [
    "leadId",
    "leadCustomer",
    "leadPhone",
    "leadEmail",
    "leadBusiness",
    "leadLocation",
    "leadFollowUp",
    "leadAppointment",
    "leadSiteSurvey",
    "leadQuotation",
    "leadSPK",
    "leadClosing",
    "leadNotes"
  ];


  fields.forEach(
    id => {

      const element =
        document.getElementById(
          id
        );

      if (element) {

        element.value =
          "";

      }

    }
  );


  const status =
    document.getElementById(
      "leadStatus"
    );


  if (status) {

    status.value =
      "New";

  }


  const sales =
    document.getElementById(
      "leadSalesAssign"
    );


  if (sales) {

    sales.value =
      "";

  }

}


/* =========================================================
   FILL LEAD FORM
   ========================================================= */

function fillLeadForm(
  lead
) {

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


  setStatusValue(
    "leadStatus",
    lead.status
  );


  setValue(
    "leadSalesAssign",
    lead.sales_id
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


  /*
    Sales user tidak boleh mengubah assignment.
  */

  setupSalesAssignmentAccess();

}


/* =========================================================
   EDIT LEAD
   ========================================================= */

async function editLead(
  id
) {

  try {

    const {
      data,
      error
    } = await supabaseClient
      .from("leads")
      .select("*")
      .eq(
        "id",
        id
      )
      .single();


    if (error) {

      console.error(
        "editLead error:",
        error
      );

      alert(
        "Lead tidak dapat dimuat."
      );

      return;

    }


    /*
      Security tambahan untuk Sales:
      hanya boleh edit lead miliknya.
    */

    if (
      isSales() &&
      data.sales_id !==
      currentProfile?.id
    ) {

      alert(
        "Anda tidak memiliki akses ke lead ini."
      );

      return;

    }


    openLeadModal(
      data
    );


  } catch (error) {

    console.error(
      "Unexpected editLead error:",
      error
    );

  }

}


/* =========================================================
   SAVE LEAD
   ========================================================= */

async function saveLead() {

  const leadId =
    getValue("leadId");


  const customerName =
    getValue("leadCustomer").trim();


  if (!customerName) {

    alert(
      "Customer Name wajib diisi."
    );

    return;

  }


  let salesId =
    getValue(
      "leadSalesAssign"
    ) || null;


  /*
    Sales selalu menggunakan dirinya sendiri.
  */

  if (isSales()) {

    salesId =
      currentProfile?.id ||
      null;

  }


  const payload = {

    customer_name:
      customerName,

    phone:
      getValue("leadPhone").trim() ||
      null,

    email:
      getValue("leadEmail").trim() ||
      null,

    business:
      getValue("leadBusiness").trim() ||
      null,

    location:
      getValue("leadLocation").trim() ||
      null,

    status:
      getValue("leadStatus") ||
      "New",

    follow_up_date:
      getValue("leadFollowUp") ||
      null,

    notes:
      getValue("leadNotes").trim() ||
      null,

    sales_id:
      salesId,

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
      null

  };


  try {

    let response;


    if (leadId) {

      /*
        EDIT
      */

      let query =
        supabaseClient
          .from("leads")
          .update(payload)
          .eq(
            "id",
            leadId
          );


      if (isSales()) {

        query =
          query.eq(
            "sales_id",
            currentProfile.id
          );

      }


      response =
        await query;


    } else {

      /*
        INSERT
      */

      response =
        await supabaseClient
          .from("leads")
          .insert(
            payload
          );

    }


    if (response.error) {

      console.error(
        "saveLead Supabase error:",
        response.error
      );

      alert(
        response.error.message ||
        "Lead gagal disimpan."
      );

      return;

    }


    console.log(
      "Lead saved successfully."
    );


    closeLeadModal();


    /*
      Refresh semua data setelah save.
    */

    await loadFilterOptions();

    await loadSalesLookup();

    populateSalesDropdowns();

    await loadLeads(
      currentPage
    );


    /*
      Dashboard mengambil ulang
      data terbaru langsung dari Supabase.
    */

    await updateDashboard();


    /*
      Kalau sedang di Dashboard,
      tetap refresh angka.
    */

    console.log(
      "Dashboard refreshed after save."
    );


  } catch (error) {

    console.error(
      "Unexpected saveLead error:",
      error
    );

    alert(
      error.message ||
      "Terjadi kesalahan saat menyimpan lead."
    );

  }

}


/* =========================================================
   DELETE LEAD
   ========================================================= */

async function deleteLead(
  id
) {

  const confirmed =
    confirm(
      "Apakah Anda yakin ingin menghapus lead ini?"
    );


  if (!confirmed) {
    return;
  }


  try {

    let query =
      supabaseClient
        .from("leads")
        .delete()
        .eq(
          "id",
          id
        );


    /*
      Sales hanya boleh delete lead miliknya.
    */

    if (isSales()) {

      query =
        query.eq(
          "sales_id",
          currentProfile.id
        );

    }


    const {
      error
    } = await query;


    if (error) {

      console.error(
        "deleteLead error:",
        error
      );

      alert(
        error.message ||
        "Lead gagal dihapus."
      );

      return;

    }


    /*
      Refresh data setelah delete.
    */

    await loadFilterOptions();

    await loadLeads(
      currentPage
    );

    await updateDashboard();


    /*
      Jika halaman aktif Dashboard,
      angka langsung diperbarui.
    */

    console.log(
      "Dashboard refreshed after delete."
    );


  } catch (error) {

    console.error(
      "Unexpected deleteLead error:",
      error
    );

  }

}


/* =========================================================
   MANAGE SALES
   ========================================================= */

async function loadSalesTable() {

  const table =
    document.getElementById(
      "salesTable"
    );


  if (!table) {
    return;
  }


  table.innerHTML = `
    <tr>
      <td
        colspan="6"
        style="text-align:center; padding:30px;"
      >
        Loading...
      </td>
    </tr>
  `;


  try {

    const {
      data,
      error
    } = await supabaseClient
      .from("sales_users")
      .select(
        "id, name, username, role, status, created_at"
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );


    if (error) {

      console.error(
        "loadSalesTable error:",
        error
      );

      table.innerHTML = `
        <tr>
          <td
            colspan="6"
            style="text-align:center; padding:30px;"
          >
            Failed to load Sales.
          </td>
        </tr>
      `;

      return;

    }


    salesUsersData =
      data || [];


    renderSalesTable();


    populateSalesDropdowns();


  } catch (error) {

    console.error(
      "Unexpected sales table error:",
      error
    );

  }

}


/* =========================================================
   RENDER SALES TABLE
   ========================================================= */

function renderSalesTable() {

  const table =
    document.getElementById(
      "salesTable"
    );


  if (!table) {
    return;
  }


  table.innerHTML = "";


  if (!salesUsersData.length) {

    table.innerHTML = `
      <tr>
        <td
          colspan="6"
          style="text-align:center; padding:30px;"
        >
          No Sales accounts found.
        </td>
      </tr>
    `;

    return;

  }


  salesUsersData.forEach(
    sales => {

      const row =
        document.createElement("tr");


      const status =
        String(
          sales.status ||
          "active"
        ).toLowerCase();


      const statusText =
        status === "active"
          ? "Active"
          : "Inactive";


      row.innerHTML = `

        <td>
          <strong>
            ${escapeHtml(
              sales.name || "-"
            )}
          </strong>
        </td>

        <td>
          ${escapeHtml(
            sales.username || "-"
          )}
        </td>

        <td>
          ${escapeHtml(
            sales.role || "-"
          )}
        </td>

        <td>
          <span class="status-badge">
            ${statusText}
          </span>
        </td>

        <td>
          ${formatDateTime(
            sales.created_at
          )}
        </td>

        <td>

          <div class="table-actions">

            <button
              type="button"
              class="secondary-btn small-btn"
              onclick="toggleSalesStatus('${sales.id}', '${escapeAttribute(status)}')"
            >
              ${
                status === "active"
                  ? "Deactivate"
                  : "Activate"
              }
            </button>

          </div>

        </td>

      `;


      table.appendChild(
        row
      );

    }
  );

}


/* =========================================================
   SALES MODAL
   ========================================================= */

function openSalesModal() {

  if (!isAdmin()) {
    return;
  }


  const modal =
    document.getElementById(
      "salesModal"
    );


  if (!modal) {
    return;
  }


  const name =
    document.getElementById(
      "salesName"
    );

  const username =
    document.getElementById(
      "salesUsername"
    );

  const password =
    document.getElementById(
      "salesPassword"
    );


  if (name) {
    name.value = "";
  }

  if (username) {
    username.value = "";
  }

  if (password) {
    password.value = "";
  }


  modal.style.display =
    "flex";

}


/* =========================================================
   CLOSE SALES MODAL
   ========================================================= */

function closeSalesModal() {

  const modal =
    document.getElementById(
      "salesModal"
    );


  if (modal) {

    modal.style.display =
      "none";

  }

}


/* =========================================================
   CREATE SALES
   ========================================================= */

async function createSales() {

  if (!isAdmin()) {

    alert(
      "Hanya Admin yang dapat membuat Sales."
    );

    return;

  }


  const name =
    getValue(
      "salesName"
    ).trim();


  const username =
    getValue(
      "salesUsername"
    ).trim();


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
      "Semua field wajib diisi."
    );

    return;

  }


  try {

    const {
      data,
      error
    } = await supabaseClient.functions.invoke(
      "create-sales",
      {
        body: {
          name,
          username,
          password
        }
      }
    );


    if (error) {

      console.error(
        "create-sales error:",
        error
      );

      alert(
        error.message ||
        "Sales gagal dibuat."
      );

      return;

    }


    if (
      data &&
      data.error
    ) {

      alert(
        data.error
      );

      return;

    }


    closeSalesModal();


    await loadSalesLookup();

    populateSalesDropdowns();

    await loadSalesTable();


    alert(
      "Sales berhasil dibuat."
    );


  } catch (error) {

    console.error(
      "Unexpected createSales error:",
      error
    );

    alert(
      error.message ||
      "Sales gagal dibuat."
    );

  }

}


/* =========================================================
   TOGGLE SALES STATUS
   ========================================================= */

async function toggleSalesStatus(
  id,
  currentStatus
) {

  if (!isAdmin()) {
    return;
  }


  const newStatus =
    String(
      currentStatus
    ).toLowerCase() === "active"
      ? "inactive"
      : "active";


  const confirmed =
    confirm(
      `Ubah status Sales menjadi ${newStatus}?`
    );


  if (!confirmed) {
    return;
  }


  try {

    const {
      error
    } = await supabaseClient
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
        "toggleSalesStatus error:",
        error
      );

      alert(
        error.message ||
        "Status Sales gagal diubah."
      );

      return;

    }


    await loadSalesLookup();

    populateSalesDropdowns();

    await loadSalesTable();


  } catch (error) {

    console.error(
      "Unexpected toggleSalesStatus error:",
      error
    );

  }

}


/* =========================================================
   WHATSAPP
   ========================================================= */

function getWhatsAppLink(
  phone
) {

  let clean =
    String(
      phone || ""
    )
    .replace(
      /[^\d+]/g,
      ""
    );


  if (
    clean.startsWith("+62")
  ) {

    clean =
      clean.substring(1);

  } else if (
    clean.startsWith("62")
  ) {

    /*
      already correct
    */

  } else if (
    clean.startsWith("0")
  ) {

    clean =
      "62" +
      clean.substring(1);

  }


  return (
    "https://wa.me/" +
    clean
  );

}


/* =========================================================
   SALES NAME
   ========================================================= */

function getSalesName(
  salesId
) {

  if (!salesId) {
    return "";
  }


  const sales =
    salesUsersData.find(
      user =>
        String(user.id) ===
        String(salesId)
    );


  if (!sales) {
    return "";
  }


  return (
    sales.name ||
    sales.username ||
    ""
  );

}


/* =========================================================
   NEXT STEP
   ========================================================= */

function getNextStep(
  lead
) {

  if (lead.closing) {
    return "Closing";
  }

  if (lead.spk) {
    return "SPK";
  }

  if (lead.quotation) {
    return "Quotation";
  }

  if (lead.site_survey) {
    return "Site Survey";
  }

  if (lead.appointment) {
    return "Appointment";
  }

  if (lead.follow_up_date) {
    return "Follow Up";
  }


  return "-";

}


/* =========================================================
   FORM HELPERS
   ========================================================= */

function getValue(
  id
) {

  const element =
    document.getElementById(
      id
    );


  return element
    ? element.value
    : "";

}


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
      value ??
      "";

  }

}


function setStatusValue(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );


  if (!element) {
    return;
  }


  const normalized =
    normalizeLeadStatus(
      value
    );


  const options =
    Array.from(
      element.options
    );


  const matching =
    options.find(
      option =>
        normalizeLeadStatus(
          option.value
        ) === normalized
    );


  if (matching) {

    element.value =
      matching.value;

  } else {

    element.value =
      normalized;

  }

}


/* =========================================================
   MODAL EVENTS
   ========================================================= */

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
      function (event) {

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
      function (event) {

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


/* =========================================================
   LOGOUT
   ========================================================= */

async function logout() {

  try {

    await supabaseClient.auth.signOut();

  } catch (error) {

    console.error(
      "Logout error:",
      error
    );

  }


  currentUser = null;

  currentProfile = null;

  leadsData = [];

  salesUsersData = [];

  currentPage = 1;

  totalLeadsCount = 0;


  showLogin();


  const password =
    document.getElementById(
      "loginPassword"
    );


  const message =
    document.getElementById(
      "loginMessage"
    );


  if (password) {
    password.value = "";
  }

  if (message) {
    message.textContent = "";
  }

}


/* =========================================================
   AUTH STATE CHANGE
   ========================================================= */

supabaseClient.auth.onAuthStateChange(
  async function (
    event,
    session
  ) {

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


      await loadProfile();

    }


    if (!session) {

      currentUser = null;

      currentProfile = null;

      showLogin();

    }

  }
);


/* =========================================================
   TOP SALES FILTER
   ========================================================= */

function applyTopSalesFilter(
  salesId
) {

  const filter =
    document.getElementById(
      "salesFilter"
    );


  if (filter) {

    filter.value =
      salesId || "";

  }


  loadLeads(1);

}


function updateSalesDropdownButton(
  salesName
) {

  const button =
    document.getElementById(
      "salesDropdownBtn"
    );


  if (!button) {
    return;
  }


  const span =
    button.querySelector(
      "span"
    );


  if (span) {

    span.textContent =
      salesName ||
      "Sales";

  }

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(
  value
) {

  return String(
    value ?? ""
  )
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


function escapeAttribute(
  value
) {

  return escapeHtml(
    value
  );

}


/* =========================================================
   DATE FORMAT
   ========================================================= */

function formatDate(
  value
) {

  if (!value) {
    return "-";
  }


  try {

    const date =
      new Date(
        value
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return String(
        value
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

  } catch {

    return String(
      value
    );

  }

}


function formatDateTime(
  value
) {

  if (!value) {
    return "-";
  }


  try {

    const date =
      new Date(
        value
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return String(
        value
      );

    }


    return date.toLocaleString(
      "id-ID",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }
    );

  } catch {

    return String(
      value
    );

  }

}


/* =========================================================
   WINDOW DEBUG HELPER
   ========================================================= */

/*
  Bisa dipanggil dari browser console:

  refreshDashboard()

*/

window.refreshDashboard =
  async function () {

    console.log(
      "Manual Dashboard refresh..."
    );

    await updateDashboard();

  };


/*
  Bisa dipanggil dari browser console:

  checkDashboardData()

  untuk melihat berapa data yang langsung
  dikembalikan Supabase.
*/

window.checkDashboardData =
  async function () {

    try {

      let query =
        supabaseClient
          .from("leads")
          .select(
            "id, status, appointment, site_survey, quotation, closing, sales_id"
          );


      if (isSales()) {

        query =
          query.eq(
            "sales_id",
            currentProfile?.id
          );

      }


      const {
        data,
        error
      } = await query;


      console.log(
        "CHECK DASHBOARD DATA:",
        {
          error,
          total:
            data?.length || 0,
          data
        }
      );


      return data;

    } catch (error) {

      console.error(
        "checkDashboardData error:",
        error
      );

    }

  };
