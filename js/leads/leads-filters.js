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
// IMPORTANT:
// - ADMIN dapat menggunakan Sales dropdown.
// - Admin memilih Sales A/B/C -> hanya Lead Sales tersebut.
// - Admin memilih All Sales -> seluruh Leads.
// - SALES biasa tetap menggunakan Sales ID miliknya.
// - SECRETARY tetap menggunakan Sales ID miliknya.
// - DIGITAL MARKETING tetap menggunakan Sales ID miliknya.
// - Tidak mengubah Supabase RLS.
// - Tidak mengubah struktur database.
//
// DROPDOWN OWNERSHIP:
//
// Dashboard:
//   #salesFilter
//
// Leads:
//   #leadSalesFilter
//   #filter-sales
//   #filterSales
//
// IMPORTANT:
// #salesFilter TIDAK digunakan sebagai dropdown Leads.
// ============================================================


// ============================================================
// LEADS SALES SELECT
// ============================================================
//
// Satu helper untuk mengambil dropdown Sales milik halaman Leads.
//
// Priority:
// 1. #leadSalesFilter
// 2. #filter-sales
// 3. #filterSales
//
// JANGAN menggunakan #salesFilter di sini.
// #salesFilter adalah milik Dashboard.
//

function getLeadSalesSelect() {

    return leadElement(
        "leadSalesFilter",
        "filter-sales",
        "filterSales"
    );
}


// ============================================================
// SELECTED SALES
// ============================================================

function getSelectedSalesId() {

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

    return String(
        value
    ).trim();
}


// ============================================================
// GET SALES DATA
// ============================================================

function leadGetCurrentSalesData() {

    try {

        // ----------------------------------------------------
        // PRIMARY SOURCE
        // ----------------------------------------------------

        if (
            typeof leadGetSalesData ===
            "function"
        ) {

            const data =
                leadGetSalesData();

            if (
                Array.isArray(data) &&
                data.length > 0
            ) {

                return data;
            }
        }


        // ----------------------------------------------------
        // CURRENT SALES LOOKUP
        // ----------------------------------------------------

        if (
            Array.isArray(
                window.salesUsersData
            )
        ) {

            return window.salesUsersData;
        }


        // ----------------------------------------------------
        // LEGACY
        // ----------------------------------------------------

        if (
            Array.isArray(
                window.salesData
            )
        ) {

            return window.salesData;
        }


        if (
            Array.isArray(
                window.salesUsers
            )
        ) {

            return window.salesUsers;
        }


        return [];

    } catch (error) {

        console.warn(
            "FSI CRM: gagal membaca Sales data:",
            error
        );

        return [];
    }
}


// ============================================================
// GET SALES NAME BY ID
// ============================================================

function leadGetSalesNameById(
    salesId
) {

    const value =
        String(
            salesId || ""
        ).trim();


    if (!value) {
        return "";
    }


    const salesData =
        leadGetCurrentSalesData();


    const selected =
        salesData.find(
            function (sales) {

                return (
                    String(
                        sales?.id || ""
                    ).trim() ===
                    value
                );
            }
        );


    if (!selected) {
        return "";
    }


    return String(
        selected.name ||
        selected.full_name ||
        selected.username ||
        ""
    ).trim();
}


// ============================================================
// SYNC SELECTED SALES STATE
// ============================================================
//
// Satu sumber state untuk:
//
// - crmSelectedSalesId
// - currentSalesFilter
// - crmSelectedSalesName
//
// ============================================================

function syncSelectedSalesState(
    salesId
) {

    const value =
        String(
            salesId || ""
        ).trim();


    window.crmSelectedSalesId =
        value;


    window.currentSalesFilter =
        value;


    if (value) {

        window.crmSelectedSalesName =
            leadGetSalesNameById(
                value
            );

    } else {

        window.crmSelectedSalesName =
            "";
    }


    return value;
}


// ============================================================
// APPLY SELECTED SALES FILTER
// ============================================================
//
// Untuk Leads.
//
// ADMIN:
//   mengambil nilai dari dropdown Leads.
//
// SALES / SECRETARY / DIGITAL MARKETING:
//   menggunakan Sales ID miliknya.
//
// ============================================================

function applySelectedSalesFilter() {

    const salesSelect =
        getLeadSalesSelect();


    // ========================================================
    // ADMIN
    // ========================================================

    if (
        leadIsAdmin()
    ) {

        const selectedValue =
            salesSelect
                ? String(
                    salesSelect.value || ""
                ).trim()
                : "";


        syncSelectedSalesState(
            selectedValue
        );


        console.log(
            "FSI CRM: Admin Leads Sales filter applied:",
            {
                salesFilter:
                    selectedValue,

                dropdownId:
                    salesSelect
                        ? salesSelect.id
                        : undefined,

                dropdownValue:
                    salesSelect
                        ? salesSelect.value
                        : undefined,

                crmSelectedSalesId:
                    window.crmSelectedSalesId,

                currentSalesFilter:
                    window.currentSalesFilter,

                salesName:
                    window.crmSelectedSalesName,

                isAllSales:
                    selectedValue === "",

                salesInputExists:
                    Boolean(
                        salesSelect
                    )
            }
        );


        return selectedValue;
    }


    // ========================================================
    // SALES / SECRETARY / DIGITAL MARKETING
    // ========================================================

    const selectedSalesId =
        getSelectedSalesId();


    if (salesSelect) {

        salesSelect.value =
            selectedSalesId || "";
    }


    syncSelectedSalesState(
        selectedSalesId
    );


    return selectedSalesId;
}


// ============================================================
// APPLY DASHBOARD SALES FILTER
// ============================================================
//
// Dashboard tetap menggunakan:
//
// #salesFilter
//
// Fungsi ini dipakai ketika Dashboard mengirim filter
// ke halaman Leads.
//
// ============================================================

function applyDashboardSalesFilter(
    salesId
) {

    const value =
        String(
            salesId || ""
        ).trim();


    // --------------------------------------------------------
    // Dashboard dropdown
    // --------------------------------------------------------

    const dashboardSalesSelect =
        leadElement(
            "salesFilter"
        );


    if (dashboardSalesSelect) {

        dashboardSalesSelect.value =
            value;
    }


    // --------------------------------------------------------
    // Leads dropdown
    //
    // Dashboard -> Leads harus tetap mensinkronkan
    // dropdown Leads.
    // --------------------------------------------------------

    const leadsSalesSelect =
        getLeadSalesSelect();


    if (leadsSalesSelect) {

        leadsSalesSelect.value =
            value;
    }


    // --------------------------------------------------------
    // State
    // --------------------------------------------------------

    syncSelectedSalesState(
        value
    );


    // --------------------------------------------------------
    // Debug
    // --------------------------------------------------------

    console.log(
        "FSI CRM: Dashboard Sales filter applied to Leads:",
        {
            salesId:
                value,

            dashboardDropdown:
                dashboardSalesSelect
                    ? dashboardSalesSelect.value
                    : undefined,

            leadsDropdownId:
                leadsSalesSelect
                    ? leadsSalesSelect.id
                    : undefined,

            leadsDropdownValue:
                leadsSalesSelect
                    ? leadsSalesSelect.value
                    : undefined,

            salesName:
                window.crmSelectedSalesName
        }
    );


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
                "FSI CRM: updateLeadsContext failed:",
                error
            );
        }
    }


    return {

        salesId,

        status
    };
}


// ============================================================
// SALES FILTER VISIBILITY
// ============================================================

function updateSalesFilterVisibility() {

    const salesSelect =
        getLeadSalesSelect();


    if (!salesSelect) {

        return;
    }


    // --------------------------------------------------------
    // Cari container dropdown Leads.
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // Admin melihat dropdown.
    // --------------------------------------------------------

    if (
        leadIsAdmin()
    ) {

        target.style.display =
            "";

        target.removeAttribute(
            "data-admin-sales-filter-hidden"
        );

        return;
    }


    // --------------------------------------------------------
    // Sales-like role
    //
    // Dropdown tetap tersedia secara visual tetapi nilainya
    // dikunci oleh Sales ID sendiri.
    // --------------------------------------------------------

    target.style.display =
        "";

    target.removeAttribute(
        "data-admin-sales-filter-hidden"
    );
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
    // SIMPAN SALES YANG SEDANG DIPILIH
    // ========================================================

    const salesSelectBefore =
        getLeadSalesSelect();


    const previousSalesId =
        salesSelectBefore
            ? String(
                salesSelectBefore.value || ""
            ).trim()
            : getSelectedSalesId();


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
                JSON.parse(
                    raw
                );
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
                .from(
                    "leads"
                )
                .select(
                    "business"
                );


        if (error) {

            console.error(
                "FSI CRM: load business filter options error:",
                error
            );


            populateBusinessFilter(
                []
            );

        } else {

            const leads =
                Array.isArray(
                    data
                )
                    ? data
                    : [];


            const databaseBusinesses =
                leads.map(
                    function (lead) {

                        return leadGetValue(
                            lead.business
                        );
                    }
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
        // SHOW SALES FILTER
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

            // ------------------------------------------------
            // Jika tidak ada Dashboard filter,
            // pertahankan pilihan Leads sebelumnya.
            // ------------------------------------------------

            const salesSelect =
                getLeadSalesSelect();


            if (
                leadIsAdmin()
            ) {

                if (
                    salesSelect &&
                    previousSalesId
                ) {

                    salesSelect.value =
                        previousSalesId;
                }


                applySelectedSalesFilter();

            } else {

                applySelectedSalesFilter();
            }
        }


    } catch (error) {

        console.error(
            "FSI CRM: loadFilterOptions error:",
            error
        );


        populateBusinessFilter(
            []
        );


        updateSalesFilterVisibility();


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
                    function (value) {

                        return String(
                            value ?? ""
                        ).trim();
                    }
                )
                .filter(
                    Boolean
                )
        )

    ].sort(
        function (
            a,
            b
        ) {

            return a.localeCompare(
                b,
                undefined,
                {
                    sensitivity:
                        "base"
                }
            );
        }
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
        Array.isArray(
            ids
        )
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
            Array.isArray(
                values
            )
                ? values
                : []
        );


    safeValues.forEach(
        function (value) {

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
//
// Ini bagian PALING PENTING untuk Leads.
//
// ADMIN:
//   membaca #leadSalesFilter / #filter-sales / #filterSales
//
// SALES-LIKE:
//   menggunakan Sales ID sendiri.
//
// #salesFilter tidak digunakan di sini.
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


    // --------------------------------------------------------
    // LEADS SALES DROPDOWN
    // --------------------------------------------------------

    const salesInput =
        getLeadSalesSelect();


    // ========================================================
    // SALES FILTER
    // ========================================================

    let salesFilter =
        salesInput
            ? String(
                salesInput.value || ""
            ).trim()
            : "";


    // ========================================================
    // ADMIN
    // ========================================================

    if (
        leadIsAdmin()
    ) {

        // ----------------------------------------------------
        // Dropdown Leads adalah source of truth.
        // ----------------------------------------------------

        syncSelectedSalesState(
            salesFilter
        );


        console.log(
            "DEBUG FSI CRM - getLeadFilters ADMIN:",
            {
                salesFilter:
                    salesFilter,

                dropdownId:
                    salesInput
                        ? salesInput.id
                        : undefined,

                dropdownValue:
                    salesInput
                        ? salesInput.value
                        : undefined,

                crmSelectedSalesId:
                    window.crmSelectedSalesId,

                currentSalesFilter:
                    window.currentSalesFilter,

                salesName:
                    window.crmSelectedSalesName,

                isEmpty:
                    salesFilter === "",

                salesInputExists:
                    Boolean(
                        salesInput
                    )
            }
        );

    } else {

        // ====================================================
        // SALES / SECRETARY / DIGITAL MARKETING
        // ====================================================

        const selectedSalesId =
            getSelectedSalesId();


        if (
            selectedSalesId !== ""
        ) {

            salesFilter =
                selectedSalesId;


            if (salesInput) {

                salesInput.value =
                    selectedSalesId;
            }
        }


        syncSelectedSalesState(
            salesFilter
        );
    }


    // ========================================================
    // RETURN FILTERS
    // ========================================================

    const filters = {

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


    console.log(
        "DEBUG FSI CRM - FINAL LEAD FILTERS:",
        filters
    );


    return filters;
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
        String(
            search
        )
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
        searchConditions.join(
            ","
        )
    );
}


// ============================================================
// EXPORT FILTER FUNCTIONS
// ============================================================

window.getLeadSalesSelect =
    getLeadSalesSelect;


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

        getLeadSalesSelect,

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
