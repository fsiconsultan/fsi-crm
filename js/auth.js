// ============================================================
// FSI CRM - AUTHENTICATION & USER PROFILE
// ============================================================
// File    : js/auth.js
// Version : 2026.10 FIX
//
// Fungsi:
// 1. Check Supabase session
// 2. Login username + password
// 3. Username -> email melalui RPC get_login_email
// 4. Load profile dari sales_users
// 5. Role Admin / Owner / Sales / Secretary / Digital Marketing
// 6. Role-based access
// 7. Show / hide Login dan CRM App
// 8. Load CRM data
// 9. Logout
// 10. Supabase auth listener
//
// FIX:
// - Prevent duplicate loadProfile()
// - Shared Promise untuk concurrent loadProfile()
// - checkSession + Auth Listener aman berjalan bersamaan
// - JWT "issued at future" ditangani
// - Tidak mengubah struktur sales_users
// - Tetap menggunakan "auth_user-id"
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

        const element =
            document.getElementById(id);

        if (element) {
            return element;
        }
    }

    return null;
}

function authSetText(ids, value) {

    const list =
        Array.isArray(ids)
            ? ids
            : [ids];

    const element =
        authFirstElement(list);

    if (element) {
        element.textContent =
            value ?? "";
    }
}

function authShowElement(element) {

    if (!element) {
        return;
    }

    element.classList.remove("hidden");
    element.removeAttribute("hidden");
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

        if (
            typeof currentUser !==
            "undefined"
        ) {
            currentUser = user || null;
        }

    } catch (error) {
        // Ignore lexical state errors.
    }

    window.currentUser =
        user || null;
}

function authSetCurrentProfile(profile) {

    const value =
        profile || null;

    try {

        if (
            typeof currentProfile !==
            "undefined"
        ) {
            currentProfile = value;
        }

    } catch (error) {
        // Ignore lexical state errors.
    }

    window.currentProfile =
        value;

    // Leads compatibility
    window.FSILeadsProfile =
        value;
}

function authGetCurrentUser() {

    try {

        if (
            typeof currentUser !==
                "undefined" &&
            currentUser
        ) {
            return currentUser;
        }

    } catch (error) {
        // Ignore.
    }

    return window.currentUser || null;
}

function authGetCurrentProfile() {

    try {

        if (
            typeof currentProfile !==
                "undefined" &&
            currentProfile
        ) {
            return currentProfile;
        }

    } catch (error) {
        // Ignore.
    }

    return (
        window.currentProfile ||
        window.FSILeadsProfile ||
        null
    );
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

if (
    typeof window.escapeHTML !==
    "function"
) {
    window.escapeHTML =
        authEscapeHTML;
}

// ============================================================
// SUPABASE READY
// ============================================================

function authGetSupabase() {

    if (
        window.supabaseClient &&
        window.supabaseClient.auth
    ) {
        return window.supabaseClient;
    }

    try {

        if (
            typeof supabaseClient !==
                "undefined" &&
            supabaseClient &&
            supabaseClient.auth
        ) {
            return supabaseClient;
        }

    } catch (error) {
        // Ignore.
    }

    return null;
}

function authSupabaseReady() {

    const client =
        authGetSupabase();

    if (!client) {

        console.error(
            "FSI CRM: Supabase client belum tersedia."
        );

        return false;
    }

    return true;
}

// ============================================================
// ROLE HELPERS
// ============================================================

function authNormalizeRole(role) {

    const value =
        String(role || "")
            .trim()
            .toLowerCase();

    // --------------------------------------------------------
    // ADMIN
    // --------------------------------------------------------

    if (
        value === "admin" ||
        value === "administrator" ||
        value === "owner"
    ) {
        return "admin";
    }

    // --------------------------------------------------------
    // USER ROLES
    //
    // Semua role ini mempunyai scope seperti Sales:
    // hanya lead miliknya sendiri.
    // --------------------------------------------------------

    if (
        value === "sales" ||
        value === "salesperson" ||
        value === "secretary" ||
        value === "digital marketing" ||
        value === "digital_marketing" ||
        value === "digitalmarketing"
    ) {
        return "sales";
    }

    // --------------------------------------------------------
    // DEFAULT
    // --------------------------------------------------------

    return "sales";
}

function authIsAdmin() {

    const profile =
        authGetCurrentProfile();

    if (!profile) {
        return false;
    }

    return (
        authNormalizeRole(
            profile.role
        ) === "admin"
    );
}

function authIsSales() {

    const profile =
        authGetCurrentProfile();

    if (!profile) {
        return false;
    }

    return (
        authNormalizeRole(
            profile.role
        ) === "sales"
    );
}

// ============================================================
// CHECK SESSION
// ============================================================

async function checkSession() {

    const supabase =
        authGetSupabase();

    if (!supabase) {

        showLogin();

        return false;
    }

    try {

        const response =
            await supabase.auth.getSession();

        const data =
            response.data;

        const error =
            response.error;

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

        const session =
            data?.session;

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

        authSetCurrentUser(
            session.user
        );

        // IMPORTANT:
        // loadProfile() sekarang memakai shared Promise.
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

    const supabase =
        authGetSupabase();

    if (!supabase) {

        setLoginMessage(
            "Supabase belum terhubung.",
            true
        );

        return false;
    }

    const usernameInput =
        authFirstElement([
            "loginUsername",
            "login-username",
            "username",
            "login-username-input"
        ]);

    const passwordInput =
        authFirstElement([
            "loginPassword",
            "login-password",
            "password",
            "login-password-input"
        ]);

    const username =
        usernameInput
            ? usernameInput.value.trim()
            : "";

    const password =
        passwordInput
            ? passwordInput.value
            : "";

    if (
        !username ||
        !password
    ) {

        setLoginMessage(
            "Username dan password wajib diisi.",
            true
        );

        return false;
    }

    const loginButton =
        authFirstElement([
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

        loginButton.disabled =
            true;

        loginButton.innerHTML =
            "<span>Memproses...</span>";
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

        const rpcResponse =
            await supabase.rpc(
                "get_login_email",
                {
                    p_username:
                        username
                }
            );

        const email =
            rpcResponse.data;

        const emailError =
            rpcResponse.error;

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
        // SUPABASE AUTH
        // ====================================================

        setLoginMessage(
            "Memverifikasi password...",
            false
        );

        const loginResponse =
            await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

        const authData =
            loginResponse.data;

        const authError =
            loginResponse.error;

        if (authError) {

            console.error(
                "FSI CRM - signInWithPassword error:",
                authError
            );

            setLoginMessage(
                translateAuthError(
                    authError
                ),
                true
            );

            return false;
        }

        if (!authData?.user) {

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

        authSetCurrentUser(
            authData.user
        );

        setLoginMessage(
            "Login berhasil. Memuat CRM...",
            false
        );

        // ====================================================
        // STEP 4
        //
        // JANGAN loadProfile() di sini.
        //
        // Auth listener akan memproses session.
        // ====================================================

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

            loginButton.disabled =
                false;

            loginButton.innerHTML =
                originalButtonHTML ||
                "<span>Login</span>";
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

    const element =
        authFirstElement([
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

    element.textContent =
        message || "";

    element.classList.remove(
        "error",
        "success",
        "warning"
    );

    if (!message) {
        return;
    }

    if (isError) {

        element.classList.add(
            "error"
        );

    } else {

        element.classList.add(
            "success"
        );
    }
}

// ============================================================
// AUTH ERROR TRANSLATION
// ============================================================

function translateAuthError(error) {

    if (!error) {
        return "Login gagal.";
    }

    const message =
        String(
            error.message || ""
        ).toLowerCase();

    if (
        message.includes(
            "invalid login credentials"
        ) ||
        message.includes(
            "invalid credentials"
        )
    ) {
        return "Username atau password salah.";
    }

    if (
        message.includes(
            "email not confirmed"
        )
    ) {
        return "Akun belum dikonfirmasi.";
    }

    if (
        message.includes(
            "too many requests"
        )
    ) {
        return (
            "Terlalu banyak percobaan login. " +
            "Coba beberapa saat lagi."
        );
    }

    if (
        message.includes(
            "jwt issued at future"
        )
    ) {
        return (
            "Session login tidak valid. " +
            "Silakan refresh halaman dan login kembali."
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
//
// IMPORTANT FIX:
//
// Sebelumnya:
//
// let authProfileLoading = false;
//
// if (authProfileLoading) {
//     return !!authGetCurrentProfile();
// }
//
// Masalah:
// checkSession() dan auth listener bisa memanggil loadProfile()
// hampir bersamaan.
//
// Sekarang menggunakan Promise:
//
// - Pemanggilan pertama menjalankan proses.
// - Pemanggilan kedua menunggu proses yang sama.
// - Tidak ada duplicate query.
// - Tidak ada "loadProfile() masih berjalan" yang memutus proses.
// ============================================================

let authProfileLoading = false;
let authProfilePromise = null;

// ============================================================
// INTERNAL PROFILE LOADER
// ============================================================

async function authLoadProfileInternal() {

    const supabase =
        authGetSupabase();

    if (!supabase) {

        console.error(
            "FSI CRM - loadProfile: Supabase tidak tersedia."
        );

        showLogin();

        return false;
    }

    try {

        // ----------------------------------------------------
        // GET FRESH SESSION
        // ----------------------------------------------------

        const sessionResponse =
            await supabase.auth.getSession();

        const sessionError =
            sessionResponse?.error;

        const session =
            sessionResponse?.data?.session;

        if (sessionError) {

            console.error(
                "FSI CRM - loadProfile session error:",
                sessionError
            );

            authSetCurrentUser(null);
            authSetCurrentProfile(null);

            setLoginMessage(
                translateAuthError(
                    sessionError
                ),
                true
            );

            showLogin();

            return false;
        }

        if (!session?.user?.id) {

            console.warn(
                "FSI CRM - loadProfile: session/user tidak tersedia."
            );

            authSetCurrentUser(null);
            authSetCurrentProfile(null);

            showLogin();

            return false;
        }

        // ----------------------------------------------------
        // USE USER FROM CURRENT SESSION
        // ----------------------------------------------------

        const user =
            session.user;

        authSetCurrentUser(
            user
        );

        console.log(
            "================================================"
        );

        console.log(
            "FSI CRM - LOADING USER PROFILE"
        );

        console.log(
            "Auth User ID:",
            user.id
        );

        console.log(
            "================================================"
        );

        // ====================================================
        // QUERY sales_users
        //
        // COLUMN WAJIB:
        // "auth_user-id"
        // ====================================================

        const profileResponse =
            await supabase
                .from("sales_users")
                .select("*")
                .eq(
                    "auth_user-id",
                    user.id
                )
                .limit(1)
                .maybeSingle();

        const data =
            profileResponse?.data;

        const error =
            profileResponse?.error;

        // ====================================================
        // QUERY ERROR
        // ====================================================

        if (error) {

            console.error(
                "================================================"
            );

            console.error(
                "FSI CRM - PROFILE QUERY ERROR"
            );

            console.error(
                "User ID:",
                user.id
            );

            console.error(
                "Error code:",
                error.code
            );

            console.error(
                "Error message:",
                error.message
            );

            console.error(
                "Error details:",
                error.details
            );

            console.error(
                "Error hint:",
                error.hint
            );

            console.error(
                "Full error:",
                JSON.stringify(
                    error,
                    null,
                    2
                )
            );

            console.error(
                "================================================"
            );

            authSetCurrentProfile(null);

            const errorMessage =
                String(
                    error.message || ""
                ).toLowerCase();

            // ------------------------------------------------
            // JWT / SESSION ERROR
            // ------------------------------------------------

            if (
                errorMessage.includes(
                    "jwt issued at future"
                )
            ) {

                console.warn(
                    "FSI CRM - JWT session tidak valid."
                );

                try {

                    await supabase.auth.signOut();

                } catch (signOutError) {

                    console.warn(
                        "FSI CRM - signOut setelah JWT error gagal:",
                        signOutError
                    );
                }

                setLoginMessage(
                    "Session login tidak valid. Halaman akan meminta login ulang.",
                    true
                );

            } else {

                setLoginMessage(
                    "Gagal mengambil profile: " +
                    (
                        error.message ||
                        "Database error."
                    ),
                    true
                );
            }

            showLogin();

            return false;
        }

        // ====================================================
        // PROFILE TIDAK ADA
        // ====================================================

        if (!data) {

            console.error(
                "FSI CRM - PROFILE TIDAK DITEMUKAN"
            );

            console.error(
                "Auth User ID:",
                user.id
            );

            console.error(
                'Mencari sales_users."auth_user-id" =',
                user.id
            );

            authSetCurrentProfile(null);

            setLoginMessage(
                "Profile user tidak ditemukan di sales_users.",
                true
            );

            await safeSignOut();

            showLogin();

            return false;
        }

        // ====================================================
        // PROFILE BERHASIL
        // ====================================================

        console.log(
            "FSI CRM - PROFILE FOUND:",
            data
        );

        console.log(
            "FSI CRM - PROFILE ID:",
            data.id
        );

        console.log(
            'FSI CRM - PROFILE AUTH ID:',
            data["auth_user-id"]
        );

        console.log(
            "FSI CRM - PROFILE ROLE:",
            data.role
        );

        // ====================================================
        // VERIFY AUTH RELATION
        // ====================================================

        if (
            data["auth_user-id"] &&
            data["auth_user-id"] !== user.id
        ) {

            console.error(
                "FSI CRM - Profile auth_user-id tidak cocok."
            );

            authSetCurrentProfile(null);

            setLoginMessage(
                "Profile user tidak cocok dengan akun login.",
                true
            );

            await safeSignOut();

            showLogin();

            return false;
        }

        // ====================================================
        // STATUS
        // ====================================================

        const status =
            String(
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

            authSetCurrentProfile(null);

            setLoginMessage(
                "Akun Anda tidak aktif. Hubungi Admin.",
                true
            );

            await safeSignOut();

            showLogin();

            return false;
        }

        // ====================================================
        // SAVE PROFILE
        // ====================================================

        authSetCurrentProfile(
            data
        );

        window.currentProfile =
            data;

        window.FSILeadsProfile =
            data;

        // ====================================================
        // VERIFY GLOBAL PROFILE
        // ====================================================

        console.log(
            "================================================"
        );

        console.log(
            "FSI CRM - PROFILE READY"
        );

        console.log(
            "window.currentProfile:",
            window.currentProfile
        );

        console.log(
            "window.currentProfile.id:",
            window.currentProfile?.id
        );

        console.log(
            'window.currentProfile["auth_user-id"]:',
            window.currentProfile?.["auth_user-id"]
        );

        console.log(
            "window.currentProfile.role:",
            window.currentProfile?.role
        );

        console.log(
            "================================================"
        );

        // ====================================================
        // UPDATE UI
        // ====================================================

        updateUserInfo();

        setupRoleAccess();

        // ====================================================
        // SHOW APP
        // ====================================================

        showApp();

        // ====================================================
        // PROFILE READY EVENT
        // ====================================================

        window.dispatchEvent(
            new CustomEvent(
                "fsi:profile-ready",
                {
                    detail: {
                        user:
                            user,
                        profile:
                            data
                    }
                }
            )
        );

        // ====================================================
        // APP READY EVENT
        // ====================================================

        window.dispatchEvent(
            new CustomEvent(
                "fsi:app-ready",
                {
                    detail: {
                        user:
                            user,
                        profile:
                            data
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
            "================================================"
        );

        console.error(
            "FSI CRM - LOAD PROFILE EXCEPTION"
        );

        console.error(
            "Message:",
            error?.message
        );

        console.error(
            "Stack:",
            error?.stack
        );

        console.error(
            "Full error:",
            JSON.stringify(
                error,
                null,
                2
            )
        );

        console.error(
            "================================================"
        );

        authSetCurrentProfile(null);

        setLoginMessage(
            translateAuthError(
                error
            ),
            true
        );

        showLogin();

        return false;
    }
}

// ============================================================
// PUBLIC LOAD PROFILE
// ============================================================

async function loadProfile() {

    // --------------------------------------------------------
    // PROFILE SUDAH ADA
    // --------------------------------------------------------

    if (authGetCurrentProfile()) {

        return true;
    }

    // --------------------------------------------------------
    // PROFILE LOAD SEDANG BERJALAN
    //
    // Jangan return false.
    // Tunggu Promise yang sama.
    // --------------------------------------------------------

    if (
        authProfileLoading &&
        authProfilePromise
    ) {

        console.log(
            "FSI CRM - loadProfile() sedang berjalan, menunggu proses yang sama..."
        );

        try {

            return await authProfilePromise;

        } catch (error) {

            console.error(
                "FSI CRM - shared loadProfile error:",
                error
            );

            return false;
        }
    }

    // --------------------------------------------------------
    // START PROFILE LOAD
    // --------------------------------------------------------

    authProfileLoading =
        true;

    authProfilePromise =
        authLoadProfileInternal();

    try {

        return await authProfilePromise;

    } finally {

        // ----------------------------------------------------
        // RELEASE LOCK
        // ----------------------------------------------------

        authProfileLoading =
            false;

        authProfilePromise =
            null;
    }
}

// ============================================================
// SAFE SIGN OUT
// ============================================================

async function safeSignOut() {

    try {

        const supabase =
            authGetSupabase();

        if (supabase) {

            await supabase.auth.signOut();
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

    const loginPage =
        authFirstElement([
            "login-page",
            "loginPage",
            "login-screen"
        ]);

    const app =
        authFirstElement([
            "app-shell",
            "app",
            "crm-app"
        ]);

    if (loginPage) {

        loginPage.classList.remove(
            "hidden"
        );

        loginPage.removeAttribute(
            "hidden"
        );

        loginPage.style.display =
            "flex";
    }

    if (app) {

        app.classList.add(
            "hidden"
        );

        app.style.display =
            "none";
    }

    if (
        typeof window.closeMobileNav ===
        "function"
    ) {

        try {
            window.closeMobileNav();
        } catch (error) {
            // Ignore.
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
                document.visibilityState !==
                    "hidden"
            ) {

                try {
                    usernameInput.focus();
                } catch (error) {
                    // Ignore.
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

    const loginPage =
        authFirstElement([
            "login-page",
            "loginPage",
            "login-screen"
        ]);

    const app =
        authFirstElement([
            "app-shell",
            "app",
            "crm-app"
        ]);

    console.log(
        "FSI CRM - showApp()",
        {
            loginFound:
                !!loginPage,
            appFound:
                !!app
        }
    );

    if (loginPage) {

        loginPage.classList.add(
            "hidden"
        );

        loginPage.style.display =
            "none";
    }

    if (app) {

        app.classList.remove(
            "hidden"
        );

        app.removeAttribute(
            "hidden"
        );

        app.style.display =
            "block";

        app.style.visibility =
            "visible";

        app.style.opacity =
            "1";

    } else {

        console.error(
            "FSI CRM: #app-shell tidak ditemukan."
        );
    }

    setTimeout(
        function () {

            try {

                if (
                    typeof window.crmNavigate ===
                    "function"
                ) {

                    window.crmNavigate(
                        "dashboard"
                    );

                    return;
                }

                if (
                    window.FSINavigation &&
                    typeof window.FSINavigation.showPage ===
                        "function"
                ) {

                    window.FSINavigation.showPage(
                        "dashboard"
                    );

                    return;
                }

                if (
                    typeof window.showDashboard ===
                    "function"
                ) {

                    window.showDashboard();

                    return;
                }

                showDashboardFallback();

            } catch (error) {

                console.error(
                    "FSI CRM - Dashboard navigation error:",
                    error
                );

                showDashboardFallback();
            }

        },
        50
    );

    refreshLucideIcons();
}

// ============================================================
// DASHBOARD FALLBACK
// ============================================================

function showDashboardFallback() {

    const pages =
        document.querySelectorAll(
            ".crm-page, " +
            ".crm-section, " +
            ".view-section"
        );

    pages.forEach(
        function (page) {

            page.classList.remove(
                "active"
            );

            page.classList.add(
                "hidden"
            );

            page.style.display =
                "none";
        }
    );

    const dashboard =
        authFirstElement([
            "view-dashboard",
            "dashboardView",
            "dashboard-section"
        ]);

    if (dashboard) {

        dashboard.classList.remove(
            "hidden"
        );

        dashboard.classList.add(
            "active"
        );

        dashboard.style.display =
            "block";

        dashboard.setAttribute(
            "aria-hidden",
            "false"
        );
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

    authSetText(
        "currentUser",
        name +
        " (" +
        role +
        ")"
    );

    const initials =
        getInitials(name);

    const avatarElements =
        document.querySelectorAll(
            ".user-avatar, .avatar"
        );

    avatarElements.forEach(
        function (element) {

            if (
                element.tagName ===
                "IMG"
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

    const userInfo =
        authElement(
            "userInfo"
        );

    if (!userInfo) {
        return;
    }

    if (avatarUrl) {

        userInfo.innerHTML =
            '<img ' +
                'src="' +
                authEscapeHTML(
                    avatarUrl
                ) +
                '" ' +
                'alt="' +
                authEscapeHTML(
                    name
                ) +
                '" ' +
                'class="user-avatar">' +

            '<div class="user-info-text">' +

                '<strong>' +
                    authEscapeHTML(
                        name
                    ) +
                '</strong>' +

                '<small>' +
                    authEscapeHTML(
                        role
                    ) +
                '</small>' +

            '</div>';

    } else {

        userInfo.innerHTML =
            '<div class="user-avatar avatar">' +
                authEscapeHTML(
                    initials
                ) +
            '</div>' +

            '<div class="user-info-text">' +

                '<strong>' +
                    authEscapeHTML(
                        name
                    ) +
                '</strong>' +

                '<small>' +
                    authEscapeHTML(
                        role
                    ) +
                '</small>' +

            '</div>';
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
        normalizedRole ===
        "admin";

    const isSales =
        normalizedRole ===
        "sales";

    console.log(
        "FSI CRM Role:",
        profile.role,
        "=>",
        normalizedRole
    );

    // --------------------------------------------------------
    // ADMIN ONLY
    // --------------------------------------------------------

    const adminElements =
        document.querySelectorAll(
            "[data-admin-only]"
        );

    adminElements.forEach(
        function (element) {

            if (isAdmin) {

                element.classList.remove(
                    "hidden"
                );

                element.style.display =
                    "";

            } else {

                element.classList.add(
                    "hidden"
                );

                element.style.display =
                    "none";
            }
        }
    );

    // --------------------------------------------------------
    // DASHBOARD SALES FILTER
    // --------------------------------------------------------

    const salesFilter =
        authFirstElement([
            "salesFilter",
            "sales-filter"
        ]);

    if (salesFilter) {

        salesFilter.style.display =
            isAdmin
                ? ""
                : "none";
    }

    // --------------------------------------------------------
    // LEADS SALES FILTER
    // --------------------------------------------------------

    const leadsSalesFilter =
        authFirstElement([
            "filter-sales",
            "leadSalesFilter",
            "filterSales"
        ]);

    if (leadsSalesFilter) {

        leadsSalesFilter.style.display =
            isAdmin
                ? ""
                : "none";
    }

    // --------------------------------------------------------
    // SALES DROPDOWN
    // --------------------------------------------------------

    const salesDropdown =
        authFirstElement([
            "salesDropdown",
            "salesDropdownContainer",
            "sales-dropdown-container"
        ]);

    if (salesDropdown) {

        salesDropdown.style.display =
            isAdmin
                ? ""
                : "none";
    }

    // --------------------------------------------------------
    // SALES ASSIGNMENT
    // --------------------------------------------------------

    setupSalesAssignmentAccess();

    // --------------------------------------------------------
    // GLOBAL FLAGS
    // --------------------------------------------------------

    window.isAdmin =
        isAdmin;

    window.isSales =
        isSales;

    window.crmUserRole =
        normalizedRole;

    // --------------------------------------------------------
    // NAVIGATION
    // --------------------------------------------------------

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

        field.disabled =
            false;

        field.style.display =
            "";

        field.removeAttribute(
            "aria-disabled"
        );

        return;
    }

    // --------------------------------------------------------
    // NON ADMIN
    //
    // Sales / Secretary / Digital Marketing
    // --------------------------------------------------------

    field.disabled =
        true;

    field.style.display =
        "";

    field.setAttribute(
        "aria-disabled",
        "true"
    );

    if (
        field.tagName ===
            "SELECT" &&
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

        const supabase =
            authGetSupabase();

        if (supabase) {

            const response =
                await supabase.auth.signOut();

            if (response.error) {

                console.error(
                    "Supabase logout error:",
                    response.error
                );
            }
        }

    } catch (error) {

        console.error(
            "FSI CRM - logout error:",
            error
        );

    } finally {

        authSetCurrentUser(null);
        authSetCurrentProfile(null);

        window.isAdmin =
            false;

        window.isSales =
            false;

        window.crmUserRole =
            null;

        // Reset profile loading state
        authProfileLoading =
            false;

        authProfilePromise =
            null;

        try {

            if (
                typeof window.resetCRMState ===
                "function"
            ) {

                window.resetCRMState();

            } else {

                try {

                    if (
                        typeof leadsData !==
                        "undefined"
                    ) {
                        leadsData = [];
                    }

                } catch (error) {}

                try {

                    if (
                        typeof salesUsersData !==
                        "undefined"
                    ) {
                        salesUsersData = [];
                    }

                } catch (error) {}

                try {

                    if (
                        typeof currentPage !==
                        "undefined"
                    ) {
                        currentPage = 1;
                    }

                } catch (error) {}
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
        function (button) {

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
                async function (event) {

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

    const supabase =
        authGetSupabase();

    if (!supabase) {
        return;
    }

    if (
        window.fsiAuthListenerReady
    ) {
        return;
    }

    window.fsiAuthListenerReady =
        true;

    supabase.auth.onAuthStateChange(
        function (event, session) {

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

                // IMPORTANT:
                // Jangan langsung memanggil loadProfile
                // dari callback sync Supabase.
                //
                // Gunakan setTimeout kecil sehingga:
                // - checkSession selesai bila sedang berjalan
                // - shared Promise tetap digunakan
                // - tidak terjadi duplicate query

                setTimeout(
                    async function () {

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

    setupLoginForm();

    setupLogoutButtons();

    setupAuthListener();

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
    document.readyState ===
    "loading"
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
