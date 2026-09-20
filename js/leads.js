/* =========================================================
   FSI CRM - LEADS
   ========================================================= */

let leadConfirmCallback = null;
let leadSearchTimer = null;


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  initializeLeadsPage();
});


async function initializeLeadsPage() {
  try {
    populateStatusOptions();

    await loadSalesLookup();
    await loadFilterOptions();

    setupLeadsEvents();

    const params = new URLSearchParams(window.location.search);

    const search = params.get("search");

    if (search && $("leadSearch")) {
      $("leadSearch").value = search;
    }

    await loadLeads(1);

    if (params.get("add") === "1") {
      setTimeout(() => {
        openLeadModal();
      }, 200);
    }

  } catch (error) {
    console.error("initializeLeadsPage:", error);

    showToast(
      "Leads gagal dimuat: " + error.message,
      "error"
    );
  }
}


/* =========================================================
   STATUS OPTIONS
   ========================================================= */

function populateStatusOptions() {
  const select = $("statusFilter");
  const formSelect = $("leadStatus");

  if (select) {
    select.innerHTML = `
      <option value="">Semua Status</option>
      ${CRM_CONFIG.statuses.map(status => `
        <option value="${escapeHTML(status)}">
          ${escapeHTML(status)}
        </option>
      `).join("")}
    `;
  }

  if (formSelect) {
    formSelect.innerHTML = `
      <option value="">Pilih Status</option>
      ${CRM_CONFIG.statuses.map(status => `
        <option value="${escapeHTML(status)}">
          ${escapeHTML(status)}
        </option>
      `).join("")}
    `;
  }
}


/* =========================================================
   SALES LOOKUP
   ========================================================= */

async function loadSalesLookup() {
  const { data, error } = await supabaseClient
    .from(CRM_CONFIG.salesTable)
    .select("id, name, role, status")
    .order("name", { ascending: true });

  if (error) {
    console.error("loadSalesLookup:", error);
    return;
  }

  salesUsersData = data || [];

  populateSales();
}


/* =========================================================
   POPULATE SALES
   ========================================================= */

function populateSales() {
  const formSelect = $("leadSalesAssign");
  const filterSelect = $("salesFilter");

  const activeSales = (salesUsersData || []).filter(
    sales =>
      !sales.status ||
      String(sales.status).toLowerCase() === "active"
  );

  /* -------------------------------------------------------
     FORM SALES
  ------------------------------------------------------- */

  if (formSelect) {

    const currentValue = formSelect.value;

    formSelect.innerHTML = `
      <option value="">Pilih Sales</option>

      ${activeSales.map(sales => `
        <option value="${escapeHTML(sales.id)}">
          ${escapeHTML(sales.name || "Sales")}
        </option>
      `).join("")}
    `;

    if (currentValue) {
      formSelect.value = currentValue;
    }

    if (currentProfile?.role !== "Admin") {
      formSelect.value = currentProfile?.id || "";
      formSelect.disabled = true;
    } else {
      formSelect.disabled = false;
    }
  }


  /* -------------------------------------------------------
     FILTER SALES
  ------------------------------------------------------- */

  if (filterSelect) {

    const currentValue = filterSelect.value;

    filterSelect.innerHTML = `
      <option value="">Semua Sales</option>

      ${activeSales.map(sales => `
        <option value="${escapeHTML(sales.id)}">
          ${escapeHTML(sales.name || "Sales")}
        </option>
      `).join("")}
    `;

    if (currentValue) {
      filterSelect.value = currentValue;
    }
  }
}


/* =========================================================
   FILTER OPTIONS
   ========================================================= */

async function loadFilterOptions() {

  const { data, error } = await supabaseClient
    .from(CRM_CONFIG.leadTable)
    .select("business, location");

  if (error) {
    console.error("loadFilterOptions:", error);
    return;
  }

  const rows = data || [];

  const businesses = [
    ...new Set(
      rows
        .map(row => String(row.business || "").trim())
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b));

  const locations = [
    ...new Set(
      rows
        .map(row => String(row.location || "").trim())
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b));


  populateSimpleSelect(
    "businessFilter",
    "Semua Business",
    businesses
  );

  populateSimpleSelect(
    "locationFilter",
    "Semua Location",
    locations
  );
}


/* =========================================================
   SIMPLE SELECT
   ========================================================= */

function populateSimpleSelect(
  elementId,
  placeholder,
  values
) {

  const select = $(elementId);

  if (!select) return;

  select.innerHTML = `
    <option value="">
      ${escapeHTML(placeholder)}
    </option>

    ${values.map(value => `
      <option value="${escapeHTML(value)}">
        ${escapeHTML(value)}
      </option>
    `).join("")}
  `;
}


/* =========================================================
   BUILD QUERY
   ========================================================= */

function buildLeadQuery() {

  let query = supabaseClient
    .from(CRM_CONFIG.leadTable)
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
        appointment,
        site_survey,
        quotation,
        spk,
        closing,
        notes,
        created_at,
        sales_id,
        created_by,
        updated_by
      `,
      {
        count: "exact"
      }
    );


  /* -------------------------------------------------------
     SALES ROLE
  ------------------------------------------------------- */

  if (
    currentProfile &&
    currentProfile.role !== "Admin"
  ) {

    query = query.eq(
      "sales_id",
      currentProfile.id
    );

  }


  /* -------------------------------------------------------
     SEARCH
  ------------------------------------------------------- */

  const search =
    $("leadSearch")?.value.trim() || "";

  if (search) {

    const safeSearch =
      search.replace(/[%_]/g, "");

    query = query.or(
      `customer_name.ilike.%${safeSearch}%,` +
      `phone.ilike.%${safeSearch}%,` +
      `email.ilike.%${safeSearch}%,` +
      `business.ilike.%${safeSearch}%,` +
      `location.ilike.%${safeSearch}%`
    );

  }


  /* -------------------------------------------------------
     STATUS
  ------------------------------------------------------- */

  const status =
    $("statusFilter")?.value || "";

  if (status) {
    query = query.eq("status", status);
  }


  /* -------------------------------------------------------
     BUSINESS
  ------------------------------------------------------- */

  const business =
    $("businessFilter")?.value || "";

  if (business) {
    query = query.eq("business", business);
  }


  /* -------------------------------------------------------
     LOCATION
  ------------------------------------------------------- */

  const location =
    $("locationFilter")?.value || "";

  if (location) {
    query = query.eq("location", location);
  }


  /* -------------------------------------------------------
     ADMIN SALES FILTER
  ------------------------------------------------------- */

  if (
    currentProfile?.role === "Admin"
  ) {

    const salesId =
      $("salesFilter")?.value || "";

    if (salesId) {
      query = query.eq("sales_id", salesId);
    }

  }


  return query;
}


/* =========================================================
   LOAD LEADS
   ========================================================= */

async function loadLeads(page = 1) {

  currentPage = page;

  const tableBody = $("leadsTableBody");
  const emptyState = $("leadsEmptyState");

  if (!tableBody) return;


  try {

    setGlobalLoading(true);


    const pageSize =
      CRM_CONFIG.pageSize || 20;

    const from =
      (page - 1) * pageSize;

    const to =
      from + pageSize - 1;


    const query =
      buildLeadQuery()
        .order(
          "created_at",
          {
            ascending: false
          }
        )
        .range(from, to);


    const {
      data,
      error,
      count
    } = await query;


    if (error) {
      throw error;
    }


    leadsData = data || [];

    totalLeadsCount =
      count || 0;


    renderLeadsTable(
      leadsData,
      from
    );

    updateLeadCount(
      totalLeadsCount
    );

    renderPagination(
      totalLeadsCount,
      page,
      pageSize
    );


  } catch (error) {

    console.error("loadLeads:", error);

    tableBody.innerHTML = "";

    if (emptyState) {
      emptyState.style.display = "block";
      emptyState.innerHTML = `
        <i class="fa-solid fa-circle-exclamation"></i>

        <h3>
          Gagal memuat data
        </h3>

        <p>
          ${escapeHTML(error.message || "Terjadi kesalahan.")}
        </p>
      `;
    }

    showToast(
      "Gagal memuat leads: " +
      error.message,
      "error"
    );

  } finally {

    setGlobalLoading(false);

  }
}


/* =========================================================
   UPDATE LEAD COUNT
   ========================================================= */

function updateLeadCount(total) {

  const label =
    $("leadCountLabel");

  if (!label) return;

  label.textContent =
    `${Number(total || 0).toLocaleString("id-ID")} leads`;
}


/* =========================================================
   RENDER TABLE
   ========================================================= */

function renderLeadsTable(
  data,
  startIndex = 0
) {

  const tableBody =
    $("leadsTableBody");

  const emptyState =
    $("leadsEmptyState");


  if (!tableBody) return;


  if (!data.length) {

    tableBody.innerHTML = "";

    if (emptyState) {
      emptyState.style.display = "block";
    }

    return;

  }


  if (emptyState) {
    emptyState.style.display = "none";
  }


  tableBody.innerHTML =
    data.map((lead, index) => {

      const rowNumber =
        startIndex + index + 1;


      const customerName =
        lead.customer_name || "-";


      const customerId =
        String(lead.id || "");


      const salesName =
        getSalesNameById(
          lead.sales_id
        );


      const status =
        normalizeLeadStatus(
          lead.status
        );


      const statusClass =
        status
          .toLowerCase()
          .replace(/\s+/g, "-");


      const safeId =
        escapeHTML(customerId);


      return `

        <tr>

          <!-- NO -->
          <td class="col-no">
            ${rowNumber}
          </td>


          <!-- CUSTOMER -->
          <td class="col-customer">

            <button
              type="button"
              class="customer-name-link"
              onclick="openCustomerProfile('${safeId}')"
              title="Buka Customer Profile"
            >
              ${escapeHTML(customerName)}
            </button>

          </td>


          <!-- BUSINESS -->
          <td>
            ${escapeHTML(
              lead.business || "-"
            )}
          </td>


          <!-- LOCATION -->
          <td>
            ${escapeHTML(
              lead.location || "-"
            )}
          </td>


          <!-- STATUS -->
          <td>

            <span
              class="status-badge status-${statusClass}"
            >
              ${escapeHTML(status || "-")}
            </span>

          </td>


          <!-- SALES -->
          <td>

            <span class="sales-cell">

              ${escapeHTML(
                salesName || "-"
              )}

            </span>

          </td>


          <!-- PHONE -->
          <td>

            ${
              lead.phone
                ? `
                  <a
                    href="${whatsappLink(lead.phone)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="phone-link"
                    title="Open WhatsApp"
                  >
                    ${escapeHTML(lead.phone)}
                  </a>
                `
                : "-"
            }

          </td>


          <!-- FOLLOW UP -->
          <td>

            ${
              lead.follow_up_date
                ? formatDate(lead.follow_up_date)
                : "-"
            }

          </td>


          <!-- CREATED -->
          <td>

            ${
              lead.created_at
                ? formatDate(lead.created_at)
                : "-"
            }

          </td>


          <!-- ACTION -->
          <td class="col-action">

            <div class="table-actions">

              <button
                type="button"
                class="table-action-btn"
                title="Customer Profile"
                onclick="openCustomerProfile('${safeId}')"
              >
                <i class="fa-solid fa-eye"></i>
              </button>


              <button
                type="button"
                class="table-action-btn"
                title="Edit Lead"
                onclick="editLead('${safeId}')"
              >
                <i class="fa-solid fa-pen"></i>
              </button>


              <button
                type="button"
                class="table-action-btn danger"
                title="Delete Lead"
                onclick="deleteLead('${safeId}')"
              >
                <i class="fa-solid fa-trash"></i>
              </button>

            </div>

          </td>

        </tr>

      `;

    }).join("");
}


/* =========================================================
   GET SALES NAME
   ========================================================= */

function getSalesNameById(id) {

  if (!id) {

    if (
      currentProfile?.role !== "Admin"
    ) {
      return currentProfile?.name || "-";
    }

    return "-";
  }


  const sales =
    (salesUsersData || []).find(
      item =>
        String(item.id) === String(id)
    );


  if (sales?.name) {
    return sales.name;
  }


  if (
    currentProfile &&
    String(currentProfile.id) === String(id)
  ) {
    return currentProfile.name || "-";
  }


  return "-";
}


/* =========================================================
   PAGINATION
   ========================================================= */

function renderPagination(
  total,
  page,
  pageSize
) {

  const pagination =
    $("leadsPagination");

  const info =
    $("paginationInfo");

  const numbers =
    $("paginationNumbers");

  const prev =
    $("prevPageBtn");

  const next =
    $("nextPageBtn");


  if (!pagination) return;


  const totalPages =
    Math.max(
      1,
      Math.ceil(
        total / pageSize
      )
    );


  if (info) {

    const start =
      total === 0
        ? 0
        : ((page - 1) * pageSize) + 1;

    const end =
      Math.min(
        page * pageSize,
        total
      );


    info.textContent =
      `Showing ${start}-${end} of ${total}`;

  }


  if (prev) {

    prev.disabled =
      page <= 1;

  }


  if (next) {

    next.disabled =
      page >= totalPages;

  }


  if (numbers) {

    numbers.innerHTML =
      buildPaginationNumbers(
        page,
        totalPages
      );

  }


  pagination.style.display =
    total > 0
      ? "flex"
      : "none";
}


/* =========================================================
   PAGINATION NUMBERS
   ========================================================= */

function buildPaginationNumbers(
  current,
  totalPages
) {

  if (totalPages <= 1) {
    return `
      <button
        type="button"
        class="pagination-number active"
      >
        1
      </button>
    `;
  }


  const pages = [];


  pages.push(1);


  if (current > 3) {
    pages.push("...");
  }


  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(totalPages - 1, current + 1);
    i++
  ) {
    pages.push(i);
  }


  if (current < totalPages - 2) {
    pages.push("...");
  }


  if (totalPages > 1) {
    pages.push(totalPages);
  }


  return pages.map(page => {

    if (page === "...") {

      return `
        <span class="pagination-dots">
          ...
        </span>
      `;

    }


    return `
      <button
        type="button"
        class="pagination-number ${
          page === current
            ? "active"
            : ""
        }"
        onclick="loadLeads(${page})"
      >
        ${page}
      </button>
    `;

  }).join("");
}


/* =========================================================
   EVENTS
   ========================================================= */

function setupLeadsEvents() {

  $("addLeadBtn")?.addEventListener(
    "click",
    () => openLeadModal()
  );


  $("exportLeadsBtn")?.addEventListener(
    "click",
    exportLeadsCSV
  );


  $("resetFiltersBtn")?.addEventListener(
    "click",
    resetFilters
  );


  $("prevPageBtn")?.addEventListener(
    "click",
    () => {

      if (currentPage > 1) {
        loadLeads(
          currentPage - 1
        );
      }

    }
  );


  $("nextPageBtn")?.addEventListener(
    "click",
    () => {

      const pageSize =
        CRM_CONFIG.pageSize || 20;

      const totalPages =
        Math.ceil(
          totalLeadsCount /
          pageSize
        );

      if (
        currentPage <
        totalPages
      ) {
        loadLeads(
          currentPage + 1
        );
      }

    }
  );


  $("leadForm")?.addEventListener(
    "submit",
    handleLeadSubmit
  );


  /* -------------------------------------------------------
     SEARCH
  ------------------------------------------------------- */

  $("leadSearch")?.addEventListener(
    "input",
    () => {

      clearTimeout(
        leadSearchTimer
      );

      leadSearchTimer =
        setTimeout(
          () => loadLeads(1),
          400
        );

    }
  );


  /* -------------------------------------------------------
     FILTERS
  ------------------------------------------------------- */

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

}


/* =========================================================
   RESET FILTERS
   ========================================================= */

function resetFilters() {

  if ($("leadSearch")) {
    $("leadSearch").value = "";
  }

  if ($("statusFilter")) {
    $("statusFilter").value = "";
  }

  if ($("businessFilter")) {
    $("businessFilter").value = "";
  }

  if ($("locationFilter")) {
    $("locationFilter").value = "";
  }

  if ($("salesFilter")) {
    $("salesFilter").value = "";
  }

  loadLeads(1);
}


/* =========================================================
   OPEN LEAD MODAL
   ========================================================= */

function openLeadModal(id = null) {

  const modal =
    $("leadModal");

  if (!modal) return;


  populateStatusOptions();
  populateSales();


  resetLeadForm();


  if (id) {

    const lead =
      leadsData.find(
        item =>
          String(item.id) === String(id)
      );

    if (lead) {
      fillLeadForm(lead);
    }

  } else {

    $("leadModalTitle").textContent =
      "Tambah Lead";

    $("leadId").value = "";

    if (
      currentProfile?.role !== "Admin"
    ) {

      $("leadSalesAssign").value =
        currentProfile?.id || "";

      $("leadSalesAssign").disabled =
        true;

    }

  }


  openModal("leadModal");
}


/* =========================================================
   CLOSE LEAD MODAL
   ========================================================= */

function closeLeadModal() {
  closeModal("leadModal");
}


/* =========================================================
   RESET FORM
   ========================================================= */

function resetLeadForm() {

  const form =
    $("leadForm");

  if (form) {
    form.reset();
  }


  if ($("leadId")) {
    $("leadId").value = "";
  }


  if ($("leadFormMessage")) {

    $("leadFormMessage").style.display =
      "none";

    $("leadFormMessage").textContent =
      "";

  }


  if ($("leadModalTitle")) {

    $("leadModalTitle").textContent =
      "Tambah Lead";

  }


  if ($("leadSalesAssign")) {

    $("leadSalesAssign").disabled =
      currentProfile?.role !== "Admin";

    if (
      currentProfile?.role !== "Admin"
    ) {

      $("leadSalesAssign").value =
        currentProfile?.id || "";

    }

  }

}


/* =========================================================
   FILL FORM
   ========================================================= */

function fillLeadForm(lead) {

  $("leadModalTitle").textContent =
    "Edit Lead";


  $("leadId").value =
    lead.id || "";


  $("leadCustomerName").value =
    lead.customer_name || "";


  $("leadPhone").value =
    lead.phone || "";


  $("leadEmail").value =
    lead.email || "";


  $("leadBusiness").value =
    lead.business || "";


  $("leadLocation").value =
    lead.location || "";


  $("leadStatus").value =
    lead.status || "";


  $("leadFollowUpDate").value =
    formatDateInput(lead.follow_up_date);


  $("leadAppointment").value =
    formatDateInput(lead.appointment);


  $("leadSiteSurvey").value =
    formatDateInput(lead.site_survey);


  $("leadQuotation").value =
    formatDateInput(lead.quotation);


  $("leadSpk").value =
    formatDateInput(lead.spk);


  $("leadClosing").value =
    formatDateInput(lead.closing);


  $("leadNotes").value =
    lead.notes || "";


  if ($("leadSalesAssign")) {

    $("leadSalesAssign").value =
      lead.sales_id || currentProfile?.id || "";


    $("leadSalesAssign").disabled =
      currentProfile?.role !== "Admin";

  }

}


/* =========================================================
   FORM PAYLOAD
   ========================================================= */

function getLeadFormPayload() {

  const payload = {

    customer_name:
      $("leadCustomerName")?.value.trim() || null,

    phone:
      $("leadPhone")?.value.trim() || null,

    email:
      $("leadEmail")?.value.trim() || null,

    business:
      $("leadBusiness")?.value.trim() || null,

    location:
      $("leadLocation")?.value.trim() || null,

    status:
      $("leadStatus")?.value || null,

    follow_up_date:
      $("leadFollowUpDate")?.value || null,

    appointment:
      $("leadAppointment")?.value || null,

    site_survey:
      $("leadSiteSurvey")?.value || null,

    quotation:
      $("leadQuotation")?.value || null,

    spk:
      $("leadSpk")?.value || null,

    closing:
      $("leadClosing")?.value || null,

    notes:
      $("leadNotes")?.value.trim() || null,

    sales_id:
      currentProfile?.role === "Admin"
        ? ($("leadSalesAssign")?.value || null)
        : currentProfile?.id || null

  };


  return payload;
}


/* =========================================================
   SAVE LEAD
   ========================================================= */

async function handleLeadSubmit(event) {

  event.preventDefault();


  const saveButton =
    $("saveLeadBtn");

  const message =
    $("leadFormMessage");


  try {

    setButtonLoading(
      saveButton,
      true,
      "Menyimpan..."
    );


    const leadId =
      $("leadId")?.value || "";


    const payload =
      getLeadFormPayload();


    if (!payload.customer_name) {

      throw new Error(
        "Nama customer wajib diisi."
      );

    }


    let result;


    /* -----------------------------------------------------
       UPDATE
    ----------------------------------------------------- */

    if (leadId) {

      const updatePayload = {
        ...payload,
        updated_by:
          currentUser?.id || null
      };


      result =
        await supabaseClient
          .from(CRM_CONFIG.leadTable)
          .update(updatePayload)
          .eq("id", leadId)
          .select()
          .single();

    }


    /* -----------------------------------------------------
       INSERT
    ----------------------------------------------------- */

    else {

      const insertPayload = {
        ...payload,
        created_by:
          currentUser?.id || null,
        updated_by:
          currentUser?.id || null
      };


      result =
        await supabaseClient
          .from(CRM_CONFIG.leadTable)
          .insert(insertPayload)
          .select()
          .single();

    }


    if (result.error) {
      throw result.error;
    }


    closeLeadModal();


    showToast(
      leadId
        ? "Lead berhasil diperbarui."
        : "Lead berhasil ditambahkan.",
      "success"
    );


    await loadLeads(
      leadId
        ? currentPage
        : 1
    );


  } catch (error) {

    console.error(
      "handleLeadSubmit:",
      error
    );


    if (message) {

      message.style.display =
        "block";

      message.textContent =
        error.message ||
        "Gagal menyimpan lead.";

    }


    showToast(
      error.message ||
      "Gagal menyimpan lead.",
      "error"
    );

  } finally {

    setButtonLoading(
      saveButton,
      false
    );

  }

}


/* =========================================================
   EDIT LEAD
   ========================================================= */

function editLead(id) {

  if (!id) return;

  openLeadModal(id);
}


/* =========================================================
   DELETE LEAD
   ========================================================= */

function deleteLead(id) {

  if (!id) return;


  leadConfirmCallback =
    async () => {

      try {

        setGlobalLoading(true);


        const {
          error
        } =
          await supabaseClient
            .from(CRM_CONFIG.leadTable)
            .delete()
            .eq("id", id);


        if (error) {
          throw error;
        }


        closeModal(
          "confirmModal"
        );


        showToast(
          "Lead berhasil dihapus.",
          "success"
        );


        await loadLeads(
          currentPage
        );


      } catch (error) {

        console.error(
          "deleteLead:",
          error
        );


        showToast(
          "Gagal menghapus lead: " +
          error.message,
          "error"
        );

      } finally {

        setGlobalLoading(false);

      }

    };


  openConfirm(
    "Hapus Lead?",
    "Data customer ini akan dihapus dan tidak dapat dikembalikan."
  );

}


/* =========================================================
   OPEN CONFIRM
   ========================================================= */

function openConfirm(
  title,
  message,
  callback = null
) {

  const modal =
    $("confirmModal");

  const titleElement =
    $("confirmTitle");

  const messageElement =
    $("confirmMessage");

  const actionButton =
    $("confirmActionBtn");


  if (!modal) return;


  if (titleElement) {
    titleElement.textContent =
      title || "Konfirmasi";
  }


  if (messageElement) {
    messageElement.textContent =
      message || "Apakah Anda yakin?";
  }


  leadConfirmCallback =
    callback || leadConfirmCallback;


  if (actionButton) {

    actionButton.onclick =
      async () => {

        if (
          typeof leadConfirmCallback ===
          "function"
        ) {

          await leadConfirmCallback();

          leadConfirmCallback =
            null;

        }

      };

  }


  openModal(
    "confirmModal"
  );

}


/* =========================================================
   EXPORT CSV
   ========================================================= */

function exportLeadsCSV() {

  if (!leadsData.length) {

    showToast(
      "Tidak ada data pada halaman ini untuk diexport.",
      "warning"
    );

    return;

  }


  const rows =
    leadsData.map(lead => ({

      No:
        lead.id,

      Customer:
        lead.customer_name || "",

      Phone:
        lead.phone || "",

      Email:
        lead.email || "",

      Business:
        lead.business || "",

      Location:
        lead.location || "",

      Status:
        normalizeLeadStatus(
          lead.status
        ),

      Sales:
        getSalesNameById(
          lead.sales_id
        ),

      "Follow Up":
        lead.follow_up_date || "",

      Appointment:
        lead.appointment || "",

      "Site Survey":
        lead.site_survey || "",

      Quotation:
        lead.quotation || "",

      SPK:
        lead.spk || "",

      Closing:
        lead.closing || "",

      Notes:
        lead.notes || "",

      Created:
        lead.created_at || ""

    }));


  exportCSV(
    rows,
    "fsi-crm-leads.csv"
  );

}
