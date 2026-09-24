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
   - Menampilkan customer / leads
   - Search
   - Filter
   - Pagination
   - Refresh dashboard
   - Navigasi kembali
   - Admin only

   Compatible dengan index.html terbaru.
   ========================================================= */


/* =========================================================
   SALES DASHBOARD CONFIG
   ========================================================= */

const SALES_DASHBOARD_CONFIG = {

    viewId: "view-sales-dashboard",

    pipelineContainerId:
        "sales-dashboard-pipeline",

    leadsContainerId:
        "sales-dashboard-leads-body",

    salesMenuId:
        "sales-dashboard-menu-list",

    salesSelectId:
        "sales-dashboard-select",

    searchInputId:
        "sales-dashboard-search",

    statusFilterId:
        "sales-dashboard-status-filter"

};


/* =========================================================
   INTERNAL STATE
   ========================================================= */

let salesDashboardEventsInitialized = false;


/* =========================================================
   GET VIEW
   ========================================================= */

function getSalesDashboardView() {

    return document.getElementById(
        SALES_DASHBOARD_CONFIG.viewId
    );
}


/* =========================================================
   GET STATE
   ========================================================= */

function getSalesDashboardMainState() {

    if (
        typeof window.getSalesDashboardState !==
        "function"
    ) {

        return null;
    }

    return window.getSalesDashboardState();
}


/* =========================================================
   CHECK ADMIN
   ========================================================= */

window.canOpenSalesDashboard =
    function () {

        /*
         * currentProfile dari auth.js.
         */

        if (
            typeof window.currentProfile !==
                "undefined" &&
            window.currentProfile
        ) {

            return (
                String(
                    window.currentProfile.role || ""
                ).toLowerCase() === "admin"
            );
        }


        /*
         * Fallback variable global.
         */

        if (
            typeof currentProfile !==
                "undefined" &&
            currentProfile
        ) {

            return (
                String(
                    currentProfile.role || ""
                ).toLowerCase() === "admin"
            );
        }


        return false;
    };


/* =========================================================
   GET SELECTED SALES
   ========================================================= */

window.getSelectedSalesDashboardSales =
    function () {

        const state =
            getSalesDashboardMainState();

        return state?.selectedSales || null;
    };


/* =========================================================
   GET SALES NAME
   ========================================================= */

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
   GET SALES INITIALS
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
   REFRESH LUCIDE
   ========================================================= */

function refreshSalesDashboardMainIcons() {

    if (
        typeof window.lucide !==
            "undefined" &&
        typeof window.lucide.createIcons ===
            "function"
    ) {

        window.lucide.createIcons();
    }
}


/* =========================================================
   SHOW SALES DASHBOARD
   ========================================================= */

window.showSalesDashboard =
    function () {

        const view =
            getSalesDashboardView();


        if (!view) {

            console.warn(
                "Sales Dashboard view belum tersedia."
            );

            return;
        }


        /*
         * Gunakan navigation utama jika tersedia.
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
                    "showPage gagal:",
                    error
                );
            }
        }


        /*
         * Pastikan hanya Sales Dashboard
         * yang aktif.
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

                    /*
                     * Jangan memaksa display:none
                     * jika navigation.js mengatur
                     * visibility sendiri.
                     */
                }
            );


        view.classList.add(
            "active"
        );


        /*
         * Pastikan view terlihat.
         */

        view.style.display =
            "block";


        /*
         * Update page title jika element tersedia.
         */

        const pageTitle =
            document.getElementById(
                "page-title"
            );


        const pageDescription =
            document.getElementById(
                "page-description"
            );


        const currentPageTitle =
            document.getElementById(
                "current-page-title"
            );


        if (pageTitle) {

            pageTitle.textContent =
                "Sales Dashboard";
        }


        if (currentPageTitle) {

            currentPageTitle.textContent =
                "Sales Dashboard";
        }


        if (pageDescription) {

            pageDescription.textContent =
                "Sales performance, pipeline, and customer data.";
        }


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });


        refreshSalesDashboardMainIcons();
    };


/* =========================================================
   HIDE SALES DASHBOARD
   ========================================================= */

window.hideSalesDashboard =
    function () {

        const view =
            getSalesDashboardView();


        if (view) {

            view.classList.remove(
                "active"
            );

            view.style.display =
                "none";
        }


        /*
         * Kembali ke Dashboard menggunakan
         * navigation utama jika tersedia.
         */

        if (
            typeof window.showPage ===
            "function"
        ) {

            try {

                window.showPage(
                    "dashboard"
                );

                return;

            } catch (error) {

                console.warn(
                    "Gagal kembali ke Dashboard:",
                    error
                );
            }
        }


        /*
         * Fallback.
         */

        const dashboard =
            document.getElementById(
                "view-dashboard"
            );


        if (dashboard) {

            document
                .querySelectorAll(
                    ".crm-page"
                )
                .forEach(
                    function (page) {

                        page.classList.remove(
                            "active"
                        );

                        page.style.display =
                            "none";
                    }
                );


            dashboard.classList.add(
                "active"
            );

            dashboard.style.display =
                "block";
        }


        const pageTitle =
            document.getElementById(
                "page-title"
            );


        const pageDescription =
            document.getElementById(
                "page-description"
            );


        const currentPageTitle =
            document.getElementById(
                "current-page-title"
            );


        if (pageTitle) {

            pageTitle.textContent =
                "Dashboard";
        }


        if (currentPageTitle) {

            currentPageTitle.textContent =
                "Dashboard";
        }


        if (pageDescription) {

            pageDescription.textContent =
                "Overview of your sales activity and customer pipeline.";
        }


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };


/* =========================================================
   LOAD SALES LIST
   ========================================================= */

async function getSalesDashboardSalesList() {

    /*
     * Gunakan data.js yang sudah dibuat.
     */

    if (
        typeof window.loadSalesDashboardSales !==
        "function"
    ) {

        throw new Error(
            "sales-dashboard-data.js belum dimuat."
        );
    }


    const salesList =
        await window.loadSalesDashboardSales();


    return Array.isArray(
        salesList
    )
        ? salesList
        : [];
}


/* =========================================================
   RENDER SALES SELECTOR
   ========================================================= */

function renderSalesDashboardSelector(
    salesList
) {

    const select =
        document.getElementById(
            SALES_DASHBOARD_CONFIG.salesSelectId
        );


    if (!select) {
        return;
    }


    const state =
        getSalesDashboardMainState();


    const selectedId =
        state?.selectedSalesId ||
        "";


    select.innerHTML = `
        <option value="">
            Select Sales
        </option>
    `;


    salesList.forEach(
        function (sales) {

            if (!sales?.id) {
                return;
            }


            const name =
                getSalesDashboardSalesName(
                    sales
                );


            const option =
                document.createElement(
                    "option"
                );


            option.value =
                sales.id;


            option.textContent =
                name;


            if (
                String(
                    sales.id
                ) ===
                String(
                    selectedId
                )
            ) {

                option.selected =
                    true;
            }


            select.appendChild(
                option
            );
        }
    );
}


/* =========================================================
   LOAD SALES DASHBOARD MENU
   ---------------------------------------------------------
   Menampilkan daftar Sales pada dropdown
   ========================================================= */

window.loadSalesDashboardMenu =
    async function () {

        const container =
            document.getElementById(
                SALES_DASHBOARD_CONFIG.salesMenuId
            );


        /*
         * Selector tetap perlu diisi walaupun
         * menu container tidak tersedia.
         */

        let salesList = [];


        if (
            !window.canOpenSalesDashboard()
        ) {

            if (container) {

                container.innerHTML =
                    "";
            }

            return;
        }


        if (container) {

            container.innerHTML = `
                <div class="sales-dashboard-menu-loading">
                    Loading Sales...
                </div>
            `;
        }


        try {

            salesList =
                await getSalesDashboardSalesList();


            /*
             * Simpan ke state jika fungsi tersedia.
             */

            if (
                typeof window.setSalesDashboardSalesList ===
                "function"
            ) {

                window.setSalesDashboardSalesList(
                    salesList
                );
            }


            /*
             * Render selector.
             */

            renderSalesDashboardSelector(
                salesList
            );


            /*
             * Tidak ada Sales.
             */

            if (!salesList.length) {

                if (container) {

                    container.innerHTML = `
                        <div class="sales-dashboard-menu-empty">
                            Belum ada Sales.
                        </div>
                    `;
                }

                return;
            }


            /*
             * Render menu Sales.
             */

            if (container) {

                container.innerHTML =
                    salesList
                        .map(
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
                        )
                        .join("");


                refreshSalesDashboardMainIcons();
            }


        } catch (error) {

            console.error(
                "Sales Dashboard menu error:",
                error
            );


            if (container) {

                container.innerHTML = `
                    <div class="sales-dashboard-menu-error">
                        Gagal memuat Sales.
                    </div>
                `;
            }


            /*
             * Jangan crash CRM utama.
             */

            console.warn(
                "Sales Dashboard gagal memuat daftar Sales:",
                error
            );
        }
    };


/* =========================================================
   RENDER HEADER
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


    /*
     * Support selector versi baru.
     */

    view
        .querySelectorAll(
            "[data-sales-dashboard-name]"
        )
        .forEach(
            function (element) {

                element.textContent =
                    name;
            }
        );


    /*
     * Support index.html sekarang:
     *
     * h2 id="sales-dashboard-name"
     */

    const nameElement =
        document.getElementById(
            "sales-dashboard-name"
        );


    if (nameElement) {

        nameElement.textContent =
            name;
    }


    /*
     * Description.
     */

    const description =
        document.getElementById(
            "sales-dashboard-description"
        );


    if (description) {

        description.textContent =
            sales?.email
                ? `${name} • ${sales.email}`
                : `Sales performance, pipeline, follow-up, and customer data.`;
    }


    /*
     * Email selectors jika suatu saat digunakan.
     */

    view
        .querySelectorAll(
            "[data-sales-dashboard-email]"
        )
        .forEach(
            function (element) {

                element.textContent =
                    sales?.email ||
                    "";
            }
        );


    /*
     * Avatar selectors jika tersedia.
     */

    view
        .querySelectorAll(
            "[data-sales-dashboard-avatar]"
        )
        .forEach(
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

    if (
        typeof window.getSalesDashboardStats !==
        "function"
    ) {

        return;
    }


    const stats =
        window.getSalesDashboardStats() ||
        {};


    const statMap = {

        total:
            Number(
                stats.total || 0
            ),

        new:
            Number(
                stats.new || 0
            ),

        first_contact:
            Number(
                stats.first_contact || 0
            ),

        first_meeting:
            Number(
                stats.first_meeting || 0
            ),

        quotation:
            Number(
                stats.quotation || 0
            ),

        second_appointment:
            Number(
                stats.second_appointment || 0
            ),

        deal:
            Number(
                stats.deal || 0
            ),

        no_deal:
            Number(
                stats.no_deal || 0
            )
    };


    /*
     * Selector berdasarkan data attribute.
     */

    Object.keys(
        statMap
    ).forEach(
        function (key) {

            document
                .querySelectorAll(
                    `[data-sales-stat="${key}"]`
                )
                .forEach(
                    function (element) {

                        element.textContent =
                            statMap[key];
                    }
                );
        }
    );


    /*
     * ID sesuai index.html sekarang.
     */

    const idMap = {

        total:
            "salesStatTotal",

        new:
            "salesStatNew",

        first_contact:
            "salesStatFirstContact",

        first_meeting:
            "salesStatFirstMeeting",

        quotation:
            "salesStatQuotation",

        second_appointment:
            "salesStatSecondAppointment",

        deal:
            "salesStatDeal",

        no_deal:
            "salesStatNoDeal"
    };


    Object.keys(
        idMap
    ).forEach(
        function (key) {

            const element =
                document.getElementById(
                    idMap[key]
                );


            if (element) {

                element.textContent =
                    statMap[key];
            }
        }
    );


    /*
     * Deal rate.
     */

    if (
        typeof window.getSalesDashboardDealRate ===
        "function"
    ) {

        const dealRate =
            Number(
                window.getSalesDashboardDealRate() || 0
            );


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
    }


    /*
     * Active leads.
     */

    if (
        typeof window.getSalesDashboardActiveLeads ===
        "function"
    ) {

        const activeLeads =
            Number(
                window.getSalesDashboardActiveLeads() || 0
            );


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

        console.warn(
            "Container Sales Dashboard Pipeline tidak ditemukan."
        );

        return;
    }


    const state =
        getSalesDashboardMainState();


    if (
        typeof window.renderSalesDashboardPipeline !==
        "function"
    ) {

        console.warn(
            "sales-dashboard-pipeline.js belum dimuat."
        );

        return;
    }


    window.renderSalesDashboardPipeline(
        container,
        state?.leads || []
    );


    refreshSalesDashboardMainIcons();
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

        console.warn(
            "Container Sales Dashboard Leads tidak ditemukan."
        );

        return;
    }


    const state =
        getSalesDashboardMainState();


    if (
        typeof window.renderSalesDashboardLeads !==
        "function"
    ) {

        console.warn(
            "sales-dashboard-leads.js belum dimuat."
        );

        return;
    }


    window.renderSalesDashboardLeads(
        container,
        state?.leads || []
    );


    refreshSalesDashboardMainIcons();
}


/* =========================================================
   SHOW LOADING
   ========================================================= */

function renderSalesDashboardLoading() {

    const view =
        getSalesDashboardView();


    if (!view) {
        return;
    }


    const loading =
        document.getElementById(
            "sales-dashboard-loading"
        );


    if (loading) {

        loading.hidden =
            false;

        loading.style.display =
            "flex";
    }


    const content =
        document.getElementById(
            "sales-dashboard-content"
        );


    if (content) {

        content.classList.add(
            "is-loading"
        );
    }


    refreshSalesDashboardMainIcons();
}


/* =========================================================
   HIDE LOADING
   ========================================================= */

function hideSalesDashboardLoading() {

    const loading =
        document.getElementById(
            "sales-dashboard-loading"
        );


    if (loading) {

        loading.hidden =
            true;

        loading.style.display =
            "none";
    }


    const content =
        document.getElementById(
            "sales-dashboard-content"
        );


    if (content) {

        content.classList.remove(
            "is-loading"
        );
    }
}


/* =========================================================
   SHOW ERROR
   ========================================================= */

function renderSalesDashboardError(
    message
) {

    hideSalesDashboardLoading();


    const errorBox =
        document.getElementById(
            "sales-dashboard-error"
        );


    if (!errorBox) {

        console.error(
            message
        );

        return;
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


    errorBox.hidden =
        false;


    errorBox.style.display =
        "flex";


    refreshSalesDashboardMainIcons();
}


/* =========================================================
   HIDE ERROR
   ========================================================= */

function hideSalesDashboardError() {

    const errorBox =
        document.getElementById(
            "sales-dashboard-error"
        );


    if (!errorBox) {
        return;
    }


    errorBox.hidden =
        true;


    errorBox.style.display =
        "none";


    errorBox.innerHTML =
        "";
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
         * Admin only.
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
         * Pastikan function data tersedia.
         */

        if (
            typeof window.loadSalesDashboard !==
            "function"
        ) {

            renderSalesDashboardError(
                "sales-dashboard-data.js belum dimuat."
            );

            return;
        }


        /*
         * Simpan selected ID jika state
         * menyediakan setter.
         */

        if (
            typeof window.setSalesDashboardSales ===
            "function"
        ) {

            /*
             * Tidak dipakai untuk ID.
             * Selected Sales akan di-set oleh
             * loadSalesDashboard().
             */
        }


        /*
         * Tampilkan halaman.
         */

        window.showSalesDashboard();


        hideSalesDashboardError();


        renderSalesDashboardLoading();


        try {

            /*
             * Load Sales + Leads dari Supabase.
             */

            const result =
                await window.loadSalesDashboard(
                    salesId
                );


            if (!result) {

                throw new Error(
                    "Data Sales tidak ditemukan."
                );
            }


            if (!result.sales) {

                throw new Error(
                    "Data Sales tidak ditemukan."
                );
            }


            /*
             * Update statistics.
             */

            if (
                typeof window.updateSalesDashboardStats ===
                "function"
            ) {

                window.updateSalesDashboardStats(
                    result.leads || []
                );
            }


            /*
             * Header.
             */

            renderSalesDashboardHeader(
                result.sales
            );


            /*
             * Selector.
             */

            const select =
                document.getElementById(
                    SALES_DASHBOARD_CONFIG.salesSelectId
                );


            if (select) {

                select.value =
                    String(
                        salesId
                    );
            }


            /*
             * Statistics.
             */

            renderSalesDashboardStats();


            /*
             * Pipeline.
             */

            renderSalesDashboardPipelineMain();


            /*
             * Customer list.
             */

            renderSalesDashboardLeadsMain();


            /*
             * Hide loading.
             */

            hideSalesDashboardLoading();


            /*
             * Icons.
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
   REFRESH CURRENT SALES DASHBOARD
   ========================================================= */

window.refreshCurrentSalesDashboard =
    async function () {

        const state =
            getSalesDashboardMainState();


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
   SEARCH
   ========================================================= */

function handleSalesDashboardSearchEvent(
    value
) {

    if (
        typeof window.handleSalesDashboardSearch !==
        "function"
    ) {

        return;
    }


    window.handleSalesDashboardSearch(
        value
    );


    renderSalesDashboardLeadsMain();
}


/* =========================================================
   STATUS FILTER
   ========================================================= */

function handleSalesDashboardStatusEvent(
    value
) {

    if (
        typeof window.handleSalesDashboardStatusFilter !==
        "function"
    ) {

        return;
    }


    window.handleSalesDashboardStatusFilter(
        value
    );


    renderSalesDashboardLeadsMain();
}


/* =========================================================
   SALES SELECTOR CHANGE
   ========================================================= */

async function handleSalesDashboardSelectorChange(
    event
) {

    const select =
        event.target.closest(
            "#sales-dashboard-select"
        );


    if (!select) {
        return;
    }


    const salesId =
        select.value;


    if (!salesId) {

        return;
    }


    await window.openSalesDashboard(
        salesId
    );
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


    /*
     * Tutup dropdown bila navigation.js
     * menggunakan class tertentu.
     */

    const salesNav =
        document.getElementById(
            "sales-navigation"
        );


    if (salesNav) {

        salesNav.classList.remove(
            "open"
        );

        salesNav.classList.remove(
            "active"
        );
    }


    window.openSalesDashboard(
        salesId
    );
}


/* =========================================================
   SALES DASHBOARD "ALL" BUTTON
   ========================================================= */

async function handleSalesDashboardAllClick(
    event
) {

    const button =
        event.target.closest(
            '[data-sales-dashboard="all"]'
        );


    if (!button) {
        return;
    }


    /*
     * Tombol "Sales Dashboard" umum pada
     * index.html.
     *
     * Kita buka halaman terlebih dahulu,
     * lalu isi daftar Sales.
     */

    if (
        !window.canOpenSalesDashboard()
    ) {

        return;
    }


    window.showSalesDashboard();


    const state =
        getSalesDashboardMainState();


    if (
        state?.selectedSalesId
    ) {

        await window.openSalesDashboard(
            state.selectedSalesId
        );

        return;
    }


    /*
     * Jika belum ada Sales dipilih,
     * hanya tampilkan dashboard dengan
     * pesan Select a Sales.
     */

    hideSalesDashboardLoading();


    const pipeline =
        document.getElementById(
            SALES_DASHBOARD_CONFIG.pipelineContainerId
        );


    if (pipeline) {

        pipeline.innerHTML = `
            <div class="sales-dashboard-empty">

                <i
                    data-lucide="chart-no-axes-combined"
                    aria-hidden="true"
                ></i>

                <span>
                    Select a Sales to view the pipeline.
                </span>

            </div>
        `;
    }


    refreshSalesDashboardMainIcons();
}


/* =========================================================
   ACTION BUTTONS
   ========================================================= */

function handleSalesDashboardAction(
    event
) {

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


    if (
        action === "retry" ||
        action === "refresh"
    ) {

        window.refreshCurrentSalesDashboard();

        return;
    }


    if (
        action === "back"
    ) {

        window.hideSalesDashboard();

        return;
    }
}


/* =========================================================
   INITIALIZE EVENTS
   ========================================================= */

function initSalesDashboardEvents() {

    /*
     * Jangan pasang listener dua kali.
     */

    if (
        salesDashboardEventsInitialized
    ) {

        return;
    }


    salesDashboardEventsInitialized =
        true;


    /* -----------------------------------------------------
       SALES MENU
    ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       DOCUMENT CLICK
    ----------------------------------------------------- */

    document.addEventListener(
        "click",
        function (event) {

            /*
             * Sales Dashboard main button.
             */

            if (
                event.target.closest(
                    '[data-sales-dashboard="all"]'
                )
            ) {

                handleSalesDashboardAllClick(
                    event
                );

                return;
            }


            /*
             * Action button.
             */

            if (
                event.target.closest(
                    "[data-sales-dashboard-action]"
                )
            ) {

                handleSalesDashboardAction(
                    event
                );

                return;
            }
        }
    );


    /* -----------------------------------------------------
       SEARCH
    ----------------------------------------------------- */

    document.addEventListener(
        "input",
        function (event) {

            const input =
                event.target.closest(
                    "#sales-dashboard-search, [data-sales-dashboard-search]"
                );


            if (!input) {
                return;
            }


            handleSalesDashboardSearchEvent(
                input.value
            );
        }
    );


    /* -----------------------------------------------------
       STATUS FILTER
    ----------------------------------------------------- */

    document.addEventListener(
        "change",
        function (event) {

            const select =
                event.target.closest(
                    "#sales-dashboard-status-filter, [data-sales-dashboard-status-filter]"
                );


            if (!select) {
                return;
            }


            handleSalesDashboardStatusEvent(
                select.value
            );
        }
    );


    /* -----------------------------------------------------
       SALES SELECTOR
    ----------------------------------------------------- */

    document.addEventListener(
        "change",
        function (event) {

            const select =
                event.target.closest(
                    "#sales-dashboard-select"
                );


            if (!select) {
                return;
            }


            handleSalesDashboardSelectorChange(
                event
            );
        }
    );


    /* -----------------------------------------------------
       BACK BUTTON
       Mendukung:
       data-sales-dashboard-action="back"
       maupun id lama.
    ----------------------------------------------------- */

    const backButton =
        document.getElementById(
            "sales-dashboard-back"
        );


    if (backButton) {

        backButton.addEventListener(
            "click",
            function () {

                window.hideSalesDashboard();
            }
        );
    }
}


/* =========================================================
   INITIALIZE SALES DASHBOARD
   ========================================================= */

window.initSalesDashboard =
    async function () {

        /*
         * State harus sudah tersedia.
         */

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


        /*
         * Event hanya satu kali.
         */

        initSalesDashboardEvents();


        /*
         * Jika bukan Admin,
         * jangan load data.
         */

        if (
            !window.canOpenSalesDashboard()
        ) {

            return;
        }


        /*
         * Load menu Sales.
         */

        await window.loadSalesDashboardMenu();


        /*
         * Jika sebelumnya sudah ada Sales yang
         * dipilih, jangan otomatis fetch lagi.
         *
         * Data akan dibuka ketika user memilih Sales.
         */

        state.initialized =
            true;
    };


/* =========================================================
   AUTO INITIALIZE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        /*
         * Jangan langsung mengambil data Leads.
         *
         * auth.js masih menangani login/profile.
         *
         * Kita hanya pasang event setelah DOM siap.
         */

        initSalesDashboardEvents();
    }
);


/* =========================================================
   PUBLIC HELPERS
   ========================================================= */

window.getSalesDashboardSalesName =
    getSalesDashboardSalesName;


window.getSalesDashboardInitials =
    getSalesDashboardInitials;


window.refreshSalesDashboardMainIcons =
    refreshSalesDashboardMainIcons;
