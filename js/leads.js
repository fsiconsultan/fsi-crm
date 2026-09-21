// ============================================================
// FSI CRM - LEADS MANAGEMENT
// File: js/leads.js
// ============================================================
//
// Fungsi:
// - Load leads dari Supabase
// - Search & filter
// - Pagination
// - Add lead
// - Delete lead
// - Sales assignment
// - Admin / Sales access
// - Integrasi Customer Profile / shelter.js
// ============================================================

"use strict";

(function () {

    // ========================================================
    // INTERNAL STATE
    // ========================================================

    let leadsInitialized = false;
    let leadsLoading = false;
    let searchTimer = null;


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

        if (
            typeof supabaseClient !== "undefined" &&
            supabaseClient
        ) {
            return supabaseClient;
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

        if (
            typeof currentProfile !== "undefined" &&
            currentProfile
        ) {
            return currentProfile;
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


    function leadSetCurrentPage(
        page
    ) {

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

    function leadEscapeHTML(
        value
    ) {

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


    function leadGetValue(
        value
    ) {

        return String(
            value ?? ""
        ).trim();
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

            // ------------------------------------------------
            // Load Sales lookup first
            // ------------------------------------------------

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


            // ------------------------------------------------
            // Load business & location
            // ------------------------------------------------

            const {
                data,
                error
            } = await client
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


            // ------------------------------------------------
            // IMPORTANT:
            // Latest index.html IDs:
            //
            // filter-business
            // filter-location
            //
            // Legacy IDs are also supported.
            // ------------------------------------------------

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

                window.populateSalesDropdowns();
            }


        } catch (error) {

            console.error(
                "FSI CRM: loadFilterOptions error:",
                error
            );
        }
    }


    function uniqueSortedValues(
        values
    ) {

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
                    .filter(Boolean)
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
                        sensitivity: "base"
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
                salesInput?.value ||
                ""
        };
    }


    // ========================================================
    // BUILD SEARCH CONDITION
    // ========================================================
    //
    // We intentionally use only fields that are part of the
    // confirmed lead structure.
    //
    // Email is NOT included because current CRM schema does
    // not guarantee an email column.
    // ========================================================

    function buildSearchQuery(
        query,
        search
    ) {

        if (!search) {
            return query;
        }


        const safeSearch =
            search
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

            return;
        }


        if (!leadGetProfile()) {

            console.warn(
                "FSI CRM: Cannot load leads - profile is not ready."
            );

            return;
        }


        if (leadsLoading) {
            return;
        }


        leadsLoading =
            true;


        leadSetCurrentPage(
            page
        );


        const pageNumber =
            leadGetCurrentPage();


        try {

            // ------------------------------------------------
            // SALES LOOKUP
            // ------------------------------------------------

            if (
                (
                    !Array.isArray(
                        window.salesUsersData
                    ) ||
                    window.salesUsersData.length ===
                    0
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


            // ------------------------------------------------
            // FILTER VALUES
            // ------------------------------------------------

            const filters =
                getLeadFilters();


            // ------------------------------------------------
            // QUERY
            // ------------------------------------------------

            let query =
                client
                    .from("leads")
                    .select(
                        "*",
                        {
                            count: "exact"
                        }
                    );


            // ------------------------------------------------
            // SEARCH
            // ------------------------------------------------

            query =
                buildSearchQuery(
                    query,
                    filters.search
                );


            // ------------------------------------------------
            // STATUS
            // ------------------------------------------------

            if (
                filters.status
            ) {

                query =
                    query.eq(
                        "status",
                        filters.status
                    );
            }


            // ------------------------------------------------
            // BUSINESS
            // ------------------------------------------------

            if (
                filters.business
            ) {

                query =
                    query.eq(
                        "business",
                        filters.business
                    );
            }


            // ------------------------------------------------
            // LOCATION
            // ------------------------------------------------

            if (
                filters.location
            ) {

                query =
                    query.eq(
                        "location",
                        filters.location
                    );
            }


            // ------------------------------------------------
            // SALES FILTER
            // ------------------------------------------------
            //
            // Admin:
            //   Can filter by Sales.
            //
            // Sales:
            //   Browser MUST NOT be trusted.
            //   RLS remains the security layer.
            // ------------------------------------------------

            if (
                leadIsAdmin() &&
                filters.salesFilter
            ) {

                query =
                    query.eq(
                        "sales_id",
                        filters.salesFilter
                    );
            }


            // ------------------------------------------------
            // PAGINATION
            // ------------------------------------------------

            const pageSize =
                leadGetPageSize();


            const from =
                (
                    pageNumber -
                    1
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
                            ascending: false
                        }
                    )
                    .range(
                        from,
                        to
                    );


            // ------------------------------------------------
            // EXECUTE
            // ------------------------------------------------

            const {
                data,
                error,
                count
            } = await query;


            if (error) {

                console.error(
                    "FSI CRM: load leads error:",
                    error
                );


                window.leadsData =
                    [];


                window.totalLeadsCount =
                    0;


                renderLeads(
                    []
                );


                updatePagination();


                showLeadError(
                    error,
                    "Failed to load leads."
                );


                return;
            }


            window.leadsData =
                Array.isArray(data)
                    ? data
                    : [];


            window.totalLeadsCount =
                Number(
                    count
                ) || 0;


            // ------------------------------------------------
            // FIX PAGE IF CURRENT PAGE IS TOO HIGH
            // ------------------------------------------------

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


                await loadLeads(
                    totalPages
                );


                return;
            }


            // ------------------------------------------------
            // RENDER
            // ------------------------------------------------

            renderLeads(
                window.leadsData
            );


            updatePagination();


            // ------------------------------------------------
            // SAVE CURRENT FILTER STATE
            // ------------------------------------------------

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


        } catch (error) {

            console.error(
                "FSI CRM: loadLeads error:",
                error
            );


            window.leadsData =
                [];


            renderLeads(
                []
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
                ) +
                1;


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
                currentPage <= 1;


            prevBtn.disabled =
                disabled;


            prevBtn.setAttribute(
                "aria-disabled",
                String(
                    disabled
                )
            );
        }


        if (nextBtn) {

            const disabled =
                currentPage >= totalPages;


            nextBtn.disabled =
                disabled;


            nextBtn.setAttribute(
                "aria-disabled",
                String(
                    disabled
                )
            );
        }


        // ----------------------------------------------------
        // Alternative pagination labels
        // ----------------------------------------------------

        const pageInfo =
            leadElement(
                "pagination-page-info"
            );


        if (pageInfo) {

            pageInfo.textContent =
                `Page ${currentPage} / ${totalPages}`;
        }


        window.totalPages =
            totalPages;
    }


    function changePage(
        direction
    ) {

        const numericDirection =
            Number(
                direction
            );


        if (
            !Number.isFinite(
                numericDirection
            )
        ) {
            return;
        }


        const pageSize =
            leadGetPageSize();


        const totalLeads =
            Number(
                window.totalLeadsCount
            ) || 0;


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

        changePage(
            1
        );
    }


    function previousLeadPage() {

        changePage(
            -1
        );
    }


    // ========================================================
    // RENDER LEADS TABLE
    // ========================================================

    function renderLeads(
        data
    ) {

        // Latest index.html:
        // id="leads-table-body"

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
            leads.length ===
            0
        ) {

            table.innerHTML = `
                <tr class="empty-row">
                    <td colspan="9">
                        <div class="empty-state">
                            <div class="empty-state-icon">
                                <i data-lucide="inbox"></i>
                            </div>

                            <div class="empty-state-title">
                                No leads found
                            </div>

                            <div class="empty-state-text">
                                Try changing your search or filter.
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
                        salesName ||
                        "-"
                    );


                const safeStatus =
                    leadEscapeHTML(
                        displayStatus
                    );


                // ------------------------------------------------
                // WhatsApp
                // ------------------------------------------------

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


                // ------------------------------------------------
                // Dates
                // ------------------------------------------------

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
                // Lead ID
                // ------------------------------------------------

                const leadId =
                    String(
                        lead.id || ""
                    );


                const escapedId =
                    leadId
                        .replace(
                            /\\/g,
                            "\\\\"
                        )
                        .replace(
                            /'/g,
                            "\\'"
                        );


                // ------------------------------------------------
                // Table
                // ------------------------------------------------
                //
                // Latest index.html columns:
                //
                // Customer
                // Contact
                // Business
                // Location
                // Sales
                // Status
                // Follow Up
                // Appointment
                // Action
                //
                // Total = 9 columns
                // ------------------------------------------------

                tr.innerHTML = `
                    <td>
                        <div class="lead-customer-cell">

                            <button
                                type="button"
                                class="lead-name-btn"
                                onclick="crmOpenCustomerProfile('${escapedId}')"
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
                                onclick="crmOpenCustomerProfile('${escapedId}')"
                                title="Open customer profile"
                            >
                                <i data-lucide="user-round"></i>
                                Profile
                            </button>


                            <button
                                type="button"
                                class="secondary-btn small-btn"
                                onclick="deleteLead('${escapedId}')"
                                title="Delete lead"
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
            ],

            [
                "salesFilter"
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


        leadSetCurrentPage(
            1
        );


        loadLeads(
            1
        );
    }


    // ========================================================
    // LEAD MODAL
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
                "Add Lead";
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
            [
                "leadId"
            ],
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
            [
                "leadPhone"
            ],
            ""
        );


        setLeadValue(
            [
                "leadEmail"
            ],
            ""
        );


        setLeadValue(
            [
                "leadBusiness"
            ],
            ""
        );


        setLeadValue(
            [
                "leadLocation"
            ],
            ""
        );


        setLeadValue(
            [
                "leadStatus"
            ],
            "New"
        );


        const profile =
            leadGetProfile();


        setLeadValue(
            [
                "leadSalesAssign"
            ],
            leadIsSales()
                ? (
                    profile?.id ||
                    ""
                )
                : ""
        );


        setLeadValue(
            [
                "leadFollowUp"
            ],
            ""
        );


        setLeadValue(
            [
                "leadAppointment"
            ],
            ""
        );


        setLeadValue(
            [
                "leadSiteSurvey"
            ],
            ""
        );


        setLeadValue(
            [
                "leadQuotation"
            ],
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
            [
                "leadClosing"
            ],
            ""
        );


        setLeadValue(
            [
                "leadNotes"
            ],
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
    // EDIT LEAD
    // ========================================================
    //
    // Editing customer is handled by shelter.js.
    // ========================================================

    async function openEditLead(
        id
    ) {

        if (
            typeof window.crmOpenCustomerProfile ===
            "function"
        ) {

            await window.crmOpenCustomerProfile(
                id
            );

            return;
        }


        if (
            typeof window.editLead ===
            "function"
        ) {

            await window.editLead(
                id
            );

            return;
        }


        console.warn(
            "FSI CRM: Customer profile editor is not available."
        );
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


        // ----------------------------------------------------
        // PAYLOAD
        // ----------------------------------------------------
        //
        // Do NOT send email because current confirmed
        // leads schema does not require email.
        // ----------------------------------------------------

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


        // ----------------------------------------------------
        // SALES ASSIGNMENT
        // ----------------------------------------------------

        const salesAssignment =
            leadElement(
                "leadSalesAssign"
            );


        const selectedSales =
            salesAssignment?.value ||
            "";


        if (
            leadIsAdmin()
        ) {

            payload.sales_id =
                selectedSales ||
                null;

        } else if (
            leadIsSales()
        ) {

            payload.sales_id =
                profile.id;

        } else {

            payload.sales_id =
                null;
        }


        // ----------------------------------------------------
        // SAVE
        // ----------------------------------------------------

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
                        "Lead updated successfully.",
                        "success"
                    );
                }


            } else {

                // =============================================
                // INSERT
                // =============================================

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
                        "Failed to add lead."
                    );


                    return;
                }


                if (
                    typeof window.showToast ===
                    "function"
                ) {

                    window.showToast(
                        "Lead added successfully.",
                        "success"
                    );
                }
            }


            // ------------------------------------------------
            // CLOSE MODAL
            // ------------------------------------------------

            closeLeadModal();


            // ------------------------------------------------
            // REFRESH FILTERS
            // ------------------------------------------------

            await loadFilterOptions();


            // ------------------------------------------------
            // REFRESH CURRENT PAGE
            // ------------------------------------------------

            await loadLeads(
                leadGetCurrentPage()
            );


            // ------------------------------------------------
            // REFRESH DASHBOARD
            // ------------------------------------------------

            if (
                typeof window.updateDashboard ===
                "function"
            ) {

                await window.updateDashboard();
            }


        } catch (error) {

            console.error(
                "FSI CRM: saveLead error:",
                error
            );


            showLeadError(
                error,
                "An error occurred while saving the lead."
            );
        }
    }


    // ========================================================
    // DELETE LEAD
    // ========================================================

    async function deleteLead(
        id
    ) {

        if (!id) {
            return;
        }


        const confirmed =
            typeof window.confirmAction ===
            "function"
                ? await window.confirmAction(
                    "Delete this lead?"
                )
                : confirm(
                    "Delete this lead?"
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
                        id
                    );


            if (error) {

                console.error(
                    "FSI CRM: delete lead error:",
                    error
                );


                showLeadError(
                    error,
                    "Failed to delete lead."
                );


                return;
            }


            // ------------------------------------------------
            // CLEAR CUSTOMER PROFILE CACHE
            // ------------------------------------------------

            if (
                String(
                    window.crmCurrentCustomerId
                ) ===
                String(id)
            ) {

                window.crmCurrentCustomerId =
                    null;

                window.crmCurrentCustomer =
                    null;
            }


            // ------------------------------------------------
            // REFRESH FILTERS
            // ------------------------------------------------

            await loadFilterOptions();


            // ------------------------------------------------
            // CALCULATE CORRECT PAGE
            // ------------------------------------------------

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


            // ------------------------------------------------
            // LOAD
            // ------------------------------------------------

            await loadLeads(
                pageAfterDelete
            );


            // ------------------------------------------------
            // DASHBOARD
            // ------------------------------------------------

            if (
                typeof window.updateDashboard ===
                "function"
            ) {

                await window.updateDashboard();
            }


            if (
                typeof window.showToast ===
                "function"
            ) {

                window.showToast(
                    "Lead deleted successfully.",
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
                "An error occurred while deleting the lead."
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


        if (isAdmin) {

            select.disabled =
                false;


            select.removeAttribute(
                "aria-disabled"
            );


            return;
        }


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
    // INITIALIZE EVENTS
    // ========================================================

    function initializeLeads() {

        if (leadsInitialized) {
            return;
        }


        leadsInitialized =
            true;


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
                    filterLeads
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
        // Clear filter button
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
        // ESC closes modal
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
        // Click outside modal
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
    }


    // ========================================================
    // PROFILE READY
    // ========================================================

    function handleProfileReady() {

        setupSalesAssignmentAccess();
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


    // ========================================================
    // NAMESPACE
    // ========================================================

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

        setupSalesAssignmentAccess
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
    // PROFILE READY EVENT
    // ========================================================

    document.addEventListener(
        "fsi:profile-ready",
        function () {

            handleProfileReady();
        }
    );


    // ========================================================
    // APP READY EVENT
    // ========================================================

    document.addEventListener(
        "fsi:app-ready",
        function () {

            setupSalesAssignmentAccess();
        }
    );

})();
