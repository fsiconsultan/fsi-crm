// ============================================================
// FSI CRM - NAVIGATION SYSTEM
// File: js/navigation.js
// ============================================================

"use strict";

(function () {

  // ==========================================================
  // STATE
  // ==========================================================

  let navigationInitialized = false;
  let navigationEventsBound = false;
  let currentPage = "dashboard";


  // ==========================================================
  // PAGE MAP
  // ==========================================================

  const PAGE_MAP = {
    dashboard: "view-dashboard",
    leads: "view-leads",
    customers: "view-leads",
    customer: "view-customer-profile",
    "customer-profile": "view-customer-profile",
    profile: "view-customer-profile",
    sales: "view-sales",
    manageSales: "view-sales",
    "manage-sales": "view-sales"
  };


  // ==========================================================
  // DOM HELPERS
  // ==========================================================

  function $(selector, parent) {
    return (parent || document).querySelector(selector);
  }

  function $$(selector, parent) {
    return Array.from(
      (parent || document).querySelectorAll(selector)
    );
  }


  function getElement(id) {
    return document.getElementById(id);
  }


  // ==========================================================
  // PROFILE / ROLE
  // ==========================================================

  function getProfile() {
    if (window.currentProfile) {
      return window.currentProfile;
    }

    try {
      if (typeof currentProfile !== "undefined") {
        return currentProfile;
      }
    } catch (error) {
      // Ignore
    }

    return null;
  }


  function getCurrentUser() {
    if (window.currentUser) {
      return window.currentUser;
    }

    try {
      if (typeof currentUser !== "undefined") {
        return currentUser;
      }
    } catch (error) {
      // Ignore
    }

    return null;
  }


  function normalizeRole(role) {
    return String(role || "")
      .trim()
      .toLowerCase();
  }


  function isAdmin() {
    const profile = getProfile();

    if (!profile) {
      return false;
    }

    const role = normalizeRole(profile.role);

    return (
      role === "admin" ||
      role === "owner" ||
      role === "administrator"
    );
  }


  function isSales() {
    const profile = getProfile();

    if (!profile) {
      return false;
    }

    const role = normalizeRole(profile.role);

    return (
      role === "sales" ||
      role === "salesperson"
    );
  }


  // ==========================================================
  // PAGE RESOLUTION
  // ==========================================================

  function normalizeTarget(target) {

    if (!target) {
      return null;
    }

    let value = String(target).trim();

    if (!value) {
      return null;
    }

    // Remove leading #
    value = value.replace(/^#/, "");

    // Direct page ID
    if (Object.values(PAGE_MAP).includes(value)) {

      return Object.keys(PAGE_MAP).find(
        key => PAGE_MAP[key] === value
      ) || null;
    }

    // Normalize
    value = value
      .replace(/_/g, "-")
      .toLowerCase();

    if (PAGE_MAP[value]) {
      return value;
    }

    // Common aliases
    const aliases = {
      home: "dashboard",
      dash: "dashboard",
      customer: "customer-profile",
      customers: "leads",
      lead: "leads",
      leadlist: "leads",
      salesmanagement: "sales",
      "sales-management": "sales",
      "manage-sales": "sales"
    };

    if (aliases[value]) {
      return aliases[value];
    }

    return null;
  }


  function getPageElement(pageName) {

    const normalized = normalizeTarget(pageName);

    if (!normalized) {
      return null;
    }

    const pageId = PAGE_MAP[normalized];

    if (!pageId) {
      return null;
    }

    return getElement(pageId);
  }


  function getAllPages() {

    return $$(".crm-page");
  }


  // ==========================================================
  // PAGE VISIBILITY
  // ==========================================================

  function hideAllPages() {

    getAllPages().forEach(function (page) {

      page.classList.remove("active");
      page.classList.add("hidden");

      page.setAttribute("aria-hidden", "true");

    });
  }


  function showPage(pageName, options) {

    options = options || {};

    const normalized = normalizeTarget(pageName);

    if (!normalized) {
      console.warn(
        "[FSI Navigation] Unknown page:",
        pageName
      );

      return false;
    }

    // Sales page hanya untuk Admin
    if (normalized === "sales" && !isAdmin()) {

      if (typeof window.showToast === "function") {
        window.showToast(
          "Hanya Admin yang dapat membuka Manage Sales.",
          "warning"
        );
      }

      return false;
    }

    const page = getPageElement(normalized);

    if (!page) {

      console.warn(
        "[FSI Navigation] Page element tidak ditemukan:",
        normalized
      );

      return false;
    }

    hideAllPages();

    page.classList.remove("hidden");
    page.classList.add("active");

    page.setAttribute("aria-hidden", "false");

    currentPage = normalized;

    setActiveNavigation(normalized);
    setNavigationTitle(normalized);

    closeAllDropdowns();
    closeMobileMenu();

    // Scroll ke atas
    if (!options.keepScroll) {

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

    }

    // Event untuk module lain
    try {

      window.dispatchEvent(
        new CustomEvent("fsi:navigation-changed", {
          detail: {
            page: normalized,
            element: page
          }
        })
      );

    } catch (error) {
      // Ignore
    }

    return true;
  }


  // ==========================================================
  // ACTIVE NAVIGATION
  // ==========================================================

  function getNavigationTarget(element) {

    if (!element) {
      return null;
    }

    const dataset = element.dataset || {};

    return (
      dataset.page ||
      dataset.view ||
      dataset.nav ||
      dataset.crmNav ||
      dataset.target ||
      null
    );
  }


  function setActiveNavigation(pageName) {

    const normalized = normalizeTarget(pageName);

    if (!normalized) {
      return;
    }

    const navElements = $$(
      [
        "[data-page]",
        "[data-view]",
        "[data-nav]",
        "[data-crm-nav]"
      ].join(",")
    );

    navElements.forEach(function (element) {

      const target = getNavigationTarget(element);
      const normalizedTarget = normalizeTarget(target);

      element.classList.remove("active");

      if (
        normalizedTarget &&
        normalizedTarget === normalized
      ) {
        element.classList.add("active");
      }

    });

  }


  // ==========================================================
  // PAGE TITLE
  // ==========================================================

  function setNavigationTitle(pageName) {

    const normalized = normalizeTarget(pageName);

    const titles = {
      dashboard: {
        title: "Dashboard",
        subtitle: "Overview CRM dan aktivitas customer."
      },

      leads: {
        title: isAdmin()
          ? "Customer & Leads"
          : "My Customers",

        subtitle: isAdmin()
          ? "Kelola seluruh database customer dan leads."
          : "Kelola database customer Anda."
      },

      "customer-profile": {
        title: "Customer Profile",
        subtitle: "Detail informasi dan aktivitas customer."
      },

      sales: {
        title: "Manage Sales",
        subtitle: "Kelola akun, role, dan status Sales."
      }
    };

    const config = titles[normalized];

    if (!config) {
      return;
    }

    const titleElements = [
      getElement("current-page-title"),
      getElement("page-title"),
      getElement("pageTitle")
    ].filter(Boolean);

    titleElements.forEach(function (element) {

      element.textContent = config.title;

    });

    const subtitleElements = [
      getElement("current-page-subtitle"),
      getElement("page-subtitle"),
      getElement("pageSubtitle")
    ].filter(Boolean);

    subtitleElements.forEach(function (element) {

      element.textContent = config.subtitle;

    });

  }


  // ==========================================================
  // ADMIN NAVIGATION
  // ==========================================================

  function updateAdminNavigation() {

    const adminElements = $$(
      ".admin-only, .admin-only-nav, [data-admin-only]"
    );

    adminElements.forEach(function (element) {

      if (isAdmin()) {

        element.style.display = "";

        element.removeAttribute("aria-hidden");

      } else {

        element.style.display = "none";

        element.setAttribute("aria-hidden", "true");

      }

    });

  }


  // ==========================================================
  // SALES HEADER DROPDOWN
  // ==========================================================
  // KHUSUS TAMBAHAN:
  // Menu "Sales" di header Admin sekarang berisi
  // nama-nama Sales aktif.
  //
  // Tidak mengubah menu lain.
  // ==========================================================

  function getSupabaseClient() {

    if (window.supabaseClient) {
      return window.supabaseClient;
    }

    try {
      if (
        typeof supabaseClient !== "undefined" &&
        supabaseClient
      ) {
        return supabaseClient;
      }
    } catch (error) {
      // Ignore
    }

    return null;
  }


  function getSalesDisplayName(sales) {

    if (!sales) {
      return "Sales";
    }

    return (
      sales.name ||
      sales.full_name ||
      sales.username ||
      sales.email ||
      "Sales"
    );
  }


  function getSalesId(sales) {

    if (!sales) {
      return null;
    }

    return (
      sales.id ||
      sales.user_id ||
      sales.auth_user_id ||
      sales["auth_user-id"] ||
      null
    );
  }


  function isActiveSales(sales) {

    if (!sales) {
      return false;
    }

    const role = normalizeRole(sales.role);

    if (
      role !== "sales" &&
      role !== "salesperson"
    ) {
      return false;
    }

    const status = String(
      sales.status || "Active"
    )
      .trim()
      .toLowerCase();

    return (
      status === "active" ||
      status === "aktif" ||
      status === "1" ||
      status === "true"
    );
  }


  function findSalesHeaderDropdown() {

    const dropdowns = $$(".nav-dropdown");

    for (const dropdown of dropdowns) {

      const button = dropdown.querySelector(
        ".nav-dropdown-btn, [aria-haspopup='true']"
      );

      if (!button) {
        continue;
      }

      const text = String(
        button.textContent || ""
      )
        .trim()
        .toLowerCase();

      /*
       * Cari tombol header yang benar-benar bernama Sales.
       *
       * Tidak menggunakan data-page="sales" karena tombol
       * Sales sekarang adalah dropdown nama Sales, bukan
       * halaman Manage Sales.
       */
      if (
        text === "sales" ||
        text.includes("sales")
      ) {

        return {
          container: dropdown,
          button: button,
          menu: dropdown.querySelector(
            ".nav-dropdown-menu"
          )
        };

      }

    }

    return null;
  }


  async function loadSalesHeaderDropdown() {

    // Hanya Admin yang mendapatkan daftar Sales.
    if (!isAdmin()) {
      return;
    }

    const target =
      findSalesHeaderDropdown();

    if (!target || !target.menu) {
      return;
    }

    const client =
      getSupabaseClient();

    if (!client) {
      console.warn(
        "[FSI Navigation] Supabase client belum tersedia."
      );

      return;
    }

    try {

      const result = await client
        .from("sales_users")
        .select("*");

      if (result.error) {

        console.error(
          "[FSI Navigation] Gagal mengambil Sales:",
          result.error
        );

        return;
      }

      const rows = Array.isArray(result.data)
        ? result.data
        : [];

      const activeSales =
        rows
          .filter(isActiveSales)
          .sort(function (a, b) {

            return getSalesDisplayName(a)
              .localeCompare(
                getSalesDisplayName(b),
                "id",
                {
                  sensitivity: "base"
                }
              );

          });


      // Bersihkan isi dropdown lama.
      target.menu.innerHTML = "";


      // ------------------------------------------------------
      // HEADER DROPDOWN
      // ------------------------------------------------------

      const headerItem =
        document.createElement("div");

      headerItem.className =
        "nav-dropdown-label";

      headerItem.textContent =
        "Pilih Sales";

      headerItem.style.cssText =
        "padding:8px 14px;font-size:11px;font-weight:700;" +
        "text-transform:uppercase;letter-spacing:.06em;" +
        "opacity:.6;cursor:default;";

      target.menu.appendChild(
        headerItem
      );


      // ------------------------------------------------------
      // SEMUA SALES
      // ------------------------------------------------------

      const allItem =
        document.createElement("a");

      allItem.href = "#";

      allItem.className =
        "nav-dropdown-item";

      allItem.textContent =
        "Semua Sales";

      allItem.dataset.salesId = "";

      allItem.addEventListener(
        "click",
        function (event) {

          event.preventDefault();
          event.stopPropagation();

          selectSalesFromHeader(
            null,
            "Semua Sales"
          );

        }
      );

      target.menu.appendChild(
        allItem
      );


      // ------------------------------------------------------
      // NAMA SALES
      // ------------------------------------------------------

      if (!activeSales.length) {

        const emptyItem =
          document.createElement("div");

        emptyItem.className =
          "nav-dropdown-item disabled";

        emptyItem.textContent =
          "Belum ada Sales aktif";

        emptyItem.style.opacity = "0.55";
        emptyItem.style.cursor = "default";

        target.menu.appendChild(
          emptyItem
        );

      } else {

        activeSales.forEach(
          function (sales) {

            const salesId =
              getSalesId(sales);

            const salesName =
              getSalesDisplayName(sales);

            if (!salesId) {
              return;
            }

            const item =
              document.createElement("a");

            item.href = "#";

            item.className =
              "nav-dropdown-item sales-header-item";

            item.textContent =
              salesName;

            item.dataset.salesId =
              salesId;

            item.dataset.salesName =
              salesName;

            item.addEventListener(
              "click",
              function (event) {

                event.preventDefault();
                event.stopPropagation();

                selectSalesFromHeader(
                  salesId,
                  salesName
                );

              }
            );

            target.menu.appendChild(
              item
            );

          }
        );

      }


      // ------------------------------------------------------
      // Refresh icon jika tersedia
      // ------------------------------------------------------

      if (
        typeof window.refreshIcons ===
        "function"
      ) {

        window.refreshIcons();

      }

    } catch (error) {

      console.error(
        "[FSI Navigation] Error load Sales dropdown:",
        error
      );

    }

  }


  // ==========================================================
  // SELECT SALES FROM HEADER
  // ==========================================================

  function selectSalesFromHeader(
    salesId,
    salesName
  ) {

    /*
     * Simpan pilihan supaya module Leads bisa
     * menggunakannya.
     */
    window.crmSelectedSalesId =
      salesId || null;

    window.crmSelectedSalesName =
      salesName || "Semua Sales";


    /*
     * Compatibility:
     *
     * Jika leads.js / module lain memiliki fungsi
     * selectSalesFilter(), gunakan fungsi tersebut.
     */
    if (
      typeof window.selectSalesFilter ===
      "function"
    ) {

      try {

        window.selectSalesFilter(
          salesId || "",
          salesName || "Semua Sales"
        );

      } catch (error) {

        console.warn(
          "[FSI Navigation] selectSalesFilter error:",
          error
        );

      }

    }


    /*
     * Compatibility lain jika tersedia.
     */
    if (
      typeof window.setSalesFilter ===
      "function"
    ) {

      try {

        window.setSalesFilter(
          salesId || "",
          salesName || "Semua Sales"
        );

      } catch (error) {

        console.warn(
          "[FSI Navigation] setSalesFilter error:",
          error
        );

      }

    }


    /*
     * Event khusus untuk Leads.
     *
     * leads.js dapat menangkap event ini dan
     * melakukan query berdasarkan sales_id.
     */
    try {

      window.dispatchEvent(
        new CustomEvent(
          "fsi:sales-selected",
          {
            detail: {
              salesId:
                salesId || null,

              salesName:
                salesName || "Semua Sales"
            }
          }
        )
      );

    } catch (error) {
      // Ignore
    }


    /*
     * Masuk ke halaman Leads / My Leads.
     */
    navigateLeads();


    /*
     * Tutup dropdown setelah memilih Sales.
     */
    closeAllDropdowns();

  }


  // ==========================================================
  // REFRESH SALES HEADER
  // ==========================================================

  function refreshSalesHeaderDropdown() {

    if (!isAdmin()) {
      return;
    }

    loadSalesHeaderDropdown();

  }


  // ==========================================================
  // MOBILE MENU
  // ==========================================================

  function getMobileMenu() {

    return (
      getElement("mobileNav") ||
      getElement("mobile-menu") ||
      $(".mobile-nav")
    );

  }


  function getMobileMenuButton() {

    return (
      getElement("mobileMenuBtn") ||
      getElement("mobile-menu-btn") ||
      $(".mobile-menu-btn")
    );

  }


  function openMobileMenu() {

    const menu = getMobileMenu();
    const button = getMobileMenuButton();

    if (!menu) {
      return;
    }

    menu.classList.add("open");
    menu.classList.add("active");

    menu.setAttribute("aria-hidden", "false");

    if (button) {
      button.classList.add("active");
      button.setAttribute("aria-expanded", "true");
    }

    document.body.classList.add("mobile-menu-open");
  }


  function closeMobileMenu() {

    const menu = getMobileMenu();
    const button = getMobileMenuButton();

    if (menu) {

      menu.classList.remove("open");
      menu.classList.remove("active");

      menu.setAttribute("aria-hidden", "true");

    }

    if (button) {

      button.classList.remove("active");

      button.setAttribute("aria-expanded", "false");

    }

    document.body.classList.remove("mobile-menu-open");
  }


  function toggleMobileMenu() {

    const menu = getMobileMenu();

    if (!menu) {
      return;
    }

    if (
      menu.classList.contains("open") ||
      menu.classList.contains("active")
    ) {

      closeMobileMenu();

    } else {

      openMobileMenu();

    }

  }


  // ==========================================================
  // DROPDOWNS
  // ==========================================================

  function closeAllDropdowns(except) {

    $$(".nav-dropdown").forEach(function (dropdown) {

      if (except && dropdown === except) {
        return;
      }

      dropdown.classList.remove("open");

      const button = dropdown.querySelector(
        ".nav-dropdown-btn, [aria-haspopup='true']"
      );

      const menu = dropdown.querySelector(
        ".nav-dropdown-menu"
      );

      if (button) {
        button.setAttribute("aria-expanded", "false");
      }

      if (menu) {
        menu.classList.remove("open");
      }

    });


    // User dropdown
    $$(".user-menu").forEach(function (menuContainer) {

      if (
        except &&
        menuContainer === except
      ) {
        return;
      }

      menuContainer.classList.remove("open");

      const button = menuContainer.querySelector(
        ".user-menu-btn, [aria-haspopup='true']"
      );

      const dropdown = menuContainer.querySelector(
        ".user-menu-dropdown"
      );

      if (button) {
        button.setAttribute("aria-expanded", "false");
      }

      if (dropdown) {
        dropdown.classList.remove("open");
      }

    });

  }


  function toggleDropdown(dropdown) {

    if (!dropdown) {
      return;
    }

    const isOpen =
      dropdown.classList.contains("open");

    closeAllDropdowns(dropdown);

    if (isOpen) {

      dropdown.classList.remove("open");

    } else {

      dropdown.classList.add("open");

    }

    const button = dropdown.querySelector(
      ".nav-dropdown-btn, [aria-haspopup='true']"
    );

    const menu = dropdown.querySelector(
      ".nav-dropdown-menu"
    );

    if (button) {

      button.setAttribute(
        "aria-expanded",
        isOpen ? "false" : "true"
      );

    }

    if (menu) {

      menu.classList.toggle(
        "open",
        !isOpen
      );

    }

  }


  function bindNavigationDropdowns() {

    $$(".nav-dropdown").forEach(function (dropdown) {

      const button = dropdown.querySelector(
        ".nav-dropdown-btn, [aria-haspopup='true']"
      );

      if (!button) {
        return;
      }

      if (button.dataset.navigationBound === "true") {
        return;
      }

      button.dataset.navigationBound = "true";

      button.addEventListener(
        "click",
        function (event) {

          event.preventDefault();
          event.stopPropagation();

          toggleDropdown(dropdown);

        }
      );

    });

  }


  // ==========================================================
  // USER DROPDOWN
  // ==========================================================

  function bindUserDropdown() {

    $$(".user-menu").forEach(function (container) {

      const button = container.querySelector(
        ".user-menu-btn, [aria-haspopup='true']"
      );

      if (!button) {
        return;
      }

      if (button.dataset.navigationBound === "true") {
        return;
      }

      button.dataset.navigationBound = "true";

      button.addEventListener(
        "click",
        function (event) {

          event.preventDefault();
          event.stopPropagation();

          const isOpen =
            container.classList.contains("open");

          closeAllDropdowns(container);

          container.classList.toggle(
            "open",
            !isOpen
          );

          button.setAttribute(
            "aria-expanded",
            !isOpen ? "true" : "false"
          );

          const dropdown =
            container.querySelector(
              ".user-menu-dropdown"
            );

          if (dropdown) {

            dropdown.classList.toggle(
              "open",
              !isOpen
            );

          }

        }
      );

    });

  }


  // ==========================================================
  // NAVIGATION ACTIONS
  // ==========================================================

  function navigateDashboard() {

    if (
      window.FSIDashboard &&
      typeof window.FSIDashboard.showDashboard === "function"
    ) {

      return window.FSIDashboard.showDashboard();

    }

    return showPage("dashboard");
  }


  function navigateLeads() {

    if (
      window.FSIDashboard &&
      typeof window.FSIDashboard.showLeads === "function"
    ) {

      return window.FSIDashboard.showLeads();

    }

    return showPage("leads");
  }


  function navigateSales() {

    if (!isAdmin()) {

      if (typeof window.showToast === "function") {

        window.showToast(
          "Akses Manage Sales hanya untuk Admin.",
          "warning"
        );

      }

      return false;
    }

    if (
      window.FSIDashboard &&
      typeof window.FSIDashboard.showSales === "function"
    ) {

      return window.FSIDashboard.showSales();

    }

    return showPage("sales");
  }


  function navigateCustomerProfile(customerId) {

    if (
      window.crmOpenCustomerProfile &&
      typeof window.crmOpenCustomerProfile === "function"
    ) {

      return window.crmOpenCustomerProfile(
        customerId
      );

    }

    if (
      window.FSIDashboard &&
      typeof window.FSIDashboard.showCustomerProfile === "function"
    ) {

      return window.FSIDashboard.showCustomerProfile(
        customerId
      );

    }

    return showPage("customer-profile");
  }


  // ==========================================================
  // MAIN NAVIGATION FUNCTION
  // ==========================================================

  function crmNavigate(target, data) {

    const normalized = normalizeTarget(target);

    if (!normalized) {

      console.warn(
        "[FSI Navigation] Target tidak dikenal:",
        target
      );

      return false;
    }

    switch (normalized) {

      case "dashboard":
        return navigateDashboard();

      case "leads":
        return navigateLeads();

      case "sales":
        return navigateSales();

      case "customer-profile":
        return navigateCustomerProfile(
          data && data.customerId
            ? data.customerId
            : data && data.id
              ? data.id
              : null
        );

      default:
        return showPage(normalized);

    }

  }


  // ==========================================================
  // NAVIGATION CLICK HANDLER
  // ==========================================================

  function handleNavigationClick(event) {

    const element =
      event.currentTarget;

    if (!element) {
      return;
    }

    // Jangan proses dropdown toggle
    if (
      element.classList.contains("nav-dropdown-btn") ||
      element.getAttribute("aria-haspopup") === "true"
    ) {

      return;

    }

    const target =
      getNavigationTarget(element);

    if (!target) {
      return;
    }

    event.preventDefault();

    const normalized =
      normalizeTarget(target);

    if (!normalized) {
      return;
    }

    const customerId =
      element.dataset.customerId ||
      element.dataset.id ||
      null;

    crmNavigate(
      normalized,
      {
        customerId: customerId
      }
    );

  }


  // ==========================================================
  // BIND NAVIGATION LINKS
  // ==========================================================

  function bindNavigationLinks() {

    const selector = [
      ".nav-link[data-page]",
      ".nav-link[data-view]",
      ".nav-link[data-nav]",
      ".nav-link[data-crm-nav]",

      ".nav-item[data-page]",
      ".nav-item[data-view]",
      ".nav-item[data-nav]",
      ".nav-item[data-crm-nav]",

      ".nav-dropdown-item[data-page]",
      ".nav-dropdown-item[data-view]",
      ".nav-dropdown-item[data-nav]",
      ".nav-dropdown-item[data-crm-nav]",

      "[data-crm-nav]"
    ].join(",");

    $$(selector).forEach(function (element) {

      if (element.dataset.navigationBound === "true") {
        return;
      }

      const target =
        getNavigationTarget(element);

      if (!target) {
        return;
      }

      element.dataset.navigationBound = "true";

      element.addEventListener(
        "click",
        handleNavigationClick
      );

    });

  }


  // ==========================================================
  // LOGO / HOME
  // ==========================================================

  function bindHomeButtons() {

    const elements = $$(
      "[data-home]"
    );

    elements.forEach(function (element) {

      if (element.dataset.navigationBound === "true") {
        return;
      }

      element.dataset.navigationBound = "true";

      element.addEventListener(
        "click",
        function (event) {

          event.preventDefault();

          crmNavigate("dashboard");

        }
      );

    });

  }


  // ==========================================================
  // MOBILE BUTTON BINDING
  // ==========================================================

  function bindMobileMenu() {

    const button =
      getMobileMenuButton();

    if (!button) {
      return;
    }

    if (button.dataset.navigationBound === "true") {
      return;
    }

    button.dataset.navigationBound = "true";

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


  // ==========================================================
  // OUTSIDE CLICK
  // ==========================================================

  function bindDocumentClick() {

    document.addEventListener(
      "click",
      function (event) {

        const target = event.target;

        if (!(target instanceof Element)) {
          return;
        }

        const insideDropdown =
          target.closest(
            ".nav-dropdown, .user-menu"
          );

        const insideMobile =
          target.closest(
            "#mobileNav, .mobile-nav, #mobileMenuBtn, .mobile-menu-btn"
          );

        if (!insideDropdown) {

          closeAllDropdowns();

        }

        if (!insideMobile) {

          closeMobileMenu();

        }

      }
    );

  }


  // ==========================================================
  // ESCAPE KEY
  // ==========================================================

  function bindEscapeKey() {

    document.addEventListener(
      "keydown",
      function (event) {

        if (event.key !== "Escape") {
          return;
        }

        closeAllDropdowns();
        closeMobileMenu();

      }
    );

  }


  // ==========================================================
  // WINDOW RESIZE
  // ==========================================================

  function bindResize() {

    window.addEventListener(
      "resize",
      function () {

        if (window.innerWidth > 1150) {

          closeMobileMenu();

        }

      }
    );

  }


  // ==========================================================
  // DEFAULT PAGE
  // ==========================================================

  function initializeDefaultPage() {

    const profile =
      getProfile();

    if (!profile) {
      return;
    }

    const pages =
      getAllPages();

    if (!pages.length) {
      return;
    }

    const activePage =
      $(".crm-page.active");

    if (activePage) {

      const pageName =
        normalizeTarget(
          activePage.id
        );

      if (pageName) {

        currentPage =
          pageName;

        setActiveNavigation(
          pageName
        );

        setNavigationTitle(
          pageName
        );

        return;

      }

    }

    // Default selalu Dashboard
    showPage("dashboard");

  }


  // ==========================================================
  // REFRESH NAVIGATION
  // ==========================================================

  function refreshNavigation() {

    updateAdminNavigation();

    setActiveNavigation(
      currentPage
    );

    setNavigationTitle(
      currentPage
    );

    // Hanya tambahan untuk dropdown Sales Admin.
    refreshSalesHeaderDropdown();

  }


  // ==========================================================
  // APP READY
  // ==========================================================

  function handleAppReady() {

    refreshNavigation();

    initializeDefaultPage();

  }


  // ==========================================================
  // PROFILE READY
  // ==========================================================

  function handleProfileReady() {

    refreshNavigation();

    initializeDefaultPage();

  }


  // ==========================================================
  // INITIALIZE
  // ==========================================================

  function initializeNavigation() {

    if (navigationInitialized) {
      return;
    }

    navigationInitialized = true;

    bindNavigationLinks();
    bindNavigationDropdowns();
    bindUserDropdown();
    bindHomeButtons();
    bindMobileMenu();

    if (!navigationEventsBound) {

      navigationEventsBound = true;

      bindDocumentClick();
      bindEscapeKey();
      bindResize();

      window.addEventListener(
        "fsi:app-ready",
        handleAppReady
      );

      window.addEventListener(
        "fsi:profile-ready",
        handleProfileReady
      );

      window.addEventListener(
        "fsi:auth-ready",
        handleProfileReady
      );

      window.addEventListener(
        "fsi:sales-changed",
        refreshNavigation
      );

    }

    refreshNavigation();

    console.log(
      "FSI Navigation initialized."
    );

  }


  // ==========================================================
  // DOM READY
  // ==========================================================

  if (
    document.readyState === "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initializeNavigation
    );

  } else {

    initializeNavigation();

  }


  // ==========================================================
  // PUBLIC API
  // ==========================================================

  window.FSINavigation = {

    initialize: initializeNavigation,

    showPage: showPage,

    navigate: crmNavigate,

    navigateDashboard: navigateDashboard,

    navigateLeads: navigateLeads,

    navigateSales: navigateSales,

    navigateCustomerProfile:
      navigateCustomerProfile,

    setActiveNavigation:
      setActiveNavigation,

    refresh:
      refreshNavigation,

    refreshSales:
      refreshSalesHeaderDropdown,

    selectSales:
      selectSalesFromHeader,

    closeDropdowns:
      closeAllDropdowns,

    closeMobileMenu:
      closeMobileMenu,

    openMobileMenu:
      openMobileMenu,

    getCurrentPage: function () {
      return currentPage;
    },

    isAdmin:
      isAdmin,

    isSales:
      isSales

  };


  // Global compatibility
  window.crmNavigate = crmNavigate;

  window.showCRMPage = showPage;

  window.navigateDashboard =
    navigateDashboard;

  window.navigateLeads =
    navigateLeads;

  window.navigateSales =
    navigateSales;

  window.navigateCustomerProfile =
    navigateCustomerProfile;


})();
