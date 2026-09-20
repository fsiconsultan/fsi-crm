document.addEventListener("DOMContentLoaded", () => {
  $("logoutBtn")?.addEventListener("click", logout);
  $("dropdownLogout")?.addEventListener("click", logout);

  $("mobileMenuBtn")?.addEventListener("click", () => {
    $("sidebar")?.classList.toggle("mobile-open");
    $("sidebarOverlay")?.classList.toggle("active");
  });

  $("sidebarOverlay")?.addEventListener("click", () => {
    $("sidebar")?.classList.remove("mobile-open");
    $("sidebarOverlay")?.classList.remove("active");
  });

  $("userMenu")?.addEventListener("click", (e) => {
    e.stopPropagation();

    const dropdown = $("userDropdown");

    if (dropdown) {
      dropdown.style.display =
        dropdown.style.display === "none"
          ? "block"
          : "none";
    }
  });

  document.addEventListener("click", (e) => {
    if (
      !$("userMenu")?.contains(e.target) &&
      !$("userDropdown")?.contains(e.target)
    ) {
      if ($("userDropdown")) {
        $("userDropdown").style.display = "none";
      }
    }
  });

  $("globalSearch")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const value = e.target.value.trim();

      window.location.href =
        "leads.html" +
        (value
          ? "?search=" + encodeURIComponent(value)
          : "");
    }
  });
});


function showPage(page) {
  const routes = {
    dashboard: "dashboard.html",
    leads: "leads.html",
    sales: "sales.html",
    customer: "customer-profile.html"
  };

  if (routes[page]) {
    window.location.href = routes[page];
  }
}


function showDashboard() {
  window.location.href = "dashboard.html";
}


function showLeads() {
  window.location.href = "leads.html";
}


function showSales() {
  window.location.href = "sales.html";
}
