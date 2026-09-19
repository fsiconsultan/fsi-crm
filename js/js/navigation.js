/* =====================================================
   NAVIGATION & SIDEBAR CONTROLLER
====================================================== */

let crmCurrentPage = "dashboardPage";
let crmPreviousPage = "dashboardPage";

const crmPages = [
  "dashboardPage",
  "leadsPage",
  "salesPage",
  "customerProfilePage",
  "appointmentPage",
  "dailyReportPage",
  "pltsCalculatorPage",
  "pltsSimulatorPage",
  "settingsPage"
];

function toggleCrmSidebar() {
  const sidebar = document.getElementById("crmSidebar");
  const overlay = document.getElementById("crmSidebarOverlay");
  if (!sidebar) return;

  const isOpen = sidebar.classList.contains("open");
  if (isOpen) {
    closeCrmSidebar();
  } else {
    sidebar.classList.add("open");
    if (overlay) overlay.classList.add("show");
  }
}

function closeCrmSidebar() {
  const sidebar = document.getElementById("crmSidebar");
  const overlay = document.getElementById("crmSidebarOverlay");
  if (sidebar) sidebar.classList.remove("open");
  if (overlay) overlay.classList.remove("show");
}

function hideCrmPages() {
  crmPages.forEach(function(id) {
    const page = document.getElementById(id);
    if (page) page.style.display = "none";
  });
}

function updateCrmSidebarActive(pageId) {
  document.querySelectorAll(".crm-sidebar-btn[data-crm-page]").forEach(function(button) {
    button.classList.toggle("active", button.dataset.crmPage === pageId);
  });
}

function updateCrmPageTitle(page) {
  const title = document.getElementById("pageTitle");
  if (!title) return;

  const titles = {
    dashboard: "Dashboard",
    leads: "Database Customer",
    sales: "Manage Sales",
    customerProfile: "Customer Profile",
    appointment: "Appointment / Jadwal Pertemuan",
    dailyReport: "Daily Report",
    pltsCalculator: "PLTS Calculator",
    pltsSimulator: "PLTS Interactive Simulator",
    settings: "Settings"
  };

  title.textContent = titles[page] || "FSI CRM";
}

function crmNavigate(page) {
  closeCrmSidebar();
  crmPreviousPage = crmCurrentPage;
  hideCrmPages();

  if (page === "dashboard") {
    if (typeof window.showDashboard === "function") window.showDashboard();
    crmCurrentPage = "dashboardPage";
  } else if (page === "leads") {
    if (typeof window.showLeads === "function") window.showLeads();
    crmCurrentPage = "leadsPage";
  } else if (page === "sales") {
    if (typeof window.showSales === "function") window.showSales();
    crmCurrentPage = "salesPage";
  } else {
    const targetPage = document.getElementById(page + "Page");
    if (targetPage) targetPage.style.display = "block";
    crmCurrentPage = page + "Page";
  }

  updateCrmSidebarActive(crmCurrentPage);
  updateCrmPageTitle(page);

  if (window.lucide) lucide.createIcons();
}

function crmGoBack() {
  const previous = crmPreviousPage;
  if (previous && previous !== crmCurrentPage) {
    hideCrmPages();
    const page = document.getElementById(previous);
    if (page) page.style.display = "block";
    crmCurrentPage = previous;
    updateCrmSidebarActive(previous);

    if (previous === "dashboardPage") updateCrmPageTitle("dashboard");
    else if (previous === "leadsPage") updateCrmPageTitle("leads");
    else if (previous === "salesPage") updateCrmPageTitle("sales");
    return;
  }
  crmNavigate("dashboard");
}
