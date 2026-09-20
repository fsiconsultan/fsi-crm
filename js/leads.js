```javascript
// ========================================
// CRM FSI - LEADS MANAGEMENT
// ========================================

document.addEventListener("DOMContentLoaded", () => {
  initializeLeadsPage();
});

async function initializeLeadsPage() {
  populateStatusOptions();

  await loadSalesLookup();
  await loadFilterOptions();
  await loadLeads(1);

  setupLeadsEvents();
}


// ========================================
// STATUS OPTIONS
// ========================================

function populateStatusOptions() {
  const selects = [
    $("statusFilter"),
    $("leadStatus")
  ];

  selects.forEach((select) => {
    if (!select) return;

    select.innerHTML = "";

    if (select.id === "statusFilter") {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "All Status";
      select.appendChild(option);
    }

    CRM_CONFIG.statuses.forEach((status) => {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = status;
      select.appendChild(option);
    });
  });
}


// ========================================
// GENERIC SELECT
// ========================================

function populateSelect(id, values, first = "") {
  const select = $(id);

  if (!select) return;

  select.innerHTML = "";

  if (first) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = first;
    select.appendChild(option);
  }

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}


// ========================================
// LOAD SALES
// ========================================

async function populateSales() {
  const salesSelect = $("leadSalesAssign");

  if (!salesSelect) return;

  salesSelect.innerHTML = "";

  if (currentProfile?.role === "Admin") {
    const emptyOption = document.createElement("option");

    emptyOption.value = "";
    emptyOption.textContent = "Select Sales";

    salesSelect.appendChild(emptyOption);

    salesUsersData
      .filter((sales) => sales.status === "Active")
      .forEach((sales) => {
        const option = document.createElement("option");

        option.value = sales.id;
        option.textContent = sales.name;

        salesSelect.appendChild(option);
      });

  } else {

    const option = document.createElement("option");

    option.value = currentProfile.id;
    option.textContent = currentProfile.name;

    salesSelect.appendChild(option);

    salesSelect.value = currentProfile.id;
    salesSelect.disabled = true;
  }
}


// ========================================
// LOAD SALES LOOKUP
// ========================================

async function loadSalesLookup() {
  try {
    const { data, error } =
      await supabaseClient
        .from(CRM_CONFIG.salesTable)
        .select(
          "id,name,username,role,status,created_at"
        )
        .order("name", {
          ascending: true
        });

    if (error) throw error;

    salesUsersData = data || [];

    await populateSales();

  } catch (error) {

    console.error(
      "loadSalesLookup:",
      error
    );

    showToast(
      "Gagal memuat data Sales.",
      "error"
    );
  }
}


// ========================================
// LOAD FILTER OPTIONS
// ========================================

async function loadFilterOptions() {
  try {

    const { data, error } =
      await supabaseClient
        .from(CRM_CONFIG.leadTable)
        .select("business,location");

    if (error) throw error;

    const rows = data || [];

    const businesses = [
      ...new Set(
        rows
          .map((row) => row.business)
          .filter(Boolean)
      )
    ].sort();

    const locations = [
      ...new Set(
        rows
          .map((row) => row.location)
          .filter(Boolean)
      )
    ].sort();

    populateSelect(
      "businessFilter",
      businesses,
      "All Business"
    );

    populateSelect(
      "locationFilter",
      locations,
      "All Location"
    );

  } catch (error) {

    console.error(
      "loadFilterOptions:",
      error
    );
  }
}


// ========================================
// BUILD LEAD QUERY
// ========================================

function buildLeadQuery() {

  let query =
    supabaseClient
      .from(CRM_CONFIG.leadTable)
      .select("*", {
        count: "exact"
      });


  // SALES ONLY SEE OWN LEADS

  if (
    currentProfile?.role !== "Admin"
  ) {
    query =
      query.eq(
        "sales_id",
        currentProfile.id
      );
  }


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


  // SEARCH

  if (search) {

    const safeSearch =
      search
        .replace(/[%(),]/g, " ")
        .trim();

    if (safeSearch) {

      query =
        query.or(
          [
            `customer_name.ilike.%${safeSearch}%`,
            `phone.ilike.%${safeSearch}%`,
            `business.ilike.%${safeSearch}%`,
            `location.ilike.%${safeSearch}%`
          ].join(",")
        );
    }
  }


  // STATUS

  if (status) {
    query =
      query.eq(
        "status",
        status
      );
  }


  // BUSINESS

  if (business) {
    query =
      query.eq(
        "business",
        business
      );
  }


  // LOCATION

  if (location) {
    query =
      query.eq(
        "location",
        location
      );
  }


  // ADMIN SALES FILTER

  if (
    currentProfile?.role === "Admin" &&
    sales
  ) {
    query =
      query.eq(
        "sales_id",
        sales
      );
  }


  return query;
}


// ========================================
// LOAD LEADS
// ========================================

async function loadLeads(page = 1) {

  try {

    currentPage = page;

    const from =
      (currentPage - 1) *
      CRM_CONFIG.pageSize;

    const to =
      from +
      CRM_CONFIG.pageSize -
      1;

    let query =
      buildLeadQuery();

    query =
      query
        .order("created_at", {
          ascending: false
        })
        .range(from, to);


    const {
      data,
      error,
      count
    } = await query;


    if (error) throw error;


    leadsData =
      data || [];

    totalLeadsCount =
      count || 0;


    renderLeadsTable();

    renderPagination();

    updateLeadCount();


  } catch (error) {

    console.error(
      "loadLeads:",
      error
    );

    showToast(
      "Gagal memuat data leads.",
      "error"
    );
  }
}


// ========================================
// UPDATE LEAD COUNT
// ========================================

function updateLeadCount() {

  const element =
    $("leadCountLabel") ||
    $("leadCount");

  if (!element) return;

  element.textContent =
    `${totalLeadsCount} leads`;
}


// ========================================
// RENDER LEADS TABLE
// ========================================

function renderLeadsTable() {

  const tbody =
    $("leadsTableBody");

  if (!tbody) return;

  tbody.innerHTML = "";


  if (!leadsData.length) {

    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="empty-state">
          Tidak ada data leads.
        </td>
      </tr>
    `;

    return;
  }


  leadsData.forEach(
    (lead, index) => {

      const row =
        document.createElement("tr");


      const status =
        lead.status || "New";


      const statusClass =
        status
          .toLowerCase()
          .replace(/\s+/g, "-");


      const sales =
        salesUsersData.find(
          (user) =>
            String(user.id) ===
            String(lead.sales_id)
        );


      const rowNumber =
        (
          (currentPage - 1) *
          CRM_CONFIG.pageSize
        ) +
        index +
        1;


      row.innerHTML = `

        <!-- NO -->

        <td class="col-no">
          ${rowNumber}
        </td>


        <!-- CUSTOMER -->

        <td class="col-customer">

          <button
            type="button"
            class="customer-name-link"
            data-customer-id="${escapeHTML(
              String(lead.id)
            )}"
            title="Buka Customer Profile"
          >
            ${escapeHTML(
              lead.customer_name || "-"
            )}
          </button>

        </td>


        <!-- BUSINESS -->

        <td class="col-business">

          ${escapeHTML(
            lead.business || "-"
          )}

        </td>


        <!-- LOCATION -->

        <td class="col-location">

          ${escapeHTML(
            lead.location || "-"
          )}

        </td>


        <!-- STATUS -->

        <td class="col-status">

          <span
            class="status status-${statusClass}"
          >
            ${escapeHTML(status)}
          </span>

        </td>


        <!-- SALES -->

        <td class="col-sales">

          ${escapeHTML(
            sales?.name || "-"
          )}

        </td>


        <!-- PHONE -->

        <td class="col-phone">

          ${escapeHTML(
            lead.phone || "-"
          )}

        </td>


        <!-- FOLLOW UP -->

        <td class="col-followup">

          ${formatDate(
            lead.follow_up_date
          )}

        </td>


        <!-- CREATED -->

        <td class="col-created">

          ${formatDate(
            lead.created_at
          )}

        </td>


        <!-- ACTION -->

        <td class="col-actions">

          <div class="table-actions">

            <button
              type="button"
              class="btn btn-sm btn-secondary"
              onclick="editLead('${escapeHTML(
                String(lead.id)
              )}')"
            >
              <i class="fa-solid fa-pen"></i>
              Edit
            </button>


            <button
              type="button"
              class="btn btn-sm btn-danger"
              onclick="deleteLead('${escapeHTML(
                String(lead.id)
              )}')"
            >
              <i class="fa-solid fa-trash"></i>
              Delete
            </button>

          </div>

        </td>

      `;


      tbody.appendChild(row);
    }
  );


  setupCustomerProfileLinks();
}


// ========================================
// CUSTOMER PROFILE LINK
// ========================================

function setupCustomerProfileLinks() {

  const buttons =
    document.querySelectorAll(
      ".customer-name-link"
    );


  buttons.forEach(
    (button) => {

      button.addEventListener(
        "click",
        () => {

          const customerId =
            button.dataset.customerId;


          if (!customerId) {

            showToast(
              "Customer ID tidak ditemukan.",
              "error"
            );

            return;
          }


          openCustomerProfile(
            customerId
          );
        }
      );
    }
  );
}


// ========================================
// OPEN CUSTOMER PROFILE
// ========================================

function openCustomerProfile(id) {

  if (!id) {

    showToast(
      "Customer ID tidak ditemukan.",
      "error"
    );

    return;
  }


  window.location.href =
    "customer-profile.html?id=" +
    encodeURIComponent(id);
}


window.openCustomerProfile =
  openCustomerProfile;

window.crmOpenCustomerProfile =
  openCustomerProfile;


// ========================================
// PAGINATION
// ========================================

function renderPagination() {

  const container =
    $("paginationNumbers") ||
    $("pagination");

  if (!container) return;


  const totalPages =
    Math.ceil(
      totalLeadsCount /
      CRM_CONFIG.pageSize
    );


  const previousButton =
    $("prevPageBtn");

  const nextButton =
    $("nextPageBtn");


  if (previousButton) {

    previousButton.disabled =
      currentPage <= 1;

    previousButton.onclick =
      () => {

        if (currentPage > 1) {
          loadLeads(
            currentPage - 1
          );
        }
      };
  }


  if (nextButton) {

    nextButton.disabled =
      currentPage >= totalPages;

    nextButton.onclick =
      () => {

        if (
          currentPage <
          totalPages
        ) {
          loadLeads(
            currentPage + 1
          );
        }
      };
  }


  container.innerHTML = "";


  if (totalPages <= 1) {
    return;
  }


  const maxVisiblePages = 5;


  let startPage =
    Math.max(
      1,
      currentPage -
        Math.floor(
          maxVisiblePages / 2
        )
    );


  let endPage =
    Math.min(
      totalPages,
      startPage +
        maxVisiblePages -
        1
    );


  if (
    endPage -
      startPage +
      1 <
    maxVisiblePages
  ) {

    startPage =
      Math.max(
        1,
        endPage -
          maxVisiblePages +
          1
      );
  }


  for (
    let page = startPage;
    page <= endPage;
    page++
  ) {

    const button =
      document.createElement(
        "button"
      );

    button.className =
      "pagination-btn";

    button.textContent =
      page;


    if (
      page === currentPage
    ) {
      button.classList.add(
        "active"
      );
    }


    button.addEventListener(
      "click",
      () => {
        loadLeads(page);
      }
    );


    container.appendChild(
      button
    );
  }


  const paginationInfo =
    $("paginationInfo");

  if (paginationInfo) {

    const from =
      totalLeadsCount === 0
        ? 0
        : (
            (currentPage - 1) *
            CRM_CONFIG.pageSize
          ) + 1;

    const to =
      Math.min(
        currentPage *
          CRM_CONFIG.pageSize,
        totalLeadsCount
      );

    paginationInfo.textContent =
      `${from}–${to} of ${totalLeadsCount}`;
  }
}


// ========================================
// EVENTS
// ========================================

function setupLeadsEvents() {

  let searchTimer;


  // SEARCH

  $("leadSearch")?.addEventListener(
    "input",
    () => {

      clearTimeout(
        searchTimer
      );

      searchTimer =
        setTimeout(
          () => {
            loadLeads(1);
          },
          400
        );
    }
  );


  // FILTERS

  [
    "statusFilter",
    "businessFilter",
    "locationFilter",
    "salesFilter"
  ].forEach(
    (id) => {

      $(id)?.addEventListener(
        "change",
        () => {
          loadLeads(1);
        }
      );
    }
  );


  // RESET FILTER

  $("resetFiltersBtn")?.addEventListener(
    "click",
    () => {

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
  );


  // ADD LEAD

  $("addLeadBtn")?.addEventListener(
    "click",
    () => {
      openLeadModal();
    }
  );


  // EXPORT

  $("exportLeadsBtn")?.addEventListener(
    "click",
    exportLeadsCSV
  );


  // FORM SUBMIT

  $("leadForm")?.addEventListener(
    "submit",
    handleLeadSubmit
  );
}


// ========================================
// OPEN LEAD MODAL
// ========================================

function openLeadModal(lead = null) {

  const modal =
    $("leadModal");

  if (!modal) return;


  resetLeadForm();


  if (lead) {

    $("leadModalTitle").textContent =
      "Edit Lead";

    fillLeadForm(lead);

  } else {

    $("leadModalTitle").textContent =
      "Add New Lead";
  }


  modal.classList.add("active");

  modal.style.display =
    "flex";
}


// ========================================
// CLOSE LEAD MODAL
// ========================================

function closeLeadModal() {

  const modal =
    $("leadModal");

  if (!modal) return;

  modal.classList.remove(
    "active"
  );

  modal.style.display =
    "none";
}


// ========================================
// RESET FORM
// ========================================

function resetLeadForm() {

  const form =
    $("leadForm");

  if (!form) return;


  form.reset();


  const idField =
    $("leadId");

  if (idField) {
    idField.value = "";
  }


  if ($("leadStatus")) {
    $("leadStatus").value =
      "New";
  }


  if (
    currentProfile?.role !== "Admin" &&
    $("leadSalesAssign")
  ) {

    $("leadSalesAssign").value =
      currentProfile.id;

    $("leadSalesAssign").disabled =
      true;
  }
}


// ========================================
// EDIT LEAD
// ========================================

async function editLead(id) {

  try {

    const { data, error } =
      await supabaseClient
        .from(CRM_CONFIG.leadTable)
        .select("*")
        .eq("id", id)
        .single();


    if (error) throw error;


    if (!data) {

      showToast(
        "Data lead tidak ditemukan.",
        "error"
      );

      return;
    }


    if (
      currentProfile?.role !== "Admin" &&
      String(data.sales_id) !==
        String(currentProfile.id)
    ) {

      showToast(
        "Anda tidak memiliki akses ke lead ini.",
        "error"
      );

      return;
    }


    openLeadModal(data);


  } catch (error) {

    console.error(
      "editLead:",
      error
    );

    showToast(
      "Gagal membuka data lead.",
      "error"
    );
  }
}


// ========================================
// FILL FORM
// ========================================

function fillLeadForm(lead) {

  if ($("leadId")) {
    $("leadId").value =
      lead.id || "";
  }

  if ($("leadCustomerName")) {
    $("leadCustomerName").value =
      lead.customer_name || "";
  }

  if ($("leadPhone")) {
    $("leadPhone").value =
      lead.phone || "";
  }

  if ($("leadEmail")) {
    $("leadEmail").value =
      lead.email || "";
  }

  if ($("leadBusiness")) {
    $("leadBusiness").value =
      lead.business || "";
  }

  if ($("leadLocation")) {
    $("leadLocation").value =
      lead.location || "";
  }

  if ($("leadStatus")) {
    $("leadStatus").value =
      lead.status || "New";
  }

  if ($("leadFollowUpDate")) {
    $("leadFollowUpDate").value =
      lead.follow_up_date || "";
  }

  if ($("leadSalesAssign")) {
    $("leadSalesAssign").value =
      lead.sales_id || "";
  }

  if ($("leadAppointment")) {
    $("leadAppointment").value =
      lead.appointment || "";
  }

  if ($("leadSiteSurvey")) {
    $("leadSiteSurvey").value =
      lead.site_survey || "";
  }

  if ($("leadQuotation")) {
    $("leadQuotation").value =
      lead.quotation || "";
  }

  if ($("leadSpk")) {
    $("leadSpk").value =
      lead.spk || "";
  }

  if ($("leadClosing")) {
    $("leadClosing").value =
      lead.closing || "";
  }

  if ($("leadNotes")) {
    $("leadNotes").value =
      lead.notes || "";
  }
}


// ========================================
// FORM PAYLOAD
// ========================================

function formPayload() {

  const payload = {

    customer_name:
      $("leadCustomerName")
        ?.value.trim() || null,

    phone:
      $("leadPhone")
        ?.value.trim() || null,

    email:
      $("leadEmail")
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
        ?.value.trim() || null,

    updated_by:
      currentProfile.id
  };


  if (
    currentProfile?.role ===
    "Admin"
  ) {

    payload.sales_id =
      $("leadSalesAssign")
        ?.value || null;

  } else {

    payload.sales_id =
      currentProfile.id;
  }


  return payload;
}


// ========================================
// SAVE LEAD
// ========================================

async function handleLeadSubmit(event) {

  event.preventDefault();


  const button =
    $("saveLeadBtn");

  const leadId =
    $("leadId")?.value || "";


  try {

    if (button) {
      setButtonLoading(
        button,
        true
      );
    }


    const payload =
      formPayload();


    if (!payload.customer_name) {

      showToast(
        "Nama customer wajib diisi.",
        "error"
      );

      return;
    }


    // UPDATE

    if (leadId) {

      const { error } =
        await supabaseClient
          .from(
            CRM_CONFIG.leadTable
          )
          .update(payload)
          .eq(
            "id",
            leadId
          );


      if (error) throw error;


      showToast(
        "Lead berhasil diperbarui.",
        "success"
      );


    }

    // INSERT

    else {

      payload.created_by =
        currentProfile.id;


      const { error } =
        await supabaseClient
          .from(
            CRM_CONFIG.leadTable
          )
          .insert(payload);


      if (error) throw error;


      showToast(
        "Lead berhasil ditambahkan.",
        "success"
      );
    }


    closeLeadModal();


    await loadLeads(
      currentPage
    );


    if (
      typeof updateDashboard ===
      "function"
    ) {

      updateDashboard();
    }


  } catch (error) {

    console.error(
      "handleLeadSubmit:",
      error
    );

    showToast(
      error.message ||
        "Gagal menyimpan lead.",
      "error"
    );

  } finally {

    if (button) {

      setButtonLoading(
        button,
        false
      );
    }
  }
}


// ========================================
// DELETE LEAD
// ========================================

async function deleteLead(id) {

  try {

    const { data, error } =
      await supabaseClient
        .from(
          CRM_CONFIG.leadTable
        )
        .select(
          "id,sales_id"
        )
        .eq(
          "id",
          id
        )
        .single();


    if (error) throw error;


    if (
      currentProfile?.role !==
      "Admin" &&
      String(data.sales_id) !==
      String(currentProfile.id)
    ) {

      showToast(
        "Anda tidak memiliki akses ke lead ini.",
        "error"
      );

      return;
    }


    openConfirm(
      "Delete Lead",
      "Apakah Anda yakin ingin menghapus lead ini?",
      async () => {

        const {
          error: deleteError
        } =
          await supabaseClient
            .from(
              CRM_CONFIG.leadTable
            )
            .delete()
            .eq(
              "id",
              id
            );


        if (deleteError) {
          throw deleteError;
        }


        showToast(
          "Lead berhasil dihapus.",
          "success"
        );


        await loadLeads(
          currentPage
        );
      }
    );


  } catch (error) {

    console.error(
      "deleteLead:",
      error
    );

    showToast(
      "Gagal menghapus lead.",
      "error"
    );
  }
}


// ========================================
// CONFIRM MODAL
// ========================================

function openConfirm(
  title,
  message,
  action
) {

  const modal =
    $("confirmModal");


  if (!modal) {

    if (
      window.confirm(
        message
      )
    ) {
      action();
    }

    return;
  }


  if ($("confirmTitle")) {

    $("confirmTitle").textContent =
      title;
  }


  if ($("confirmMessage")) {

    $("confirmMessage").textContent =
      message;
  }


  modal.classList.add(
    "active"
  );

  modal.style.display =
    "flex";


  const confirmButton =
    $("confirmActionBtn") ||
    $("confirmAction");


  if (!confirmButton) return;


  confirmButton.onclick =
    async () => {

      try {

        confirmButton.disabled =
          true;

        await action();

      } catch (error) {

        console.error(
          "confirm action:",
          error
        );

        showToast(
          error.message ||
            "Action gagal.",
          "error"
        );

      } finally {

        confirmButton.disabled =
          false;

        modal.classList.remove(
          "active"
        );

        modal.style.display =
          "none";
      }
    };
}


// ========================================
// EXPORT CSV
// ========================================

async function exportLeadsCSV() {

  try {

    const button =
      $("exportLeadsBtn");


    if (button) {

      setButtonLoading(
        button,
        true
      );
    }


    let query =
      supabaseClient
        .from(
          CRM_CONFIG.leadTable
        )
        .select("*")
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    if (
      currentProfile?.role !==
      "Admin"
    ) {

      query =
        query.eq(
          "sales_id",
          currentProfile.id
        );
    }


    const {
      data,
      error
    } = await query;


    if (error) throw error;


    const rows =
      data || [];


    if (!rows.length) {

      showToast(
        "Tidak ada data untuk diekspor.",
        "info"
      );

      return;
    }


    const headers = [
      "Customer Name",
      "Phone",
      "Email",
      "Business",
      "Location",
      "Status",
      "Follow Up",
      "Appointment",
      "Site Survey",
      "Quotation",
      "SPK",
      "Closing",
      "Notes",
      "Created At"
    ];


    const csvRows = [
      headers.join(",")
    ];


    rows.forEach(
      (lead) => {

        const row = [

          lead.customer_name,

          lead.phone,

          lead.email,

          lead.business,

          lead.location,

          lead.status,

          lead.follow_up_date,

          lead.appointment,

          lead.site_survey,

          lead.quotation,

          lead.spk,

          lead.closing,

          lead.notes,

          lead.created_at

        ].map(csvEscape);


        csvRows.push(
          row.join(",")
        );
      }
    );


    const csv =
      "\uFEFF" +
      csvRows.join(
        "\n"
      );


    const blob =
      new Blob(
        [csv],
        {
          type:
            "text/csv;charset=utf-8;"
        }
      );


    const url =
      URL.createObjectURL(
        blob
      );


    const link =
      document.createElement(
        "a"
      );


    link.href =
      url;

    link.download =
      "fsi-leads.csv";


    document.body.appendChild(
      link
    );

    link.click();

    link.remove();


    URL.revokeObjectURL(
      url
    );


    showToast(
      "Data berhasil diekspor.",
      "success"
    );


  } catch (error) {

    console.error(
      "exportLeadsCSV:",
      error
    );

    showToast(
      "Gagal export data.",
      "error"
    );

  } finally {

    const button =
      $("exportLeadsBtn");

    if (button) {

      setButtonLoading(
        button,
        false
      );
    }
  }
}


// ========================================
// CSV ESCAPE
// ========================================

function csvEscape(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }


  const stringValue =
    String(value);


  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {

    return `"${stringValue.replace(
      /"/g,
      '""'
    )}"`;
  }


  return stringValue;
}


// ========================================
// DATE FORMAT
// ========================================

function formatDate(value) {

  if (!value) {
    return "-";
  }


  try {

    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return value;
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

    return value;
  }
}


// ========================================
// HTML ESCAPE
// ========================================

function escapeHTML(value) {

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


// ========================================
// HELPER $
// ========================================

function $(id) {
  return document.getElementById(id);
}
```
