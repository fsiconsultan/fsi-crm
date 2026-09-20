// ========================================
// CRM FSI - NAVIGATION
// ========================================

document.addEventListener("DOMContentLoaded", () => {

  // ================================
  // LOGOUT
  // ================================

  $("logoutBtn")?.addEventListener(
    "click",
    logout
  );

  $("dropdownLogout")?.addEventListener(
    "click",
    logout
  );


  // ================================
  // USER DROPDOWN
  // ================================

  $("userMenu")?.addEventListener(
    "click",
    (event) => {

      event.stopPropagation();

      const dropdown =
        $("userDropdown");

      if (!dropdown) return;

      const isHidden =
        dropdown.style.display === "none" ||
        dropdown.style.display === "";

      dropdown.style.display =
        isHidden
          ? "block"
          : "none";
    }
  );


  // ================================
  // CLOSE USER DROPDOWN
  // ================================

  document.addEventListener(
    "click",
    (event) => {

      const userMenu =
        $("userMenu");

      const userDropdown =
        $("userDropdown");

      if (!userMenu || !userDropdown) {
        return;
      }

      if (
        !userMenu.contains(event.target) &&
        !userDropdown.contains(event.target)
      ) {

        userDropdown.style.display =
          "none";
      }
    }
  );


  // ================================
  // GLOBAL SEARCH
  // ================================

  $("globalSearch")?.addEventListener(
    "keydown",
    (event) => {

      if (event.key !== "Enter") {
        return;
      }

      const value =
        event.target.value.trim();

      const url =
        "leads.html" +
        (
          value
            ? "?search=" +
              encodeURIComponent(value)
            : ""
        );

      window.location.href = url;
    }
  );

});


// ========================================
// PAGE NAVIGATION
// ========================================

function showPage(page) {

  const routes = {

    dashboard:
      "dashboard.html",

    leads:
      "leads.html",

    sales:
      "sales.html",

    customer:
      "customer-profile.html"

  };

  if (routes[page]) {

    window.location.href =
      routes[page];

  }

}


// ========================================
// SHORTCUT NAVIGATION
// ========================================

function showDashboard() {

  window.location.href =
    "dashboard.html";

}


function showLeads() {

  window.location.href =
    "leads.html";

}


function showSales() {

  window.location.href =
    "sales.html";

}


function showCustomerProfile(id) {

  if (!id) return;

  window.location.href =
    "customer-profile.html?id=" +
    encodeURIComponent(id);

}
