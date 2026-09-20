// ============================================================
// CRM FSI - NAVIGATION
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    // ========================================================
    // USER MENU
    // ========================================================

    const userMenu =
        document.getElementById("userMenu") ||
        document.getElementById("userMenuTrigger");

    const userDropdown =
        document.getElementById("userDropdown");

    const userMenuWrapper =
        document.querySelector(".user-menu-wrapper");

    const profileBtn =
        document.getElementById("profileBtn");

    const logoutBtn =
        document.getElementById("dropdownLogout");

    // ========================================================
    // OPEN / CLOSE USER DROPDOWN
    // ========================================================

    function openUserDropdown() {

        if (!userDropdown) return;

        userDropdown.style.display = "block";
        userDropdown.classList.add("active");

        if (userMenu) {
            userMenu.setAttribute(
                "aria-expanded",
                "true"
            );
        }
    }

    function closeUserDropdown() {

        if (!userDropdown) return;

        userDropdown.style.display = "none";
        userDropdown.classList.remove("active");

        if (userMenu) {
            userMenu.setAttribute(
                "aria-expanded",
                "false"
            );
        }
    }

    function toggleUserDropdown(event) {

        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        if (!userDropdown) return;

        const isOpen =
            userDropdown.style.display === "block" ||
            userDropdown.classList.contains("active");

        if (isOpen) {
            closeUserDropdown();
        } else {
            openUserDropdown();
        }
    }

    // ========================================================
    // USER BUTTON CLICK
    // ========================================================

    if (userMenu && userDropdown) {

        userMenu.addEventListener(
            "click",
            toggleUserDropdown
        );
    }

    // ========================================================
    // CLICK OUTSIDE
    // ========================================================

    document.addEventListener("click", (event) => {

        if (!userMenuWrapper) {
            return;
        }

        if (!userMenuWrapper.contains(event.target)) {
            closeUserDropdown();
        }
    });

    // ========================================================
    // PROFILE
    // ========================================================

    if (profileBtn) {

        profileBtn.addEventListener("click", (event) => {

            event.preventDefault();
            event.stopPropagation();

            closeUserDropdown();

            if (typeof openProfileModal === "function") {
                openProfileModal();
            } else {
                console.warn(
                    "openProfileModal() belum tersedia."
                );
            }
        });
    }

    // ========================================================
    // LOGOUT
    // ========================================================

    if (logoutBtn) {

        logoutBtn.addEventListener("click", async (event) => {

            event.preventDefault();
            event.stopPropagation();

            closeUserDropdown();

            // Gunakan fungsi logout dari auth.js
            if (typeof logoutUser === "function") {
                await logoutUser();
                return;
            }

            if (typeof handleLogout === "function") {
                await handleLogout();
                return;
            }

            if (typeof signOutUser === "function") {
                await signOutUser();
                return;
            }

            // Fallback
            try {

                await supabaseClient.auth.signOut();

                window.location.href =
                    "login.html";

            } catch (error) {

                console.error(
                    "Fallback logout error:",
                    error
                );

                window.location.href =
                    "login.html";
            }
        });
    }

    // ========================================================
    // ESCAPE KEY
    // ========================================================

    document.addEventListener("keydown", (event) => {

        if (event.key === "Escape") {
            closeUserDropdown();
        }
    });

    // ========================================================
    // ACTIVE NAVIGATION
    // ========================================================

    const currentPage =
        window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();

    document
        .querySelectorAll(".top-nav-item")
        .forEach((item) => {

            const href =
                item.getAttribute("href");

            if (!href) return;

            const targetPage =
                href.split("/")
                    .pop()
                    .toLowerCase();

            item.classList.remove("active");

            if (
                targetPage === currentPage ||
                (
                    currentPage === "" &&
                    targetPage === "dashboard.html"
                )
            ) {
                item.classList.add("active");
            }
        });
});

// ============================================================
// GLOBAL NAVIGATION HELPERS
// ============================================================

function goToDashboard() {
    window.location.href = "dashboard.html";
}

function goToLeads() {
    window.location.href = "leads.html";
}

function goToCustomerProfile(id) {

    if (!id) return;

    window.location.href =
        `customer-profile.html?id=${encodeURIComponent(id)}`;
}

window.goToDashboard = goToDashboard;
window.goToLeads = goToLeads;
window.goToCustomerProfile = goToCustomerProfile;
