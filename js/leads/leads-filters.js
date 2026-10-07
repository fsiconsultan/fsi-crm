// ============================================================
// FSI CRM - LEADS FILTERS
// ============================================================
//
// Fungsi:
// 1. Selected Sales state
// 2. Sales name state
// 3. Leads Sales filter
// 4. Filter options
// 5. Business filter
// 6. Lead filters
// 7. Search query
// 8. Dashboard -> Leads filter integration
//
// ============================================================
// DROPDOWN OWNERSHIP
// ============================================================
//
// DASHBOARD:
//   #salesFilter
//
// LEADS:
//   #filter-sales
//
// IMPORTANT:
// - #salesFilter = MILIK DASHBOARD
// - #filter-sales = MILIK LEADS
// - Jangan mencampur keduanya.
// ============================================================


// ============================================================
// GET LEADS SALES SELECT
// ============================================================

function getLeadSalesSelect() {

    // Prioritas utama adalah dropdown yang benar-benar
    // terdapat pada halaman Leads.

    const select =
        document.getElementById("filter-sales");

    if (select) {
        return select;
    }

    // Fallback untuk kompatibilitas jika nanti HTML berubah.

    const fallback =
        document.getElementById("leadSalesFilter") ||
        document.getElementById("filterSales");

    return fallback || null;
}


// ============================================================
// GET SELECTED SALES ID
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

    return String(value).trim();
}


// ============================================================
// GET SELECTED SALES NAME
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
// GET CURRENT SALES DATA
// ============================================================
//
// Sumber utama:
//   window.salesUsersData
//
// Ini adalah data yang dihasilkan oleh sales.js.
//
// ============================================================

function leadGetCurrentSalesData() {

    try {

        // PRIMARY
        if (
            Array.isArray(
                window.salesUsersData
            )
        ) {

            return window.salesUsersData;
        }


        // SECONDARY
        if (
            typeof window.leadGetSalesData ===
            "function"
        ) {

            const data =
                window.leadGetSalesData();

            if (
                Array.isArray(data)
            ) {

                return data;
            }
        }


        // LEGACY
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
// NORMALIZE ROLE
// ============================================================

function leadNormalizeRole(role) {

    return String(
        role || ""
    )
        .trim()
        .toLowerCase()
        .replace(
            /[\s-]+/g,
            "_"
        );
}


// ============================================================
// CHECK SALES-LIKE ROLE
// ============================================================

function leadIsSalesLikeRole(role) {

    const normalized =
        leadNormalizeRole(role);

    return (

        normalized === "sales" ||

        normalized === "salesperson" ||

        normalized === "secretary" ||

        normalized === "digital_marketing"

    );
}


// ============================================================
// GET SALES DISPLAY NAME
// ============================================================

function leadGetSalesDisplayName(
    sales
) {

    if (!sales) {
        return "";
    }

    return String(

        sales.name ||

        sales.full_name ||

        sales.username ||

        sales.display_name ||

        sales.email ||

        ""

    ).trim();
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
                    ).trim() === value
                );
            }
        );

    return leadGetSalesDisplayName(
        selected
    );
}


// ============================================================
// SYNC SELECTED SALES STATE
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

    window.crmSelectedSalesName =
        value
            ? leadGetSalesNameById(value)
            : "";

    return value;
}


// ============================================================
// POPULATE LEADS SALES DROPDOWN
// ============================================================
//
// INI BAGIAN PENTING.
//
// Dropdown Leads diisi langsung dari:
//
//   window.salesUsersData
//
// Tidak bergantung pada populateSalesDropdowns().
// Tidak menyentuh #salesFilter Dashboard.
// ============================================================

function populateLeadsSalesDropdown() {

    const salesSelect =
        getLeadSalesSelect();

    if (!salesSelect) {

        console.warn(
            "FSI CRM: Dropdown Leads #filter-sales tidak ditemukan."
        );

        return false;
    }


    const salesData =
        leadGetCurrentSalesData();


    console.log(
        "FSI CRM: populateLeadsSalesDropdown:",
        {
            dropdownId:
                salesSelect.id,

            salesDataLength:
                salesData.length,

            salesData:
                salesData
        }
    );


    // Simpan pilihan sekarang.

    const currentValue =
        String(
            salesSelect.value || ""
        ).trim();


    // Bersihkan dropdown.

    salesSelect.innerHTML =
        "";


    // ========================================================
    // ALL SALES
    // ========================================================

    const allOption =
        document.createElement(
            "option"
        );

    allOption.value =
        "";

    allOption.textContent =
        "All Sales";

    salesSelect.appendChild(
        allOption
    );


    // ========================================================
    // FILTER USER YANG BOLEH MUNCUL
    // ========================================================

    const salesUsers =
        salesData
            .filter(
                function (user) {

                    if (!user) {
                        return false;
                    }

                    // Active check.
                    //
                    // Kalau is_active tidak tersedia,
                    // tetap izinkan user.

                    if (
                        user.is_active !== undefined &&
                        user.is_active !== null
                    ) {

                        if (
                            user.is_active === false ||
                            user.is_active === "false" ||
                            user.is_active === 0
                        ) {

                            return false;
                        }
                    }


                    return leadIsSalesLikeRole(
                        user.role
                    );
                }
            )
            .sort(
                function (a, b) {

                    const nameA =
                        leadGetSalesDisplayName(a);

                    const nameB =
                        leadGetSalesDisplayName(b);

                    return nameA.localeCompare(
                        nameB,
                        undefined,
                        {
                            sensitivity:
                                "base"
                        }
                    );
                }
            );


    console.log(
        "FSI CRM: Leads Sales users:",
        salesUsers
    );


    // ========================================================
    // ADD USERS
    // ========================================================

    salesUsers.forEach(
        function (sales) {

            const id =
                String(
                    sales?.id || ""
                ).trim();

            const name =
                leadGetSalesDisplayName(
                    sales
                );

            if (!id || !name) {
                return;
            }


            const option =
                document.createElement(
                    "option"
                );

            option.value =
                id;

            option.textContent =
                name;

            salesSelect.appendChild(
                option
            );
        }
    );


    // ========================================================
    // RESTORE VALUE
    // ========================================================

    const stateValue =
        getSelectedSalesId();


    const restoreValue =
        stateValue ||
        currentValue;


    if (
        restoreValue &&
        Array.from(
            salesSelect.options
        ).some(
            function (option) {

                return (
                    option.value ===
                    restoreValue
                );
            }
        )
    ) {

        salesSelect.value =
            restoreValue;

    } else {

        salesSelect.value =
            "";
    }


    console.log(
        "FSI CRM: Leads Sales dropdown FINAL:",
        {
            id:
                salesSelect.id,

            value:
                salesSelect.value,

            options:
                Array.from(
                    salesSelect.options
                ).map(
                    function (option) {

                        return {
                            value:
                                option.value,

                            text:
                                option.textContent
                        };
                    }
                )
        }
    );


    return true;
}


// ============================================================
// APPLY SELECTED SALES FILTER
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
            "FSI CRM: Admin Leads Sales filter:",
            {
                dropdown:
                    salesSelect
                        ? salesSelect.id
                        : null,

                value:
                    selectedValue,

                salesName:
                    window.crmSelectedSalesName,

                isAllSales:
                    selectedValue === ""
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
// Dashboard tetap memakai:
//
//   #salesFilter
//
// Tetapi ketika Dashboard mengirim filter ke Leads,
// yang diubah untuk Leads adalah:
//
//   #filter-sales
//
// ============================================================

function applyDashboardSalesFilter(
    salesId
) {

    const value =
        String(
            salesId || ""
        ).trim();


    // ========================================================
    // JANGAN UBAH DASHBOARD DROPDOWN
    // ========================================================
    //
    // Dashboard sudah punya state sendiri.
    //
    // Kita hanya menerima nilai salesId yang dikirim
    // oleh Dashboard.
    // ========================================================


    // ========================================================
    // SET LEADS DROPDOWN
    // ========================================================

    const leadsSalesSelect =
        getLeadSalesSelect();


    if (leadsSalesSelect) {

        leadsSalesSelect.value =
            value;
    }


    // ========================================================
    // STATE
    // ========================================================

    syncSelectedSalesState(
        value
    );


    console.log(
        "FSI CRM: Dashboard -> Leads Sales filter:",
        {
            salesId:
                value,

            leadsDropdown:
                leadsSalesSelect
                    ? leadsSalesSelect.id
                    : null,

            leadsValue:
                leadsSalesSelect
                    ? leadsSalesSelect.value
                    : null,

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
// APPLY DASHBOARD LEAD FILTERS
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


    applyDashboardSalesFilter(
        salesId
    );


    applyDashboardStatusFilter(
        status
    );


    if (
        typeof leadSetCurrentPage ===
        "function"
    ) {

        leadSetCurrentPage(1);
    }


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


    target.style.display =
        "";


    target.removeAttribute(
        "data-admin-sales-filter-hidden"
    );
}


// ============================================================
// BIND LEADS SALES CHANGE
// ============================================================
//
// Kita bind langsung ke dropdown #filter-sales.
//
// Jadi walaupun leads-init.js tidak memasang event,
// dropdown tetap bekerja.
//
// ============================================================

function bindLeadsSalesFilter() {

    const salesSelect =
        getLeadSalesSelect();


    if (!salesSelect) {

        console.warn(
            "FSI CRM: Tidak bisa bind Sales filter. Dropdown tidak ditemukan."
        );

        return false;
    }


    // Hindari event listener ganda.

    if (
        salesSelect.dataset.fsiSalesFilterBound ===
        "true"
    ) {

        return true;
    }


    salesSelect.addEventListener(
        "change",
        async function () {

            const selectedValue =
                String(
                    salesSelect.value || ""
                ).trim();


            console.log(
                "FSI CRM: Leads Sales dropdown changed:",
                {
                    value:
                        selectedValue,

                    name:
                        leadGetSalesNameById(
                            selectedValue
                        )
                }
            );


            // State.

            syncSelectedSalesState(
                selectedValue
            );


            // Reset halaman.

            if (
                typeof leadSetCurrentPage ===
                "function"
            ) {

                leadSetCurrentPage(1);
            }


            // Reload Leads.

            if (
                typeof loadLeads ===
                "function"
            ) {

                try {

                    await loadLeads(1);

                } catch (error) {

                    console.error(
                        "FSI CRM: gagal reload Leads setelah Sales filter:",
                        error
                    );
                }
            }
        }
    );


    salesSelect.dataset.fsiSalesFilterBound =
        "true";


    console.log(
        "FSI CRM: Leads Sales filter event bound:",
        salesSelect.id
    );


    return true;
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
    // SIMPAN PILIHAN SALES
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
    // DASHBOARD FILTER
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
        // LOAD SALES LOOKUP
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
        // LANGSUNG POPULATE LEADS SALES
        // ====================================================

        populateLeadsSalesDropdown();


        // ====================================================
        // BIND EVENT
        // ====================================================

        bindLeadsSalesFilter();


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
        // VISIBILITY
        // ====================================================

        updateSalesFilterVisibility();


        // ====================================================
        // DASHBOARD -> LEADS
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

            // ==================================================
            // RESTORE ADMIN SELECTION
            // ==================================================

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


        populateBusinessFilter([]);

        updateSalesFilterVisibility();

        populateLeadsSalesDropdown();

        bindLeadsSalesFilter();


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
            Array.isArray(databaseValues)
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
                Array.isArray(values)
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
                .filter(Boolean)

        )

    ].sort(
        function (a, b) {

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
        Array.isArray(ids)
            ? ids
            : [ids];


    let select = null;


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
// GET LEAD FILTERS
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


    // ========================================================
    // HANYA DROPDOWN LEADS
    // ========================================================

    const salesInput =
        getLeadSalesSelect();


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

        syncSelectedSalesState(
            salesFilter
        );


        console.log(
            "DEBUG FSI CRM - getLeadFilters ADMIN:",
            {
                salesFilter,

                dropdownId:
                    salesInput
                        ? salesInput.id
                        : null,

                dropdownValue:
                    salesInput
                        ? salesInput.value
                        : null,

                crmSelectedSalesId:
                    window.crmSelectedSalesId,

                currentSalesFilter:
                    window.currentSalesFilter,

                salesName:
                    window.crmSelectedSalesName
            }
        );

    } else {

        // ====================================================
        // SALES / SECRETARY / DIGITAL MARKETING
        // ====================================================

        const selectedSalesId =
            getSelectedSalesId();


        if (
            selectedSalesId
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
// BUILD SEARCH QUERY
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
// EXPORT
// ============================================================

window.getLeadSalesSelect =
    getLeadSalesSelect;

window.getSelectedSalesId =
    getSelectedSalesId;

window.getSelectedSalesName =
    getSelectedSalesName;

window.leadGetCurrentSalesData =
    leadGetCurrentSalesData;

window.leadGetSalesNameById =
    leadGetSalesNameById;

window.populateLeadsSalesDropdown =
    populateLeadsSalesDropdown;

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

window.bindLeadsSalesFilter =
    bindLeadsSalesFilter;

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

        leadGetCurrentSalesData,

        leadGetSalesNameById,

        populateLeadsSalesDropdown,

        applySelectedSalesFilter,

        applyDashboardSalesFilter,

        applyDashboardStatusFilter,

        applyDashboardLeadFilters,

        updateSalesFilterVisibility,

        bindLeadsSalesFilter,

        loadFilterOptions,

        getStandardBusinessOptions,

        populateBusinessFilter,

        uniqueSortedValues,

        populateFilter,

        getLeadFilters,

        buildSearchQuery

    }
);
