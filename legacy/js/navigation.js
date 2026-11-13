// ============================================================
// FSI CRM - NAVIGATION SYSTEM
// File: js/navigation.js
// Version: 2026.09.4
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
  // CANONICAL PAGE MAP
  // ==========================================================
  //
  // IMPORTANT:
  // Satu element ID hanya boleh memiliki satu nama halaman
  // utama/canonical.
  //
  // Ini mencegah:
  //
  // view-customer-profile
  //
  // terbaca sebagai "customer" dan bukan
  // "customer-profile".
  //
  // ==========================================================

  const CANONICAL_PAGE_BY_ID = {
    "view-dashboard": "dashboard",
    "view-leads": "leads",
    "view-customer-profile": "customer-profile",
    "view-sales": "sales"
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

    const role =
      normalizeRole(profile.role);

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

    const role =
      normalizeRole(profile.role);

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


    let value =
      String(target).trim();


    if (!value) {
      return null;
    }


    // --------------------------------------------------------
    // Remove leading #
    // --------------------------------------------------------

    value =
      value.replace(/^#/, "");


    // --------------------------------------------------------
    // DIRECT PAGE ID
    // --------------------------------------------------------
    //
    // IMPORTANT:
    // Jangan mencari reverse dari PAGE_MAP karena:
    //
    // customer
    // customer-profile
    // profile
    //
    // semuanya memiliki ID yang sama.
    //
    // Kita gunakan canonical mapping.
    //
    // --------------------------------------------------------

    if (CANONICAL_PAGE_BY_ID[value]) {

      return CANONICAL_PAGE_BY_ID[value];

    }


    // --------------------------------------------------------
    // Normalize
    // --------------------------------------------------------

    value =
      value
        .replace(/_/g, "-")
        .toLowerCase();


    // --------------------------------------------------------
    // Exact canonical targets
    // --------------------------------------------------------

    if (
      value === "dashboard" ||
      value === "leads" ||
      value === "customers" ||
      value === "customer" ||
      value === "customer-profile" ||
      value === "profile" ||
      value === "sales" ||
      value === "managesales" ||
      value === "manage-sales"
    ) {

      // ------------------------------------------------------
      // Canonicalize aliases
      // ------------------------------------------------------

      if (
        value === "customers"
      ) {
        return "leads";
      }


      if (
        value === "customer" ||
        value === "profile" ||
        value === "customer-profile"
      ) {
        return "customer-profile";
      }


      if (
        value === "managesales" ||
        value === "manage-sales"
      ) {
        return "sales";
      }


      return value;

    }


    // --------------------------------------------------------
    // Common aliases
    // --------------------------------------------------------

    const aliases = {

      home:
        "dashboard",

      dash:
        "dashboard",

      customer:
        "customer-profile",

      customers:
        "leads",

      lead:
        "leads",

      leadlist:
        "leads",

      salesmanagement:
        "sales",

      "sales-management":
        "sales",

      "manage-sales":
        "sales"

    };


    if (aliases[value]) {
      return aliases[value];
    }


    return null;

  }


  function getPageElement(pageName) {

    const normalized =
      normalizeTarget(pageName);


    if (!normalized) {
      return null;
    }


    const pageId =
      PAGE_MAP[normalized];


    if (!pageId) {
      return null;
    }


    return getElement(pageId);

  }


  // ==========================================================
  // GET ALL CRM PAGES
  // ==========================================================

  function getAllPages() {

    const elements =
      new Set();


    $$(".crm-page")
      .forEach(function (element) {
        elements.add(element);
      });


    $$(".app-page")
      .forEach(function (element) {
        elements.add(element);
      });


    $$('[id^="view-"]')
      .forEach(function (element) {
        elements.add(element);
      });


    return Array.from(elements);

  }


  // ==========================================================
  // PAGE VISIBILITY
  // ==========================================================

  function hideAllPages() {

    getAllPages().forEach(function (page) {

      page.classList.remove("active");
      page.classList.add("hidden");


      page.setAttribute(
        "aria-hidden",
        "true"
      );


      // Keep existing behavior.
      // Active page will be restored immediately by showPage().
      page.style.display = "none";

    });

  }


  // ==========================================================
  // FORCE PAGE ACTIVE
  // ==========================================================
  //
  // Centralized function khusus untuk memastikan page aktif.
  //
  // Ini penting karena CSS memakai:
  //
  // .crm-page {
  //   display:none !important;
  // }
  //
  // .crm-page.active {
  //   display:block !important;
  // }
  //
  // Jadi class "active" harus selalu dipasang pada page,
  // bukan hanya mengandalkan inline style.
  //
  // ==========================================================

  function activatePageElement(page) {

    if (!page) {
      return false;
    }


    page.classList.remove("hidden");
    page.classList.add("active");


    page.setAttribute(
      "aria-hidden",
      "false"
    );


    // --------------------------------------------------------
    // Remove stale inline display value.
    // CSS .active menjadi authority utama.
    // --------------------------------------------------------

    page.style.removeProperty(
      "display"
    );


    // --------------------------------------------------------
    // Safety fallback.
    // --------------------------------------------------------

    const computedStyle =
      window.getComputedStyle(page);


    if (
      computedStyle.display === "none"
    ) {

      // Do NOT leave a normal inline display value
      // as the primary mechanism.
      //
      // Re-apply active class first.
      page.classList.remove("hidden");
      page.classList.add("active");

    }


    return true;

  }


  // ==========================================================
  // SHOW PAGE
  // ==========================================================

  function showPage(pageName, options) {

    options =
      options || {};


    const normalized =
      normalizeTarget(pageName);


    if (!normalized) {

      console.warn(
        "[FSI Navigation] Unknown page:",
        pageName
      );

      return false;

    }


    // --------------------------------------------------------
    // Sales page hanya untuk Admin
    // --------------------------------------------------------

    if (
      normalized === "sales" &&
      !isAdmin()
    ) {

      if (
        typeof window.showToast ===
        "function"
      ) {

        window.showToast(
          "Hanya Admin yang dapat membuka Manage Sales.",
          "warning"
        );

      }

      return false;

    }


    const page =
      getPageElement(normalized);


    if (!page) {

      console.warn(
        "[FSI Navigation] Page element tidak ditemukan:",
        normalized,
        PAGE_MAP[normalized]
      );

      return false;

    }


    // --------------------------------------------------------
    // HIDE SEMUA PAGE
    // --------------------------------------------------------

    hideAllPages();


    // --------------------------------------------------------
    // SHOW PAGE YANG DIPILIH
    // --------------------------------------------------------

    activatePageElement(page);


    // --------------------------------------------------------
    // Simpan canonical page name
    // --------------------------------------------------------

    currentPage =
      normalized;


    // --------------------------------------------------------
    // ACTIVE NAVIGATION
    // --------------------------------------------------------

    setActiveNavigation(
      normalized
    );


    // --------------------------------------------------------
    // TITLE
    // --------------------------------------------------------

    setNavigationTitle(
      normalized
    );


    // --------------------------------------------------------
    // CLOSE MENU
    // --------------------------------------------------------

    closeAllDropdowns();
    closeMobileMenu();


    // --------------------------------------------------------
    // SCROLL TOP
    // --------------------------------------------------------

    if (!options.keepScroll) {

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


    // --------------------------------------------------------
    // EVENT
    // --------------------------------------------------------

    try {

      window.dispatchEvent(
        new CustomEvent(
          "fsi:navigation-changed",
          {
            detail: {
              page:
                normalized,

              element:
                page
            }
          }
        )
      );

    } catch (error) {
      // Ignore
    }


    // --------------------------------------------------------
    // FINAL PROFILE SAFETY
    // --------------------------------------------------------
    //
    // Khusus Customer Profile:
    // Pastikan parent page tetap active setelah semua event.
    //
    // Ini tidak merender ulang profile.
    // Hanya memastikan visibility page.
    //
    // --------------------------------------------------------

    if (
      normalized ===
      "customer-profile"
    ) {

      requestAnimationFrame(
        function () {

          if (
            page &&
            document.body.contains(page)
          ) {

            page.classList.remove(
              "hidden"
            );

            page.classList.add(
              "active"
            );

            page.setAttribute(
              "aria-hidden",
              "false"
            );

          }

        }
      );

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

    const dataset =
      element.dataset || {};


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

    const normalized =
      normalizeTarget(pageName);


    if (!normalized) {
      return;
    }


    const navElements =
      $$(
        [
          "[data-page]",
          "[data-view]",
          "[data-nav]",
          "[data-crm-nav]"
        ].join(",")
      );


    navElements.forEach(function (element) {

      const target =
        getNavigationTarget(element);


      const normalizedTarget =
        normalizeTarget(target);


      element.classList.remove(
        "active"
      );


      if (
        normalizedTarget &&
        normalizedTarget === normalized
      ) {

        element.classList.add(
          "active"
        );

      }

    });

  }


  // ==========================================================
  // PAGE TITLE
  // ==========================================================

  function setNavigationTitle(pageName) {

    const normalized =
      normalizeTarget(pageName);


    const titles = {

      dashboard: {
        title:
          "Dashboard",

        subtitle:
          "Overview CRM dan aktivitas customer."
      },


      leads: {

        title:
          isAdmin()
            ? "Customer & Leads"
            : "My Customers",

        subtitle:
          isAdmin()
            ? "Kelola seluruh database customer dan leads."
            : "Kelola database customer Anda."

      },


      "customer-profile": {

        title:
          "Customer Profile",

        subtitle:
          "Detail informasi dan aktivitas customer."

      },


      sales: {

        title:
          "Manage Sales",

        subtitle:
          "Kelola akun, role, dan status Sales."

      }

    };


    const config =
      titles[normalized];


    if (!config) {
      return;
    }


    const titleElements = [

      getElement(
        "current-page-title"
      ),

      getElement(
        "page-title"
      ),

      getElement(
        "pageTitle"
      )

    ].filter(Boolean);


    titleElements.forEach(
      function (element) {

        element.textContent =
          config.title;

      }
    );


    const subtitleElements = [

      getElement(
        "current-page-subtitle"
      ),

      getElement(
        "page-subtitle"
      ),

      getElement(
        "pageSubtitle"
      )

    ].filter(Boolean);


    subtitleElements.forEach(
      function (element) {

        element.textContent =
          config.subtitle;

      }
    );

  }


  // ==========================================================
  // ADMIN NAVIGATION
  // ==========================================================

  function updateAdminNavigation() {

    const adminElements =
      $$(
        ".admin-only, .admin-only-nav, [data-admin-only]"
      );


    adminElements.forEach(
      function (element) {

        if (isAdmin()) {

          element.style.display = "";
          element.removeAttribute(
            "aria-hidden"
          );

        } else {

          element.style.display = "none";

          element.setAttribute(
            "aria-hidden",
            "true"
          );

        }

      }
    );

  }


  // ==========================================================
  // ROLE BASED HEADER NAVIGATION
  // ==========================================================

  function updateRoleBasedHeaderNavigation() {

    const salesDropdown =
      findSalesHeaderDropdown();


    // --------------------------------------------------------
    // SALES DROPDOWN
    // --------------------------------------------------------

    if (salesDropdown) {

      const container =
        salesDropdown.container;


      if (isAdmin()) {

        container.style.display = "";

        container.removeAttribute(
          "aria-hidden"
        );

      } else {

        container.style.display = "none";

        container.setAttribute(
          "aria-hidden",
          "true"
        );

        container.classList.remove(
          "open"
        );


        if (salesDropdown.button) {

          salesDropdown.button.setAttribute(
            "aria-expanded",
            "false"
          );

        }


        if (salesDropdown.menu) {

          salesDropdown.menu.classList.remove(
            "open"
          );

        }

      }

    }


    // --------------------------------------------------------
    // MANAGE SALES
    // --------------------------------------------------------

    const manageSalesElements =
      getManageSalesNavigationElements();


    manageSalesElements.forEach(
      function (element) {

        if (isAdmin()) {

          element.style.display = "";

          element.removeAttribute(
            "aria-hidden"
          );

        } else {

          element.style.display = "none";

          element.setAttribute(
            "aria-hidden",
            "true"
          );

        }

      }
    );

  }


  // ==========================================================
  // FIND MANAGE SALES NAVIGATION ELEMENTS
  // ==========================================================

  function getManageSalesNavigationElements() {

    const elements =
      new Set();


    const selectors = [

      '[data-page="manageSales"]',
      '[data-page="manage-sales"]',

      '[data-nav="manageSales"]',
      '[data-nav="manage-sales"]',

      '[data-view="manageSales"]',
      '[data-view="manage-sales"]',

      '[data-crm-nav="manageSales"]',
      '[data-crm-nav="manage-sales"]'

    ];


    selectors.forEach(
      function (selector) {

        $$(selector).forEach(
          function (element) {

            elements.add(element);

          }
        );

      }
    );


    const navigationElements =
      $$(
        [
          ".nav-link",
          ".nav-item",
          ".mobile-nav .nav-link",
          ".mobile-nav .nav-item",
          ".mobile-menu .nav-link",
          ".mobile-menu .nav-item"
        ].join(",")
      );


    navigationElements.forEach(
      function (element) {

        const text =
          String(
            element.textContent || ""
          )
            .trim()
            .toLowerCase();


        if (
          text === "manage sales" ||
          text.includes("manage sales")
        ) {

          elements.add(element);

        }

      }
    );


    return Array.from(elements);

  }


  // ==========================================================
  // SUPABASE
  // ==========================================================

  function getSupabaseClient() {

    if (window.supabaseClient) {
      return window.supabaseClient;
    }


    try {

      if (
        typeof supabaseClient !==
          "undefined" &&
        supabaseClient
      ) {

        return supabaseClient;

      }

    } catch (error) {
      // Ignore
    }


    return null;

  }


  // ==========================================================
  // SALES DISPLAY NAME
  // ==========================================================

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


  // ==========================================================
  // SALES ID
  // ==========================================================

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


  // ==========================================================
  // ACTIVE SALES
  // ==========================================================

  function isActiveSales(sales) {

    if (!sales) {
      return false;
    }


    const role =
      normalizeRole(sales.role);


    if (
      role !== "sales" &&
      role !== "salesperson"
    ) {

      return false;

    }


    const status =
      String(
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


  // ==========================================================
  // FIND SALES HEADER DROPDOWN
  // ==========================================================

  function findSalesHeaderDropdown() {

    const dropdowns =
      $$(".nav-dropdown");


    for (
      const dropdown of dropdowns
    ) {

      const button =
        dropdown.querySelector(
          ".nav-dropdown-btn, [aria-haspopup='true']"
        );


      if (!button) {
        continue;
      }


      const text =
        String(
          button.textContent || ""
        )
          .trim()
          .toLowerCase();


      if (
        text === "sales" ||
        text.includes("sales")
      ) {

        return {

          container:
            dropdown,

          button:
            button,

          menu:
            dropdown.querySelector(
              ".nav-dropdown-menu"
            )

        };

      }

    }


    return null;

  }


  // ==========================================================
  // LOAD SALES HEADER DROPDOWN
  // ==========================================================

  async function loadSalesHeaderDropdown() {

    if (!isAdmin()) {
      return;
    }


    const target =
      findSalesHeaderDropdown();


    if (
      !target ||
      !target.menu
    ) {

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

      const result =
        await client
          .from("sales_users")
          .select("*");


      if (result.error) {

        console.error(
          "[FSI Navigation] Gagal mengambil Sales:",
          result.error
        );

        return;

      }


      const rows =
        Array.isArray(result.data)
          ? result.data
          : [];


      const activeSales =
        rows
          .filter(isActiveSales)
          .sort(
            function (a, b) {

              return getSalesDisplayName(a)
                .localeCompare(
                  getSalesDisplayName(b),
                  "id",
                  {
                    sensitivity:
                      "base"
                  }
                );

            }
          );


      target.menu.innerHTML = "";


      // ------------------------------------------------------
      // HEADER
      // ------------------------------------------------------

      const headerItem =
        document.createElement(
          "div"
        );


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
        document.createElement(
          "a"
        );


      allItem.href = "#";


      allItem.className =
        "nav-dropdown-item";


      allItem.textContent =
        "Semua Sales";


      allItem.dataset.salesId =
        "";


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
      // SALES
      // ------------------------------------------------------

      if (!activeSales.length) {

        const emptyItem =
          document.createElement(
            "div"
          );


        emptyItem.className =
          "nav-dropdown-item disabled";


        emptyItem.textContent =
          "Belum ada Sales aktif";


        emptyItem.style.opacity =
          "0.55";


        emptyItem.style.cursor =
          "default";


        target.menu.appendChild(
          emptyItem
        );

      } else {

        activeSales.forEach(
          function (sales) {

            const salesId =
              getSalesId(sales);


            const salesName =
              getSalesDisplayName(
                sales
              );


            if (!salesId) {
              return;
            }


            const item =
              document.createElement(
                "a"
              );


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

    window.crmSelectedSalesId =
      salesId || null;


    window.crmSelectedSalesName =
      salesName || "Semua Sales";


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


    try {

      window.dispatchEvent(
        new CustomEvent(
          "fsi:sales-selected",
          {
            detail: {

              salesId:
                salesId || null,

              salesName:
                salesName ||
                "Semua Sales"

            }
          }
        )
      );

    } catch (error) {
      // Ignore
    }


    navigateLeads();


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

    const menu =
      getMobileMenu();


    const button =
      getMobileMenuButton();


    if (!menu) {
      return;
    }


    menu.classList.add("open");
    menu.classList.add("active");


    menu.setAttribute(
      "aria-hidden",
      "false"
    );


    if (button) {

      button.classList.add(
        "active"
      );


      button.setAttribute(
        "aria-expanded",
        "true"
      );

    }


    document.body.classList.add(
      "mobile-menu-open"
    );

  }


  function closeMobileMenu() {

    const menu =
      getMobileMenu();


    const button =
      getMobileMenuButton();


    if (menu) {

      menu.classList.remove(
        "open"
      );

      menu.classList.remove(
        "active"
      );


      menu.setAttribute(
        "aria-hidden",
        "true"
      );

    }


    if (button) {

      button.classList.remove(
        "active"
      );


      button.setAttribute(
        "aria-expanded",
        "false"
      );

    }


    document.body.classList.remove(
      "mobile-menu-open"
    );

  }


  function toggleMobileMenu() {

    const menu =
      getMobileMenu();


    if (!menu) {
      return;
    }


    if (
      menu.classList.contains(
        "open"
      ) ||
      menu.classList.contains(
        "active"
      )
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

    $$(".nav-dropdown")
      .forEach(
        function (dropdown) {

          if (
            except &&
            dropdown === except
          ) {
            return;
          }


          dropdown.classList.remove(
            "open"
          );


          const button =
            dropdown.querySelector(
              ".nav-dropdown-btn, [aria-haspopup='true']"
            );


          const menu =
            dropdown.querySelector(
              ".nav-dropdown-menu"
            );


          if (button) {

            button.setAttribute(
              "aria-expanded",
              "false"
            );

          }


          if (menu) {

            menu.classList.remove(
              "open"
            );

          }

        }
      );


    $$(".user-menu")
      .forEach(
        function (menuContainer) {

          if (
            except &&
            menuContainer === except
          ) {
            return;
          }


          menuContainer.classList.remove(
            "open"
          );


          const button =
            menuContainer.querySelector(
              ".user-menu-btn, [aria-haspopup='true']"
            );


          const dropdown =
            menuContainer.querySelector(
              ".user-menu-dropdown"
            );


          if (button) {

            button.setAttribute(
              "aria-expanded",
              "false"
            );

          }


          if (dropdown) {

            dropdown.classList.remove(
              "open"
            );

          }

        }
      );

  }


  function toggleDropdown(dropdown) {

    if (!dropdown) {
      return;
    }


    if (
      dropdown ===
        (
          findSalesHeaderDropdown() || {}
        ).container &&
      !isAdmin()
    ) {

      return;

    }


    const isOpen =
      dropdown.classList.contains(
        "open"
      );


    closeAllDropdowns(
      dropdown
    );


    if (isOpen) {

      dropdown.classList.remove(
        "open"
      );

    } else {

      dropdown.classList.add(
        "open"
      );

    }


    const button =
      dropdown.querySelector(
        ".nav-dropdown-btn, [aria-haspopup='true']"
      );


    const menu =
      dropdown.querySelector(
        ".nav-dropdown-menu"
      );


    if (button) {

      button.setAttribute(
        "aria-expanded",
        isOpen
          ? "false"
          : "true"
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

    $$(".nav-dropdown")
      .forEach(
        function (dropdown) {

          const button =
            dropdown.querySelector(
              ".nav-dropdown-btn, [aria-haspopup='true']"
            );


          if (!button) {
            return;
          }


          if (
            button.dataset.navigationBound ===
            "true"
          ) {
            return;
          }


          button.dataset.navigationBound =
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


  // ==========================================================
  // USER DROPDOWN
  // ==========================================================

  function bindUserDropdown() {

    $$(".user-menu")
      .forEach(
        function (container) {

          const button =
            container.querySelector(
              ".user-menu-btn, [aria-haspopup='true']"
            );


          if (!button) {
            return;
          }


          if (
            button.dataset.navigationBound ===
            "true"
          ) {
            return;
          }


          button.dataset.navigationBound =
            "true";


          button.addEventListener(
            "click",
            function (event) {

              event.preventDefault();
              event.stopPropagation();


              const isOpen =
                container.classList.contains(
                  "open"
                );


              closeAllDropdowns(
                container
              );


              container.classList.toggle(
                "open",
                !isOpen
              );


              button.setAttribute(
                "aria-expanded",
                !isOpen
                  ? "true"
                  : "false"
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

        }
      );

  }


  // ==========================================================
  // NAVIGATION ACTIONS
  // ==========================================================

  function navigateDashboard() {

    if (
      window.FSIDashboard &&
      typeof window.FSIDashboard
        .showDashboard ===
        "function"
    ) {

      return window.FSIDashboard
        .showDashboard();

    }


    return showPage(
      "dashboard"
    );

  }


  function navigateLeads() {

    if (
      window.FSIDashboard &&
      typeof window.FSIDashboard
        .showLeads ===
        "function"
    ) {

      return window.FSIDashboard
        .showLeads();

    }


    return showPage(
      "leads"
    );

  }


  function navigateSales() {

    if (!isAdmin()) {

      if (
        typeof window.showToast ===
        "function"
      ) {

        window.showToast(
          "Akses Manage Sales hanya untuk Admin.",
          "warning"
        );

      }

      return false;

    }


    if (
      window.FSIDashboard &&
      typeof window.FSIDashboard
        .showSales ===
        "function"
    ) {

      return window.FSIDashboard
        .showSales();

    }


    return showPage(
      "sales"
    );

  }


  // ==========================================================
  // NAVIGATE CUSTOMER PROFILE
  // ==========================================================
  //
  // IMPORTANT:
  //
  // Urutan baru:
  //
  // 1. Pastikan halaman Customer Profile aktif.
  // 2. Baru minta shelter.js membuka customer.
  //
  // Jadi shelter.js tidak perlu menjadi pihak pertama
  // yang menentukan visibility page.
  //
  // ==========================================================

  function navigateCustomerProfile(
    customerId
  ) {

    const id =
      customerId !== undefined &&
      customerId !== null
        ? String(customerId).trim()
        : "";


    const page =
      getPageElement(
        "customer-profile"
      );


    if (!page) {

      console.warn(
        "[FSI Navigation] Customer Profile page tidak ditemukan:",
        "view-customer-profile"
      );

      return false;

    }


    // --------------------------------------------------------
    // STEP 1
    // Aktifkan Customer Profile terlebih dahulu.
    // --------------------------------------------------------

    const pageActivated =
      showPage(
        "customer-profile",
        {
          keepScroll: false
        }
      );


    if (!pageActivated) {
      return false;
    }


    // --------------------------------------------------------
    // STEP 2
    // Kalau tidak ada ID, cukup tampilkan halaman kosong.
    // --------------------------------------------------------

    if (!id) {

      return true;

    }


    // --------------------------------------------------------
    // STEP 3
    // Kalau ada shelter.js, biarkan module profile
    // melakukan loading/render customer.
    // --------------------------------------------------------

    if (
      window.crmOpenCustomerProfile &&
      typeof window.crmOpenCustomerProfile ===
        "function"
    ) {

      try {

        const result =
          window.crmOpenCustomerProfile(
            id
          );


        // ----------------------------------------------------
        // Pastikan parent page tetap aktif setelah
        // shelter.js selesai melakukan navigasi/render.
        // ----------------------------------------------------

        if (
          result &&
          typeof result.then ===
            "function"
        ) {

          return result.then(
            function (value) {

              requestAnimationFrame(
                function () {

                  const profilePage =
                    getPageElement(
                      "customer-profile"
                    );


                  if (profilePage) {

                    profilePage.classList.remove(
                      "hidden"
                    );

                    profilePage.classList.add(
                      "active"
                    );

                    profilePage.setAttribute(
                      "aria-hidden",
                      "false"
                    );

                    profilePage.style.removeProperty(
                      "display"
                    );

                  }

                }
              );


              return value;

            }
          );

        }


        requestAnimationFrame(
          function () {

            const profilePage =
              getPageElement(
                "customer-profile"
              );


            if (profilePage) {

              profilePage.classList.remove(
                "hidden"
              );

              profilePage.classList.add(
                "active"
              );

              profilePage.setAttribute(
                "aria-hidden",
                "false"
              );

              profilePage.style.removeProperty(
                "display"
              );

            }

          }
        );


        return result;

      } catch (error) {

        console.error(
          "[FSI Navigation] Error membuka Customer Profile:",
          error
        );

        return false;

      }

    }


    // --------------------------------------------------------
    // FALLBACK DASHBOARD MODULE
    // --------------------------------------------------------

    if (
      window.FSIDashboard &&
      typeof window.FSIDashboard
        .showCustomerProfile ===
        "function"
    ) {

      try {

        return window.FSIDashboard
          .showCustomerProfile(
            id
          );

      } catch (error) {

        console.error(
          "[FSI Navigation] Error dashboard Customer Profile:",
          error
        );

        return false;

      }

    }


    // --------------------------------------------------------
    // Tidak ada module loader.
    // Page tetap ditampilkan.
    // --------------------------------------------------------

    return true;

  }


  // ==========================================================
  // MAIN NAVIGATION FUNCTION
  // ==========================================================

  function crmNavigate(
    target,
    data
  ) {

    const normalized =
      normalizeTarget(target);


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
          data &&
          data.customerId
            ? data.customerId
            : data &&
              data.id
              ? data.id
              : null
        );


      default:

        return showPage(
          normalized
        );

    }

  }


  // ==========================================================
  // NAVIGATION CLICK HANDLER
  // ==========================================================

  function handleNavigationClick(
    event
  ) {

    const element =
      event.currentTarget;


    if (!element) {
      return;
    }


    if (
      element.classList.contains(
        "nav-dropdown-btn"
      ) ||
      element.getAttribute(
        "aria-haspopup"
      ) === "true"
    ) {

      return;

    }


    const target =
      getNavigationTarget(
        element
      );


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
        customerId:
          customerId
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


    $$(selector)
      .forEach(
        function (element) {

          if (
            element.dataset.navigationBound ===
            "true"
          ) {
            return;
          }


          const target =
            getNavigationTarget(
              element
            );


          if (!target) {
            return;
          }


          element.dataset.navigationBound =
            "true";


          element.addEventListener(
            "click",
            handleNavigationClick
          );

        }
      );

  }


  // ==========================================================
  // LOGO / HOME
  // ==========================================================

  function bindHomeButtons() {

    const elements =
      $$(
        "[data-home]"
      );


    elements.forEach(
      function (element) {

        if (
          element.dataset.navigationBound ===
          "true"
        ) {
          return;
        }


        element.dataset.navigationBound =
          "true";


        element.addEventListener(
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


  // ==========================================================
  // MOBILE BUTTON BINDING
  // ==========================================================

  function bindMobileMenu() {

    const button =
      getMobileMenuButton();


    if (!button) {
      return;
    }


    if (
      button.dataset.navigationBound ===
      "true"
    ) {
      return;
    }


    button.dataset.navigationBound =
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


  // ==========================================================
  // OUTSIDE CLICK
  // ==========================================================

  function bindDocumentClick() {

    document.addEventListener(
      "click",
      function (event) {

        const target =
          event.target;


        if (
          !(target instanceof Element)
        ) {

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

        if (
          event.key !== "Escape"
        ) {

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

        if (
          window.innerWidth >
          1150
        ) {

          closeMobileMenu();

        }


        // ----------------------------------------------------
        // IMPORTANT:
        // Resize tidak lagi mengubah visibility page.
        //
        // Ini mencegah Customer Profile baru muncul/hilang
        // karena resize/F12.
        // ----------------------------------------------------

        const activePage =
          $(".crm-page.active") ||
          $(".app-page.active") ||
          $('[id^="view-"].active');


        if (activePage) {

          activePage.classList.remove(
            "hidden"
          );

          activePage.classList.add(
            "active"
          );

          activePage.setAttribute(
            "aria-hidden",
            "false"
          );

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
      $(".crm-page.active") ||
      $(".app-page.active") ||
      $('[id^="view-"].active');


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


        // ----------------------------------------------------
        // Ensure active page is visible.
        // ----------------------------------------------------

        activatePageElement(
          activePage
        );


        return;

      }

    }


    // --------------------------------------------------------
    // Default selalu Dashboard
    // --------------------------------------------------------

    showPage(
      "dashboard"
    );

  }


  // ==========================================================
  // REFRESH NAVIGATION
  // ==========================================================

  function refreshNavigation() {

    updateAdminNavigation();

    updateRoleBasedHeaderNavigation();


    setActiveNavigation(
      currentPage
    );


    setNavigationTitle(
      currentPage
    );


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


    navigationInitialized =
      true;


    bindNavigationLinks();

    bindNavigationDropdowns();

    bindUserDropdown();

    bindHomeButtons();

    bindMobileMenu();


    if (!navigationEventsBound) {

      navigationEventsBound =
        true;


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
    document.readyState ===
    "loading"
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

    initialize:
      initializeNavigation,

    showPage:
      showPage,

    navigate:
      crmNavigate,

    navigateDashboard:
      navigateDashboard,

    navigateLeads:
      navigateLeads,

    navigateSales:
      navigateSales,

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

    getCurrentPage:
      function () {
        return currentPage;
    },

    isAdmin:
      isAdmin,

    isSales:
      isSales

  };


  // ==========================================================
  // GLOBAL COMPATIBILITY
  // ==========================================================

  window.crmNavigate =
    crmNavigate;


  window.showCRMPage =
    showPage;


  window.navigateDashboard =
    navigateDashboard;


  window.navigateLeads =
    navigateLeads;


  window.navigateSales =
    navigateSales;


  window.navigateCustomerProfile =
    navigateCustomerProfile;


})();
