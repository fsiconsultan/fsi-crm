// ======================================================
// CRM FSI - LEADS
// ======================================================

let leadsEventsBound = false;


// ======================================================
// STATUS OPTIONS
// ======================================================

function populateStatusOptions() {
    const statusFilter = $("statusFilter");
    const leadStatus = $("leadStatus");

    if (statusFilter) {
        const current = statusFilter.value;

        statusFilter.innerHTML =
            `<option value="">All Status</option>`;

        CRM_CONFIG.statuses.forEach(status => {
            const option = document.createElement("option");
            option.value = status;
            option.textContent = status;
            statusFilter.appendChild(option);
        });

        statusFilter.value = current;
    }

    if (leadStatus) {
        const current = leadStatus.value;

        leadStatus.innerHTML = "";

        CRM_CONFIG.statuses.forEach(status => {
            const option = document.createElement("option");
            option.value = status;
            option.textContent = status;
            leadStatus.appendChild(option);
        });

        leadStatus.value =
            CRM_CONFIG.statuses.includes(current)
                ? current
                : "New";
    }
}


// ======================================================
// BUSINESS FILTER
// ======================================================

function populateBusinessFilter(values) {
    const select = $("businessFilter");

    if (!select) return;

    const current = select.value;

    select.innerHTML =
        `<option value="">All Business</option>`;

    [...new Set(
        (values || [])
            .filter(value => value !== null && value !== "")
            .map(value => String(value).trim())
    )]
        .sort((a, b) => a.localeCompare(b))
        .forEach(value => {
            const option = document.createElement("option");

            option.value = value;
            option.textContent = value;

            select.appendChild(option);
        });

    select.value = current;
}


// ======================================================
// SALES OPTIONS
// ======================================================

function populateSales() {

    const salesFilter = $("salesFilter");
    const salesAssign = $("leadSalesAssign");

    const salesList =
        (salesUsersData || []).filter(
            sales =>
                sales.role === "Sales" &&
                String(sales.status || "Active")
                    .toLowerCase() === "active"
        );


    // ----------------------------------------------
    // ADMIN SALES FILTER
    // ----------------------------------------------

    if (salesFilter) {

        const current = salesFilter.value;

        salesFilter.innerHTML =
            `<option value="">All Sales</option>`;

        salesList.forEach(sales => {

            const option =
                document.createElement("option");

            option.value = sales.id;

            option.textContent =
                sales.name ||
                sales.username ||
                "Sales";

            salesFilter.appendChild(option);
        });

        salesFilter.value = current;
    }


    // ----------------------------------------------
    // ASSIGN SALES
    // ----------------------------------------------

    if (salesAssign) {

        const current = salesAssign.value;

        salesAssign.innerHTML = "";

        if (currentProfile?.role === "Admin") {

            const option =
                document.createElement("option");

            option.value = "";

            option.textContent =
                "Unassigned";

            salesAssign.appendChild(option);
        }

        salesList.forEach(sales => {

            const option =
                document.createElement("option");

            option.value = sales.id;

            option.textContent =
                sales.name ||
                sales.username ||
                "Sales";

            salesAssign.appendChild(option);
        });


        // Sales biasa otomatis dirinya sendiri
        if (currentProfile?.role !== "Admin") {

            salesAssign.value =
                currentProfile?.id || "";

        } else if (current) {

            salesAssign.value = current;
        }
    }
}


// ======================================================
// LOAD SALES
// ======================================================

async function loadSalesLookup() {

    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("sales_users")
            .select(
                "id,name,username,role,status,created_at"
            )
            .order(
                "name",
                {
                    ascending: true
                }
            );


        if (error) {

            console.error(
                "LOAD SALES ERROR:",
                error
            );

            salesUsersData = [];

            populateSales();

            return;
        }


        salesUsersData =
            data || [];

        populateSales();

    } catch (error) {

        console.error(
            "LOAD SALES EXCEPTION:",
            error
        );

        salesUsersData = [];

        populateSales();
    }
}


// ======================================================
// LOAD FILTER OPTIONS
// ======================================================

async function loadFilterOptions() {

    populateStatusOptions();


    try {

        const {
            data,
            error
        } = await supabaseClient
            .from("leads")
            .select(
                "business"
            );


        if (error) {

            console.error(
                "LOAD BUSINESS FILTER ERROR:",
                error
            );

            return;
        }


        populateBusinessFilter(
            (data || []).map(
                row => row.business
            )
        );


        populateSales();

    } catch (error) {

        console.error(
            "FILTER ERROR:",
            error
        );
    }
}


// ======================================================
// BUILD QUERY
// ======================================================

function buildLeadQuery() {

    const search =
        $("leadSearch")?.value.trim() || "";

    const status =
        $("statusFilter")?.value || "";

    const business =
        $("businessFilter")?.value || "";

    const location =
        $("locationFilter")?.value.trim() || "";

    const sales =
        $("salesFilter")?.value || "";


    let query =
        supabaseClient
            .from("leads")
            .select(
                "*",
                {
                    count: "exact"
                }
            );


    // ----------------------------------------------
    // SALES
    // ----------------------------------------------

    if (
        currentProfile?.role !== "Admin"
    ) {

        query =
            query.eq(
                "sales_id",
                currentProfile.id
            );
    }


    // ----------------------------------------------
    // SEARCH
    // ----------------------------------------------

    if (search) {

        const safeSearch =
            search
                .replace(/[(),%]/g, " ")
                .trim();


        if (safeSearch) {

            query =
                query.or(
                    `customer_name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%,business.ilike.%${safeSearch}%,location.ilike.%${safeSearch}%`
                );
        }
    }


    // ----------------------------------------------
    // STATUS
    // ----------------------------------------------

    if (status) {

        query =
            query.eq(
                "status",
                status
            );
    }


    // ----------------------------------------------
    // BUSINESS
    // ----------------------------------------------

    if (business) {

        query =
            query.eq(
                "business",
                business
            );
    }


    // ----------------------------------------------
    // LOCATION
    // Karena HTML menggunakan INPUT TEXT
    // ----------------------------------------------

    if (location) {

        query =
            query.ilike(
                "location",
                `%${location}%`
            );
    }


    // ----------------------------------------------
    // ADMIN SALES FILTER
    // ----------------------------------------------

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


// ======================================================
// LOAD LEADS
// ======================================================

async function loadLeads(page = 1) {

    const tbody =
        $("leadsTableBody");

    if (!tbody) return;


    currentPage =
        Math.max(
            1,
            Number(page) || 1
        );


    tbody.innerHTML = `
        <tr>
            <td
                colspan="10"
                class="table-loading"
            >
                <i
                    class="fa-solid fa-spinner fa-spin"
                ></i>

                Loading leads...
            </td>
        </tr>
    `;


    if ($("leadsEmptyState")) {

        $("leadsEmptyState").style.display =
            "none";
    }


    try {

        const from =
            (currentPage - 1) *
            CRM_CONFIG.pageSize;

        const to =
            from +
            CRM_CONFIG.pageSize -
            1;


        console.log(
            "CRM FSI - QUERY LEADS",
            {
                page: currentPage,
                from,
                to,
                role: currentProfile?.role,
                profileId: currentProfile?.id
            }
        );


        const {
            data,
            error,
            count
        } =
            await buildLeadQuery()
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


        if (error) {

            console.error(
                "SUPABASE LEADS ERROR:",
                error
            );

            throw error;
        }


        leadsData =
            data || [];

        totalLeadsCount =
            count || 0;


        console.log(
            "CRM FSI - DATA LEADS:",
            leadsData.length,
            "TOTAL:",
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
                <td
                    colspan="10"
                    class="table-error"
                >
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


        renderPagination();


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

    const tbody =
        $("leadsTableBody");

    if (!tbody) return;


    // ----------------------------------------------
    // EMPTY
    // ----------------------------------------------

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


    tbody.innerHTML =
        leadsData
            .map(
                (lead, index) => {

                    const salesName =
                        getSalesName(
                            lead.sales_id
                        );


                    const status =
                        normalizeLeadStatus(
                            lead.status
                        );


                    const id =
                        encodeURIComponent(
                            lead.id
                        );


                    const number =
                        (
                            (currentPage - 1) *
                            CRM_CONFIG.pageSize
                        ) +
                        index +
                        1;


                    const statusClass =
                        status
                            .toLowerCase()
                            .replace(
                                /\s+/g,
                                "-"
                            );


                    return `
                        <tr>

                            <td>
                                ${number}
                            </td>


                            <td>

                                <a
                                    class="customer-link"
                                    href="customer-profile.html?id=${id}"
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
                                    class="status-badge status-${statusClass}"
                                >
                                    ${safeText(
                                        status
                                    )}
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
                                                <i
                                                    class="fa-brands fa-whatsapp"
                                                ></i>

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

                                <div
                                    class="action-buttons"
                                >

                                    <a
                                        class="icon-btn"
                                        title="View"
                                        href="customer-profile.html?id=${id}"
                                    >
                                        <i
                                            class="fa-solid fa-eye"
                                        ></i>
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
                                        <i
                                            class="fa-solid fa-pen"
                                        ></i>
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
                                        <i
                                            class="fa-solid fa-trash"
                                        ></i>
                                    </button>

                                </div>

                            </td>

                        </tr>
                    `;
                }
            )
            .join("");
}


// ======================================================
// PAGINATION
// ======================================================

function renderPagination() {

    const start =
        $("paginationStart");

    const end =
        $("paginationEnd");

    const total =
        $("paginationTotal");

    const previous =
        $("prevPageBtn");

    const next =
        $("nextPageBtn");

    const numbers =
        $("paginationNumbers");


    if (
        !start ||
        !end ||
        !total ||
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


    const first =
        totalLeadsCount > 0
            ? (
                (currentPage - 1) *
                CRM_CONFIG.pageSize
            ) + 1
            : 0;


    const last =
        Math.min(
            currentPage *
            CRM_CONFIG.pageSize,
            totalLeadsCount
        );


    start.textContent =
        first;

    end.textContent =
        last;

    total.textContent =
        totalLeadsCount;


    if (previous) {

        previous.disabled =
            currentPage <= 1;
    }


    if (next) {

        next.disabled =
            currentPage >= totalPages;
    }


    numbers.innerHTML = "";


    const maxButtons =
        5;


    let startPage =
        Math.max(
            1,
            currentPage - 2
        );


    let endPage =
        Math.min(
            totalPages,
            startPage + maxButtons - 1
        );


    if (
        endPage - startPage + 1 <
        maxButtons
    ) {

        startPage =
            Math.max(
                1,
                endPage - maxButtons + 1
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

        button.type =
            "button";

        button.className =
            "page-number" +
            (
                page === currentPage
                    ? " active"
                    : ""
            );

        button.textContent =
            page;

        button.addEventListener(
            "click",
            () => loadLeads(page)
        );

        numbers.appendChild(
            button
        );
    }
}


// ======================================================
// KPI
// ======================================================

function updateLeadKPI() {

    if (!$("leadsTableBody")) {
        return;
    }


    if ($("kpiTotalLeads")) {

        $("kpiTotalLeads").textContent =
            totalLeadsCount;
    }


    const followUpCount =
        leadsData.filter(
            lead =>
                normalizeLeadStatus(
                    lead.status
                ) === "Follow Up"
        ).length;


    const appointmentCount =
        leadsData.filter(
            lead =>
                !!lead.appointment
        ).length;


    const closingCount =
        leadsData.filter(
            lead =>
                !!lead.closing ||
                normalizeLeadStatus(
                    lead.status
                ) === "Closing"
        ).length;


    if ($("kpiFollowUp")) {

        $("kpiFollowUp").textContent =
            followUpCount;
    }


    if ($("kpiAppointment")) {

        $("kpiAppointment").textContent =
            appointmentCount;
    }


    if ($("kpiClosing")) {

        $("kpiClosing").textContent =
            closingCount;
    }
}


// ======================================================
// EVENTS
// ======================================================

function bindLeadsEvents() {

    if (leadsEventsBound) {
        return;
    }


    leadsEventsBound = true;


    // Previous
    $("prevPageBtn")
        ?.addEventListener(
            "click",
            () =>
                loadLeads(
                    currentPage - 1
                )
        );


    // Next
    $("nextPageBtn")
        ?.addEventListener(
            "click",
            () =>
                loadLeads(
                    currentPage + 1
                )
        );


    // Search
    $("leadSearch")
        ?.addEventListener(
            "input",
            debounce(
                () =>
                    loadLeads(1),
                400
            )
        );


    // Status
    $("statusFilter")
        ?.addEventListener(
            "change",
            () =>
                loadLeads(1)
        );


    // Business
    $("businessFilter")
        ?.addEventListener(
            "change",
            () =>
                loadLeads(1)
        );


    // Location TEXT INPUT
    $("locationFilter")
        ?.addEventListener(
            "input",
            debounce(
                () =>
                    loadLeads(1),
                400
            )
        );


    // Sales
    $("salesFilter")
        ?.addEventListener(
            "change",
            () =>
                loadLeads(1)
        );


    // Reset
    $("resetFiltersBtn")
        ?.addEventListener(
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


    // Add Lead
    $("addLeadBtn")
        ?.addEventListener(
            "click",
            () =>
                openLeadModal()
        );


    // Empty Add Lead
    $("emptyAddLeadBtn")
        ?.addEventListener(
            "click",
            () =>
                openLeadModal()
        );


    // Export
    $("exportLeadsBtn")
        ?.addEventListener(
            "click",
            () =>
                exportLeads()
        );
}


// ======================================================
// INITIALIZE
// ======================================================

async function initializeLeadsPage() {

    console.log(
        "================================"
    );

    console.log(
        "CRM FSI - INITIALIZE LEADS"
    );

    console.log(
        "================================"
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


    // URL ?add=1
    const params =
        new URLSearchParams(
            window.location.search
        );


    if (
        params.get("add") === "1"
    ) {

        openLeadModal();
    }


    // URL ?edit=ID
    const editId =
        params.get("edit");


    if (editId) {

        await editLead(
            editId
        );
    }


    console.log(
        "CRM FSI - LEADS READY"
    );
}


// ======================================================
// FORM
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
            "Add New Lead";
    }


    populateStatusOptions();

    populateSales();

    showFormMessage(
        "leadFormMessage",
        ""
    );
}


// ======================================================
// OPEN FORM
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


    openModal(
        "leadModal"
    );
}


// ======================================================
// EDIT
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


    // Sales hanya boleh edit lead sendiri
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


    openLeadModal(
        lead
    );
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
// PAYLOAD
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


    // ADMIN
    if (
        currentProfile?.role === "Admin"
    ) {

        payload.sales_id =
            $("leadSalesAssign")
                ?.value || null;

    }

    // SALES
    else {

        payload.sales_id =
            currentProfile?.id || null;
    }


    return payload;
}


// ======================================================
// SAVE
// ======================================================

async function saveLeadFromForm(
    event
) {

    event.preventDefault();


    const id =
        $("leadId")
            ?.value || "";


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


        // UPDATE
        if (id) {

            result =
                await supabaseClient
                    .from("leads")
                    .update(
                        payload
                    )
                    .eq(
                        "id",
                        id
                    );
        }


        // INSERT
        else {

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


        closeModal(
            "leadModal"
        );


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
                    .eq(
                        "id",
                        id
                    );


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


            const remaining =
                Math.max(
                    0,
                    totalLeadsCount - 1
                );


            const maxPage =
                Math.max(
                    1,
                    Math.ceil(
                        remaining /
                        CRM_CONFIG.pageSize
                    )
                );


            if (
                currentPage >
                maxPage
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
// EXPORT
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


        const rows =
            (data || []).map(
                lead => ({

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
                })
            );


        exportCSV(
            rows,
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
// CONFIRM
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
// FORM EVENT
// ======================================================

function bindLeadForm() {

    const form =
        $("leadForm");

    if (!form) return;


    if (
        form.dataset.bound ===
        "true"
    ) {
        return;
    }


    form.dataset.bound =
        "true";


    form.addEventListener(
        "submit",
        saveLeadFromForm
    );
}


// ======================================================
// PUBLIC
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
// START FORM BIND
// ======================================================

bindLeadForm();
