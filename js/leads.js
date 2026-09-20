// ======================================================
// CRM FSI - LEADS
// Supabase / Multi Page Version
// ======================================================

let leadsEventsBound = false;

// ======================================================
// STATUS
// ======================================================

function populateStatusOptions() {
  const selects = [$("statusFilter"), $("leadStatus")];

  selects.forEach((select, index) => {
    if (!select) return;

    const current = select.value;

    select.innerHTML = "";

    if (index === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "All Status";
      select.appendChild(option);
    }

    (CRM_CONFIG.statuses || []).forEach(status => {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = status;
      select.appendChild(option);
    });

    if ((CRM_CONFIG.statuses || []).includes(current)) {
      select.value = current;
    }
  });
}


// ======================================================
// GENERIC SELECT
// ======================================================

function populateSelect(id, values, firstText) {
  const element = $(id);
  if (!element) return;

  const current = element.value;

  element.innerHTML = "";

  const firstOption = document.createElement("option");
  firstOption.value = "";
  firstOption.textContent = firstText;
  element.appendChild(firstOption);

  [...new Set((values || []).filter(Boolean))]
    .sort((a, b) =>
      String(a).localeCompare(String(b))
    )
    .forEach(value => {
      const option = document.createElement("option");

      option.value = value;
      option.textContent = value;

      element.appendChild(option);
    });

  element.value = current;
}


// ======================================================
// SALES DROPDOWN
// ======================================================

function populateSales() {
  const filter = $("salesFilter");
  const assign = $("leadSalesAssign");

  const salesOnly = (salesUsersData || []).filter(
    user =>
      user.role === "Sales" &&
      String(user.status || "Active").toLowerCase() === "active"
  );

  // ADMIN FILTER
  if (filter) {
    filter.innerHTML = "";

    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "All Sales";

    filter.appendChild(allOption);

    salesOnly.forEach(sales => {
      const option = document.createElement("option");

      option.value = sales.id;
      option.textContent = sales.name || sales.username;

      filter.appendChild(option);
    });
  }

  // ASSIGN SALES
  if (assign) {
    assign.innerHTML = "";

    if (currentProfile?.role === "Admin") {
      const unassigned = document.createElement("option");

      unassigned.value = "";
      unassigned.textContent = "Unassigned";

      assign.appendChild(unassigned);
    }

    salesOnly.forEach(sales => {
      const option = document.createElement("option");

      option.value = sales.id;
      option.textContent = sales.name || sales.username;

      assign.appendChild(option);
    });

    // SALES hanya boleh melihat dirinya sendiri
    if (currentProfile?.role !== "Admin") {
      assign.value = currentProfile?.id || "";
    }
  }
}


// ======================================================
// LOAD SALES
// ======================================================

async function loadSalesLookup() {
  try {
    const { data, error } = await supabaseClient
      .from("sales_users")
      .select("id,name,username,role,status,created_at")
      .order("name", { ascending: true });

    if (error) {
      console.error("LOAD SALES ERROR:", error);
      salesUsersData = [];
      populateSales();
      return;
    }

    salesUsersData = data || [];

    populateSales();

  } catch (error) {
    console.error("LOAD SALES EXCEPTION:", error);
    salesUsersData = [];
    populateSales();
  }
}


// ======================================================
// FILTER OPTIONS
// ======================================================

async function loadFilterOptions() {
  if (!$("statusFilter")) return;

  populateStatusOptions();

  try {
    const { data, error } = await supabaseClient
      .from("leads")
      .select("business,location");

    if (error) {
      console.error("LOAD FILTER ERROR:", error);
      return;
    }

    const rows = data || [];

    populateSelect(
      "businessFilter",
      rows.map(row => row.business),
      "All Business"
    );

    populateSelect(
      "locationFilter",
      rows.map(row => row.location),
      "All Location"
    );

    populateSales();

  } catch (error) {
    console.error("FILTER EXCEPTION:", error);
  }
}


// ======================================================
// BUILD LEAD QUERY
// ======================================================

function buildLeadQuery() {
  const search =
    $("leadSearch")?.value.trim() || "";

  const status =
    $("statusFilter")?.value || "";

  const business =
    $("businessFilter")?.value || "";

  const location =
    $("locationFilter")?.value || "";

  const sales =
    $("salesFilter")?.value || "";

  let query = supabaseClient
    .from("leads")
    .select("*", {
      count: "exact"
    });

  // SALES hanya melihat lead miliknya
  if (currentProfile?.role !== "Admin") {
    query = query.eq(
      "sales_id",
      currentProfile.id
    );
  }

  // SEARCH
  if (search) {
    const safeSearch = search
      .replace(/[(),%]/g, " ")
      .trim();

    if (safeSearch) {
      query = query.or(
        `customer_name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%,business.ilike.%${safeSearch}%,location.ilike.%${safeSearch}%`
      );
    }
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (business) {
    query = query.eq("business", business);
  }

  if (location) {
    query = query.eq("location", location);
  }

  // ADMIN bisa filter berdasarkan Sales
  if (
    currentProfile?.role === "Admin" &&
    sales
  ) {
    query = query.eq("sales_id", sales);
  }

  return query;
}


// ======================================================
// LOAD LEADS
// ======================================================

async function loadLeads(page = 1) {
  const tbody = $("leadsTableBody");

  if (!tbody) return;

  currentPage = Math.max(1, page);

  tbody.innerHTML = `
    <tr>
      <td colspan="10" class="table-loading">
        <i class="fa-solid fa-spinner fa-spin"></i>
        Loading leads...
      </td>
    </tr>
  `;

  if ($("leadsEmptyState")) {
    $("leadsEmptyState").style.display = "none";
  }

  try {
    const from =
      (currentPage - 1) *
      CRM_CONFIG.pageSize;

    const to =
      from +
      CRM_CONFIG.pageSize -
      1;

    const {
      data,
      error,
      count
    } = await buildLeadQuery()
      .order("created_at", {
        ascending: false
      })
      .range(from, to);

    if (error) {
      throw error;
    }

    leadsData = data || [];

    totalLeadsCount = count || 0;

    console.log(
      "CRM FSI - LEADS LOADED:",
      leadsData.length,
      "of",
      totalLeadsCount
    );

    renderLeadsTable();
    renderPagination();
    updateLeadKPI();

  } catch (error) {
    console.error(
      "LOAD LEADS ERROR:",
      error
    );

    leadsData = [];
    totalLeadsCount = 0;

    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="table-error">
          ${safeText(
            error.message ||
            "Gagal memuat database Leads."
          )}
        </td>
      </tr>
    `;

    if ($("leadCountLabel")) {
      $("leadCountLabel").textContent =
        "0 leads";
    }

    showToast(
      "Database Leads gagal dimuat.",
      "error"
    );
  }
}


// ======================================================
// RENDER TABLE
// ======================================================

function renderLeadsTable() {
  const tbody = $("leadsTableBody");

  if (!tbody) return;

  if (!leadsData.length) {
    tbody.innerHTML = "";

    if ($("leadsEmptyState")) {
      $("leadsEmptyState").style.display =
        "block";
    }

    if ($("leadCountLabel")) {
      $("leadCountLabel").textContent =
        "0 leads";
    }

    return;
  }

  if ($("leadsEmptyState")) {
    $("leadsEmptyState").style.display =
      "none";
  }

  if ($("leadCountLabel")) {
    $("leadCountLabel").textContent =
      `${totalLeadsCount} leads`;
  }

  tbody.innerHTML = leadsData
    .map((lead, index) => {

      const salesName =
        getSalesName(lead.sales_id);

      const status =
        normalizeLeadStatus(
          lead.status
        );

      const encodedId =
        encodeURIComponent(
          lead.id
        );

      const rowNumber =
        (currentPage - 1) *
          CRM_CONFIG.pageSize +
        index +
        1;

      return `
        <tr>

          <td>
            ${rowNumber}
          </td>

          <td>
            <a
              class="customer-link"
              href="customer-profile.html?id=${encodedId}"
            >
              ${safeText(
                lead.customer_name
              )}
            </a>
          </td>

          <td>
            ${safeText(
              lead.business
            )}
          </td>

          <td>
            ${safeText(
              lead.location
            )}
          </td>

          <td>
            <span
              class="status-badge status-${status
                .toLowerCase()
                .replace(
                  /\\s+/g,
                  "-"
                )}"
            >
              ${safeText(status)}
            </span>
          </td>

          <td>
            ${safeText(
              salesName
            )}
          </td>

          <td>
            ${
              lead.phone
                ? `
                  <a
                    class="wa-link"
                    target="_blank"
                    rel="noopener"
                    href="${whatsappLink(
                      lead.phone
                    )}"
                  >
                    <i class="fa-brands fa-whatsapp"></i>
                    ${safeText(
                      lead.phone
                    )}
                  </a>
                `
                : "-"
            }
          </td>

          <td>
            ${formatDate(
              lead.follow_up_date
            )}
          </td>

          <td>
            ${formatDate(
              lead.created_at
            )}
          </td>

          <td>
            <div class="action-buttons">

              <a
                class="icon-btn"
                title="View"
                href="customer-profile.html?id=${encodedId}"
              >
                <i class="fa-solid fa-eye"></i>
              </a>

              <button
                type="button"
                class="icon-btn"
                title="Edit"
                onclick="editLead('${String(
                  lead.id
                ).replace(
                  /'/g,
                  "\\'"
                )}')"
              >
                <i class="fa-solid fa-pen"></i>
              </button>

              <button
                type="button"
                class="icon-btn danger"
                title="Delete"
                onclick="deleteLead('${String(
                  lead.id
                ).replace(
                  /'/g,
                  "\\'"
                )}')"
              >
                <i class="fa-solid fa-trash"></i>
              </button>

            </div>
          </td>

        </tr>
      `;
    })
    .join("");
}


// ======================================================
// PAGINATION
// SESUAI DENGAN ID DI leads.html
// ======================================================

function renderPagination() {

  const startEl =
    $("paginationStart");

  const endEl =
    $("paginationEnd");

  const totalEl =
    $("paginationTotal");

  const prevBtn =
    $("prevPageBtn");

  const nextBtn =
    $("nextPageBtn");

  const numbers =
    $("paginationNumbers");

  if (
    !startEl ||
    !endEl ||
    !totalEl ||
    !numbers
  ) {
    return;
  }

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalLeadsCount /
        CRM_CONFIG.pageSize
      )
    );

  const start =
    totalLeadsCount > 0
      ? (currentPage - 1) *
          CRM_CONFIG.pageSize +
        1
      : 0;

  const end =
    Math.min(
      currentPage *
        CRM_CONFIG.pageSize,
      totalLeadsCount
    );

  startEl.textContent = start;
  endEl.textContent = end;
  totalEl.textContent =
    totalLeadsCount;

  if (prevBtn) {
    prevBtn.disabled =
      currentPage <= 1;
  }

  if (nextBtn) {
    nextBtn.disabled =
      currentPage >= totalPages;
  }

  const maxVisible =
    Math.min(totalPages, 5);

  numbers.innerHTML =
    Array.from(
      {
        length: maxVisible
      },
      (_, index) => {

        const page =
          index + 1;

        return `
          <button
            type="button"
            class="page-number ${
              page === currentPage
                ? "active"
                : ""
            }"
            onclick="loadLeads(${page})"
          >
            ${page}
          </button>
        `;
      }
    ).join("");
}


// ======================================================
// KPI LEADS
// ======================================================

function updateLeadKPI() {
  if (!$("leadsTableBody")) return;

  const total =
    totalLeadsCount;

  const followUp =
    leadsData.filter(
      lead =>
        normalizeLeadStatus(
          lead.status
        ) === "Follow Up"
    ).length;

  const appointment =
    leadsData.filter(
      lead => !!lead.appointment
    ).length;

  const closing =
    leadsData.filter(
      lead =>
        !!lead.closing ||
        normalizeLeadStatus(
          lead.status
        ) === "Closing"
    ).length;

  if ($("kpiTotalLeads")) {
    $("kpiTotalLeads").textContent =
      total;
  }

  if ($("kpiFollowUp")) {
    $("kpiFollowUp").textContent =
      followUp;
  }

  if ($("kpiAppointment")) {
    $("kpiAppointment").textContent =
      appointment;
  }

  if ($("kpiClosing")) {
    $("kpiClosing").textContent =
      closing;
  }
}


// ======================================================
// EVENT LISTENERS
// ======================================================

function bindLeadsEvents() {

  if (leadsEventsBound) {
    return;
  }

  leadsEventsBound = true;

  $("prevPageBtn")
    ?.addEventListener(
      "click",
      () =>
        loadLeads(
          currentPage - 1
        )
    );

  $("nextPageBtn")
    ?.addEventListener(
      "click",
      () =>
        loadLeads(
          currentPage + 1
        )
    );

  $("leadSearch")
    ?.addEventListener(
      "input",
      debounce(
        () => loadLeads(1),
        400
      )
    );

  [
    "statusFilter",
    "businessFilter",
    "locationFilter",
    "salesFilter"
  ].forEach(id => {

    $(id)?.addEventListener(
      "change",
      () => loadLeads(1)
    );

  });

  $("resetFiltersBtn")
    ?.addEventListener(
      "click",
      () => {

        [
          "leadSearch",
          "statusFilter",
          "businessFilter",
          "locationFilter",
          "salesFilter"
        ].forEach(id => {

          const element = $(id);

          if (element) {
            element.value = "";
          }

        });

        loadLeads(1);
      }
    );

  $("addLeadBtn")
    ?.addEventListener(
      "click",
      () => openLeadModal()
    );

  $("exportLeadsBtn")
    ?.addEventListener(
      "click",
      exportLeads
    );
}


// ======================================================
// INITIALIZE LEADS PAGE
// ======================================================

async function initializeLeadsPage() {

  console.log(
    "CRM FSI - INITIALIZE LEADS"
  );

  if (!$("leadsTableBody")) {
    console.warn(
      "leadsTableBody tidak ditemukan."
    );
    return;
  }

  bindLeadsEvents();

  populateStatusOptions();

  await loadSalesLookup();

  await loadFilterOptions();

  await loadLeads(1);

  console.log(
    "CRM FSI - LEADS READY"
  );
}


// ======================================================
// EXPORT CSV
// ======================================================

async function exportLeads() {

  try {

    const {
      data,
      error
    } =
      await buildLeadQuery()
        .order(
          "created_at",
          {
            ascending: false
          }
        )
        .limit(5000);

    if (error) {
      throw error;
    }

    exportCSV(
      (data || []).map(lead => ({
        customer_name:
          lead.customer_name,

        phone:
          lead.phone,

        business:
          lead.business,

        location:
          lead.location,

        status:
          lead.status,

        sales:
          getSalesName(
            lead.sales_id
          ),

        follow_up_date:
          lead.follow_up_date,

        appointment:
          lead.appointment,

        site_survey:
          lead.site_survey,

        quotation:
          lead.quotation,

        spk:
          lead.spk,

        closing:
          lead.closing,

        notes:
          lead.notes,

        created_at:
          lead.created_at
      })),
      "fsi-leads.csv"
    );

    showToast(
      "Data Leads berhasil diexport."
    );

  } catch (error) {

    console.error(
      "EXPORT ERROR:",
      error
    );

    showToast(
      error.message,
      "error"
    );
  }
}


// ======================================================
// RESET FORM
// ======================================================

function resetLeadForm() {

  const form =
    $("leadForm");

  if (form) {
    form.reset();
  }

  if ($("leadId")) {
    $("leadId").value = "";
  }

  if ($("leadModalTitle")) {
    $("leadModalTitle").textContent =
      "Add Lead";
  }

  populateStatusOptions();

  populateSales();

  showFormMessage(
    "leadFormMessage",
    ""
  );
}


// ======================================================
// OPEN MODAL
// ======================================================

function openLeadModal(
  lead = null
) {

  if (!$("leadModal")) {
    return;
  }

  resetLeadForm();

  if (lead) {
    fillLeadForm(lead);
  }

  openModal("leadModal");
}


// ======================================================
// EDIT LEAD
// ======================================================

async function editLead(id) {

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
        .eq("id", id)
        .single();

    if (error) {
      showToast(
        error.message,
        "error"
      );
      return;
    }

    lead = data;
  }

  // Sales hanya boleh edit miliknya
  if (
    currentProfile?.role !== "Admin" &&
    String(lead.sales_id) !==
      String(currentProfile.id)
  ) {

    showToast(
      "Access denied.",
      "error"
    );

    return;
  }

  openLeadModal(lead);
}


// ======================================================
// FILL FORM
// ======================================================

function fillLeadForm(lead) {

  if ($("leadModalTitle")) {
    $("leadModalTitle").textContent =
      "Edit Lead";
  }

  $("leadId").value =
    lead.id || "";

  $("leadCustomerName").value =
    lead.customer_name || "";

  $("leadPhone").value =
    lead.phone || "";

  $("leadBusiness").value =
    lead.business || "";

  $("leadLocation").value =
    lead.location || "";

  $("leadStatus").value =
    normalizeLeadStatus(
      lead.status
    );

  $("leadFollowUpDate").value =
    formatDateInput(
      lead.follow_up_date
    );

  $("leadAppointment").value =
    formatDateInput(
      lead.appointment
    );

  $("leadSiteSurvey").value =
    formatDateInput(
      lead.site_survey
    );

  $("leadQuotation").value =
    formatDateInput(
      lead.quotation
    );

  $("leadSpk").value =
    formatDateInput(
      lead.spk
    );

  $("leadClosing").value =
    formatDateInput(
      lead.closing
    );

  $("leadNotes").value =
    lead.notes || "";

  populateSales();

  if (
    lead.sales_id &&
    $("leadSalesAssign")
  ) {
    $("leadSalesAssign").value =
      lead.sales_id;
  }
}


// ======================================================
// FORM PAYLOAD
// SESUAI SCHEMA LEADS
// ======================================================

function formPayload() {

  const payload = {

    customer_name:
      $("leadCustomerName")
        ?.value.trim() || "",

    phone:
      $("leadPhone")
        ?.value.trim() || null,

    business:
      $("leadBusiness")
        ?.value.trim() || null,

    location:
      $("leadLocation")
        ?.value.trim() || null,

    status:
      $("leadStatus")
        ?.value || "New",

    follow_up_date:
      $("leadFollowUpDate")
        ?.value || null,

    appointment:
      $("leadAppointment")
        ?.value || null,

    site_survey:
      $("leadSiteSurvey")
        ?.value || null,

    quotation:
      $("leadQuotation")
        ?.value || null,

    spk:
      $("leadSpk")
        ?.value || null,

    closing:
      $("leadClosing")
        ?.value || null,

    notes:
      $("leadNotes")
        ?.value.trim() || null
  };

  // Admin bebas menentukan Sales
  if (currentProfile?.role === "Admin") {

    payload.sales_id =
      $("leadSalesAssign")
        ?.value || null;

  } else {

    // Sales otomatis miliknya sendiri
    payload.sales_id =
      currentProfile?.id || null;
  }

  return payload;
}


// ======================================================
// SAVE LEAD
// ======================================================

async function saveLeadFromForm(event) {

  event.preventDefault();

  const id =
    $("leadId")?.value || "";

  const payload =
    formPayload();

  if (!payload.customer_name) {

    showFormMessage(
      "leadFormMessage",
      "Customer name wajib diisi."
    );

    return;
  }

  setButtonLoading(
    $("saveLeadBtn"),
    true,
    "Save Lead"
  );

  try {

    let result;

    if (id) {

      // UPDATE
      result =
        await supabaseClient
          .from("leads")
          .update({
            ...payload,
            updated_by:
              currentProfile?.id ||
              null
          })
          .eq("id", id);

    } else {

      // INSERT
      result =
        await supabaseClient
          .from("leads")
          .insert([
            {
              ...payload,
              created_by:
                currentProfile?.id ||
                null
            }
          ]);
    }

    if (result.error) {
      throw result.error;
    }

    closeModal("leadModal");

    showToast(
      id
        ? "Lead updated successfully."
        : "Lead added successfully."
    );

    await loadFilterOptions();

    await loadLeads(
      currentPage
    );

  } catch (error) {

    console.error(
      "SAVE LEAD ERROR:",
      error
    );

    showFormMessage(
      "leadFormMessage",
      error.message
    );

  } finally {

    setButtonLoading(
      $("saveLeadBtn"),
      false,
      "Save Lead"
    );
  }
}


// ======================================================
// DELETE
// ======================================================

async function deleteLead(id) {

  openConfirm(
    "Delete Lead",
    "Data lead ini akan dihapus. Lanjutkan?",
    async () => {

      const {
        error
      } =
        await supabaseClient
          .from("leads")
          .delete()
          .eq("id", id);

      if (error) {

        showToast(
          error.message,
          "error"
        );

        return;
      }

      showToast(
        "Lead deleted."
      );

      // Kalau halaman terakhir kosong,
      // mundur satu halaman
      const maxPage =
        Math.max(
          1,
          Math.ceil(
            (totalLeadsCount - 1) /
              CRM_CONFIG.pageSize
          )
        );

      if (
        currentPage > maxPage
      ) {
        currentPage =
          maxPage;
      }

      await loadLeads(
        currentPage
      );
    }
  );
}


// ======================================================
// CONFIRM MODAL
// ======================================================

function openConfirm(
  title,
  message,
  action
) {

  if ($("confirmTitle")) {
    $("confirmTitle").textContent =
      title;
  }

  if ($("confirmMessage")) {
    $("confirmMessage").textContent =
      message;
  }

  if ($("confirmActionBtn")) {

    $("confirmActionBtn").onclick =
      async () => {

        closeModal(
          "confirmModal"
        );

        await action();
      };
  }

  openModal(
    "confirmModal"
  );
}


// ======================================================
// FORM SUBMIT
// ======================================================

function bindLeadForm() {

  const form =
    $("leadForm");

  if (!form) return;

  if (
    form.dataset.bound === "true"
  ) {
    return;
  }

  form.dataset.bound = "true";

  form.addEventListener(
    "submit",
    saveLeadFromForm
  );
}


// ======================================================
// PUBLIC FUNCTIONS
// ======================================================

window.initializeLeadsPage =
  initializeLeadsPage;

window.loadLeads =
  loadLeads;

window.openLeadModal =
  openLeadModal;

window.editLead =
  editLead;

window.deleteLead =
  deleteLead;

window.loadSalesLookup =
  loadSalesLookup;

window.loadFilterOptions =
  loadFilterOptions;


// ======================================================
// FORM BIND
// ======================================================

bindLeadForm();
