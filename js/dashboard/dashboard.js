// ============================================================
// FSI CRM - DASHBOARD MODULE
// ============================================================
//
// Fungsi utama:
// 1. Dashboard greeting
// 2. Load dashboard leads
// 3. Role-based dashboard scope
// 4. Admin Sales selector
// 5. Sales hanya melihat customer sendiri
// 6. Dashboard statistics
// 7. Dashboard pipeline
// 8. Recent activity
// 9. Dashboard navigation
// 10. Dashboard refresh
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
//
// Menampilkan sapaan otomatis berdasarkan waktu,
// nama user, dan role user.
//
// Contoh:
//
// Good Morning, Andi!
// Good Afternoon, Budi!
// Good Evening, Rist!
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
// BAGIAN INI SANGAT PENTING.
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
// Dashboard Sales tetap menampilkan data miliknya sendiri.
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
    //
    // Ini untuk mengatasi HTML lama yang mungkin masih
    // memiliki teks tersebut walaupun ID/class berbeda.
    //
    // Hanya dijalankan untuk Sales.
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
        // DATA SCOPE
        // ====================================================
        //
        // SALES:
        // dashboardFetchLeads() sudah membatasi:
        //
        // sales_id = profile.id
        //
        // ADMIN:
        // dashboardFetchLeads() mengambil semua leads.
        //
        // Admin kemudian bisa memilih Sales tertentu.
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

            /*
             * SALES:
             *
             * Jangan pernah mengambil Sales selector.
             * Jangan pernah menerapkan selectedSalesId.
             *
             * Data sudah dibatasi oleh dashboardFetchLeads().
             */
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
        // STATUS PIPELINE BARU
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
        // TOTAL HARUS SESUAI DATA YANG SUDAH DI-SCOPE
        // ====================================================

        stats.total =
            dashboardData.length;


        // ====================================================
        // LEGACY COMPATIBILITY
        // ====================================================
        //
        // Beberapa bagian lama Dashboard mungkin masih
        // membaca:
        //
        // stats.new
        // stats.interested
        // stats.followUp
        // stats.closing
        //
        // Jangan gunakan field lama sebagai sumber utama.
        // Statistik utama tetap berasal dari
        // calculateDashboardStats().
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
        // ROLE UI DIKEMBALIKAN KE KONDISI YANG BENAR
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
// Jika user adalah Sales:
// return ""
//
// Jika Admin:
// membaca Sales yang dipilih.
//
// Kosong = ALL SALES.
// ============================================================

function dashboardGetSelectedSalesId() {

    // ========================================================
    // SALES TIDAK BOLEH MEMILIKI SALES FILTER
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
//
// Hanya Admin.
//
// Sales tidak melakukan apa pun ketika ada event filter.
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
//
// Hanya Admin.
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
        // STATUS PIPELINE BARU
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

        dashboardOpenStatPopup,

        dashboardCloseStatPopup,

        dashboardBindStatCardClicks,

        dashboardFilterDataForStat,

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
