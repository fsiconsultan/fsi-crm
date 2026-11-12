// ============================================================
// FSI CRM - DASHBOARD NAVIGATION MODULE
// ============================================================
//
// Fungsi:
// 1. Role helpers
// 2. Page finder
// 3. Hide all pages
// 4. Show dashboard
// 5. Show leads
// 6. Show sales management
// 7. Show customer profile
// 8. Page title
// 9. Page description
// 10. Active navigation
// 11. Scroll top
//
// IMPORTANT:
// - Module ini hanya mengatur navigasi.
// - Loading Leads ditangani oleh leads-init.js.
// - showLeads() TIDAK memanggil loadLeads().
// ============================================================


// ============================================================
// ROLE NORMALIZATION
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
// GET PROFILE
// ============================================================

function dashboardGetProfile() {

    // Prioritas: fungsi global yang sudah disediakan auth.js
    if (
        typeof window.getCurrentProfile === "function"
    ) {
        return window.getCurrentProfile();
    }

    if (
        typeof window.getCurrentUserProfile === "function"
    ) {
        return window.getCurrentUserProfile();
    }

    // Fallback ke state global yang umum digunakan CRM
    if (
        window.currentProfile
    ) {
        return window.currentProfile;
    }

    if (
        window.currentUserProfile
    ) {
        return window.currentUserProfile;
    }

    if (
        window.FSICRM &&
        window.FSICRM.currentProfile
    ) {
        return window.FSICRM.currentProfile;
    }

    return null;
}


// ============================================================
// ROLE HELPERS
// ============================================================

function dashboardIsAdmin() {

    var profile = dashboardGetProfile();

    if (!profile) {
        return false;
    }

    var role = dashboardNormalizeRole(
        profile.role
    );

    return (
        role === "admin" ||
        role === "owner" ||
        role === "administrator"
    );
}


function dashboardIsSales() {

    var profile = dashboardGetProfile();

    if (!profile) {
        return false;
    }

    var role = dashboardNormalizeRole(
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

    var pageMap = {

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

    var ids = pageMap[type] || [];

    for (
        var i = 0;
        i < ids.length;
        i++
    ) {

        var element = document.getElementById(
            ids[i]
        );

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

    var pageTypes = [
        "dashboard",
        "leads",
        "sales",
        "customerProfile"
    ];

    pageTypes.forEach(
        function (type) {

            var element = dashboardFindPage(type);

            if (!element) {
                return;
            }

            element.classList.add("hidden");
            element.classList.remove("active");

            element.style.display = "none";

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

    var page = dashboardFindPage(type);

    if (!page) {

        console.warn(
            "FSI CRM: page tidak ditemukan: " + type
        );

        return null;
    }

    hideAllPages();

    page.classList.remove("hidden");
    page.classList.add("active");

    page.style.display = "block";
    page.style.visibility = "visible";
    page.style.opacity = "1";

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

    var titleIds = [
        "current-page-title",
        "pageTitle",
        "page-title"
    ];

    titleIds.forEach(
        function (id) {

            var element = document.getElementById(id);

            if (element) {
                element.textContent = title;
            }
        }
    );
}


// ============================================================
// PAGE DESCRIPTION
// ============================================================

function dashboardSetPageDescription(description) {

    var ids = [
        "current-page-description",
        "pageDescription",
        "page-description"
    ];

    for (
        var i = 0;
        i < ids.length;
        i++
    ) {

        var element = document.getElementById(
            ids[i]
        );

        if (element) {

            element.textContent =
                description || "";

            return;
        }
    }
}


// ============================================================
// ACTIVE NAVIGATION
// ============================================================

function dashboardSetActiveNav(target) {

    var links = document.querySelectorAll(
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
        function (link) {

            link.classList.remove("active");

            link.removeAttribute(
                "aria-current"
            );
        }
    );

    var selectors = [
        '[data-page="' + target + '"]',
        '[data-view="' + target + '"]',
        '[data-nav="' + target + '"]',
        '[data-crm-nav="' + target + '"]'
    ];

    selectors.forEach(
        function (selector) {

            document
                .querySelectorAll(selector)
                .forEach(
                    function (element) {

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

    var profile = dashboardGetProfile();

    if (!profile) {

        console.warn(
            "FSI CRM: profile belum siap. Dashboard belum dapat dimuat."
        );

        return false;
    }

    var page = dashboardShowPage(
        "dashboard"
    );

    if (!page) {
        return false;
    }

    dashboardSetPageTitle(
        "Dashboard"
    );

    if (dashboardIsAdmin()) {

        dashboardSetPageDescription(
            "Overview seluruh aktivitas dan pipeline sales."
        );

    } else {

        dashboardSetPageDescription(
            "Overview aktivitas dan pipeline customer Anda."
        );
    }

    dashboardSetActiveNav(
        "dashboard"
    );

    if (
        typeof window.dashboardBindStatCardClicks ===
        "function"
    ) {

        try {

            window.dashboardBindStatCardClicks();

        } catch (error) {

            console.error(
                "FSI CRM: gagal bind Dashboard Stat Card:",
                error
            );
        }
    }

    if (
        typeof window.updateDashboard ===
        "function"
    ) {

        try {

            await window.updateDashboard();

        } catch (error) {

            console.error(
                "FSI CRM: update Dashboard error:",
                error
            );
        }
    }

    dashboardScrollTop();

    return true;
}


// ============================================================
// SHOW LEADS
// ============================================================
//
// IMPORTANT:
// Tidak memanggil loadLeads().
// Tidak memanggil loadFilterOptions().
//
// leads-init.js yang menangani loading data.
// ============================================================

async function showLeads() {

    var profile = dashboardGetProfile();

    if (!profile) {

        console.warn(
            "FSI CRM: profile belum siap, Leads tidak dibuka."
        );

        return false;
    }

    var page = dashboardShowPage(
        "leads"
    );

    if (!page) {

        console.warn(
            "FSI CRM: halaman Leads tidak ditemukan."
        );

        return false;
    }

    var isAdmin = dashboardIsAdmin();

    if (isAdmin) {

        dashboardSetPageTitle(
            "All Leads"
        );

        dashboardSetPageDescription(
            "Kelola seluruh database customer dan lead."
        );

    } else {

        dashboardSetPageTitle(
            "My Leads"
        );

        dashboardSetPageDescription(
            "Kelola database customer dan lead Anda."
        );
    }

    dashboardSetActiveNav(
        "leads"
    );

    // Beri tahu leads-init.js bahwa halaman dibuka.
    document.dispatchEvent(
        new CustomEvent(
            "fsi:leads-page-opened",
            {
                detail: {
                    source: "dashboard-navigation"
                }
            }
        )
    );

    dashboardScrollTop();

    console.log(
        "FSI CRM: Leads page opened successfully."
    );

    return true;
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

        return false;
    }

    var page = dashboardShowPage(
        "sales"
    );

    if (!page) {
        return false;
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

    return true;
}


// ============================================================
// SHOW CUSTOMER PROFILE
// ============================================================

async function showCustomerProfile(leadId) {

    var profile = dashboardGetProfile();

    if (!profile) {

        console.warn(
            "FSI CRM: profile belum siap."
        );

        return false;
    }

    var page = dashboardShowPage(
        "customerProfile"
    );

    if (!page) {
        return false;
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

    if (
        leadId &&
        typeof window.crmOpenCustomerProfile ===
        "function"
    ) {

        try {

            await window.crmOpenCustomerProfile(
                leadId
            );

        } catch (error) {

            console.error(
                "FSI CRM: gagal membuka Customer Profile:",
                error
            );
        }
    }

    dashboardScrollTop();

    return true;
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
// GLOBAL EXPORTS
// ============================================================

window.dashboardNormalizeRole =
    dashboardNormalizeRole;

window.dashboardGetProfile =
    dashboardGetProfile;

window.dashboardIsAdmin =
    dashboardIsAdmin;

window.dashboardIsSales =
    dashboardIsSales;

window.dashboardFindPage =
    dashboardFindPage;

window.hideAllPages =
    hideAllPages;

window.dashboardShowPage =
    dashboardShowPage;

window.dashboardSetPageTitle =
    dashboardSetPageTitle;

window.dashboardSetPageDescription =
    dashboardSetPageDescription;

window.dashboardSetActiveNav =
    dashboardSetActiveNav;

window.showDashboard =
    showDashboard;

window.showLeads =
    showLeads;

window.showSales =
    showSales;

window.showCustomerProfile =
    showCustomerProfile;

window.dashboardScrollTop =
    dashboardScrollTop;


// ============================================================
// FSI CRM NAMESPACE
// ============================================================

window.FSIDashboard =
    window.FSIDashboard ||
    {};

Object.assign(
    window.FSIDashboard,
    {

        dashboardNormalizeRole:
            dashboardNormalizeRole,

        dashboardGetProfile:
            dashboardGetProfile,

        dashboardIsAdmin:
            dashboardIsAdmin,

        dashboardIsSales:
            dashboardIsSales,

        dashboardFindPage:
            dashboardFindPage,

        hideAllPages:
            hideAllPages,

        dashboardShowPage:
            dashboardShowPage,

        dashboardSetPageTitle:
            dashboardSetPageTitle,

        dashboardSetPageDescription:
            dashboardSetPageDescription,

        dashboardSetActiveNav:
            dashboardSetActiveNav,

        showDashboard:
            showDashboard,

        showLeads:
            showLeads,

        showSales:
            showSales,

        showCustomerProfile:
            showCustomerProfile,

        dashboardScrollTop:
            dashboardScrollTop
    }
);


// ============================================================
// INITIALIZATION LOG
// ============================================================

console.log(
    "FSI CRM: dashboard-navigation.js loaded successfully."
);
