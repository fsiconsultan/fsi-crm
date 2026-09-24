/* =========================================================
   FSI CRM - SALES DASHBOARD
   ---------------------------------------------------------
   Main controller untuk Sales Dashboard.

   Tugas:
   - Membuka Sales Dashboard
   - Memilih Sales
   - Memuat data Sales
   - Menghitung statistik
   - Menampilkan pipeline
   - Menampilkan leads
   - Search
   - Filter
   - Refresh dashboard
   - Menangani navigasi Sales Dashboard

   Admin only.
   ========================================================= */


/* =========================================================
   SALES DASHBOARD CONFIG
   ========================================================= */

const SALES_DASHBOARD_CONFIG = {

    viewId: "view-sales-dashboard",

    leadsContainerId:
        "sales-dashboard-leads-container",

    pipelineContainerId:
        "sales-dashboard-pipeline-container",

    salesMenuId:
        "sales-dashboard-menu-list",

    statsContainerId:
        "sales-dashboard-stats"

};


/* =========================================================
   GET VIEW
   ========================================================= */

function getSalesDashboardView() {

    return document.getElementById(
        SALES_DASHBOARD_CONFIG.viewId
    );
}


/* =========================================================
   GET SELECTED SALES
   ========================================================= */

window.getSelectedSalesDashboardSales =
    function () {

        if (
            typeof window.getSalesDashboardState !==
            "function"
        ) {
            return null;
        }

        const state =
            window.getSalesDashboardState();

        return state?.selectedSales || null;
    };


/* =========================================================
   CHECK ADMIN
   ========================================================= */

window.canOpenSalesDashboard =
    function () {

        /*
         * currentProfile digunakan oleh auth.js
         * pada CRM utama.
         */

        if (
            typeof window.currentProfile !==
            "undefined" &&
            window.currentProfile
        ) {

            return (
                window.currentProfile.role ===
                "Admin"
            );
        }


        /*
         * Fallback jika currentProfile tersedia
         * sebagai variable global biasa.
         */

        if (
            typeof currentProfile !==
            "undefined" &&
            currentProfile
        ) {

            return (
                currentProfile.role ===
                "Admin"
            );
        }


        /*
         * Jangan langsung membuka dashboard
         * jika profile belum tersedia.
         */

        return false;
    };


/* =========================================================
   SHOW SALES DASHBOARD VIEW
   ========================================================= */

window.showSalesDashboard =
    function () {

        const view =
            getSalesDashboardView();

        if (!view) {

            console.warn(
                "Sales Dashboard view belum tersedia di index.html."
            );

            return;
        }


        /*
         * Jika navigation utama memiliki fungsi
         * showPage / navigateToPage, gunakan yang tersedia.
         */

        if (
            typeof window.showPage ===
            "function"
        ) {

            try {

                window.showPage(
                    "sales-dashboard"
                );

            } catch (error) {

                console.warn(
                    "showPage tidak dapat digunakan:",
                    error
                );
            }
        }


        /*
         * Pastikan view aktif.
         */

        document
            .querySelectorAll(
                ".crm-page"
            )
            .forEach(
                function (page) {

                    page.classList.remove(
                        "active"
                    );

                }
            );

        view.classList.add(
            "active"
        );


        /*
         * Scroll ke atas.
         */

        window.scrollTo(
            {
                top: 0,
                behavior: "smooth"
            }
        );
    };


/* =========================================================
   HIDE SALES DASHBOARD
   ========================================================= */

window.hideSalesDashboard =
    function () {

        const view =
            getSalesDashboardView();

        if (!view) {
            return;
        }

        view.classList.remove(
            "active"
        );
    };


/* =========================================================
   LOAD SALES MENU
   ---------------------------------------------------------
   Membuat daftar:
   Sales A
   Sales B
   Sales C
   dst.
   ========================================================= */

window.loadSalesDashboardMenu =
    async function () {

        const container =
            document.getElementById(
                SALES_DASHBOARD_CONFIG.salesMenuId
            );

        if (!container) {
            return;
        }


        /*
         * Pastikan Admin.
         */

        if (
            !window.canOpenSalesDashboard()
        ) {

            container.innerHTML = "";

            return;
        }


        /*
         * Loading.
         */

        container.innerHTML = `
            <div class="sales-dashboard-menu-loading">
                Loading Sales...
            </div>
        `;


        try {

            const salesList =
                await window.loadSalesDashboardSales();


            if (
                !Array.isArray(
                    salesList
                ) ||
                !salesList.length
            ) {

                container.innerHTML = `
                    <div class="sales-dashboard-menu-empty">
                        Belum ada Sales.
                    </div>
                `;

                return;
            }


            /*
             * Render Sales.
             */

            container.innerHTML =
                salesList.map(
                    function (sales) {

                        const salesId =
                            sales?.id || "";

                        const salesName =
                            getSalesDashboardSalesName(
                                sales
                            );

                        return `
                            <button
                                type="button"
                                class="sales-dashboard-menu-item"
                                data-sales-dashboard-id="${escapeSalesDashboardMainHtml(
                                    salesId
                                )}"
                            >

                                <span class="sales-dashboard-menu-item-icon">
                                    <i data-lucide="user"></i>
                                </span>

                                <span class="sales-dashboard-menu-item-content">

                                    <span class="sales-dashboard-menu-item-name">
                                        ${escapeSalesDashboardMainHtml(
                                            salesName
                                        )}
                                    </span>

                                    <span class="sales-dashboard-menu-item-role">
                                        Sales Dashboard
                                    </span>

                                </span>

                                <i
                                    data-lucide="chevron-right"
                                    class="sales-dashboard-menu-item-arrow"
                                ></i>

                            </button>
                        `;
                    }
                ).join("");


            refreshSalesDashboardMainIcons();


        } catch (error) {

            console.error(
                "Sales Dashboard menu error:",
                error
            );

            container.innerHTML = `
                <div class="sales-dashboard-menu-error">
                    Gagal memuat Sales.
                </div>
            `;
        }
    };


/* =========================================================
   GET SALES NAME
   --------------------------------------------------------- */

function getSalesDashboardSalesName(
    sales
) {

    if (!sales) {
        return "Sales";
    }


    return (
        sales.name ||
        sales.full_name ||
        sales.fullname ||
        sales.username ||
        sales.email ||
        "Sales"
    );
}


/* =========================================================
   OPEN SELECTED SALES DASHBOARD
   ========================================================= */

window.openSalesDashboard =
    async function (
        salesId
    ) {

        if (!salesId) {

            console.warn(
                "Sales Dashboard: Sales ID kosong."
            );

            return;
        }


        /*
         * Admin check.
         */

        if (
            !window.canOpenSalesDashboard()
        ) {

            console.warn(
                "Sales Dashboard hanya dapat dibuka oleh Admin."
            );

            return;
        }


        /*
         * Tampilkan halaman terlebih dahulu.
         */

        window.showSalesDashboard();


        /*
         * Tampilkan loading.
         */

        renderSalesDashboardLoading();


        try {

            /*
             * Ambil Sales + Leads.
             */

            const result =
                await window.loadSalesDashboard(
                    salesId
                );


            if (!result?.sales) {

                throw new Error(
                    "Data Sales tidak ditemukan."
                );
            }


            /*
             * Update statistik.
             */

            window.updateSalesDashboardStats(
                result.leads || []
            );


            /*
             * Render header Sales.
             */

            renderSalesDashboardHeader(
                result.sales
            );


            /*
             * Render statistics.
             */

            renderSalesDashboardStats();


            /*
             * Render pipeline.
             */

            renderSalesDashboardPipelineMain();


            /*
             * Render leads.
             */

            renderSalesDashboardLeadsMain();


            /*
             * Hide loading.
             */

            hideSalesDashboardLoading();


            /*
             * Refresh icons.
             */

            refreshSalesDashboardMainIcons();


        } catch (error) {

            console.error(
                "Sales Dashboard error:",
                error
            );

            renderSalesDashboardError(
                error?.message ||
                "Gagal memuat Sales Dashboard."
            );
        }
    };


/* =========================================================
   RENDER LOADING
   ========================================================= */

function renderSalesDashboardLoading() {

    const view =
        getSalesDashboardView();

    if (!view) {
        return;
    }


    let loading =
        view.querySelector(
            ".sales-dashboard-loading"
        );


    if (!loading) {

        loading =
            document.createElement(
                "div"
            );

        loading.className =
            "sales-dashboard-loading";

        loading.innerHTML = `
            <div class="sales-dashboard-loading-spinner">
                <i data-lucide="loader-2"></i>
            </div>

            <div class="sales-dashboard-loading-text">
                Loading Sales Dashboard...
            </div>
        `;

        view.prepend(
            loading
        );
    }


    loading.style.display =
        "flex";


    refreshSalesDashboardMainIcons();
}


/* =========================================================
   HIDE LOADING
   ========================================================= */

function hideSalesDashboardLoading() {

    const view =
        getSalesDashboardView();

    if (!view) {
        return;
    }


    const loading =
        view.querySelector(
            ".sales-dashboard-loading"
        );

    if (loading) {

        loading.style.display =
            "none";
    }
}


/* =========================================================
   RENDER ERROR
   ========================================================= */

function renderSalesDashboardError(
    message
) {

    const view =
        getSalesDashboardView();

    if (!view) {
        return;
    }


    hideSalesDashboardLoading();


    let errorBox =
        view.querySelector(
            ".sales-dashboard-error"
        );


    if (!errorBox) {

        errorBox =
            document.createElement(
                "div"
            );

        errorBox.className =
            "sales-dashboard-error";

        view.appendChild(
            errorBox
        );
    }


    errorBox.innerHTML = `
        <div class="sales-dashboard-error-icon">
            <i data-lucide="alert-circle"></i>
        </div>

        <div class="sales-dashboard-error-content">

            <div class="sales-dashboard-error-title">
                Gagal Memuat Dashboard
            </div>

            <div class="sales-dashboard-error-message">
                ${escapeSalesDashboardMainHtml(
                    message
                )}
            </div>

        </div>

        <button
            type="button"
            class="sales-dashboard-action-btn"
            data-sales-dashboard-action="retry"
        >
            <i data-lucide="refresh-cw"></i>
            Retry
        </button>
    `;


    errorBox.style.display =
        "flex";


    refreshSalesDashboardMainIcons();
}


/* =========================================================
   RENDER SALES HEADER
   ========================================================= */

function renderSalesDashboardHeader(
    sales
) {

    const view =
        getSalesDashboardView();

    if (!view) {
        return;
    }


    const name =
        getSalesDashboardSalesName(
            sales
        );


    const nameElements =
        view.querySelectorAll(
            "[data-sales-dashboard-name]"
        );


    nameElements.forEach(
        function (element) {

            element.textContent =
                name;
        }
    );


    const emailElements =
        view.querySelectorAll(
            "[data-sales-dashboard-email]"
        );


    emailElements.forEach(
        function (element) {

            element.textContent =
                sales?.email ||
                "";
        }
    );


    const avatarElements =
        view.querySelectorAll(
            "[data-sales-dashboard-avatar]"
        );


    avatarElements.forEach(
        function (element) {

            element.textContent =
                getSalesDashboardInitials(
                    name
                );
        }
    );
}


/* =========================================================
   RENDER STATISTICS
   ========================================================= */

function renderSalesDashboardStats() {

    const stats =
        window.getSalesDashboardStats();


    const statMap = {

        total: stats.total,

        new: stats.new,

        first_contact:
            stats.first_contact,

        first_meeting:
            stats.first_meeting,

        quotation:
            stats.quotation,

        second_appointment:
            stats.second_appointment,

        deal:
            stats.deal,

        no_deal:
            stats.no_deal

    };


    /*
     * Mendukung dua jenis selector:
     *
     * data-sales-stat="deal"
     *
     * atau
     *
     * id="salesStatDeal"
     */

    Object.keys(
        statMap
    ).forEach(
        function (key) {

            const value =
                statMap[key];


            const elements =
                document.querySelectorAll(
                    `[data-sales-stat="${key}"]`
                );


            elements.forEach(
                function (element) {

                    element.textContent =
                        value;
                }
            );
        }
    );


    /*
     * Conversion rate.
     */

    const dealRate =
        window.getSalesDashboardDealRate();


    document
        .querySelectorAll(
            "[data-sales-deal-rate]"
        )
        .forEach(
            function (element) {

                element.textContent =
                    `${dealRate.toFixed(1)}%`;
            }
        );


    /*
     * Active leads.
     */

    const activeLeads =
        window.getSalesDashboardActiveLeads();


    document
        .querySelectorAll(
            "[data-sales-active-leads]"
        )
        .forEach(
            function (element) {

                element.textContent =
                    activeLeads;
            }
        );
}


/* =========================================================
   RENDER PIPELINE
   ========================================================= */

function renderSalesDashboardPipelineMain() {

    const container =
        document.getElementById(
            SALES_DASHBOARD_CONFIG.pipelineContainerId
        );

    if (!container) {
        return;
    }


    const state =
        window.getSalesDashboardState();


    window.renderSalesDashboardPipeline(
        container,
        state?.leads || []
    );
}


/* =========================================================
   RENDER LEADS
   ========================================================= */

function renderSalesDashboardLeadsMain() {

    const container =
        document.getElementById(
            SALES_DASHBOARD_CONFIG.leadsContainerId
        );

    if (!container) {
        return;
    }


    const state =
        window.getSalesDashboardState();


    window.renderSalesDashboardLeads(
        container,
        state?.leads || []
    );
}


/* =========================================================
   REFRESH DASHBOARD
   ========================================================= */

window.refreshCurrentSalesDashboard =
    async function () {

        const state =
            window.getSalesDashboardState();


        if (!state?.selectedSalesId) {

            console.warn(
                "Belum ada Sales yang dipilih."
            );

            return;
        }


        await window.openSalesDashboard(
            state.selectedSalesId
        );
    };


/* =========================================================
   SEARCH EVENT
   ========================================================= */

function handleSalesDashboardSearchEvent(
    value
) {

    window.handleSalesDashboardSearch(
        value
    );


    renderSalesDashboardLeadsMain();
}


/* =========================================================
   STATUS FILTER EVENT
   ========================================================= */

function handleSalesDashboardStatusEvent(
    value
) {

    window.handleSalesDashboardStatusFilter(
        value
    );


    renderSalesDashboardLeadsMain();
}


/* =========================================================
   SALES MENU CLICK
   ========================================================= */

function handleSalesDashboardMenuClick(
    event
) {

    const button =
        event.target.closest(
            "[data-sales-dashboard-id]"
        );

    if (!button) {
        return;
    }


    const salesId =
        button.dataset.salesDashboardId;


    if (!salesId) {
        return;
    }


    window.openSalesDashboard(
        salesId
    );
}


/* =========================================================
   GLOBAL EVENT HANDLER
   ========================================================= */

function initSalesDashboardEvents() {

    /*
     * Sales menu
     */

    const salesMenu =
        document.getElementById(
            SALES_DASHBOARD_CONFIG.salesMenuId
        );


    if (salesMenu) {

        salesMenu.addEventListener(
            "click",
            handleSalesDashboardMenuClick
        );
    }


    /*
     * Search input
     */

    document.addEventListener(
        "input",
        function (event) {

            const input =
                event.target.closest(
                    "[data-sales-dashboard-search]"
                );

            if (!input) {
                return;
            }


            handleSalesDashboardSearchEvent(
                input.value
            );
        }
    );


    /*
     * Status filter
     */

    document.addEventListener(
        "change",
        function (event) {

            const select =
                event.target.closest(
                    "[data-sales-dashboard-status-filter]"
                );

            if (!select) {
                return;
            }


            handleSalesDashboardStatusEvent(
                select.value
            );
        }
    );


    /*
     * Buttons inside Sales Dashboard.
     */

    document.addEventListener(
        "click",
        function (event) {

            const actionButton =
                event.target.closest(
                    "[data-sales-dashboard-action]"
                );

            if (!actionButton) {
                return;
            }


            const action =
                actionButton.dataset
                    .salesDashboardAction;


            if (action === "retry") {

                window.refreshCurrentSalesDashboard();

                return;
            }


            if (action === "refresh") {

                window.refreshCurrentSalesDashboard();

                return;
            }


            if (action === "back") {

                window.hideSalesDashboard();

                return;
            }
        }
    );
}


/* =========================================================
   INITIALIZE SALES DASHBOARD
   ========================================================= */

window.initSalesDashboard =
    async function () {

        if (
            typeof window.getSalesDashboardState !==
            "function"
        ) {
            console.error(
                "Sales Dashboard State belum dimuat."
            );

            return;
        }


        const state =
            window.getSalesDashboardState();


        if (state.initialized) {

            /*
             * Menu tetap diperbarui.
             */

            await window.loadSalesDashboardMenu();

            return;
        }


        /*
         * Tandai initialized.
         */

        state.initialized =
            true;


        /*
         * Event.
         */

        initSalesDashboardEvents();


        /*
         * Load Sales menu.
         */

        await window.loadSalesDashboardMenu();
    };


/* =========================================================
   AUTO INITIALIZE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        /*
         * Kita hanya menyiapkan event.
         *
         * Data Sales baru dimuat setelah auth selesai
         * dan Admin membuka Sales Dashboard.
         */

        initSalesDashboardEvents();
    }
);


/* =========================================================
   HELPERS
   ========================================================= */

function getSalesDashboardInitials(
    name
) {

    const value =
        String(
            name || "Sales"
        ).trim();

    if (!value) {
        return "S";
    }


    const parts =
        value
            .split(/\s+/)
            .filter(Boolean);


    if (parts.length === 1) {

        return parts[0]
            .substring(0, 2)
            .toUpperCase();
    }


    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeSalesDashboardMainHtml(
    value
) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        value === null ||
        value === undefined
            ? ""
            : String(value);

    return div.innerHTML;
}


/* =========================================================
   REFRESH LUCIDE ICONS
   ========================================================= */

function refreshSalesDashboardMainIcons() {

    if (
        typeof window.lucide !== "undefined" &&
        typeof window.lucide.createIcons ===
            "function"
    ) {

        window.lucide.createIcons();
    }
}
