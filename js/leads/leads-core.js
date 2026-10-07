// ============================================================
// FSI CRM - LEADS MANAGEMENT
// File: js/leads/leads-core.js
// ============================================================
//
// Fungsi:
// - Load leads dari Supabase
// - Search & filter
// - Pagination
// - Add Customer
// - Edit Customer
// - Delete customer
// - Sales assignment
// - Admin / Sales access
// - Integrasi Customer Profile / shelter.js
// - Sales header selection
// - Empty state tanpa stuck loading
// - Add Customer tersedia untuk Admin & Sales
// - Profile selalu menggunakan Customer ID yang benar
// - Status & Business filter dropdown
// - Location filter DIHAPUS
// - Menampilkan Email
// - Menampilkan Last Follow Up
// - Menampilkan Follow Up Age
// - Menampilkan Progress PLTS
// - Menampilkan Note
// ============================================================

"use strict";

// ========================================================
// INTERNAL STATE
// ========================================================

let leadsInitialized = false;
let leadsLoading = false;
let searchTimer = null;
let activeRequestId = 0;


// ========================================================
// DOM HELPERS
// ========================================================

function leadElement(...ids) {

    for (const id of ids) {

        if (!id) {
            continue;
        }

        const element =
            document.getElementById(id);

        if (element) {
            return element;
        }
    }

    return null;
}


// ========================================================
// SUPABASE
// ========================================================

function leadGetSupabase() {

    if (
        typeof window.supabaseClient !== "undefined" &&
        window.supabaseClient
    ) {
        return window.supabaseClient;
    }

    try {

        if (
            typeof supabaseClient !== "undefined" &&
            supabaseClient
        ) {
            return supabaseClient;
        }

    } catch (error) {

        // Ignore lexical lookup error.

    }

    return null;
}


// ========================================================
// GET CURRENT LEADS PROFILE
// ========================================================

function leadGetProfile() {

    // 1. Gunakan profile global jika tersedia
    if (
        typeof window.currentProfile !== "undefined" &&
        window.currentProfile
    ) {
        return window.currentProfile;
    }

    // 2. Gunakan currentProfile jika tersedia
    try {

        if (
            typeof currentProfile !== "undefined" &&
            currentProfile
        ) {
            return currentProfile;
        }

    } catch (error) {

        // Ignore lexical lookup error.

    }

    // 3. Gunakan profile khusus Leads
    if (
        window.FSILeadsProfile
    ) {
        return window.FSILeadsProfile;
    }

    return null;
}


// ========================================================
// LOAD PROFILE FROM SALES_USERS
// ========================================================
//
// Hubungan:
// auth.users.id
//      ↓
// sales_users."auth_user-id"
//      ↓
// sales_users.id
//      ↓
// leads.sales_id
//
// ========================================================

async function leadLoadProfile() {

    const client =
        leadGetSupabase();

    if (!client) {

        console.error(
            "FSI CRM: Supabase client is not ready."
        );

        return null;
    }

    try {

        // ------------------------------------------------
        // GET CURRENT AUTH USER
        // ------------------------------------------------

        const {
            data: {
                user
            } = {}
        } =
            await client.auth.getUser();

        if (!user) {

            console.warn(
                "FSI CRM: No authenticated user."
            );

            return null;
        }


        // ------------------------------------------------
        // GET SALES PROFILE
        // ------------------------------------------------

        const {
            data: profile,
            error
        } =
            await client
                .from("sales_users")
                .select("*")
                .eq(
                    "auth_user-id",
                    user.id
                )
                .maybeSingle();


        // ------------------------------------------------
        // ERROR
        // ------------------------------------------------

        if (error) {

            console.error(
                "FSI CRM: Failed to load sales profile:",
                error
            );

            return null;
        }


        // ------------------------------------------------
        // PROFILE NOT FOUND
        // ------------------------------------------------

        if (!profile) {

            console.warn(
                "FSI CRM: sales_users profile not found for auth user:",
                user.id
            );

            return null;
        }


        // ------------------------------------------------
        // SAVE PROFILE
        // ------------------------------------------------

        window.FSILeadsProfile =
            profile;

        window.currentProfile =
            profile;


        // ------------------------------------------------
        // DEBUG
        // ------------------------------------------------

        console.log(
            "FSI CRM: Leads profile loaded:",
            profile
        );

        console.log(
            "FSI CRM: Leads sales_users.id:",
            profile.id
        );

        console.log(
            "FSI CRM: Leads auth_user-id:",
            profile["auth_user-id"]
        );

        console.log(
            "FSI CRM: Leads role:",
            profile.role
        );


        return profile;

    } catch (error) {

        console.error(
            "FSI CRM: leadLoadProfile error:",
            error
        );

        return null;
    }
}


// ========================================================
// ADMIN ROLE
// ========================================================

function leadIsAdmin() {

    const profile =
        leadGetProfile();

    if (!profile) {
        return false;
    }


    // Gunakan helper global jika tersedia
    if (
        typeof window.isAdminRole ===
        "function"
    ) {

        return window.isAdminRole(
            profile
        );
    }


    // Fallback
    const role =
        String(
            profile.role || ""
        )
        .trim()
        .toLowerCase();


    return (
        role === "admin" ||
        role === "owner" ||
        role === "administrator"
    );
}


// ========================================================
// SALES ROLE
// ========================================================

function leadIsSales() {

    const profile =
        leadGetProfile();

    if (!profile) {
        return false;
    }


    const role =
        String(
            profile.role || ""
        )
        .trim()
        .toLowerCase();


    return (
        role === "sales" ||
        role === "salesperson" ||
        role === "secretary" ||
        role === "digital marketing" ||
        role === "digital_marketing"
    );
}


// ========================================================
// CURRENT USER TYPE
// ========================================================

function leadGetUserType() {

    const profile =
        leadGetProfile();

    if (!profile) {
        return null;
    }

    if (
        leadIsAdmin()
    ) {
        return "admin";
    }

    if (
        leadIsSales()
    ) {
        return "sales";
    }

    return "unknown";
}


// ========================================================
// DEBUG PROFILE
// ========================================================

function leadDebugProfile() {

    const profile =
        leadGetProfile();

    console.log(
        "========================================"
    );

    console.log(
        "FSI CRM - LEADS PROFILE DEBUG"
    );

    console.log(
        "========================================"
    );

    console.log(
        "Profile:",
        profile
    );

    console.log(
        "Profile ID:",
        profile?.id
    );

    console.log(
        "Auth User ID:",
        profile?.["auth_user-id"]
    );

    console.log(
        "Role:",
        profile?.role
    );

    console.log(
        "Is Admin:",
        leadIsAdmin()
    );

    console.log(
        "Is Sales:",
        leadIsSales()
    );

    console.log(
        "User Type:",
        leadGetUserType()
    );

    console.log(
        "========================================"
    );

    return profile;
}


// ========================================================
// EXPOSE LEADS PROFILE HELPERS
// ========================================================

window.leadGetProfile =
    leadGetProfile;

window.leadLoadProfile =
    leadLoadProfile;

window.leadIsAdmin =
    leadIsAdmin;

window.leadIsSales =
    leadIsSales;

window.leadGetUserType =
    leadGetUserType;

window.leadDebugProfile =
    leadDebugProfile;


// ========================================================
// END
// ========================================================
