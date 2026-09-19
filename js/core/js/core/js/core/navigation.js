// ================================
// CRM FSI - NAVIGATION
// ================================


// ================================
// HIDE ALL PAGES
// ================================

function hideAllPages() {
  const pages = [
    "dashboardPage",
    "leadsPage",
    "customerProfilePage",
    "appointmentPage",
    "dailyReportPage",
    "pltsCalculatorPage",
    "pltsSimulatorPage",
    "settingsPage",
    "salesPage"
  ];

  pages.forEach(function (pageId) {
    const page = document.getElementById(pageId);

    if (page) {
      page.style.display = "none";
    }
  });
}


// ================================
// SET PAGE TITLE
// ================================

function setPageTitle(title) {
  const pageTitle = document.getElementById("pageTitle");

  if (pageTitle) {
    pageTitle.textContent = title;
  }
}


// ================================
// SHOW DASHBOARD
// ================================

function showDashboard() {
  hideAllPages();

  const page = document.getElementById("dashboardPage");

  if (page) {
    page.style.display = "block";
  }

  setPageTitle("Dashboard");

  if (typeof updateDashboard === "function") {
    updateDashboard();
  }
}


// ================================
// SHOW LEADS
// ================================

function showLeads() {
  hideAllPages();

  const page = document.getElementById("leadsPage");

  if (page) {
    page.style.display = "block";
  }

  setPageTitle("Customers");

  currentPage = 1;

  if (typeof loadFilterOptions === "function") {
    loadFilterOptions();
  }

  if (typeof loadLeads === "function") {
    loadLeads();
  }
}


// ================================
// SHOW SALES
// ================================

function showSales() {
  hideAllPages();

  const page = document.getElementById("salesPage");

  if (page) {
    page.style.display = "block";
  }

  setPageTitle("Manage Sales");

  if (typeof loadSalesUsers === "function") {
    loadSalesUsers();
  }
}


// ================================
// SHOW CUSTOMER PROFILE PAGE
// ================================

function crmShowProfilePage() {
  hideAllPages();

  const page = document.getElementById("customerProfilePage");

  if (page) {
    page.style.display = "block";
  }
}


// ================================
// SHOW SIMPLE PAGE
// ================================

function crmShowSimplePage(pageId, title) {
  hideAllPages();

  const page = document.getElementById(pageId);

  if (page) {
    page.style.display = "block";
  }

  setPageTitle(title || "");
}


// ================================
// TOP SALES FILTER
// ================================

function applyTopSalesFilter() {
  const dropdown = document.getElementById("topSalesFilter");

  if (!dropdown) {
    return;
  }

  const salesId = dropdown.value || "";

  const salesFilter = document.getElementById("salesFilter");

  if (salesFilter) {
    salesFilter.value = salesId;
  }

  currentPage = 1;

  if (typeof loadLeads === "function") {
    loadLeads();
  }

  updateSalesDropdownButton();
}


// ================================
// UPDATE SALES DROPDOWN BUTTON
// ================================

function updateSalesDropdownButton() {
  const dropdown = document.getElementById("topSalesFilter");

  if (!dropdown) {
    return;
  }

  const buttonText = document.getElementById("salesDropdownButtonText");

  if (!buttonText) {
    return;
  }

  const selectedOption =
    dropdown.options[dropdown.selectedIndex];

  if (!selectedOption || !selectedOption.value) {
    buttonText.textContent = "All Sales";
    return;
  }

  buttonText.textContent =
    selectedOption.textContent || "All Sales";
}


// ================================
// SETUP MODAL EVENTS
// ================================

function setupModalEvents() {
  const leadModal = document.getElementById("leadModal");

  if (leadModal) {
    leadModal.addEventListener("click", function (event) {
      if (event.target === leadModal) {
        if (typeof closeLeadModal === "function") {
          closeLeadModal();
        }
      }
    });
  }

  const salesModal = document.getElementById("salesModal");

  if (salesModal) {
    salesModal.addEventListener("click", function (event) {
      if (event.target === salesModal) {
        if (typeof closeSalesModal === "function") {
          closeSalesModal();
        }
      }
    });
  }
}
