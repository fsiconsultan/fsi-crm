// ============================================================
// FSI CRM - LEADS INITIALIZATION
// ============================================================
//
// Fungsi:
// 1. Initialize Leads
// 2. Bind search
// 3. Bind filters
// 4. Bind pagination
// 5. Bind modal
// 6. Load filter options
// 7. Apply Dashboard filter
// 8. Support Dashboard -> Leads navigation
//
// IMPORTANT:
// - Tidak mengubah sistem filter existing.
// - Tidak mengubah RLS.
// - Tidak mengubah query database.
// - Dashboard hanya mengirim filter melalui sessionStorage.
// ============================================================


// ============================================================
// INITIALIZE EVENTS
// ============================================================

function initializeLeads() {

    if (leadsInitialized) {

        // ----------------------------------------------------
        // IMPORTANT
        // ----------------------------------------------------
        // Walaupun Leads sudah pernah initialize,
        // kita tetap cek apakah ada filter dari Dashboard.
        // ----------------------------------------------------

        applyDashboardLeadsFilter();

        return;
    }


    leadsInitialized =
        true;


    // ========================================================
    // ADD CUSTOMER
    // ========================================================

    bindAddCustomerButtons();


    // ========================================================
    // SEARCH
    // ========================================================

    const searchInput =
        leadElement(
            "lead-search",
            "leadSearch",
            "leadsSearch"
        );


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            onSearchInput
        );
    }


    // ========================================================
    // FILTER EVENTS
    // ========================================================

    [
        [
            "filter-status",
            "statusFilter",
            "leadStatusFilter"
        ],

        [
            "filter-business",
            "businessFilter"
        ],

        [
            "salesFilter"
        ]

    ].forEach(
        ids => {

            const element =
                leadElement(
                    ...ids
                );


            if (!element) {

                return;
            }


            element.addEventListener(
                "change",
                function () {

                    // ====================================================
                    // SALES FILTER
                    // ====================================================

                    if (
                        element.id ===
                        "salesFilter"
                    ) {

                        window.crmSelectedSalesId =
                            element.value ||
                            "";


                        const selected =
                            leadGetSalesData()
                                .find(
                                    sales =>
                                        String(
                                            sales.id
                                        ) ===
                                        String(
                                            element.value
                                        )
                                );


                        window.crmSelectedSalesName =
                            selected
                                ? (
                                    selected.name ||
                                    selected.full_name ||
                                    selected.username ||
                                    ""
                                )
                                : "";
                    }


                    // ====================================================
                    // RESET PAGE
                    // ====================================================

                    leadSetCurrentPage(
                        1
                    );


                    // ====================================================
                    // APPLY FILTER
                    // ====================================================

                    filterLeads();
                }
            );
        }
    );


    // ========================================================
    // PREVIOUS PAGE
    // ========================================================

    const prevBtn =
        leadElement(
            "btn-prev-page",
            "prevBtn"
        );


    if (prevBtn) {

        prevBtn.addEventListener(
            "click",
            function () {

                changePage(
                    -1
                );
            }
        );
    }


    // ========================================================
    // NEXT PAGE
    // ========================================================

    const nextBtn =
        leadElement(
            "btn-next-page",
            "nextBtn"
        );


    if (nextBtn) {

        nextBtn.addEventListener(
            "click",
            function () {

                changePage(
                    1
                );
            }
        );
    }


    // ========================================================
    // CLEAR FILTER
    // ========================================================

    const clearFilterBtn =
        leadElement(
            "btn-clear-filters",
            "clearLeadFilters"
        );


    if (clearFilterBtn) {

        clearFilterBtn.addEventListener(
            "click",
            clearLeadFilters
        );
    }


    // ========================================================
    // TABLE ACTIONS
    // ========================================================

    setupTableActions();


    // ========================================================
    // ESC KEY
    // ========================================================

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key !==
                "Escape"
            ) {

                return;
            }


            const modal =
                leadElement(
                    "leadModal"
                );


            if (
                modal &&
                modal.classList.contains(
                    "show"
                )
            ) {

                if (
                    window.FSICustomerForm &&
                    typeof window.FSICustomerForm.closeCustomerForm ===
                    "function"
                ) {

                    window.FSICustomerForm.closeCustomerForm();

                } else {

                    closeLeadModal();
                }
            }
        }
    );


    // ========================================================
    // MODAL BACKDROP
    // ========================================================

    const modal =
        leadElement(
            "leadModal"
        );


    if (modal) {

        modal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    modal
                ) {

                    if (
                        window.FSICustomerForm &&
                        typeof window.FSICustomerForm.closeCustomerForm ===
                        "function"
                    ) {

                        window.FSICustomerForm.closeCustomerForm();

                    } else {

                        closeLeadModal();
                    }
                }
            }
        );
    }


    // ========================================================
    // SALES ACCESS
    // ========================================================

    setupSalesAssignmentAccess();


    refreshAddCustomerVisibility();


    // ========================================================
    // FILTER OPTIONS
    // ========================================================

    loadFilterOptions()
        .then(
            function () {

                // ------------------------------------------------
                // IMPORTANT
                // ------------------------------------------------
                // Setelah option Sales + Status selesai dimuat,
                // baru kita apply filter dari Dashboard.
                // ------------------------------------------------

                applyDashboardLeadsFilter();
            }
        )
        .catch(
            error => {

                console.warn(
                    "FSI CRM: initial filter options load failed:",
                    error
                );


                // ------------------------------------------------
                // Tetap coba apply Dashboard filter.
                // ------------------------------------------------

                applyDashboardLeadsFilter();
            }
        );
}


// ============================================================
// APPLY DASHBOARD -> LEADS FILTER
// ============================================================
//
// Dashboard menyimpan:
//
// {
//     salesId: "...",
//     status: "..."
// }
//
// ke:
//
// fsi_dashboard_leads_filter
//
// Fungsi ini membaca data tersebut lalu mengisi:
// - Sales filter
// - Status filter
//
// Setelah itu loadLeads() dipanggil.
//
// ============================================================

function applyDashboardLeadsFilter() {

    let rawFilter = null;


    // ========================================================
    // READ SESSION STORAGE
    // ========================================================

    try {

        rawFilter =
            sessionStorage.getItem(
                "fsi_dashboard_leads_filter"
            );

    } catch (error) {

        console.warn(
            "FSI CRM: gagal membaca Dashboard Leads filter:",
            error
        );


        return;
    }


    // ========================================================
    // NO FILTER
    // ========================================================

    if (!rawFilter) {

        return;
    }


    let filterData;


    // ========================================================
    // PARSE
    // ========================================================

    try {

        filterData =
            JSON.parse(
                rawFilter
            );

    } catch (error) {

        console.warn(
            "FSI CRM: Dashboard Leads filter tidak valid:",
            error
        );


        try {

            sessionStorage.removeItem(
                "fsi_dashboard_leads_filter"
            );

        } catch (removeError) {

            console.warn(
                "FSI CRM: gagal membersihkan Dashboard Leads filter:",
                removeError
            );
        }


        return;
    }


    if (
        !filterData ||
        typeof filterData !==
        "object"
    ) {

        return;
    }


    // ========================================================
    // VALUES
    // ========================================================

    const salesId =
        String(
            filterData.salesId ||
            ""
        ).trim();


    const status =
        String(
            filterData.status ||
            ""
        ).trim();


    console.log(
        "FSI CRM: menerima filter dari Dashboard:",
        {
            salesId,
            status
        }
    );


    // ========================================================
    // SALES FILTER
    // ========================================================

    const salesSelect =
        leadElement(
            "salesFilter"
        );


    if (salesSelect) {

        // ----------------------------------------------------
        // Set selected Sales
        // ----------------------------------------------------

        salesSelect.value =
            salesId;


        // ----------------------------------------------------
        // Global state
        // ----------------------------------------------------

        window.crmSelectedSalesId =
            salesId;


        // ----------------------------------------------------
        // Sales name
        // ----------------------------------------------------

        if (salesId) {

            try {

                const salesData =
                    typeof leadGetSalesData ===
                    "function"

                        ? leadGetSalesData()

                        : [];


                const selected =
                    Array.isArray(
                        salesData
                    )
                        ? salesData.find(
                            sales =>
                                String(
                                    sales?.id ||
                                    ""
                                ).trim() ===
                                salesId
                        )
                        : null;


                window.crmSelectedSalesName =
                    selected
                        ? (
                            selected.name ||
                            selected.full_name ||
                            selected.username ||
                            ""
                        )
                        : "";

            } catch (error) {

                console.warn(
                    "FSI CRM: gagal mengambil Sales name:",
                    error
                );


                window.crmSelectedSalesName =
                    "";
            }

        } else {

            window.crmSelectedSalesName =
                "";
        }
    }


    // ========================================================
    // STATUS FILTER
    // ========================================================

    const statusSelect =
        leadElement(
            "filter-status",
            "statusFilter",
            "leadStatusFilter"
        );


    if (statusSelect) {

        statusSelect.value =
            status;
    }


    // ========================================================
    // RESET PAGE
    // ========================================================

    leadSetCurrentPage(
        1
    );


    // ========================================================
    // UPDATE CONTEXT
    // ========================================================

    if (
        typeof updateLeadsContext ===
        "function"
    ) {

        try {

            updateLeadsContext();

        } catch (error) {

            console.warn(
                "FSI CRM: updateLeadsContext error:",
                error
            );
        }
    }


    // ========================================================
    // REMOVE SESSION FILTER
    // ========================================================
    //
    // Setelah dibaca, hapus.
    //
    // Supaya ketika user nanti membuka Dashboard biasa
    // tidak membawa filter lama secara tidak sengaja.
    //
    // ========================================================

    try {

        sessionStorage.removeItem(
            "fsi_dashboard_leads_filter"
        );

    } catch (error) {

        console.warn(
            "FSI CRM: gagal membersihkan Dashboard filter:",
            error
        );
    }


    // ========================================================
    // LOAD LEADS
    // ========================================================

    loadLeads(
        1
    );
}


// ============================================================
// PROFILE READY
// ============================================================

function handleProfileReady() {

    setupSalesAssignmentAccess();


    refreshAddCustomerVisibility();


    bindAddCustomerButtons();


    loadFilterOptions()
        .then(
            function () {

                // ------------------------------------------------
                // Dashboard filter bisa saja sudah dikirim
                // sebelum profile selesai ready.
                // ------------------------------------------------

                applyDashboardLeadsFilter();
            }
        )
        .catch(
            error => {

                console.warn(
                    "FSI CRM: profile-ready filter load failed:",
                    error
                );


                applyDashboardLeadsFilter();
            }
        );
}


// ============================================================
// SALES SELECTED FROM HEADER
// ============================================================

function handleSalesSelected(
    event
) {

    if (
        !leadIsAdmin()
    ) {

        return;
    }


    const detail =
        event?.detail ||
        {};


    // ========================================================
    // SALES ID
    // ========================================================

    if (
        Object.prototype.hasOwnProperty.call(
            detail,
            "salesId"
        )
    ) {

        window.crmSelectedSalesId =
            detail.salesId ||
            "";
    }


    // ========================================================
    // SALES NAME
    // ========================================================

    if (
        Object.prototype.hasOwnProperty.call(
            detail,
            "salesName"
        )
    ) {

        window.crmSelectedSalesName =
            detail.salesName ||
            "";
    }


    // ========================================================
    // SELECT
    // ========================================================

    const salesSelect =
        leadElement(
            "salesFilter"
        );


    if (salesSelect) {

        salesSelect.value =
            window.crmSelectedSalesId ||
            "";
    }


    // ========================================================
    // PAGE
    // ========================================================

    leadSetCurrentPage(
        1
    );


    // ========================================================
    // CONTEXT
    // ========================================================

    updateLeadsContext();


    // ========================================================
    // LOAD
    // ========================================================

    loadLeads(
        1
    );
}


// ============================================================
// APP READY
// ============================================================

function handleAppReady() {

    setupSalesAssignmentAccess();


    updateLeadsContext();


    refreshAddCustomerVisibility();


    bindAddCustomerButtons();


    loadFilterOptions()
        .then(
            function () {

                applyDashboardLeadsFilter();
            }
        )
        .catch(
            error => {

                console.warn(
                    "FSI CRM: app-ready filter load failed:",
                    error
                );


                applyDashboardLeadsFilter();
            }
        );
}


// ============================================================
// EXPORT TO WINDOW
// ============================================================

window.loadFilterOptions =
    loadFilterOptions;


window.populateFilter =
    populateFilter;


window.loadLeads =
    loadLeads;


window.updatePagination =
    updatePagination;


window.changePage =
    changePage;


window.nextLeadPage =
    nextLeadPage;


window.previousLeadPage =
    previousLeadPage;


window.renderLeads =
    renderLeads;


window.filterLeads =
    filterLeads;


window.onSearchInput =
    onSearchInput;


window.clearLeadFilters =
    clearLeadFilters;


window.openLeadModal =
    openLeadModal;


window.closeLeadModal =
    closeLeadModal;


window.clearLeadForm =
    clearLeadForm;


window.openEditLead =
    openEditLead;


window.saveLead =
    saveLead;


window.deleteLead =
    deleteLead;


window.setupSalesAssignmentAccess =
    setupSalesAssignmentAccess;


window.clearSalesHeaderFilter =
    clearSalesHeaderFilter;


window.updateAddCustomerVisibility =
    updateAddCustomerVisibility;


window.bindAddCustomerButtons =
    bindAddCustomerButtons;


// ============================================================
// NEW DASHBOARD FILTER FUNCTION
// ============================================================

window.applyDashboardLeadsFilter =
    applyDashboardLeadsFilter;


// ============================================================
// FSI LEADS NAMESPACE
// ============================================================

window.FSILeads = {

    loadFilterOptions,

    populateFilter,

    loadLeads,

    updatePagination,

    changePage,

    nextLeadPage,

    previousLeadPage,

    renderLeads,

    filterLeads,

    onSearchInput,

    clearLeadFilters,

    openLeadModal,

    closeLeadModal,

    clearLeadForm,

    openEditLead,

    saveLead,

    deleteLead,

    setupSalesAssignmentAccess,

    clearSalesHeaderFilter,

    updateAddCustomerVisibility,

    bindAddCustomerButtons,

    applyDashboardLeadsFilter
};


// ============================================================
// DOM READY
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initializeLeads();


        console.log(
            "FSI CRM: Leads module loaded successfully."
        );
    }
);


// ============================================================
// PROFILE READY
// ============================================================

document.addEventListener(
    "fsi:profile-ready",
    function () {

        handleProfileReady();
    }
);


// ============================================================
// APP READY
// ============================================================

document.addEventListener(
    "fsi:app-ready",
    function () {

        handleAppReady();
    }
);


// ============================================================
// SALES SELECTED
// ============================================================

document.addEventListener(
    "fsi:sales-selected",
    function (event) {

        handleSalesSelected(
            event
        );
    }
);


// ============================================================
// LEAD CHANGED
// ============================================================

document.addEventListener(
    "fsi:lead-changed",
    function () {

        // ----------------------------------------------------
        // Save/delete melakukan refresh sendiri.
        // ----------------------------------------------------
    }
);
