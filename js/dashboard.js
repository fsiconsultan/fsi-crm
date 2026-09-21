// ============================================================
// FSI CRM - DASHBOARD MODULE
// File: js/dashboard.js
// ============================================================
//
// Fungsi:
// - Dashboard navigation
// - Dashboard statistics
// - Admin / Sales access handling
// - Refresh dashboard
// - Modern + legacy page ID compatibility
// ============================================================

"use strict";


// ============================================================
// DASHBOARD STATE
// ============================================================

window.FSIDashboard = window.FSIDashboard || {};

let dashboardLoading = false;
let dashboardInitialized = false;


// ============================================================
// GET CURRENT PROFILE
// ============================================================

function dashboardGetProfile() {

    if (window.currentProfile) {
        return window.currentProfile;
    }

    if (
        typeof currentProfile !== "undefined" &&
        currentProfile
    ) {
        return currentProfile;
    }

    return null;
}


// ============================================================
// GET CURRENT USER
// ============================================================

function dashboardGetUser() {

    if (window.currentUser) {
        return window.currentUser;
    }

    if (
        typeof currentUser !== "undefined" &&
        currentUser
    ) {
        return currentUser;
    }

    return null;
}


// ============================================================
// ROLE HELPERS
// ============================================================

function dashboardIsAdmin() {

    const profile =
        dashboardGetProfile();

    if (!profile) {
        return false;
    }

    const role =
        String(profile.role || "")
            .trim()
            .toLowerCase();

    return (
        role === "admin" ||
        role === "owner" ||
        role === "administrator"
    );
}


function dashboardIsSales() {

    const profile =
        dashboardGetProfile();

    if (!profile) {
        return false;
    }

    const role =
        String(profile.role || "")
            .trim()
            .toLowerCase();

    return (
        role === "sales" ||
        role === "salesperson"
    );
}


// ============================================================
// PAGE ELEMENT FINDER
// ============================================================

function dashboardFindPage(
    type
) {

    const pageMap = {

        dashboard: [
            "view-dashboard",
            "dashboardPage",
            "dashboard-page"
        ],

        leads: [
            "view-leads",
            "leadsPage",
            "leads-page"
        ],

        sales: [
            "view-sales",
            "salesPage",
            "sales-page"
        ],

        customerProfile: [
            "view-customer-profile",
            "customerProfilePage",
            "customer-profile-page"
        ]
    };


    const ids =
        pageMap[type] || [];


    for (const id of ids) {

        const element =
            document.getElementById(id);

        if (element) {
            return element;
        }
    }


    return null;
}


// ============================================================
// HIDE ALL PAGES
// ============================================================

function hideAllPages() {

    const pageTypes = [
        "dashboard",
        "leads",
        "sales",
        "customerProfile"
    ];


    pageTypes.forEach(
        type => {

            const element =
                dashboardFindPage(type);

            if (!element) {
                return;
            }

            element.classList.add(
                "hidden"
            );

            element.style.display =
                "none";

            element.setAttribute(
                "aria-hidden",
                "true"
            );
        }
    );


    // --------------------------------------------------------
    // Additional legacy / custom view containers
    // --------------------------------------------------------

    const extraIds = [
        "dashboard-view",
        "leads-view",
        "sales-view",
        "customer-profile-view"
    ];


    extraIds.forEach(
        id => {

            const element =
                document.getElementById(id);

            if (!element) {
                return;
            }

            element.classList.add(
                "hidden"
            );

            element.style.display =
                "none";

            element.setAttribute(
                "aria-hidden",
                "true"
            );
        }
    );
}


// ============================================================
// SHOW PAGE
// ============================================================

function dashboardShowPage(
    type
) {

    hideAllPages();


    const page =
        dashboardFindPage(type);


    if (!page) {

        console.warn(
            `Dashboard navigation: page "${type}" not found.`
        );

        return null;
    }


    page.classList.remove(
        "hidden"
    );

    page.style.display =
        "";


    // Some older layouts use block.
    if (
        getComputedStyle(page).display ===
        "none"
    ) {
        page.style.display =
            "block";
    }


    page.setAttribute(
        "aria-hidden",
        "false"
    );


    return page;
}


// ============================================================
// PAGE TITLE
// ============================================================

function dashboardSetPageTitle(
    title
) {

    if (
        typeof window.setPageTitle ===
        "function"
    ) {

        window.setPageTitle(
            title
        );

        return;
    }


    const titleIds = [
        "pageTitle",
        "page-title",
        "current-page-title"
    ];


    titleIds.forEach(
        id => {

            const element =
                document.getElementById(id);

            if (element) {
                element.textContent =
                    title;
            }
        }
    );
}


// ============================================================
// UPDATE ACTIVE NAVIGATION
// ============================================================

function dashboardSetActiveNav(
    target
) {

    const links =
        document.querySelectorAll(
            ".nav-link, " +
            ".nav-dropdown-item, " +
            "[data-page], " +
            "[data-view]"
        );


    links.forEach(
        link => {

            link.classList.remove(
                "active"
            );

            link.removeAttribute(
                "aria-current"
            );
        }
    );


    const selectors = [
        `[data-page="${target}"]`,
        `[data-view="${target}"]`,
        `[data-nav="${target}"]`
    ];


    selectors.forEach(
        selector => {

            document
                .querySelectorAll(selector)
                .forEach(
                    element => {

                        element.classList.add(
                            "active"
                        );

                        element.setAttribute(
                            "aria-current",
                            "page"
                        );
                    }
                );
        }
    );
}


// ============================================================
// SHOW DASHBOARD
// ============================================================

async function showDashboard() {

    const profile =
        dashboardGetProfile();


    if (!profile) {

        console.warn(
            "Cannot open dashboard: profile not ready."
        );

        return;
    }


    dashboardShowPage(
        "dashboard"
    );


    dashboardSetPageTitle(
        "Dashboard"
    );


    dashboardSetActiveNav(
        "dashboard"
    );


    await updateDashboard();


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ============================================================
// SHOW LEADS
// ============================================================

async function showLeads() {

    const profile =
        dashboardGetProfile();


    if (!profile) {

        console.warn(
            "Cannot open leads: profile not ready."
        );

        return;
    }


    dashboardShowPage(
        "leads"
    );


    const title =
        dashboardIsAdmin()
            ? "All Leads"
            : "My Leads";


    dashboardSetPageTitle(
        title
    );


    dashboardSetActiveNav(
        "leads"
    );


    // --------------------------------------------------------
    // Load filter options
    // --------------------------------------------------------

    if (
        typeof window.loadFilterOptions ===
        "function"
    ) {

        try {

            await window.loadFilterOptions();

        } catch (error) {

            console.error(
                "Load filter options error:",
                error
            );
        }
    }


    // --------------------------------------------------------
    // Load leads
    // --------------------------------------------------------

    if (
        typeof window.loadLeads ===
        "function"
    ) {

        try {

            await window.loadLeads(
                1
            );

        } catch (error) {

            console.error(
                "Load leads error:",
                error
            );
        }
    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ============================================================
// SHOW SALES
// ============================================================

async function showSales() {

    if (!dashboardIsAdmin()) {

        if (
            typeof window.showToast ===
            "function"
        ) {

            window.showToast(
                "Only Admin can access Sales Management.",
                "warning"
            );

        } else {

            alert(
                "Access denied."
            );
        }

        return;
    }


    dashboardShowPage(
        "sales"
    );


    dashboardSetPageTitle(
        "Manage Sales"
    );


    dashboardSetActiveNav(
        "sales"
    );


    if (
        typeof window.loadSalesUsers ===
        "function"
    ) {

        try {

            await window.loadSalesUsers();

        } catch (error) {

            console.error(
                "Load Sales users error:",
                error
            );
        }
    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ============================================================
// SHOW CUSTOMER PROFILE
// ============================================================

async function showCustomerProfile() {

    dashboardShowPage(
        "customerProfile"
    );


    dashboardSetPageTitle(
        "Customer Profile"
    );


    dashboardSetActiveNav(
        "customerProfile"
    );


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ============================================================
// DASHBOARD QUERY
// ============================================================

async function dashboardFetchLeads() {

    if (
        typeof supabaseClient ===
        "undefined" ||
        !supabaseClient
    ) {

        throw new Error(
            "Supabase client belum siap."
        );
    }


    const profile =
        dashboardGetProfile();


    if (!profile) {
        return [];
    }


    // --------------------------------------------------------
    // IMPORTANT
    // --------------------------------------------------------
    // RLS Supabase tetap menjadi lapisan keamanan utama.
    //
    // Admin akan mendapatkan data yang diizinkan Admin.
    // Sales hanya mendapatkan data miliknya jika RLS
    // pada tabel leads sudah dikonfigurasi dengan benar.
    // --------------------------------------------------------

    const {
        data,
        error
    } = await supabaseClient
        .from("leads")
        .select(
            [
                "id",
                "customer_name",
                "status",
                "appointment",
                "site_survey",
                "quotation",
                "spk",
                "closing",
                "follow_up_date",
                "sales_id",
                "created_at"
            ].join(",")
        );


    if (error) {
        throw error;
    }


    return Array.isArray(data)
        ? data
        : [];
}


// ============================================================
// CALCULATE DASHBOARD STATS
// ============================================================

function calculateDashboardStats(
    data
) {

    const list =
        Array.isArray(data)
            ? data
            : [];


    return {

        total:
            list.length,

        new:
            typeof countNormalizedStatus ===
            "function"
                ? countNormalizedStatus(
                    list,
                    "New"
                )
                : list.filter(
                    item =>
                        normalizeLeadStatus(
                            item.status
                        ) === "New"
                ).length,

        flyerSent:
            typeof countNormalizedStatus ===
            "function"
                ? countNormalizedStatus(
                    list,
                    "Flyer Sent"
                )
                : 0,

        interested:
            typeof countNormalizedStatus ===
            "function"
                ? countNormalizedStatus(
                    list,
                    "Interested"
                )
                : 0,

        followUp:
            typeof countNormalizedStatus ===
            "function"
                ? countNormalizedStatus(
                    list,
                    "Follow Up"
                )
                : 0,

        appointment:
            typeof countDateField ===
            "function"
                ? countDateField(
                    list,
                    "appointment"
                )
                : 0,

        siteSurvey:
            typeof countDateField ===
            "function"
                ? countDateField(
                    list,
                    "site_survey"
                )
                : 0,

        quotation:
            typeof countDateField ===
            "function"
                ? countDateField(
                    list,
                    "quotation"
                )
                : 0,

        spk:
            typeof countDateField ===
            "function"
                ? countDateField(
                    list,
                    "spk"
                )
                : 0,

        closing:
            typeof countClosing ===
            "function"
                ? countClosing(
                    list
                )
                : list.filter(
                    item =>
                        normalizeLeadStatus(
                            item.status
                        ) ===
                        "Closing"
                ).length,

        notInterested:
            typeof countNormalizedStatus ===
            "function"
                ? countNormalizedStatus(
                    list,
                    "Not Interested"
                )
                : 0
    };
}


// ============================================================
// UPDATE DASHBOARD CARDS
// ============================================================

function renderDashboardStats(
    stats
) {

    if (!stats) {
        return;
    }


    const statMap = {

        statTotal:
            stats.total,

        statNew:
            stats.new,

        statFlyerSent:
            stats.flyerSent,

        statInterested:
            stats.interested,

        statFollowUp:
            stats.followUp,

        statAppointment:
            stats.appointment,

        statSiteSurvey:
            stats.siteSurvey,

        statQuotation:
            stats.quotation,

        statSPK:
            stats.spk,

        statClosing:
            stats.closing,

        statNotInterested:
            stats.notInterested
    };


    Object.entries(
        statMap
    ).forEach(
        ([id, value]) => {

            if (
                typeof window.setText ===
                "function"
            ) {

                window.setText(
                    id,
                    value
                );

            } else {

                const element =
                    document.getElementById(
                        id
                    );

                if (element) {
                    element.textContent =
                        value;
                }
            }
        }
    );


    // --------------------------------------------------------
    // Alternative IDs
    // --------------------------------------------------------

    const alternatives = {

        totalLeads:
            stats.total,

        newLeads:
            stats.new,

        interestedLeads:
            stats.interested,

        followUpLeads:
            stats.followUp,

        appointmentLeads:
            stats.appointment,

        siteSurveyLeads:
            stats.siteSurvey,

        quotationLeads:
            stats.quotation,

        closingLeads:
            stats.closing
    };


    Object.entries(
        alternatives
    ).forEach(
        ([id, value]) => {

            const element =
                document.getElementById(
                    id
                );

            if (element) {
                element.textContent =
                    value;
            }
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
        return;
    }


    if (dashboardLoading) {
        return;
    }


    dashboardLoading = true;


    try {

        const data =
            await dashboardFetchLeads();


        const stats =
            calculateDashboardStats(
                data
            );


        renderDashboardStats(
            stats
        );


        // ----------------------------------------------------
        // Save dashboard state
        // ----------------------------------------------------

        window.FSIDashboard.stats =
            stats;

        window.FSIDashboard.data =
            data;


        dashboardInitialized =
            true;


        // ----------------------------------------------------
        // Optional callbacks
        // ----------------------------------------------------

        if (
            typeof window.renderDashboardCharts ===
            "function"
        ) {

            try {

                window.renderDashboardCharts(
                    data,
                    stats
                );

            } catch (error) {

                console.warn(
                    "Dashboard chart render error:",
                    error
                );
            }
        }


        if (
            typeof window.renderDashboardRecentLeads ===
            "function"
        ) {

            try {

                window.renderDashboardRecentLeads(
                    data
                );

            } catch (error) {

                console.warn(
                    "Dashboard recent leads error:",
                    error
                );
            }
        }


    } catch (error) {

        console.error(
            "Dashboard update error:",
            error
        );


        const message =
            typeof window.getSupabaseErrorMessage ===
            "function"
                ? window.getSupabaseErrorMessage(
                    error,
                    "Gagal memuat dashboard."
                )
                : (
                    error?.message ||
                    "Gagal memuat dashboard."
                );


        console.error(
            "Dashboard message:",
            message
        );


        // Jangan menghapus angka lama kalau
        // refresh gagal.
        // Tampilkan pesan hanya jika ada
        // elemen error khusus.

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

    } finally {

        dashboardLoading =
            false;

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
// NAVIGATION COMPATIBILITY
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

window.calculateDashboardStats =
    calculateDashboardStats;

window.renderDashboardStats =
    renderDashboardStats;


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

        calculateDashboardStats,
        renderDashboardStats
    }
);


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        try {

            dashboardInitialized =
                false;

            console.log(
                "FSI CRM dashboard.js loaded successfully."
            );

        } catch (error) {

            console.error(
                "Dashboard initialization error:",
                error
            );
        }
    }
);
