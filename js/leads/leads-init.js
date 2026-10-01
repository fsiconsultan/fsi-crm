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
// - Dashboard navigation hanya membuka halaman Leads.
//
// ============================================================


// ============================================================
// STATE
// ============================================================

let leadsInitialized = false;

let leadsLoadingPromise = null;

let leadsFilterOptionsLoadingPromise = null;

let leadsLastLoadedKey = "";

let leadsDashboardFilterApplied = false;

let leadsPageOpenedListenerBound = false;


// ============================================================
// CREATE LEADS LOAD KEY
// ============================================================
//
// Digunakan untuk mengetahui apakah request yang sama
// sedang diminta berulang kali.
//
// Contoh:
//
// page 1
// search ""
// status ""
// business ""
// sales ""
//
// akan memiliki key yang sama.
//

function leadsCreateLoadKey(page = 1) {

    let search = "";
    let status = "";
    let business = "";
    let sales = "";

    try {

        const searchElement =
            leadElement(
                "lead-search",
                "leadSearch",
                "leadsSearch"
            );

        const statusElement =
            leadElement(
                "filter-status",
                "statusFilter",
                "leadStatusFilter"
            );

        const businessElement =
            leadElement(
                "filter-business",
                "businessFilter"
            );

        const salesElement =
            leadElement(
                "salesFilter"
            );

        search =
            String(
                searchElement?.value ||
                ""
            ).trim();

        status =
            String(
                statusElement?.value ||
                ""
            ).trim();

        business =
            String(
                businessElement?.value ||
                ""
            ).trim();

        sales =
            String(
                salesElement?.value ||
                ""
            ).trim();

    } catch (error) {

        console.warn(
            "FSI CRM: gagal membuat Leads load key:",
            error
        );

    }

    return [
        String(page || 1),
        search,
        status,
        business,
        sales
    ].join("|");
}


// ============================================================
// SAFE LOAD LEADS
// ============================================================
//
// Semua loading Leads dari event/navigation diarahkan ke
// fungsi ini.
//
// Tujuan utama:
// - mencegah double request
// - mencegah request bertumpuk
// - tetap mengizinkan filter/page baru
//
// ============================================================

async function leadsSafeLoad(
    page = 1,
    options = {}
) {

    const force =
        options &&
        options.force === true;

    const reason =
        options?.reason ||
        "unknown";

    const normalizedPage =
        Number(page) > 0
            ? Number(page)
            : 1;

    const loadKey =
        leadsCreateLoadKey(
            normalizedPage
        );

    console.log(
        "FSI CRM: Leads load request:",
        {
            page: normalizedPage,
            key: loadKey,
            reason,
            force
        }
    );


    // ========================================================
    // REQUEST SEDANG BERJALAN
    // ========================================================

    if (leadsLoadingPromise) {

        console.log(
            "FSI CRM: Leads load masih berjalan. Request tambahan ditahan."
        );

        return leadsLoadingPromise;
    }


    // ========================================================
    // REQUEST SAMA SUDAH SELESAI
    // ========================================================

    if (
        !force &&
        leadsLastLoadedKey === loadKey
    ) {

        console.log(
            "FSI CRM: Leads dengan filter yang sama sudah dimuat. Skip."
        );

        return true;
    }


    // ========================================================
    // LOAD
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


    leadsLoadingPromise =
        (async function () {

            try {

                await window.loadLeads(
                    normalizedPage
                );

                leadsLastLoadedKey =
                    leadsCreateLoadKey(
                        normalizedPage
                    );

                return true;

            } catch (error) {

                console.error(
                    "FSI CRM: Leads load error:",
                    error
                );

                throw error;

            } finally {

                leadsLoadingPromise =
                    null;
            }

        })();


    return leadsLoadingPromise;
}


// ============================================================
// RESET LEADS LOAD CACHE
// ============================================================

function resetLeadsLoadCache() {

    leadsLastLoadedKey =
        "";

    console.log(
        "FSI CRM: Leads load cache reset."
    );
}


// ============================================================
// INITIALIZE EVENTS
// ============================================================

function initializeLeads() {

    // ========================================================
    // ALREADY INITIALIZED
    // ========================================================

    if (leadsInitialized) {

        console.log(
            "FSI CRM: Leads already initialized."
        );

        return;
    }


    // ========================================================
    // MARK INITIALIZED
    // ========================================================

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

                    // ============================================
                    // SALES FILTER
                    // ============================================

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


                    // ============================================
                    // FILTER BERUBAH
                    // ============================================

                    resetLeadsLoadCache();


                    // ============================================
                    // RESET PAGE
                    // ============================================

                    leadSetCurrentPage(
                        1
                    );


                    // ============================================
                    // APPLY FILTER
                    // ============================================

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

                resetLeadsLoadCache();

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

                resetLeadsLoadCache();

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
            function () {

                resetLeadsLoadCache();

                clearLeadFilters();

            }
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
    // BIND DASHBOARD -> LEADS EVENT
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


// ============================================================
// LOAD FILTER OPTIONS ONCE
// ============================================================
//
// Sama seperti Leads loading, filter options juga tidak boleh
// dipanggil bersamaan berkali-kali.
//

function loadFilterOptionsOnce(
    options = {}
) {

    const reason =
        options?.reason ||
        "unknown";


    // ========================================================
    // REQUEST SEDANG BERJALAN
    // ========================================================

    if (
        leadsFilterOptionsLoadingPromise
    ) {

        console.log(
            "FSI CRM: filter options masih loading. Reuse request."
        );

        return leadsFilterOptionsLoadingPromise;
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


    leadsFilterOptionsLoadingPromise =
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

                leadsFilterOptionsLoadingPromise =
                    null;
            }

        })();


    return leadsFilterOptionsLoadingPromise;
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
//
// - Sales filter
// - Status filter
//
// Setelah itu Leads dimuat satu kali.
//

async function applyDashboardLeadsFilter(
    options = {}
) {

    let rawFilter =
        null;


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

        return false;
    }


    // ========================================================
    // NO FILTER
    // ========================================================

    if (!rawFilter) {

        return false;
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


        return false;
    }


    if (
        !filterData ||
        typeof filterData !==
        "object"
    ) {

        return false;
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

        salesSelect.value =
            salesId;


        window.crmSelectedSalesId =
            salesId;


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
    // MARK FILTER APPLIED
    // ========================================================

    leadsDashboardFilterApplied =
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
    // RESET LOAD CACHE
    // ========================================================

    resetLeadsLoadCache();


    // ========================================================
    // LOAD LEADS
    // ========================================================

    await leadsSafeLoad(
        1,
        {
            force: true,
            reason:
                options?.reason ||
                "dashboard-filter"
        }
    );


    return true;
}


// ============================================================
// HANDLE DASHBOARD -> LEADS PAGE OPENED
// ============================================================
//
// Event dikirim oleh:
//
// dashboard-navigation.js
//
// setelah halaman Leads berhasil dibuka.
//
// ============================================================

async function handleLeadsPageOpened() {

    console.log(
        "FSI CRM: menerima event fsi:leads-page-opened."
    );


    // ========================================================
    // PASTIKAN INITIALIZED
    // ========================================================

    if (!leadsInitialized) {

        initializeLeads();
    }


    // ========================================================
    // CEK DASHBOARD FILTER
    // ========================================================

    const hasDashboardFilter =
        (() => {

            try {

                return Boolean(
                    sessionStorage.getItem(
                        "fsi_dashboard_leads_filter"
                    )
                );

            } catch (error) {

                return false;
            }

        })();


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
    // TANPA DASHBOARD FILTER
    // ========================================================
    //
    // Jika Leads dibuka dari menu/header biasa,
    // cukup load data sekali.
    //

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
        leadsPageOpenedListenerBound
    ) {

        return;
    }


    leadsPageOpenedListenerBound =
        true;


    document.addEventListener(
        "fsi:leads-page-opened",
        function () {

            handleLeadsPageOpened()
                .catch(
                    error => {

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

    setupSalesAssignmentAccess();


    refreshAddCustomerVisibility();


    bindAddCustomerButtons();


    // ========================================================
    // LOAD FILTER OPTIONS
    // ========================================================

    loadFilterOptionsOnce({
        reason:
            "profile-ready"
    })
        .then(
            function () {

                applyDashboardLeadsFilter({
                    reason:
                        "profile-ready"
                });

            }
        )
        .catch(
            error => {

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
    // RESET CACHE
    // ========================================================

    resetLeadsLoadCache();


    // ========================================================
    // LOAD
    // ========================================================

    leadsSafeLoad(
        1,
        {
            force: true,
            reason:
                "header-sales-selected"
        }
    )
        .catch(
            error => {

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

    setupSalesAssignmentAccess();


    updateLeadsContext();


    refreshAddCustomerVisibility();


    bindAddCustomerButtons();


    // ========================================================
    // FILTER OPTIONS
    // ========================================================

    loadFilterOptionsOnce({
        reason:
            "app-ready"
    })
        .then(
            function () {

                applyDashboardLeadsFilter({
                    reason:
                        "app-ready"
                });

            }
        )
        .catch(
            error => {

                console.warn(
                    "FSI CRM: app-ready filter load failed:",
                    error
                );

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
// DASHBOARD FILTER FUNCTION
// ============================================================

window.applyDashboardLeadsFilter =
    applyDashboardLeadsFilter;


// ============================================================
// LEADS LOAD CONTROL
// ============================================================

window.leadsSafeLoad =
    leadsSafeLoad;


window.resetLeadsLoadCache =
    resetLeadsLoadCache;


window.handleLeadsPageOpened =
    handleLeadsPageOpened;


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

    applyDashboardLeadsFilter,

    leadsSafeLoad,

    resetLeadsLoadCache,

    handleLeadsPageOpened

};


// ============================================================
// DOM READY
// ============================================================

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
        // Tidak melakukan load ulang otomatis di sini.
        // ----------------------------------------------------

        resetLeadsLoadCache();

    }
);


console.log(
    "FSI CRM: leads-init.js loaded successfully."
);
