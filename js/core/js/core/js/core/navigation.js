// ================================
// NAVIGATION
// ================================

function hideAllPages() {

  const pages = [
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

  pages.forEach(id => {

    const element =
      document.getElementById(id);

    if (element) {

      element.style.display =
        "none";

    }

  });

}


function setPageTitle(title) {

  const titleElement =
    document.getElementById(
      "pageTitle"
    );

  if (titleElement) {

    titleElement.textContent =
      title;

  }

}


async function showDashboard() {

  hideAllPages();

  const page =
    document.getElementById(
      "dashboardPage"
    );

  if (page) {

    page.style.display =
      "block";

  }

  setPageTitle(
    "Dashboard"
  );

  await updateDashboard();

}


async function showLeads() {

  hideAllPages();

  const page =
    document.getElementById(
      "leadsPage"
    );

  if (page) {

    page.style.display =
      "block";

  }

  setPageTitle(
    currentProfile &&
    currentProfile.role === "Admin"
      ? "All Leads"
      : "My Leads"
  );

  await loadFilterOptions();

  await loadLeads(1);

}


async function showSales() {

  if (
    !currentProfile ||
    currentProfile.role !==
      "Admin"
  ) {

    alert(
      "Access denied."
    );

    return;

  }

  hideAllPages();

  const page =
    document.getElementById(
      "salesPage"
    );

  if (page) {

    page.style.display =
      "block";

  }

  setPageTitle(
    "Manage Sales"
  );

  await loadSalesUsers();

}
