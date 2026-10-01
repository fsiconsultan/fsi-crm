// ============================================================
// FSI CRM - LEADS FILTERS
// ============================================================
//
// Fungsi:
// 1. Selected Sales state
// 2. Sales name state
// 3. Sales filter
// 4. Filter options
// 5. Business filter
// 6. Lead filters
// 7. Search query
// 8. Dashboard -> Leads filter integration
//
// ADMIN:
// - Sales dropdown di halaman Leads disembunyikan.
// - Admin tetap dapat melihat seluruh Leads.
// - Tidak mengubah Supabase RLS.
// - Tidak mengubah struktur database.
// - Tidak menghapus fungsi internal Dashboard.
// ============================================================


// ============================================================
// SELECTED SALES
// ============================================================

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

    return String(value).trim();
}


// ============================================================
// SELECTED SALES NAME
// ============================================================

function getSelectedSalesName() {

    const value =
        window.crmSelectedSalesName;

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value).trim();
}


// ============================================================
// APPLY SELECTED SALES FILTER
// ============================================================

function applySelectedSalesFilter() {

    /*
     * Sales filter UI tidak digunakan lagi
     * untuk Admin.
     *
     * Admin melihat seluruh Leads.
     */
    if (leadIsAdmin()) {

        window.currentSalesFilter = "";

        const salesSelect =
            leadElement("salesFilter");

        if (salesSelect) {
            salesSelect.value = "";
        }

        return "";
    }


    const salesSelect =
        leadElement("salesFilter");

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


// ============================================================
// APPLY DASHBOARD SALES FILTER
// ============================================================
//
// Untuk Admin:
// - Sales filter dari Dashboard tidak diterapkan ke Leads.
// - Admin tetap melihat semua Leads.
//
// ============================================================

function applyDashboardSalesFilter(
    salesId
) {

    /*
     * ADMIN
     *
     * Jangan filter Leads berdasarkan Sales.
     */
    if (leadIsAdmin()) {

        window.crmSelectedSalesId = "";

        window.crmSelectedSalesName = "";

        window.currentSalesFilter = "";

        const salesSelect =
            leadElement("salesFilter");

        if (salesSelect) {
            salesSelect.value = "";
        }

        return "";
    }


    const value =
        String(
            salesId || ""
        ).trim();


    window.crmSelectedSalesId =
        value;


    const salesSelect =
        leadElement("salesFilter");


    if (salesSelect) {

        salesSelect.value =
            value;
    }


    if (value) {

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
                            value
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
                "FSI CRM: gagal mendapatkan Sales name:",
                error
            );

            window.crmSelectedSalesName =
                "";
        }

    } else {

        window.crmSelectedSalesName =
            "";
    }


    window.currentSalesFilter =
        value;


    return value;
}


// ============================================================
// APPLY DASHBOARD STATUS FILTER
// ============================================================

function applyDashboardStatusFilter(
    status
) {

    const value =
        String(
            status || ""
        ).trim();


    const statusSelect =
        leadElement(
            "filter-status",
            "statusFilter",
            "leadStatusFilter"
        );


    if (statusSelect) {

        statusSelect.value =
            value;
    }


    window.currentStatusFilter =
        value;


    return value;
}


// ============================================================
// APPLY DASHBOARD FILTER DIRECTLY
// ============================================================

function applyDashboardLeadFilters(
    filters = {}
) {

    const salesId =
        String(
            filters?.salesId || ""
        ).trim();


    const status =
        String(
            filters?.status || ""
        ).trim();


    // ========================================================
    // SALES
    // ========================================================

    applyDashboardSalesFilter(
        salesId
    );


    // ========================================================
    // STATUS
    // ========================================================

    applyDashboardStatusFilter(
        status
    );


    // ========================================================
    // RESET PAGE
    // ========================================================

    if (
        typeof leadSetCurrentPage ===
        "function"
    ) {

        leadSetCurrentPage(1);
    }


    // ========================================================
    // CONTEXT
    // ========================================================

    if (
        typeof updateLeadsContext ===
        "function"
    ) {

        try {

            updateLeadsContext();

        } catch (error) {

            console.warn(
                "FSI CRM: updateLeadsContext failed:",
                error
            );
        }
    }


    return {
        salesId:
            leadIsAdmin()
                ? ""
                : salesId,

        status
    };
}


// ============================================================
// HIDE SALES FILTER FOR ADMIN
// ============================================================

function updateSalesFilterVisibility() {

    const salesSelect =
        leadElement("salesFilter");


    if (!salesSelect) {
        return;
    }


    const isAdmin =
        typeof leadIsAdmin === "function"
            ? leadIsAdmin()
            : false;


    /*
     * Cari container dropdown Sales.
     *
     * Mendukung beberapa kemungkinan
     * struktur HTML.
     */
    const salesContainer =
        salesSelect.closest(
            [
                ".filter-group",
                ".filter-item",
                ".filter-control",
                ".form-group",
                ".sales-filter",
                "[data-sales-filter]"
            ].join(", ")
        );


    const target =
        salesContainer ||
        salesSelect;


    if (isAdmin) {

        target.style.display =
            "none";

        target.setAttribute(
            "data-admin-sales-filter-hidden",
            "true"
        );

        salesSelect.value = "";

    } else {

        target.style.display = "";

        target.removeAttribute(
            "data-admin-sales-filter-hidden"
        );
    }
}


// ============================================================
// FILTER OPTIONS
// ============================================================

async function loadFilterOptions() {

    const client =
        leadGetSupabase();


    if (!client) {

        console.error(
            "FSI CRM: Supabase client is not ready."
        );

        return;
    }


    // ========================================================
    // CHECK DASHBOARD FILTER
    // ========================================================

    let dashboardFilter =
        null;


    try {

        const raw =
            sessionStorage.getItem(
                "fsi_dashboard_leads_filter"
            );


        if (raw) {

            dashboardFilter =
                JSON.parse(raw);
        }

    } catch (error) {

        console.warn(
            "FSI CRM: dashboard filter read error:",
            error
        );
    }


    try {

        // ====================================================
        // SALES LOOKUP
        // ====================================================

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


        // ====================================================
        // BUSINESS
        // ====================================================

        const {
            data,
            error
        } =
            await client
                .from("leads")
                .select("business");


        if (error) {

            console.error(
                "FSI CRM: load business filter options error:",
                error
            );


            populateBusinessFilter([]);

        } else {

            const leads =
                Array.isArray(data)
                    ? data
                    : [];


            const databaseBusinesses =
                leads.map(
                    lead =>
                        leadGetValue(
                            lead.business
                        )
                );


            populateBusinessFilter(
                databaseBusinesses
            );
        }


        // ====================================================
        // SALES DROPDOWNS
        // ====================================================

        if (
            typeof window.populateSalesDropdowns ===
            "function"
        ) {

            /*
             * Tetap jalankan fungsi existing
             * supaya modul lain tidak rusak.
             */
            try {

                window.populateSalesDropdowns();

            } catch (error) {

                console.warn(
                    "FSI CRM: populateSalesDropdowns failed:",
                    error
                );
            }
        }


        // ====================================================
        // HIDE SALES FILTER
        // ====================================================

        updateSalesFilterVisibility();


        // ====================================================
        // DASHBOARD FILTER
        // ====================================================

        if (
            dashboardFilter &&
            typeof dashboardFilter ===
            "object"
        ) {

            applyDashboardLeadFilters(
                dashboardFilter
            );

        } else {

            applySelectedSalesFilter();
        }


    } catch (error) {

        console.error(
            "FSI CRM: loadFilterOptions error:",
            error
        );


        populateBusinessFilter([]);


        updateSalesFilterVisibility();


        if (
            dashboardFilter &&
            typeof dashboardFilter ===
            "object"
        ) {

            applyDashboardLeadFilters(
                dashboardFilter
            );
        }
    }
}


// ============================================================
// STANDARD BUSINESS OPTIONS
// ============================================================

function getStandardBusinessOptions() {

    return [

        "Residential",

        "Villa",

        "Hotel",

        "Restaurant",

        "Office",

        "Factory",

        "Commercial",

        "Other"

    ];
}


// ============================================================
// POPULATE BUSINESS FILTER
// ============================================================

function populateBusinessFilter(
    databaseValues
) {

    const standardValues =
        getStandardBusinessOptions();


    const combinedValues = [

        ...standardValues,

        ...(
            Array.isArray(
                databaseValues
            )
                ? databaseValues
                : []
        )

    ];


    const businesses =
        uniqueSortedValues(
            combinedValues
        );


    populateFilter(
        [
            "filter-business",
            "businessFilter"
        ],
        businesses,
        "All Business"
    );
}


// ============================================================
// UNIQUE + SORT
// ============================================================

function uniqueSortedValues(
    values
) {

    return [

        ...new Set(

            (
                Array.isArray(
                    values
                )
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
                    sensitivity:
                        "base"
                }
            )
    );
}


// ============================================================
// POPULATE FILTER
// ============================================================

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
            document.getElementById(id);


        if (select) {
            break;
        }
    }


    if (!select) {
        return;
    }


    const currentValue =
        String(
            select.value || ""
        ).trim();


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
        uniqueSortedValues(
            Array.isArray(values)
                ? values
                : []
        );


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


// ============================================================
// GET FILTER VALUES
// ============================================================

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


    const salesInput =
        leadElement(
            "salesFilter"
        );


    let salesFilter =
        salesInput?.value || "";


    // ========================================================
    // ADMIN
    // ========================================================
    //
    // Admin tidak lagi menggunakan Sales filter.
    // Admin selalu melihat seluruh Leads.
    //
    // ========================================================

    if (leadIsAdmin()) {

        salesFilter = "";

    } else {

        const selectedSalesId =
            getSelectedSalesId();


        if (
            selectedSalesId !== ""
        ) {

            salesFilter =
                selectedSalesId;
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

        salesFilter:
            salesFilter
    };
}


// ============================================================
// BUILD SEARCH CONDITION
// ============================================================

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

        `email.ilike.%${safeSearch}%`,

        `business.ilike.%${safeSearch}%`,

        `location.ilike.%${safeSearch}%`

    ];


    return query.or(
        searchConditions.join(",")
    );
}


// ============================================================
// EXPORT FILTER FUNCTIONS
// ============================================================

window.getSelectedSalesId =
    getSelectedSalesId;


window.getSelectedSalesName =
    getSelectedSalesName;


window.applySelectedSalesFilter =
    applySelectedSalesFilter;


window.applyDashboardSalesFilter =
    applyDashboardSalesFilter;


window.applyDashboardStatusFilter =
    applyDashboardStatusFilter;


window.applyDashboardLeadFilters =
    applyDashboardLeadFilters;


window.updateSalesFilterVisibility =
    updateSalesFilterVisibility;


window.loadFilterOptions =
    loadFilterOptions;


window.getStandardBusinessOptions =
    getStandardBusinessOptions;


window.populateBusinessFilter =
    populateBusinessFilter;


window.uniqueSortedValues =
    uniqueSortedValues;


window.populateFilter =
    populateFilter;


window.getLeadFilters =
    getLeadFilters;


window.buildSearchQuery =
    buildSearchQuery;


// ============================================================
// FSI LEADS NAMESPACE
// ============================================================

window.FSILeads =
    window.FSILeads ||
    {};


Object.assign(
    window.FSILeads,
    {

        getSelectedSalesId,

        getSelectedSalesName,

        applySelectedSalesFilter,

        applyDashboardSalesFilter,

        applyDashboardStatusFilter,

        applyDashboardLeadFilters,

        updateSalesFilterVisibility,

        loadFilterOptions,

        getStandardBusinessOptions,

        populateBusinessFilter,

        uniqueSortedValues,

        populateFilter,

        getLeadFilters,

        buildSearchQuery

    }
);
