// ============================================================
// FSI CRM - LEADS MANAGEMENT
// File: js/leads.js
// ============================================================
//
// Fungsi:
// - Load leads dari Supabase
// - Search & filter
// - Pagination
// - Add Customer
// - Delete customer
// - Sales assignment
// - Admin / Sales access
// - Integrasi Customer Profile / shelter.js
// - Sales header selection
// - Empty state tanpa stuck loading
// - Add Customer tersedia untuk Admin & Sales
// - Profile selalu menggunakan Customer ID yang benar
// ============================================================

"use strict";

(function () {

    // ========================================================
    // INTERNAL STATE
    // ========================================================

    let leadsInitialized = false;
    let leadsLoading = false;
    let searchTimer = null;
    let activeRequestId = 0;


    // ========================================================
    // DOM HELPERS
    // ========================================================

    function leadElement(...ids) {

        for (const id of ids) {

            if (!id) {
                continue;
            }

            const element =
                document.getElementById(id);

            if (element) {
                return element;
            }
        }

        return null;
    }


    function leadGetSupabase() {

        if (
            typeof window.supabaseClient !== "undefined" &&
            window.supabaseClient
        ) {
            return window.supabaseClient;
        }

        try {

            if (
                typeof supabaseClient !== "undefined" &&
                supabaseClient
            ) {
                return supabaseClient;
            }

        } catch (error) {
            // Ignore lexical lookup error.
        }

        return null;
    }


    function leadGetProfile() {

        if (
            typeof window.currentProfile !== "undefined" &&
            window.currentProfile
        ) {
            return window.currentProfile;
        }

        try {

            if (
                typeof currentProfile !== "undefined" &&
                currentProfile
            ) {
                return currentProfile;
            }

        } catch (error) {
            // Ignore lexical lookup error.
        }

        return null;
    }


    function leadIsAdmin() {

        const profile =
            leadGetProfile();

        if (!profile) {
            return false;
        }

        if (
            typeof window.isAdminRole ===
            "function"
        ) {

            return window.isAdminRole(
                profile
            );
        }

        const role =
            String(
                profile.role || ""
            )
                .trim()
                .toLowerCase();

        return (
            role === "admin" ||
            role === "owner" ||
            role === "administrator"
        );
    }


    function leadIsSales() {

        const profile =
            leadGetProfile();

        if (!profile) {
            return false;
        }

        if (
            typeof window.isSalesRole ===
            "function"
        ) {

            return window.isSalesRole(
                profile
            );
        }

        const role =
            String(
                profile.role || ""
            )
                .trim()
                .toLowerCase();

        return (
            role === "sales" ||
            role === "salesperson"
        );
    }


    // ========================================================
    // ADD CUSTOMER VISIBILITY
    // ========================================================
    //
    // ADMIN:
    // - BOLEH Add Customer
    //
    // SALES:
    // - BOLEH Add Customer
    //
    // Customer / My Customers menu tidak disentuh.
    //
    // ========================================================

    function updateAddCustomerVisibility() {

        const profile =
            leadGetProfile();

        if (!profile) {
            return;
        }

        const isAdmin =
            leadIsAdmin();

        const isSales =
            leadIsSales();


        const selectors = [

            "#addCustomerBtn",
            "#btn-add-customer",
            "#btnAddCustomer",
            "#add-customer-btn",
            "#addCustomer",
            "#addLeadBtn",
            "#btn-add-lead",
            "#btnAddLead",
            "#add-lead-btn",
            "#addLead"

        ];


        const elements = [];


        selectors.forEach(
            selector => {

                document
                    .querySelectorAll(selector)
                    .forEach(
                        element => {

                            if (
                                !elements.includes(element)
                            ) {

                                elements.push(element);
                            }
                        }
                    );
            }
        );


        // Cari berdasarkan teks.
        document
            .querySelectorAll(
                "button, a, [role='button']"
            )
            .forEach(
                element => {

                    const text =
                        String(
                            element.textContent || ""
                        )
                            .trim()
                            .toLowerCase();


                    const normalized =
                        text.replace(
                            /\s+/g,
                            " "
                        );


                    if (
                        normalized.includes(
                            "add customer"
                        )
                    ) {

                        if (
                            !elements.includes(element)
                        ) {

                            elements.push(element);
                        }
                    }
                }
            );


        // ----------------------------------------------------
        // Admin & Sales sama-sama boleh Add Customer.
        // ----------------------------------------------------

        if (
            isAdmin ||
            isSales
        ) {

            elements.forEach(
                element => {

                    element.style.display = "";

                    element.removeAttribute(
                        "aria-hidden"
                    );

                    element.removeAttribute(
                        "data-admin-hidden"
                    );

                    element.disabled = false;
                }
            );
        }
    }


    function refreshAddCustomerVisibility() {

        updateAddCustomerVisibility();


        setTimeout(
            function () {

                updateAddCustomerVisibility();

            },
            50
        );


        setTimeout(
            function () {

                updateAddCustomerVisibility();

            },
            300
        );
    }


    // ========================================================
    // ADD CUSTOMER BUTTON
    // ========================================================
    //
    // PENTING:
    // Add Customer TIDAK BOLEH memanggil
    // crmOpenCustomerProfile(id).
    //
    // Add Customer harus memanggil:
    // crmOpenAddCustomer()
    //
    // sehingga TIDAK membutuhkan Customer ID.
    // ========================================================

    function handleAddCustomerButton(
        event
    ) {

        const target =
            event.target?.closest(
                "#addCustomerBtn, #btn-add-customer, #btnAddCustomer, #add-customer-btn, #addCustomer, #addLeadBtn, #btn-add-lead, #btnAddLead, #add-lead-btn, #addLead"
            );


        if (!target) {
            return false;
        }


        const profile =
            leadGetProfile();


        if (!profile) {

            if (
                typeof window.showToast ===
                "function"
            ) {

                window.showToast(
                    "Profile user belum siap.",
                    "error"
                );
            }

            return true;
        }


        // ----------------------------------------------------
        // STOP handler lama.
        // ----------------------------------------------------

        event.preventDefault();
        event.stopPropagation();

        if (
            typeof event.stopImmediatePropagation ===
            "function"
        ) {

            event.stopImmediatePropagation();
        }


        // ----------------------------------------------------
        // Utamakan Customer Profile.
        // ----------------------------------------------------

        if (
            typeof window.crmOpenAddCustomer ===
            "function"
        ) {

            window.crmOpenAddCustomer();

            return true;
        }


        // ----------------------------------------------------
        // Fallback hanya jika shelter.js belum siap.
        // ----------------------------------------------------

        if (
            typeof window.openLeadModal ===
            "function"
        ) {

            window.openLeadModal();

            return true;
        }


        if (
            typeof window.showToast ===
            "function"
        ) {

            window.showToast(
                "Customer Profile belum siap.",
                "error"
            );
        }


        return true;
    }


    function bindAddCustomerButtons() {

        if (
            document.documentElement.dataset
                .fsiAddCustomerHandler === "true"
        ) {
            return;
        }


        document.documentElement.dataset
            .fsiAddCustomerHandler = "true";


        // Capture phase supaya handler lama
        // tidak sempat menjalankan open profile
        // tanpa ID.

        document.addEventListener(
            "click",
            handleAddCustomerButton,
            true
        );


        refreshAddCustomerVisibility();
    }


    // ========================================================
    // PAGE SIZE
    // ========================================================

    function leadGetPageSize() {

        const configuredSize =
            Number(
                window.pageSize
            );

        if (
            Number.isFinite(
                configuredSize
            ) &&
            configuredSize > 0
        ) {

            return configuredSize;
        }


        if (
            window.FSI_CRM &&
            window.FSI_CRM.config &&
            Number(
                window.FSI_CRM.config.pageSize
            ) > 0
        ) {

            return Number(
                window.FSI_CRM.config.pageSize
            );
        }


        return 20;
    }


    function leadGetCurrentPage() {

        return Math.max(
            1,
            Number(
                window.currentPage
            ) || 1
        );
    }


    function leadSetCurrentPage(page) {

        const numericPage =
            Number(page);


        window.currentPage =
            Math.max(
                1,
                Number.isFinite(
                    numericPage
                )
                    ? numericPage
                    : 1
            );
    }


    function leadGetSalesData() {

        return Array.isArray(
            window.salesUsersData
        )
            ? window.salesUsersData
            : [];
    }


    // ========================================================
    // TEXT / HTML HELPERS
    // ========================================================

    function leadEscapeHTML(value) {

        if (
            typeof window.escapeHTML ===
            "function"
        ) {

            return window.escapeHTML(
                value
            );
        }


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


    function leadGetValue(value) {

        return String(
            value ?? ""
        ).trim();
    }


    // ========================================================
    // SELECTED SALES
    // ========================================================

    function getSelectedSalesId() {

        if (!leadIsAdmin()) {
            return "";
        }


        const value =
            window.crmSelectedSalesId;


        if (
            value === null ||
            value === undefined
        ) {

            return "";
        }


        return String(
            value
        ).trim();
    }


    function getSelectedSalesName() {

        const value =
            window.crmSelectedSalesName;


        if (
            value === null ||
            value === undefined
        ) {

            return "";
        }


        return String(
            value
        ).trim();
    }


    function applySelectedSalesFilter() {

        const salesSelect =
            leadElement(
                "salesFilter"
            );


        const selectedSalesId =
            getSelectedSalesId();


        if (salesSelect) {

            salesSelect.value =
                selectedSalesId || "";
        }


        window.currentSalesFilter =
            selectedSalesId || "";


        return selectedSalesId;
    }


    // ========================================================
    // FILTER OPTIONS
    // ========================================================

    async function loadFilterOptions() {

        const client =
            leadGetSupabase();


        if (!client) {

            console.error(
                "FSI CRM: Supabase client is not ready."
            );

            return;
        }


        try {

            if (
                typeof window.loadSalesLookup ===
                "function"
            ) {

                try {

                    await window.loadSalesLookup();

                } catch (error) {

                    console.warn(
                        "FSI CRM: Sales lookup failed:",
                        error
                    );
                }
            }


            const {
                data,
                error
            } =
                await client
                    .from("leads")
                    .select(
                        "business,location"
                    );


            if (error) {

                console.error(
                    "FSI CRM: load filter options error:",
                    error
                );

                return;
            }


            const leads =
                Array.isArray(data)
                    ? data
                    : [];


            const businesses =
                uniqueSortedValues(
                    leads.map(
                        lead =>
                            leadGetValue(
                                lead.business
                            )
                    )
                );


            const locations =
                uniqueSortedValues(
                    leads.map(
                        lead =>
                            leadGetValue(
                                lead.location
                            )
                    )
                );


            populateFilter(
                [
                    "filter-business",
                    "businessFilter"
                ],
                businesses,
                "All Business"
            );


            populateFilter(
                [
                    "filter-location",
                    "locationFilter"
                ],
                locations,
                "All Location"
            );


            if (
                typeof window.populateSalesDropdowns ===
                "function"
            ) {

                try {

                    window.populateSalesDropdowns();

                } catch (error) {

                    console.warn(
                        "FSI CRM: populateSalesDropdowns failed:",
                        error
                    );
                }
            }


            applySelectedSalesFilter();


        } catch (error) {

            console.error(
                "FSI CRM: loadFilterOptions error:",
                error
            );
        }
    }


    function uniqueSortedValues(values) {

        return [
            ...new Set(
                (
                    Array.isArray(values)
                        ? values
                        : []
                )
                    .map(
                        value =>
                            String(
                                value ?? ""
                            ).trim()
                    )
                    .filter(
                        Boolean
                    )
            )
        ].sort(
            (
                a,
                b
            ) =>
                a.localeCompare(
                    b,
                    undefined,
                    {
                        sensitivity:
                            "base"
                    }
                )
        );
    }


    function populateFilter(
        ids,
        values,
        defaultText
    ) {

        const idList =
            Array.isArray(ids)
                ? ids
                : [ids];


        let select =
            null;


        for (
            const id of idList
        ) {

            select =
                document.getElementById(
                    id
                );


            if (select) {
                break;
            }
        }


        if (!select) {
            return;
        }


        const currentValue =
            select.value;


        select.innerHTML =
            "";


        const defaultOption =
            document.createElement(
                "option"
            );


        defaultOption.value =
            "";


        defaultOption.textContent =
            defaultText;


        select.appendChild(
            defaultOption
        );


        const safeValues =
            Array.isArray(values)
                ? values
                : [];


        safeValues.forEach(
            value => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    value;


                option.textContent =
                    value;


                select.appendChild(
                    option
                );
            }
        );


        if (
            safeValues.includes(
                currentValue
            )
        ) {

            select.value =
                currentValue;

        } else {

            select.value =
                "";
        }
    }


    // ========================================================
    // GET FILTER VALUES
    // ========================================================

    function getLeadFilters() {

        const searchInput =
            leadElement(
                "lead-search",
                "leadSearch",
                "leadsSearch"
            );


        const statusInput =
            leadElement(
                "filter-status",
                "statusFilter",
                "leadStatusFilter"
            );


        const businessInput =
            leadElement(
                "filter-business",
                "businessFilter"
            );


        const locationInput =
            leadElement(
                "filter-location",
                "locationFilter"
            );


        const salesInput =
            leadElement(
                "salesFilter"
            );


        let salesFilter =
            salesInput?.value ||
            "";


        if (leadIsAdmin()) {

            const headerSalesId =
                getSelectedSalesId();


            if (
                headerSalesId !== ""
            ) {

                salesFilter =
                    headerSalesId;
            }
        }


        return {

            search:
                searchInput?.value?.trim() ||
                "",

            status:
                statusInput?.value ||
                "",

            business:
                businessInput?.value ||
                "",

            location:
                locationInput?.value ||
                "",

            salesFilter:
                salesFilter
        };
    }


    // ========================================================
    // BUILD SEARCH CONDITION
    // ========================================================

    function buildSearchQuery(
        query,
        search
    ) {

        if (!search) {
            return query;
        }


        const safeSearch =
            String(search)
                .replace(
                    /\\/g,
                    "\\\\"
                )
                .replace(
                    /%/g,
                    "\\%"
                )
                .replace(
                    /_/g,
                    "\\_"
                )
                .replace(
                    /,/g,
                    "\\,"
                );


        const searchConditions = [

            `customer_name.ilike.%${safeSearch}%`,
            `phone.ilike.%${safeSearch}%`,
            `business.ilike.%${safeSearch}%`,
            `location.ilike.%${safeSearch}%`

        ];


        return query.or(
            searchConditions.join(",")
        );
    }


    // ========================================================
    // LOADING STATE
    // ========================================================

    function showLeadsLoading() {

        const table =
            leadElement(
                "leads-table-body",
                "leadsTable"
            );


        if (!table) {
            return;
        }


        table.innerHTML = `
            <tr class="loading-row">
                <td colspan="9">
                    <div class="empty-state loading-state">

                        <div class="empty-state-icon">
                            <i
                                data-lucide="loader-circle"
                                class="spin"
                            ></i>
                        </div>

                        <div class="empty-state-title">
                            Loading Leads...
                        </div>

                        <div class="empty-state-text">
                            Please wait while the lead data is loaded.
                        </div>

                    </div>
                </td>
            </tr>
        `;


        if (
            typeof window.refreshIcons ===
            "function"
        ) {

            window.refreshIcons();
        }
    }


    // ========================================================
    // EMPTY STATE
    // ========================================================

    function renderEmptyLeadsState() {

        const table =
            leadElement(
                "leads-table-body",
                "leadsTable"
            );


        if (!table) {
            return;
        }


        const selectedSalesId =
            getSelectedSalesId();


        const selectedSalesName =
            getSelectedSalesName();


        let title =
            "Belum Ada Leads";


        let message =
            "Belum ada data lead yang sesuai dengan filter saat ini.";


        if (
            selectedSalesId
        ) {

            message =
                selectedSalesName
                    ? `Sales ${selectedSalesName} belum memiliki data lead.`
                    : "Sales yang dipilih belum memiliki data lead.";

        } else {

            const filters =
                getLeadFilters();


            if (
                filters.search ||
                filters.status ||
                filters.business ||
                filters.location
            ) {

                title =
                    "Tidak Ada Leads";


                message =
                    "Tidak ada lead yang cocok dengan pencarian atau filter yang dipilih.";
            }
        }


        table.innerHTML = `
            <tr class="empty-row">
                <td colspan="9">

                    <div class="empty-state leads-empty-state">

                        <div class="empty-state-icon">
                            <i data-lucide="inbox"></i>
                        </div>

                        <div class="empty-state-title">
                            ${leadEscapeHTML(title)}
                        </div>

                        <div class="empty-state-text">
                            ${leadEscapeHTML(message)}
                        </div>

                        ${
                            selectedSalesId
                                ? `
                                    <button
                                        type="button"
                                        class="secondary-btn small-btn"
                                        data-action="clear-sales-filter"
                                    >
                                        <i data-lucide="users"></i>
                                        Lihat Semua Sales
                                    </button>
                                  `
                                : ""
                        }

                    </div>

                </td>
            </tr>
        `;


        if (
            typeof window.refreshIcons ===
            "function"
        ) {

            window.refreshIcons();
        }
    }


    // ========================================================
    // ERROR STATE
    // ========================================================

    function renderLeadsErrorState(
        message
    ) {

        const table =
            leadElement(
                "leads-table-body",
                "leadsTable"
            );


        if (!table) {
            return;
        }


        table.innerHTML = `
            <tr class="error-row">
                <td colspan="9">

                    <div class="empty-state leads-error-state">

                        <div class="empty-state-icon">
                            <i data-lucide="circle-alert"></i>
                        </div>

                        <div class="empty-state-title">
                            Gagal Memuat Leads
                        </div>

                        <div class="empty-state-text">
                            ${leadEscapeHTML(
                                message ||
                                "Terjadi kesalahan saat memuat data."
                            )}
                        </div>

                        <button
                            type="button"
                            class="primary-btn small-btn"
                            data-action="retry-leads"
                        >
                            <i data-lucide="refresh-cw"></i>
                            Coba Lagi
                        </button>

                    </div>

                </td>
            </tr>
        `;


        if (
            typeof window.refreshIcons ===
            "function"
        ) {

            window.refreshIcons();
        }
    }


    // ========================================================
    // LOAD LEADS
    // ========================================================

    async function loadLeads(
        page = 1
    ) {

        const client =
            leadGetSupabase();


        if (!client) {

            console.error(
                "FSI CRM: Supabase client is not ready."
            );


            renderLeadsErrorState(
                "Supabase belum terhubung."
            );


            updatePagination();

            return;
        }


        if (!leadGetProfile()) {

            console.warn(
                "FSI CRM: Cannot load leads - profile is not ready."
            );


            renderLeadsErrorState(
                "Profile user belum siap. Silakan tunggu sebentar."
            );


            updatePagination();

            return;
        }


        if (leadsLoading) {
            return;
        }


        leadsLoading =
            true;


        const requestId =
            ++activeRequestId;


        leadSetCurrentPage(
            page
        );


        const pageNumber =
            leadGetCurrentPage();


        showLeadsLoading();


        try {

            if (
                (
                    !Array.isArray(
                        window.salesUsersData
                    ) ||
                    window.salesUsersData.length === 0
                ) &&
                typeof window.loadSalesLookup ===
                "function"
            ) {

                try {

                    await window.loadSalesLookup();

                } catch (error) {

                    console.warn(
                        "FSI CRM: unable to load Sales lookup:",
                        error
                    );
                }
            }


            applySelectedSalesFilter();


            const filters =
                getLeadFilters();


            window.currentSearch =
                filters.search;


            window.currentStatusFilter =
                filters.status;


            window.currentBusinessFilter =
                filters.business;


            window.currentLocationFilter =
                filters.location;


            window.currentSalesFilter =
                filters.salesFilter;


            let query =
                client
                    .from("leads")
                    .select(
                        "*",
                        {
                            count:
                                "exact"
                        }
                    );


            query =
                buildSearchQuery(
                    query,
                    filters.search
                );


            if (filters.status) {

                query =
                    query.eq(
                        "status",
                        filters.status
                    );
            }


            if (filters.business) {

                query =
                    query.eq(
                        "business",
                        filters.business
                    );
            }


            if (filters.location) {

                query =
                    query.eq(
                        "location",
                        filters.location
                    );
            }


            // ------------------------------------------------
            // ADMIN
            // ------------------------------------------------

            if (leadIsAdmin()) {

                if (
                    filters.salesFilter
                ) {

                    query =
                        query.eq(
                            "sales_id",
                            filters.salesFilter
                        );
                }
            }


            // ------------------------------------------------
            // SALES
            // ------------------------------------------------

            else if (
                leadIsSales()
            ) {

                const profile =
                    leadGetProfile();


                if (profile?.id) {

                    query =
                        query.eq(
                            "sales_id",
                            profile.id
                        );
                }
            }


            const pageSize =
                leadGetPageSize();


            const from =
                (
                    pageNumber - 1
                ) *
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
                            ascending:
                                false
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
            } =
                await query;


            if (
                requestId !==
                activeRequestId
            ) {

                return;
            }


            if (error) {

                console.error(
                    "FSI CRM: load leads error:",
                    error
                );


                window.leadsData =
                    [];


                window.totalLeadsCount =
                    0;


                renderLeadsErrorState(
                    typeof window.getSupabaseErrorMessage ===
                    "function"
                        ? window.getSupabaseErrorMessage(
                            error,
                            "Failed to load leads."
                        )
                        : (
                            error?.message ||
                            "Failed to load leads."
                        )
                );


                updatePagination();


                showLeadError(
                    error,
                    "Failed to load leads."
                );


                return;
            }


            const leads =
                Array.isArray(data)
                    ? data
                    : [];


            const totalCount =
                Number.isFinite(
                    Number(count)
                )
                    ? Number(count)
                    : 0;


            window.leadsData =
                leads;


            window.totalLeadsCount =
                Math.max(
                    0,
                    totalCount
                );


            const totalPages =
                Math.max(
                    1,
                    Math.ceil(
                        (
                            Number(
                                window.totalLeadsCount
                            ) || 0
                        ) /
                        pageSize
                    )
                );


            if (
                pageNumber >
                totalPages
            ) {

                leadSetCurrentPage(
                    totalPages
                );


                leadsLoading =
                    false;


                await loadLeads(
                    totalPages
                );


                return;
            }


            if (
                leads.length === 0
            ) {

                renderEmptyLeadsState();

                updatePagination();

                updateLeadsContext();

                return;
            }


            renderLeads(
                leads
            );


            updatePagination();

            updateLeadsContext();


        } catch (error) {

            console.error(
                "FSI CRM: loadLeads error:",
                error
            );


            window.leadsData =
                [];


            window.totalLeadsCount =
                0;


            renderLeadsErrorState(
                typeof window.getSupabaseErrorMessage ===
                "function"
                    ? window.getSupabaseErrorMessage(
                        error,
                        "An error occurred while loading leads."
                    )
                    : (
                        error?.message ||
                        "An error occurred while loading leads."
                    )
            );


            updatePagination();


            showLeadError(
                error,
                "An error occurred while loading leads."
            );


        } finally {

            leadsLoading =
                false;


            if (
                typeof window.refreshIcons ===
                "function"
            ) {

                window.refreshIcons();
            }
        }
    }


    // ========================================================
    // LEADS CONTEXT
    // ========================================================

    function updateLeadsContext() {

        const selectedSalesId =
            getSelectedSalesId();


        const selectedSalesName =
            getSelectedSalesName();


        const contextElements = [

            leadElement(
                "selected-sales-label"
            ),

            leadElement(
                "leads-selected-sales"
            ),

            leadElement(
                "active-sales-filter"
            )

        ].filter(Boolean);


        contextElements.forEach(
            element => {

                if (
                    selectedSalesId
                ) {

                    element.textContent =
                        selectedSalesName
                            ? `Sales: ${selectedSalesName}`
                            : "Sales terpilih";


                    element.classList.add(
                        "active"
                    );

                } else {

                    element.textContent =
                        "Semua Sales";


                    element.classList.remove(
                        "active"
                    );
                }
            }
        );
    }


    // ========================================================
    // ERROR MESSAGE
    // ========================================================

    function showLeadError(
        error,
        fallback
    ) {

        const message =
            typeof window.getSupabaseErrorMessage ===
            "function"
                ? window.getSupabaseErrorMessage(
                    error,
                    fallback
                )
                : (
                    error?.message ||
                    fallback
                );


        if (
            typeof window.showToast ===
            "function"
        ) {

            window.showToast(
                message,
                "error"
            );

        } else {

            console.error(
                message
            );
        }
    }


    // ========================================================
    // PAGINATION
    // ========================================================

    function updatePagination() {

        const paginationInfo =
            leadElement(
                "leads-pagination-info",
                "paginationInfo"
            );


        const pageIndicator =
            leadElement(
                "pageIndicator"
            );


        const prevBtn =
            leadElement(
                "btn-prev-page",
                "prevBtn"
            );


        const nextBtn =
            leadElement(
                "btn-next-page",
                "nextBtn"
            );


        const pageSize =
            leadGetPageSize();


        const totalLeads =
            Number(
                window.totalLeadsCount
            ) || 0;


        const currentPage =
            leadGetCurrentPage();


        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    totalLeads /
                    pageSize
                )
            );


        const start =
            totalLeads === 0
                ? 0
                : (
                    (
                        currentPage -
                        1
                    ) *
                    pageSize
                ) + 1;


        const end =
            Math.min(
                currentPage *
                pageSize,
                totalLeads
            );


        if (paginationInfo) {

            paginationInfo.textContent =
                totalLeads === 0
                    ? "0 leads"
                    : `${start}-${end} of ${totalLeads} leads`;
        }


        if (pageIndicator) {

            pageIndicator.textContent =
                `Page ${currentPage} / ${totalPages}`;
        }


        if (prevBtn) {

            const disabled =
                totalLeads === 0 ||
                currentPage <= 1;


            prevBtn.disabled =
                disabled;


            prevBtn.setAttribute(
                "aria-disabled",
                String(disabled)
            );
        }


        if (nextBtn) {

            const disabled =
                totalLeads === 0 ||
                currentPage >= totalPages;


            nextBtn.disabled =
                disabled;


            nextBtn.setAttribute(
                "aria-disabled",
                String(disabled)
            );
        }


        const pageInfo =
            leadElement(
                "pagination-page-info"
            );


        if (pageInfo) {

            pageInfo.textContent =
                totalLeads === 0
                    ? "Page 1 / 1"
                    : `Page ${currentPage} / ${totalPages}`;
        }


        window.totalPages =
            totalPages;
    }


    function changePage(
        direction
    ) {

        const numericDirection =
            Number(direction);


        if (
            !Number.isFinite(
                numericDirection
            )
        ) {
            return;
        }


        if (leadsLoading) {
            return;
        }


        const pageSize =
            leadGetPageSize();


        const totalLeads =
            Number(
                window.totalLeadsCount
            ) || 0;


        if (totalLeads <= 0) {
            return;
        }


        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    totalLeads /
                    pageSize
                )
            );


        const currentPage =
            leadGetCurrentPage();


        const newPage =
            currentPage +
            numericDirection;


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


    function nextLeadPage() {

        changePage(1);
    }


    function previousLeadPage() {

        changePage(-1);
    }


    // ========================================================
    // RENDER LEADS TABLE
    // ========================================================

    function renderLeads(
        data
    ) {

        const table =
            leadElement(
                "leads-table-body",
                "leadsTable"
            );


        if (!table) {

            console.warn(
                "FSI CRM: leads table body not found."
            );

            return;
        }


        table.innerHTML =
            "";


        const leads =
            Array.isArray(data)
                ? data
                : [];


        if (
            leads.length === 0
        ) {

            renderEmptyLeadsState();

            return;
        }


        leads.forEach(
            lead => {

                const tr =
                    document.createElement(
                        "tr"
                    );


                const salesName =
                    typeof window.getSalesName ===
                    "function"
                        ? window.getSalesName(
                            lead.sales_id
                        )
                        : "-";


                const displayStatus =
                    typeof window.normalizeLeadStatus ===
                    "function"
                        ? window.normalizeLeadStatus(
                            lead.status
                        )
                        : (
                            lead.status ||
                            "New"
                        );


                const statusCSS =
                    typeof window.getStatusClass ===
                    "function"
                        ? window.getStatusClass(
                            displayStatus
                        )
                        : (
                            typeof window.statusClass ===
                            "function"
                                ? window.statusClass(
                                    displayStatus
                                )
                                : "status-new"
                        );


                const customerName =
                    leadGetValue(
                        lead.customer_name
                    );


                const phone =
                    leadGetValue(
                        lead.phone
                    );


                const business =
                    leadGetValue(
                        lead.business
                    );


                const location =
                    leadGetValue(
                        lead.location
                    );


                const escapedCustomer =
                    leadEscapeHTML(
                        customerName
                    );


                const escapedPhone =
                    leadEscapeHTML(
                        phone
                    );


                const escapedBusiness =
                    leadEscapeHTML(
                        business
                    );


                const escapedLocation =
                    leadEscapeHTML(
                        location
                    );


                const escapedSales =
                    leadEscapeHTML(
                        salesName || "-"
                    );


                const safeStatus =
                    leadEscapeHTML(
                        displayStatus
                    );


                let whatsappHTML =
                    "-";


                if (phone) {

                    const waURL =
                        typeof window.whatsappLink ===
                        "function"
                            ? window.whatsappLink(
                                phone
                            )
                            : "#";


                    if (
                        waURL &&
                        waURL !== "#"
                    ) {

                        whatsappHTML = `
                            <a
                                href="${leadEscapeHTML(waURL)}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="wa-link"
                                title="Open WhatsApp"
                            >
                                ${escapedPhone}
                            </a>
                        `;

                    } else {

                        whatsappHTML =
                            escapedPhone;
                    }
                }


                const formattedFollowUp =
                    typeof window.formatDate ===
                    "function"
                        ? window.formatDate(
                            lead.follow_up_date
                        )
                        : (
                            lead.follow_up_date ||
                            "-"
                        );


                const formattedAppointment =
                    typeof window.formatDate ===
                    "function"
                        ? window.formatDate(
                            lead.appointment
                        )
                        : (
                            lead.appointment ||
                            "-"
                        );


                const safeFollowUp =
                    leadEscapeHTML(
                        formattedFollowUp
                    );


                const safeAppointment =
                    leadEscapeHTML(
                        formattedAppointment
                    );


                // ------------------------------------------------
                // INI ID CUSTOMER YANG AKAN DIPAKAI PROFILE.
                // ------------------------------------------------

                const leadId =
                    String(
                        lead.id ?? ""
                    ).trim();


                tr.dataset.leadId =
                    leadId;


                tr.innerHTML = `
                    <td>

                        <div class="lead-customer-cell">

                            <button
                                type="button"
                                class="lead-name-btn"
                                data-action="profile"
                                data-lead-id="${leadEscapeHTML(leadId)}"
                                title="Open customer profile"
                            >
                                ${escapedCustomer || "-"}
                            </button>

                        </div>

                    </td>

                    <td>
                        ${whatsappHTML}
                    </td>

                    <td>
                        ${escapedBusiness || "-"}
                    </td>

                    <td>
                        ${escapedLocation || "-"}
                    </td>

                    <td>
                        ${escapedSales || "-"}
                    </td>

                    <td>

                        <span
                            class="status-badge ${leadEscapeHTML(statusCSS)}"
                        >
                            ${safeStatus}
                        </span>

                    </td>

                    <td>
                        ${safeFollowUp}
                    </td>

                    <td>
                        ${safeAppointment}
                    </td>

                    <td>

                        <div class="crm-lead-actions">

                            <button
                                type="button"
                                class="primary-btn small-btn"
                                data-action="profile"
                                data-lead-id="${leadEscapeHTML(leadId)}"
                                title="Open customer profile"
                            >
                                <i data-lucide="user-round"></i>
                                Profile
                            </button>

                            <button
                                type="button"
                                class="secondary-btn small-btn"
                                data-action="delete"
                                data-lead-id="${leadEscapeHTML(leadId)}"
                                title="Delete customer"
                            >
                                <i data-lucide="trash-2"></i>
                                Delete
                            </button>

                        </div>

                    </td>
                `;


                table.appendChild(
                    tr
                );
            }
        );


        if (
            typeof window.refreshIcons ===
            "function"
        ) {

            window.refreshIcons();
        }
    }


    // ========================================================
    // FILTER / SEARCH
    // ========================================================

    function filterLeads() {

        leadSetCurrentPage(
            1
        );


        loadLeads(
            1
        );
    }


    function onSearchInput() {

        clearTimeout(
            searchTimer
        );


        searchTimer =
            setTimeout(
                function () {

                    leadSetCurrentPage(
                        1
                    );


                    loadLeads(
                        1
                    );

                },
                400
            );
    }


    function clearLeadFilters() {

        const fields = [

            [
                "lead-search",
                "leadSearch",
                "leadsSearch"
            ],

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
                "filter-location",
                "locationFilter"
            ]

        ];


        fields.forEach(
            ids => {

                const element =
                    leadElement(
                        ...ids
                    );


                if (element) {

                    element.value =
                        "";
                }
            }
        );


        window.crmSelectedSalesId =
            "";


        window.crmSelectedSalesName =
            "";


        const salesSelect =
            leadElement(
                "salesFilter"
            );


        if (salesSelect) {

            salesSelect.value =
                "";
        }


        leadSetCurrentPage(
            1
        );


        loadLeads(
            1
        );
    }


    function clearSalesHeaderFilter() {

        window.crmSelectedSalesId =
            "";


        window.crmSelectedSalesName =
            "";


        const salesSelect =
            leadElement(
                "salesFilter"
            );


        if (salesSelect) {

            salesSelect.value =
                "";
        }


        window.currentSalesFilter =
            "";


        leadSetCurrentPage(
            1
        );


        updateLeadsContext();


        loadLeads(
            1
        );
    }


    // ========================================================
    // LEGACY LEAD MODAL
    // ========================================================
    //
    // Tetap dipertahankan untuk compatibility.
    //
    // Tombol Add Customer UTAMA tidak lagi diarahkan
    // ke modal ini. Tombol Add Customer diarahkan
    // ke crmOpenAddCustomer() dari shelter.js.
    //
    // ========================================================

    function openLeadModal() {

        const modal =
            leadElement(
                "leadModal"
            );


        if (!modal) {

            console.error(
                "FSI CRM: Lead modal not found."
            );


            if (
                typeof window.showToast ===
                "function"
            ) {

                window.showToast(
                    "Lead modal not found.",
                    "error"
                );
            }


            return;
        }


        clearLeadForm();


        const title =
            leadElement(
                "leadModalTitle"
            );


        if (title) {

            title.textContent =
                "Add Customer";
        }


        modal.classList.add(
            "show"
        );


        modal.style.display =
            "flex";


        document.body.classList.add(
            "modal-open"
        );


        setTimeout(
            function () {

                const customerInput =
                    leadElement(
                        "leadCustomerName",
                        "leadCustomer"
                    );


                if (customerInput) {

                    customerInput.focus();
                }

            },
            50
        );
    }


    function closeLeadModal() {

        const modal =
            leadElement(
                "leadModal"
            );


        if (!modal) {
            return;
        }


        modal.classList.remove(
            "show"
        );


        modal.style.display =
            "none";


        document.body.classList.remove(
            "modal-open"
        );
    }


    // ========================================================
    // CLEAR FORM
    // ========================================================

    function clearLeadForm() {

        setLeadValue(
            ["leadId"],
            ""
        );


        setLeadValue(
            [
                "leadCustomerName",
                "leadCustomer"
            ],
            ""
        );


        setLeadValue(
            ["leadPhone"],
            ""
        );


        setLeadValue(
            ["leadBusiness"],
            ""
        );


        setLeadValue(
            ["leadLocation"],
            ""
        );


        setLeadValue(
            ["leadStatus"],
            "New"
        );


        const profile =
            leadGetProfile();


        setLeadValue(
            ["leadSalesAssign"],
            leadIsSales()
                ? (
                    profile?.id ||
                    ""
                )
                : (
                    getSelectedSalesId() ||
                    ""
                )
        );


        setLeadValue(
            ["leadFollowUp"],
            ""
        );


        setLeadValue(
            ["leadAppointment"],
            ""
        );


        setLeadValue(
            ["leadSiteSurvey"],
            ""
        );


        setLeadValue(
            ["leadQuotation"],
            ""
        );


        setLeadValue(
            [
                "leadSpk",
                "leadSPK"
            ],
            ""
        );


        setLeadValue(
            ["leadClosing"],
            ""
        );


        setLeadValue(
            ["leadNotes"],
            ""
        );


        if (
            typeof window.setupSalesAssignmentAccess ===
            "function"
        ) {

            window.setupSalesAssignmentAccess();
        }
    }


    function setLeadValue(
        ids,
        value
    ) {

        const idList =
            Array.isArray(ids)
                ? ids
                : [ids];


        let element =
            null;


        for (
            const id of idList
        ) {

            element =
                document.getElementById(
                    id
                );


            if (element) {
                break;
            }
        }


        if (!element) {
            return;
        }


        if (
            typeof window.setValue ===
            "function"
        ) {

            window.setValue(
                element.id,
                value
            );

        } else {

            element.value =
                value ?? "";
        }
    }


    // ========================================================
    // OPEN EDIT / CUSTOMER PROFILE
    // ========================================================

    async function openEditLead(
        id
    ) {

        const customerId =
            String(
                id ?? ""
            ).trim();


        // ----------------------------------------------------
        // EDIT / PROFILE WAJIB punya ID.
        // ----------------------------------------------------

        if (!customerId) {

            console.error(
                "FSI CRM: openEditLead called without customer ID."
            );


            if (
                typeof window.showToast ===
                "function"
            ) {

                window.showToast(
                    "Customer ID tidak ditemukan.",
                    "error"
                );
            }


            return;
        }


        if (
            typeof window.crmOpenCustomerProfile ===
            "function"
        ) {

            await window.crmOpenCustomerProfile(
                customerId
            );


            return;
        }


        if (
            typeof window.editLead ===
            "function"
        ) {

            await window.editLead(
                customerId
            );


            return;
        }


        console.warn(
            "FSI CRM: Customer profile editor is not available."
        );


        if (
            typeof window.showToast ===
            "function"
        ) {

            window.showToast(
                "Customer Profile belum tersedia.",
                "error"
            );
        }
    }


    // ========================================================
    // SAVE LEAD
    // ========================================================

    async function saveLead() {

        const profile =
            leadGetProfile();


        if (!profile) {

            showLeadError(
                new Error(
                    "User profile is not ready."
                ),
                "User profile is not ready."
            );


            return;
        }


        const client =
            leadGetSupabase();


        if (!client) {

            showLeadError(
                new Error(
                    "Supabase is not connected."
                ),
                "Supabase is not connected."
            );


            return;
        }


        const customerElement =
            leadElement(
                "leadCustomerName",
                "leadCustomer"
            );


        const customer =
            customerElement?.value?.trim() ||
            "";


        if (!customer) {

            if (
                typeof window.showToast ===
                "function"
            ) {

                window.showToast(
                    "Customer name is required.",
                    "error"
                );

            } else {

                alert(
                    "Customer name is required."
                );
            }


            customerElement?.focus();


            return;
        }


        const leadId =
            leadElement(
                "leadId"
            )?.value ||
            "";


        const getFormValue =
            function (...ids) {

                const element =
                    leadElement(
                        ...ids
                    );


                return (
                    element?.value?.trim() ||
                    ""
                );
            };


        const statusValue =
            getFormValue(
                "leadStatus"
            );


        const normalizedStatus =
            typeof window.normalizeLeadStatus ===
            "function"
                ? window.normalizeLeadStatus(
                    statusValue ||
                    "New"
                )
                : (
                    statusValue ||
                    "New"
                );


        const payload = {

            customer_name:
                customer,

            phone:
                getFormValue(
                    "leadPhone"
                ),

            business:
                getFormValue(
                    "leadBusiness"
                ),

            location:
                getFormValue(
                    "leadLocation"
                ),

            status:
                normalizedStatus,

            follow_up_date:
                leadElement(
                    "leadFollowUp"
                )?.value ||
                null,

            appointment:
                leadElement(
                    "leadAppointment"
                )?.value ||
                null,

            site_survey:
                leadElement(
                    "leadSiteSurvey"
                )?.value ||
                null,

            quotation:
                leadElement(
                    "leadQuotation"
                )?.value ||
                null,

            spk:
                leadElement(
                    "leadSpk",
                    "leadSPK"
                )?.value ||
                null,

            closing:
                leadElement(
                    "leadClosing"
                )?.value ||
                null,

            notes:
                getFormValue(
                    "leadNotes"
                )
        };


        const salesAssignment =
            leadElement(
                "leadSalesAssign"
            );


        const selectedSales =
            salesAssignment?.value ||
            "";


        // ----------------------------------------------------
        // ADMIN
        // ----------------------------------------------------

        if (leadIsAdmin()) {

            // Admin boleh membuat customer.
            payload.sales_id =
                selectedSales ||
                null;
        }


        // ----------------------------------------------------
        // SALES
        // ----------------------------------------------------

        else if (
            leadIsSales()
        ) {

            // Sales hanya dapat membuat customer
            // miliknya sendiri.

            payload.sales_id =
                profile.id;
        }


        // ----------------------------------------------------
        // ROLE LAIN
        // ----------------------------------------------------

        else {

            payload.sales_id =
                null;
        }


        try {

            // =================================================
            // UPDATE
            // =================================================

            if (leadId) {

                payload.updated_by =
                    profile.id;


                const {
                    error
                } =
                    await client
                        .from("leads")
                        .update(
                            payload
                        )
                        .eq(
                            "id",
                            leadId
                        );


                if (error) {

                    console.error(
                        "FSI CRM: update lead error:",
                        error
                    );


                    showLeadError(
                        error,
                        "Failed to update lead."
                    );


                    return;
                }


                if (
                    typeof window.showToast ===
                    "function"
                ) {

                    window.showToast(
                        "Customer updated successfully.",
                        "success"
                    );
                }

            }

            // =================================================
            // INSERT
            // =================================================

            else {

                // Admin maupun Sales boleh membuat
                // customer baru.

                payload.created_by =
                    profile.id;


                payload.updated_by =
                    profile.id;


                const {
                    error
                } =
                    await client
                        .from("leads")
                        .insert([
                            payload
                        ]);


                if (error) {

                    console.error(
                        "FSI CRM: insert lead error:",
                        error
                    );


                    showLeadError(
                        error,
                        "Failed to add customer."
                    );


                    return;
                }


                if (
                    typeof window.showToast ===
                    "function"
                ) {

                    window.showToast(
                        "Customer added successfully.",
                        "success"
                    );
                }
            }


            closeLeadModal();


            await loadFilterOptions();


            await loadLeads(
                leadGetCurrentPage()
            );


            if (
                typeof window.updateDashboard ===
                "function"
            ) {

                try {

                    await window.updateDashboard();

                } catch (error) {

                    console.warn(
                        "FSI CRM: dashboard refresh failed:",
                        error
                    );
                }
            }


            document.dispatchEvent(
                new CustomEvent(
                    "fsi:lead-changed",
                    {
                        detail: {
                            action:
                                leadId
                                    ? "updated"
                                    : "created"
                        }
                    }
                )
            );


        } catch (error) {

            console.error(
                "FSI CRM: saveLead error:",
                error
            );


            showLeadError(
                error,
                "An error occurred while saving the customer."
            );
        }
    }


    // ========================================================
    // DELETE LEAD
    // ========================================================

    async function deleteLead(
        id
    ) {

        const customerId =
            String(
                id ?? ""
            ).trim();


        if (!customerId) {
            return;
        }


        const confirmed =
            typeof window.confirmAction ===
            "function"
                ? await window.confirmAction(
                    "Delete this customer?"
                )
                : confirm(
                    "Delete this customer?"
                );


        if (!confirmed) {
            return;
        }


        const client =
            leadGetSupabase();


        if (!client) {

            showLeadError(
                new Error(
                    "Supabase is not connected."
                ),
                "Supabase is not connected."
            );


            return;
        }


        try {

            const {
                error
            } =
                await client
                    .from("leads")
                    .delete()
                    .eq(
                        "id",
                        customerId
                    );


            if (error) {

                console.error(
                    "FSI CRM: delete lead error:",
                    error
                );


                showLeadError(
                    error,
                    "Failed to delete customer."
                );


                return;
            }


            if (
                String(
                    window.crmCurrentCustomerId
                ) ===
                customerId
            ) {

                window.crmCurrentCustomerId =
                    null;


                window.crmCurrentCustomer =
                    null;
            }


            await loadFilterOptions();


            const oldTotal =
                Number(
                    window.totalLeadsCount
                ) || 0;


            const totalAfterDelete =
                Math.max(
                    0,
                    oldTotal - 1
                );


            const pageSize =
                leadGetPageSize();


            const maxPage =
                Math.max(
                    1,
                    Math.ceil(
                        totalAfterDelete /
                        pageSize
                    )
                );


            const pageAfterDelete =
                Math.min(
                    leadGetCurrentPage(),
                    maxPage
                );


            leadSetCurrentPage(
                pageAfterDelete
            );


            await loadLeads(
                pageAfterDelete
            );


            if (
                typeof window.updateDashboard ===
                "function"
            ) {

                try {

                    await window.updateDashboard();

                } catch (error) {

                    console.warn(
                        "FSI CRM: dashboard refresh failed:",
                        error
                    );
                }
            }


            document.dispatchEvent(
                new CustomEvent(
                    "fsi:lead-changed",
                    {
                        detail: {
                            action:
                                "deleted",

                            id:
                                customerId
                        }
                    }
                )
            );


            if (
                typeof window.showToast ===
                "function"
            ) {

                window.showToast(
                    "Customer deleted successfully.",
                    "success"
                );
            }


        } catch (error) {

            console.error(
                "FSI CRM: deleteLead error:",
                error
            );


            showLeadError(
                error,
                "An error occurred while deleting the customer."
            );
        }
    }


    // ========================================================
    // SALES ASSIGNMENT ACCESS
    // ========================================================

    function setupSalesAssignmentAccess() {

        const select =
            leadElement(
                "leadSalesAssign"
            );


        if (!select) {
            return;
        }


        const profile =
            leadGetProfile();


        if (!profile) {

            select.disabled =
                true;

            return;
        }


        const isAdmin =
            leadIsAdmin();


        const isSales =
            leadIsSales();


        // ----------------------------------------------------
        // ADMIN
        // ----------------------------------------------------

        if (isAdmin) {

            select.disabled =
                false;


            select.removeAttribute(
                "aria-disabled"
            );


            return;
        }


        // ----------------------------------------------------
        // SALES
        // ----------------------------------------------------

        if (isSales) {

            select.value =
                profile.id ||
                "";


            select.disabled =
                true;


            select.setAttribute(
                "aria-disabled",
                "true"
            );


            return;
        }


        select.disabled =
            true;


        select.setAttribute(
            "aria-disabled",
            "true"
        );
    }


    // ========================================================
    // TABLE EVENT DELEGATION
    // ========================================================

    function setupTableActions() {

        const table =
            leadElement(
                "leads-table-body",
                "leadsTable"
            );


        if (!table) {
            return;
        }


        if (
            table.dataset.actionsBound ===
            "true"
        ) {
            return;
        }


        table.dataset.actionsBound =
            "true";


        table.addEventListener(
            "click",
            async function (event) {

                const actionButton =
                    event.target.closest(
                        "[data-action]"
                    );


                if (!actionButton) {
                    return;
                }


                const action =
                    actionButton.dataset.action;


                const leadId =
                    String(
                        actionButton.dataset.leadId ||
                        ""
                    ).trim();


                // ------------------------------------------------
                // PROFILE
                // ------------------------------------------------

                if (
                    action ===
                    "profile"
                ) {

                    if (!leadId) {

                        console.error(
                            "FSI CRM: Profile button has no customer ID.",
                            actionButton
                        );


                        if (
                            typeof window.showToast ===
                            "function"
                        ) {

                            window.showToast(
                                "Customer ID tidak ditemukan.",
                                "error"
                            );
                        }


                        return;
                    }


                    event.preventDefault();


                    if (
                        typeof window.crmOpenCustomerProfile ===
                        "function"
                    ) {

                        await window.crmOpenCustomerProfile(
                            leadId
                        );

                    } else {

                        await openEditLead(
                            leadId
                        );
                    }


                    return;
                }


                // ------------------------------------------------
                // DELETE
                // ------------------------------------------------

                if (
                    action ===
                    "delete"
                ) {

                    if (!leadId) {
                        return;
                    }


                    await deleteLead(
                        leadId
                    );


                    return;
                }


                // ------------------------------------------------
                // RETRY
                // ------------------------------------------------

                if (
                    action ===
                    "retry-leads"
                ) {

                    leadSetCurrentPage(
                        1
                    );


                    await loadLeads(
                        1
                    );


                    return;
                }


                // ------------------------------------------------
                // CLEAR SALES FILTER
                // ------------------------------------------------

                if (
                    action ===
                    "clear-sales-filter"
                ) {

                    clearSalesHeaderFilter();

                    return;
                }
            }
        );
    }


    // ========================================================
    // INITIALIZE EVENTS
    // ========================================================

    function initializeLeads() {

        if (leadsInitialized) {
            return;
        }


        leadsInitialized =
            true;


        // ----------------------------------------------------
        // Add Customer
        // ----------------------------------------------------

        bindAddCustomerButtons();


        // ----------------------------------------------------
        // Search
        // ----------------------------------------------------

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


        // ----------------------------------------------------
        // Filters
        // ----------------------------------------------------

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
                "filter-location",
                "locationFilter"
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


                        filterLeads();
                    }
                );
            }
        );


        // ----------------------------------------------------
        // Previous
        // ----------------------------------------------------

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


        // ----------------------------------------------------
        // Next
        // ----------------------------------------------------

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


        // ----------------------------------------------------
        // Clear filter
        // ----------------------------------------------------

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


        // ----------------------------------------------------
        // Table actions
        // ----------------------------------------------------

        setupTableActions();


        // ----------------------------------------------------
        // ESC
        // ----------------------------------------------------

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

                    closeLeadModal();
                }
            }
        );


        // ----------------------------------------------------
        // Click outside legacy modal
        // ----------------------------------------------------

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

                        closeLeadModal();
                    }
                }
            );
        }


        setupSalesAssignmentAccess();


        refreshAddCustomerVisibility();
    }


    // ========================================================
    // PROFILE READY
    // ========================================================

    function handleProfileReady() {

        setupSalesAssignmentAccess();

        refreshAddCustomerVisibility();

        bindAddCustomerButtons();
    }


    // ========================================================
    // SALES SELECTED FROM HEADER
    // ========================================================

    function handleSalesSelected(
        event
    ) {

        if (!leadIsAdmin()) {
            return;
        }


        const detail =
            event?.detail || {};


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


        const salesSelect =
            leadElement(
                "salesFilter"
            );


        if (salesSelect) {

            salesSelect.value =
                window.crmSelectedSalesId ||
                "";
        }


        leadSetCurrentPage(
            1
        );


        updateLeadsContext();


        loadLeads(
            1
        );
    }


    // ========================================================
    // APP READY
    // ========================================================

    function handleAppReady() {

        setupSalesAssignmentAccess();

        updateLeadsContext();

        refreshAddCustomerVisibility();

        bindAddCustomerButtons();
    }


    // ========================================================
    // EXPORT TO WINDOW
    // ========================================================

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

        bindAddCustomerButtons
    };


    // ========================================================
    // DOM READY
    // ========================================================

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            initializeLeads();


            console.log(
                "FSI CRM: Leads module loaded successfully."
            );
        }
    );


    // ========================================================
    // PROFILE READY
    // ========================================================

    document.addEventListener(
        "fsi:profile-ready",
        function () {

            handleProfileReady();
        }
    );


    // ========================================================
    // APP READY
    // ========================================================

    document.addEventListener(
        "fsi:app-ready",
        function () {

            handleAppReady();
        }
    );


    // ========================================================
    // SALES SELECTED
    // ========================================================

    document.addEventListener(
        "fsi:sales-selected",
        function (event) {

            handleSalesSelected(
                event
            );
        }
    );


    // ========================================================
    // LEAD CHANGED
    // ========================================================

    document.addEventListener(
        "fsi:lead-changed",
        function () {

            // Save/delete sudah melakukan refresh
            // sendiri.
        }
    );


})();
