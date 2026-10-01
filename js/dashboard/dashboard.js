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
// 6. Sales hanya melihat customer sendiri
// 7. Dashboard statistics
// 8. Dashboard pipeline
// 9. Recent activity
// 10. Dashboard navigation
// 11. Dashboard refresh
//
// ROLE RULE:
//
// ADMIN
// - Bisa melihat semua Sales
// - Bisa memilih ALL SALES
// - Bisa memilih Sales tertentu
// - Bisa melihat seluruh customer
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
// ESCAPE GREETING HTML
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
//
// ADMIN:
// - Sales selector tampil
// - ALL SALES tampil
// - Sales cards tampil
//
// SALES:
// - Sales selector disembunyikan
// - ALL SALES disembunyikan
// - daftar Sales disembunyikan
// - pesan "Select a Sales..." disembunyikan
//
// ============================================================

function dashboardUpdateSalesSelectorVisibility() {

    const isAdmin =
        dashboardIsAdmin();


    // ========================================================
    // ELEMENT SALES SELECTOR YANG DIKENAL
    // ========================================================

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


    // ========================================================
    // SEMBUNYIKAN / TAMPILKAN
    // ========================================================

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
    // CARI PESAN "SELECT A SALES..."
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
            name ||
            ""
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
            parts[1][0]
        )

    ).toUpperCase();
}


// ============================================================
// DASHBOARD SALES ROLE CHECK
// ============================================================
//
// Digunakan supaya Dashboard tidak salah membaca Admin sebagai
// Sales.
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
//
// Jika status kosong/null, tetap dianggap valid untuk Dashboard
// agar Sales tidak hilang hanya karena kolom status belum diisi.
//
// Jika status jelas "Inactive", user tidak ditampilkan.
// ============================================================

function dashboardIsSalesActive(
    sales
) {

    if (!sales) {
        return false;
    }


    const status =
        String(
            sales.status ??
            ""
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
//
// Sumber utama:
// window.salesUsersData
//
// Fallback:
// window.getActiveSales()
//
// Tidak melakukan query database baru.
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
    // FILTER SALES
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
    // SORT BY NAME
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
// RENDER DASHBOARD SALES CARDS
// ============================================================
//
// ADMIN:
// - ALL SALES
// - I Gde Ristyawan
// - I Wayan Pradnya
// - Jihad Chakir
// - Killian
// - Presty Paulina
// - Tanau
//
// Setiap card menghitung lead berdasarkan:
// lead.sales_id === sales_users.id
//
// ============================================================

function dashboardRenderSalesCards(
    leads
) {

    // ========================================================
    // HANYA ADMIN
    // ========================================================

    if (
        !dashboardIsAdmin()
    ) {

        return;
    }


    // ========================================================
    // CARI CONTAINER
    // ========================================================

    const containers =
        [];


    const selectors = [

        "#dashboardSalesCards",

        "#dashboardSalesCardsDynamic"

    ];


    selectors.forEach(
        selector => {

            document
                .querySelectorAll(
                    selector
                )
                .forEach(
                    element => {

                        if (
                            element &&
                            !containers.includes(
                                element
                            )
                        ) {

                            containers.push(
                                element
                            );
                        }

                    }
                );
        }
    );


    if (
        !containers.length
    ) {

        console.warn(
            "FSI CRM: Dashboard Sales Cards container tidak ditemukan."
        );

        return;
    }


    // ========================================================
    // DATA LEADS
    // ========================================================

    const dashboardLeads =
        Array.isArray(leads)
            ? leads
            : [];


    // ========================================================
    // SALES USERS
    // ========================================================

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


        // ====================================================
        // ICON
        // ====================================================

        const icon =
            isAll
                ? "👥"
                : "👤";


        // ====================================================
        // INITIAL
        // ====================================================

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

            </span>

            ${
                isAll
                    ? ""
                    : `
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

                // --------------------------------------------
                // ALL SALES
                // --------------------------------------------

                if (isAll) {

                    dashboardSetSelectedSales(
                        ""
                    );

                }

                // --------------------------------------------
                // SALES TERTENTU
                // --------------------------------------------

                else {

                    dashboardSetSelectedSales(
                        id
                    );
                }


                // --------------------------------------------
                // REFRESH DASHBOARD
                // --------------------------------------------

                await updateDashboard();

            }
        );


        return card;
    }


    // ========================================================
    // RENDER KE CONTAINER
    // ========================================================

    containers.forEach(
        container => {

            // ------------------------------------------------
            // CARI / BUAT GRID
            // ------------------------------------------------

            let grid =
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


            // ------------------------------------------------
            // CLEAR CARD LAMA
            // ------------------------------------------------

            grid.innerHTML =
                "";


            // ------------------------------------------------
            // ALL SALES
            // ------------------------------------------------

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


            // ------------------------------------------------
            // SALES INDIVIDUAL
            // ------------------------------------------------

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


            // ------------------------------------------------
            // EMPTY
            // ------------------------------------------------

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

        }
    );


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
    // UPDATE SELECT ELEMENT
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
    // UPDATE CARD ACTIVE
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


    console.log(
        "FSI CRM: Dashboard Sales selected:",
        value ||
        "ALL SALES"
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
    // ROLE-BASED UI
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

    if (dashboardLoading) {
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
        // RENDER SALES CARDS
        // ====================================================
        //
        // Penting:
        // Sales cards harus menggunakan rawDashboardData,
        // bukan dashboardData yang sudah di-filter.
        //
        // Dengan demikian:
        //
        // ALL SALES = semua lead
        // Sales A = semua lead Sales A
        // Sales B = semua lead Sales B
        //
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
                                lead?.sales_id ?? ""
                            ).trim() ===
                            String(
                                selectedSalesId
                            ).trim();

                        }
                    );
            }

        } else {

            // ------------------------------------------------
            // SALES
            // ------------------------------------------------
            //
            // Data sudah dibatasi oleh RLS / query.
            //
            // Sales tidak boleh memiliki Sales selector.
            //

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
        // SIMPAN DATA GLOBAL
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
        // HITUNG STATISTIK
        // ====================================================

        const stats =
            calculateDashboardStats(
                dashboardData
            );


        // ====================================================
        // TOTAL
        // ====================================================

        stats.total =
            dashboardData.length;


        // ====================================================
        // LEGACY COMPATIBILITY
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
        // SIMPAN STATS GLOBAL
        // ====================================================

        dashboardStats =
            stats;


        window.FSIDashboard.stats =
            stats;


        // ====================================================
        // RENDER STATISTICS
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
        // STAT CARD INTERACTION
        // ====================================================

        dashboardBindStatCardClicks();


        // ====================================================
        // OPTIONAL CHART CALLBACK
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
        // HILANGKAN ERROR
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
        // DASHBOARD SELESAI
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

                : (
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
        // EMPTY DASHBOARD FALLBACK
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
// GET SELECTED SALES ID
// ============================================================
//
// KHUSUS ADMIN.
//
// Kosong = ALL SALES.
// ============================================================

function dashboardGetSelectedSalesId() {

    // ========================================================
    // SALES TIDAK BOLEH MEMILIKI FILTER
    // ========================================================

    if (
        !dashboardIsAdmin()
    ) {

        return "";
    }


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
            element.value || ""
        ).trim();
    }


    return "";
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


            // =================================================
            // HANYA ADMIN
            // =================================================

            if (
                !dashboardIsAdmin()
            ) {

                return;
            }


            // =================================================
            // REFRESH DASHBOARD
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
        // UPDATE ROLE UI
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


        // ====================================================
        // ROLE UI
        // ====================================================

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
        // ROLE-BASED SALES UI
        // ====================================================

        dashboardUpdateSalesSelectorVisibility();


        // ====================================================
        // POPUP STYLES
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
// SALES CARDS EXPORTS
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


// ============================================================
// STATISTIC POPUP EXPORTS
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

        // -----------------------------------------------
        // SALES CARDS
        // -----------------------------------------------

        dashboardRenderSalesCards,

        dashboardGetSalesDisplayName,

        dashboardGetSalesInitial,

        dashboardGetSalesUsers,

        dashboardSetSelectedSales,

        // -----------------------------------------------
        // POPUP
        // -----------------------------------------------

        dashboardOpenStatPopup,

        dashboardCloseStatPopup,

        dashboardBindStatCardClicks,

        dashboardFilterDataForStat,

        // -----------------------------------------------
        // STATUS
        // -----------------------------------------------

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
