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
// - Pipeline summary
// - Recent leads / activities
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
// GET SUPABASE CLIENT
// ============================================================

function dashboardGetSupabase() {

    if (
        typeof window.supabaseClient !== "undefined" &&
        window.supabaseClient
    ) {
        return window.supabaseClient;
    }

    if (
        typeof supabaseClient !== "undefined" &&
        supabaseClient
    ) {
        return supabaseClient;
    }

    return null;
}


// ============================================================
// GET CURRENT PROFILE
// ============================================================

function dashboardGetProfile() {

    if (
        typeof window.currentProfile !== "undefined" &&
        window.currentProfile
    ) {
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

    if (
        typeof window.currentUser !== "undefined" &&
        window.currentUser
    ) {
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
// NORMALIZE ROLE
// ============================================================

function dashboardNormalizeRole(role) {

    if (
        typeof window.authNormalizeRole ===
        "function"
    ) {
        return window.authNormalizeRole(role);
    }

    if (
        typeof window.normalizeRole ===
        "function"
    ) {
        return window.normalizeRole(role);
    }

    return String(role || "")
        .trim()
        .toLowerCase();
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
        dashboardNormalizeRole(
            profile.role
        );

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
        dashboardNormalizeRole(
            profile.role
        );

    return (
        role === "sales" ||
        role === "salesperson"
    );
}


// ============================================================
// PAGE ELEMENT FINDER
// ============================================================

function dashboardFindPage(type) {

    const pageMap = {

        dashboard: [
            "view-dashboard",
            "dashboardPage",
            "dashboard-page",
            "dashboard-view"
        ],

        leads: [
            "view-leads",
            "leadsPage",
            "leads-page",
            "leads-view"
        ],

        sales: [
            "view-sales",
            "salesPage",
            "sales-page",
            "sales-view"
        ],

        customerProfile: [
            "view-customer-profile",
            "customerProfilePage",
            "customer-profile-page",
            "customer-profile-view"
        ]
    };


    const ids =
        pageMap[type] || [];


    for (
        const id of ids
    ) {

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
}


// ============================================================
// SHOW PAGE
// ============================================================

function dashboardShowPage(type) {

    hideAllPages();


    const page =
        dashboardFindPage(type);


    if (!page) {

        console.warn(
            `FSI CRM: page "${type}" tidak ditemukan.`
        );

        return null;
    }


    page.classList.remove(
        "hidden"
    );


    page.style.display = "";


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

function dashboardSetPageTitle(title) {

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
        "current-page-title",
        "pageTitle",
        "page-title"
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
// PAGE DESCRIPTION
// ============================================================

function dashboardSetPageDescription(
    description
) {

    const element =
        document.getElementById(
            "current-page-description"
        );

    if (element) {

        element.textContent =
            description || "";
    }
}


// ============================================================
// UPDATE ACTIVE NAVIGATION
// ============================================================

function dashboardSetActiveNav(target) {

    const links =
        document.querySelectorAll(
            [
                ".nav-link",
                ".nav-dropdown-item",
                "[data-page]",
                "[data-view]",
                "[data-nav]",
                "[data-crm-nav]"
            ].join(",")
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

        `[data-nav="${target}"]`,

        `[data-crm-nav="${target}"]`
    ];


    selectors.forEach(
        selector => {

            document
                .querySelectorAll(
                    selector
                )
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
            "FSI CRM: profile belum siap, dashboard tidak dibuka."
        );

        return;
    }


    dashboardShowPage(
        "dashboard"
    );


    dashboardSetPageTitle(
        "Dashboard"
    );


    dashboardSetPageDescription(
        dashboardIsAdmin()
            ? "Overview seluruh aktivitas dan pipeline sales."
            : "Overview aktivitas dan pipeline customer Anda."
    );


    dashboardSetActiveNav(
        "dashboard"
    );


    await updateDashboard();


    dashboardScrollTop();
}


// ============================================================
// SHOW LEADS
// ============================================================

async function showLeads() {

    const profile =
        dashboardGetProfile();


    if (!profile) {

        console.warn(
            "FSI CRM: profile belum siap, leads tidak dibuka."
        );

        return;
    }


    dashboardShowPage(
        "leads"
    );


    const isAdmin =
        dashboardIsAdmin();


    dashboardSetPageTitle(
        isAdmin
            ? "All Leads"
            : "My Leads"
    );


    dashboardSetPageDescription(
        isAdmin
            ? "Kelola seluruh database customer dan lead."
            : "Kelola database customer dan lead Anda."
    );


    dashboardSetActiveNav(
        "leads"
    );


    // --------------------------------------------------------
    // LOAD FILTER OPTIONS
    // --------------------------------------------------------

    if (
        typeof window.loadFilterOptions ===
        "function"
    ) {

        try {

            await window.loadFilterOptions();

        } catch (error) {

            console.error(
                "FSI CRM: load filter options error:",
                error
            );
        }
    }


    // --------------------------------------------------------
    // LOAD LEADS
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
                "FSI CRM: load leads error:",
                error
            );
        }
    }


    dashboardScrollTop();
}


// ============================================================
// SHOW SALES MANAGEMENT
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


    dashboardSetPageDescription(
        "Kelola user Sales, status akun, dan akses tim."
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
                "FSI CRM: load Sales users error:",
                error
            );
        }
    }


    dashboardScrollTop();
}


// ============================================================
// SHOW CUSTOMER PROFILE
// ============================================================

async function showCustomerProfile() {

    const profile =
        dashboardGetProfile();


    if (!profile) {
        return;
    }


    dashboardShowPage(
        "customerProfile"
    );


    dashboardSetPageTitle(
        "Customer Profile"
    );


    dashboardSetPageDescription(
        "Detail customer, pipeline, aktivitas, dan follow-up."
    );


    dashboardSetActiveNav(
        "customerProfile"
    );


    dashboardScrollTop();
}


// ============================================================
// SCROLL TOP
// ============================================================

function dashboardScrollTop() {

    try {

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    } catch (error) {

        window.scrollTo(
            0,
            0
        );
    }
}


// ============================================================
// DASHBOARD QUERY
// ============================================================

async function dashboardFetchLeads() {

    const client =
        dashboardGetSupabase();


    if (!client) {

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
    // SECURITY NOTE
    // --------------------------------------------------------
    // Frontend role checking bukan security utama.
    //
    // Supabase RLS WAJIB memastikan:
    //
    // Admin:
    //   dapat membaca seluruh leads.
    //
    // Sales:
    //   hanya dapat membaca leads miliknya.
    //
    // Query di bawah sengaja tidak melakukan filter
    // sales_id untuk Sales agar RLS menjadi sumber
    // pembatasan data.
    // --------------------------------------------------------

    const {
        data,
        error
    } = await client
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
        )
        .order(
            "created_at",
            {
                ascending: false
            }
        );


    if (error) {
        throw error;
    }


    return Array.isArray(data)
        ? data
        : [];
}


// ============================================================
// NORMALIZE STATUS
// ============================================================

function dashboardNormalizeStatus(status) {

    if (
        typeof window.normalizeLeadStatus ===
        "function"
    ) {

        return window.normalizeLeadStatus(
            status
        );
    }


    return String(status || "")
        .trim();
}


// ============================================================
// CHECK DATE VALUE
// ============================================================

function dashboardHasValue(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return false;
    }


    if (
        typeof value === "string"
    ) {

        return value.trim() !== "";
    }


    return true;
}


// ============================================================
// COUNT STATUS
// ============================================================

function dashboardCountStatus(
    list,
    status
) {

    if (
        typeof window.countNormalizedStatus ===
        "function"
    ) {

        return window.countNormalizedStatus(
            list,
            status
        );
    }


    return list.filter(
        item =>
            dashboardNormalizeStatus(
                item.status
            ) === status
    ).length;
}


// ============================================================
// COUNT DATE FIELD
// ============================================================

function dashboardCountDateField(
    list,
    field
) {

    if (
        typeof window.countDateField ===
        "function"
    ) {

        return window.countDateField(
            list,
            field
        );
    }


    return list.filter(
        item =>
            dashboardHasValue(
                item[field]
            )
    ).length;
}


// ============================================================
// COUNT CLOSING
// ============================================================

function dashboardCountClosing(list) {

    if (
        typeof window.countClosing ===
        "function"
    ) {

        return window.countClosing(
            list
        );
    }


    return list.filter(
        item => {

            const status =
                dashboardNormalizeStatus(
                    item.status
                );

            return (
                status === "Closing" ||
                dashboardHasValue(
                    item.closing
                )
            );
        }
    ).length;
}


// ============================================================
// CALCULATE DASHBOARD STATS
// ============================================================

function calculateDashboardStats(data) {

    const list =
        Array.isArray(data)
            ? data
            : [];


    return {

        total:
            list.length,


        new:
            dashboardCountStatus(
                list,
                "New"
            ),


        flyerSent:
            dashboardCountStatus(
                list,
                "Flyer Sent"
            ),


        interested:
            dashboardCountStatus(
                list,
                "Interested"
            ),


        followUp:
            dashboardCountStatus(
                list,
                "Follow Up"
            ),


        appointment:
            dashboardCountDateField(
                list,
                "appointment"
            ),


        siteSurvey:
            dashboardCountDateField(
                list,
                "site_survey"
            ),


        quotation:
            dashboardCountDateField(
                list,
                "quotation"
            ),


        spk:
            dashboardCountDateField(
                list,
                "spk"
            ),


        closing:
            dashboardCountClosing(
                list
            ),


        notInterested:
            dashboardCountStatus(
                list,
                "Not Interested"
            )
    };
}


// ============================================================
// UPDATE DASHBOARD CARDS
// ============================================================

function renderDashboardStats(stats) {

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

                return;
            }


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


    // --------------------------------------------------------
    // LEGACY IDs
    // --------------------------------------------------------

    const alternatives = {

        totalLeads:
            stats.total,

        newLeads:
            stats.new,

        flyerSentLeads:
            stats.flyerSent,

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

        spkLeads:
            stats.spk,

        closingLeads:
            stats.closing,

        notInterestedLeads:
            stats.notInterested
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
// RENDER PIPELINE
// ============================================================

function renderDashboardPipeline(
    data
) {

    const container =
        document.getElementById(
            "dashboard-pipeline"
        );


    if (!container) {
        return;
    }


    const list =
        Array.isArray(data)
            ? data
            : [];


    const stages = [

        {
            label: "New",
            className: "status-new"
        },

        {
            label: "Flyer Sent",
            className: "status-flyer"
        },

        {
            label: "Interested",
            className: "status-interested"
        },

        {
            label: "Follow Up",
            className: "status-follow-up"
        },

        {
            label: "Appointment",
            className: "status-appointment"
        },

        {
            label: "Site Survey",
            className: "status-site-survey"
        },

        {
            label: "Quotation",
            className: "status-quotation"
        },

        {
            label: "Closing",
            className: "status-closing"
        },

        {
            label: "Not Interested",
            className: "status-not-interested"
        }
    ];


    const html =
        stages.map(
            stage => {

                let count = 0;


                if (
                    stage.label ===
                    "Appointment"
                ) {

                    count =
                        dashboardCountDateField(
                            list,
                            "appointment"
                        );

                } else if (
                    stage.label ===
                    "Site Survey"
                ) {

                    count =
                        dashboardCountDateField(
                            list,
                            "site_survey"
                        );

                } else if (
                    stage.label ===
                    "Quotation"
                ) {

                    count =
                        dashboardCountDateField(
                            list,
                            "quotation"
                        );

                } else if (
                    stage.label ===
                    "Closing"
                ) {

                    count =
                        dashboardCountClosing(
                            list
                        );

                } else {

                    count =
                        dashboardCountStatus(
                            list,
                            stage.label
                        );
                }


                return `
                    <div class="pipeline-item">
                        <div class="pipeline-item-main">
                            <span class="pipeline-status ${stage.className}">
                                ${dashboardEscapeHTML(stage.label)}
                            </span>
                        </div>

                        <strong class="pipeline-count">
                            ${count}
                        </strong>
                    </div>
                `;
            }
        ).join("");


    container.innerHTML =
        html;


    if (
        typeof window.refreshIcons ===
        "function"
    ) {

        window.refreshIcons();
    }
}


// ============================================================
// RENDER RECENT LEADS
// ============================================================

function renderDashboardRecentLeads(
    data
) {

    const container =
        document.getElementById(
            "dashboard-activities"
        );


    if (!container) {
        return;
    }


    const list =
        Array.isArray(data)
            ? data
            : [];


    const recent =
        [...list]
            .sort(
                (
                    a,
                    b
                ) => {

                    const dateA =
                        new Date(
                            a.created_at ||
                            0
                        ).getTime();

                    const dateB =
                        new Date(
                            b.created_at ||
                            0
                        ).getTime();

                    return dateB - dateA;
                }
            )
            .slice(
                0,
                8
            );


    if (!recent.length) {

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i data-lucide="inbox"></i>
                </div>

                <h4>No recent leads</h4>

                <p>
                    Belum ada data customer terbaru.
                </p>
            </div>
        `;


        if (
            typeof window.refreshIcons ===
            "function"
        ) {

            window.refreshIcons();
        }

        return;
    }


    container.innerHTML =
        recent.map(
            lead => {

                const name =
                    lead.customer_name ||
                    "Unnamed Customer";


                const status =
                    dashboardNormalizeStatus(
                        lead.status
                    ) ||
                    "New";


                const statusClass =
                    typeof window.getStatusClass ===
                    "function"
                        ? window.getStatusClass(
                            status
                        )
                        : "status-new";


                const date =
                    typeof window.formatDateTime ===
                    "function"
                        ? window.formatDateTime(
                            lead.created_at
                        )
                        : (
                            lead.created_at
                                ? new Date(
                                    lead.created_at
                                ).toLocaleString(
                                    "id-ID"
                                )
                                : "-"
                        );


                return `
                    <div class="activity-item">
                        <div class="activity-icon">
                            <i data-lucide="user-plus"></i>
                        </div>

                        <div class="activity-content">
                            <div class="activity-title">
                                ${dashboardEscapeHTML(name)}
                            </div>

                            <div class="activity-meta">
                                <span class="status-badge ${statusClass}">
                                    ${dashboardEscapeHTML(status)}
                                </span>

                                <span>
                                    ${dashboardEscapeHTML(date)}
                                </span>
                            </div>
                        </div>
                    </div>
                `;
            }
        ).join("");


    if (
        typeof window.refreshIcons ===
        "function"
    ) {

        window.refreshIcons();
    }
}


// ============================================================
// ESCAPE HTML
// ============================================================

function dashboardEscapeHTML(value) {

    if (
        typeof window.escapeHTML ===
        "function"
    ) {

        return window.escapeHTML(
            value
        );
    }


    const text =
        String(
            value ??
            ""
        );


    return text
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
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


    dashboardLoading =
        true;


    const dashboardPage =
        dashboardFindPage(
            "dashboard"
        );


    if (dashboardPage) {

        dashboardPage.classList.add(
            "dashboard-loading"
        );
    }


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


        renderDashboardPipeline(
            data
        );


        renderDashboardRecentLeads(
            data
        );


        // ----------------------------------------------------
        // SAVE DASHBOARD STATE
        // ----------------------------------------------------

        window.FSIDashboard.stats =
            stats;

        window.FSIDashboard.data =
            data;


        dashboardInitialized =
            true;


        // ----------------------------------------------------
        // OPTIONAL CUSTOM CALLBACK
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
                    "FSI CRM: dashboard chart render error:",
                    error
                );
            }
        }


        // ----------------------------------------------------
        // OPTIONAL CUSTOM RECENT LEADS CALLBACK
        // ----------------------------------------------------

        if (
            typeof window.renderDashboardRecentLeads ===
            "function" &&
            window.renderDashboardRecentLeads !==
            renderDashboardRecentLeads
        ) {

            try {

                window.renderDashboardRecentLeads(
                    data
                );

            } catch (error) {

                console.warn(
                    "FSI CRM: custom recent leads error:",
                    error
                );
            }
        }


        // ----------------------------------------------------
        // HIDE ERROR MESSAGE AFTER SUCCESS
        // ----------------------------------------------------

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


    } catch (error) {

        console.error(
            "FSI CRM: dashboard update error:",
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
            "FSI CRM: dashboard message:",
            message
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


        if (dashboardPage) {

            dashboardPage.classList.remove(
                "dashboard-loading"
            );
        }


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

        dashboardGetProfile,

        dashboardGetUser,

        dashboardIsAdmin,

        dashboardIsSales,

        isDashboardInitialized,

        isDashboardLoading
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
                "FSI CRM dashboard initialization error:",
                error
            );
        }
    }
);


// ============================================================
// PROFILE READY EVENT
// ============================================================

document.addEventListener(
    "fsi:profile-ready",
    function () {

        dashboardInitialized =
            false;

        console.log(
            "FSI CRM dashboard: profile ready."
        );
    }
);


// ============================================================
// APP READY EVENT
// ============================================================

document.addEventListener(
    "fsi:app-ready",
    function () {

        console.log(
            "FSI CRM dashboard: app ready."
        );
    }
);
