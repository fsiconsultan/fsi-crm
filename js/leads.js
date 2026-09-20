/* =========================================================
   CRM FSI - LEADS MODULE
========================================================= */

let leadsInitialized = false;
let leadSearchTimer = null;
let editingLeadId = null;
let confirmCallback = null;


/* =========================================================
   INITIALIZE
========================================================= */

async function initializeLeadsPage(){

    if(leadsInitialized){
        return;
    }

    leadsInitialized = true;

    bindLeadEvents();

    await loadLeadFilters();
    await loadLeads();

    const params =
        new URLSearchParams(
            window.location.search
        );

    const editId =
        params.get("edit");

    if(editId){

        setTimeout(() => {

            openEditLead(editId);

        }, 300);

    }

    if(params.get("add") === "1"){

        setTimeout(() => {

            openAddLead();

        }, 300);

    }

}


/* =========================================================
   EVENTS
========================================================= */

function bindLeadEvents(){

    const search =
        $("leadSearch");

    if(search){

        search.addEventListener(
            "input",
            () => {

                clearTimeout(
                    leadSearchTimer
                );

                leadSearchTimer =
                    setTimeout(
                        () => {

                            currentPage = 1;

                            loadLeads();

                        },
                        400
                    );

            }
        );

    }


    [
        "statusFilter",
        "businessFilter",
        "locationFilter",
        "salesFilter"
    ].forEach(id => {

        const element =
            $(id);

        if(!element) return;

        element.addEventListener(
            "change",
            () => {

                currentPage = 1;

                loadLeads();

            }
        );

    });


    const reset =
        $("resetFiltersBtn");

    if(reset){

        reset.addEventListener(
            "click",
            resetLeadFilters
        );

    }


    const addBtn =
        $("addLeadBtn");

    if(addBtn){

        addBtn.addEventListener(
            "click",
            openAddLead
        );

    }


    const emptyAdd =
        $("emptyAddLeadBtn");

    if(emptyAdd){

        emptyAdd.addEventListener(
            "click",
            openAddLead
        );

    }


    const exportBtn =
        $("exportLeadsBtn");

    if(exportBtn){

        exportBtn.addEventListener(
            "click",
            exportLeads
        );

    }


    const prev =
        $("prevPageBtn");

    if(prev){

        prev.addEventListener(
            "click",
            () => {

                if(currentPage > 1){

                    currentPage--;

                    loadLeads();

                }

            }
        );

    }


    const next =
        $("nextPageBtn");

    if(next){

        next.addEventListener(
            "click",
            () => {

                const totalPages =
                    Math.ceil(
                        totalLeadsCount /
                        CRM_CONFIG.pageSize
                    );

                if(
                    currentPage <
                    totalPages
                ){

                    currentPage++;

                    loadLeads();

                }

            }
        );

    }


    const form =
        $("leadForm");

    if(form){

        form.addEventListener(
            "submit",
            saveLead
        );

    }


    document.addEventListener(
        "click",
        handleLeadActionClick
    );

}


/* =========================================================
   FILTERS
========================================================= */

async function loadLeadFilters(){

    populateStatusFilters();

    await loadBusinessFilters();

    await loadSalesFilters();

}


/* =========================================================
   STATUS
========================================================= */

function populateStatusFilters(){

    const statusFilter =
        $("statusFilter");

    const leadStatus =
        $("leadStatus");

    const statuses =
        CRM_CONFIG.statuses || [];


    if(statusFilter){

        statusFilter.innerHTML = `
            <option value="">
                All Status
            </option>
        `;

        statuses.forEach(
            status => {

                statusFilter.insertAdjacentHTML(
                    "beforeend",
                    `
                    <option value="${escapeHTML(status)}">
                        ${escapeHTML(status)}
                    </option>
                    `
                );

            }
        );

    }


    if(leadStatus){

        leadStatus.innerHTML = "";

        statuses.forEach(
            status => {

                leadStatus.insertAdjacentHTML(
                    "beforeend",
                    `
                    <option value="${escapeHTML(status)}">
                        ${escapeHTML(status)}
                    </option>
                    `
                );

            }
        );

    }

}


/* =========================================================
   BUSINESS FILTER
========================================================= */

async function loadBusinessFilters(){

    const select =
        $("businessFilter");

    if(!select) return;


    const {
        data,
        error
    } =
        await supabaseClient
            .from(
                CRM_CONFIG.leadTable
            )
            .select(
                "business"
            )
            .not(
                "business",
                "is",
                null
            )
            .order(
                "business"
            );


    if(error){

        console.error(
            "Business filter:",
            error
        );

        return;

    }


    const values = [
        ...new Set(
            (data || [])
                .map(
                    row =>
                        row.business
                )
                .filter(Boolean)
                .map(
                    value =>
                        value.trim()
                )
        )
    ];


    select.innerHTML = `
        <option value="">
            All Business
        </option>
    `;


    values.forEach(
        value => {

            select.insertAdjacentHTML(
                "beforeend",
                `
                <option value="${escapeHTML(value)}">
                    ${escapeHTML(value)}
                </option>
                `
            );

        }
    );

}


/* =========================================================
   SALES FILTER
========================================================= */

async function loadSalesFilters(){

    const filter =
        $("salesFilter");

    if(!filter) return;


    const {
        data,
        error
    } =
        await supabaseClient
            .from(
                CRM_CONFIG.salesTable
            )
            .select(
                "id,name,role,status"
            )
            .order(
                "name"
            );


    if(error){

        console.error(
            "Sales filter:",
            error
        );

        return;

    }


    salesUsersData =
        (data || []).filter(
            sales =>
                sales.role !== "Admin" &&
                sales.status !== "inactive"
        );


    filter.innerHTML = `
        <option value="">
            All Sales
        </option>
    `;


    salesUsersData.forEach(
        sales => {

            filter.insertAdjacentHTML(
                "beforeend",
                `
                <option value="${escapeHTML(sales.id)}">
                    ${escapeHTML(
                        sales.name || "-"
                    )}
                </option>
                `
            );

        }
    );


    const assign =
        $("leadSalesAssign");


    if(assign){

        assign.innerHTML = `
            <option value="">
                Select Sales
            </option>
        `;


        salesUsersData.forEach(
            sales => {

                assign.insertAdjacentHTML(
                    "beforeend",
                    `
                    <option value="${escapeHTML(sales.id)}">
                        ${escapeHTML(
                            sales.name || "-"
                        )}
                    </option>
                    `
                );

            }
        );

    }

}


/* =========================================================
   BUILD QUERY
========================================================= */

function buildLeadQuery(){

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
                    count:"exact"
                }
            );


    /*
       SALES hanya melihat lead miliknya.
    */

    if(
        currentProfile &&
        currentProfile.role !== "Admin"
    ){

        query =
            query.eq(
                "sales_id",
                currentProfile.id
            );

    }


    const search =
        $("leadSearch")
            ?.value
            ?.trim();


    if(search){

        const safe =
            search.replace(
                /[%_]/g,
                ""
            );


        query =
            query.or(
                `customer_name.ilike.%${safe}%,phone.ilike.%${safe}%,business.ilike.%${safe}%,location.ilike.%${safe}%`
            );

    }


    const status =
        $("statusFilter")
            ?.value;


    if(status){

        query =
            query.eq(
                "status",
                status
            );

    }


    const business =
        $("businessFilter")
            ?.value;


    if(business){

        query =
            query.eq(
                "business",
                business
            );

    }


    const location =
        $("locationFilter")
            ?.value
            ?.trim();


    if(location){

        query =
            query.ilike(
                "location",
                `%${location}%`
            );

    }


    const sales =
        $("salesFilter")
            ?.value;


    if(
        sales &&
        currentProfile?.role ===
        "Admin"
    ){

        query =
            query.eq(
                "sales_id",
                sales
            );

    }


    return query;

}


/* =========================================================
   LOAD LEADS
========================================================= */

async function loadLeads(){

    const tbody =
        $("leadsTableBody");

    const empty =
        $("leadsEmptyState");


    if(!tbody) return;


    tbody.innerHTML = `
        <tr>
            <td colspan="10">
                <div class="table-loading">
                    <div class="loading-spinner"></div>
                    <span>
                        Loading leads...
                    </span>
                </div>
            </td>
        </tr>
    `;


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
                    ascending:false
                }
            )
            .range(
                from,
                to
            );


    if(error){

        console.error(
            "Load leads:",
            error
        );


        tbody.innerHTML = `
            <tr>
                <td colspan="10">
                    <div class="table-error">

                        <i class="fa-solid fa-circle-exclamation"></i>

                        <strong>
                            Unable to load leads
                        </strong>

                        <span>
                            ${escapeHTML(
                                error.message ||
                                "Unknown error"
                            )}
                        </span>

                    </div>
                </td>
            </tr>
        `;

        return;

    }


    leadsData =
        data || [];


    totalLeadsCount =
        count || 0;


    updateLeadKPIs();

    renderLeadTable();

    renderPagination();

}


/* =========================================================
   RENDER TABLE
========================================================= */

function renderLeadTable(){

    const tbody =
        $("leadsTableBody");

    const empty =
        $("leadsEmptyState");


    if(!tbody) return;


    if(!leadsData.length){

        tbody.innerHTML = "";

        if(empty){

            empty.style.display =
                "flex";

        }

        updateLeadCount();

        return;

    }


    if(empty){

        empty.style.display =
            "none";

    }


    tbody.innerHTML =
        leadsData.map(
            (
                lead,
                index
            ) => {

                const rowNumber =
                    (
                        (
                            currentPage - 1
                        ) *
                        (
                            CRM_CONFIG.pageSize ||
                            20
                        )
                    ) +
                    index +
                    1;


                const initials =
                    getInitials(
                        lead.customer_name
                    );


                const status =
                    normalizeLeadStatus(
                        lead.status
                    );


                const statusClass =
                    getStatusClass(
                        status
                    );


                const sales =
                    getSalesName(
                        lead.sales_id
                    );


                const phone =
                    lead.phone || "-";


                const followDate =
                    formatLeadDate(
                        lead.follow_up_date
                    );


                const createdDate =
                    formatLeadDate(
                        lead.created_at
                    );


                return `
                    <tr>

                        <td>
                            ${rowNumber}
                        </td>


                        <td>

                            <div class="customer-cell">

                                <div class="customer-avatar">
                                    ${escapeHTML(
                                        initials
                                    )}
                                </div>

                                <div class="customer-info">

                                    <span
                                        class="customer-name"
                                        data-action="profile"
                                        data-id="${escapeHTML(
                                            lead.id
                                        )}"
                                        title="Open Customer Profile"
                                    >
                                        ${escapeHTML(
                                            lead.customer_name ||
                                            "Unnamed Customer"
                                        )}
                                    </span>

                                    <div class="customer-meta">

                                        <i class="fa-regular fa-calendar"></i>

                                        Lead #${escapeHTML(
                                            lead.id
                                        )}

                                    </div>

                                </div>

                            </div>

                        </td>


                        <td>

                            <div class="business-cell">

                                <strong>
                                    ${escapeHTML(
                                        lead.business ||
                                        "-"
                                    )}
                                </strong>

                                <span>
                                    FSI Prospect
                                </span>

                            </div>

                        </td>


                        <td>

                            <div class="location-cell">

                                <i class="fa-solid fa-location-dot"></i>

                                ${escapeHTML(
                                    lead.location ||
                                    "-"
                                )}

                            </div>

                        </td>


                        <td>

                            <span class="status-pill ${statusClass}">
                                ${escapeHTML(
                                    status
                                )}
                            </span>

                        </td>


                        <td>

                            <div class="sales-cell">

                                <div class="sales-avatar">
                                    ${escapeHTML(
                                        getInitials(
                                            sales
                                        )
                                    )}
                                </div>

                                <span class="sales-name">
                                    ${escapeHTML(
                                        sales
                                    )}
                                </span>

                            </div>

                        </td>


                        <td>

                            <div class="contact-cell">

                                ${
                                    lead.phone
                                    ?
                                    `
                                    <a
                                        href="${whatsappLink(
                                            lead.phone
                                        )}"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="whatsapp-link"
                                        title="WhatsApp"
                                    >
                                        <i class="fa-brands fa-whatsapp"></i>
                                    </a>
                                    `
                                    :
                                    `
                                    <span
                                        class="whatsapp-link"
                                        style="opacity:.35"
                                    >
                                        <i class="fa-brands fa-whatsapp"></i>
                                    </span>
                                    `
                                }


                                <span class="phone-number">
                                    ${escapeHTML(
                                        phone
                                    )}
                                </span>

                            </div>

                        </td>


                        <td>

                            <div class="${getDateClass(
                                lead.follow_up_date
                            )}">
                                ${followDate}
                            </div>

                        </td>


                        <td>

                            <div class="date-cell">
                                ${createdDate}
                            </div>

                        </td>


                        <td>

                            <div class="row-actions">

                                <button
                                    type="button"
                                    class="row-action"
                                    data-action="profile"
                                    data-id="${escapeHTML(
                                        lead.id
                                    )}"
                                    title="View"
                                >
                                    <i class="fa-regular fa-eye"></i>
                                </button>


                                <button
                                    type="button"
                                    class="row-action"
                                    data-action="edit"
                                    data-id="${escapeHTML(
                                        lead.id
                                    )}"
                                    title="Edit"
                                >
                                    <i class="fa-regular fa-pen-to-square"></i>
                                </button>


                                <button
                                    type="button"
                                    class="row-action danger"
                                    data-action="delete"
                                    data-id="${escapeHTML(
                                        lead.id
                                    )}"
                                    title="Delete"
                                >
                                    <i class="fa-regular fa-trash-can"></i>
                                </button>

                            </div>

                        </td>

                    </tr>
                `;

            }
        )
        .join("");


    updateLeadCount();

}


/* =========================================================
   KPI
========================================================= */

function updateLeadKPIs(){

    const total =
        totalLeadsCount || 0;


    const followUp =
        leadsData.filter(
            lead =>
                normalizeLeadStatus(
                    lead.status
                ) ===
                "Follow Up"
        ).length;


    const appointment =
        leadsData.filter(
            lead =>
                lead.appointment
        ).length;


    const closing =
        leadsData.filter(
            lead =>
                normalizeLeadStatus(
                    lead.status
                ) ===
                "Closing"
                ||
                lead.closing
        ).length;


    setText(
        "kpiTotalLeads",
        total
    );


    setText(
        "kpiFollowUp",
        followUp
    );


    setText(
        "kpiAppointment",
        appointment
    );


    setText(
        "kpiClosing",
        closing
    );

}


/* =========================================================
   PAGINATION
========================================================= */

function renderPagination(){

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


    const start =
        totalLeadsCount === 0
        ?
        0
        :
        (
            (
                currentPage - 1
            ) *
            pageSize
        ) +
        1;


    const end =
        Math.min(
            currentPage *
            pageSize,
            totalLeadsCount
        );


    setText(
        "paginationStart",
        start
    );


    setText(
        "paginationEnd",
        end
    );


    setText(
        "paginationTotal",
        totalLeadsCount
    );


    const prev =
        $("prevPageBtn");

    const next =
        $("nextPageBtn");


    if(prev){

        prev.disabled =
            currentPage <= 1;

    }


    if(next){

        next.disabled =
            currentPage >=
            totalPages;

    }


    const numbers =
        $("paginationNumbers");


    if(!numbers) return;


    numbers.innerHTML = "";


    const maxButtons = 5;


    let startPage =
        Math.max(
            1,
            currentPage -
            Math.floor(
                maxButtons / 2
            )
        );


    let endPage =
        Math.min(
            totalPages,
            startPage +
            maxButtons -
            1
        );


    if(
        endPage -
        startPage +
        1 <
        maxButtons
    ){

        startPage =
            Math.max(
                1,
                endPage -
                maxButtons +
                1
            );

    }


    for(
        let page = startPage;
        page <= endPage;
        page++
    ){

        const button =
            document.createElement(
                "button"
            );


        button.type =
            "button";


        button.className =
            "pagination-number" +
            (
                page === currentPage
                ?
                " active"
                :
                ""
            );


        button.textContent =
            page;


        button.addEventListener(
            "click",
            () => {

                if(
                    page ===
                    currentPage
                ){

                    return;

                }


                currentPage =
                    page;


                loadLeads();

            }
        );


        numbers.appendChild(
            button
        );

    }

}


/* =========================================================
   COUNT
========================================================= */

function updateLeadCount(){

    const label =
        $("leadCountLabel");


    if(!label) return;


    label.textContent =
        `${totalLeadsCount} ${
            totalLeadsCount === 1
            ?
            "lead"
            :
            "leads"
        }`;

}


/* =========================================================
   ADD LEAD
========================================================= */

async function openAddLead(){

    editingLeadId =
        null;


    resetLeadForm();


    setText(
        "leadModalTitle",
        "Add New Lead"
    );


    const status =
        $("leadStatus");


    if(status){

        status.value =
            "New";

    }


    const assign =
        $("leadSalesAssign");


    if(
        assign &&
        currentProfile &&
        currentProfile.role !==
        "Admin"
    ){

        assign.value =
            currentProfile.id;

    }


    openModal(
        "leadModal"
    );

}


/* =========================================================
   EDIT LEAD
   EDIT SEKARANG MEMBUKA HALAMAN PENUH
========================================================= */

function openEditLead(id){

    if(!id){

        return;

    }


    window.location.href =
        `customer-form.html?id=${encodeURIComponent(id)}`;

}


/* =========================================================
   GET LEAD
========================================================= */

async function getLeadById(id){

    const {
        data,
        error
    } =
        await supabaseClient
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
                `
            )
            .eq(
                "id",
                id
            )
            .single();


    if(error){

        console.error(
            "Get lead:",
            error
        );

        return null;

    }


    return data;

}


/* =========================================================
   FORM
========================================================= */

function resetLeadForm(){

    const form =
        $("leadForm");


    if(form){

        form.reset();

    }


    setValue(
        "leadId",
        ""
    );


    setValue(
        "leadCustomerName",
        ""
    );


    setValue(
        "leadPhone",
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
        "leadFollowUpDate",
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
        "leadSpk",
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


    showFormMessage(
        "leadFormMessage",
        "",
        ""
    );

}


/* =========================================================
   FILL FORM
========================================================= */

function fillLeadForm(lead){

    setValue(
        "leadId",
        lead.id
    );


    setValue(
        "leadCustomerName",
        lead.customer_name ||
        ""
    );


    setValue(
        "leadPhone",
        lead.phone ||
        ""
    );


    setValue(
        "leadBusiness",
        lead.business ||
        ""
    );


    setValue(
        "leadLocation",
        lead.location ||
        ""
    );


    setValue(
        "leadStatus",
        normalizeLeadStatus(
            lead.status
        )
    );


    setValue(
        "leadFollowUpDate",
        formatDateInput(
            lead.follow_up_date
        )
    );


    setValue(
        "leadAppointment",
        formatDateInput(
            lead.appointment
        )
    );


    setValue(
        "leadSiteSurvey",
        formatDateInput(
            lead.site_survey
        )
    );


    setValue(
        "leadQuotation",
        formatDateInput(
            lead.quotation
        )
    );


    setValue(
        "leadSpk",
        formatDateInput(
            lead.spk
        )
    );


    setValue(
        "leadClosing",
        formatDateInput(
            lead.closing
        )
    );


    setValue(
        "leadNotes",
        lead.notes ||
        ""
    );


    setValue(
        "leadSalesAssign",
        lead.sales_id ||
        ""
    );

}


/* =========================================================
   SAVE
========================================================= */

async function saveLead(event){

    event.preventDefault();


    const customerName =
        $("leadCustomerName")
            ?.value
            ?.trim();


    if(!customerName){

        showFormMessage(
            "leadFormMessage",
            "Nama customer wajib diisi.",
            "error"
        );

        return;

    }


    const payload = {

        customer_name:
            customerName,

        phone:
            $("leadPhone")
                ?.value
                ?.trim() ||
            null,

        business:
            $("leadBusiness")
                ?.value
                ?.trim() ||
            null,

        location:
            $("leadLocation")
                ?.value
                ?.trim() ||
            null,

        status:
            $("leadStatus")
                ?.value ||
            "New",

        follow_up_date:
            $("leadFollowUpDate")
                ?.value ||
            null,

        appointment:
            $("leadAppointment")
                ?.value ||
            null,

        site_survey:
            $("leadSiteSurvey")
                ?.value ||
            null,

        quotation:
            $("leadQuotation")
                ?.value ||
            null,

        spk:
            $("leadSpk")
                ?.value ||
            null,

        closing:
            $("leadClosing")
                ?.value ||
            null,

        notes:
            $("leadNotes")
                ?.value
                ?.trim() ||
            null

    };


    /*
       SALES hanya bisa menyimpan
       lead ke dirinya sendiri.
    */

    if(
        currentProfile &&
        currentProfile.role !==
        "Admin"
    ){

        payload.sales_id =
            currentProfile.id;

    }
    else{

        payload.sales_id =
            $("leadSalesAssign")
                ?.value ||
            null;

    }


    const saveButton =
        $("saveLeadBtn");


    setButtonLoading(
        saveButton,
        true
    );


    try{

        let result;


        if(editingLeadId){

            payload.updated_by =
                currentProfile?.id ||
                null;


            result =
                await supabaseClient
                    .from(
                        CRM_CONFIG.leadTable
                    )
                    .update(
                        payload
                    )
                    .eq(
                        "id",
                        editingLeadId
                    );

        }
        else{

            payload.created_by =
                currentProfile?.id ||
                null;


            result =
                await supabaseClient
                    .from(
                        CRM_CONFIG.leadTable
                    )
                    .insert(
                        payload
                    );

        }


        if(result.error){

            throw result.error;

        }


        closeModal(
            "leadModal"
        );


        showToast(
            editingLeadId
            ?
            "Lead berhasil diperbarui."
            :
            "Lead berhasil ditambahkan.",
            "success"
        );


        editingLeadId =
            null;


        await loadLeads();

    }
    catch(error){

        console.error(
            "Save lead:",
            error
        );


        showFormMessage(
            "leadFormMessage",
            error.message ||
            "Gagal menyimpan lead.",
            "error"
        );

    }
    finally{

        setButtonLoading(
            saveButton,
            false
        );

    }

}


/* =========================================================
   DELETE
========================================================= */

function confirmDeleteLead(id){

    const lead =
        leadsData.find(
            item =>
                String(item.id) ===
                String(id)
        );


    if(!lead) return;


    if(!canEditLead(lead)){

        showToast(
            "Anda tidak memiliki akses.",
            "error"
        );

        return;

    }


    openConfirm(
        "Delete Lead",
        `Hapus lead "${lead.customer_name}"? Data yang dihapus tidak dapat dikembalikan.`,
        async () => {

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


            if(error){

                console.error(
                    "Delete lead:",
                    error
                );


                showToast(
                    error.message ||
                    "Gagal menghapus lead.",
                    "error"
                );

                return;

            }


            showToast(
                "Lead berhasil dihapus.",
                "success"
            );


            await loadLeads();

        }
    );

}


/* =========================================================
   CONFIRM
========================================================= */

function openConfirm(
    title,
    message,
    callback
){

    setText(
        "confirmTitle",
        title
    );


    setText(
        "confirmMessage",
        message
    );


    confirmCallback =
        callback;


    const button =
        $("confirmActionBtn");


    if(button){

        button.onclick =
            async () => {

                if(
                    typeof confirmCallback ===
                    "function"
                ){

                    await confirmCallback();

                }


                confirmCallback =
                    null;


                closeModal(
                    "confirmModal"
                );

            };

    }


    openModal(
        "confirmModal"
    );

}


/* =========================================================
   ACTION CLICK
========================================================= */

function handleLeadActionClick(event){

    const element =
        event.target.closest(
            "[data-action]"
        );


    if(!element) return;


    const action =
        element.dataset.action;


    const id =
        element.dataset.id;


    if(!id) return;


    if(action === "profile"){

        openCustomerProfile(
            id
        );

    }


    if(action === "edit"){

        openEditLead(
            id
        );

    }


    if(action === "delete"){

        confirmDeleteLead(
            id
        );

    }

}


/* =========================================================
   PROFILE / PERMISSION
========================================================= */

function canEditLead(lead){

    if(
        currentProfile?.role ===
        "Admin"
    ){

        return true;

    }


    return String(
        lead.sales_id
    ) === String(
        currentProfile?.id
    );

}


/* =========================================================
   FILTER RESET
========================================================= */

function resetLeadFilters(){

    setValue(
        "leadSearch",
        ""
    );


    setValue(
        "statusFilter",
        ""
    );


    setValue(
        "businessFilter",
        ""
    );


    setValue(
        "locationFilter",
        ""
    );


    setValue(
        "salesFilter",
        ""
    );


    currentPage =
        1;


    loadLeads();

}


/* =========================================================
   EXPORT
========================================================= */

async function exportLeads(){

    const {
        data,
        error
    } =
        await buildLeadQuery()
            .order(
                "created_at",
                {
                    ascending:false
                }
            );


    if(error){

        showToast(
            error.message ||
            "Gagal export.",
            "error"
        );

        return;

    }


    if(!data?.length){

        showToast(
            "Tidak ada data untuk di-export.",
            "warning"
        );

        return;

    }


    const rows =
        data.map(
            lead => ({

                ID:
                    lead.id,

                Customer:
                    lead.customer_name,

                Phone:
                    lead.phone,

                Business:
                    lead.business,

                Location:
                    lead.location,

                Status:
                    lead.status,

                Sales:
                    getSalesName(
                        lead.sales_id
                    ),

                Follow_Up:
                    lead.follow_up_date,

                Appointment:
                    lead.appointment,

                Site_Survey:
                    lead.site_survey,

                Quotation:
                    lead.quotation,

                SPK:
                    lead.spk,

                Closing:
                    lead.closing,

                Notes:
                    lead.notes,

                Created:
                    lead.created_at

            })
        );


    exportCSV(
        rows,
        "fsi-crm-leads.csv"
    );


    showToast(
        "Export berhasil.",
        "success"
    );

}


/* =========================================================
   HELPERS
========================================================= */

function getInitials(name){

    if(!name){

        return "NA";

    }


    const parts =
        String(name)
            .trim()
            .split(/\s+/)
            .filter(Boolean);


    if(parts.length === 1){

        return parts[0]
            .substring(
                0,
                2
            )
            .toUpperCase();

    }


    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();

}


function setText(
    id,
    value
){

    const el =
        $(id);


    if(el){

        el.textContent =
            value ??
            "";

    }

}


function setValue(
    id,
    value
){

    const el =
        $(id);


    if(el){

        el.value =
            value ??
            "";

    }

}


function formatLeadDate(value){

    if(!value){

        return "-";

    }


    try{

        return new Intl.DateTimeFormat(
            "id-ID",
            {
                day:"2-digit",
                month:"short",
                year:"numeric"
            }
        ).format(
            new Date(value)
        );

    }
    catch{

        return value;

    }

}


function getDateClass(value){

    if(!value){

        return "date-cell";

    }


    const date =
        new Date(value);


    const now =
        new Date();


    const today =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );


    const target =
        new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        );


    if(
        target.getTime() ===
        today.getTime()
    ){

        return "date-cell today";

    }


    if(target < today){

        return "date-cell overdue";

    }


    return "date-cell";

}


function getStatusClass(status){

    return "status-" +
        String(status)
            .toLowerCase()
            .replace(
                /[^a-z0-9]+/g,
                "-"
            )
            .replace(
                /^-|-$/g,
                ""
            );

}


/* =========================================================
   AUTO INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        if(
            document.getElementById(
                "leadsTableBody"
            )
        ){

            /*
               auth.js tetap menangani
               authentication.
            */

            setTimeout(
                () => {

                    if(
                        typeof initializeLeadsPage ===
                        "function"
                    ){

                        initializeLeadsPage();

                    }

                },
                250
            );

        }

    }
);
