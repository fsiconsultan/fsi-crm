// ============================================================
// FSI CRM - DASHBOARD MODULE
// File: js/dashboard.js
// ============================================================
//
// Fungsi:
// - Dashboard navigation
// - Dashboard statistics
// - Load data leads dari Supabase
// - Admin / Sales access handling
// - Refresh dashboard
// - Pipeline summary
// - Recent leads / activities
// - Pagination data Supabase > 1000 rows
// - Modern + legacy page ID compatibility
// - Dashboard panel ID compatibility
// - View All -> Leads
// - Interactive statistic cards
// - Statistic popup / customer list
// - View All per statistic category
// - Search customer inside statistic popup
// ============================================================

"use strict";


// ============================================================
// DASHBOARD STATE
// ============================================================

window.FSIDashboard = window.FSIDashboard || {};

let dashboardLoading = false;
let dashboardInitialized = false;
let dashboardData = [];
let dashboardStats = null;

const DASHBOARD_BATCH_SIZE = 1000;


// ============================================================
// STATISTIC POPUP STATE
// ============================================================

let dashboardStatPopupBound = false;
let dashboardStatPopupElement = null;
let dashboardStatPopupCurrentCategory = "total";
let dashboardStatPopupCurrentData = [];
let dashboardStatPopupShowingAll = false;
let dashboardStatPopupSearchTerm = "";


// ============================================================
// GET SUPABASE CLIENT
// ============================================================

function dashboardGetSupabase() {

    try {

        if (
            window.supabaseClient &&
            typeof window.supabaseClient.from === "function"
        ) {
            return window.supabaseClient;
        }

    } catch (error) {

        console.warn(
            "FSI CRM: window.supabaseClient error:",
            error
        );
    }


    try {

        if (
            typeof supabaseClient !== "undefined" &&
            supabaseClient &&
            typeof supabaseClient.from === "function"
        ) {
            return supabaseClient;
        }

    } catch (error) {

        console.warn(
            "FSI CRM: supabaseClient error:",
            error
        );
    }


    return null;
}


// ============================================================
// GET CURRENT PROFILE
// ============================================================

function dashboardGetProfile() {

    try {

        if (
            window.currentProfile &&
            typeof window.currentProfile === "object"
        ) {
            return window.currentProfile;
        }

    } catch (error) {
        // ignore
    }


    try {

        if (
            typeof currentProfile !== "undefined" &&
            currentProfile
        ) {
            return currentProfile;
        }

    } catch (error) {
        // ignore
    }


    return null;
}


// ============================================================
// GET CURRENT USER
// ============================================================

function dashboardGetUser() {

    try {

        if (
            window.currentUser &&
            typeof window.currentUser === "object"
        ) {
            return window.currentUser;
        }

    } catch (error) {
        // ignore
    }


    try {

        if (
            typeof currentUser !== "undefined" &&
            currentUser
        ) {
            return currentUser;
        }

    } catch (error) {
        // ignore
    }


    return null;
}


// ============================================================
// NORMALIZE ROLE
// ============================================================

function dashboardNormalizeRole(role) {

    if (
        typeof window.authNormalizeRole === "function"
    ) {

        return window.authNormalizeRole(role);
    }


    if (
        typeof window.normalizeRole === "function"
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


            element.classList.remove(
                "active"
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

    const page =
        dashboardFindPage(type);


    if (!page) {

        console.warn(
            `FSI CRM: page "${type}" tidak ditemukan.`
        );

        return null;
    }


    /*
     * Jangan menggunakan navigation.js secara paksa di sini.
     * Dashboard harus tetap bisa dibuka walaupun module
     * navigation belum selesai melakukan binding.
     */

    hideAllPages();


    page.classList.remove(
        "hidden"
    );


    page.classList.add(
        "active"
    );


    page.style.display =
        "block";


    page.style.visibility =
        "visible";


    page.style.opacity =
        "1";


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
        typeof window.setPageTitle === "function"
    ) {

        window.setPageTitle(title);

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

    const ids = [
        "current-page-description",
        "pageDescription",
        "page-description"
    ];


    for (
        const id of ids
    ) {

        const element =
            document.getElementById(id);


        if (element) {

            element.textContent =
                description || "";

            return;
        }
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
            "FSI CRM: profile belum siap. Dashboard belum dapat dimuat."
        );

        return;
    }


    const page =
        dashboardShowPage(
            "dashboard"
        );


    if (!page) {
        return;
    }


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


    /*
     * Pastikan kartu statistik tetap interactive
     * setiap kali Dashboard dibuka.
     */

    dashboardBindStatCardClicks();


    /*
     * Selalu refresh ketika Dashboard dibuka.
     * Jadi jika ada lead baru, angka langsung berubah.
     */

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


    const page =
        dashboardShowPage(
            "leads"
        );


    if (!page) {
        return;
    }


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


    if (
        typeof window.loadFilterOptions === "function"
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


    if (
        typeof window.loadLeads === "function"
    ) {

        try {

            await window.loadLeads(1);

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
            typeof window.showToast === "function"
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


    const page =
        dashboardShowPage(
            "sales"
        );


    if (!page) {
        return;
    }


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
        typeof window.loadSalesUsers === "function"
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


    const page =
        dashboardShowPage(
            "customerProfile"
        );


    if (!page) {
        return;
    }


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

        throw new Error(
            "Profile user belum siap."
        );
    }


    const isAdmin =
        dashboardIsAdmin();


    const isSales =
        dashboardIsSales();


    /*
     * ========================================================
     * QUERY DASAR
     * ========================================================
     *
     * Kita gunakan select("*") supaya Dashboard tidak gagal
     * hanya karena ada field tambahan pada tabel leads.
     */

    async function fetchBatch(
        from,
        to
    ) {

        let query =
            client
                .from("leads")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                )
                .range(
                    from,
                    to
                );


        /*
         * SALES:
         *
         * Dashboard Sales hanya mengambil leads miliknya.
         *
         * Admin:
         * tidak diberi filter sales_id.
         */

        if (
            isSales &&
            !isAdmin
        ) {

            if (!profile.id) {

                throw new Error(
                    "ID profile Sales tidak ditemukan."
                );
            }


            query =
                query.eq(
                    "sales_id",
                    profile.id
                );
        }


        const {
            data,
            error
        } = await query;


        if (error) {
            throw error;
        }


        return Array.isArray(data)
            ? data
            : [];
    }


    /*
     * ========================================================
     * LOAD BERTAHAP
     * ========================================================
     *
     * Supabase biasanya membatasi hasil query.
     * Kita ambil 1.000 row per batch sampai data habis.
     */

    const allLeads = [];

    let start =
        0;


    while (true) {

        const end =
            start +
            DASHBOARD_BATCH_SIZE -
            1;


        const batch =
            await fetchBatch(
                start,
                end
            );


        if (!batch.length) {
            break;
        }


        allLeads.push(
            ...batch
        );


        /*
         * Jika jumlah batch kurang dari 1000,
         * berarti sudah sampai data terakhir.
         */

        if (
            batch.length <
            DASHBOARD_BATCH_SIZE
        ) {
            break;
        }


        start +=
            DASHBOARD_BATCH_SIZE;


        /*
         * Pengaman agar tidak terjadi loop tidak terbatas.
         */

        if (
            start >
            1000000
        ) {

            console.warn(
                "FSI CRM: Dashboard berhenti setelah membaca 1.000.000 leads."
            );

            break;
        }
    }


    console.log(
        "FSI CRM Dashboard: leads berhasil dimuat:",
        allLeads.length,
        {
            role: profile.role,
            profileId: profile.id,
            admin: isAdmin,
            sales: isSales
        }
    );


    return allLeads;
}


// ============================================================
// NORMALIZE STATUS
// ============================================================

function dashboardNormalizeStatus(status) {

    if (
        typeof window.normalizeLeadStatus === "function"
    ) {

        return window.normalizeLeadStatus(
            status
        );
    }


    return String(status || "")
        .trim();
}


// ============================================================
// CHECK VALUE
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
        typeof window.countNormalizedStatus === "function"
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
        typeof window.countDateField === "function"
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

function dashboardCountClosing(
    list
) {

    if (
        typeof window.countClosing === "function"
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
// SET ELEMENT TEXT
// ============================================================

function dashboardSetElementText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (!element) {
        return;
    }


    element.textContent =
        String(
            value ?? 0
        );
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
                typeof window.setText === "function"
            ) {

                window.setText(
                    id,
                    value
                );
            }


            /*
             * Pastikan langsung di-set juga.
             */

            dashboardSetElementText(
                id,
                value
            );
        }
    );


    /*
     * ========================================================
     * LEGACY IDs
     * ========================================================
     */

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

            dashboardSetElementText(
                id,
                value
            );
        }
    );


    /*
     * Setelah angka dirender,
     * pastikan semua kartu kembali interactive.
     */

    dashboardBindStatCardClicks();
}


// ============================================================
// FIND STAT CARD ELEMENT
// ============================================================

function dashboardFindStatCardElement(
    statElement
) {

    if (!statElement) {
        return null;
    }


    /*
     * Support beberapa kemungkinan class
     * yang mungkin digunakan oleh index.html.
     */

    const directCard =
        statElement.closest(
            [
                "[data-stat-card]",
                ".stat-card",
                ".dashboard-stat-card",
                ".stat-item",
                ".stat-box",
                ".stats-card"
            ].join(",")
        );


    if (directCard) {
        return directCard;
    }


    /*
     * Fallback:
     * cari parent terdekat yang class-nya mengandung
     * kata "stat".
     */

    let parent =
        statElement.parentElement;


    let level =
        0;


    while (
        parent &&
        level < 5
    ) {

        const className =
            typeof parent.className === "string"
                ? parent.className
                : "";


        if (
            /\bstat\b/i.test(className) ||
            /stat-card/i.test(className) ||
            /stat-item/i.test(className) ||
            /stat-box/i.test(className)
        ) {

            return parent;
        }


        parent =
            parent.parentElement;


        level++;
    }


    /*
     * Jika struktur HTML sangat berbeda,
     * gunakan elemen angka sebagai target.
     */

    return statElement;
}


// ============================================================
// STAT POPUP CATEGORY CONFIG
// ============================================================

const DASHBOARD_STAT_CATEGORIES = {

    total: {

        statId: "statTotal",

        legacyIds: [
            "totalLeads"
        ],

        title: "All Leads",

        description:
            "Seluruh customer dan lead yang dapat Anda akses.",

        icon: "users",

        filterType: "all"
    },


    new: {

        statId: "statNew",

        legacyIds: [
            "newLeads"
        ],

        title: "New Leads",

        description:
            "Customer dengan status New.",

        icon: "sparkles",

        filterType: "status",

        value: "New"
    },


    flyerSent: {

        statId: "statFlyerSent",

        legacyIds: [
            "flyerSentLeads"
        ],

        title: "Flyer Sent",

        description:
            "Customer dengan status Flyer Sent.",

        icon: "send",

        filterType: "status",

        value: "Flyer Sent"
    },


    interested: {

        statId: "statInterested",

        legacyIds: [
            "interestedLeads"
        ],

        title: "Interested Leads",

        description:
            "Customer dengan status Interested.",

        icon: "heart",

        filterType: "status",

        value: "Interested"
    },


    followUp: {

        statId: "statFollowUp",

        legacyIds: [
            "followUpLeads"
        ],

        title: "Follow Up",

        description:
            "Customer dengan status Follow Up.",

        icon: "phone-call",

        filterType: "status",

        value: "Follow Up"
    },


    appointment: {

        statId: "statAppointment",

        legacyIds: [
            "appointmentLeads"
        ],

        title: "Appointment",

        description:
            "Customer yang memiliki jadwal appointment.",

        icon: "calendar-check",

        filterType: "field",

        value: "appointment"
    },


    siteSurvey: {

        statId: "statSiteSurvey",

        legacyIds: [
            "siteSurveyLeads"
        ],

        title: "Site Survey",

        description:
            "Customer yang memiliki jadwal site survey.",

        icon: "map-pin",

        filterType: "field",

        value: "site_survey"
    },


    quotation: {

        statId: "statQuotation",

        legacyIds: [
            "quotationLeads"
        ],

        title: "Quotation",

        description:
            "Customer yang memiliki quotation.",

        icon: "file-text",

        filterType: "field",

        value: "quotation"
    },


    spk: {

        statId: "statSPK",

        legacyIds: [
            "spkLeads"
        ],

        title: "SPK",

        description:
            "Customer yang memiliki SPK.",

        icon: "file-check",

        filterType: "field",

        value: "spk"
    },


    closing: {

        statId: "statClosing",

        legacyIds: [
            "closingLeads"
        ],

        title: "Closing",

        description:
            "Customer yang sudah mencapai Closing.",

        icon: "badge-check",

        filterType: "closing"
    },


    notInterested: {

        statId: "statNotInterested",

        legacyIds: [
            "notInterestedLeads"
        ],

        title: "Not Interested",

        description:
            "Customer dengan status Not Interested.",

        icon: "x-circle",

        filterType: "status",

        value: "Not Interested"
    }
};


// ============================================================
// GET STAT CATEGORY FROM ELEMENT
// ============================================================

function dashboardGetStatCategoryFromElement(
    element
) {

    if (!element) {
        return null;
    }


    const statId =
        element.id;


    for (
        const [
            category,
            config
        ]
        of Object.entries(
            DASHBOARD_STAT_CATEGORIES
        )
    ) {

        if (
            config.statId === statId
        ) {

            return category;
        }


        if (
            Array.isArray(
                config.legacyIds
            ) &&
            config.legacyIds.includes(
                statId
            )
        ) {

            return category;
        }
    }


    return null;
}


// ============================================================
// FILTER DATA FOR STAT CATEGORY
// ============================================================

function dashboardFilterDataForStat(
    data,
    category
) {

    const list =
        Array.isArray(data)
            ? data
            : [];


    const config =
        DASHBOARD_STAT_CATEGORIES[
            category
        ];


    if (!config) {
        return [];
    }


    if (
        config.filterType === "all"
    ) {

        return [...list];
    }


    if (
        config.filterType === "status"
    ) {

        return list.filter(
            lead =>
                dashboardNormalizeStatus(
                    lead.status
                ) === config.value
        );
    }


    if (
        config.filterType === "field"
    ) {

        return list.filter(
            lead =>
                dashboardHasValue(
                    lead[
                        config.value
                    ]
                )
        );
    }


    if (
        config.filterType === "closing"
    ) {

        return list.filter(
            lead => {

                const status =
                    dashboardNormalizeStatus(
                        lead.status
                    );


                return (
                    status === "Closing" ||
                    dashboardHasValue(
                        lead.closing
                    )
                );
            }
        );
    }


    return [];
}


// ============================================================
// SORT POPUP LEADS
// ============================================================

function dashboardSortPopupLeads(
    list
) {

    return [
        ...(
            Array.isArray(list)
                ? list
                : []
        )
    ].sort(
        (
            a,
            b
        ) => {

            const dateA =
                new Date(
                    a.updated_at ||
                    a.created_at ||
                    0
                ).getTime();


            const dateB =
                new Date(
                    b.updated_at ||
                    b.created_at ||
                    0
                ).getTime();


            return dateB -
                dateA;
        }
    );
}


// ============================================================
// GET LEAD SALES NAME
// ============================================================
//
// Kita tidak mengasumsikan struktur sales tertentu.
// Jika data sudah memiliki sales_name / sales / sales_user_name,
// gunakan nilai tersebut.
// ============================================================

function dashboardGetLeadSalesName(
    lead
) {

    if (!lead) {
        return "-";
    }


    const possibleFields = [
        "sales_name",
        "sales",
        "sales_user_name",
        "sales_full_name",
        "assigned_sales_name"
    ];


    for (
        const field
        of possibleFields
    ) {

        if (
            dashboardHasValue(
                lead[field]
            )
        ) {

            return String(
                lead[field]
            );
        }
    }


    return "-";
}


// ============================================================
// FORMAT POPUP DATE
// ============================================================

function dashboardFormatPopupDate(
    value
) {

    if (!value) {
        return "-";
    }


    if (
        typeof window.formatDateTime === "function"
    ) {

        try {

            return window.formatDateTime(
                value
            );

        } catch (error) {
            // fallback
        }
    }


    try {

        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "-";
        }


        return date.toLocaleDateString(
            "id-ID",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

    } catch (error) {

        return "-";
    }
}


// ============================================================
// GET POPUP STATUS CLASS
// ============================================================

function dashboardGetPopupStatusClass(
    status
) {

    if (
        typeof window.getStatusClass === "function"
    ) {

        try {

            return window.getStatusClass(
                status
            );

        } catch (error) {
            // fallback
        }
    }


    const normalized =
        String(
            status || ""
        )
            .trim()
            .toLowerCase()
            .replace(
                /\s+/g,
                "-"
            );


    return (
        `status-${normalized}`
    );
}


// ============================================================
// CREATE STAT POPUP STYLES
// ============================================================
//
// Style dibuat dari JS supaya kita tidak perlu menyentuh
// CSS atau index.html pada tahap ini.
// ============================================================

function dashboardEnsureStatPopupStyles() {

    if (
        document.getElementById(
            "fsi-dashboard-stat-popup-styles"
        )
    ) {
        return;
    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "fsi-dashboard-stat-popup-styles";


    style.textContent = `

        .dashboard-stat-clickable {
            cursor: pointer !important;
            transition:
                transform 0.18s ease,
                box-shadow 0.18s ease,
                border-color 0.18s ease;
        }

        .dashboard-stat-clickable:hover {
            transform: translateY(-2px);
        }

        .dashboard-stat-clickable:focus-visible {
            outline: 2px solid currentColor;
            outline-offset: 3px;
        }

        .fsi-dashboard-stat-modal {
            position: fixed;
            inset: 0;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
        }

        .fsi-dashboard-stat-backdrop {
            position: absolute;
            inset: 0;
            background: rgba(15, 23, 42, 0.58);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
        }

        .fsi-dashboard-stat-dialog {
            position: relative;
            z-index: 2;
            width: min(760px, 100%);
            max-height: min(760px, calc(100vh - 48px));
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background: var(--card-bg, #ffffff);
            border: 1px solid rgba(148, 163, 184, 0.25);
            border-radius: 20px;
            box-shadow:
                0 25px 70px rgba(15, 23, 42, 0.25);
        }

        .fsi-dashboard-stat-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
            padding: 22px 24px 18px;
            border-bottom: 1px solid rgba(148, 163, 184, 0.18);
        }

        .fsi-dashboard-stat-title-wrap {
            min-width: 0;
        }

        .fsi-dashboard-stat-title-row {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .fsi-dashboard-stat-title-icon {
            width: 38px;
            height: 38px;
            flex: 0 0 38px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 12px;
            background: rgba(59, 130, 246, 0.10);
        }

        .fsi-dashboard-stat-title {
            margin: 0;
            font-size: 20px;
            font-weight: 700;
            line-height: 1.25;
        }

        .fsi-dashboard-stat-description {
            margin: 8px 0 0;
            color: #64748b;
            font-size: 13px;
            line-height: 1.5;
        }

        .fsi-dashboard-stat-close {
            width: 38px;
            height: 38px;
            flex: 0 0 38px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 0;
            border-radius: 10px;
            background: transparent;
            color: #64748b;
            cursor: pointer;
        }

        .fsi-dashboard-stat-close:hover {
            background: rgba(148, 163, 184, 0.12);
            color: #0f172a;
        }

        .fsi-dashboard-stat-toolbar {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 24px;
            border-bottom: 1px solid rgba(148, 163, 184, 0.14);
        }

        .fsi-dashboard-stat-search {
            width: 100%;
            min-width: 0;
            height: 42px;
            padding: 0 14px 0 42px;
            border: 1px solid rgba(148, 163, 184, 0.35);
            border-radius: 11px;
            background: rgba(248, 250, 252, 0.9);
            color: inherit;
            outline: none;
            font-size: 14px;
        }

        .fsi-dashboard-stat-search:focus {
            border-color: rgba(59, 130, 246, 0.55);
            box-shadow:
                0 0 0 3px rgba(59, 130, 246, 0.10);
        }

        .fsi-dashboard-stat-search-wrap {
            position: relative;
            flex: 1;
        }

        .fsi-dashboard-stat-search-icon {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: #94a3b8;
            pointer-events: none;
        }

        .fsi-dashboard-stat-count {
            flex: 0 0 auto;
            white-space: nowrap;
            padding: 8px 11px;
            border-radius: 999px;
            background: rgba(59, 130, 246, 0.09);
            color: #2563eb;
            font-size: 12px;
            font-weight: 700;
        }

        .fsi-dashboard-stat-list {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            padding: 8px 12px;
        }

        .fsi-dashboard-stat-row {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 14px 12px;
            border-bottom: 1px solid rgba(148, 163, 184, 0.12);
            border-radius: 12px;
        }

        .fsi-dashboard-stat-row:last-child {
            border-bottom: 0;
        }

        .fsi-dashboard-stat-row:hover {
            background: rgba(248, 250, 252, 0.9);
        }

        .fsi-dashboard-stat-avatar {
            width: 42px;
            height: 42px;
            flex: 0 0 42px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: linear-gradient(
                135deg,
                rgba(59, 130, 246, 0.15),
                rgba(99, 102, 241, 0.12)
            );
            color: #2563eb;
            font-size: 14px;
            font-weight: 700;
        }

        .fsi-dashboard-stat-main {
            flex: 1;
            min-width: 0;
        }

        .fsi-dashboard-stat-customer {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 14px;
            font-weight: 700;
        }

        .fsi-dashboard-stat-meta {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 6px 10px;
            margin-top: 5px;
            color: #64748b;
            font-size: 12px;
        }

        .fsi-dashboard-stat-meta-item {
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }

        .fsi-dashboard-stat-status {
            flex: 0 0 auto;
        }

        .fsi-dashboard-stat-empty {
            padding: 48px 24px;
            text-align: center;
            color: #64748b;
        }

        .fsi-dashboard-stat-empty-icon {
            width: 52px;
            height: 52px;
            margin: 0 auto 12px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 16px;
            background: rgba(148, 163, 184, 0.10);
            color: #94a3b8;
        }

        .fsi-dashboard-stat-empty-title {
            margin: 0;
            color: inherit;
            font-size: 15px;
            font-weight: 700;
        }

        .fsi-dashboard-stat-empty-text {
            margin: 6px 0 0;
            font-size: 13px;
        }

        .fsi-dashboard-stat-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 15px 24px;
            border-top: 1px solid rgba(148, 163, 184, 0.18);
        }

        .fsi-dashboard-stat-footer-info {
            color: #64748b;
            font-size: 12px;
        }

        .fsi-dashboard-stat-view-all {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            min-height: 40px;
            padding: 0 15px;
            border: 0;
            border-radius: 10px;
            background: #2563eb;
            color: #ffffff;
            cursor: pointer;
            font-size: 13px;
            font-weight: 700;
        }

        .fsi-dashboard-stat-view-all:hover {
            filter: brightness(0.96);
        }

        .fsi-dashboard-stat-view-all.is-secondary {
            background: rgba(37, 99, 235, 0.10);
            color: #2563eb;
        }

        @media (max-width: 640px) {

            .fsi-dashboard-stat-modal {
                align-items: flex-end;
                padding: 0;
            }

            .fsi-dashboard-stat-dialog {
                width: 100%;
                max-height: 92vh;
                border-radius: 20px 20px 0 0;
            }

            .fsi-dashboard-stat-header {
                padding: 18px;
            }

            .fsi-dashboard-stat-toolbar {
                padding: 12px 18px;
            }

            .fsi-dashboard-stat-list {
                padding: 6px 10px;
            }

            .fsi-dashboard-stat-footer {
                padding: 12px 18px;
            }

            .fsi-dashboard-stat-description {
                max-width: 260px;
            }

            .fsi-dashboard-stat-meta-item.sales-info {
                display: none;
            }
        }

    `;


    document.head.appendChild(
        style
    );
}


// ============================================================
// GET CUSTOMER INITIALS
// ============================================================

function dashboardGetCustomerInitials(
    name
) {

    const text =
        String(
            name ||
            "Customer"
        )
            .trim();


    if (!text) {
        return "C";
    }


    const parts =
        text
            .split(/\s+/)
            .filter(Boolean);


    if (
        parts.length === 1
    ) {

        return parts[0]
            .substring(
                0,
                2
            )
            .toUpperCase();
    }


    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();
}


// ============================================================
// RENDER STAT POPUP
// ============================================================

function dashboardRenderStatPopup() {

    if (
        !dashboardStatPopupElement
    ) {
        return;
    }


    const config =
        DASHBOARD_STAT_CATEGORIES[
            dashboardStatPopupCurrentCategory
        ];


    if (!config) {
        return;
    }


    const allCategoryData =
        dashboardStatPopupCurrentData;


    const searchTerm =
        String(
            dashboardStatPopupSearchTerm ||
            ""
        )
            .trim()
            .toLowerCase();


    let filtered =
        [...allCategoryData];


    if (searchTerm) {

        filtered =
            filtered.filter(
                lead => {

                    const values = [

                        lead.customer_name,

                        lead.phone,

                        lead.email,

                        lead.business,

                        lead.location,

                        lead.notes,

                        dashboardGetLeadSalesName(
                            lead
                        )
                    ];


                    return values.some(
                        value =>
                            String(
                                value ||
                                ""
                            )
                                .toLowerCase()
                                .includes(
                                    searchTerm
                                )
                    );
                }
            );
    }


    filtered =
        dashboardSortPopupLeads(
            filtered
        );


    /*
     * Default:
     * tampilkan beberapa customer dulu.
     *
     * View All:
     * tampilkan seluruh hasil kategori.
     */

    const displayLimit =
        dashboardStatPopupShowingAll
            ? filtered.length
            : Math.min(
                5,
                filtered.length
            );


    const visibleLeads =
        filtered.slice(
            0,
            displayLimit
        );


    const totalCategory =
        allCategoryData.length;


    const title =
        dashboardEscapeHTML(
            config.title
        );


    const description =
        dashboardEscapeHTML(
            config.description
        );


    const icon =
        dashboardEscapeHTML(
            config.icon
        );


    const searchValue =
        dashboardEscapeHTML(
            dashboardStatPopupSearchTerm
        );


    const footerText =
        dashboardStatPopupShowingAll

            ? `Menampilkan ${filtered.length} dari ${totalCategory} customer.`

            : (
                totalCategory > 5
                    ? `Menampilkan 5 dari ${totalCategory} customer.`
                    : `Menampilkan ${totalCategory} customer.`
            );


    let listHTML = "";


    if (!visibleLeads.length) {

        listHTML = `

            <div class="fsi-dashboard-stat-empty">

                <div class="fsi-dashboard-stat-empty-icon">
                    <i data-lucide="search-x"></i>
                </div>

                <p class="fsi-dashboard-stat-empty-title">
                    Customer tidak ditemukan
                </p>

                <p class="fsi-dashboard-stat-empty-text">
                    Coba gunakan kata pencarian lain.
                </p>

            </div>
        `;

    } else {

        listHTML =
            visibleLeads.map(
                lead => {

                    const customerName =
                        lead.customer_name ||
                        "Unnamed Customer";


                    const phone =
                        lead.phone ||
                        "-";


                    const email =
                        lead.email ||
                        "";


                    const business =
                        lead.business ||
                        "-";


                    const location =
                        lead.location ||
                        "";


                    const status =
                        dashboardNormalizeStatus(
                            lead.status
                        ) ||
                        "New";


                    const salesName =
                        dashboardGetLeadSalesName(
                            lead
                        );


                    const lastUpdate =
                        dashboardFormatPopupDate(
                            lead.updated_at ||
                            lead.created_at
                        );


                    const statusClass =
                        dashboardGetPopupStatusClass(
                            status
                        );


                    return `

                        <div class="fsi-dashboard-stat-row">

                            <div class="fsi-dashboard-stat-avatar">
                                ${dashboardEscapeHTML(
                                    dashboardGetCustomerInitials(
                                        customerName
                                    )
                                )}
                            </div>


                            <div class="fsi-dashboard-stat-main">

                                <div class="fsi-dashboard-stat-customer">
                                    ${dashboardEscapeHTML(
                                        customerName
                                    )}
                                </div>


                                <div class="fsi-dashboard-stat-meta">

                                    <span class="fsi-dashboard-stat-meta-item">
                                        <i
                                            data-lucide="briefcase-business"
                                            width="13"
                                            height="13"
                                        ></i>

                                        ${dashboardEscapeHTML(
                                            business
                                        )}
                                    </span>


                                    <span class="fsi-dashboard-stat-meta-item">
                                        <i
                                            data-lucide="phone"
                                            width="13"
                                            height="13"
                                        ></i>

                                        ${dashboardEscapeHTML(
                                            phone
                                        )}
                                    </span>


                                    ${
                                        email
                                            ? `
                                                <span class="fsi-dashboard-stat-meta-item">
                                                    <i
                                                        data-lucide="mail"
                                                        width="13"
                                                        height="13"
                                                    ></i>

                                                    ${dashboardEscapeHTML(
                                                        email
                                                    )}
                                                </span>
                                            `
                                            : ""
                                    }


                                    ${
                                        location
                                            ? `
                                                <span class="fsi-dashboard-stat-meta-item">
                                                    <i
                                                        data-lucide="map-pin"
                                                        width="13"
                                                        height="13"
                                                    ></i>

                                                    ${dashboardEscapeHTML(
                                                        location
                                                    )}
                                                </span>
                                            `
                                            : ""
                                    }


                                    <span class="fsi-dashboard-stat-meta-item sales-info">
                                        <i
                                            data-lucide="user"
                                            width="13"
                                            height="13"
                                        ></i>

                                        ${dashboardEscapeHTML(
                                            salesName
                                        )}
                                    </span>


                                    <span class="fsi-dashboard-stat-meta-item">
                                        <i
                                            data-lucide="clock-3"
                                            width="13"
                                            height="13"
                                        ></i>

                                        ${dashboardEscapeHTML(
                                            lastUpdate
                                        )}
                                    </span>

                                </div>

                            </div>


                            <div class="fsi-dashboard-stat-status">

                                <span class="status-badge ${dashboardEscapeHTML(statusClass)}">
                                    ${dashboardEscapeHTML(status)}
                                </span>

                            </div>

                        </div>
                    `;
                }
            ).join("");
    }


    dashboardStatPopupElement.innerHTML = `

        <div
            class="fsi-dashboard-stat-backdrop"
            data-dashboard-stat-close="true"
        ></div>


        <div
            class="fsi-dashboard-stat-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fsi-dashboard-stat-title"
        >

            <div class="fsi-dashboard-stat-header">

                <div class="fsi-dashboard-stat-title-wrap">

                    <div class="fsi-dashboard-stat-title-row">

                        <span class="fsi-dashboard-stat-title-icon">
                            <i
                                data-lucide="${icon}"
                                width="20"
                                height="20"
                            ></i>
                        </span>


                        <h3
                            id="fsi-dashboard-stat-title"
                            class="fsi-dashboard-stat-title"
                        >
                            ${title}
                        </h3>

                    </div>


                    <p class="fsi-dashboard-stat-description">
                        ${description}
                    </p>

                </div>


                <button
                    type="button"
                    class="fsi-dashboard-stat-close"
                    aria-label="Close"
                    data-dashboard-stat-close="true"
                >
                    <i
                        data-lucide="x"
                        width="19"
                        height="19"
                    ></i>
                </button>

            </div>


            <div class="fsi-dashboard-stat-toolbar">

                <div class="fsi-dashboard-stat-search-wrap">

                    <span class="fsi-dashboard-stat-search-icon">
                        <i
                            data-lucide="search"
                            width="17"
                            height="17"
                        ></i>
                    </span>


                    <input
                        type="search"
                        class="fsi-dashboard-stat-search"
                        id="fsi-dashboard-stat-search"
                        placeholder="Search customer..."
                        value="${searchValue}"
                        autocomplete="off"
                    />

                </div>


                <span class="fsi-dashboard-stat-count">
                    ${filtered.length}
                </span>

            </div>


            <div class="fsi-dashboard-stat-list">

                ${listHTML}

            </div>


            <div class="fsi-dashboard-stat-footer">

                <span class="fsi-dashboard-stat-footer-info">
                    ${dashboardEscapeHTML(
                        footerText
                    )}
                </span>


                ${
                    (
                        !dashboardStatPopupShowingAll &&
                        totalCategory > 5
                    )

                        ? `
                            <button
                                type="button"
                                class="fsi-dashboard-stat-view-all"
                                id="fsi-dashboard-stat-view-all"
                            >
                                <span>
                                    View All
                                </span>

                                <i
                                    data-lucide="arrow-right"
                                    width="16"
                                    height="16"
                                ></i>
                            </button>
                        `

                        : (
                            dashboardStatPopupShowingAll
                                ? `
                                    <button
                                        type="button"
                                        class="fsi-dashboard-stat-view-all is-secondary"
                                        id="fsi-dashboard-stat-show-less"
                                    >
                                        <span>
                                            Show Less
                                        </span>

                                        <i
                                            data-lucide="chevron-up"
                                            width="16"
                                            height="16"
                                        ></i>
                                    </button>
                                `
                                : ""
                        )
                }

            </div>

        </div>
    `;


    /*
     * Search event.
     */

    const searchInput =
        document.getElementById(
            "fsi-dashboard-stat-search"
        );


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            function (event) {

                dashboardStatPopupSearchTerm =
                    event.target.value || "";


                dashboardRenderStatPopup();


                /*
                 * Fokus kembali ke search.
                 */

                const nextInput =
                    document.getElementById(
                        "fsi-dashboard-stat-search"
                    );


                if (nextInput) {

                    nextInput.focus();


                    try {

                        const length =
                            nextInput.value.length;


                        nextInput.setSelectionRange(
                            length,
                            length
                        );

                    } catch (error) {
                        // ignore
                    }
                }
            }
        );
    }


    /*
     * View All.
     */

    const viewAllButton =
        document.getElementById(
            "fsi-dashboard-stat-view-all"
        );


    if (viewAllButton) {

        viewAllButton.addEventListener(
            "click",
            function () {

                dashboardStatPopupShowingAll =
                    true;


                dashboardRenderStatPopup();
            }
        );
    }


    /*
     * Show Less.
     */

    const showLessButton =
        document.getElementById(
            "fsi-dashboard-stat-show-less"
        );


    if (showLessButton) {

        showLessButton.addEventListener(
            "click",
            function () {

                dashboardStatPopupShowingAll =
                    false;


                dashboardRenderStatPopup();
            }
        );
    }


    /*
     * Close buttons.
     */

    dashboardStatPopupElement
        .querySelectorAll(
            "[data-dashboard-stat-close='true']"
        )
        .forEach(
            element => {

                element.addEventListener(
                    "click",
                    function () {

                        dashboardCloseStatPopup();
                    }
                );
            }
        );


    if (
        typeof window.refreshIcons === "function"
    ) {

        window.refreshIcons();
    }
}


// ============================================================
// OPEN STAT POPUP
// ============================================================

function dashboardOpenStatPopup(
    category
) {

    const config =
        DASHBOARD_STAT_CATEGORIES[
            category
        ];


    if (!config) {

        console.warn(
            "FSI CRM: kategori statistik tidak ditemukan:",
            category
        );

        return;
    }


    /*
     * Data yang dipakai berasal dari dashboardData,
     * yang sudah mengikuti access control Admin / Sales.
     */

    const categoryData =
        dashboardFilterDataForStat(
            dashboardData,
            category
        );


    dashboardStatPopupCurrentCategory =
        category;


    dashboardStatPopupCurrentData =
        dashboardSortPopupLeads(
            categoryData
        );


    dashboardStatPopupShowingAll =
        false;


    dashboardStatPopupSearchTerm =
        "";


    dashboardEnsureStatPopupStyles();


    /*
     * Jika popup sebelumnya ada,
     * hapus dahulu supaya state bersih.
     */

    if (
        dashboardStatPopupElement
    ) {

        dashboardStatPopupElement.remove();

        dashboardStatPopupElement =
            null;
    }


    const modal =
        document.createElement(
            "div"
        );


    modal.id =
        "fsi-dashboard-stat-modal";


    modal.className =
        "fsi-dashboard-stat-modal";


    modal.setAttribute(
        "aria-label",
        config.title
    );


    modal.innerHTML = "";


    document.body.appendChild(
        modal
    );


    dashboardStatPopupElement =
        modal;


    dashboardRenderStatPopup();


    /*
     * Lock scroll halaman ketika popup terbuka.
     */

    document.body.dataset.fsiDashboardScrollLocked =
        "true";


    document.body.style.overflow =
        "hidden";


    /*
     * Fokus ke search.
     */

    setTimeout(
        function () {

            const search =
                document.getElementById(
                    "fsi-dashboard-stat-search"
                );


            if (search) {
                search.focus();
            }

        },
        50
    );
}


// ============================================================
// CLOSE STAT POPUP
// ============================================================

function dashboardCloseStatPopup() {

    if (
        dashboardStatPopupElement
    ) {

        dashboardStatPopupElement.remove();

        dashboardStatPopupElement =
            null;
    }


    dashboardStatPopupCurrentCategory =
        "total";


    dashboardStatPopupCurrentData =
        [];


    dashboardStatPopupShowingAll =
        false;


    dashboardStatPopupSearchTerm =
        "";


    if (
        document.body.dataset.fsiDashboardScrollLocked ===
        "true"
    ) {

        document.body.style.overflow =
            "";


        delete document.body.dataset
            .fsiDashboardScrollLocked;
    }
}


// ============================================================
// KEYBOARD HANDLER FOR STAT POPUP
// ============================================================

function dashboardHandleStatPopupKeydown(
    event
) {

    if (
        event.key !== "Escape"
    ) {
        return;
    }


    if (
        dashboardStatPopupElement
    ) {

        dashboardCloseStatPopup();
    }
}


// ============================================================
// BIND STAT CARD CLICKS
// ============================================================

function dashboardBindStatCardClicks() {

    dashboardEnsureStatPopupStyles();


    const categoryEntries =
        Object.entries(
            DASHBOARD_STAT_CATEGORIES
        );


    let boundCount =
        0;


    categoryEntries.forEach(
        ([
            category,
            config
        ]) => {

            const ids = [
                config.statId,
                ...(config.legacyIds || [])
            ];


            let statElement =
                null;


            for (
                const id
                of ids
            ) {

                const element =
                    document.getElementById(
                        id
                    );


                if (element) {

                    statElement =
                        element;

                    break;
                }
            }


            if (!statElement) {
                return;
            }


            const cardElement =
                dashboardFindStatCardElement(
                    statElement
                );


            if (!cardElement) {
                return;
            }


            /*
             * Jangan bind dua kali.
             */

            if (
                cardElement.dataset
                    .fsiStatPopupBound ===
                category
            ) {

                return;
            }


            cardElement.dataset
                .fsiStatPopupBound =
                category;


            cardElement.classList.add(
                "dashboard-stat-clickable"
            );


            cardElement.setAttribute(
                "role",
                "button"
            );


            cardElement.setAttribute(
                "tabindex",
                "0"
            );


            cardElement.setAttribute(
                "aria-label",
                `Open ${config.title}`
            );


            cardElement.addEventListener(
                "click",
                function (event) {

                    /*
                     * Jangan membuka popup jika user
                     * menekan interactive element lain
                     * di dalam card.
                     */

                    const interactive =
                        event.target.closest(
                            "button, a, input, select, textarea"
                        );


                    if (
                        interactive &&
                        interactive !== cardElement
                    ) {

                        return;
                    }


                    dashboardOpenStatPopup(
                        category
                    );
                }
            );


            cardElement.addEventListener(
                "keydown",
                function (event) {

                    if (
                        event.key === "Enter" ||
                        event.key === " "
                    ) {

                        event.preventDefault();


                        dashboardOpenStatPopup(
                            category
                        );
                    }
                }
            );


            boundCount++;
        }
    );


    if (
        !dashboardStatPopupBound
    ) {

        document.addEventListener(
            "keydown",
            dashboardHandleStatPopupKeydown
        );


        dashboardStatPopupBound =
            true;
    }


    if (
        boundCount > 0
    ) {

        console.log(
            "FSI CRM: statistic cards interactive:",
            boundCount
        );
    }
}


// ============================================================
// FIND PIPELINE CONTAINER
// ============================================================
//
// index.html terbaru menggunakan:
//     pipeline-summary
//
// Versi lama menggunakan:
//     dashboard-pipeline
//
// Kita support keduanya agar tidak merusak versi lama.
// ============================================================

function dashboardFindPipelineContainer() {

    const ids = [

        "pipeline-summary",

        "dashboard-pipeline",

        "pipeline-summary-container",

        "sales-pipeline"
    ];


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
// RENDER PIPELINE
// ============================================================

function renderDashboardPipeline(
    data
) {

    const container =
        dashboardFindPipelineContainer();


    if (!container) {

        console.warn(
            "FSI CRM: Pipeline container tidak ditemukan."
        );

        return;
    }


    const list =
        Array.isArray(data)
            ? data
            : [];


    /*
     * Pipeline dibuat mengikuti alur CRM:
     *
     * New
     * Flyer Sent
     * Interested
     * Follow Up
     * Appointment
     * Site Survey
     * Quotation
     * SPK
     * Closing
     * Not Interested
     */

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
            label: "SPK",
            className: "status-spk"
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
                    stage.label === "Appointment"
                ) {

                    count =
                        dashboardCountDateField(
                            list,
                            "appointment"
                        );

                } else if (
                    stage.label === "Site Survey"
                ) {

                    count =
                        dashboardCountDateField(
                            list,
                            "site_survey"
                        );

                } else if (
                    stage.label === "Quotation"
                ) {

                    count =
                        dashboardCountDateField(
                            list,
                            "quotation"
                        );

                } else if (
                    stage.label === "SPK"
                ) {

                    count =
                        dashboardCountDateField(
                            list,
                            "spk"
                        );

                } else if (
                    stage.label === "Closing"
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
        typeof window.refreshIcons === "function"
    ) {

        window.refreshIcons();
    }
}


// ============================================================
// FIND RECENT LEADS CONTAINER
// ============================================================
//
// index.html terbaru menggunakan:
//     recent-leads
//
// Versi lama menggunakan:
//     dashboard-activities
//
// Kita support keduanya.
// ============================================================

function dashboardFindRecentLeadsContainer() {

    const ids = [

        "recent-leads",

        "dashboard-activities",

        "recent-leads-container",

        "dashboard-recent-leads"
    ];


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
// RENDER RECENT LEADS
// ============================================================

function renderDashboardRecentLeads(
    data
) {

    const container =
        dashboardFindRecentLeadsContainer();


    if (!container) {

        console.warn(
            "FSI CRM: Recent Leads container tidak ditemukan."
        );

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


                    return dateB -
                        dateA;
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
            typeof window.refreshIcons === "function"
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
                    typeof window.getStatusClass === "function"

                        ? window.getStatusClass(
                            status
                        )

                        : "status-new";


                const date =
                    typeof window.formatDateTime === "function"

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

                                <span class="status-badge ${dashboardEscapeHTML(statusClass)}">
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
        typeof window.refreshIcons === "function"
    ) {

        window.refreshIcons();
    }
}


// ============================================================
// ESCAPE HTML
// ============================================================

function dashboardEscapeHTML(
    value
) {

    if (
        typeof window.escapeHTML === "function"
    ) {

        return window.escapeHTML(
            value
        );
    }


    const text =
        String(
            value ?? ""
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
// SHOW DASHBOARD LOADING
// ============================================================

function dashboardShowLoading() {

    const page =
        dashboardFindPage(
            "dashboard"
        );


    if (page) {

        page.classList.add(
            "dashboard-loading"
        );
    }
}


// ============================================================
// HIDE DASHBOARD LOADING
// ============================================================

function dashboardHideLoading() {

    const page =
        dashboardFindPage(
            "dashboard"
        );


    if (page) {

        page.classList.remove(
            "dashboard-loading"
        );
    }
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
            typeof window.renderDashboardCharts === "function"
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
            typeof window.getSupabaseErrorMessage === "function"

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
            calculateDashboardStats([]);


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
            typeof window.showToast === "function"
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
            typeof window.refreshIcons === "function"
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
            typeof window.showToast === "function"
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
// Kita tetap support navigation.js, tetapi dashboard juga
// menangani tombol ini sebagai fallback.
//
// Dengan begitu tombol View All tetap bekerja walaupun
// navigation.js belum melakukan binding ke button tersebut.
// ============================================================

let dashboardViewAllBound = false;


function dashboardBindViewAllButton() {

    if (dashboardViewAllBound) {
        return;
    }


    const buttons =
        document.querySelectorAll(
            'button[data-page="leads"]'
        );


    if (!buttons.length) {
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
                     *
                     * Kita gunakan preventDefault hanya
                     * untuk mencegah submit pada button
                     * jika berada di dalam form.
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
            dashboardFindPage("dashboard")
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

        dashboardFilterDataForStat
    }
);


// ============================================================
// INITIAL STATE
// ============================================================

console.log(
    "FSI CRM: Dashboard module initialized."
);
