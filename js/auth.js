// ============================================================
// FSI CRM - AUTHENTICATION & USER PROFILE
// ============================================================
// File : js/auth.js
//
// Fungsi:
// 1. Check Supabase session
// 2. Login username + password
// 3. Username -> email melalui RPC get_login_email
// 4. Load profile dari sales_users
// 5. Role Admin / Sales
// 6. Role-based access
// 7. Load CRM data
// 8. Logout
// 9. Supabase auth listener
// ============================================================

"use strict";


// ============================================================
// DOM HELPERS
// ============================================================

function authElement(id) {
    return document.getElementById(id);
}


function authFirstElement(ids = []) {

    for (const id of ids) {

        const element = document.getElementById(id);

        if (element) {
            return element;
        }
    }

    return null;
}


function authSetText(ids, value) {

    const list = Array.isArray(ids) ? ids : [ids];

    const element = authFirstElement(list);

    if (element) {
        element.textContent = value ?? "";
    }
}


function authShowElement(element) {

    if (!element) {
        return;
    }

    element.classList.remove("hidden");
    element.style.display = "";
}


function authHideElement(element) {

    if (!element) {
        return;
    }

    element.classList.add("hidden");
    element.style.display = "none";
}


// ============================================================
// AUTH STATE HELPERS
// ============================================================

function authSetCurrentUser(user) {

    try {

        if (typeof currentUser !== "undefined") {
            currentUser = user;
        }

    } catch (error) {

        console.warn(
            "FSI CRM: currentUser state tidak dapat di-set:",
            error
        );
    }

    window.currentUser = user || null;
}


function authSetCurrentProfile(profile) {

    try {

        if (typeof currentProfile !== "undefined") {
            currentProfile = profile;
        }

    } catch (error) {

        console.warn(
            "FSI CRM: currentProfile state tidak dapat di-set:",
            error
        );
    }

    window.currentProfile = profile || null;
}


function authGetCurrentUser() {

    try {

        if (typeof currentUser !== "undefined") {
            return currentUser;
        }

    } catch (error) {
        // ignore
    }

    return window.currentUser || null;
}


function authGetCurrentProfile() {

    try {

        if (typeof currentProfile !== "undefined") {
            return currentProfile;
        }

    } catch (error) {
        // ignore
    }

    return window.currentProfile || null;
}


// ============================================================
// SAFE HTML
// ============================================================

function authEscapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


if (typeof window.escapeHTML !== "function") {
    window.escapeHTML = authEscapeHTML;
}


// ============================================================
// SUPABASE READY
// ============================================================

function authSupabaseReady() {

    if (
        typeof supabaseClient === "undefined" ||
        !supabaseClient ||
        !supabaseClient.auth
    ) {

        console.error(
            "FSI CRM: supabaseClient belum tersedia."
        );

        return false;
    }

    return true;
}


// ============================================================
// ROLE HELPERS
// ============================================================

function authNormalizeRole(role) {

    const value = String(role || "")
        .trim()
        .toLowerCase();

    if (
        value === "admin" ||
        value === "administrator" ||
        value === "owner"
    ) {
        return "admin";
    }

    return "sales";
}


function authIsAdmin() {

    const profile = authGetCurrentProfile();

    if (!profile) {
        return false;
    }

    return (
        authNormalizeRole(profile.role) === "admin"
    );
}


function authIsSales() {

    const profile = authGetCurrentProfile();

    if (!profile) {
        return false;
    }

    return (
        authNormalizeRole(profile.role) === "sales"
    );
}


// ============================================================
// CHECK SESSION
// ============================================================

async function checkSession() {

    if (!authSupabaseReady()) {

        showLogin();

        return false;
    }

    try {

        const {
            data,
            error
        } = await supabaseClient.auth.getSession();


        if (error) {

            console.error(
                "FSI CRM - getSession error:",
                error
            );

            authSetCurrentUser(null);
            authSetCurrentProfile(null);

            showLogin();

            return false;
        }


        const session = data?.session;


        // ----------------------------------------------------
        // NO SESSION
        // ----------------------------------------------------

        if (!session) {

            authSetCurrentUser(null);
            authSetCurrentProfile(null);

            showLogin();

            return false;
        }


        // ----------------------------------------------------
        // SESSION EXISTS
        // ----------------------------------------------------

        authSetCurrentUser(session.user);

        return await loadProfile();

    } catch (error) {

        console.error(
            "FSI CRM - checkSession error:",
            error
        );

        authSetCurrentUser(null);
        authSetCurrentProfile(null);

        showLogin();

        return false;
    }
}


// ============================================================
// LOGIN
// ============================================================

async function login(event) {

    if (event) {
        event.preventDefault();
    }


    if (!authSupabaseReady()) {

        setLoginMessage(
            "Supabase belum terhubung.",
            true
        );

        return false;
    }


    // --------------------------------------------------------
    // INPUT USERNAME
    // --------------------------------------------------------

    const usernameInput = authFirstElement([
        "loginUsername",
        "login-username",
        "username",
        "login-username-input"
    ]);


    // --------------------------------------------------------
    // INPUT PASSWORD
    // --------------------------------------------------------

    const passwordInput = authFirstElement([
        "loginPassword",
        "login-password",
        "password",
        "login-password-input"
    ]);


    const username = usernameInput
        ? usernameInput.value.trim()
        : "";


    const password = passwordInput
        ? passwordInput.value
        : "";


    if (!username || !password) {

        setLoginMessage(
            "Username dan password wajib diisi.",
            true
        );

        return false;
    }


    // --------------------------------------------------------
    // LOGIN BUTTON
    // --------------------------------------------------------

    const loginButton = authFirstElement([
        "login-btn",
        "loginBtn",
        "login-button",
        "login-submit",
        "btn-login"
    ]);


    const originalButtonHTML =
        loginButton
            ? loginButton.innerHTML
            : "";


    if (loginButton) {

        loginButton.disabled = true;

        loginButton.innerHTML = `
            <span>Memproses...</span>
        `;
    }


    setLoginMessage(
        "Memeriksa akun...",
        false
    );


    try {

        // ====================================================
        // STEP 1
        // USERNAME -> EMAIL
        // ====================================================

        const {
            data: email,
            error: emailError
        } = await supabaseClient.rpc(
            "get_login_email",
            {
                p_username: username
            }
        );


        if (emailError) {

            console.error(
                "FSI CRM - get_login_email error:",
                emailError
            );

            setLoginMessage(
                emailError.message ||
                "Gagal mencari username.",
                true
            );

            return false;
        }


        if (!email) {

            setLoginMessage(
                "Username tidak ditemukan atau tidak aktif.",
                true
            );

            return false;
        }


        // ====================================================
        // STEP 2
        // SUPABASE AUTH LOGIN
        // ====================================================

        setLoginMessage(
            "Memverifikasi password...",
            false
        );


        const {
            data,
            error
        } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });


        if (error) {

            console.error(
                "FSI CRM - signInWithPassword error:",
                error
            );

            setLoginMessage(
                translateAuthError(error),
                true
            );

            return false;
        }


        if (!data?.user) {

            setLoginMessage(
                "Login gagal. User tidak ditemukan.",
                true
            );

            return false;
        }


        // ====================================================
        // STEP 3
        // SAVE AUTH USER
        // ====================================================

        authSetCurrentUser(data.user);


        setLoginMessage(
            "Login berhasil. Memuat CRM...",
            false
        );


        // ====================================================
        // STEP 4
        // LOAD PROFILE
        // ====================================================

        const profileLoaded = await loadProfile();


        if (!profileLoaded) {
            return false;
        }


        return true;

    } catch (error) {

        console.error(
            "FSI CRM - login error:",
            error
        );

        setLoginMessage(
            error?.message ||
            "Terjadi kesalahan saat login.",
            true
        );

        return false;

    } finally {

        if (loginButton) {

            loginButton.disabled = false;

            loginButton.innerHTML =
                originalButtonHTML ||
                `<span>Login</span>`;
        }
    }
}


// ============================================================
// LOGIN MESSAGE
// ============================================================

function setLoginMessage(
    message,
    isError = false
) {

    const element = authFirstElement([
        "login-message",
        "loginMessage",
        "loginError",
        "login-error"
    ]);


    if (!element) {

        if (message) {

            console.log(
                "FSI CRM Login:",
                message
            );
        }

        return;
    }


    element.textContent = message || "";


    element.classList.remove(
        "error",
        "success",
        "warning"
    );


    if (!message) {
        return;
    }


    if (isError) {

        element.classList.add("error");

    } else {

        element.classList.add("success");
    }
}


// ============================================================
// AUTH ERROR TRANSLATION
// ============================================================

function translateAuthError(error) {

    if (!error) {
        return "Login gagal.";
    }


    const message = String(
        error.message || ""
    ).toLowerCase();


    if (
        message.includes("invalid login credentials") ||
        message.includes("invalid credentials")
    ) {

        return "Username atau password salah.";
    }


    if (
        message.includes("email not confirmed")
    ) {

        return "Akun belum dikonfirmasi.";
    }


    if (
        message.includes("too many requests")
    ) {

        return (
            "Terlalu banyak percobaan login. " +
            "Coba beberapa saat lagi."
        );
    }


    return (
        error.message ||
        "Login gagal. Silakan coba lagi."
    );
}


// ============================================================
// LOAD USER PROFILE
// ============================================================

async function loadProfile() {

    if (!authSupabaseReady()) {

        showLogin();

        return false;
    }


    const user = authGetCurrentUser();


    if (!user) {

        showLogin();

        return false;
    }


    try {

        console.log(
            "FSI CRM - Loading profile:",
            user.id
        );


        // ====================================================
        // IMPORTANT
        // Nama kolom Supabase:
        //
        // auth_user-id
        //
        // BUKAN:
        // auth_user_id
        //
        // BUKAN:
        // auth-user-id
        // ====================================================

        const {
            data,
            error
        } = await supabaseClient
            .from("sales_users")
            .select("*")
            .eq(
                "auth_user-id",
                user.id
            )
            .maybeSingle();


        if (error) {

            console.error(
                "FSI CRM - Profile query error:",
                error
            );

            setLoginMessage(
                "Gagal mengambil profile: " +
                (
                    error.message ||
                    "Database error."
                ),
                true
            );


            authSetCurrentProfile(null);

            showLogin();

            return false;
        }


        if (!data) {

            console.error(
                "FSI CRM - Profile tidak ditemukan:",
                user.id
            );

            setLoginMessage(
                "Profile user tidak ditemukan di sales_users.",
                true
            );

            authSetCurrentProfile(null);

            await safeSignOut();

            return false;
        }


        // ====================================================
        // CHECK STATUS
        // ====================================================

        const status = String(
            data.status || "Active"
        )
            .trim()
            .toLowerCase();


        if (
            status === "inactive" ||
            status === "disabled" ||
            status === "blocked"
        ) {

            console.warn(
                "FSI CRM - User inactive:",
                data
            );


            setLoginMessage(
                "Akun Anda tidak aktif. Hubungi Admin.",
                true
            );


            authSetCurrentProfile(null);

            await safeSignOut();

            return false;
        }


        // ====================================================
        // SAVE PROFILE
        // ====================================================

        authSetCurrentProfile(data);


        console.log(
            "FSI CRM - Profile loaded:",
            data
        );


        // ====================================================
        // UPDATE UI
        // ====================================================

        updateUserInfo();

        setupRoleAccess();

        showApp();


        // ====================================================
        // EVENTS
        // ====================================================

        window.dispatchEvent(
            new CustomEvent(
                "fsi:profile-ready",
                {
                    detail: {
                        user: user,
                        profile: data
                    }
                }
            )
        );


        window.dispatchEvent(
            new CustomEvent(
                "fsi:app-ready",
                {
                    detail: {
                        user: user,
                        profile: data
                    }
                }
            )
        );


        // ====================================================
        // LOAD CRM DATA
        // ====================================================

        await loadCRMDataAfterLogin();


        return true;

    } catch (error) {

        console.error(
            "FSI CRM - loadProfile error:",
            error
        );


        authSetCurrentProfile(null);


        setLoginMessage(
            error?.message ||
            "Gagal memuat profile user.",
            true
        );


        showLogin();

        return false;
    }
}


// ============================================================
// SAFE SIGN OUT
// ============================================================

async function safeSignOut() {

    try {

        if (authSupabaseReady()) {

            await supabaseClient.auth.signOut();
        }

    } catch (error) {

        console.error(
            "FSI CRM - safeSignOut error:",
            error
        );
    }
}


// ============================================================
// LOAD CRM DATA AFTER LOGIN
// ============================================================

async function loadCRMDataAfterLogin() {

    console.log(
        "FSI CRM - Loading CRM data..."
    );


    // --------------------------------------------------------
    // SALES LOOKUP
    // --------------------------------------------------------

    if (
        typeof window.loadSalesLookup ===
        "function"
    ) {

        try {

            await window.loadSalesLookup();

        } catch (error) {

            console.error(
                "FSI CRM - loadSalesLookup error:",
                error
            );
        }
    }


    // --------------------------------------------------------
    // FILTER OPTIONS
    // --------------------------------------------------------

    if (
        typeof window.loadFilterOptions ===
        "function"
    ) {

        try {

            await window.loadFilterOptions();

        } catch (error) {

            console.error(
                "FSI CRM - loadFilterOptions error:",
                error
            );
        }
    }


    // --------------------------------------------------------
    // LEADS
    // --------------------------------------------------------

    if (
        typeof window.loadLeads ===
        "function"
    ) {

        try {

            await window.loadLeads(1);

        } catch (error) {

            console.error(
                "FSI CRM - loadLeads error:",
                error
            );
        }
    }


    // --------------------------------------------------------
    // DASHBOARD
    // --------------------------------------------------------

    if (
        typeof window.updateDashboard ===
        "function"
    ) {

        try {

            await window.updateDashboard();

        } catch (error) {

            console.error(
                "FSI CRM - updateDashboard error:",
                error
            );
        }
    }


    // --------------------------------------------------------
    // SALES MANAGEMENT
    // --------------------------------------------------------

    if (
        authIsAdmin() &&
        typeof window.loadSalesUsers ===
        "function"
    ) {

        try {

            await window.loadSalesUsers();

        } catch (error) {

            console.error(
                "FSI CRM - loadSalesUsers error:",
                error
            );
        }
    }


    // --------------------------------------------------------
    // NAVIGATION
    // --------------------------------------------------------

    if (
        typeof window.refreshNavigation ===
        "function"
    ) {

        try {

            window.refreshNavigation();

        } catch (error) {

            console.warn(
                "FSI CRM - refreshNavigation error:",
                error
            );
        }
    }


    refreshLucideIcons();


    console.log(
        "FSI CRM - CRM data loading completed."
    );
}


// ============================================================
// SHOW LOGIN
// ============================================================

function showLogin() {

    const loginPage = authFirstElement([
        "login-page",
        "loginPage",
        "login-screen"
    ]);


    const app = authFirstElement([
        "app-shell",
        "app",
        "crm-app"
    ]);


    if (loginPage) {

        loginPage.classList.remove("hidden");

        loginPage.style.display = "flex";
    }


    if (app) {

        app.classList.add("hidden");

        app.style.display = "none";
    }


    if (
        typeof window.closeMobileNav ===
        "function"
    ) {

        try {
            window.closeMobileNav();
        } catch (error) {
            // ignore
        }
    }


    setTimeout(
        function () {

            const usernameInput =
                authFirstElement([
                    "loginUsername",
                    "login-username",
                    "username"
                ]);


            if (
                usernameInput &&
                document.visibilityState !== "hidden"
            ) {

                try {
                    usernameInput.focus();
                } catch (error) {
                    // ignore
                }
            }

        },
        150
    );
}


// ============================================================
// SHOW APP
// ============================================================

function showApp() {

    const loginPage = authFirstElement([
        "login-page",
        "loginPage",
        "login-screen"
    ]);


    const app = authFirstElement([
        "app-shell",
        "app",
        "crm-app"
    ]);


    if (loginPage) {

        loginPage.classList.add("hidden");

        loginPage.style.display = "none";
    }


    if (app) {

        app.classList.remove("hidden");

        app.style.display = "";
    }


    // ========================================================
    // OPEN DASHBOARD
    // ========================================================

    try {

        if (
            typeof window.crmNavigate ===
            "function"
        ) {

            window.crmNavigate("dashboard");

        } else if (
            typeof window.showDashboard ===
            "function"
        ) {

            window.showDashboard();

        } else {

            showDashboardFallback();
        }

    } catch (error) {

        console.error(
            "FSI CRM - Dashboard navigation error:",
            error
        );

        showDashboardFallback();
    }


    refreshLucideIcons();
}


// ============================================================
// DASHBOARD FALLBACK
// ============================================================

function showDashboardFallback() {

    const pages = document.querySelectorAll(
        ".crm-page, " +
        ".crm-section, " +
        ".view-section"
    );


    pages.forEach(
        page => {

            page.style.display = "none";

            page.classList.add("hidden");
        }
    );


    const dashboard = authFirstElement([
        "view-dashboard",
        "dashboardView",
        "dashboard-section"
    ]);


    if (dashboard) {

        dashboard.classList.remove("hidden");

        dashboard.style.display = "";
    }
}


// ============================================================
// UPDATE USER INFO
// ============================================================

function updateUserInfo() {

    const profile =
        authGetCurrentProfile();


    const user =
        authGetCurrentUser();


    if (!profile) {
        return;
    }


    const name =
        profile.name ||
        profile.full_name ||
        profile.username ||
        user?.email ||
        "User";


    const role =
        profile.role ||
        "Sales";


    const avatarUrl =
        profile.avatar_url ||
        profile.avatar ||
        "";


    // ========================================================
    // HEADER
    // ========================================================

    authSetText(
        [
            "user-display-name",
            "userDisplayName",
            "currentUserName",
            "user-name"
        ],
        name
    );


    authSetText(
        [
            "user-display-role",
            "userDisplayRole",
            "currentUserRole",
            "user-role"
        ],
        role
    );


    // ========================================================
    // DROPDOWN
    // ========================================================

    authSetText(
        [
            "dropdown-user-name"
        ],
        name
    );


    authSetText(
        [
            "dropdown-user-role"
        ],
        role
    );


    // ========================================================
    // LEGACY
    // ========================================================

    authSetText(
        "currentUser",
        `${name} (${role})`
    );


    // ========================================================
    // AVATAR
    // ========================================================

    const initials =
        getInitials(name);


    const avatarElements =
        document.querySelectorAll(
            ".user-avatar, .avatar"
        );


    avatarElements.forEach(
        element => {

            if (
                element.tagName === "IMG"
            ) {

                if (avatarUrl) {

                    element.src =
                        avatarUrl;

                    element.alt =
                        name;
                }

                return;
            }


            element.textContent =
                initials;
        }
    );


    // ========================================================
    // LEGACY USER INFO
    // ========================================================

    const userInfo =
        authElement("userInfo");


    if (userInfo) {

        if (avatarUrl) {

            userInfo.innerHTML = `
                <img
                    src="${authEscapeHTML(avatarUrl)}"
                    alt="${authEscapeHTML(name)}"
                    class="user-avatar"
                >

                <div class="user-info-text">
                    <strong>
                        ${authEscapeHTML(name)}
                    </strong>

                    <small>
                        ${authEscapeHTML(role)}
                    </small>
                </div>
            `;

        } else {

            userInfo.innerHTML = `
                <div class="user-avatar avatar">
                    ${authEscapeHTML(initials)}
                </div>

                <div class="user-info-text">
                    <strong>
                        ${authEscapeHTML(name)}
                    </strong>

                    <small>
                        ${authEscapeHTML(role)}
                    </small>
                </div>
            `;
        }
    }
}


// ============================================================
// INITIALS
// ============================================================

function getInitials(name) {

    if (!name) {
        return "U";
    }


    const parts =
        String(name)
            .trim()
            .split(/\s+/)
            .filter(Boolean);


    if (!parts.length) {
        return "U";
    }


    if (parts.length === 1) {

        return parts[0]
            .substring(0, 2)
            .toUpperCase();
    }


    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();
}


// ============================================================
// ROLE ACCESS
// ============================================================

function setupRoleAccess() {

    const profile =
        authGetCurrentProfile();


    if (!profile) {
        return;
    }


    const normalizedRole =
        authNormalizeRole(
            profile.role
        );


    const isAdmin =
        normalizedRole === "admin";


    const isSales =
        normalizedRole === "sales";


    console.log(
        "FSI CRM Role:",
        profile.role,
        "=>",
        normalizedRole
    );


    // ========================================================
    // ADMIN ONLY
    // ========================================================

    const adminElements =
        document.querySelectorAll(
            "[data-admin-only]"
        );


    adminElements.forEach(
        element => {

            if (isAdmin) {

                element.classList.remove(
                    "hidden"
                );

                element.style.display = "";

            } else {

                element.classList.add(
                    "hidden"
                );

                element.style.display =
                    "none";
            }
        }
    );


    // ========================================================
    // SALES FILTER
    // ========================================================

    const salesFilter =
        authFirstElement([
            "salesFilter",
            "sales-filter"
        ]);


    if (salesFilter) {

        salesFilter.style.display =
            isAdmin ? "" : "none";
    }


    // ========================================================
    // SALES DROPDOWN
    // ========================================================

    const salesDropdown =
        authFirstElement([
            "salesDropdown",
            "salesDropdownContainer",
            "sales-dropdown-container"
        ]);


    if (salesDropdown) {

        salesDropdown.style.display =
            isAdmin ? "" : "none";
    }


    // ========================================================
    // SALES ASSIGNMENT
    // ========================================================

    setupSalesAssignmentAccess();


    // ========================================================
    // GLOBAL ROLE FLAGS
    // ========================================================

    window.isAdmin = isAdmin;

    window.isSales = isSales;

    window.crmUserRole =
        normalizedRole;


    // ========================================================
    // NAVIGATION
    // ========================================================

    if (
        typeof window.updateAdminNavigation ===
        "function"
    ) {

        try {

            window.updateAdminNavigation();

        } catch (error) {

            console.warn(
                "FSI CRM - updateAdminNavigation error:",
                error
            );
        }
    }
}


// ============================================================
// SALES ASSIGNMENT ACCESS
// ============================================================

function setupSalesAssignmentAccess() {

    const field =
        authFirstElement([
            "leadSalesAssign",
            "lead-sales-assign",
            "salesAssign",
            "sales_id"
        ]);


    const profile =
        authGetCurrentProfile();


    if (
        !field ||
        !profile
    ) {
        return;
    }


    const isAdmin =
        authIsAdmin();


    // --------------------------------------------------------
    // ADMIN
    // --------------------------------------------------------

    if (isAdmin) {

        field.disabled = false;

        field.style.display = "";

        return;
    }


    // --------------------------------------------------------
    // SALES
    // --------------------------------------------------------

    field.disabled = true;

    field.style.display = "";


    if (
        field.tagName === "SELECT" &&
        profile.id
    ) {

        field.value =
            profile.id;
    }
}


// ============================================================
// LOGOUT
// ============================================================

async function logout() {

    console.log(
        "FSI CRM - Logging out..."
    );


    try {

        if (authSupabaseReady()) {

            const {
                error
            } =
                await supabaseClient
                    .auth
                    .signOut();


            if (error) {

                console.error(
                    "Supabase logout error:",
                    error
                );
            }
        }

    } catch (error) {

        console.error(
            "FSI CRM - logout error:",
            error
        );

    } finally {

        // ====================================================
        // CLEAR AUTH STATE
        // ====================================================

        authSetCurrentUser(null);

        authSetCurrentProfile(null);


        window.isAdmin = false;

        window.isSales = false;

        window.crmUserRole = null;


        // ====================================================
        // CLEAR CRM STATE
        // ====================================================

        try {

            if (
                typeof window.resetCRMState ===
                "function"
            ) {

                window.resetCRMState();

            } else {

                if (
                    typeof leadsData !==
                    "undefined"
                ) {
                    leadsData = [];
                }


                if (
                    typeof salesUsersData !==
                    "undefined"
                ) {
                    salesUsersData = [];
                }


                if (
                    typeof currentPage !==
                    "undefined"
                ) {
                    currentPage = 1;
                }


                if (
                    typeof totalLeadsCount !==
                    "undefined"
                ) {
                    totalLeadsCount = 0;
                }
            }

        } catch (error) {

            console.warn(
                "FSI CRM - reset state error:",
                error
            );
        }


        window.crmCurrentCustomerId =
            null;

        window.crmCurrentCustomer =
            null;


        // ====================================================
        // SHOW LOGIN
        // ====================================================

        showLogin();


        setLoginMessage(
            "",
            false
        );


        refreshLucideIcons();


        console.log(
            "FSI CRM - Logout selesai."
        );
    }
}


// ============================================================
// LOGOUT BUTTON EVENTS
// ============================================================

function setupLogoutButtons() {

    const logoutButtons =
        document.querySelectorAll(
            "#btn-logout, " +
            "#logoutBtn, " +
            "#logout-button, " +
            "[data-action='logout']"
        );


    logoutButtons.forEach(
        button => {

            if (
                button.dataset.authLogoutBound ===
                "true"
            ) {
                return;
            }


            button.dataset.authLogoutBound =
                "true";


            button.addEventListener(
                "click",
                async event => {

                    event.preventDefault();

                    await logout();
                }
            );
        }
    );
}


// ============================================================
// LOGIN FORM EVENTS
// ============================================================

function setupLoginForm() {

    const loginForm =
        authFirstElement([
            "login-form",
            "loginForm"
        ]);


    if (!loginForm) {

        console.warn(
            "FSI CRM: login form tidak ditemukan."
        );

        return;
    }


    if (
        loginForm.dataset.authBound ===
        "true"
    ) {
        return;
    }


    loginForm.dataset.authBound =
        "true";


    loginForm.addEventListener(
        "submit",
        login
    );
}


// ============================================================
// SUPABASE AUTH LISTENER
// ============================================================

function setupAuthListener() {

    if (!authSupabaseReady()) {
        return;
    }


    if (window.fsiAuthListenerReady) {
        return;
    }


    window.fsiAuthListenerReady = true;


    supabaseClient.auth.onAuthStateChange(
        (event, session) => {

            console.log(
                "FSI CRM Auth Event:",
                event
            );


            // ------------------------------------------------
            // SIGNED OUT
            // ------------------------------------------------

            if (
                event === "SIGNED_OUT" ||
                !session
            ) {

                authSetCurrentUser(null);

                authSetCurrentProfile(null);

                window.crmCurrentCustomerId =
                    null;

                window.crmCurrentCustomer =
                    null;

                showLogin();

                return;
            }


            // ------------------------------------------------
            // AUTHENTICATED
            // ------------------------------------------------

            if (session?.user) {

                authSetCurrentUser(
                    session.user
                );


                setTimeout(
                    async () => {

                        const currentUser =
                            authGetCurrentUser();


                        const profile =
                            authGetCurrentProfile();


                        if (
                            currentUser?.id !==
                            session.user.id
                        ) {
                            return;
                        }


                        if (!profile) {

                            await loadProfile();
                        }

                    },
                    100
                );
            }
        }
    );
}


// ============================================================
// LUCIDE
// ============================================================

function refreshLucideIcons() {

    try {

        if (
            window.lucide &&
            typeof window.lucide.createIcons ===
            "function"
        ) {

            window.lucide.createIcons();
        }

    } catch (error) {

        console.warn(
            "FSI CRM - Lucide refresh gagal:",
            error
        );
    }
}


// ============================================================
// INITIALIZE AUTH
// ============================================================

async function initializeAuth() {

    console.log(
        "FSI CRM - Initializing authentication..."
    );


    if (!authSupabaseReady()) {

        console.error(
            "FSI CRM - Supabase belum siap."
        );


        setLoginMessage(
            "Supabase belum siap. Periksa config.js.",
            true
        );


        showLogin();

        return;
    }


    // --------------------------------------------------------
    // EVENTS
    // --------------------------------------------------------

    setupLoginForm();

    setupLogoutButtons();

    setupAuthListener();


    // --------------------------------------------------------
    // SESSION
    // --------------------------------------------------------

    await checkSession();


    refreshLucideIcons();


    console.log(
        "FSI CRM - Authentication initialized."
    );
}


// ============================================================
// EXPORT GLOBAL FUNCTIONS
// ============================================================

window.login =
    login;

window.logout =
    logout;

window.checkSession =
    checkSession;

window.loadProfile =
    loadProfile;

window.showLogin =
    showLogin;

window.showApp =
    showApp;

window.updateUserInfo =
    updateUserInfo;

window.setupRoleAccess =
    setupRoleAccess;

window.setupSalesAssignmentAccess =
    setupSalesAssignmentAccess;

window.initializeAuth =
    initializeAuth;

window.authIsAdmin =
    authIsAdmin;

window.authIsSales =
    authIsSales;

window.authGetCurrentUser =
    authGetCurrentUser;

window.authGetCurrentProfile =
    authGetCurrentProfile;

window.authNormalizeRole =
    authNormalizeRole;


// ============================================================
// DOM READY
// ============================================================

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeAuth,
        {
            once: true
        }
    );

} else {

    initializeAuth();
}
