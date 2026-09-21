// ============================================================
// FSI CRM - AUTHENTICATION & USER PROFILE
// ============================================================
// File : js/auth.js
//
// Fungsi utama:
// 1. Cek session Supabase
// 2. Login menggunakan username + password
// 3. Username -> email melalui RPC get_login_email
// 4. Load profile dari sales_users
// 5. Tentukan role Admin / Sales
// 6. Atur akses berdasarkan role
// 7. Logout
// 8. Listen perubahan session Supabase
// ============================================================


// ============================================================
// GLOBAL AUTH STATE
// ============================================================

if (typeof currentUser === "undefined") {
    var currentUser = null;
}

if (typeof currentProfile === "undefined") {
    var currentProfile = null;
}


// ============================================================
// SMALL DOM HELPERS
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
    const element = authFirstElement(
        Array.isArray(ids) ? ids : [ids]
    );

    if (element) {
        element.textContent = value ?? "";
    }
}


function authShowElement(element) {
    if (!element) return;

    element.classList.remove("hidden");

    element.style.display = "";
}


function authHideElement(element) {
    if (!element) return;

    element.classList.add("hidden");

    element.style.display = "none";
}


// ============================================================
// SAFE HTML ESCAPE
// ============================================================

function authEscapeHTML(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// Gunakan escapeHTML global kalau helpers.js sudah punya.
if (typeof window.escapeHTML !== "function") {
    window.escapeHTML = authEscapeHTML;
}


// ============================================================
// CHECK SUPABASE CLIENT
// ============================================================

function authSupabaseReady() {
    if (
        typeof supabaseClient === "undefined" ||
        !supabaseClient ||
        !supabaseClient.auth
    ) {
        console.error(
            "FSI CRM: supabaseClient belum tersedia. " +
            "Pastikan js/config.js dimuat sebelum js/auth.js."
        );

        return false;
    }

    return true;
}


// ============================================================
// CHECK SESSION
// ============================================================

async function checkSession() {

    if (!authSupabaseReady()) {
        showLogin();
        return;
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

            showLogin();
            return;
        }


        const session = data?.session;


        // Tidak ada session
        if (!session) {

            currentUser = null;
            currentProfile = null;

            showLogin();

            return;
        }


        // Ada session
        currentUser = session.user;


        await loadProfile();

    } catch (error) {

        console.error(
            "FSI CRM - checkSession error:",
            error
        );

        currentUser = null;
        currentProfile = null;

        showLogin();
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


    // Mendukung ID baru dan ID lama
    const usernameInput = authFirstElement([
        "loginUsername",
        "login-username",
        "username",
        "login-username-input"
    ]);


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


    setLoginMessage(
        "Sedang masuk...",
        false
    );


    // Disable button saat login
    const loginButton = authFirstElement([
        "loginBtn",
        "login-button",
        "login-submit",
        "btn-login"
    ]);


    const originalButtonText = loginButton
        ? loginButton.innerHTML
        : "";


    if (loginButton) {
        loginButton.disabled = true;
        loginButton.innerHTML = "Memproses...";
    }


    try {

        // ====================================================
        // STEP 1
        // Username -> Email melalui RPC Supabase
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
        // Login Supabase Auth
        // ====================================================

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
        // Simpan current user
        // ====================================================

        currentUser = data.user;


        setLoginMessage(
            "Login berhasil. Memuat CRM...",
            false
        );


        // ====================================================
        // STEP 4
        // Ambil profile
        // ====================================================

        await loadProfile();


        return true;


    } catch (error) {

        console.error(
            "FSI CRM - login error:",
            error
        );


        setLoginMessage(
            "Terjadi kesalahan saat login.",
            true
        );


        return false;


    } finally {

        if (loginButton) {

            loginButton.disabled = false;

            if (originalButtonText) {
                loginButton.innerHTML = originalButtonText;
            } else {
                loginButton.innerHTML = "Login";
            }
        }
    }
}


// ============================================================
// LOGIN MESSAGE
// ============================================================

function setLoginMessage(message, isError = false) {

    const messageElement = authFirstElement([
        "loginMessage",
        "login-message",
        "loginError",
        "login-error"
    ]);


    if (!messageElement) {
        console.log("Login:", message);
        return;
    }


    messageElement.textContent = message;


    messageElement.classList.remove(
        "error",
        "success",
        "warning"
    );


    if (isError) {
        messageElement.classList.add("error");
    } else {
        messageElement.classList.add("success");
    }
}


// ============================================================
// TRANSLATE AUTH ERROR
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
        return "Terlalu banyak percobaan login. Coba beberapa saat lagi.";
    }


    return error.message ||
        "Login gagal. Silakan coba lagi.";
}


// ============================================================
// LOAD USER PROFILE
// ============================================================

async function loadProfile() {

    if (!authSupabaseReady()) {
        showLogin();
        return;
    }


    if (!currentUser) {

        showLogin();

        return;
    }


    try {

        // ====================================================
        // Ambil profile berdasarkan auth_user_id
        // ====================================================

        const {
            data,
            error
        } = await supabaseClient
            .from("sales_users")
            .select("*")
            .eq(
                "auth_user_id",
                currentUser.id
            )
            .maybeSingle();


        if (error) {

            console.error(
                "FSI CRM - Profile error:",
                error
            );


            alert(
                "Gagal mengambil profile user:\n\n" +
                error.message
            );


            await logout();

            return;
        }


        if (!data) {

            console.error(
                "FSI CRM - User profile tidak ditemukan."
            );


            alert(
                "Profile user tidak ditemukan di sales_users."
            );


            await logout();

            return;
        }


        // ====================================================
        // Simpan profile
        // ====================================================

        currentProfile = data;


        window.currentUser = currentUser;
        window.currentProfile = currentProfile;


        console.log(
            "FSI CRM - Profile loaded:",
            currentProfile
        );


        // ====================================================
        // Update UI
        // ====================================================

        updateUserInfo();


        setupRoleAccess();


        showApp();


        // ====================================================
        // Load data CRM
        // ====================================================

        await loadCRMDataAfterLogin();


    } catch (error) {

        console.error(
            "FSI CRM - loadProfile error:",
            error
        );


        showLogin();
    }
}


// ============================================================
// LOAD ALL CRM DATA AFTER LOGIN
// ============================================================

async function loadCRMDataAfterLogin() {

    try {

        // ----------------------------------------------------
        // Load sales lookup
        // ----------------------------------------------------

        if (
            typeof window.loadSalesLookup === "function"
        ) {

            try {

                await window.loadSalesLookup();

            } catch (error) {

                console.error(
                    "loadSalesLookup error:",
                    error
                );
            }
        }


        // ----------------------------------------------------
        // Load filter options
        // ----------------------------------------------------

        if (
            typeof window.loadFilterOptions === "function"
        ) {

            try {

                await window.loadFilterOptions();

            } catch (error) {

                console.error(
                    "loadFilterOptions error:",
                    error
                );
            }
        }


        // ----------------------------------------------------
        // Load leads
        // ----------------------------------------------------

        if (
            typeof window.loadLeads === "function"
        ) {

            try {

                await window.loadLeads(1);

            } catch (error) {

                console.error(
                    "loadLeads error:",
                    error
                );
            }
        }


        // ----------------------------------------------------
        // Update dashboard
        // ----------------------------------------------------

        if (
            typeof window.updateDashboard === "function"
        ) {

            try {

                await window.updateDashboard();

            } catch (error) {

                console.error(
                    "updateDashboard error:",
                    error
                );
            }
        }


        // ----------------------------------------------------
        // Load sales
        // ----------------------------------------------------

        if (
            typeof window.loadSalesUsers === "function"
        ) {

            try {

                await window.loadSalesUsers();

            } catch (error) {

                console.error(
                    "loadSalesUsers error:",
                    error
                );
            }
        }


    } catch (error) {

        console.error(
            "FSI CRM - loadCRMDataAfterLogin error:",
            error
        );
    }
}


// ============================================================
// SHOW LOGIN
// ============================================================

function showLogin() {

    const loginPage = authFirstElement([
        "loginPage",
        "login-page",
        "login-screen"
    ]);


    const app = authFirstElement([
        "app",
        "app-shell",
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


    // Reset login form
    const loginForm = authFirstElement([
        "loginForm",
        "login-form"
    ]);


    if (loginForm) {

        // Jangan reset otomatis ketika page baru
        // supaya browser tidak mengganggu autofill.
        // Hanya dilakukan jika diperlukan.
    }


    setTimeout(() => {

        const usernameInput = authFirstElement([
            "loginUsername",
            "login-username",
            "username"
        ]);


        if (usernameInput) {
            usernameInput.focus();
        }

    }, 100);
}


// ============================================================
// SHOW APPLICATION
// ============================================================

function showApp() {

    const loginPage = authFirstElement([
        "loginPage",
        "login-page",
        "login-screen"
    ]);


    const app = authFirstElement([
        "app",
        "app-shell",
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
    // Tampilkan dashboard pertama kali
    // ========================================================

    if (
        typeof window.crmNavigate === "function"
    ) {

        window.crmNavigate("dashboard");

    } else if (
        typeof window.showDashboard === "function"
    ) {

        window.showDashboard();

    } else {

        // Fallback jika navigation.js belum selesai
        showDashboardFallback();
    }


    // Refresh icon jika Lucide tersedia
    refreshLucideIcons();
}


// ============================================================
// FALLBACK DASHBOARD
// ============================================================

function showDashboardFallback() {

    const sections = document.querySelectorAll(
        ".crm-section, .view-section"
    );


    sections.forEach(section => {

        section.classList.add("hidden");

        section.style.display = "none";
    });


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

    if (!currentProfile) {
        return;
    }


    const name =
        currentProfile.name ||
        currentProfile.full_name ||
        currentProfile.username ||
        currentUser?.email ||
        "User";


    const role =
        currentProfile.role ||
        "Sales";


    const avatarUrl =
        currentProfile.avatar_url ||
        currentProfile.avatar ||
        "";


    // ========================================================
    // Header user name
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


    // ========================================================
    // Header role
    // ========================================================

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
    // Legacy currentUser
    // ========================================================

    authSetText(
        "currentUser",
        `${name} (${role})`
    );


    // ========================================================
    // Avatar text
    // ========================================================

    const avatarElements =
        document.querySelectorAll(
            ".user-avatar, .avatar"
        );


    const initials =
        getInitials(name);


    avatarElements.forEach(element => {

        // Jika elemen <img>
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


        // Jika div avatar
        element.textContent =
            initials;
    });


    // ========================================================
    // Legacy userInfo
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
// GET INITIALS
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

    if (!currentProfile) {
        return;
    }


    const role =
        String(
            currentProfile.role || ""
        ).toLowerCase()
        .trim();


    const isAdmin =
        role === "admin" ||
        role === "owner" ||
        role === "administrator";


    const isSales =
        !isAdmin;


    console.log(
        "FSI CRM role:",
        currentProfile.role,
        "Admin:",
        isAdmin
    );


    // ========================================================
    // Admin-only elements
    // ========================================================

    const adminElements =
        document.querySelectorAll(
            "[data-admin-only]"
        );


    adminElements.forEach(element => {

        if (isAdmin) {

            element.classList.remove("hidden");

            element.style.display = "";

        } else {

            element.classList.add("hidden");

            element.style.display = "none";
        }
    });


    // ========================================================
    // Legacy manage sales button
    // ========================================================

    const manageSalesBtn =
        authFirstElement([
            "manageSalesBtn",
            "manage-sales-btn"
        ]);


    const mobileManageSalesBtn =
        authFirstElement([
            "mobileManageSalesBtn",
            "mobile-manage-sales-btn"
        ]);


    if (manageSalesBtn) {

        manageSalesBtn.style.display =
            isAdmin ? "" : "none";
    }


    if (mobileManageSalesBtn) {

        mobileManageSalesBtn.style.display =
            isAdmin ? "" : "none";
    }


    // ========================================================
    // Sales filter
    // ========================================================

    const salesFilter =
        authFirstElement([
            "salesFilter",
            "sales-filter"
        ]);


    const salesDropdownContainer =
        authFirstElement([
            "salesDropdownContainer",
            "sales-dropdown-container"
        ]);


    if (salesFilter) {

        salesFilter.style.display =
            isAdmin ? "" : "none";
    }


    if (salesDropdownContainer) {

        salesDropdownContainer.style.display =
            isAdmin ? "" : "none";
    }


    // ========================================================
    // Sales assignment
    // ========================================================

    setupSalesAssignmentAccess();


    // ========================================================
    // Save role globally
    // ========================================================

    window.isAdmin =
        isAdmin;

    window.isSales =
        isSales;
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


    if (!field || !currentProfile) {
        return;
    }


    const role =
        String(
            currentProfile.role || ""
        ).toLowerCase()
        .trim();


    const isAdmin =
        role === "admin" ||
        role === "owner" ||
        role === "administrator";


    if (isAdmin) {

        field.disabled = false;

        field.style.display = "";

    } else {

        // Sales tidak boleh memilih sales lain
        field.disabled = true;

        field.style.display = "";

        // Jika field select, set dirinya sendiri
        if (
            field.tagName === "SELECT" &&
            currentProfile.id
        ) {

            field.value =
                currentProfile.id;
        }
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
            } = await supabaseClient.auth.signOut();


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
        // Bersihkan state lokal
        // ====================================================

        currentUser = null;

        currentProfile = null;


        window.currentUser = null;
        window.currentProfile = null;


        if (
            typeof leadsData !== "undefined"
        ) {
            leadsData = [];
        }


        if (
            typeof salesUsersData !== "undefined"
        ) {
            salesUsersData = [];
        }


        if (
            typeof currentPage !== "undefined"
        ) {
            currentPage = 1;
        }


        if (
            typeof totalLeadsCount !== "undefined"
        ) {
            totalLeadsCount = 0;
        }


        window.crmCurrentCustomerId =
            null;


        window.crmCurrentCustomer =
            null;


        // ====================================================
        // Bersihkan tampilan
        // ====================================================

        showLogin();


        // ====================================================
        // Reset login message
        // ====================================================

        setLoginMessage(
            "",
            false
        );


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


    logoutButtons.forEach(button => {

        // Hindari event listener ganda
        if (
            button.dataset.authLogoutBound === "true"
        ) {
            return;
        }


        button.dataset.authLogoutBound =
            "true";


        button.addEventListener(
            "click",
            async function(event) {

                event.preventDefault();

                await logout();
            }
        );
    });
}


// ============================================================
// LOGIN FORM EVENTS
// ============================================================

function setupLoginForm() {

    const loginForm =
        authFirstElement([
            "loginForm",
            "login-form"
        ]);


    if (!loginForm) {
        return;
    }


    if (
        loginForm.dataset.authBound === "true"
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
// SUPABASE AUTH STATE LISTENER
// ============================================================

function setupAuthListener() {

    if (!authSupabaseReady()) {
        return;
    }


    if (
        window.fsiAuthListenerReady
    ) {
        return;
    }


    window.fsiAuthListenerReady =
        true;


    supabaseClient.auth.onAuthStateChange(
        async (event, session) => {

            console.log(
                "FSI CRM Auth Event:",
                event
            );


            // =================================================
            // SIGNED OUT
            // =================================================

            if (
                event === "SIGNED_OUT" ||
                !session
            ) {

                currentUser = null;

                currentProfile = null;


                window.currentUser = null;
                window.currentProfile = null;


                window.crmCurrentCustomerId =
                    null;

                window.crmCurrentCustomer =
                    null;


                showLogin();


                return;
            }


            // =================================================
            // LOGIN / INITIAL SESSION
            // =================================================

            if (
                session &&
                (
                    event === "SIGNED_IN" ||
                    event === "INITIAL_SESSION" ||
                    !currentProfile
                )
            ) {

                currentUser =
                    session.user;


                // Jangan langsung query Supabase
                // di dalam callback auth state.
                // Beri sedikit waktu agar session stabil.

                setTimeout(
                    async () => {

                        if (
                            currentUser &&
                            !currentProfile
                        ) {

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
// REFRESH LUCIDE ICONS
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
            "Lucide refresh gagal:",
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

        showLogin();

        return;
    }


    setupLoginForm();

    setupLogoutButtons();

    setupAuthListener();


    await checkSession();


    refreshLucideIcons();
}


// ============================================================
// DOM READY
// ============================================================

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeAuth
    );

} else {

    initializeAuth();
}
