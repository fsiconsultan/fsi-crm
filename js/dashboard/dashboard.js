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
//
// Jika nama tidak tersedia:
//
// Welcome, Guest!
//
// Greeting juga memiliki animasi continuous:
// - Icon bergerak lembut
// - Text memiliki soft glow
// - Nama memiliki efek glow
// - Light sweep berjalan berkala
// - Animasi tetap berjalan selama Dashboard terbuka
// ============================================================

function dashboardUpdateGreeting(profile) {

    if (!profile) {
        return;
    }


    /*
     * ========================================================
     * AMBIL NAMA USER
     * ========================================================
     *
     * Mendukung beberapa kemungkinan nama field
     * tanpa mengganggu struktur profile yang sekarang.
     */
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


    /*
     * ========================================================
     * AMBIL ROLE
     * ========================================================
     */
    const role =
        String(
            profile?.role ||
            ""
        ).trim();


    /*
     * ========================================================
     * TENTUKAN WAKTU
     * ========================================================
     *
     * 05:00 - 11:59 = Good Morning
     * 12:00 - 16:59 = Good Afternoon
     * 17:00 - 04:59 = Good Evening
     */
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


    /*
     * ========================================================
     * BUAT / AMBIL ELEMENT GREETING
     * ========================================================
     */
    let greetingElement =
        document.getElementById(
            "dashboardGreeting"
        );


    /*
     * Jika element belum ada,
     * buat otomatis.
     */
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


        /*
         * Cari halaman Dashboard.
         */
        const dashboardPage =
            dashboardFindPage(
                "dashboard"
            );


        if (dashboardPage) {

            /*
             * Masukkan greeting
             * sebagai element pertama.
             */
            dashboardPage.prepend(
                greetingElement
            );
        }
    }


    /*
     * ========================================================
     * BUAT TEXT GREETING
     * ========================================================
     *
     * Struktur dibuat terpisah agar CSS animation
     * dapat bekerja dengan halus.
     */
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
                ${displayName}
            </strong>!
        </span>
        `;


    /*
     * ========================================================
     * ROLE INFO
     * ========================================================
     *
     * Tidak mengubah tampilan utama.
     * Hanya menyimpan informasi role di dataset
     * jika nanti dibutuhkan.
     */
    greetingElement.dataset.role =
        role ||
        "Guest";


    greetingElement.dataset.name =
        displayName;


    /*
     * ========================================================
     * ANIMATION CLASS
     * ========================================================
     */
    greetingElement.classList.add(
        "dashboard-greeting-animated"
    );


    /*
     * ========================================================
     * REFRESH ANIMATION
     * ========================================================
     *
     * Ketika Dashboard melakukan update,
     * greeting tetap memiliki animasi continuous.
     *
     * Class refresh hanya digunakan untuk
     * entrance animation singkat.
     */
    greetingElement.classList.remove(
        "dashboard-greeting-refresh"
    );


    /*
     * Force browser reflow.
     *
     * Ini membuat animation restart dengan benar
     * ketika greeting diperbarui.
     */
    void greetingElement.offsetWidth;


    greetingElement.classList.add(
        "dashboard-greeting-refresh"
    );


    /*
     * ========================================================
     * LOG
     * ========================================================
     */
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
    // UPDATE GREETING
    // ========================================================

    dashboardUpdateGreeting(
        profile
    );


    if (dashboardLoading) {
        return;
    }

    dashboardLoading = true;

    dashboardShowLoading();

    try {

        console.log(
            "FSI CRM Dashboard: loading leads..."
        );


        /*
         * ========================================================
         * LOAD LEADS
         * ========================================================
         */
        const data =
            await dashboardFetchLeads();


        const rawDashboardData =
            Array.isArray(data)
                ? data
                : [];


        /*
         * ========================================================
         * FILTER DATA DASHBOARD BERDASARKAN SALES
         * ========================================================
         *
         * Sales biasa:
         * dashboardFetchLeads() sudah membatasi
         * berdasarkan sales_id miliknya.
         *
         * Admin:
         *
         * All Sales
         *      -> semua leads
         *
         * Sales A
         *      -> hanya leads Sales A
         *
         * Sales B
         *      -> hanya leads Sales B
         *
         * Sales C
         *      -> hanya leads Sales C
         */
        let scopedDashboardData =
            [...rawDashboardData];


        const isAdmin =
            dashboardIsAdmin();


        const selectedSalesId =
            dashboardGetSelectedSalesId();


        if (
            isAdmin &&
            selectedSalesId
        ) {

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


        console.log(
            "FSI CRM Dashboard: data scope:",
            {
                totalLoaded:
                    rawDashboardData.length,

                totalDashboard:
                    scopedDashboardData.length,

                role:
                    profile.role,

                selectedSalesId:
                    selectedSalesId || "ALL"
            }
        );


        /*
         * Simpan data global.
         */
        dashboardData =
            scopedDashboardData;


        window.FSIDashboard.data =
            dashboardData;


        /*
         * ========================================================
         * STATUS PIPELINE BARU
         * ========================================================
         *
         * Tetap dipertahankan agar tidak menghilangkan
         * fungsi Dashboard yang sudah berjalan.
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
         * ========================================================
         * HITUNG STATISTIK
         * ========================================================
         */
        const stats =
            calculateDashboardStats(
                dashboardData
            );


        /*
         * ========================================================
         * PASTIKAN STATISTIK UTAMA BENAR-BENAR
         * MENGGUNAKAN DATA SALES YANG SUDAH TERFILTER
         * ========================================================
         */
        stats.total =
            dashboardData.length;


        if (
            typeof dashboardNormalizeStatus ===
            "function"
        ) {

            stats.new =
                dashboardData.filter(
                    lead =>
                        dashboardNormalizeStatus(
                            lead?.status
                        ) === "New"
                ).length;


            stats.interested =
                dashboardData.filter(
                    lead =>
                        dashboardNormalizeStatus(
                            lead?.status
                        ) === "Interested"
                ).length;


            stats.followUp =
                dashboardData.filter(
                    lead =>
                        dashboardNormalizeStatus(
                            lead?.status
                        ) === "Follow Up"
                ).length;


            /*
             * Closing dihitung berdasarkan STATUS Closing,
             * bukan hanya karena field tanggal closing terisi.
             */
            stats.closing =
                dashboardData.filter(
                    lead =>
                        dashboardNormalizeStatus(
                            lead?.status
                        ) === "Closing"
                ).length;
        }


        dashboardStats =
            stats;


        window.FSIDashboard.stats =
            stats;


        /*
         * ========================================================
         * RENDER KARTU STATISTIK
         * ========================================================
         */
        renderDashboardStats(
            stats
        );


        /*
         * ========================================================
         * RENDER PIPELINE
         * ========================================================
         */
        renderDashboardPipeline(
            dashboardData
        );


        /*
         * ========================================================
         * RENDER RECENT LEADS
         * ========================================================
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
         * ========================================================
         * HILANGKAN PESAN ERROR
         * ========================================================
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
// GET SELECTED SALES ID
// ============================================================
//
// Fungsi ini khusus membaca Sales yang sedang dipilih
// pada Dashboard.
//
// Dashboard menggunakan:
// #salesFilter
//
// Filter Leads tetap menggunakan:
// #filter-sales
//
// Keduanya sengaja dipisahkan agar tidak saling mengganggu.
//
// Jika value kosong:
// berarti All Sales.
// ============================================================

function dashboardGetSelectedSalesId() {

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
// REFRESH DASHBOARD
// ============================================================
//
// Ketika Admin mengganti Sales pada Dashboard:
//
// All Sales
// Sales A
// Sales B
// Sales C
//
// Dashboard langsung menghitung ulang.
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


            /*
             * Hanya Admin yang menggunakan
             * filter Sales Dashboard.
             */
            if (
                !dashboardIsAdmin()
            ) {
                return;
            }


            /*
             * Refresh Dashboard
             * dengan Sales yang baru dipilih.
             */
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
         * Bind Sales filter Dashboard.
         */
        dashboardBindSalesFilterChange();


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


window.dashboardGetSelectedSalesId =
    dashboardGetSelectedSalesId;


window.dashboardBindSalesFilterChange =
    dashboardBindSalesFilterChange;


/*
 * Greeting export.
 */
window.dashboardUpdateGreeting =
    dashboardUpdateGreeting;


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

        dashboardGetSelectedSalesId,

        dashboardBindSalesFilterChange,

        /*
         * Greeting.
         */
        dashboardUpdateGreeting,

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
