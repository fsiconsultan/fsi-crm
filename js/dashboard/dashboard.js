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

    if (dashboardLoading) {
        return;
    }

    dashboardLoading = true;
    dashboardShowLoading();

    try {
        console.log(
            "FSI CRM Dashboard: loading leads..."
        );

        const data =
            await dashboardFetchLeads();

        console.log(
            "FSI CRM Dashboard: total leads:",
            data.length
        );

        /*
         * Simpan data global.
         */
        dashboardData =
            Array.isArray(data)
                ? data
                : [];

        window.FSIDashboard.data =
            dashboardData;

        /*
         * ========================================================
         * STATUS PIPELINE BARU
         * ========================================================
         *
         * Dashboard menggunakan 7 status utama:
         *
         * 1. New
         * 2. First Contact
         * 3. First Meeting / Appointment / Site Survey
         * 4. Quotation
         * 5. Second Appointment
         * 6. Deal
         * 7. No Deal
         *
         * Status sebenarnya dihitung oleh
         * calculateDashboardStats() di dashboard-stats.js.
         *
         * dashboard.js hanya meneruskan data.
         */
        if (!window.FSIDashboard.statuses) {
            window.FSIDashboard.statuses = [
                "New",
                "First Contact",
                "First Meeting / Appointment / Site Survey",
                "Quotation",
                "Second Appointment",
                "Deal",
                "No Deal"
            ];
        }

        /*
         * Hitung statistik.
         */
        const stats =
            calculateDashboardStats(
                dashboardData
            );

        dashboardStats =
            stats;

        window.FSIDashboard.stats =
            stats;

        /*
         * Render kartu statistik.
         */
        renderDashboardStats(
            stats
        );

        /*
         * Render pipeline.
         */
        renderDashboardPipeline(
            dashboardData
        );

        /*
         * Render recent leads.
         */
        renderDashboardRecentLeads(
            dashboardData
        );

        /*
         * Pastikan kartu interactive
         * setelah seluruh Dashboard selesai dirender.
         */
        dashboardBindStatCardClicks();

        /*
         * Callback tambahan jika ada.
         */
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

        /*
         * Hilangkan pesan error.
         */
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

        /*
         * Tetap tampilkan 0 jika query gagal,
         * supaya dashboard tidak terlihat rusak.
         */
        dashboardData =
            [];

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

        if (
            typeof window.refreshIcons ===
            "function"
        ) {
            window.refreshIcons();
        }
    }
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

async function dashboardOpenSales() {

    if (!dashboardIsAdmin()) {

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
//
// index.html terbaru:
//
// <button
//     type="button"
//     class="btn-outline"
//     data-page="leads"
// >
//     <span>View All</span>
//     ...
// </button>
//
// Dashboard tetap mendukung navigation.js.
// Binding ini hanya menjadi fallback.
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

                    /*
                     * Jika navigation.js sudah bekerja,
                     * event tetap aman.
                     */
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

        /*
         * Jika user sedang berada di Dashboard,
         * langsung refresh angka.
         */
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

        /*
         * Tutup popup jika user profile berubah.
         */
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

        /*
         * Jangan langsung query jika profile belum siap.
         * Auth module akan memanggil showDashboard()
         * setelah profile berhasil dimuat.
         */
        const profile =
            dashboardGetProfile();

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

        /*
         * Status Dashboard.
         */
        window.FSIDashboard =
            window.FSIDashboard ||
            {};

        window.FSIDashboard.statuses = [
            "New",
            "First Contact",
            "First Meeting / Appointment / Site Survey",
            "Quotation",
            "Second Appointment",
            "Deal",
            "No Deal"
        ];

        /*
         * Siapkan style popup.
         */
        dashboardEnsureStatPopupStyles();

        /*
         * Bind kartu statistik.
         */
        dashboardBindStatCardClicks();

        /*
         * Bind tombol View All.
         */
        dashboardBindViewAllButton();

        /*
         * Jika navigation/auth selesai setelah DOM ready,
         * coba bind sekali lagi sebentar kemudian.
         */
        setTimeout(
            function () {

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


/*
 * Statistic popup exports.
 */
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
        dashboardOpenStatPopup,
        dashboardCloseStatPopup,
        dashboardBindStatCardClicks,
        dashboardFilterDataForStat,

        /*
         * Status pipeline baru.
         */
        statuses: [
            "New",
            "First Contact",
            "First Meeting / Appointment / Site Survey",
            "Quotation",
            "Second Appointment",
            "Deal",
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
