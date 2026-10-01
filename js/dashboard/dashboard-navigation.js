// ============================================================
// FSI CRM - DASHBOARD NAVIGATION MODULE
// ============================================================
//
// Fungsi utama:
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
// - Dashboard module hanya mengatur navigasi halaman.
// - Loading data Leads ditangani oleh leads-init.js.
// - showLeads() TIDAK memanggil loadFilterOptions()
//   atau loadLeads() secara langsung.
//
// Tujuan:
// Mencegah double loading / race condition ketika user
// klik Sales Card atau Stat Card dari Dashboard.
// ============================================================


// ============================================================
// ROLE NORMALIZATION
// ============================================================

function dashboardNormalizeRole(role) {

    if (
        typeof window.authNormalizeRole ===
        "function"
    ) {

        return window.authNormalizeRole(
            role
        );
    }


    if (
        typeof window.normalizeRole ===
        "function"
    ) {

        return window.normalizeRole(
            role
        );
    }


    return String(
        role || ""
    )
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

function dashboardFindPage(
    type
) {

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
        const id
        of ids
    ) {

        const element =
            document.getElementById(
                id
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

    const pageTypes = [

        "dashboard",

        "leads",

        "sales",

        "customerProfile"

    ];


    pageTypes.forEach(
        type => {

            const element =
                dashboardFindPage(
                    type
                );


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

function dashboardShowPage(
    type
) {

    const page =
        dashboardFindPage(
            type
        );


    if (!page) {

        console.warn(
            `FSI CRM: page "${type}" tidak ditemukan.`
        );


        return null;
    }


    // ========================================================
    // HIDE PAGE LAIN
    // ========================================================

    hideAllPages();


    // ========================================================
    // SHOW TARGET PAGE
    // ========================================================

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

        "current-page-title",

        "pageTitle",

        "page-title"

    ];


    titleIds.forEach(
        id => {

            const element =
                document.getElementById(
                    id
                );


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
        const id
        of ids
    ) {

        const element =
            document.getElementById(
                id
            );


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

function dashboardSetActiveNav(
    target
) {

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


        return false;
    }


    // ========================================================
    // OPEN DASHBOARD PAGE
    // ========================================================

    const page =
        dashboardShowPage(
            "dashboard"
        );


    if (!page) {

        return false;
    }


    // ========================================================
    // TITLE
    // ========================================================

    dashboardSetPageTitle(
        "Dashboard"
    );


    // ========================================================
    // DESCRIPTION
    // ========================================================

    dashboardSetPageDescription(

        dashboardIsAdmin()

            ? "Overview seluruh aktivitas dan pipeline sales."

            : "Overview aktivitas dan pipeline customer Anda."

    );


    // ========================================================
    // ACTIVE NAV
    // ========================================================

    dashboardSetActiveNav(
        "dashboard"
    );


    // ========================================================
    // STAT CARD BINDING
    // ========================================================

    if (
        typeof dashboardBindStatCardClicks ===
        "function"
    ) {

        dashboardBindStatCardClicks();
    }


    // ========================================================
    // UPDATE DASHBOARD
    // ========================================================

    try {

        await updateDashboard();

    } catch (error) {

        console.error(
            "FSI CRM: update Dashboard error:",
            error
        );
    }


    // ========================================================
    // SCROLL TOP
    // ========================================================

    dashboardScrollTop();


    return true;
}


// ============================================================
// SHOW LEADS
// ============================================================
//
// IMPORTANT:
//
// Fungsi ini HANYA:
// - membuka halaman Leads
// - mengatur title
// - mengatur description
// - mengatur active navigation
//
// Jangan loadFilterOptions() di sini.
// Jangan loadLeads() di sini.
//
// Leads module / leads-init.js yang bertanggung jawab
// untuk memproses sessionStorage filter dan mengambil data.
//
// ============================================================

async function showLeads() {

    const profile =
        dashboardGetProfile();


    // ========================================================
    // PROFILE CHECK
    // ========================================================

    if (!profile) {

        console.warn(
            "FSI CRM: profile belum siap, Leads tidak dibuka."
        );


        return false;
    }


    // ========================================================
    // OPEN LEADS PAGE
    // ========================================================

    const page =
        dashboardShowPage(
            "leads"
        );


    if (!page) {

        console.warn(
            "FSI CRM: halaman Leads tidak ditemukan."
        );


        return false;
    }


    // ========================================================
    // ROLE
    // ========================================================

    const isAdmin =
        dashboardIsAdmin();


    // ========================================================
    // PAGE TITLE
    // ========================================================

    dashboardSetPageTitle(

        isAdmin
            ? "All Leads"
            : "My Leads"

    );


    // ========================================================
    // PAGE DESCRIPTION
    // ========================================================

    dashboardSetPageDescription(

        isAdmin

            ? "Kelola seluruh database customer dan lead."

            : "Kelola database customer dan lead Anda."

    );


    // ========================================================
    // ACTIVE NAVIGATION
    // ========================================================

    dashboardSetActiveNav(
        "leads"
    );


    // ========================================================
    // NOTIFY LEADS MODULE
    // ========================================================
    //
    // Leads-init.js dapat mendengar event ini jika diperlukan.
    //
    // Event ini TIDAK memanggil loadLeads secara langsung.
    //
    // ========================================================

    document.dispatchEvent(

        new CustomEvent(
            "fsi:leads-page-opened",
            {
                detail: {
                    source: "dashboard"
                }
            }
        )

    );


    // ========================================================
    // SCROLL TOP
    // ========================================================

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

    // ========================================================
    // ADMIN CHECK
    // ========================================================

    if (
        !dashboardIsAdmin()
    ) {

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


    // ========================================================
    // OPEN SALES PAGE
    // ========================================================

    const page =
        dashboardShowPage(
            "sales"
        );


    if (!page) {

        return false;
    }


    // ========================================================
    // TITLE
    // ========================================================

    dashboardSetPageTitle(
        "Manage Sales"
    );


    // ========================================================
    // DESCRIPTION
    // ========================================================

    dashboardSetPageDescription(
        "Kelola user Sales, status akun, dan akses tim."
    );


    // ========================================================
    // ACTIVE NAV
    // ========================================================

    dashboardSetActiveNav(
        "sales"
    );


    // ========================================================
    // LOAD SALES USERS
    // ========================================================

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


    // ========================================================
    // SCROLL TOP
    // ========================================================

    dashboardScrollTop();


    return true;
}


// ============================================================
// SHOW CUSTOMER PROFILE
// ============================================================

async function showCustomerProfile(
    leadId
) {

    const profile =
        dashboardGetProfile();


    if (!profile) {

        console.warn(
            "FSI CRM: profile belum siap."
        );


        return false;
    }


    // ========================================================
    // OPEN PROFILE PAGE
    // ========================================================

    const page =
        dashboardShowPage(
            "customerProfile"
        );


    if (!page) {

        return false;
    }


    // ========================================================
    // TITLE
    // ========================================================

    dashboardSetPageTitle(
        "Customer Profile"
    );


    // ========================================================
    // DESCRIPTION
    // ========================================================

    dashboardSetPageDescription(
        "Detail customer, pipeline, aktivitas, dan follow-up."
    );


    // ========================================================
    // ACTIVE NAV
    // ========================================================

    dashboardSetActiveNav(
        "customerProfile"
    );


    // ========================================================
    // OPEN CUSTOMER PROFILE DATA
    // ========================================================

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


    // ========================================================
    // SCROLL TOP
    // ========================================================

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
// FSI DASHBOARD NAMESPACE
// ============================================================

window.FSIDashboard =
    window.FSIDashboard ||
    {};


Object.assign(
    window.FSIDashboard,
    {

        dashboardNormalizeRole,

        dashboardIsAdmin,

        dashboardIsSales,

        dashboardFindPage,

        hideAllPages,

        dashboardShowPage,

        dashboardSetPageTitle,

        dashboardSetPageDescription,

        dashboardSetActiveNav,

        showDashboard,

        showLeads,

        showSales,

        showCustomerProfile,

        dashboardScrollTop

    }
);


// ============================================================
// INITIALIZATION LOG
// ============================================================

console.log(
    "FSI CRM: dashboard-navigation.js loaded successfully."
);
