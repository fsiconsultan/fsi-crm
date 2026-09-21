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
    let documentClickBound = false;
    let escapeKeyBound = false;
    let resizeBound = false;

    // ========================================================
    // DOM HELPERS
    // ========================================================

    function navElement(...ids) {

        for (const id of ids) {

            const element =
                document.getElementById(id);

            if (element) {
                return element;
            }
        }

        return null;
    }

    function getProfile() {

        return window.currentProfile || null;
    }

    function getCurrentUser() {

        return window.currentUser || null;
    }

    function hasProfile() {

        return !!getProfile();
    }

    function isAdmin() {

        const profile =
            getProfile();

        if (!profile) {
            return false;
        }

        if (
            typeof window.isAdminRole ===
            "function"
        ) {
            return window.isAdminRole(
                profile
            );
        }

        return (
            String(
                profile.role || ""
            )
                .trim()
                .toLowerCase() ===
            "admin"
        );
    }

    // ========================================================
    // PAGE ELEMENTS
    // ========================================================

    function getPage(type) {

        const pages = {

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
            pages[type] || [];

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
    // GET ALL CRM PAGES
    // ========================================================

    function getAllPages() {

        return [
            getPage("dashboard"),
            getPage("leads"),
            getPage("sales"),
            getPage("customerProfile")
        ].filter(Boolean);
    }

    // ========================================================
    // HIDE ALL PAGES
    // ========================================================

    function hideAllPages() {

        getAllPages().forEach(
            page => {

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
        );
    }

    // ========================================================
    // SHOW PAGE
    // ========================================================

    function showPage(type) {

        const normalized =
            normalizeTarget(type);

        const page =
            getPage(normalized);

        if (!page) {

            console.warn(
                `FSI CRM: Page "${normalized}" not found.`
            );

            return false;
        }

        hideAllPages();

        page.style.display =
            "block";

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
    // NORMALIZE NAV TARGET
    // ========================================================

    function normalizeTarget(target) {

        const value =
            String(
                target || ""
            )
                .trim()
                .toLowerCase();

        // Dashboard
        if (
            value === "home" ||
            value === "dashboard" ||
            value === "dashboardpage" ||
            value === "dashboard-page" ||
            value === "view-dashboard"
        ) {
            return "dashboard";
        }

        // Leads
        if (
            value === "lead" ||
            value === "leads" ||
            value === "leadspage" ||
            value === "leads-page" ||
            value === "view-leads"
        ) {
            return "leads";
        }

        // Sales
        if (
            value === "sales" ||
            value === "salespage" ||
            value === "sales-page" ||
            value === "view-sales"
        ) {
            return "sales";
        }

        // Customer profile
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

    function setNavigationTitle(title) {

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
    // ACTIVE NAVIGATION
    // ========================================================

    function setActiveNavigation(target) {

        const normalizedTarget =
            normalizeTarget(
                target
            );

        const selectors = [
            ".nav-link[data-page]",
            ".nav-link[data-view]",
            ".nav-link[data-nav]",
            ".nav-dropdown-item[data-page]",
            ".nav-dropdown-item[data-view]",
            ".nav-dropdown-item[data-nav]",
            "[data-crm-nav]"
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
                    element.dataset.crmNav ||
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
    // MOBILE MENU
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
    // DROPDOWN HELPERS
    // ========================================================

    function getDropdownButton(dropdown) {

        if (!dropdown) {
            return null;
        }

        return dropdown.querySelector(
            ".nav-dropdown-btn, " +
            ".nav-dropdown-toggle, " +
            "[aria-haspopup='true']"
        );
    }

    function getDropdownMenu(dropdown) {

        if (!dropdown) {
            return null;
        }

        return dropdown.querySelector(
            ".nav-dropdown-menu"
        );
    }

    // ========================================================
    // CLOSE DROPDOWNS
    // ========================================================

    function closeAllDropdowns(except = null) {

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
                    getDropdownMenu(
                        dropdown
                    );

                if (menu) {

                    menu.classList.remove(
                        "show",
                        "open"
                    );

                    menu.setAttribute(
                        "aria-hidden",
                        "true"
                    );
                }

                const button =
                    getDropdownButton(
                        dropdown
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

    // ========================================================
    // TOGGLE DROPDOWN
    // ========================================================

    function toggleDropdown(dropdown) {

        if (!dropdown) {
            return;
        }

        const isOpen =
            dropdown.classList.contains(
                "open"
            );

        if (isOpen) {

            closeAllDropdowns();

            return;
        }

        closeAllDropdowns(
            dropdown
        );

        dropdown.classList.add(
            "open"
        );

        const menu =
            getDropdownMenu(
                dropdown
            );

        if (menu) {

            menu.classList.add(
                "show",
                "open"
            );

            menu.setAttribute(
                "aria-hidden",
                "false"
            );
        }

        const button =
            getDropdownButton(
                dropdown
            );

        if (button) {

            button.setAttribute(
                "aria-expanded",
                "true"
            );
        }
    }

    // ========================================================
    // ADMIN NAVIGATION VISIBILITY
    // ========================================================

    function updateAdminNavigation() {

        const allowed =
            isAdmin();

        const adminOnlySelectors = [
            "[data-admin-only]",
            ".admin-only",
            "#salesNavLink",
            "#salesNavItem",
            "#salesManagementNav",
            "#salesDropdown"
        ];

        const elements =
            document.querySelectorAll(
                adminOnlySelectors.join(",")
            );

        elements.forEach(
            element => {

                if (allowed) {

                    element.style.display =
                        "";

                    element.setAttribute(
                        "aria-hidden",
                        "false"
                    );

                } else {

                    element.style.display =
                        "none";

                    element.setAttribute(
                        "aria-hidden",
                        "true"
                    );
                }
            }
        );

        // Additional protection:
        // hide Manage Sales page for non-admin
        const salesPage =
            getPage("sales");

        if (
            salesPage &&
            !allowed
        ) {

            salesPage.style.display =
                "none";

            salesPage.classList.remove(
                "active"
            );
        }
    }

    // ========================================================
    // NAVIGATE DASHBOARD
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
    // NAVIGATE LEADS
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
    // NAVIGATE SALES
    // ========================================================

    async function navigateSales() {

        if (!hasProfile()) {

            if (
                typeof window.showToast ===
                "function"
            ) {

                window.showToast(
                    "Please login first.",
                    "error"
                );
            }

            return;
        }

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
    // NAVIGATE CUSTOMER PROFILE
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

        switch (normalized) {

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

    function handleNavigationClick(event) {

        const element =
            event.currentTarget;

        if (!element) {
            return;
        }

        const target =
            element.dataset.page ||
            element.dataset.view ||
            element.dataset.nav ||
            element.dataset.crmNav ||
            "";

        if (!target) {
            return;
        }

        const normalized =
            normalizeTarget(
                target
            );

        // Sales = Admin only
        if (
            normalized === "sales" &&
            !isAdmin()
        ) {

            event.preventDefault();

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
                [
                    ".nav-link[data-page]",
                    ".nav-link[data-view]",
                    ".nav-link[data-nav]",
                    ".nav-dropdown-item[data-page]",
                    ".nav-dropdown-item[data-view]",
                    ".nav-dropdown-item[data-nav]",
                    "[data-crm-nav]"
                ].join(",")
            );

        links.forEach(
            link => {

                if (
                    link.dataset.navigationBound ===
                    "true"
                ) {
                    return;
                }

                // IMPORTANT:
                // Dropdown toggle itself is NOT a page link.
                if (
                    link.classList.contains(
                        "nav-dropdown-toggle"
                    ) ||
                    link.classList.contains(
                        "nav-dropdown-btn"
                    )
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
                    getDropdownButton(
                        dropdown
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

                button.setAttribute(
                    "aria-haspopup",
                    "true"
                );

                button.setAttribute(
                    "aria-expanded",
                    "false"
                );

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

        button.setAttribute(
            "aria-controls",
            "mobileNav"
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
    // BIND DOCUMENT CLICK
    // ========================================================

    function bindDocumentClick() {

        if (documentClickBound) {
            return;
        }

        documentClickBound =
            true;

        document.addEventListener(
            "click",
            function (event) {

                const target =
                    event.target;

                if (
                    target &&
                    typeof target.closest ===
                    "function"
                ) {

                    if (
                        target.closest(
                            ".nav-dropdown"
                        )
                    ) {
                        return;
                    }
                }

                closeAllDropdowns();
            }
        );
    }

    // ========================================================
    // BIND ESCAPE KEY
    // ========================================================

    function bindEscapeKey() {

        if (escapeKeyBound) {
            return;
        }

        escapeKeyBound =
            true;

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
    // BIND RESIZE
    // ========================================================

    function bindResize() {

        if (resizeBound) {
            return;
        }

        resizeBound =
            true;

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
    // BIND LOGO
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

                        event.preventDefault();

                        crmNavigate(
                            "dashboard"
                        );
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

        const pages =
            getAllPages();

        const visiblePage =
            pages.find(
                page =>
                    page &&
                    window.getComputedStyle(
                        page
                    ).display !==
                    "none"
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

        initializeDefaultPage();
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

    window.normalizeNavigationTarget =
        normalizeTarget;

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

        refreshNavigation,

        normalizeTarget
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
    // APP READY
    // ========================================================

    window.addEventListener(
        "fsi:app-ready",
        function () {

            refreshNavigation();

            updateAdminNavigation();
        }
    );

    // ========================================================
    // PROFILE READY
    // ========================================================

    window.addEventListener(
        "fsi:profile-ready",
        function () {

            refreshNavigation();

            updateAdminNavigation();
        }
    );

    // ========================================================
    // AUTH STATE SUPPORT
    // ========================================================

    window.addEventListener(
        "fsi:logged-out",
        function () {

            closeAllDropdowns();

            closeMobileMenu();

            hideAllPages();

            const loginPage =
                document.getElementById(
                    "login-page"
                );

            if (loginPage) {

                loginPage.style.display =
                    "flex";

                loginPage.setAttribute(
                    "aria-hidden",
                    "false"
                );
            }
        }
    );

})();
