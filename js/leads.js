// =====================================================
// CRM FSI - LEADS
// =====================================================

// -----------------------------------------------------
// STATE
// -----------------------------------------------------

let leadsInitialized = false;

let currentPage = 1;
let totalLeadsCount = 0;

let leadsData = [];
let salesUsersData = [];

let leadSearchTimer = null;


// -----------------------------------------------------
// INITIALIZE
// -----------------------------------------------------

async function initializeLeadsPage() {

    if (leadsInitialized) {
        return;
    }

    leadsInitialized = true;

    bindLeadEvents();

    await loadLeadFilters();

    await loadLeads();

    const params = new URLSearchParams(location.search);

    if (params.get("add") === "1") {
        openLeadModal();
    }

    if (params.get("edit")) {
        await editLead(params.get("edit"));
    }
}


// -----------------------------------------------------
// EVENTS
// -----------------------------------------------------

function bindLeadEvents() {

    // -----------------------------
    // SEARCH
    // -----------------------------

    const search = $("leadSearch");

    if (search) {

        search.addEventListener("input", () => {

            clearTimeout(leadSearchTimer);

            leadSearchTimer = setTimeout(() => {

                currentPage = 1;

                loadLeads();

            }, 400);

        });

    }


    // -----------------------------
    // FILTERS
    // -----------------------------

    [
        "statusFilter",
        "businessFilter",
        "locationFilter",
        "salesFilter"
    ].forEach(id => {

        const element = $(id);

        if (!element) {
            return;
        }

        element.addEventListener("change", () => {

            currentPage = 1;

            loadLeads();

        });

    });


    // -----------------------------
    // ADD LEAD
    // -----------------------------

    $("addLeadBtn")?.addEventListener("click", () => {

        openLeadModal();

    });


    // -----------------------------
    // SAVE LEAD
    // -----------------------------

    $("leadForm")?.addEventListener("submit", async event => {

        event.preventDefault();

        await saveLead();

    });


    // -----------------------------
    // CANCEL
    // -----------------------------

    $("cancelLeadBtn")?.addEventListener("click", () => {

        closeLeadModal();

    });


    // -----------------------------
    // NEXT PAGE
    // -----------------------------

    $("nextPageBtn")?.addEventListener("click", () => {

        const totalPages =
            Math.ceil(
                totalLeadsCount /
                (CRM_CONFIG.pageSize || 20)
            );

        if (currentPage < totalPages) {

            currentPage++;

            loadLeads();

        }

    });


    // -----------------------------
    // PREVIOUS PAGE
    // -----------------------------

    $("prevPageBtn")?.addEventListener("click", () => {

        if (currentPage > 1) {

            currentPage--;

            loadLeads();

        }

    });

}


// -----------------------------------------------------
// LOAD ALL FILTERS
// -----------------------------------------------------

async function loadLeadFilters() {

    populateStatusFilters();

    await loadBusinessFilters();

    await loadLocationFilters();

    await loadSalesFilters();

}


// -----------------------------------------------------
// STATUS FILTER
// -----------------------------------------------------

function populateStatusFilters() {

    const filter = $("statusFilter");

    if (!filter) {
        return;
    }

    filter.innerHTML = `
        <option value="">All Status</option>
    `;

    const statuses =
        CRM_CONFIG.statuses || [];

    statuses.forEach(status => {

        const option =
            document.createElement("option");

        option.value = status;

        option.textContent = status;

        filter.appendChild(option);

    });

}


// -----------------------------------------------------
// BUSINESS FILTER
// -----------------------------------------------------

async function loadBusinessFilters() {

    const filter = $("businessFilter");

    if (!filter) {
        return;
    }

    filter.innerHTML = `
        <option value="">All Business</option>
    `;

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from(CRM_CONFIG.leadTable)
                .select("business")
                .not("business", "is", null)
                .order("business", {
                    ascending: true
                });

        if (error) {
            console.error(
                "Business filter error:",
                error
            );

            return;
        }

        const values = [
            ...new Set(
                (data || [])
                    .map(row =>
                        String(
                            row.business || ""
                        ).trim()
                    )
                    .filter(Boolean)
            )
        ];

        values.forEach(value => {

            const option =
                document.createElement("option");

            option.value = value;

            option.textContent = value;

            filter.appendChild(option);

        });

    }
    catch (error) {

        console.error(
            "Business filter exception:",
            error
        );

    }

}


// -----------------------------------------------------
// LOCATION FILTER
// -----------------------------------------------------

async function loadLocationFilters() {

    const filter = $("locationFilter");

    if (!filter) {
        return;
    }

    filter.innerHTML = `
        <option value="">All Location</option>
    `;

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from(CRM_CONFIG.leadTable)
                .select("location")
                .not("location", "is", null)
                .order("location", {
                    ascending: true
                });

        if (error) {

            console.error(
                "Location filter error:",
                error
            );

            return;
        }

        const values = [
            ...new Set(
                (data || [])
                    .map(row =>
                        String(
                            row.location || ""
                        ).trim()
                    )
                    .filter(Boolean)
            )
        ];

        values.forEach(value => {

            const option =
                document.createElement("option");

            option.value = value;

            option.textContent = value;

            filter.appendChild(option);

        });

    }
    catch (error) {

        console.error(
            "Location filter exception:",
            error
        );

    }

}


// -----------------------------------------------------
// SALES FILTER
// -----------------------------------------------------

async function loadSalesFilters() {

    const filter = $("salesFilter");

    if (!filter) {
        return;
    }

    // Reset dropdown
    filter.innerHTML = `
        <option value="">
            All Sales
        </option>
    `;


    // Sales biasa tidak boleh melihat
    // dropdown global Sales
    if (
        currentProfile?.role !== "Admin"
    ) {

        return;

    }


    try {

        console.log(
            "Loading Sales users..."
        );


        // -------------------------------------------------
        // AMBIL SEMUA SALES
        // -------------------------------------------------

        const {
            data,
            error
        } =
            await supabaseClient
                .from(CRM_CONFIG.salesTable)
                .select(`
                    id,
                    name,
                    username,
                    role,
                    status
                `)
                .order("name", {
                    ascending: true
                });


        if (error) {

            console.error(
                "Sales filter error:",
                error
            );

            return;

        }


        console.log(
            "SEMUA DATA SALES:",
            data
        );


        // -------------------------------------------------
        // FILTER ROLE SALES
        // -------------------------------------------------

        salesUsersData =
            (data || []).filter(
                sales => {

                    const role =
                        String(
                            sales.role || ""
                        )
                        .trim()
                        .toLowerCase();

                    return role === "sales";

                }
            );


        console.log(
            "SALES UNTUK DROPDOWN:",
            salesUsersData
        );


        // -------------------------------------------------
        // MASUKKAN KE SALES FILTER
        // -------------------------------------------------

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
                    "Unnamed Sales";

                filter.appendChild(
                    option
                );

            }
        );


        // -------------------------------------------------
        // SALES ASSIGN DI FORM
        // -------------------------------------------------

        const assign =
            $("leadSalesAssign");

        if (assign) {

            assign.innerHTML = `
                <option value="">
                    Select Sales
                </option>
            `;


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
                        "Unnamed Sales";

                    assign.appendChild(
                        option
                    );

                }
            );

        }


        console.log(
            "JUMLAH SALES:",
            salesUsersData.length
        );

    }
    catch (error) {

        console.error(
            "Sales filter exception:",
            error
        );

    }

}


// -----------------------------------------------------
// BUILD LEAD QUERY
// -----------------------------------------------------

function buildLeadQuery() {

    let query =
        supabaseClient
            .from(
                CRM_CONFIG.leadTable
            )
            .select(
                `
                id,
                customer_name,
                phone,
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


    // -------------------------------------------------
    // SALES USER
    // -------------------------------------------------

    if (
        currentProfile &&
        currentProfile.role !== "Admin"
    ) {

        query =
            query.eq(
                "sales_id",
                currentProfile.id
            );

    }


    // -------------------------------------------------
    // SEARCH
    // -------------------------------------------------

    const search =
        $("leadSearch")?.value
            ?.trim();


    if (search) {

        const escaped =
            search
                .replace(
                    /[%_]/g,
                    "\\$&"
                );


        query =
            query.or(
                `customer_name.ilike.%${escaped}%,phone.ilike.%${escaped}%,business.ilike.%${escaped}%,location.ilike.%${escaped}%`
            );

    }


    // -------------------------------------------------
    // STATUS
    // -------------------------------------------------

    const status =
        $("statusFilter")
            ?.value
            ?.trim();


    if (status) {

        query =
            query.eq(
                "status",
                status
            );

    }


    // -------------------------------------------------
    // BUSINESS
    // -------------------------------------------------

    const business =
        $("businessFilter")
            ?.value
            ?.trim();


    if (business) {

        query =
            query.eq(
                "business",
                business
            );

    }


    // -------------------------------------------------
    // LOCATION
    // -------------------------------------------------

    const location =
        $("locationFilter")
            ?.value
            ?.trim();


    if (location) {

        query =
            query.eq(
                "location",
                location
            );

    }


    // -------------------------------------------------
    // ADMIN SALES FILTER
    // -------------------------------------------------

    if (
        currentProfile?.role === "Admin"
    ) {

        const selectedSales =
            $("salesFilter")
                ?.value
                ?.trim();


        if (selectedSales) {

            query =
                query.eq(
                    "sales_id",
                    selectedSales
                );

        }

    }


    return query;

}


// -----------------------------------------------------
// LOAD LEADS
// -----------------------------------------------------

async function loadLeads(page = currentPage) {

    currentPage = page;

    const tableBody =
        $("leadsTableBody");

    if (!tableBody) {
        return;
    }


    // -------------------------------------------------
    // LOADING
    // -------------------------------------------------

    tableBody.innerHTML = `
        <tr>
            <td
                colspan="100"
                class="table-loading"
            >
                <i class="fa-solid fa-spinner fa-spin"></i>
                Loading leads...
            </td>
        </tr>
    `;


    try {

        const pageSize =
            CRM_CONFIG.pageSize || 20;


        const from =
            (currentPage - 1) *
            pageSize;


        const to =
            from +
            pageSize -
            1;


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
            throw error;
        }


        leadsData =
            data || [];


        totalLeadsCount =
            Number(count || 0);


        renderLeadsTable();

        updateLeadPagination();

        updateLeadTotal();


    }
    catch (error) {

        console.error(
            "Load leads error:",
            error
        );


        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="100"
                    class="table-empty"
                >
                    <div class="empty-state">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <h3>Gagal memuat data</h3>
                        <p>
                            ${escapeHTML(
                                error.message ||
                                "Terjadi kesalahan."
                            )}
                        </p>
                    </div>
                </td>
            </tr>
        `;

    }

}


// -----------------------------------------------------
// RENDER TABLE
// -----------------------------------------------------

function renderLeadsTable() {

    const tableBody =
        $("leadsTableBody");

    if (!tableBody) {
        return;
    }


    if (!leadsData.length) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="100"
                    class="table-empty"
                >
                    <div class="empty-state">
                        <i class="fa-solid fa-users-slash"></i>
                        <h3>Belum ada customer</h3>
                        <p>
                            Tidak ada data yang sesuai dengan filter.
                        </p>
                    </div>
                </td>
            </tr>
        `;

        return;

    }


    tableBody.innerHTML =
        leadsData
            .map(lead =>
                renderLeadRow(lead)
            )
            .join("");

}


// -----------------------------------------------------
// RENDER LEAD ROW
// -----------------------------------------------------

function renderLeadRow(lead) {

    const customerName =
        lead.customer_name ||
        "-";


    const phone =
        lead.phone ||
        "-";


    const business =
        lead.business ||
        "-";


    const location =
        lead.location ||
        "-";


    const status =
        lead.status ||
        "New";


    const sales =
        getSalesName(
            lead.sales_id
        );


    const followUp =
        formatDate(
            lead.follow_up_date
        );


    return `
        <tr
            data-id="${escapeHTML(
                String(lead.id)
            )}"
        >

            <td>
                <div class="customer-cell">

                    <div class="customer-avatar">
                        ${escapeHTML(
                            customerName
                                .charAt(0)
                                .toUpperCase()
                        )}
                    </div>

                    <div class="customer-info">

                        <strong>
                            ${escapeHTML(
                                customerName
                            )}
                        </strong>

                        <small>
                            ${escapeHTML(
                                phone
                            )}
                        </small>

                    </div>

                </div>
            </td>


            <td>
                ${escapeHTML(business)}
            </td>


            <td>
                ${escapeHTML(location)}
            </td>


            <td>
                <span
                    class="status-badge status-${getStatusClass(status)}"
                >
                    ${escapeHTML(status)}
                </span>
            </td>


            <td>
                ${escapeHTML(sales)}
            </td>


            <td>
                ${escapeHTML(followUp)}
            </td>


            <td>

                <div class="table-actions">

                    <button
                        type="button"
                        class="action-btn view-btn"
                        onclick="viewCustomer('${escapeHTML(String(lead.id))}')"
                        title="View"
                    >
                        <i class="fa-solid fa-eye"></i>
                    </button>


                    <button
                        type="button"
                        class="action-btn edit-btn"
                        onclick="editLead('${escapeHTML(String(lead.id))}')"
                        title="Edit"
                    >
                        <i class="fa-solid fa-pen"></i>
                    </button>


                    <button
                        type="button"
                        class="action-btn delete-btn"
                        onclick="deleteLead('${escapeHTML(String(lead.id))}')"
                        title="Delete"
                    >
                        <i class="fa-solid fa-trash"></i>
                    </button>

                </div>

            </td>

        </tr>
    `;

}


// -----------------------------------------------------
// GET SALES NAME
// -----------------------------------------------------

function getSalesName(salesId) {

    if (!salesId) {
        return "-";
    }


    const sales =
        salesUsersData.find(
            item =>
                String(item.id) ===
                String(salesId)
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


// -----------------------------------------------------
// STATUS CLASS
// -----------------------------------------------------

function getStatusClass(status) {

    const value =
        String(
            status || ""
        )
        .trim()
        .toLowerCase();


    if (
        value === "new" ||
        value === "belum dihubungi"
    ) {
        return "new";
    }


    if (
        value === "flyer sent"
    ) {
        return "flyer";
    }


    if (
        value === "interested" ||
        value === "tertarik"
    ) {
        return "interested";
    }


    if (
        value === "follow up"
    ) {
        return "follow-up";
    }


    if (
        value === "closing"
    ) {
        return "closing";
    }


    if (
        value === "not interested" ||
        value === "tidak tertarik"
    ) {
        return "not-interested";
    }


    return "new";

}


// -----------------------------------------------------
// UPDATE TOTAL
// -----------------------------------------------------

function updateLeadTotal() {

    const total =
        $("leadTotal") ||
        $("totalLeads") ||
        $("leadsTotal");


    if (!total) {
        return;
    }


    total.textContent =
        Number(
            totalLeadsCount || 0
        ).toLocaleString("id-ID");

}


// -----------------------------------------------------
// PAGINATION
// -----------------------------------------------------

function updateLeadPagination() {

    const pageSize =
        CRM_CONFIG.pageSize || 20;


    const totalPages =
        Math.max(
            1,
            Math.ceil(
                totalLeadsCount /
                pageSize
            )
        );


    const current =
        $("currentPage");

    const total =
        $("totalPages");


    if (current) {
        current.textContent =
            currentPage;
    }


    if (total) {
        total.textContent =
            totalPages;
    }


    const prev =
        $("prevPageBtn");


    const next =
        $("nextPageBtn");


    if (prev) {

        prev.disabled =
            currentPage <= 1;

    }


    if (next) {

        next.disabled =
            currentPage >= totalPages;

    }

}


// -----------------------------------------------------
// OPEN LEAD MODAL
// -----------------------------------------------------

function openLeadModal(lead = null) {

    const modal =
        $("leadModal");

    if (!modal) {
        return;
    }


    const form =
        $("leadForm");


    if (form) {
        form.reset();
    }


    const id =
        $("leadId");


    if (id) {
        id.value =
            lead?.id || "";
    }


    setValue(
        "customerName",
        lead?.customer_name || ""
    );


    setValue(
        "customerPhone",
        lead?.phone || ""
    );


    setValue(
        "customerBusiness",
        lead?.business || ""
    );


    setValue(
        "customerLocation",
        lead?.location || ""
    );


    setValue(
        "customerStatus",
        lead?.status || "New"
    );


    setValue(
        "followUpDate",
        lead?.follow_up_date || ""
    );


    setValue(
        "appointmentDate",
        lead?.appointment || ""
    );


    setValue(
        "siteSurveyDate",
        lead?.site_survey || ""
    );


    setValue(
        "quotationDate",
        lead?.quotation || ""
    );


    setValue(
        "spkDate",
        lead?.spk || ""
    );


    setValue(
        "closingDate",
        lead?.closing || ""
    );


    setValue(
        "customerNotes",
        lead?.notes || ""
    );


    if (
        $("leadSalesAssign") &&
        lead?.sales_id
    ) {

        $("leadSalesAssign").value =
            lead.sales_id;

    }


    modal.classList.add("show");

    modal.style.display =
        "flex";

}


// -----------------------------------------------------
// CLOSE LEAD MODAL
// -----------------------------------------------------

function closeLeadModal() {

    const modal =
        $("leadModal");

    if (!modal) {
        return;
    }


    modal.classList.remove("show");

    modal.style.display =
        "none";

}


// -----------------------------------------------------
// EDIT LEAD
// -----------------------------------------------------

async function editLead(id) {

    if (!id) {
        return;
    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from(
                    CRM_CONFIG.leadTable
                )
                .select("*")
                .eq("id", id)
                .single();


        if (error) {
            throw error;
        }


        openLeadModal(data);

    }
    catch (error) {

        console.error(
            "Edit lead error:",
            error
        );

        showToast(
            error.message ||
            "Gagal mengambil data customer.",
            "error"
        );

    }

}


// -----------------------------------------------------
// SAVE LEAD
// -----------------------------------------------------

async function saveLead() {

    const id =
        $("leadId")?.value?.trim();


    const customerName =
        $("customerName")
            ?.value
            ?.trim();


    const phone =
        $("customerPhone")
            ?.value
            ?.trim();


    const business =
        $("customerBusiness")
            ?.value
            ?.trim();


    const location =
        $("customerLocation")
            ?.value
            ?.trim();


    const status =
        $("customerStatus")
            ?.value
            ?.trim();


    const followUpDate =
        $("followUpDate")
            ?.value || null;


    const appointment =
        $("appointmentDate")
            ?.value || null;


    const siteSurvey =
        $("siteSurveyDate")
            ?.value || null;


    const quotation =
        $("quotationDate")
            ?.value || null;


    const spk =
        $("spkDate")
            ?.value || null;


    const closing =
        $("closingDate")
            ?.value || null;


    const notes =
        $("customerNotes")
            ?.value
            ?.trim();


    if (!customerName) {

        showToast(
            "Nama customer wajib diisi.",
            "error"
        );

        return;

    }


    // -------------------------------------------------
    // SALES ID
    // -------------------------------------------------

    let salesId =
        $("leadSalesAssign")
            ?.value ||
        null;


    // Sales biasa otomatis menggunakan dirinya
    if (
        currentProfile?.role !== "Admin"
    ) {

        salesId =
            currentProfile.id;

    }


    const payload = {

        customer_name:
            customerName,

        phone:
            phone || null,

        business:
            business || null,

        location:
            location || null,

        status:
            status || "New",

        follow_up_date:
            followUpDate,

        appointment:
            appointment,

        site_survey:
            siteSurvey,

        quotation:
            quotation,

        spk:
            spk,

        closing:
            closing,

        notes:
            notes || null,

        sales_id:
            salesId

    };


    try {

        if (id) {

            const {
                error
            } =
                await supabaseClient
                    .from(
                        CRM_CONFIG.leadTable
                    )
                    .update(
                        {
                            ...payload,
                            updated_by:
                                currentUser?.id ||
                                null
                        }
                    )
                    .eq(
                        "id",
                        id
                    );


            if (error) {
                throw error;
            }


            showToast(
                "Customer berhasil diperbarui.",
                "success"
            );

        }
        else {

            const {
                error
            } =
                await supabaseClient
                    .from(
                        CRM_CONFIG.leadTable
                    )
                    .insert(
                        {
                            ...payload,
                            created_by:
                                currentUser?.id ||
                                null,
                            updated_by:
                                currentUser?.id ||
                                null
                        }
                    );


            if (error) {
                throw error;
            }


            showToast(
                "Customer berhasil ditambahkan.",
                "success"
            );

        }


        closeLeadModal();

        await loadLeads();


    }
    catch (error) {

        console.error(
            "Save lead error:",
            error
        );


        showToast(
            error.message ||
            "Gagal menyimpan customer.",
            "error"
        );

    }

}


// -----------------------------------------------------
// DELETE LEAD
// -----------------------------------------------------

async function deleteLead(id) {

    if (!id) {
        return;
    }


    const confirmed =
        window.confirm(
            "Yakin ingin menghapus customer ini?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const {
            error
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


        if (error) {
            throw error;
        }


        showToast(
            "Customer berhasil dihapus.",
            "success"
        );


        await loadLeads();


    }
    catch (error) {

        console.error(
            "Delete lead error:",
            error
        );


        showToast(
            error.message ||
            "Gagal menghapus customer.",
            "error"
        );

    }

}


// -----------------------------------------------------
// VIEW CUSTOMER
// -----------------------------------------------------

function viewCustomer(id) {

    if (!id) {
        return;
    }


    window.location.href =
        `customer-profile.html?id=${encodeURIComponent(id)}`;

}


// -----------------------------------------------------
// DATE FORMAT
// -----------------------------------------------------

function formatDate(value) {

    if (!value) {
        return "-";
    }


    try {

        const date =
            new Date(value);


        if (Number.isNaN(
            date.getTime()
        )) {

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

    }
    catch {

        return value;

    }

}


// -----------------------------------------------------
// SET VALUE
// -----------------------------------------------------

function setValue(id, value) {

    const element =
        $(id);

    if (element) {
        element.value =
            value ?? "";
    }

}


// -----------------------------------------------------
// ESCAPE HTML
// -----------------------------------------------------

function escapeHTML(value) {

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


// -----------------------------------------------------
// AUTO INITIALIZE
// -----------------------------------------------------

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        if (
            typeof getCurrentPageName ===
            "function" &&
            getCurrentPageName() ===
            "leads"
        ) {

            // auth.js akan memastikan
            // session/profile sudah tersedia.
            //
            // Jika profile sudah ada,
            // langsung initialize.

            if (currentProfile) {

                await initializeLeadsPage();

            }

        }

    }
);
