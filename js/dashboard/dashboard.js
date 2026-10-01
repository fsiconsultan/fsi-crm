// ============================================================
// FSI CRM - DASHBOARD MODULE
// ============================================================
//
// Fungsi utama:
// 1. Dashboard greeting
// 2. Load dashboard leads
// 3. Role-based dashboard scope
// 4. Admin Sales selector
// 5. Admin Sales cards
// 6. Klik Sales -> langsung ke halaman Leads
// 7. Dashboard -> Leads dengan filter Sales
// 8. Dashboard -> Leads dengan filter Status
// 9. Customer -> Customer Profile
// 10. Dashboard statistics
// 11. Dashboard pipeline
// 12. Recent activity
// 13. Dashboard navigation
// 14. Dashboard refresh
//
// UPDATE:
// - CARD "ALL SALES" DIHILANGKAN DARI DASHBOARD.
// - Sales individual tetap ditampilkan.
// - Total Leads pada Sales Overview tetap ditampilkan.
// - Klik Sales -> Leads dengan filter Sales.
// - Klik Status -> Leads dengan filter Status.
// - Jika Sales sudah dipilih, Status + Sales digabung.
//
// ROLE RULE:
//
// ADMIN
// - Bisa melihat semua Sales
// - Tidak menampilkan card ALL SALES
// - Bisa memilih Sales tertentu
// - Bisa melihat seluruh customer
// - Klik Sales -> halaman Leads + filter Sales
//
// SALES
// - Tidak melihat Sales selector
// - Tidak melihat ALL SALES
// - Tidak melihat Sales lain
// - Hanya melihat lead miliknya sendiri
//
// IMPORTANT:
// - Jangan mengubah RLS Supabase.
// - Dashboard tidak membuat tabel customer baru.
// - Customer list tetap berada di halaman Leads.
// ============================================================


// ============================================================
// DASHBOARD STATE
// ============================================================

let dashboardSelectedSalesIdState = "";

let dashboardSalesFilterBound = false;

let dashboardViewAllBound = false;


// ============================================================
// DASHBOARD GREETING
// ============================================================

function dashboardUpdateGreeting(profile) {

    if (!profile) {
        return;
    }


    // ========================================================
    // USER NAME
    // ========================================================

    const userName =
        String(
            profile?.name ||
            profile?.full_name ||
            profile?.display_name ||
            profile?.username ||
            ""
        ).trim();


    const displayName =
        userName ||
        "Guest";


    // ========================================================
    // ROLE
    // ========================================================

    const role =
        String(
            profile?.role ||
            ""
        ).trim();


    // ========================================================
    // TIME
    // ========================================================

    const hour =
        new Date().getHours();


    let greeting =
        "Good Evening";


    let icon =
        "🌙";


    if (
        hour >= 5 &&
        hour < 12
    ) {

        greeting =
            "Good Morning";

        icon =
            "☀️";

    } else if (
        hour >= 12 &&
        hour < 17
    ) {

        greeting =
            "Good Afternoon";

        icon =
            "🌤️";

    } else {

        greeting =
            "Good Evening";

        icon =
            "🌙";
    }


    // ========================================================
    // FIND ELEMENT
    // ========================================================

    let greetingElement =
        document.getElementById(
            "dashboardGreeting"
        );


    // ========================================================
    // CREATE IF NOT EXIST
    // ========================================================

    if (!greetingElement) {

        greetingElement =
            document.createElement(
                "div"
            );


        greetingElement.id =
            "dashboardGreeting";


        greetingElement.style.display =
            "flex";


        greetingElement.style.alignItems =
            "center";


        greetingElement.style.gap =
            "10px";


        greetingElement.style.marginBottom =
            "20px";


        greetingElement.style.fontSize =
            "24px";


        greetingElement.style.fontWeight =
            "600";


        greetingElement.style.lineHeight =
            "1.3";


        const dashboardPage =
            dashboardFindPage(
                "dashboard"
            );


        if (dashboardPage) {

            dashboardPage.prepend(
                greetingElement
            );
        }
    }


    // ========================================================
    // RENDER
    // ========================================================

    greetingElement.innerHTML =
        `
        <span
            class="dashboard-greeting-icon"
            aria-hidden="true"
        >
            ${icon}
        </span>

        <span
            class="dashboard-greeting-text"
        >
            ${greeting},
            <strong class="dashboard-greeting-name">
                ${dashboardEscapeGreetingHTML(displayName)}
            </strong>!
        </span>
        `;


    greetingElement.dataset.role =
        role ||
        "Guest";


    greetingElement.dataset.name =
        displayName;


    // ========================================================
    // ANIMATION
    // ========================================================

    greetingElement.classList.add(
        "dashboard-greeting-animated"
    );


    greetingElement.classList.remove(
        "dashboard-greeting-refresh"
    );


    void greetingElement.offsetWidth;


    greetingElement.classList.add(
        "dashboard-greeting-refresh"
    );


    console.log(
        "FSI CRM: greeting updated:",
        {
            greeting,
            name: displayName,
            role: role || "Guest",
            hour
        }
    );
}


// ============================================================
// ESCAPE HTML
// ============================================================

function dashboardEscapeGreetingHTML(value) {

    const text =
        String(
            value ?? ""
        );


    return text
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


// ============================================================
// DASHBOARD SALES SELECTOR VISIBILITY
// ============================================================

function dashboardUpdateSalesSelectorVisibility() {

    const isAdmin =
        dashboardIsAdmin();


    const selectorSelectors = [

        "#dashboardSalesCards",

        "#dashboardSalesCardsDynamic",

        "#salesFilter",

        "#dashboardSalesFilter",

        "#dashboardSalesSection",

        "#dashboard-sales-section",

        "#sales-selector-section",

        "#sales-selector",

        ".dashboard-sales-selector",

        ".dashboard-sales-section",

        ".sales-selector-section"

    ];


    const elements =
        new Set();


    selectorSelectors.forEach(
        selector => {

            document
                .querySelectorAll(
                    selector
                )
                .forEach(
                    element => {

                        elements.add(
                            element
                        );
                    }
                );
        }
    );


    elements.forEach(
        element => {

            if (!element) {
                return;
            }


            if (isAdmin) {

                element.style.display =
                    "";

                element.removeAttribute(
                    "aria-hidden"
                );

            } else {

                element.style.display =
                    "none";

                element.setAttribute(
                    "aria-hidden",
                    "true"
                );
            }
        }
    );


    // ========================================================
    // SALES USER
    // ========================================================

    if (!isAdmin) {

        const allElements =
            document.querySelectorAll(
                "p, span, div, small, h3, h4"
            );


        allElements.forEach(
            element => {

                const text =
                    String(
                        element.textContent ||
                        ""
                    )
                    .replace(
                        /\s+/g,
                        " "
                    )
                    .trim()
                    .toLowerCase();


                if (
                    text ===
                    "select a sales to view their customer activity."
                ) {

                    const parent =
                        element.closest(
                            [
                                ".dashboard-sales-selector",
                                ".dashboard-sales-section",
                                ".sales-selector-section",
                                ".dashboard-card",
                                ".card",
                                "section"
                            ].join(",")
                        );


                    if (parent) {

                        parent.style.display =
                            "none";

                        parent.setAttribute(
                            "aria-hidden",
                            "true"
                        );

                    } else {

                        element.style.display =
                            "none";
                    }
                }
            }
        );
    }


    console.log(
        "FSI CRM: Sales selector visibility:",
        isAdmin
            ? "ADMIN → SHOW"
            : "SALES → HIDE"
    );
}


// ============================================================
// SALES DISPLAY NAME
// ============================================================

function dashboardGetSalesDisplayName(
    sales
) {

    if (!sales) {
        return "Sales";
    }


    return String(

        sales.name ||

        sales.full_name ||

        sales.display_name ||

        sales.username ||

        sales.email ||

        "Sales"

    ).trim();
}


// ============================================================
// SALES INITIAL
// ============================================================

function dashboardGetSalesInitial(
    name
) {

    const text =
        String(
            name || ""
        ).trim();


    if (!text) {
        return "S";
    }


    const parts =
        text
            .split(/\s+/)
            .filter(Boolean);


    if (
        parts.length === 1
    ) {

        return parts[0]
            .substring(0, 2)
            .toUpperCase();
    }


    return (

        String(
            parts[0][0]
        ) +

        String(
            parts[parts.length - 1][0]
        )

    ).toUpperCase();
}


// ============================================================
// SALES ROLE CHECK
// ============================================================

function dashboardIsSalesUser(
    sales
) {

    if (!sales) {
        return false;
    }


    const role =
        String(
            sales.role ||
            ""
        )
        .trim()
        .toLowerCase()
        .replace(
            /[\s-]+/g,
            "_"
        );


    return [

        "sales",

        "salesperson",

        "secretary",

        "digital_marketing"

    ].includes(
        role
    );
}


// ============================================================
// SALES ACTIVE CHECK
// ============================================================

function dashboardIsSalesActive(
    sales
) {

    if (!sales) {
        return false;
    }


    const status =
        String(
            sales.status ?? ""
        )
        .trim()
        .toLowerCase();


    if (!status) {
        return true;
    }


    return status !== "inactive";
}


// ============================================================
// GET SALES USERS
// ============================================================

function dashboardGetSalesUsers() {

    let users = [];


    // ========================================================
    // PRIMARY
    // ========================================================

    if (
        Array.isArray(
            window.salesUsersData
        )
    ) {

        users =
            window.salesUsersData.slice();
    }


    // ========================================================
    // FALLBACK
    // ========================================================

    if (
        !users.length &&
        typeof window.getActiveSales ===
        "function"
    ) {

        try {

            const activeSales =
                window.getActiveSales();


            if (
                Array.isArray(
                    activeSales
                )
            ) {

                users =
                    activeSales.slice();
            }

        } catch (error) {

            console.warn(
                "FSI CRM: getActiveSales fallback gagal:",
                error
            );
        }
    }


    // ========================================================
    // FILTER
    // ========================================================

    users =
        users.filter(
            sales => {

                return (
                    dashboardIsSalesUser(
                        sales
                    ) &&
                    dashboardIsSalesActive(
                        sales
                    )
                );
            }
        );


    // ========================================================
    // REMOVE DUPLICATE
    // ========================================================

    const seen =
        new Set();


    users =
        users.filter(
            sales => {

                const id =
                    String(
                        sales?.id ??
                        ""
                    ).trim();


                if (!id) {
                    return false;
                }


                if (
                    seen.has(id)
                ) {

                    return false;
                }


                seen.add(id);


                return true;
            }
        );


    // ========================================================
    // SORT
    // ========================================================

    users.sort(
        (
            a,
            b
        ) => {

            const nameA =
                dashboardGetSalesDisplayName(
                    a
                ).toLowerCase();


            const nameB =
                dashboardGetSalesDisplayName(
                    b
                ).toLowerCase();


            return nameA.localeCompare(
                nameB
            );
        }
    );


    return users;
}


// ============================================================
// FIND SALES CARD CONTAINER
// ============================================================

function dashboardFindSalesCardsContainer() {

    const dynamic =
        document.getElementById(
            "dashboardSalesCardsDynamic"
        );


    const normal =
        document.getElementById(
            "dashboardSalesCards"
        );


    // ========================================================
    // DYNAMIC PRIORITY
    // ========================================================

    if (dynamic) {

        if (
            normal &&
            normal !== dynamic &&
            !normal.contains(
                dynamic
            )
        ) {

            normal.style.display =
                "none";

            normal.setAttribute(
                "aria-hidden",
                "true"
            );
        }


        return dynamic;
    }


    // ========================================================
    // NORMAL
    // ========================================================

    if (normal) {

        normal.style.display =
            "";

        normal.removeAttribute(
            "aria-hidden"
        );


        return normal;
    }


    // ========================================================
    // SECTION FALLBACK
    // ========================================================

    const section =
        document.getElementById(
            "dashboardSalesSection"
        );


    if (!section) {
        return null;
    }


    const newContainer =
        document.createElement(
            "div"
        );


    newContainer.id =
        "dashboardSalesCardsDynamic";


    newContainer.className =
        "dashboard-sales-cards-grid";


    section.appendChild(
        newContainer
    );


    return newContainer;
}


// ============================================================
// DASHBOARD -> LEADS WITH FILTER
// ============================================================
//
// Dashboard tidak membuat customer list.
//
// Dashboard hanya mengirim filter ke halaman Leads.
//
// filters:
// {
//     salesId: "...",
//     status: "..."
// }
//
// ============================================================

function dashboardOpenLeadsWithFilters(
    filters = {}
) {

    const salesId =
        String(
            filters?.salesId ||
            ""
        ).trim();


    const status =
        String(
            filters?.status ||
            ""
        ).trim();


    const filterData = {

        salesId,

        status
    };


    // ========================================================
    // SAVE FILTER
    // ========================================================

    try {

        sessionStorage.setItem(
            "fsi_dashboard_leads_filter",
            JSON.stringify(
                filterData
            )
        );

    } catch (error) {

        console.warn(
            "FSI CRM: gagal menyimpan Dashboard Leads filter:",
            error
        );
    }


    console.log(
        "FSI CRM: membuka Leads dengan filter:",
        filterData
    );


    // ========================================================
    // OPEN LEADS
    // ========================================================

    try {

        if (
            typeof window.showLeads ===
            "function"
        ) {

            window.showLeads();

            return true;
        }

    } catch (error) {

        console.error(
            "FSI CRM: showLeads error:",
            error
        );
    }


    // ========================================================
    // FALLBACK
    // ========================================================

    try {

        window.location.href =
            "leads.html";

    } catch (error) {

        console.error(
            "FSI CRM: gagal membuka leads.html:",
            error
        );
    }


    return false;
}


// ============================================================
// DASHBOARD -> LEADS BY SALES
// ============================================================

function dashboardOpenSalesInLeads(
    salesId
) {

    const value =
        String(
            salesId ||
            ""
        ).trim();


    dashboardOpenLeadsWithFilters({

        salesId:
            value,

        status:
            ""
    });
}


// ============================================================
// DASHBOARD -> LEADS BY STATUS
// ============================================================

function dashboardOpenStatusInLeads(
    status
) {

    const value =
        String(
            status ||
            ""
        ).trim();


    dashboardOpenLeadsWithFilters({

        salesId:
            dashboardGetSelectedSalesId(),

        status:
            value
    });
}


// ============================================================
// RENDER SALES CARDS
// ============================================================
//
// UPDATE:
// ALL SALES CARD SUDAH DIHILANGKAN.
//
// Yang ditampilkan hanya Sales individual.
//
// ============================================================

function dashboardRenderSalesCards(
    leads
) {

    if (
        !dashboardIsAdmin()
    ) {

        return;
    }


    const container =
        dashboardFindSalesCardsContainer();


    if (!container) {

        console.warn(
            "FSI CRM: Dashboard Sales Cards container tidak ditemukan."
        );

        return;
    }


    const dashboardLeads =
        Array.isArray(
            leads
        )
            ? leads
            : [];


    const salesUsers =
        dashboardGetSalesUsers();


    // ========================================================
    // COUNT LEADS PER SALES
    // ========================================================

    const salesLeadCounts =
        {};


    dashboardLeads.forEach(
        lead => {

            const salesId =
                String(
                    lead?.sales_id ??
                    ""
                ).trim();


            if (!salesId) {
                return;
            }


            salesLeadCounts[salesId] =
                (
                    salesLeadCounts[salesId] ||
                    0
                ) + 1;
        }
    );


    // ========================================================
    // SELECTED SALES
    // ========================================================

    const selectedSalesId =
        dashboardGetSelectedSalesId();


    // ========================================================
    // FIND GRID
    // ========================================================

    let grid;


    if (
        container.classList.contains(
            "dashboard-sales-cards-grid"
        )
    ) {

        grid =
            container;

    } else {

        grid =
            container.querySelector(
                ".dashboard-sales-cards-grid"
            );


        if (!grid) {

            grid =
                document.createElement(
                    "div"
                );


            grid.className =
                "dashboard-sales-cards-grid";


            container.appendChild(
                grid
            );
        }
    }


    // ========================================================
    // CLEAR
    // ========================================================

    grid.innerHTML =
        "";


    // ========================================================
    // CREATE SALES CARD
    // ========================================================

    function createSalesCard({
        id,
        name,
        count
    }) {

        const card =
            document.createElement(
                "button"
            );


        card.type =
            "button";


        card.className =
            "dashboard-sales-card";


        card.dataset.salesId =
            id;


        card.dataset.salesName =
            name;


        // ====================================================
        // ACTIVE STATE
        // ====================================================

        if (
            String(
                selectedSalesId
            ) ===
            String(
                id
            )
        ) {

            card.classList.add(
                "active"
            );
        }


        const icon =
            "👤";


        const initial =
            dashboardGetSalesInitial(
                name
            );


        // ====================================================
        // HTML
        // ====================================================

        card.innerHTML =
            `
            <span
                class="dashboard-sales-card-icon"
                aria-hidden="true"
            >
                ${icon}
            </span>

            <span
                class="dashboard-sales-card-content"
            >

                <span
                    class="dashboard-sales-card-name"
                >
                    ${dashboardEscapeGreetingHTML(name)}
                </span>

                <span
                    class="dashboard-sales-card-count"
                >
                    ${Number(
                        count || 0
                    ).toLocaleString("id-ID")}

                    <span>
                        Lead${Number(
                            count || 0
                        ) === 1 ? "" : "s"}
                    </span>
                </span>

                <span
                    class="dashboard-sales-card-action"
                >
                    View customers →
                </span>

            </span>

            <span
                class="dashboard-sales-card-initial"
                aria-hidden="true"
            >
                ${dashboardEscapeGreetingHTML(
                    initial
                )}
            </span>
            `;


        // ====================================================
        // CLICK
        // ====================================================
        //
        // Tidak menjalankan updateDashboard().
        //
        // Langsung menuju Leads.
        //
        // ====================================================

        card.addEventListener(
            "click",
            function (event) {

                event.preventDefault();


                dashboardOpenSalesInLeads(
                    id
                );
            }
        );


        return card;
    }


    // ========================================================
    // INDIVIDUAL SALES
    // ========================================================

    salesUsers.forEach(
        sales => {

            const id =
                String(
                    sales?.id ??
                    ""
                ).trim();


            if (!id) {
                return;
            }


            const name =
                dashboardGetSalesDisplayName(
                    sales
                );


            const count =
                salesLeadCounts[id] ||
                0;


            const card =
                createSalesCard({

                    id,

                    name,

                    count

                });


            grid.appendChild(
                card
            );
        }
    );


    // ========================================================
    // EMPTY
    // ========================================================

    if (
        !salesUsers.length
    ) {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "dashboard-sales-empty";


        empty.textContent =
            "No active Sales users found.";


        grid.appendChild(
            empty
        );
    }


    // ========================================================
    // REFRESH ICON
    // ========================================================

    if (
        typeof window.refreshIcons ===
        "function"
    ) {

        window.refreshIcons();
    }


    console.log(
        "FSI CRM: Dashboard Sales Cards rendered:",
        {
            salesCount:
                salesUsers.length,

            totalLeads:
                dashboardLeads.length,

            selectedSalesId:
                selectedSalesId ||
                "NO SALES SELECTED"
        }
    );
}


// ============================================================
// SET SELECTED SALES
// ============================================================

function dashboardSetSelectedSales(
    salesId
) {

    if (
        !dashboardIsAdmin()
    ) {

        return;
    }


    const value =
        String(
            salesId ||
            ""
        ).trim();


    dashboardSelectedSalesIdState =
        value;


    // ========================================================
    // SELECT ELEMENTS
    // ========================================================

    const selectors = [

        "#salesFilter",

        "#dashboardSalesFilter"

    ];


    selectors.forEach(
        selector => {

            document
                .querySelectorAll(
                    selector
                )
                .forEach(
                    element => {

                        element.value =
                            value;
                    }
                );
        }
    );


    // ========================================================
    // ACTIVE CARD
    // ========================================================

    document
        .querySelectorAll(
            ".dashboard-sales-card"
        )
        .forEach(
            card => {

                const cardId =
                    String(
                        card.dataset.salesId ||
                        ""
                    ).trim();


                if (
                    cardId ===
                    value
                ) {

                    card.classList.add(
                        "active"
                    );

                } else {

                    card.classList.remove(
                        "active"
                    );
                }
            }
        );


    // ========================================================
    // URL STATE
    // ========================================================

    try {

        const url =
            new URL(
                window.location.href
            );


        if (value) {

            url.searchParams.set(
                "sales",
                value
            );

        } else {

            url.searchParams.delete(
                "sales"
            );
        }


        window.history.replaceState(
            {},
            "",
            url.toString()
        );

    } catch (error) {

        console.warn(
            "FSI CRM: gagal update URL Sales state:",
            error
        );
    }


    console.log(
        "FSI CRM: Dashboard Sales selected:",
        value ||
        "NO SALES SELECTED"
    );
}


// ============================================================
// GET SELECTED SALES ID
// ============================================================

function dashboardGetSelectedSalesId() {

    if (
        !dashboardIsAdmin()
    ) {

        return "";
    }


    // ========================================================
    // INTERNAL STATE FIRST
    // ========================================================

    if (
        dashboardSelectedSalesIdState
    ) {

        return String(
            dashboardSelectedSalesIdState
        ).trim();
    }


    // ========================================================
    // SELECT
    // ========================================================

    const selectors = [

        "#salesFilter",

        "#dashboardSalesFilter"

    ];


    for (
        const selector
        of selectors
    ) {

        const element =
            document.querySelector(
                selector
            );


        if (!element) {
            continue;
        }


        return String(
            element.value ||
            ""
        ).trim();
    }


    return "";
}


// ============================================================
// GET SELECTED SALES OBJECT
// ============================================================

function dashboardGetSelectedSales() {

    const selectedId =
        dashboardGetSelectedSalesId();


    if (!selectedId) {
        return null;
    }


    const salesUsers =
        dashboardGetSalesUsers();


    return (
        salesUsers.find(
            sales =>
                String(
                    sales?.id ||
                    ""
                ).trim() ===
                String(
                    selectedId
                ).trim()
        ) ||
        null
    );
}


// ============================================================
// LEGACY SALES LEAD FUNCTIONS
// ============================================================

function dashboardFormatSalesLeadDate(
    value
) {

    if (!value) {
        return "-";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(
            value
        );
    }


    return date.toLocaleDateString(
        "id-ID",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


// ============================================================
// STATUS CLASS
// ============================================================

function dashboardGetLeadStatusClass(
    status
) {

    const value =
        String(
            status || ""
        )
        .toLowerCase()
        .replace(
            /\s+/g,
            "-"
        )
        .replace(
            /\//g,
            "-"
        );


    return `
        dashboard-status-${value}
    `;
}


// ============================================================
// LEGACY CUSTOMER LIST
// ============================================================

function dashboardRenderSalesLeads(
    leads
) {

    const oldList =
        document.getElementById(
            "dashboardSalesLeadList"
        );


    if (oldList) {

        oldList.remove();
    }


    return;
}


// ============================================================
// LEGACY ROW RENDER
// ============================================================

function dashboardRenderSalesLeadRows(
    leads
) {

    return;
}


// ============================================================
// LEGACY SEARCH
// ============================================================

function dashboardFilterSalesLeadRows(
    leads,
    search
) {

    return;
}


// ============================================================
// OPEN CUSTOMER PROFILE
// ============================================================

async function dashboardOpenLeadProfile(
    lead
) {

    if (!lead) {
        return;
    }


    const leadId =
        lead?.id;


    if (!leadId) {

        console.warn(
            "FSI CRM: Lead ID tidak ditemukan."
        );

        return;
    }


    console.log(
        "FSI CRM: opening customer profile:",
        leadId
    );


    // ========================================================
    // CUSTOMER PROFILE
    // ========================================================

    if (
        typeof window.showCustomerProfile ===
        "function"
    ) {

        try {

            await window.showCustomerProfile(
                leadId
            );

            return;

        } catch (error) {

            console.warn(
                "FSI CRM: showCustomerProfile error:",
                error
            );
        }
    }


    // ========================================================
    // FALLBACK
    // ========================================================

    if (
        typeof window.showLeads ===
        "function"
    ) {

        try {

            await window.showLeads();

        } catch (error) {

            console.error(
                "FSI CRM: gagal membuka Leads:",
                error
            );
        }
    }


    document.dispatchEvent(
        new CustomEvent(
            "fsi:dashboard-open-lead",
            {
                detail: {
                    lead,
                    leadId
                }
            }
        )
    );
}


// ============================================================
// UPDATE DASHBOARD
// ============================================================

async function updateDashboard() {

    const profile =
        dashboardGetProfile();


    if (!profile) {

        console.warn(
            "FSI CRM: profile belum tersedia."
        );

        return;
    }


    // ========================================================
    // ROLE UI
    // ========================================================

    dashboardUpdateSalesSelectorVisibility();


    // ========================================================
    // GREETING
    // ========================================================

    dashboardUpdateGreeting(
        profile
    );


    // ========================================================
    // PREVENT DOUBLE LOADING
    // ========================================================

    if (
        dashboardLoading
    ) {

        return;
    }


    dashboardLoading =
        true;


    dashboardShowLoading();


    try {

        console.log(
            "FSI CRM Dashboard: loading leads..."
        );


        // ====================================================
        // LOAD LEADS
        // ====================================================

        const data =
            await dashboardFetchLeads();


        const rawDashboardData =
            Array.isArray(
                data
            )
                ? data
                : [];


        // ====================================================
        // ROLE
        // ====================================================

        const isAdmin =
            dashboardIsAdmin();


        const isSales =
            dashboardIsSales();


        // ====================================================
        // ADMIN SALES CARDS
        // ====================================================

        if (isAdmin) {

            dashboardRenderSalesCards(
                rawDashboardData
            );
        }


        // ====================================================
        // DATA SCOPE
        // ====================================================

        let scopedDashboardData =
            [
                ...rawDashboardData
            ];


        let selectedSalesId =
            "";


        if (isAdmin) {

            selectedSalesId =
                dashboardGetSelectedSalesId();


            if (selectedSalesId) {

                scopedDashboardData =
                    rawDashboardData.filter(
                        lead => {

                            return String(
                                lead?.sales_id ??
                                ""
                            ).trim() ===
                            String(
                                selectedSalesId
                            ).trim();
                        }
                    );
            }

        } else {

            selectedSalesId =
                "";
        }


        // ====================================================
        // GLOBAL DATA
        // ====================================================

        dashboardData =
            scopedDashboardData;


        window.FSIDashboard =
            window.FSIDashboard ||
            {};


        window.FSIDashboard.data =
            dashboardData;


        // ====================================================
        // STATUS PIPELINE
        // ====================================================

        const dashboardStatuses = [

            "New Customer",

            "First Contact",

            "Appointment",

            "Site Survey",

            "Quotation",

            "Deal / Closing",

            "No Deal"

        ];


        window.FSIDashboard.statuses =
            dashboardStatuses;


        // ====================================================
        // STATISTICS
        // ====================================================

        const stats =
            calculateDashboardStats(
                dashboardData
            );


        stats.total =
            dashboardData.length;


        // ====================================================
        // LEGACY
        // ====================================================

        if (
            typeof stats.new ===
            "undefined"
        ) {

            stats.new =
                Number(
                    stats.newCustomer ||
                    0
                );
        }


        if (
            typeof stats.interested ===
            "undefined"
        ) {

            stats.interested =
                Number(
                    stats.firstContact ||
                    0
                );
        }


        if (
            typeof stats.followUp ===
            "undefined"
        ) {

            stats.followUp =
                Number(
                    stats.appointment ||
                    0
                );
        }


        if (
            typeof stats.closing ===
            "undefined"
        ) {

            stats.closing =
                Number(
                    stats.dealClosing ||
                    0
                );
        }


        // ====================================================
        // SAVE STATS
        // ====================================================

        dashboardStats =
            stats;


        window.FSIDashboard.stats =
            stats;


        // ====================================================
        // RENDER STATS
        // ====================================================

        renderDashboardStats(
            stats
        );


        // ====================================================
        // RENDER PIPELINE
        // ====================================================

        renderDashboardPipeline(
            dashboardData
        );


        // ====================================================
        // RENDER RECENT ACTIVITY
        // ====================================================

        renderDashboardRecentLeads(
            dashboardData
        );


        // ====================================================
        // IMPORTANT
        // ====================================================
        //
        // Tidak ada customer list di Dashboard.
        //
        // Customer list berada di halaman Leads.
        //
        // ========================================================


        // ====================================================
        // STAT CARD INTERACTION
        // ====================================================

        dashboardBindStatCardClicks();


        // ====================================================
        // OPTIONAL CHART
        // ====================================================

        if (
            typeof window.renderDashboardCharts ===
            "function"
        ) {

            try {

                window.renderDashboardCharts(
                    dashboardData,
                    stats
                );

            } catch (error) {

                console.warn(
                    "FSI CRM: dashboard chart render error:",
                    error
                );
            }
        }


        // ====================================================
        // CLEAR ERROR
        // ====================================================

        const errorElement =
            document.getElementById(
                "dashboardError"
            );


        if (errorElement) {

            errorElement.textContent =
                "";

            errorElement.style.display =
                "none";
        }


        // ====================================================
        // COMPLETE
        // ====================================================

        dashboardInitialized =
            true;


        console.log(
            "FSI CRM Dashboard: update berhasil.",
            {
                total:
                    dashboardData.length,

                selectedSales:
                    selectedSalesId ||
                    "ALL AVAILABLE SALES"
            }
        );

    } catch (error) {

        console.error(
            "FSI CRM Dashboard: gagal mengambil data leads:",
            error
        );


        const message =
            typeof window.getSupabaseErrorMessage ===
            "function"

                ? window.getSupabaseErrorMessage(
                    error,
                    "Gagal memuat data Dashboard."
                )

                :
                (
                    error?.message ||
                    "Gagal memuat data Dashboard."
                );


        const errorElement =
            document.getElementById(
                "dashboardError"
            );


        if (errorElement) {

            errorElement.textContent =
                message;

            errorElement.style.display =
                "";
        }


        // ====================================================
        // EMPTY FALLBACK
        // ====================================================

        dashboardData =
            [];


        window.FSIDashboard =
            window.FSIDashboard ||
            {};


        window.FSIDashboard.data =
            [];


        const emptyStats =
            calculateDashboardStats(
                []
            );


        dashboardStats =
            emptyStats;


        window.FSIDashboard.stats =
            emptyStats;


        renderDashboardStats(
            emptyStats
        );


        renderDashboardPipeline(
            []
        );


        renderDashboardRecentLeads(
            []
        );


        if (
            typeof window.showToast ===
            "function"
        ) {

            window.showToast(
                message,
                "error"
            );
        }

    } finally {

        dashboardLoading =
            false;


        dashboardHideLoading();


        dashboardUpdateSalesSelectorVisibility();


        if (
            typeof window.refreshIcons ===
            "function"
        ) {

            window.refreshIcons();
        }
    }
}


// ============================================================
// DASHBOARD SALES FILTER CHANGE
// ============================================================

function dashboardBindSalesFilterChange() {

    if (
        dashboardSalesFilterBound
    ) {

        return;
    }


    dashboardSalesFilterBound =
        true;


    const selectors = [

        "#salesFilter",

        "#dashboardSalesFilter"

    ];


    document.addEventListener(
        "change",
        function (event) {

            const target =
                event.target;


            if (!target) {
                return;
            }


            const isSalesFilter =
                selectors.some(
                    selector =>
                        target.matches(
                            selector
                        )
                );


            if (!isSalesFilter) {
                return;
            }


            if (
                !dashboardIsAdmin()
            ) {

                return;
            }


            dashboardSelectedSalesIdState =
                String(
                    target.value ||
                    ""
                ).trim();


            updateDashboard();
        }
    );


    console.log(
        "FSI CRM: Sales filter binding ready."
    );
}


// ============================================================
// REFRESH DASHBOARD
// ============================================================

async function refreshDashboard() {

    if (
        dashboardLoading
    ) {

        return;
    }


    await updateDashboard();
}


// ============================================================
// QUICK ACTION -> LEADS
// ============================================================

async function dashboardOpenLeads() {

    dashboardOpenLeadsWithFilters({

        salesId:
            dashboardGetSelectedSalesId(),

        status:
            ""
    });
}


// ============================================================
// OPEN MANAGE SALES
// ============================================================

async function dashboardOpenSales() {

    if (
        !dashboardIsAdmin()
    ) {

        if (
            typeof window.showToast ===
            "function"
        ) {

            window.showToast(
                "Only Admin can manage Sales.",
                "warning"
            );
        }

        return;
    }


    await showSales();
}


// ============================================================
// STATE GETTERS
// ============================================================

function isDashboardInitialized() {

    return dashboardInitialized;
}


function isDashboardLoading() {

    return dashboardLoading;
}


function getDashboardData() {

    return dashboardData;
}


function getDashboardStats() {

    return dashboardStats;
}


// ============================================================
// VIEW ALL BUTTON
// ============================================================

function dashboardBindViewAllButton() {

    if (
        dashboardViewAllBound
    ) {

        return;
    }


    const buttons =
        document.querySelectorAll(
            'button[data-page="leads"]'
        );


    if (
        !buttons.length
    ) {

        return;
    }


    buttons.forEach(
        button => {

            if (
                button.dataset.dashboardViewAllBound ===
                "true"
            ) {

                return;
            }


            button.dataset.dashboardViewAllBound =
                "true";


            button.addEventListener(
                "click",
                async function (event) {

                    event.preventDefault();


                    try {

                        await dashboardOpenLeads();

                    } catch (error) {

                        console.error(
                            "FSI CRM: View All -> Leads error:",
                            error
                        );
                    }
                }
            );
        }
    );


    dashboardViewAllBound =
        true;


    console.log(
        "FSI CRM: View All button bound."
    );
}


// ============================================================
// LISTEN FOR LEAD CHANGES
// ============================================================

document.addEventListener(
    "fsi:lead-changed",
    function () {

        const page =
            dashboardFindPage(
                "dashboard"
            );


        if (!page) {
            return;
        }


        const isVisible =
            page.classList.contains(
                "active"
            ) &&
            !page.classList.contains(
                "hidden"
            );


        if (
            isVisible &&
            dashboardGetProfile()
        ) {

            updateDashboard();
        }
    }
);


// ============================================================
// PROFILE READY
// ============================================================

document.addEventListener(
    "fsi:profile-ready",
    function () {

        dashboardInitialized =
            false;


        dashboardData =
            [];


        dashboardStats =
            null;


        dashboardSelectedSalesIdState =
            "";


        // ====================================================
        // RESET SELECTORS
        // ====================================================

        const salesFilter =
            document.querySelector(
                "#salesFilter"
            );


        if (salesFilter) {

            salesFilter.value =
                "";
        }


        const dashboardSalesFilter =
            document.querySelector(
                "#dashboardSalesFilter"
            );


        if (dashboardSalesFilter) {

            dashboardSalesFilter.value =
                "";
        }


        // ====================================================
        // RESET URL
        // ====================================================

        try {

            const url =
                new URL(
                    window.location.href
                );


            url.searchParams.delete(
                "sales"
            );


            window.history.replaceState(
                {},
                "",
                url.toString()
            );

        } catch (error) {

            console.warn(
                "FSI CRM: gagal reset Sales URL state:",
                error
            );
        }


        dashboardUpdateSalesSelectorVisibility();


        if (
            typeof dashboardCloseStatPopup ===
            "function"
        ) {

            dashboardCloseStatPopup();
        }


        console.log(
            "FSI CRM Dashboard: profile ready."
        );
    }
);


// ============================================================
// APP READY
// ============================================================

document.addEventListener(
    "fsi:app-ready",
    function () {

        console.log(
            "FSI CRM Dashboard: app ready."
        );


        const profile =
            dashboardGetProfile();


        dashboardUpdateSalesSelectorVisibility();


        if (
            profile &&
            dashboardFindPage(
                "dashboard"
            )
        ) {

            setTimeout(
                function () {

                    const dashboardPage =
                        dashboardFindPage(
                            "dashboard"
                        );


                    if (
                        dashboardPage &&
                        dashboardPage.classList.contains(
                            "active"
                        )
                    ) {

                        dashboardUpdateSalesSelectorVisibility();

                        dashboardBindStatCardClicks();

                        updateDashboard();
                    }


                    dashboardBindViewAllButton();

                },
                100
            );

        } else {

            dashboardBindViewAllButton();


            setTimeout(
                function () {

                    dashboardUpdateSalesSelectorVisibility();

                    dashboardBindStatCardClicks();

                },
                300
            );
        }
    }
);


// ============================================================
// DOM READY
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        dashboardInitialized =
            false;


        dashboardData =
            [];


        dashboardStats =
            null;


        dashboardSelectedSalesIdState =
            "";


        // ====================================================
        // FSI DASHBOARD OBJECT
        // ====================================================

        window.FSIDashboard =
            window.FSIDashboard ||
            {};


        // ====================================================
        // STATUS
        // ====================================================

        window.FSIDashboard.statuses = [

            "New Customer",

            "First Contact",

            "Appointment",

            "Site Survey",

            "Quotation",

            "Deal / Closing",

            "No Deal"

        ];


        // ====================================================
        // ROLE UI
        // ====================================================

        dashboardUpdateSalesSelectorVisibility();


        // ====================================================
        // POPUP
        // ====================================================

        if (
            typeof dashboardEnsureStatPopupStyles ===
            "function"
        ) {

            dashboardEnsureStatPopupStyles();
        }


        // ====================================================
        // STAT CARD
        // ====================================================

        dashboardBindStatCardClicks();


        // ====================================================
        // VIEW ALL
        // ====================================================

        dashboardBindViewAllButton();


        // ====================================================
        // SALES FILTER
        // ====================================================

        dashboardBindSalesFilterChange();


        // ====================================================
        // DELAYED BIND
        // ====================================================

        setTimeout(
            function () {

                dashboardUpdateSalesSelectorVisibility();

                dashboardBindViewAllButton();

                dashboardBindStatCardClicks();

            },
            300
        );


        console.log(
            "FSI CRM dashboard.js loaded successfully."
        );
    }
);


// ============================================================
// GLOBAL EXPORTS
// ============================================================

window.showDashboard =
    showDashboard;


window.showLeads =
    showLeads;


window.showSales =
    showSales;


window.showCustomerProfile =
    showCustomerProfile;


window.hideAllPages =
    hideAllPages;


window.updateDashboard =
    updateDashboard;


window.refreshDashboard =
    refreshDashboard;


window.dashboardOpenLeads =
    dashboardOpenLeads;


window.dashboardOpenSales =
    dashboardOpenSales;


window.dashboardFindPage =
    dashboardFindPage;


window.dashboardShowPage =
    dashboardShowPage;


window.dashboardSetPageTitle =
    dashboardSetPageTitle;


window.dashboardSetActiveNav =
    dashboardSetActiveNav;


window.dashboardFetchLeads =
    dashboardFetchLeads;


window.calculateDashboardStats =
    calculateDashboardStats;


window.renderDashboardStats =
    renderDashboardStats;


window.renderDashboardPipeline =
    renderDashboardPipeline;


window.renderDashboardRecentLeads =
    renderDashboardRecentLeads;


window.dashboardFindPipelineContainer =
    dashboardFindPipelineContainer;


window.dashboardFindRecentLeadsContainer =
    dashboardFindRecentLeadsContainer;


window.dashboardGetProfile =
    dashboardGetProfile;


window.dashboardGetUser =
    dashboardGetUser;


window.dashboardIsAdmin =
    dashboardIsAdmin;


window.dashboardIsSales =
    dashboardIsSales;


window.isDashboardInitialized =
    isDashboardInitialized;


window.isDashboardLoading =
    isDashboardLoading;


window.getDashboardData =
    getDashboardData;


window.getDashboardStats =
    getDashboardStats;


window.dashboardBindViewAllButton =
    dashboardBindViewAllButton;


window.dashboardGetSelectedSalesId =
    dashboardGetSelectedSalesId;


window.dashboardBindSalesFilterChange =
    dashboardBindSalesFilterChange;


window.dashboardUpdateSalesSelectorVisibility =
    dashboardUpdateSalesSelectorVisibility;


window.dashboardUpdateGreeting =
    dashboardUpdateGreeting;


// ============================================================
// DASHBOARD -> LEADS FILTER FUNCTIONS
// ============================================================

window.dashboardOpenLeadsWithFilters =
    dashboardOpenLeadsWithFilters;


window.dashboardOpenSalesInLeads =
    dashboardOpenSalesInLeads;


window.dashboardOpenStatusInLeads =
    dashboardOpenStatusInLeads;


// ============================================================
// SALES CARDS
// ============================================================

window.dashboardRenderSalesCards =
    dashboardRenderSalesCards;


window.dashboardGetSalesDisplayName =
    dashboardGetSalesDisplayName;


window.dashboardGetSalesInitial =
    dashboardGetSalesInitial;


window.dashboardGetSalesUsers =
    dashboardGetSalesUsers;


window.dashboardSetSelectedSales =
    dashboardSetSelectedSales;


window.dashboardGetSelectedSales =
    dashboardGetSelectedSales;


// ============================================================
// SALES CUSTOMER LEADS - LEGACY EXPORTS
// ============================================================

window.dashboardRenderSalesLeads =
    dashboardRenderSalesLeads;


window.dashboardRenderSalesLeadRows =
    dashboardRenderSalesLeadRows;


window.dashboardFilterSalesLeadRows =
    dashboardFilterSalesLeadRows;


window.dashboardOpenLeadProfile =
    dashboardOpenLeadProfile;


// ============================================================
// STATISTIC POPUP
// ============================================================

window.dashboardOpenStatPopup =
    dashboardOpenStatPopup;


window.dashboardCloseStatPopup =
    dashboardCloseStatPopup;


window.dashboardBindStatCardClicks =
    dashboardBindStatCardClicks;


window.dashboardFilterDataForStat =
    dashboardFilterDataForStat;


// ============================================================
// FSI DASHBOARD NAMESPACE
// ============================================================

Object.assign(
    window.FSIDashboard,
    {

        showDashboard,

        showLeads,

        showSales,

        showCustomerProfile,

        hideAllPages,

        updateDashboard,

        refreshDashboard,

        dashboardOpenLeads,

        dashboardOpenSales,

        dashboardFindPage,

        dashboardShowPage,

        dashboardSetPageTitle,

        dashboardSetActiveNav,

        dashboardFetchLeads,

        calculateDashboardStats,

        renderDashboardStats,

        renderDashboardPipeline,

        renderDashboardRecentLeads,

        dashboardFindPipelineContainer,

        dashboardFindRecentLeadsContainer,

        dashboardGetProfile,

        dashboardGetUser,

        dashboardIsAdmin,

        dashboardIsSales,

        isDashboardInitialized,

        isDashboardLoading,

        getDashboardData,

        getDashboardStats,

        dashboardBindViewAllButton,

        dashboardGetSelectedSalesId,

        dashboardBindSalesFilterChange,

        dashboardUpdateSalesSelectorVisibility,

        dashboardUpdateGreeting,

        // ----------------------------------------------------
        // DASHBOARD -> LEADS
        // ----------------------------------------------------

        dashboardOpenLeadsWithFilters,

        dashboardOpenSalesInLeads,

        dashboardOpenStatusInLeads,

        // ----------------------------------------------------
        // SALES CARDS
        // ----------------------------------------------------

        dashboardRenderSalesCards,

        dashboardGetSalesDisplayName,

        dashboardGetSalesInitial,

        dashboardGetSalesUsers,

        dashboardSetSelectedSales,

        dashboardGetSelectedSales,

        // ----------------------------------------------------
        // CUSTOMER PROFILE
        // ----------------------------------------------------

        dashboardOpenLeadProfile,

        // ----------------------------------------------------
        // LEGACY CUSTOMER LIST
        // ----------------------------------------------------

        dashboardRenderSalesLeads,

        dashboardRenderSalesLeadRows,

        dashboardFilterSalesLeadRows,

        // ----------------------------------------------------
        // POPUP
        // ----------------------------------------------------

        dashboardOpenStatPopup,

        dashboardCloseStatPopup,

        dashboardBindStatCardClicks,

        dashboardFilterDataForStat,

        // ----------------------------------------------------
        // STATUS
        // ----------------------------------------------------

        statuses: [

            "New Customer",

            "First Contact",

            "Appointment",

            "Site Survey",

            "Quotation",

            "Deal / Closing",

            "No Deal"

        ]
    }
);


// ============================================================
// INITIAL STATE
// ============================================================

console.log(
    "FSI CRM: Dashboard module initialized."
);
