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
// 9. Prevent duplicate Leads loading
//
// IMPORTANT:
// - Tidak mengubah sistem filter existing.
// - Tidak mengubah RLS.
// - Tidak mengubah query database.
// - Dashboard mengirim filter melalui sessionStorage.
// - Loading Leads dikontrol oleh file ini.
// - Dashboard Sales selector (#salesFilter) TIDAK disentuh.
// - Leads Sales selector menggunakan #filter-sales.
// - State menggunakan window.FSILeadsState.
// ============================================================


// ============================================================
// GLOBAL STATE
// ============================================================

window.FSILeadsState =
    window.FSILeadsState ||
    {
        initialized: false,

        loadingPromise: null,

        filterOptionsLoadingPromise: null,

        lastLoadedKey: "",

        dashboardFilterApplied: false,

        pageOpenedListenerBound: false,

        domReadyBound: false,

        profileReadyBound: false,

        appReadyBound: false,

        salesSelectedBound: false,

        leadChangedBound: false
    };


// ============================================================
// STATE SHORTCUT
// ============================================================

var leadsState =
    window.FSILeadsState;


// ============================================================
// GET LEADS SALES SELECT
// ============================================================
//
// PENTING:
// #salesFilter = Dashboard
// #filter-sales = Leads
//
// Jangan gunakan #salesFilter untuk Leads.
// ============================================================

function leadsGetSalesSelect() {

    return (
        document.getElementById("filter-sales") ||
        document.getElementById("leadSalesFilter") ||
        document.getElementById("filterSales") ||
        null
    );
}


// ============================================================
// CREATE LEADS LOAD KEY
// ============================================================

function leadsCreateLoadKey(
    page
) {

    page =
        Number(page) > 0
            ? Number(page)
            : 1;

    var search = "";
    var status = "";
    var business = "";
    var sales = "";

    try {

        var searchElement =
            leadElement(
                "lead-search",
                "leadSearch",
                "leadsSearch"
            );


        var statusElement =
            leadElement(
                "filter-status",
                "statusFilter",
                "leadStatusFilter"
            );


        var businessElement =
            leadElement(
                "filter-business",
                "businessFilter"
            );


        // ====================================================
        // IMPORTANT:
        // Leads harus menggunakan #filter-sales
        // ====================================================

        var salesElement =
            leadsGetSalesSelect();


        search =
            String(
                searchElement &&
                searchElement.value
                    ? searchElement.value
                    : ""
            ).trim();


        status =
            String(
                statusElement &&
                statusElement.value
                    ? statusElement.value
                    : ""
            ).trim();


        business =
            String(
                businessElement &&
                businessElement.value
                    ? businessElement.value
                    : ""
            ).trim();


        sales =
            String(
                salesElement &&
                salesElement.value
                    ? salesElement.value
                    : ""
            ).trim();

    } catch (error) {

        console.warn(
            "FSI CRM: gagal membuat Leads load key:",
            error
        );
    }


    return [
        String(page),
        search,
        status,
        business,
        sales
    ].join("|");
}


// ============================================================
// SAFE LOAD LEADS
// ============================================================

async function leadsSafeLoad(
    page,
    options
) {

    page =
        Number(page) > 0
            ? Number(page)
            : 1;


    options =
        options ||
        {};


    var force =
        options.force === true;


    var reason =
        options.reason ||
        "unknown";


    var loadKey =
        leadsCreateLoadKey(
            page
        );


    console.log(
        "FSI CRM: Leads load request:",
        {
            page: page,
            key: loadKey,
            reason: reason,
            force: force
        }
    );


    // ========================================================
    // REQUEST SEDANG BERJALAN
    // ========================================================

    if (
        leadsState.loadingPromise
    ) {

        console.log(
            "FSI CRM: Leads load masih berjalan. Request tambahan ditahan."
        );

        return leadsState.loadingPromise;
    }


    // ========================================================
    // REQUEST SAMA SUDAH SELESAI
    // ========================================================

    if (
        !force &&
        leadsState.lastLoadedKey ===
        loadKey
    ) {

        console.log(
            "FSI CRM: Leads dengan filter yang sama sudah dimuat. Skip."
        );

        return true;
    }


    // ========================================================
    // CHECK LOAD FUNCTION
    // ========================================================

    if (
        typeof window.loadLeads !==
        "function"
    ) {

        console.warn(
            "FSI CRM: window.loadLeads belum tersedia."
        );

        return false;
    }


    // ========================================================
    // LOAD
    // ========================================================

    leadsState.loadingPromise =
        (async function () {

            try {

                await window.loadLeads(
                    page
                );


                leadsState.lastLoadedKey =
                    leadsCreateLoadKey(
                        page
                    );


                return true;

            } catch (error) {

                console.error(
                    "FSI CRM: Leads load error:",
                    error
                );

                throw error;

            } finally {

                leadsState.loadingPromise =
                    null;
            }

        })();


    return leadsState.loadingPromise;
}


// ============================================================
// RESET LEADS LOAD CACHE
// ============================================================

function resetLeadsLoadCache() {

    leadsState.lastLoadedKey =
        "";


    console.log(
        "FSI CRM: Leads load cache reset."
    );
}


// ============================================================
// LOAD FILTER OPTIONS ONCE
// ============================================================

function loadFilterOptionsOnce(
    options
) {

    options =
        options ||
        {};


    var reason =
        options.reason ||
        "unknown";


    if (
        leadsState.filterOptionsLoadingPromise
    ) {

        console.log(
            "FSI CRM: filter options masih loading. Reuse request."
        );

        return leadsState.filterOptionsLoadingPromise;
    }


    if (
        typeof window.loadFilterOptions !==
        "function"
    ) {

        console.warn(
            "FSI CRM: window.loadFilterOptions belum tersedia."
        );

        return Promise.resolve(
            false
        );
    }


    leadsState.filterOptionsLoadingPromise =
        (async function () {

            try {

                console.log(
                    "FSI CRM: loading filter options:",
                    reason
                );


                await window.loadFilterOptions();


                return true;

            } catch (error) {

                console.warn(
                    "FSI CRM: filter options load failed:",
                    error
                );

                return false;

            } finally {

                leadsState.filterOptionsLoadingPromise =
                    null;
            }

        })();


    return leadsState.filterOptionsLoadingPromise;
}


// ============================================================
// INITIALIZE EVENTS
// ============================================================

function initializeLeads() {

    if (
        leadsState.initialized
    ) {

        console.log(
            "FSI CRM: Leads already initialized."
        );

        return;
    }


    leadsState.initialized =
        true;


    // ========================================================
    // ADD CUSTOMER
    // ========================================================

    if (
        typeof bindAddCustomerButtons ===
        "function"
    ) {

        bindAddCustomerButtons();
    }


    // ========================================================
    // SEARCH
    // ========================================================

    var searchInput =
        leadElement(
            "lead-search",
            "leadSearch",
            "leadsSearch"
        );


    if (searchInput) {

        if (
            searchInput.dataset.fsiSearchBound !==
            "true"
        ) {

            searchInput.dataset.fsiSearchBound =
                "true";


            searchInput.addEventListener(
                "input",
                onSearchInput
            );
        }
    }


    // ========================================================
    // STATUS + BUSINESS FILTER
    //
    // IMPORTANT:
    // Sales filter (#filter-sales) sudah ditangani
    // oleh leads-filters.js.
    //
    // Jangan bind ulang di sini.
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
        ]

    ].forEach(
        function (ids) {

            var element =
                leadElement(
                    ...ids
                );


            if (!element) {
                return;
            }


            var boundKey =
                "fsiFilterBound";


            if (
                element.dataset[boundKey] ===
                "true"
            ) {

                return;
            }


            element.dataset[boundKey] =
                "true";


            element.addEventListener(
                "change",
                function () {

                    resetLeadsLoadCache();


                    if (
                        typeof leadSetCurrentPage ===
                        "function"
                    ) {

                        leadSetCurrentPage(
                            1
                        );
                    }


                    if (
                        typeof filterLeads ===
                        "function"
                    ) {

                        filterLeads();
                    }

                }
            );

        }
    );


    // ========================================================
    // PREVIOUS PAGE
    // ========================================================

    var prevBtn =
        leadElement(
            "btn-prev-page",
            "prevBtn"
        );


    if (prevBtn) {

        if (
            prevBtn.dataset.fsiPaginationBound !==
            "true"
        ) {

            prevBtn.dataset.fsiPaginationBound =
                "true";


            prevBtn.addEventListener(
                "click",
                function () {

                    resetLeadsLoadCache();


                    if (
                        typeof changePage ===
                        "function"
                    ) {

                        changePage(
                            -1
                        );
                    }

                }
            );
        }
    }


    // ========================================================
    // NEXT PAGE
    // ========================================================

    var nextBtn =
        leadElement(
            "btn-next-page",
            "nextBtn"
        );


    if (nextBtn) {

        if (
            nextBtn.dataset.fsiPaginationBound !==
            "true"
        ) {

            nextBtn.dataset.fsiPaginationBound =
                "true";


            nextBtn.addEventListener(
                "click",
                function () {

                    resetLeadsLoadCache();


                    if (
                        typeof changePage ===
                        "function"
                    ) {

                        changePage(
                            1
                        );
                    }

                }
            );
        }
    }


    // ========================================================
    // CLEAR FILTER
    // ========================================================

    var clearFilterBtn =
        leadElement(
            "btn-clear-filters",
            "clearLeadFilters"
        );


    if (clearFilterBtn) {

        if (
            clearFilterBtn.dataset.fsiClearBound !==
            "true"
        ) {

            clearFilterBtn.dataset.fsiClearBound =
                "true";


            clearFilterBtn.addEventListener(
                "click",
                function () {

                    resetLeadsLoadCache();


                    if (
                        typeof clearLeadFilters ===
                        "function"
                    ) {

                        clearLeadFilters();
                    }

                }
            );
        }
    }


    // ========================================================
    // TABLE ACTIONS
    // ========================================================

    if (
        typeof setupTableActions ===
        "function"
    ) {

        setupTableActions();
    }


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


            var modal =
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

                } else if (
                    typeof closeLeadModal ===
                    "function"
                ) {

                    closeLeadModal();
                }
            }
        }
    );


    // ========================================================
    // MODAL BACKDROP
    // ========================================================

    var modal =
        leadElement(
            "leadModal"
        );


    if (modal) {

        if (
            modal.dataset.fsiModalBound !==
            "true"
        ) {

            modal.dataset.fsiModalBound =
                "true";


            modal.addEventListener(
                "click",
                function (event) {

                    if (
                        event.target !==
                        modal
                    ) {
                        return;
                    }


                    if (
                        window.FSICustomerForm &&
                        typeof window.FSICustomerForm.closeCustomerForm ===
                        "function"
                    ) {

                        window.FSICustomerForm.closeCustomerForm();

                    } else if (
                        typeof closeLeadModal ===
                        "function"
                    ) {

                        closeLeadModal();
                    }

                }
            );
        }
    }


    // ========================================================
    // SALES ACCESS
    // ========================================================

    if (
        typeof setupSalesAssignmentAccess ===
        "function"
    ) {

        setupSalesAssignmentAccess();
    }


    if (
        typeof refreshAddCustomerVisibility ===
        "function"
    ) {

        refreshAddCustomerVisibility();
    }


    // ========================================================
    // DASHBOARD -> LEADS
    // ========================================================

    bindDashboardLeadsNavigation();


    // ========================================================
    // FILTER OPTIONS
    // ========================================================

    loadFilterOptionsOnce({
        reason: "initialize"
    });


    console.log(
        "FSI CRM: Leads initialized successfully."
    );
}


    // ========================================================
    // SALES FILTER - LEADS ONLY
    // ========================================================

var salesSelect =
        leadsGetSalesSelect();


    if (salesSelect) {

        salesSelect.value =
            salesId;
        
        salesSelect.dispatchEvent(new Event('change', { bubbles: true }));
        window.crmSelectedSalesId =
            salesId;
        
        // PERIKSA APAKAH BROWSER BERHASIL MENSET VALUE-NYA
        if (salesId && salesSelect.value !== salesId) {
            console.warn(
                "FSI CRM: Opsi sales untuk ID " + salesId + " belum tersedia di dropdown. Mencoba memuat ulang options..."
            );
            
            if (typeof loadFilterOptionsOnce === "function") {
                await loadFilterOptionsOnce({ reason: "retry-sales-option" });
                salesSelect.value = salesId; 
            }
        }


        window.crmSelectedSalesId =
            salesSelect.value || salesId;


        var salesData = [];


        if (
            typeof leadGetSalesData ===
            "function"
        ) {

            try {

                salesData =
                    leadGetSalesData() ||
                    [];

            } catch (error) {

                console.warn(
                    "FSI CRM: gagal mengambil Sales data:",
                    error
                );
            }
        }


        var selected =
            Array.isArray(
                salesData
            )
                ? salesData.find(
                    function (sales) {

                        return String(
                            sales &&
                            sales.id
                                ? sales.id
                                : ""
                        ).trim() ===
                        salesSelect.value;
                    }
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


        console.log(
            "FSI CRM: Dashboard -> Leads Sales filter:",
            {
                dropdown: salesSelect.id,
                value: salesSelect.value,
                salesName:
                    window.crmSelectedSalesName,
                isAllSales:
                    !salesSelect.value
            }
        );

    } else {

        console.warn(
            "FSI CRM: Leads Sales dropdown (#filter-sales) tidak ditemukan."
        );


        window.crmSelectedSalesId =
            salesId;


        window.crmSelectedSalesName =
            "";
    }


    // ========================================================
    // STATUS FILTER
    // ========================================================

    var statusSelect =
        leadElement(
            "filter-status",
            "statusFilter",
            "leadStatusFilter"
        );


    if (statusSelect) {

        statusSelect.value =
            status;
statusSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // ========================================================
    // RESET PAGE
    // ========================================================

    if (
        typeof leadSetCurrentPage ===
        "function"
    ) {

        leadSetCurrentPage(
            1
        );
    }


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


    leadsState.dashboardFilterApplied =
        true;


    // ========================================================
    // REMOVE SESSION FILTER
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
    // RESET CACHE
    // ========================================================

    resetLeadsLoadCache();


    // ========================================================
    // LOAD
    // ========================================================

    await leadsSafeLoad(
        1,
        {
            force: true,
            reason:
                options.reason ||
                "dashboard-filter"
        }
    );


    return true;
}

// ============================================================
// HANDLE LEADS PAGE OPENED
// ============================================================

async function handleLeadsPageOpened() {

    console.log(
        "FSI CRM: menerima event fsi:leads-page-opened."
    );


    // ========================================================
    // INITIALIZE
    // ========================================================

    if (
        !leadsState.initialized
    ) {

        initializeLeads();
    }


    // ========================================================
    // CHECK DASHBOARD FILTER
    // ========================================================

    var hasDashboardFilter =
        false;


    try {

        hasDashboardFilter =
            Boolean(
                sessionStorage.getItem(
                    "fsi_dashboard_leads_filter"
                )
            );

    } catch (error) {

        hasDashboardFilter =
            false;
    }


    if (hasDashboardFilter) {

        await loadFilterOptionsOnce({
            reason:
                "dashboard-navigation"
        });


        await applyDashboardLeadsFilter({
            reason:
                "dashboard-navigation"
        });


        return;
    }


    // ========================================================
    // NORMAL LEADS NAVIGATION
    // ========================================================

    await leadsSafeLoad(
        1,
        {
            reason:
                "leads-navigation"
        }
    );
}


// ============================================================
// BIND DASHBOARD NAVIGATION EVENT
// ============================================================

function bindDashboardLeadsNavigation() {

    if (
        leadsState.pageOpenedListenerBound
    ) {

        return;
    }


    leadsState.pageOpenedListenerBound =
        true;


    document.addEventListener(
        "fsi:leads-page-opened",
        function () {

            handleLeadsPageOpened()
                .catch(
                    function (error) {

                        console.error(
                            "FSI CRM: Leads page navigation error:",
                            error
                        );

                    }
                );

        }
    );


    console.log(
        "FSI CRM: Dashboard -> Leads listener bound."
    );
}


// ============================================================
// PROFILE READY
// ============================================================

function handleProfileReady() {

    if (
        typeof setupSalesAssignmentAccess ===
        "function"
    ) {

        setupSalesAssignmentAccess();
    }


    if (
        typeof refreshAddCustomerVisibility ===
        "function"
    ) {

        refreshAddCustomerVisibility();
    }


    if (
        typeof bindAddCustomerButtons ===
        "function"
    ) {

        bindAddCustomerButtons();
    }


    loadFilterOptionsOnce({
        reason:
            "profile-ready"
    })
        .then(
            function () {

                return applyDashboardLeadsFilter({
                    reason:
                        "profile-ready"
                });

            }
        )
        .catch(
            function (error) {

                console.warn(
                    "FSI CRM: profile-ready filter load failed:",
                    error
                );

            }
        );
}


// ============================================================
// SALES SELECTED FROM HEADER
// ============================================================
//
// IMPORTANT:
// Header Sales selection tetap boleh mengubah Leads,
// tetapi targetnya #filter-sales.
//
// Jangan mengubah #salesFilter Dashboard.
// ============================================================

function handleSalesSelected(
    event
) {

    if (
        typeof leadIsAdmin ===
        "function"
    ) {

        if (
            !leadIsAdmin()
        ) {

            return;
        }

    } else if (
        typeof window.dashboardIsAdmin ===
        "function"
    ) {

        if (
            !window.dashboardIsAdmin()
        ) {

            return;
        }
    }


    var detail =
        event &&
        event.detail
            ? event.detail
            : {};


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
    // LEADS DROPDOWN ONLY
    // ========================================================

    var salesSelect =
        leadsGetSalesSelect();


    if (salesSelect) {

        salesSelect.value =
            window.crmSelectedSalesId ||
            "";


        console.log(
            "FSI CRM: Header Sales -> Leads filter:",
            {
                dropdown:
                    salesSelect.id,
                value:
                    salesSelect.value,
                salesName:
                    window.crmSelectedSalesName
            }
        );
    }


    if (
        typeof leadSetCurrentPage ===
        "function"
    ) {

        leadSetCurrentPage(
            1
        );
    }


    if (
        typeof updateLeadsContext ===
        "function"
    ) {

        updateLeadsContext();
    }


    resetLeadsLoadCache();


    leadsSafeLoad(
        1,
        {
            force: true,
            reason:
                "header-sales-selected"
        }
    )
        .catch(
            function (error) {

                console.error(
                    "FSI CRM: header Sales selection load error:",
                    error
                );

            }
        );
}


// ============================================================
// APP READY
// ============================================================

function handleAppReady() {

    if (
        typeof setupSalesAssignmentAccess ===
        "function"
    ) {

        setupSalesAssignmentAccess();
    }


    if (
        typeof updateLeadsContext ===
        "function"
    ) {

        updateLeadsContext();
    }


    if (
        typeof refreshAddCustomerVisibility ===
        "function"
    ) {

        refreshAddCustomerVisibility();
    }


    if (
        typeof bindAddCustomerButtons ===
        "function"
    ) {

        bindAddCustomerButtons();
    }


    loadFilterOptionsOnce({
        reason:
            "app-ready"
    })
        .then(
            function () {

                return applyDashboardLeadsFilter({
                    reason:
                        "app-ready"
                });

            }
        )
        .catch(
            function (error) {

                console.warn(
                    "FSI CRM: app-ready filter load failed:",
                    error
                );

            }
        );
}


// ============================================================
// GLOBAL EXPORTS
// ============================================================

window.leadsGetSalesSelect =
    leadsGetSalesSelect;

window.leadsCreateLoadKey =
    leadsCreateLoadKey;

window.leadsSafeLoad =
    leadsSafeLoad;

window.resetLeadsLoadCache =
    resetLeadsLoadCache;

window.applyDashboardLeadsFilter =
    applyDashboardLeadsFilter;

window.handleLeadsPageOpened =
    handleLeadsPageOpened;

window.loadFilterOptionsOnce =
    loadFilterOptionsOnce;

window.initializeLeads =
    initializeLeads;


// ============================================================
// EXISTING FUNCTION EXPORTS
// ============================================================

if (
    typeof loadFilterOptions ===
    "function"
) {
    window.loadFilterOptions =
        loadFilterOptions;
}

if (
    typeof populateFilter ===
    "function"
) {
    window.populateFilter =
        populateFilter;
}

if (
    typeof loadLeads ===
    "function"
) {
    window.loadLeads =
        loadLeads;
}

if (
    typeof updatePagination ===
    "function"
) {
    window.updatePagination =
        updatePagination;
}

if (
    typeof changePage ===
    "function"
) {
    window.changePage =
        changePage;
}

if (
    typeof nextLeadPage ===
    "function"
) {
    window.nextLeadPage =
        nextLeadPage;
}

if (
    typeof previousLeadPage ===
    "function"
) {
    window.previousLeadPage =
        previousLeadPage;
}

if (
    typeof renderLeads ===
    "function"
) {
    window.renderLeads =
        renderLeads;
}

if (
    typeof filterLeads ===
    "function"
) {
    window.filterLeads =
        filterLeads;
}

if (
    typeof onSearchInput ===
    "function"
) {
    window.onSearchInput =
        onSearchInput;
}

if (
    typeof clearLeadFilters ===
    "function"
) {
    window.clearLeadFilters =
        clearLeadFilters;
}

if (
    typeof openLeadModal ===
    "function"
) {
    window.openLeadModal =
        openLeadModal;
}

if (
    typeof closeLeadModal ===
    "function"
) {
    window.closeLeadModal =
        closeLeadModal;
}

if (
    typeof clearLeadForm ===
    "function"
) {
    window.clearLeadForm =
        clearLeadForm;
}

if (
    typeof openEditLead ===
    "function"
) {
    window.openEditLead =
        openEditLead;
}

if (
    typeof saveLead ===
    "function"
) {
    window.saveLead =
        saveLead;
}

if (
    typeof deleteLead ===
    "function"
) {
    window.deleteLead =
        deleteLead;
}

if (
    typeof setupSalesAssignmentAccess ===
    "function"
) {
    window.setupSalesAssignmentAccess =
        setupSalesAssignmentAccess;
}

if (
    typeof clearSalesHeaderFilter ===
    "function"
) {
    window.clearSalesHeaderFilter =
        clearSalesHeaderFilter;
}

if (
    typeof updateAddCustomerVisibility ===
    "function"
) {
    window.updateAddCustomerVisibility =
        updateAddCustomerVisibility;
}

if (
    typeof bindAddCustomerButtons ===
    "function"
) {
    window.bindAddCustomerButtons =
        bindAddCustomerButtons;
}


// ============================================================
// FSI LEADS NAMESPACE
// ============================================================

window.FSILeads =
    window.FSILeads ||
    {};


Object.assign(
    window.FSILeads,
    {

        leadsGetSalesSelect:
            leadsGetSalesSelect,

        leadsCreateLoadKey:
            leadsCreateLoadKey,

        leadsSafeLoad:
            leadsSafeLoad,

        resetLeadsLoadCache:
            resetLeadsLoadCache,

        loadFilterOptionsOnce:
            loadFilterOptionsOnce,

        initializeLeads:
            initializeLeads,

        applyDashboardLeadsFilter:
            applyDashboardLeadsFilter,

        handleLeadsPageOpened:
            handleLeadsPageOpened
    }
);


// ============================================================
// DOM READY
// ============================================================

if (
    !leadsState.domReadyBound
) {

    leadsState.domReadyBound =
        true;


    document.addEventListener(
        "DOMContentLoaded",
        function () {

            bindDashboardLeadsNavigation();

            initializeLeads();


            console.log(
                "FSI CRM: Leads module loaded successfully."
            );

        }
    );
}


// ============================================================
// PROFILE READY
// ============================================================

if (
    !leadsState.profileReadyBound
) {

    leadsState.profileReadyBound =
        true;


    document.addEventListener(
        "fsi:profile-ready",
        function () {

            handleProfileReady();

        }
    );
}


// ============================================================
// APP READY
// ============================================================

if (
    !leadsState.appReadyBound
) {

    leadsState.appReadyBound =
        true;


    document.addEventListener(
        "fsi:app-ready",
        function () {

            handleAppReady();

        }
    );
}


// ============================================================
// SALES SELECTED
// ============================================================

if (
    !leadsState.salesSelectedBound
) {

    leadsState.salesSelectedBound =
        true;


    document.addEventListener(
        "fsi:sales-selected",
        function (event) {

            handleSalesSelected(
                event
            );

        }
    );
}


// ============================================================
// LEAD CHANGED
// ============================================================

if (
    !leadsState.leadChangedBound
) {

    leadsState.leadChangedBound =
        true;


    document.addEventListener(
        "fsi:lead-changed",
        function () {

            resetLeadsLoadCache();

        }
    );
}


// ============================================================
// INITIALIZATION LOG
// ============================================================

console.log(
    "FSI CRM: leads-init.js loaded successfully."
);
