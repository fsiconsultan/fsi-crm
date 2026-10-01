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
// 6. Klik Sales -> tampilkan seluruh lead Sales
// 7. Customer search
// 8. Customer -> Customer Profile
// 9. Sales hanya melihat customer sendiri
// 10. Dashboard statistics
// 11. Dashboard pipeline
// 12. Recent activity
// 13. Dashboard navigation
// 14. Dashboard refresh
//
// ROLE RULE:
//
// ADMIN
// - Bisa melihat semua Sales
// - Bisa memilih ALL SALES
// - Bisa memilih Sales tertentu
// - Bisa melihat seluruh customer
// - Klik Sales -> melihat seluruh lead Sales
//
// SALES
// - Tidak melihat Sales selector
// - Tidak melihat ALL SALES
// - Tidak melihat Sales lain
// - Hanya melihat lead miliknya sendiri
//
// IMPORTANT:
// Jangan mengubah RLS Supabase hanya untuk kebutuhan Dashboard.
// ============================================================


// ============================================================
// DASHBOARD SALES SELECTED STATE
// ============================================================
//
// Digunakan sebagai fallback apabila tidak ada
// select #salesFilter / #dashboardSalesFilter.
//
// ============================================================

let dashboardSelectedSalesIdState = "";


// ============================================================
// DASHBOARD GREETING
// ============================================================

function dashboardUpdateGreeting(profile) {

    if (!profile) {
        return;
    }


    // ========================================================
    // AMBIL NAMA USER
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
    // AMBIL ROLE
    // ========================================================

    const role =
        String(
            profile?.role ||
            ""
        ).trim();


    // ========================================================
    // TENTUKAN WAKTU
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
    // CARI ELEMENT GREETING
    // ========================================================

    let greetingElement =
        document.getElementById(
            "dashboardGreeting"
        );


    // ========================================================
    // BUAT ELEMENT JIKA BELUM ADA
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
    // RENDER GREETING
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


    // ========================================================
    // ROLE DATASET
    // ========================================================

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
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
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
                .querySelectorAll(selector)
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
    // SALES:
    // HIDE "SELECT A SALES..."
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
                        element.textContent || ""
                    )
                    .replace(/\s+/g, " ")
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
// DASHBOARD SALES DISPLAY NAME
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
// DASHBOARD SALES INITIAL
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
// DASHBOARD SALES ROLE CHECK
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
        .replace(/[\s-]+/g, "_");


    return [

        "sales",

        "salesperson",

        "secretary",

        "digital_marketing"

    ].includes(role);
}


// ============================================================
// DASHBOARD SALES ACTIVE CHECK
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
// GET DASHBOARD SALES USERS
// ============================================================

function dashboardGetSalesUsers() {

    let users = [];


    // ========================================================
    // SUMBER UTAMA
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
                Array.isArray(activeSales)
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
// FIND SALES CARD RENDER CONTAINER
// ============================================================
//
// Prioritas:
//
// 1. #dashboardSalesCardsDynamic
// 2. #dashboardSalesCards
//
// Tujuannya mencegah duplicate Sales Cards.
//
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
    // DYNAMIC ADALAH PRIORITAS
    // ========================================================

    if (dynamic) {

        // ----------------------------------------------------
        // Jika #dashboardSalesCards adalah container lain
        // dan TIDAK membungkus dynamic, sembunyikan.
        // ----------------------------------------------------

        if (
            normal &&
            normal !== dynamic &&
            !normal.contains(dynamic)
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
    // FALLBACK NORMAL
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
    // FALLBACK SECTION
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
// RENDER DASHBOARD SALES CARDS
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
        Array.isArray(leads)
            ? leads
            : [];


    const salesUsers =
        dashboardGetSalesUsers();


    // ========================================================
    // HITUNG LEAD PER SALES
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
    // JIKA CONTAINER SENDIRI ADALAH GRID
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
    // CLEAR OLD CARDS
    // ========================================================

    grid.innerHTML =
        "";


    // ========================================================
    // CREATE CARD
    // ========================================================

    function createSalesCard({
        id,
        name,
        count,
        isAll = false
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
        // ACTIVE
        // ====================================================

        if (
            (
                isAll &&
                !selectedSalesId
            ) ||
            (
                !isAll &&
                String(
                    selectedSalesId
                ) ===
                String(
                    id
                )
            )
        ) {

            card.classList.add(
                "active"
            );
        }


        const icon =
            isAll
                ? "👥"
                : "👤";


        const initial =
            dashboardGetSalesInitial(
                name
            );


        // ====================================================
        // RENDER
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
                    ${Number(count || 0).toLocaleString("id-ID")}

                    <span>
                        Lead${Number(count || 0) === 1 ? "" : "s"}
                    </span>
                </span>

                <span
                    class="dashboard-sales-card-action"
                >
                    ${isAll ? "View all customers →" : "View customers →"}
                </span>

            </span>

            ${
                isAll
                    ? ""
                    :
                    `
                    <span
                        class="dashboard-sales-card-initial"
                        aria-hidden="true"
                    >
                        ${dashboardEscapeGreetingHTML(initial)}
                    </span>
                    `
            }
            `;


        // ====================================================
        // CLICK
        // ====================================================

        card.addEventListener(
            "click",
            async function () {

                if (isAll) {

                    dashboardSetSelectedSales(
                        ""
                    );

                } else {

                    dashboardSetSelectedSales(
                        id
                    );
                }


                await updateDashboard();

            }
        );


        return card;
    }


    // ========================================================
    // ALL SALES
    // ========================================================

    const allCard =
        createSalesCard({

            id: "",

            name: "ALL SALES",

            count:
                dashboardLeads.length,

            isAll: true

        });


    grid.appendChild(
        allCard
    );


    // ========================================================
    // SALES INDIVIDUAL
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

                    count,

                    isAll: false

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
                "ALL SALES",

            salesUsers:
                salesUsers.map(
                    sales => ({

                        id:
                            sales?.id,

                        name:
                            dashboardGetSalesDisplayName(
                                sales
                            ),

                        role:
                            sales?.role,

                        status:
                            sales?.status,

                        leads:
                            salesLeadCounts[
                                String(
                                    sales?.id
                                )
                            ] || 0

                    })
                )
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


    // ========================================================
    // SAVE INTERNAL STATE
    // ========================================================

    dashboardSelectedSalesIdState =
        value;


    // ========================================================
    // UPDATE SELECT ELEMENT
    // ========================================================

    const selectors = [

        "#salesFilter",

        "#dashboardSalesFilter"

    ];


    selectors.forEach(
        selector => {

            document
                .querySelectorAll(selector)
                .forEach(
                    element => {

                        element.value =
                            value;

                    }
                );
        }
    );


    // ========================================================
    // UPDATE CARD ACTIVE STATE
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
                    cardId === value
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
        "ALL SALES"
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
    // SELECT ELEMENT
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


    // ========================================================
    // INTERNAL STATE FALLBACK
    // ========================================================

    return String(
        dashboardSelectedSalesIdState ||
        ""
    ).trim();
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
// DASHBOARD SALES LEAD DATE
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
// DASHBOARD LEAD STATUS CLASS
// ============================================================

function dashboardGetLeadStatusClass(
    status
) {

    const value =
        String(
            status || ""
        )
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/\//g, "-");


    return `
        dashboard-status-${value}
    `;
}


// ============================================================
// RENDER SALES CUSTOMER LEADS
// ============================================================
//
// Jika Admin memilih Sales:
//
// Dashboard:
//   Overview
//   Pipeline
//   Recent Activity
//
// kemudian:
//
//   CUSTOMER LEADS
//   ├── Search
//   ├── Customer 1
//   ├── Customer 2
//   ├── Customer 3
//   └── dst.
//
// ============================================================

function dashboardRenderSalesLeads(
    leads
) {

    // ========================================================
    // REMOVE OLD LIST
    // ========================================================

    const oldList =
        document.getElementById(
            "dashboardSalesLeadList"
        );


    if (oldList) {

        oldList.remove();
    }


    // ========================================================
    // ONLY ADMIN
    // ========================================================

    if (
        !dashboardIsAdmin()
    ) {

        return;
    }


    // ========================================================
    // CHECK SELECTED SALES
    // ========================================================

    const selectedSalesId =
        dashboardGetSelectedSalesId();


    // ========================================================
    // ALL SALES
    // ========================================================

    if (!selectedSalesId) {

        return;
    }


    const selectedSales =
        dashboardGetSelectedSales();


    if (!selectedSales) {

        console.warn(
            "FSI CRM: selected Sales tidak ditemukan:",
            selectedSalesId
        );

        return;
    }


    const salesName =
        dashboardGetSalesDisplayName(
            selectedSales
        );


    const list =
        Array.isArray(leads)
            ? leads
            : [];


    // ========================================================
    // FIND SALES SECTION
    // ========================================================

    const salesSection =
        document.getElementById(
            "dashboardSalesSection"
        );


    if (!salesSection) {

        console.warn(
            "FSI CRM: #dashboardSalesSection tidak ditemukan."
        );

        return;
    }


    // ========================================================
    // CREATE SECTION
    // ========================================================

    const wrapper =
        document.createElement(
            "section"
        );


    wrapper.id =
        "dashboardSalesLeadList";


    wrapper.className =
        "dashboard-sales-lead-list";


    // ========================================================
    // HEADER
    // ========================================================

    const header =
        document.createElement(
            "div"
        );


    header.className =
        "dashboard-sales-lead-header";


    header.innerHTML =
        `
        <div>

            <span
                class="dashboard-section-eyebrow"
            >
                CUSTOMER LEADS
            </span>

            <h2
                class="dashboard-section-title"
            >
                ${dashboardEscapeGreetingHTML(salesName)}
            </h2>

            <p
                class="dashboard-section-description"
            >
                ${list.length.toLocaleString("id-ID")}
                customer${list.length === 1 ? "" : "s"}
                assigned to this Sales.
            </p>

        </div>

        <button
            type="button"
            class="dashboard-sales-back-button"
            id="dashboardSalesBackButton"
        >
            ← All Sales
        </button>
        `;


    wrapper.appendChild(
        header
    );


    // ========================================================
    // SEARCH
    // ========================================================

    const searchWrapper =
        document.createElement(
            "div"
        );


    searchWrapper.className =
        "dashboard-sales-lead-search";


    searchWrapper.innerHTML =
        `
        <span
            class="dashboard-sales-search-icon"
            aria-hidden="true"
        >
            🔍
        </span>

        <input
            type="search"
            id="dashboardSalesLeadSearch"
            placeholder="Search customer, phone, business..."
            autocomplete="off"
        />
        `;


    wrapper.appendChild(
        searchWrapper
    );


    // ========================================================
    // TABLE
    // ========================================================

    const tableWrapper =
        document.createElement(
            "div"
        );


    tableWrapper.className =
        "dashboard-sales-lead-table-wrapper";


    const table =
        document.createElement(
            "table"
        );


    table.className =
        "dashboard-sales-lead-table";


    table.innerHTML =
        `
        <thead>

            <tr>

                <th>
                    Customer
                </th>

                <th>
                    Business
                </th>

                <th>
                    Location
                </th>

                <th>
                    Status
                </th>

                <th>
                    Follow Up
                </th>

                <th>
                    Action
                </th>

            </tr>

        </thead>

        <tbody
            id="dashboardSalesLeadTableBody"
        ></tbody>
        `;


    tableWrapper.appendChild(
        table
    );


    wrapper.appendChild(
        tableWrapper
    );


    // ========================================================
    // INSERT AFTER SALES SECTION
    // ========================================================

    salesSection.insertAdjacentElement(
        "afterend",
        wrapper
    );


    // ========================================================
    // EMPTY
    // ========================================================

    if (!list.length) {

        tableWrapper.innerHTML =
            `
            <div
                class="dashboard-sales-lead-empty"
            >

                <div
                    class="dashboard-sales-lead-empty-icon"
                >
                    👥
                </div>

                <h3>
                    No customers found
                </h3>

                <p>
                    This Sales does not have
                    any assigned leads yet.
                </p>

            </div>
            `;

    } else {

        // ====================================================
        // RENDER ROWS
        // ====================================================

        dashboardRenderSalesLeadRows(
            list
        );
    }


    // ========================================================
    // SEARCH
    // ========================================================

    const searchInput =
        document.getElementById(
            "dashboardSalesLeadSearch"
        );


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            function () {

                dashboardFilterSalesLeadRows(
                    list,
                    searchInput.value
                );
            }
        );
    }


    // ========================================================
    // BACK
    // ========================================================

    const backButton =
        document.getElementById(
            "dashboardSalesBackButton"
        );


    if (backButton) {

        backButton.addEventListener(
            "click",
            async function () {

                dashboardSetSelectedSales(
                    ""
                );


                await updateDashboard();

            }
        );
    }
}


// ============================================================
// RENDER SALES LEAD ROWS
// ============================================================

function dashboardRenderSalesLeadRows(
    leads
) {

    const tbody =
        document.getElementById(
            "dashboardSalesLeadTableBody"
        );


    if (!tbody) {
        return;
    }


    tbody.innerHTML =
        "";


    leads.forEach(
        lead => {

            const row =
                document.createElement(
                    "tr"
                );


            const customerName =
                String(
                    lead?.customer_name ||
                    "Unnamed Customer"
                ).trim();


            const business =
                String(
                    lead?.business ||
                    "-"
                ).trim();


            const location =
                String(
                    lead?.location ||
                    "-"
                ).trim();


            const status =
                String(
                    lead?.status ||
                    "New Customer"
                ).trim();


            const followUp =
                dashboardFormatSalesLeadDate(
                    lead?.follow_up_date
                );


            const phone =
                String(
                    lead?.phone ||
                    ""
                ).trim();


            const email =
                String(
                    lead?.email ||
                    ""
                ).trim();


            const contact =
                phone ||
                email ||
                "No contact";


            row.dataset.leadId =
                String(
                    lead?.id ||
                    ""
                );


            row.className =
                "dashboard-sales-lead-row";


            row.innerHTML =
                `
                <td>

                    <div
                        class="dashboard-customer-cell"
                    >

                        <div
                            class="dashboard-customer-avatar"
                        >
                            ${dashboardGetSalesInitial(customerName)}
                        </div>

                        <div>

                            <strong>
                                ${dashboardEscapeGreetingHTML(customerName)}
                            </strong>

                            <small>
                                ${dashboardEscapeGreetingHTML(contact)}
                            </small>

                        </div>

                    </div>

                </td>


                <td>
                    ${dashboardEscapeGreetingHTML(business)}
                </td>


                <td>
                    ${dashboardEscapeGreetingHTML(location)}
                </td>


                <td>

                    <span
                        class="
                            dashboard-lead-status
                            ${dashboardGetLeadStatusClass(status)}
                        "
                    >
                        ${dashboardEscapeGreetingHTML(status)}
                    </span>

                </td>


                <td>
                    ${dashboardEscapeGreetingHTML(followUp)}
                </td>


                <td>

                    <button
                        type="button"
                        class="dashboard-lead-view-button"
                    >
                        View →
                    </button>

                </td>
                `;


            // =================================================
            // ROW CLICK
            // =================================================

            row.addEventListener(
                "click",
                function (event) {

                    if (
                        event.target.closest(
                            "button"
                        )
                    ) {

                        return;
                    }


                    dashboardOpenLeadProfile(
                        lead
                    );
                }
            );


            // =================================================
            // VIEW BUTTON
            // =================================================

            const viewButton =
                row.querySelector(
                    ".dashboard-lead-view-button"
                );


            if (viewButton) {

                viewButton.addEventListener(
                    "click",
                    function (event) {

                        event.preventDefault();

                        event.stopPropagation();


                        dashboardOpenLeadProfile(
                            lead
                        );
                    }
                );
            }


            tbody.appendChild(
                row
            );
        }
    );
}


// ============================================================
// FILTER SALES LEADS
// ============================================================

function dashboardFilterSalesLeadRows(
    leads,
    search
) {

    const query =
        String(
            search || ""
        )
        .trim()
        .toLowerCase();


    if (!query) {

        dashboardRenderSalesLeadRows(
            leads
        );

        return;
    }


    const filtered =
        leads.filter(
            lead => {

                const searchable = [

                    lead?.customer_name,

                    lead?.phone,

                    lead?.email,

                    lead?.business,

                    lead?.location,

                    lead?.status

                ]
                .map(
                    value =>
                        String(
                            value || ""
                        ).toLowerCase()
                )
                .join(" ");


                return searchable.includes(
                    query
                );
            }
        );


    dashboardRenderSalesLeadRows(
        filtered
    );
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
    // FALLBACK KE LEADS
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


    // ========================================================
    // DISPATCH EVENT
    // ========================================================

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
            "FSI CRM: tidak bisa update dashboard karena profile belum tersedia."
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
            Array.isArray(data)
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

            // ==================================================
            // SALES
            // ==================================================

            selectedSalesId =
                "";
        }


        // ====================================================
        // LOG DATA SCOPE
        // ====================================================

        console.log(
            "FSI CRM Dashboard: data scope:",
            {
                totalLoaded:
                    rawDashboardData.length,

                totalDashboard:
                    scopedDashboardData.length,

                role:
                    profile.role,

                isAdmin,

                isSales,

                selectedSalesId:
                    selectedSalesId ||
                    "ALL OWN DATA"
            }
        );


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
        // STATUS
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
        // RENDER CUSTOMER LEADS
        // ====================================================
        //
        // Hanya muncul ketika Admin memilih Sales tertentu.
        //
        // ALL SALES:
        // list dihapus.
        //
        // SALES:
        // selector tidak ada.
        //
        // ====================================================

        dashboardRenderSalesLeads(
            dashboardData
        );


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
            stats
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


        dashboardRenderSalesLeads(
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

        // ====================================================
        // FINISH LOADING
        // ====================================================

        dashboardLoading =
            false;


        dashboardHideLoading();


        // ====================================================
        // ROLE UI
        // ====================================================

        dashboardUpdateSalesSelectorVisibility();


        // ====================================================
        // REFRESH ICON
        // ====================================================

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


            // =================================================
            // SYNC INTERNAL STATE
            // =================================================

            dashboardSelectedSalesIdState =
                String(
                    target.value ||
                    ""
                ).trim();


            // =================================================
            // UPDATE
            // =================================================

            updateDashboard();

        }
    );


    console.log(
        "FSI CRM: Dashboard Sales filter binding ready."
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
// DASHBOARD QUICK ACTIONS
// ============================================================

async function dashboardOpenLeads() {

    await showLeads();
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
// DASHBOARD STATE GETTERS
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

let dashboardViewAllBound =
    false;


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

                        await showLeads();

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
            page.classList.contains("active") &&
            !page.classList.contains("hidden");


        if (
            isVisible &&
            dashboardGetProfile()
        ) {

            updateDashboard();
        }
    }
);


// ============================================================
// LISTEN FOR PROFILE READY
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
        // RESET SALES SELECTOR
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
                "FSI CRM: gagal reset Sales URL state.",
                error
            );
        }


        // ====================================================
        // ROLE UI
        // ====================================================

        dashboardUpdateSalesSelectorVisibility();


        // ====================================================
        // CLOSE POPUP
        // ====================================================

        dashboardCloseStatPopup();


        console.log(
            "FSI CRM Dashboard: profile ready."
        );
    }
);


// ============================================================
// LISTEN FOR APP READY
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
        // STATUS PIPELINE
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

        dashboardEnsureStatPopupStyles();


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
// SALES CUSTOMER LEADS
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
        // SALES CARDS
        // ----------------------------------------------------

        dashboardRenderSalesCards,

        dashboardGetSalesDisplayName,

        dashboardGetSalesInitial,

        dashboardGetSalesUsers,

        dashboardSetSelectedSales,

        dashboardGetSelectedSales,

        // ----------------------------------------------------
        // CUSTOMER LEADS
        // ----------------------------------------------------

        dashboardRenderSalesLeads,

        dashboardRenderSalesLeadRows,

        dashboardFilterSalesLeadRows,

        dashboardOpenLeadProfile,

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
