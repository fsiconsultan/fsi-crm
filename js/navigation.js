```javascript
// ============================================================
// FSI CRM - NAVIGATION MANAGEMENT
// File: js/navigation.js
// ============================================================

"use strict";

(function () {

    // ========================================================
    // STATE
    // ========================================================

    let navigationInitialized = false;

    // ========================================================
    // DOM HELPERS
    // ========================================================

    function navElement(...ids) {
        for (const id of ids) {
            const element = document.getElementById(id);

            if (element) {
                return element;
            }
        }

        return null;
    }

    function getProfile() {
        return window.currentProfile || null;
    }

    function isAdmin() {
        const profile = getProfile();

        if (!profile) {
            return false;
        }

        if (typeof window.isAdminRole === "function") {
            return window.isAdminRole(profile);
        }

        return (
            String(profile.role || "").toLowerCase() ===
            "admin"
        );
    }

    // ========================================================
    // PAGE ELEMENTS
    // ========================================================

    function getPage(type) {

        const pages = {

            dashboard: [
                "dashboardPage",
                "dashboard-page",
                "view-dashboard"
            ],

            leads: [
                "leadsPage",
                "leads-page",
                "view-leads"
            ],

            sales: [
                "salesPage",
                "sales-page",
                "view-sales"
            ],

            customerProfile: [
                "customerProfilePage",
                "customer-profile-page",
                "view-customer-profile"
            ]
        };

        const ids = pages[type] || [];

        for (const id of ids) {

            const element =
                document.getElementById(id);

            if (element) {
                return element;
            }
        }

        return null;
    }

    // ========================================================
    // HIDE ALL PAGES
    // ========================================================

    function hideAllPages() {

        [
            "dashboard",
            "leads",
            "sales",
            "customerProfile"
        ].forEach(
            type => {

                const page =
                    getPage(type);

                if (page) {
                    page.style.display =
                        "none";

                    page.classList.remove(
                        "active"
                    );

                    page.setAttribute(
                        "aria-hidden",
                        "true"
                    );
                }
            }
        );
    }

    // ========================================================
    // SHOW PAGE
    // ========================================================

    function showPage(type) {

        const page =
            getPage(type);

        if (!page) {

            console.warn(
                `FSI CRM: Page "${type}" not found.`
            );

            return false;
        }

        hideAllPages();

        page.style.display =
            type === "dashboard"
                ? "block"
                : "block";

        page.classList.add(
            "active"
        );

        page.setAttribute(
            "aria-hidden",
            "false"
        );

        return true;
    }

    // ========================================================
    // ACTIVE NAVIGATION
    // ========================================================

    function setActiveNavigation(
        target
    ) {

        const normalizedTarget =
            normalizeTarget(
                target
            );

        const selectors = [
            ".nav-link",
            ".nav-dropdown-item",
            "[data-page]",
            "[data-view]",
            "[data-nav]"
        ];

        const elements =
            document.querySelectorAll(
                selectors.join(",")
            );

        elements.forEach(
            element => {

                const elementTarget =
                    element.dataset.page ||
                    element.dataset.view ||
                    element.dataset.nav ||
                    "";

                const normalizedElement =
                    normalizeTarget(
                        elementTarget
                    );

                const isActive =
                    normalizedElement ===
                    normalizedTarget;

                element.classList.toggle(
                    "active",
                    isActive
                );

                if (isActive) {

                    element.setAttribute(
                        "aria-current",
                        "page"
                    );

                } else {

                    element.removeAttribute(
                        "aria-current"
                    );
                }
            }
        );
    }

    // ========================================================
    // NORMALIZE NAV TARGET
    // ========================================================

    function normalizeTarget(
        target
    ) {

        const value =
            String(
                target || ""
            )
                .trim()
                .toLowerCase();

        if (
            value === "home" ||
            value === "dashboard" ||
            value === "dashboardpage" ||
            value === "dashboard-page" ||
            value === "view-dashboard"
        ) {
            return "dashboard";
        }

        if (
            value === "lead" ||
            value === "leads" ||
            value === "leadspage" ||
            value === "leads-page" ||
            value === "view-leads"
        ) {
            return "leads";
        }

        if (
            value === "sales" ||
            value === "salespage" ||
            value === "sales-page" ||
            value === "view-sales"
        ) {
            return "sales";
        }

        if (
            value === "customer" ||
            value === "customerprofile" ||
            value === "customer-profile" ||
            value === "customerprofilepage" ||
            value === "customer-profile-page" ||
            value === "view-customer-profile"
        ) {
            return "customerProfile";
        }

        return value;
    }

    // ========================================================
    // PAGE TITLE
    // ========================================================

    function setNavigationTitle(
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

        const ids = [
            "current-page-title",
            "pageTitle",
            "page-title"
        ];

        ids.forEach(
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

    // ========================================================
    // CLOSE MOBILE MENU
    // ========================================================

    function closeMobileMenu() {

        const mobileNav =
            navElement(
                "mobileNav"
            );

        const menuButton =
            navElement(
                "mobileMenuBtn"
            );

        if (mobileNav) {

            mobileNav.classList.remove(
                "show",
                "open",
                "active"
            );

            mobileNav.style.display =
                "";

            mobileNav.setAttribute(
                "aria-hidden",
                "true"
            );
        }

        if (menuButton) {

            menuButton.classList.remove(
                "active",
                "open"
            );

            menuButton.setAttribute(
                "aria-expanded",
                "false"
            );
        }

        document.body.classList.remove(
            "mobile-menu-open"
        );
    }

    // ========================================================
    // OPEN MOBILE MENU
    // ========================================================

    function openMobileMenu() {

        const mobileNav =
            navElement(
                "mobileNav"
            );

        const menuButton =
            navElement(
                "mobileMenuBtn"
            );

        if (!mobileNav) {
            return;
        }

        mobileNav.classList.add(
            "show",
            "open",
            "active"
        );

        mobileNav.style.display =
            "block";

        mobileNav.setAttribute(
            "aria-hidden",
            "false"
        );

        if (menuButton) {

            menuButton.classList.add(
                "active",
                "open"
            );

            menuButton.setAttribute(
                "aria-expanded",
                "true"
            );
        }

        document.body.classList.add(
            "mobile-menu-open"
        );
    }

    // ========================================================
    // TOGGLE MOBILE MENU
    // ========================================================

    function toggleMobileMenu() {

        const mobileNav =
            navElement(
                "mobileNav"
            );

        if (!mobileNav) {
            return;
        }

        const isOpen =
            mobileNav.classList.contains(
                "show"
            ) ||
            mobileNav.classList.contains(
                "open"
            ) ||
            mobileNav.classList.contains(
                "active"
            );

        if (isOpen) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }
    }

    // ========================================================
    // NAVIGATION DROPDOWNS
    // ========================================================

    function closeAllDropdowns(
        except = null
    ) {

        const dropdowns =
            document.querySelectorAll(
                ".nav-dropdown"
            );

        dropdowns.forEach(
            dropdown => {

                if (
                    except &&
                    dropdown === except
                ) {
                    return;
                }

                dropdown.classList.remove(
                    "open"
                );

                const menu =
                    dropdown.querySelector(
                        ".nav-dropdown-menu"
                    );

                if (menu) {
                    menu.classList.remove(
                        "show",
                        "open"
                    );
                }

                const button =
                    dropdown.querySelector(
                        ".nav-dropdown-btn, [aria-haspopup='true']"
                    );

                if (button) {
                    button.setAttribute(
                        "aria-expanded",
                        "false"
                    );
                }
            }
        );
    }

    function toggleDropdown(
        dropdown
    ) {

        if (!dropdown) {
            return;
        }

        const isOpen =
            dropdown.classList.contains(
                "open"
            );

        closeAllDropdowns(
            isOpen
                ? null
                : dropdown
        );

        if (!isOpen) {

            dropdown.classList.add(
                "open"
            );

            const menu =
                dropdown.querySelector(
                    ".nav-dropdown-menu"
                );

            if (menu) {

                menu.classList.add(
                    "show"
                );

                menu.classList.add(
                    "open"
                );
            }

            const button =
                dropdown.querySelector(
                    ".nav-dropdown-btn, [aria-haspopup='true']"
                );

            if (button) {

                button.setAttribute(
                    "aria-expanded",
                    "true"
                );
            }

        } else {

            dropdown.classList.remove(
                "open"
            );

            const menu =
                dropdown.querySelector(
                    ".nav-dropdown-menu"
                );

            if (menu) {

                menu.classList.remove(
                    "show",
                    "open"
                );
            }

            const button =
                dropdown.querySelector(
                    ".nav-dropdown-btn, [aria-haspopup='true']"
                );

            if (button) {

                button.setAttribute(
                    "aria-expanded",
                    "false"
                );
            }
        }
    }

    // ========================================================
    // ADMIN NAVIGATION VISIBILITY
    // ========================================================

    function updateAdminNavigation() {

        const adminOnlySelectors = [
            "[data-admin-only]",
            ".admin-only",
            "#salesNavLink",
            "#salesNavItem",
            "#salesManagementNav"
        ];

        const elements =
            document.querySelectorAll(
                adminOnlySelectors.join(",")
            );

        elements.forEach(
            element => {

                const allowed =
                    isAdmin();

                element.style.display =
                    allowed
                        ? ""
                        : "none";

                element.setAttribute(
                    "aria-hidden",
                    String(!allowed)
                );
            }
        );

        // Sales management dropdown
        const salesDropdown =
            navElement(
                "salesDropdown"
            );

        if (
            salesDropdown &&
            !isAdmin()
        ) {
            salesDropdown.style.display =
                "none";
        }
    }

    // ========================================================
    // SHOW DASHBOARD
    // ========================================================

    async function navigateDashboard() {

        closeAllDropdowns();

        closeMobileMenu();

        if (
            typeof window.showDashboard ===
            "function"
        ) {
            await window.showDashboard();

        } else {

            showPage(
                "dashboard"
            );

            setNavigationTitle(
                "Dashboard"
            );
        }

        setActiveNavigation(
            "dashboard"
        );
    }

    // ========================================================
    // SHOW LEADS
    // ========================================================

    async function navigateLeads() {

        closeAllDropdowns();

        closeMobileMenu();

        if (
            typeof window.showLeads ===
            "function"
        ) {
            await window.showLeads();

        } else {

            showPage(
                "leads"
            );

            setNavigationTitle(
                isAdmin()
                    ? "All Leads"
                    : "My Leads"
            );
        }

        setActiveNavigation(
            "leads"
        );
    }

    // ========================================================
    // SHOW SALES
    // ========================================================

    async function navigateSales() {

        if (!isAdmin()) {

            if (
                typeof window.showToast ===
                "function"
            ) {
                window.showToast(
                    "Access denied. Admin only.",
                    "error"
                );
            }

            return;
        }

        closeAllDropdowns();

        closeMobileMenu();

        if (
            typeof window.showSales ===
            "function"
        ) {
            await window.showSales();

        } else {

            showPage(
                "sales"
            );

            setNavigationTitle(
                "Manage Sales"
            );

            if (
                typeof window.loadSalesUsers ===
                "function"
            ) {
                await window.loadSalesUsers();
            }
        }

        setActiveNavigation(
            "sales"
        );
    }

    // ========================================================
    // SHOW CUSTOMER PROFILE
    // ========================================================

    async function navigateCustomerProfile(
        customerId = null
    ) {

        closeAllDropdowns();

        closeMobileMenu();

        if (
            customerId &&
            typeof window.crmOpenCustomerProfile ===
            "function"
        ) {

            await window.crmOpenCustomerProfile(
                customerId
            );

            setActiveNavigation(
                "customerProfile"
            );

            return;
        }

        if (
            typeof window.showCustomerProfile ===
            "function"
        ) {

            await window.showCustomerProfile();

            setActiveNavigation(
                "customerProfile"
            );

            return;
        }

        showPage(
            "customerProfile"
        );

        setNavigationTitle(
            "Customer Profile"
        );

        setActiveNavigation(
            "customerProfile"
        );
    }

    // ========================================================
    // MAIN CRM NAVIGATION
    // ========================================================

    async function crmNavigate(
        target,
        data = null
    ) {

        const normalized =
            normalizeTarget(
                target
            );

        switch (
            normalized
        ) {

            case "dashboard":
                await navigateDashboard();
                break;

            case "leads":
                await navigateLeads();
                break;

            case "sales":
                await navigateSales();
                break;

            case "customerProfile":

                await navigateCustomerProfile(
                    data
                );

                break;

            default:

                console.warn(
                    `FSI CRM: Unknown navigation target "${target}".`
                );

                await navigateDashboard();
                break;
        }
    }

    // ========================================================
    // DATA ATTRIBUTE NAVIGATION
    // ========================================================

    function handleNavigationClick(
        event
    ) {

        const element =
            event.currentTarget;

        if (!element) {
            return;
        }

        const target =
            element.dataset.page ||
            element.dataset.view ||
            element.dataset.nav;

        if (!target) {
            return;
        }

        const normalized =
            normalizeTarget(
                target
            );

        if (
            normalized ===
            "sales" &&
            !isAdmin()
        ) {
            event.preventDefault();
            return;
        }

        event.preventDefault();

        crmNavigate(
            normalized
        );
    }

    // ========================================================
    // BIND NAVIGATION LINKS
    // ========================================================

    function bindNavigationLinks() {

        const links =
            document.querySelectorAll(
                ".nav-link[data-page]," +
                ".nav-link[data-view]," +
                ".nav-link[data-nav]," +
                ".nav-dropdown-item[data-page]," +
                ".nav-dropdown-item[data-view]," +
                ".nav-dropdown-item[data-nav]," +
                "[data-crm-nav]"
            );

        links.forEach(
            link => {

                if (
                    link.dataset.navigationBound ===
                    "true"
                ) {
                    return;
                }

                link.dataset.navigationBound =
                    "true";

                link.addEventListener(
                    "click",
                    handleNavigationClick
                );
            }
        );
    }

    // ========================================================
    // BIND DROPDOWNS
    // ========================================================

    function bindDropdowns() {

        const dropdowns =
            document.querySelectorAll(
                ".nav-dropdown"
            );

        dropdowns.forEach(
            dropdown => {

                const button =
                    dropdown.querySelector(
                        ".nav-dropdown-btn, " +
                        "[aria-haspopup='true'], " +
                        ".nav-link"
                    );

                if (!button) {
                    return;
                }

                if (
                    button.dataset.dropdownBound ===
                    "true"
                ) {
                    return;
                }

                button.dataset.dropdownBound =
                    "true";

                button.addEventListener(
                    "click",
                    function (event) {

                        event.preventDefault();

                        event.stopPropagation();

                        toggleDropdown(
                            dropdown
                        );
                    }
                );
            }
        );
    }

    // ========================================================
    // BIND MOBILE MENU
    // ========================================================

    function bindMobileMenu() {

        const button =
            navElement(
                "mobileMenuBtn"
            );

        if (!button) {
            return;
        }

        if (
            button.dataset.mobileBound ===
            "true"
        ) {
            return;
        }

        button.dataset.mobileBound =
            "true";

        button.setAttribute(
            "aria-expanded",
            "false"
        );

        button.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                event.stopPropagation();

                toggleMobileMenu();
            }
        );
    }

    // ========================================================
    // DOCUMENT CLICK
    // ========================================================

    function bindDocumentClick() {

        document.addEventListener(
            "click",
            function (event) {

                const target =
                    event.target;

                // Don't close if clicking inside
                // navigation dropdown.
                if (
                    target.closest(
                        ".nav-dropdown"
                    )
                ) {
                    return;
                }

                closeAllDropdowns();
            }
        );
    }

    // ========================================================
    // ESC KEY
    // ========================================================

    function bindEscapeKey() {

        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key !==
                    "Escape"
                ) {
                    return;
                }

                closeAllDropdowns();

                closeMobileMenu();
            }
        );
    }

    // ========================================================
    // RESIZE
    // ========================================================

    function bindResize() {

        window.addEventListener(
            "resize",
            function () {

                if (
                    window.innerWidth >
                    900
                ) {
                    closeMobileMenu();
                }
            }
        );
    }

    // ========================================================
    // LOGO CLICK
    // ========================================================

    function bindLogo() {

        const logos =
            document.querySelectorAll(
                ".brand, .brand-logo, [data-home]"
            );

        logos.forEach(
            logo => {

                if (
                    logo.dataset.logoBound ===
                    "true"
                ) {
                    return;
                }

                logo.dataset.logoBound =
                    "true";

                logo.addEventListener(
                    "click",
                    function (event) {

                        // Only intercept if explicitly
                        // marked as navigation/home.
                        if (
                            logo.dataset.home !==
                            undefined ||
                            logo.classList.contains(
                                "brand"
                            )
                        ) {
                            event.preventDefault();

                            crmNavigate(
                                "dashboard"
                            );
                        }
                    }
                );
            }
        );
    }

    // ========================================================
    // INITIAL PAGE
    // ========================================================

    function initializeDefaultPage() {

        const profile =
            getProfile();

        if (!profile) {
            return;
        }

        updateAdminNavigation();

        // If one page is already visible,
        // preserve it.
        const dashboard =
            getPage(
                "dashboard"
            );

        const leads =
            getPage(
                "leads"
            );

        const sales =
            getPage(
                "sales"
            );

        const customerProfile =
            getPage(
                "customerProfile"
            );

        const visiblePage =
            [
                dashboard,
                leads,
                sales,
                customerProfile
            ].find(
                page =>
                    page &&
                    window.getComputedStyle(
                        page
                    ).display !== "none"
            );

        if (visiblePage) {
            return;
        }

        navigateDashboard();
    }

    // ========================================================
    // REFRESH NAVIGATION
    // ========================================================

    function refreshNavigation() {

        updateAdminNavigation();

        bindNavigationLinks();

        bindDropdowns();

        bindMobileMenu();

        bindLogo();
    }

    // ========================================================
    // PUBLIC API
    // ========================================================

    window.crmNavigate =
        crmNavigate;

    window.navigateDashboard =
        navigateDashboard;

    window.navigateLeads =
        navigateLeads;

    window.navigateSales =
        navigateSales;

    window.navigateCustomerProfile =
        navigateCustomerProfile;

    window.showPage =
        showPage;

    window.hideAllPages =
        hideAllPages;

    window.setActiveNavigation =
        setActiveNavigation;

    window.updateAdminNavigation =
        updateAdminNavigation;

    window.openMobileMenu =
        openMobileMenu;

    window.closeMobileMenu =
        closeMobileMenu;

    window.toggleMobileMenu =
        toggleMobileMenu;

    window.toggleDropdown =
        toggleDropdown;

    window.closeAllDropdowns =
        closeAllDropdowns;

    window.refreshNavigation =
        refreshNavigation;

    window.FSINavigation = {

        crmNavigate,

        navigateDashboard,

        navigateLeads,

        navigateSales,

        navigateCustomerProfile,

        showPage,

        hideAllPages,

        setActiveNavigation,

        updateAdminNavigation,

        openMobileMenu,

        closeMobileMenu,

        toggleMobileMenu,

        toggleDropdown,

        closeAllDropdowns,

        refreshNavigation
    };

    // ========================================================
    // DOM READY
    // ========================================================

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            if (
                navigationInitialized
            ) {
                return;
            }

            navigationInitialized =
                true;

            bindNavigationLinks();

            bindDropdowns();

            bindMobileMenu();

            bindDocumentClick();

            bindEscapeKey();

            bindResize();

            bindLogo();

            updateAdminNavigation();

            console.log(
                "FSI CRM: Navigation module loaded."
            );
        }
    );

    // ========================================================
    // AUTH / APP READY SUPPORT
    // ========================================================
    //
    // auth.js may finish login after DOMContentLoaded.
    // This event allows navigation to refresh after login.
    // ========================================================

    window.addEventListener(
        "fsi:app-ready",
        function () {

            refreshNavigation();

            updateAdminNavigation();
        }
    );

    window.addEventListener(
        "fsi:profile-ready",
        function () {

            refreshNavigation();

            updateAdminNavigation();
        }
    );

})();
```
