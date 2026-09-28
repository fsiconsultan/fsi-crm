```js
// ============================================================
// DASHBOARD GREETING
// ============================================================
//
// Tambahan:
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
// ============================================================

function dashboardUpdateGreeting(profile) {

    if (!profile) {
        return;
    }


    /*
     * ========================================================
     * AMBIL NAMA USER
     * ========================================================
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


    /*
     * ========================================================
     * BUAT TEXT GREETING
     * ========================================================
     */
    greetingElement.innerHTML =
        `
        <span
            style="
                font-size: 28px;
                line-height: 1;
            "
        >
            ${icon}
        </span>

        <span>
            ${greeting}, ${displayName}!
        </span>
        `;


    /*
     * ========================================================
     * ROLE INFO
     * ========================================================
     */
    greetingElement.dataset.role =
        role ||
        "Guest";


    greetingElement.dataset.name =
        displayName;


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
// DASHBOARD NUMBER COUNT-UP ANIMATION
// ============================================================
//
// Animasi angka statistik Dashboard.
//
// Contoh:
//
// 0 → 25
// 0 → 120
// 0 → 8
//
// Fungsi ini dibuat terpisah agar tidak mengubah
// perhitungan statistik yang sudah ada.
// ============================================================

function dashboardAnimateNumber(
    element,
    targetValue,
    duration = 800
) {

    if (!element) {
        return;
    }


    /*
     * Pastikan target berupa angka.
     */
    const target =
        Number(
            String(
                targetValue ?? 0
            ).replace(
                /[^0-9.-]/g,
                ""
            )
        );


    if (
        !Number.isFinite(target)
    ) {

        return;
    }


    /*
     * Batalkan animasi sebelumnya
     * jika element sedang dianimasikan.
     */
    if (
        element._fsiCountUpFrame
    ) {

        cancelAnimationFrame(
            element._fsiCountUpFrame
        );
    }


    const startTime =
        performance.now();


    const startValue =
        Number(
            element.dataset.countValue ||
            0
        );


    const difference =
        target -
        startValue;


    /*
     * Simpan target terakhir.
     */
    element.dataset.countValue =
        String(target);


    /*
     * Jika user mengaktifkan
     * reduced motion, langsung tampilkan angka.
     */
    const reduceMotion =
        window.matchMedia &&
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;


    if (reduceMotion) {

        element.textContent =
            target.toLocaleString(
                "en-US"
            );

        return;
    }


    /*
     * Jika tidak ada perubahan,
     * tidak perlu animasi ulang.
     */
    if (
        difference === 0
    ) {

        element.textContent =
            target.toLocaleString(
                "en-US"
            );

        return;
    }


    /*
     * Easing agar gerakan angka
     * terasa lebih natural.
     */
    function easeOutCubic(
        progress
    ) {

        return 1 -
            Math.pow(
                1 - progress,
                3
            );
    }


    function animate(
        currentTime
    ) {

        const elapsed =
            currentTime -
            startTime;


        const progress =
            Math.min(
                elapsed /
                duration,
                1
            );


        const easedProgress =
            easeOutCubic(
                progress
            );


        const currentValue =
            startValue +
            (
                difference *
                easedProgress
            );


        element.textContent =
            Math.round(
                currentValue
            ).toLocaleString(
                "en-US"
            );


        if (
            progress < 1
        ) {

            element._fsiCountUpFrame =
                requestAnimationFrame(
                    animate
                );

        } else {

            element.textContent =
                target.toLocaleString(
                    "en-US"
                );


            element._fsiCountUpFrame =
                null;
        }
    }


    element._fsiCountUpFrame =
        requestAnimationFrame(
            animate
        );
}


// ============================================================
// ANIMATE DASHBOARD STAT NUMBERS
// ============================================================
//
// Fungsi ini mencari angka pada kartu statistik
// setelah renderDashboardStats() selesai.
//
// Tidak mengubah HTML render statistik.
// ============================================================

function dashboardAnimateStatNumbers(
    stats
) {

    if (!stats) {
        return;
    }


    const statContainer =
        document.querySelector(
            ".stats-grid"
        );


    if (!statContainer) {

        return;
    }


    /*
     * Cari semua angka statistik.
     */
    const statNumbers =
        statContainer.querySelectorAll(
            ".stat-details strong"
        );


    if (
        !statNumbers.length
    ) {

        return;
    }


    /*
     * Ambil angka dari stats berdasarkan
     * urutan kartu yang sudah dirender.
     *
     * Urutan normal:
     *
     * 1. Total
     * 2. New
     * 3. Interested
     * 4. Follow Up
     * 5. Closing
     */
    const values = [

        Number(
            stats.total || 0
        ),

        Number(
            stats.new || 0
        ),

        Number(
            stats.interested || 0
        ),

        Number(
            stats.followUp || 0
        ),

        Number(
            stats.closing || 0
        )

    ];


    statNumbers.forEach(
        (
            element,
            index
        ) => {

            const value =
                values[index];


            if (
                typeof value !==
                "number"
            ) {

                return;
            }


            /*
             * Delay kecil mengikuti
             * animasi kartu Dashboard.
             */
            setTimeout(
                function () {

                    dashboardAnimateNumber(
                        element,
                        value,
                        850
                    );

                },
                index * 90
            );
        }
    );
}


// ============================================================
// DASHBOARD ELEMENT ENTRANCE
// ============================================================
//
// Memastikan element yang baru dirender mendapatkan
// class animasi yang sudah disiapkan di dashboard.css.
//
// CSS animation tetap menjadi sumber utama animasi.
// Fungsi ini hanya membantu ketika data dirender ulang.
// ============================================================

function dashboardAnimateRenderedContent() {

    /*
     * ========================================================
     * STAT CARDS
     * ========================================================
     */
    const statCards =
        document.querySelectorAll(
            ".stats-grid .stat-card"
        );


    statCards.forEach(
        (
            card,
            index
        ) => {

            card.style.animationDelay =
                `${index * 70}ms`;
        }
    );


    /*
     * ========================================================
     * PIPELINE ITEMS
     * ========================================================
     */
    const pipelineItems =
        document.querySelectorAll(
            ".pipeline-item"
        );


    pipelineItems.forEach(
        (
            item,
            index
        ) => {

            item.style.animationDelay =
                `${index * 60}ms`;
        }
    );


    /*
     * ========================================================
     * RECENT LEADS
     * ========================================================
     */
    const recentItems =
        document.querySelectorAll(
            ".recent-lead-item"
        );


    recentItems.forEach(
        (
            item,
            index
        ) => {

            item.style.animationDelay =
                `${index * 55}ms`;
        }
    );


    /*
     * ========================================================
     * PROFILE PIPELINE
     * ========================================================
     */
    const dateItems =
        document.querySelectorAll(
            ".pipeline-date-item"
        );


    dateItems.forEach(
        (
            item,
            index
        ) => {

            item.style.animationDelay =
                `${index * 60}ms`;
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
    // GREETING
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
         * ANIMASI ANGKA STATISTIK
         * ========================================================
         */
        dashboardAnimateStatNumbers(
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
         * ========================================================
         * ANIMASI CONTENT DASHBOARD
         * ========================================================
         */
        dashboardAnimateRenderedContent();


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


        /*
         * Animasi angka juga tetap dijalankan
         * ketika hasil kosong.
         */
        dashboardAnimateStatNumbers(
            emptyStats
        );


        renderDashboardPipeline(
            []
        );


        renderDashboardRecentLeads(
            []
        );


        dashboardAnimateRenderedContent();


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
 * Number animation exports.
 */
window.dashboardAnimateNumber =
    dashboardAnimateNumber;


window.dashboardAnimateStatNumbers =
    dashboardAnimateStatNumbers;


window.dashboardAnimateRenderedContent =
    dashboardAnimateRenderedContent;


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

        /*
         * Dashboard animation.
         */
        dashboardAnimateNumber,

        dashboardAnimateStatNumbers,

        dashboardAnimateRenderedContent,

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
```
