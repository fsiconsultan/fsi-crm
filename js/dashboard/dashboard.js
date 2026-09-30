/* =========================================================
   FSI CRM — DASHBOARD
   File: js/dashboard/dashboard.js

   Responsibilities:
   - Dashboard navigation
   - Greeting
   - Dashboard data loading
   - Dashboard statistics
   - Sales filter
   - Pipeline
   - Recent leads
   - Dashboard refresh
========================================================= */


/* =========================================================
   DASHBOARD STATUS
========================================================= */

const DASHBOARD_STATUSES = [
    "New",
    "First Contact",
    "First Meeting / Appointment / Site Survey",
    "Quotation",
    "Second Appointment",
    "Deal",
    "No Deal"
];


/* =========================================================
   ROLE HELPERS
========================================================= */

function dashboardNormalizeRole(role) {
    if (typeof window.authNormalizeRole === "function") {
        return window.authNormalizeRole(role);
    }

    if (typeof window.normalizeRole === "function") {
        return window.normalizeRole(role);
    }

    return String(role || "")
        .trim()
        .toLowerCase();
}


function dashboardIsAdmin(profile = window.currentProfile) {
    const role = dashboardNormalizeRole(profile?.role);

    return [
        "admin",
        "owner",
        "administrator"
    ].includes(role);
}


function dashboardIsSales(profile = window.currentProfile) {
    const role = dashboardNormalizeRole(profile?.role);

    return [
        "sales",
        "salesperson"
    ].includes(role);
}


/* =========================================================
   PAGE HELPERS
========================================================= */

function dashboardFindPage(type) {
    const pageMap = {
        dashboard: "view-dashboard",
        leads: "view-leads",
        sales: "view-sales",
        customerProfile: "view-customer-profile"
    };

    const id = pageMap[type];

    return id
        ? document.getElementById(id)
        : null;
}


function dashboardHideAllPages() {
    const pages = [
        dashboardFindPage("dashboard"),
        dashboardFindPage("leads"),
        dashboardFindPage("sales"),
        dashboardFindPage("customerProfile")
    ];

    pages.forEach(page => {
        if (!page) return;

        page.classList.remove("active");
        page.classList.add("hidden");

        page.style.display = "none";
        page.setAttribute("aria-hidden", "true");
    });
}


function dashboardShowPage(type) {
    const page = dashboardFindPage(type);

    if (!page) return false;

    dashboardHideAllPages();

    page.classList.remove("hidden");
    page.classList.add("active");

    page.style.display = "block";
    page.style.visibility = "visible";
    page.style.opacity = "1";

    page.setAttribute("aria-hidden", "false");

    return true;
}


/* =========================================================
   PAGE TITLE
========================================================= */

function dashboardSetPageTitle(title, description = "") {
    const titleElement =
        document.getElementById("page-title");

    const descriptionElement =
        document.getElementById("page-description");

    if (titleElement) {
        titleElement.textContent = title || "Dashboard";
    }

    if (descriptionElement) {
        descriptionElement.textContent =
            description || "";
    }
}


function dashboardSetActiveNav(type) {
    const navItems =
        document.querySelectorAll(
            "[data-page], [data-nav]"
        );

    navItems.forEach(item => {
        const itemPage =
            item.dataset.page ||
            item.dataset.nav;

        item.classList.toggle(
            "active",
            itemPage === type
        );
    });
}


/* =========================================================
   GREETING
========================================================= */

function dashboardUpdateGreeting(profile) {
    const greetingElement =
        document.getElementById("dashboardGreeting");

    if (!greetingElement) {
        return;
    }

    const now = new Date();
    const hour = now.getHours();

    let greeting = "Good Evening";
    let icon = "🌙";

    if (hour >= 5 && hour < 12) {
        greeting = "Good Morning";
        icon = "☀️";
    } else if (hour >= 12 && hour < 18) {
        greeting = "Good Afternoon";
        icon = "🌤️";
    }

    const name =
        profile?.full_name ||
        profile?.name ||
        profile?.username ||
        profile?.email ||
        "User";

    const role =
        profile?.role || "";

    greetingElement.innerHTML = `
        <div class="dashboard-greeting-content">
            <div class="dashboard-greeting-icon">
                ${icon}
            </div>

            <div class="dashboard-greeting-text">
                <div class="dashboard-greeting-title">
                    ${escapeDashboardHtml(greeting)},
                    ${escapeDashboardHtml(name)}
                </div>

                <div class="dashboard-greeting-subtitle">
                    ${escapeDashboardHtml(role)}
                </div>
            </div>
        </div>
    `;

    greetingElement.classList.add(
        "dashboard-greeting-visible"
    );
}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeDashboardHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   SHOW DASHBOARD
========================================================= */

async function showDashboard() {
    try {
        const profile =
            window.currentProfile || null;

        dashboardShowPage("dashboard");

        dashboardSetPageTitle(
            "Dashboard",
            dashboardIsAdmin(profile)
                ? "Overview of your sales activity"
                : "Overview of your customer activity"
        );

        dashboardSetActiveNav("dashboard");

        /*
         * Greeting tetap digunakan.
         */
        dashboardUpdateGreeting(profile);

        bindDashboardStatClicks();

        await updateDashboard();

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    } catch (error) {
        console.error(
            "showDashboard error:",
            error
        );
    }
}


/* =========================================================
   SHOW LEADS
========================================================= */

function showLeads() {
    dashboardShowPage("leads");

    dashboardSetPageTitle(
        "Leads",
        "Manage and follow up your customers"
    );

    dashboardSetActiveNav("leads");

    if (typeof window.initLeads === "function") {
        window.initLeads();
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   SHOW SALES
========================================================= */

function showSales() {
    const profile =
        window.currentProfile || null;

    if (!dashboardIsAdmin(profile)) {
        console.warn(
            "Only Admin can open Sales management."
        );

        return;
    }

    dashboardShowPage("sales");

    dashboardSetPageTitle(
        "Sales Management",
        "Manage sales users and assignments"
    );

    dashboardSetActiveNav("sales");

    if (typeof window.initSales === "function") {
        window.initSales();
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   SHOW CUSTOMER PROFILE
========================================================= */

function showCustomerProfile(customerId = null) {
    dashboardShowPage("customerProfile");

    dashboardSetPageTitle(
        "Customer Profile",
        "Customer information and activity"
    );

    dashboardSetActiveNav(
        "customerProfile"
    );

    if (
        typeof window.openCustomerProfile ===
        "function"
    ) {
        window.openCustomerProfile(customerId);
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   SELECTED SALES
========================================================= */

function dashboardGetSelectedSalesId() {
    const salesFilter =
        document.getElementById(
            "salesFilter"
        );

    if (
        salesFilter &&
        salesFilter.value
    ) {
        return salesFilter.value;
    }

    const dashboardSalesFilter =
        document.getElementById(
            "dashboardSalesFilter"
        );

    if (
        dashboardSalesFilter &&
        dashboardSalesFilter.value
    ) {
        return dashboardSalesFilter.value;
    }

    return "";
}


/* =========================================================
   UPDATE DASHBOARD
========================================================= */

let dashboardLoading = false;

async function updateDashboard() {
    if (dashboardLoading) {
        return;
    }

    dashboardLoading = true;

    try {
        const profile =
            window.currentProfile || null;

        if (!profile) {
            console.warn(
                "Dashboard: current profile not found."
            );

            return;
        }

        /*
         * Greeting tetap diperbarui setiap dashboard
         * melakukan refresh.
         */
        dashboardUpdateGreeting(profile);


        /* -------------------------------------------------
           FETCH LEADS
        ------------------------------------------------- */

        let dashboardData = [];

        if (
            typeof window.dashboardFetchLeads ===
            "function"
        ) {
            dashboardData =
                await window.dashboardFetchLeads();
        } else if (
            typeof dashboardFetchLeads ===
            "function"
        ) {
            dashboardData =
                await dashboardFetchLeads();
        }


        if (!Array.isArray(dashboardData)) {
            dashboardData = [];
        }


        /* -------------------------------------------------
           ADMIN SALES FILTER
        ------------------------------------------------- */

        if (dashboardIsAdmin(profile)) {
            const selectedSalesId =
                dashboardGetSelectedSalesId();

            if (selectedSalesId) {
                dashboardData =
                    dashboardData.filter(
                        lead =>
                            String(
                                lead.sales_id || ""
                            ) ===
                            String(
                                selectedSalesId
                            )
                    );
            }
        }


        /*
         * Store dashboard data globally.
         * Pipeline dan Recent Leads menggunakan data
         * yang sama.
         */
        window.dashboardData =
            dashboardData;


        if (!window.FSIDashboard) {
            window.FSIDashboard = {};
        }

        window.FSIDashboard.data =
            dashboardData;

        window.FSIDashboard.statuses =
            [...DASHBOARD_STATUSES];


        /* -------------------------------------------------
           CALCULATE STATS
        ------------------------------------------------- */

        let stats = null;

        if (
            typeof window.dashboardCalculateStats ===
            "function"
        ) {
            stats =
                window.dashboardCalculateStats(
                    dashboardData
                );
        } else if (
            typeof dashboardCalculateStats ===
            "function"
        ) {
            stats =
                dashboardCalculateStats(
                    dashboardData
                );
        }


        if (!stats) {
            stats = {
                total: dashboardData.length,
                new: 0,
                firstContact: 0,
                firstMeeting: 0,
                quotation: 0,
                secondAppointment: 0,
                deal: 0,
                noDeal: 0
            };
        }


        /* -------------------------------------------------
           RENDER STATS
        ------------------------------------------------- */

        if (
            typeof window.renderDashboardStats ===
            "function"
        ) {
            window.renderDashboardStats(stats);
        } else if (
            typeof renderDashboardStats ===
            "function"
        ) {
            renderDashboardStats(stats);
        }


        /* -------------------------------------------------
           RENDER PIPELINE
        ------------------------------------------------- */

        if (
            typeof window.renderDashboardPipeline ===
            "function"
        ) {
            window.renderDashboardPipeline(
                dashboardData
            );
        } else if (
            typeof renderDashboardPipeline ===
            "function"
        ) {
            renderDashboardPipeline(
                dashboardData
            );
        }


        /* -------------------------------------------------
           RENDER RECENT LEADS
        ------------------------------------------------- */

        if (
            typeof window.renderDashboardRecentLeads ===
            "function"
        ) {
            window.renderDashboardRecentLeads(
                dashboardData
            );
        } else if (
            typeof renderDashboardRecentLeads ===
            "function"
        ) {
            renderDashboardRecentLeads(
                dashboardData
            );
        }


        /* -------------------------------------------------
           STAT CLICK EVENTS
        ------------------------------------------------- */

        bindDashboardStatClicks();


        /* -------------------------------------------------
           OPTIONAL CHART
        ------------------------------------------------- */

        if (
            typeof window.renderDashboardCharts ===
            "function"
        ) {
            window.renderDashboardCharts(
                dashboardData
            );
        }


        /* -------------------------------------------------
           REFRESH ICONS
        ------------------------------------------------- */

        if (
            window.lucide &&
            typeof window.lucide.createIcons ===
            "function"
        ) {
            window.lucide.createIcons();
        }


        return dashboardData;

    } catch (error) {
        console.error(
            "updateDashboard error:",
            error
        );

        const pipeline =
            document.getElementById(
                "pipeline-summary"
            );

        if (pipeline) {
            pipeline.innerHTML = `
                <div class="dashboard-error">
                    <div class="dashboard-error-icon">
                        <i data-lucide="alert-circle"></i>
                    </div>

                    <div>
                        <strong>
                            Unable to load dashboard
                        </strong>

                        <p>
                            Please refresh the dashboard
                            and try again.
                        </p>
                    </div>
                </div>
            `;
        }

        if (
            window.lucide &&
            typeof window.lucide.createIcons ===
            "function"
        ) {
            window.lucide.createIcons();
        }

        return [];

    } finally {
        dashboardLoading = false;
    }
}


/* =========================================================
   BIND STAT CARD CLICKS
========================================================= */

let dashboardStatClicksBound = false;

function bindDashboardStatClicks() {
    if (dashboardStatClicksBound) {
        return;
    }

    dashboardStatClicksBound = true;

    const statMap = {
        statTotal: "",
        statNew: "New",
        statInterested: "First Contact",
        statFollowUp:
            "First Meeting / Appointment / Site Survey",
        statQuotation: "Quotation",
        statAppointment: "Second Appointment",
        statSPK: "Deal",
        statNotInterested: "No Deal",
        statClosing: "Deal"
    };


    Object.entries(statMap).forEach(
        ([elementId, status]) => {
            const element =
                document.getElementById(
                    elementId
                );

            if (!element) {
                return;
            }

            element.addEventListener(
                "click",
                () => {
                    if (
                        typeof window.filterLeadsByStatus ===
                        "function"
                    ) {
                        window.filterLeadsByStatus(
                            status
                        );
                    } else if (
                        typeof window.showLeads ===
                        "function"
                    ) {
                        window.showLeads();
                    } else {
                        showLeads();
                    }
                }
            );
        }
    );
}


/* =========================================================
   SALES FILTER
========================================================= */

function bindDashboardSalesFilter() {
    const salesFilter =
        document.getElementById(
            "salesFilter"
        );

    if (!salesFilter) {
        return;
    }

    if (
        salesFilter.dataset.dashboardBound ===
        "true"
    ) {
        return;
    }

    salesFilter.dataset.dashboardBound =
        "true";

    salesFilter.addEventListener(
        "change",
        async () => {
            await updateDashboard();
        }
    );
}


/* =========================================================
   REFRESH DASHBOARD
========================================================= */

async function refreshDashboard() {
    const button =
        document.getElementById(
            "dashboardRefresh"
        );

    if (button) {
        button.classList.add("loading");
        button.disabled = true;
    }

    try {
        await updateDashboard();

    } finally {
        if (button) {
            button.classList.remove(
                "loading"
            );

            button.disabled = false;
        }
    }
}


/* =========================================================
   QUICK ACTIONS
========================================================= */

function bindDashboardQuickActions() {
    const addCustomerButton =
        document.getElementById(
            "dashboardAddCustomer"
        );

    if (
        addCustomerButton &&
        !addCustomerButton.dataset.bound
    ) {
        addCustomerButton.dataset.bound =
            "true";

        addCustomerButton.addEventListener(
            "click",
            () => {
                if (
                    typeof window.openCustomerForm ===
                    "function"
                ) {
                    window.openCustomerForm();
                }
            }
        );
    }


    const viewAllButton =
        document.getElementById(
            "dashboardViewAllLeads"
        );

    if (
        viewAllButton &&
        !viewAllButton.dataset.bound
    ) {
        viewAllButton.dataset.bound =
            "true";

        viewAllButton.addEventListener(
            "click",
            () => {
                showLeads();
            }
        );
    }
}


/* =========================================================
   DASHBOARD GETTERS
========================================================= */

function getDashboardData() {
    return Array.isArray(
        window.dashboardData
    )
        ? window.dashboardData
        : [];
}


function getDashboardStatuses() {
    return [...DASHBOARD_STATUSES];
}


/* =========================================================
   EVENT: LEAD CHANGED
========================================================= */

document.addEventListener(
    "fsi:lead-changed",
    async () => {
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
            await updateDashboard();
        }
    }
);


/* =========================================================
   EVENT: PROFILE READY
========================================================= */

document.addEventListener(
    "fsi:profile-ready",
    async event => {
        const profile =
            event.detail?.profile ||
            window.currentProfile;

        if (!profile) {
            return;
        }

        dashboardUpdateGreeting(
            profile
        );

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
            await updateDashboard();
        }
    }
);


/* =========================================================
   EVENT: APP READY
========================================================= */

document.addEventListener(
    "fsi:app-ready",
    async () => {
        bindDashboardSalesFilter();
        bindDashboardQuickActions();

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
            await updateDashboard();
        }
    }
);


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {
        /*
         * Make the new 7-stage system available
         * globally.
         */
        if (!window.FSIDashboard) {
            window.FSIDashboard = {};
        }

        window.FSIDashboard.statuses =
            [...DASHBOARD_STATUSES];


        bindDashboardSalesFilter();
        bindDashboardQuickActions();
        bindDashboardStatClicks();


        /*
         * Initial dashboard visibility.
         */
        const dashboardPage =
            dashboardFindPage(
                "dashboard"
            );

        if (dashboardPage) {
            dashboardPage.classList.add(
                "active"
            );

            dashboardPage.classList.remove(
                "hidden"
            );

            dashboardPage.style.display =
                "block";

            dashboardPage.setAttribute(
                "aria-hidden",
                "false"
            );
        }


        /*
         * Make sure other pages are hidden.
         */
        [
            "leads",
            "sales",
            "customerProfile"
        ].forEach(type => {
            const page =
                dashboardFindPage(type);

            if (!page) {
                return;
            }

            page.classList.remove(
                "active"
            );

            page.classList.add(
                "hidden"
            );

            page.style.display =
                "none";

            page.setAttribute(
                "aria-hidden",
                "true"
            );
        });


        /*
         * Greeting is initialized when profile
         * is already available.
         */
        if (window.currentProfile) {
            dashboardUpdateGreeting(
                window.currentProfile
            );
        }


        /*
         * Initialize Lucide icons.
         */
        if (
            window.lucide &&
            typeof window.lucide.createIcons ===
            "function"
        ) {
            window.lucide.createIcons();
        }
    }
);


/* =========================================================
   GLOBAL EXPORTS
========================================================= */

window.showDashboard =
    showDashboard;

window.showLeads =
    showLeads;

window.showSales =
    showSales;

window.showCustomerProfile =
    showCustomerProfile;

window.updateDashboard =
    updateDashboard;

window.refreshDashboard =
    refreshDashboard;

window.dashboardGetSelectedSalesId =
    dashboardGetSelectedSalesId;

window.dashboardIsAdmin =
    dashboardIsAdmin;

window.dashboardIsSales =
    dashboardIsSales;

window.dashboardNormalizeRole =
    dashboardNormalizeRole;

window.dashboardFindPage =
    dashboardFindPage;

window.dashboardShowPage =
    dashboardShowPage;

window.dashboardHideAllPages =
    dashboardHideAllPages;

window.dashboardSetPageTitle =
    dashboardSetPageTitle;

window.dashboardSetActiveNav =
    dashboardSetActiveNav;

window.dashboardUpdateGreeting =
    dashboardUpdateGreeting;

window.getDashboardData =
    getDashboardData;

window.getDashboardStatuses =
    getDashboardStatuses;


/* =========================================================
   FSI DASHBOARD NAMESPACE
========================================================= */

window.FSIDashboard =
    window.FSIDashboard || {};

Object.assign(
    window.FSIDashboard,
    {
        statuses:
            [...DASHBOARD_STATUSES],

        getData:
            getDashboardData,

        update:
            updateDashboard,

        refresh:
            refreshDashboard,

        showDashboard:
            showDashboard,

        showLeads:
            showLeads,

        showSales:
            showSales,

        showCustomerProfile:
            showCustomerProfile,

        isAdmin:
            dashboardIsAdmin,

        isSales:
            dashboardIsSales
    }
);
