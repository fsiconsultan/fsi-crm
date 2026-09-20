// ========================================
// CRM FSI - NAVIGATION
// ========================================

document.addEventListener("DOMContentLoaded", () => {

    // ========================================
    // USER MENU
    // ========================================

    const userMenuTrigger =
        $("userMenuTrigger");

    const userDropdown =
        $("userDropdown");


    if (
        userMenuTrigger &&
        userDropdown
    ) {

        userMenuTrigger.addEventListener(
            "click",
            (event) => {

                event.preventDefault();
                event.stopPropagation();

                userDropdown.classList.toggle("active");

            }
        );


        document.addEventListener(
            "click",
            (event) => {

                const userMenu =
                    document.querySelector(".user-menu");

                if (
                    userMenu &&
                    !userMenu.contains(event.target)
                ) {

                    userDropdown.classList.remove(
                        "active"
                    );

                }

            }
        );

    }


    // ========================================
    // PROFILE
    // ========================================

    const profileBtn =
        $("profileBtn");

    if (profileBtn) {

        profileBtn.addEventListener(
            "click",
            (event) => {

                event.preventDefault();

                if (userDropdown) {
                    userDropdown.classList.remove(
                        "active"
                    );
                }

                if (
                    typeof openProfileModal ===
                    "function"
                ) {
                    openProfileModal();
                }

            }
        );

    }


    // ========================================
    // LOGOUT
    // ========================================

    const logoutBtn =
        $("logoutBtn");

    const dropdownLogout =
        $("dropdownLogout");


    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            logout
        );

    }


    if (dropdownLogout) {

        dropdownLogout.addEventListener(
            "click",
            logout
        );

    }


    // ========================================
    // GLOBAL SEARCH
    // ========================================

    const globalSearch =
        $("globalSearch");


    if (globalSearch) {

        globalSearch.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key !== "Enter"
                ) {
                    return;
                }

                const value =
                    globalSearch.value.trim();


                if (!value) {
                    return;
                }


                window.location.href =
                    `leads.html?search=${encodeURIComponent(value)}`;

            }
        );

    }

});


// ========================================
// LOGOUT
// ========================================

async function logout() {

    try {

        await supabaseClient.auth.signOut();

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

    }

    window.location.href =
        "login.html";

}


// ========================================
// NAVIGATION
// ========================================

function showPage(page) {

    if (!page) {
        return;
    }

    window.location.href =
        page;

}


function showDashboard() {

    showPage("dashboard.html");

}


function showLeads() {

    showPage("leads.html");

}


function showSales() {

    showPage("sales.html");

}


function showCustomerProfile(id) {

    if (!id) {
        return;
    }

    window.location.href =
        `customer-profile.html?id=${encodeURIComponent(id)}`;

}
