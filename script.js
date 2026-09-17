/* =========================================================
   CRM FSI
   FRONTEND JAVASCRIPT
   ========================================================= */


/* =========================================================
   DEMO USERS
   ---------------------------------------------------------
   INI HANYA UNTUK TESTING FRONTEND.
   NANTI AKAN DIGANTI DENGAN DATABASE + AUTHENTICATION.
   ========================================================= */

const demoUsers = [
    {
        name: "Admin",
        username: "admin",
        password: "admin123",
        role: "Admin",
        status: "Active"
    },

    {
        name: "Ris",
        username: "ris",
        password: "ris123",
        role: "Sales",
        status: "Active"
    },

    {
        name: "Budi",
        username: "budi",
        password: "budi123",
        role: "Sales",
        status: "Active"
    },

    {
        name: "Andi",
        username: "andi",
        password: "andi123",
        role: "Sales",
        status: "Inactive"
    }
];


/* =========================================================
   APPLICATION STATE
   ========================================================= */

let currentUser = null;


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const loginPage = document.getElementById("loginPage");
const crmApp = document.getElementById("crmApp");

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");

const togglePassword =
    document.getElementById("togglePassword");

const rememberMe =
    document.getElementById("rememberMe");

const logoutButton =
    document.getElementById("logoutButton");

const sidebar =
    document.getElementById("sidebar");

const sidebarOverlay =
    document.getElementById("sidebarOverlay");

const openSidebar =
    document.getElementById("openSidebar");

const closeSidebar =
    document.getElementById("closeSidebar");

const sidebarUserName =
    document.getElementById("sidebarUserName");

const sidebarUserRole =
    document.getElementById("sidebarUserRole");

const topbarUserName =
    document.getElementById("topbarUserName");

const topbarUserRole =
    document.getElementById("topbarUserRole");

const welcomeName =
    document.getElementById("welcomeName");

const settingsName =
    document.getElementById("settingsName");

const settingsRole =
    document.getElementById("settingsRole");

const adminNavigation =
    document.getElementById("adminNavigation");


/* =========================================================
   PAGE INFORMATION
   ========================================================= */

const pageInformation = {

    dashboard: {
        title: "Dashboard",
        subtitle: "Overview of your CRM activity"
    },

    leads: {
        title: "Leads",
        subtitle: "Manage and track customer leads"
    },

    sales: {
        title: "Sales",
        subtitle: "Manage CRM sales accounts and performance"
    },

    reports: {
        title: "Reports",
        subtitle: "CRM performance and sales reports"
    },

    settings: {
        title: "Settings",
        subtitle: "Manage your CRM preferences"
    }

};


/* =========================================================
   CHECK SAVED LOGIN
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const savedUsername =
        localStorage.getItem("crm_fsi_username");

    if (savedUsername) {

        const user = demoUsers.find(
            item =>
                item.username === savedUsername &&
                item.status === "Active"
        );

        if (user) {

            currentUser = user;

            showCRM();

        }

    }

});


/* =========================================================
   LOGIN
   ========================================================= */

loginForm.addEventListener("submit", function (event) {

    event.preventDefault();


    const username =
        usernameInput.value.trim();

    const password =
        passwordInput.value;


    const user = demoUsers.find(
        item =>
            item.username === username &&
            item.password === password &&
            item.status === "Active"
    );


    if (!user) {

        loginError.hidden = false;

        loginError.textContent =
            "Username atau password salah.";

        passwordInput.value = "";

        passwordInput.focus();

        return;

    }


    /* Login berhasil */

    currentUser = user;


    /* Remember Me */

    if (rememberMe.checked) {

        localStorage.setItem(
            "crm_fsi_username",
            user.username
        );

    } else {

        localStorage.removeItem(
            "crm_fsi_username"
        );

    }


    loginError.hidden = true;


    showCRM();

});


/* =========================================================
   SHOW CRM
   ========================================================= */

function showCRM() {

    loginPage.hidden = true;

    crmApp.hidden = false;


    updateUserInterface();


    /* Default page */

    navigateTo("dashboard");

}


/* =========================================================
   UPDATE USER INTERFACE
   ========================================================= */

function updateUserInterface() {

    if (!currentUser) {
        return;
    }


    /* Name */

    sidebarUserName.textContent =
        currentUser.name;

    topbarUserName.textContent =
        currentUser.name;

    welcomeName.textContent =
        currentUser.name;

    settingsName.textContent =
        currentUser.name;


    /* Role */

    sidebarUserRole.textContent =
        currentUser.role === "Admin"
            ? "Administrator"
            : "Sales";

    topbarUserRole.textContent =
        currentUser.role === "Admin"
            ? "Administrator"
            : "Sales";

    settingsRole.textContent =
        currentUser.role;


    /* Avatar */

    const firstLetter =
        currentUser.name
            .charAt(0)
            .toUpperCase();


    document
        .querySelectorAll(".user-avatar")
        .forEach(avatar => {

            avatar.textContent =
                firstLetter;

        });


    /*
     * Admin navigation
     *
     * Sales tidak melihat menu:
     * - Sales
     * - Reports
     */

    if (currentUser.role === "Admin") {

        adminNavigation.style.display = "";

        document
            .querySelectorAll(".admin-only-action")
            .forEach(element => {

                element.style.display = "";

            });

    } else {

        adminNavigation.style.display = "none";

        document
            .querySelectorAll(".admin-only-action")
            .forEach(element => {

                element.style.display = "none";

            });

    }

}


/* =========================================================
   NAVIGATION
   ========================================================= */

document
    .querySelectorAll(".nav-item")
    .forEach(button => {

        button.addEventListener(
            "click",
            function () {

                const page =
                    this.dataset.page;

                navigateTo(page);

                closeMobileSidebar();

            }
        );

    });


/* =========================================================
   NAVIGATE TO PAGE
   ========================================================= */

function navigateTo(page) {

    /*
     * Security/UI check.
     *
     * Sales tidak boleh membuka halaman
     * Sales Management dan Reports.
     *
     * NANTI keamanan sebenarnya akan
     * dilakukan juga di backend.
     */

    if (
        currentUser &&
        currentUser.role !== "Admin" &&
        (
            page === "sales" ||
            page === "reports"
        )
    ) {

        page = "dashboard";

    }


    /* Hide all pages */

    document
        .querySelectorAll(".page-content")
        .forEach(section => {

            section.hidden = true;
            section.classList.remove("active-page");

        });


    /* Show selected page */

    const targetPage =
        document.getElementById(
            page + "Page"
        );


    if (targetPage) {

        targetPage.hidden = false;

        targetPage.classList.add(
            "active-page"
        );

    }


    /* Update navigation active state */

    document
        .querySelectorAll(".nav-item")
        .forEach(item => {

            item.classList.remove("active");

        });


    const activeButton =
        document.querySelector(
            `.nav-item[data-page="${page}"]`
        );


    if (activeButton) {

        activeButton.classList.add("active");

    }


    /* Update topbar */

    if (pageInformation[page]) {

        document.getElementById(
            "pageTitle"
        ).textContent =
            pageInformation[page].title;

        document.getElementById(
            "pageSubtitle"
        ).textContent =
            pageInformation[page].subtitle;

    }

}


/* =========================================================
   QUICK PAGE BUTTONS
   ========================================================= */

document
    .querySelectorAll("[data-page-button]")
    .forEach(button => {

        button.addEventListener(
            "click",
            function () {

                const page =
                    this.dataset.pageButton;

                navigateTo(page);

            }
        );

    });


/* =========================================================
   PASSWORD SHOW / HIDE
   ========================================================= */

togglePassword.addEventListener(
    "click",
    function () {

        if (
            passwordInput.type === "password"
        ) {

            passwordInput.type = "text";

            this.textContent = "Hide";

        } else {

            passwordInput.type = "password";

            this.textContent = "Show";

        }

    }
);


/* =========================================================
   LOGOUT
   ========================================================= */

logoutButton.addEventListener(
    "click",
    function () {

        const confirmed =
            confirm(
                "Apakah Anda yakin ingin logout?"
            );


        if (!confirmed) {
            return;
        }


        currentUser = null;


        localStorage.removeItem(
            "crm_fsi_username"
        );


        crmApp.hidden = true;

        loginPage.hidden = false;


        loginForm.reset();

        loginError.hidden = true;

        passwordInput.type = "password";

        togglePassword.textContent = "Show";


        navigateTo("dashboard");


        closeMobileSidebar();

    }
);


/* =========================================================
   MOBILE SIDEBAR
   ========================================================= */

openSidebar.addEventListener(
    "click",
    openMobileSidebar
);


closeSidebar.addEventListener(
    "click",
    closeMobileSidebar
);


sidebarOverlay.addEventListener(
    "click",
    closeMobileSidebar
);


function openMobileSidebar() {

    sidebar.classList.add(
        "mobile-open"
    );

    sidebarOverlay.hidden = false;

}


function closeMobileSidebar() {

    sidebar.classList.remove(
        "mobile-open"
    );

    sidebarOverlay.hidden = true;

}


/* =========================================================
   ADD LEAD MODAL
   ========================================================= */

document
    .querySelectorAll(
        '[data-action="add-lead"]'
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            function () {

                openModal("leadModal");

            }
        );

    });


/* =========================================================
   ADD SALES MODAL
   ========================================================= */

document
    .querySelectorAll(
        '[data-action="add-sales"]'
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            function () {

                if (
                    !currentUser ||
                    currentUser.role !== "Admin"
                ) {

                    alert(
                        "Only Admin can add a Sales account."
                    );

                    return;

                }

                openModal("salesModal");

            }
        );

    });


/* =========================================================
   OPEN MODAL
   ========================================================= */

function openModal(modalId) {

    const modal =
        document.getElementById(modalId);

    if (!modal) {
        return;
    }

    modal.hidden = false;

    document.body.style.overflow = "hidden";

}


/* =========================================================
   CLOSE MODAL
   ========================================================= */

document
    .querySelectorAll("[data-close-modal]")
    .forEach(button => {

        button.addEventListener(
            "click",
            function () {

                const modalId =
                    this.dataset.closeModal;

                closeModal(modalId);

            }
        );

    });


function closeModal(modalId) {

    const modal =
        document.getElementById(modalId);

    if (!modal) {
        return;
    }

    modal.hidden = true;

    document.body.style.overflow = "";

}


/* =========================================================
   CLOSE MODAL WHEN CLICKING OUTSIDE
   ========================================================= */

document
    .querySelectorAll(".modal-overlay")
    .forEach(overlay => {

        overlay.addEventListener(
            "click",
            function (event) {

                if (event.target === this) {

                    closeModal(
                        this.id
                    );

                }

            }
        );

    });


/* =========================================================
   ESCAPE KEY
   ========================================================= */

document.addEventListener(
    "keydown",
    function (event) {

        if (event.key !== "Escape") {
            return;
        }


        document
            .querySelectorAll(
                ".modal-overlay"
            )
            .forEach(modal => {

                if (!modal.hidden) {

                    closeModal(
                        modal.id
                    );

                }

            });


        closeMobileSidebar();

    }
);


/* =========================================================
   ADD LEAD FORM
   ========================================================= */

const leadForm =
    document.getElementById("leadForm");


leadForm.addEventListener(
    "submit",
    function (event) {

        event.preventDefault();


        alert(
            "Lead berhasil ditambahkan (demo)."
        );


        closeModal("leadModal");


        leadForm.reset();

    }
);


/* =========================================================
   ADD SALES FORM
   ========================================================= */

const salesForm =
    document.getElementById("salesForm");


salesForm.addEventListener(
    "submit",
    function (event) {

        event.preventDefault();


        if (
            !currentUser ||
            currentUser.role !== "Admin"
        ) {

            alert(
                "Only Admin can create a Sales account."
            );

            return;

        }


        const password =
            document.getElementById(
                "salesPassword"
            ).value;

        const confirmPassword =
            document.getElementById(
                "salesConfirmPassword"
            ).value;


        if (
            password !==
            confirmPassword
        ) {

            alert(
                "Password dan Confirm Password tidak sama."
            );

            return;

        }


        alert(
            "Sales account berhasil dibuat (demo)."
        );


        closeModal("salesModal");

        salesForm.reset();

    }
);


/* =========================================================
   EXPORT BUTTON
   ========================================================= */

document
    .querySelectorAll(
        '[data-action="export"]'
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            function () {

                alert(
                    "Export akan kita sambungkan ke database nanti."
                );

            }
        );

    });


/* =========================================================
   LEAD SEARCH
   ========================================================= */

const leadSearch =
    document.getElementById("leadSearch");

const statusFilter =
    document.getElementById("statusFilter");

const salesFilter =
    document.getElementById("salesFilter");


function filterLeads() {

    const search =
        leadSearch.value
            .toLowerCase()
            .trim();

    const status =
        statusFilter.value
            .toLowerCase();

    const sales =
        salesFilter.value
            .toLowerCase();


    const rows =
        document.querySelectorAll(
            "#leadsTableBody tr"
        );


    rows.forEach(row => {

        const rowText =
            row.textContent
                .toLowerCase();


        const statusText =
            row
                .querySelector(
                    ".status-badge"
                )
                ?.textContent
                .toLowerCase()
                .trim() || "";


        const cells =
            row.querySelectorAll("td");


        const salesText =
            cells[3]
                ?.textContent
                .toLowerCase()
                .trim() || "";


        const matchesSearch =
            !search ||
            rowText.includes(search);


        const matchesStatus =
            status === "all" ||
            statusText.includes(
                status.replace("-", " ")
            );


        const matchesSales =
            sales === "all" ||
            salesText === sales;


        row.style.display =
            matchesSearch &&
            matchesStatus &&
            matchesSales
                ? ""
                : "none";

    });

}


leadSearch.addEventListener(
    "input",
    filterLeads
);

statusFilter.addEventListener(
    "change",
    filterLeads
);

salesFilter.addEventListener(
    "change",
    filterLeads
);


/* =========================================================
   PREVENT SALES FROM USING ADMIN FILTER
   ========================================================= */

function updateSalesFilterForRole() {

    if (!currentUser) {
        return;
    }


    if (
        currentUser.role === "Sales"
    ) {

        salesFilter.value =
            currentUser.username;

        salesFilter.disabled = true;

    } else {

        salesFilter.value = "all";

        salesFilter.disabled = false;

    }

}


/* =========================================================
   UPDATE UI AFTER LOGIN
   ========================================================= */

const originalUpdateUserInterface =
    updateUserInterface;


/*
 * Extend role update.
 */

function refreshRoleBasedInterface() {

    originalUpdateUserInterface();

    updateSalesFilterForRole();

}


/* =========================================================
   SIMPLE SESSION MESSAGE
   ========================================================= */

console.log(
    "CRM FSI frontend loaded successfully."
);

console.log(
    "Demo Admin: admin / admin123"
);

console.log(
    "Demo Sales: ris / ris123"
);
