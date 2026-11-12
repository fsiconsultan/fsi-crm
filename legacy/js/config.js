// ============================================================
// FSI CRM - SUPABASE CONFIGURATION
// ============================================================
// File : js/config.js
//
// Fungsi:
// 1. Supabase URL & Publishable Key
// 2. Supabase client
// 3. Global CRM state
// 4. Lead status configuration
// 5. Dashboard configuration
// 6. Database table configuration
// 7. Pagination configuration
// 8. Global FSI CRM namespace
//
// IMPORTANT:
// - Auth/profile logic berada di auth.js
// - Jangan menjalankan checkSession() dari file ini
// - Nama kolom profile Supabase:
//       auth_user-id
// ============================================================

"use strict";


// ============================================================
// SUPABASE CONFIGURATION
// ============================================================

const SUPABASE_URL =
    "https://yoyszukutqwoxxdolzcg.supabase.co";


const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_QcPULwc5-Axry0HRzfmq1A_CeXgiAHL";


// ============================================================
// SUPABASE CLIENT
// ============================================================

let supabaseClient = null;


if (
    typeof window.supabase !== "undefined" &&
    window.supabase &&
    typeof window.supabase.createClient === "function"
) {

    try {

        supabaseClient =
            window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_PUBLISHABLE_KEY
            );


        console.log(
            "FSI CRM: Supabase client berhasil dibuat."
        );

    } catch (error) {

        console.error(
            "FSI CRM: Gagal membuat Supabase client:",
            error
        );

        supabaseClient = null;
    }

} else {

    console.error(
        "FSI CRM: Supabase CDN belum tersedia."
    );
}


// Expose supaya mudah dicek dari browser console.
window.supabaseClient =
    supabaseClient;


window.FSI_SUPABASE_URL =
    SUPABASE_URL;


window.FSI_SUPABASE_PUBLISHABLE_KEY =
    SUPABASE_PUBLISHABLE_KEY;


// ============================================================
// GLOBAL AUTH STATE
// ============================================================

let currentUser = null;

let currentProfile = null;


// ============================================================
// GLOBAL CRM STATE
// ============================================================

let leadsData = [];

let salesUsersData = [];

let currentCustomerId = null;

let currentCustomer = null;


// ============================================================
// PAGINATION STATE
// ============================================================

let currentPage = 1;

let pageSize = 100;

let totalLeadsCount = 0;

let totalPages = 1;


// ============================================================
// SEARCH / FILTER STATE
// ============================================================

let currentSearch = "";

let currentStatusFilter = "";

let currentBusinessFilter = "";

let currentLocationFilter = "";

let currentSalesFilter = "";

let currentSortColumn = "created_at";

let currentSortDirection = "desc";

let searchDebounceTimer = null;

let editingLeadId = null;

let editingSalesId = null;


// ============================================================
// LEAD STATUS
// ============================================================
//
// STATUS UTAMA CRM = 7 STATUS
//
// 1. New
// 2. First Contact
// 3. First Meeting / Appointment / Site Survey
// 4. Quotation
// 5. Second Appointment
// 6. Deal
// 7. No Deal
//
// SPK dan Closing BUKAN status utama.
// Keduanya tetap merupakan field/detail customer.
// ============================================================

const LEAD_STATUSES = [

    "New",

    "First Contact",

    "First Meeting / Appointment / Site Survey",

    "Quotation",

    "Second Appointment",

    "Deal",

    "No Deal"
];


// ============================================================
// STATUS LABELS
// ============================================================

const LEAD_STATUS_LABELS = {

    "New":
        "New",

    "First Contact":
        "First Contact",

    "First Meeting / Appointment / Site Survey":
        "First Meeting / Appointment / Site Survey",

    "Quotation":
        "Quotation",

    "Second Appointment":
        "Second Appointment",

    "Deal":
        "Deal",

    "No Deal":
        "No Deal"
};


// ============================================================
// STATUS CSS CLASSES
// ============================================================

const LEAD_STATUS_CLASSES = {

    "New":
        "status-new",

    "First Contact":
        "status-first-contact",

    "First Meeting / Appointment / Site Survey":
        "status-first-meeting",

    "Quotation":
        "status-quotation",

    "Second Appointment":
        "status-second-appointment",

    "Deal":
        "status-deal",

    "No Deal":
        "status-no-deal"
};


// ============================================================
// PIPELINE STAGES
// ============================================================
//
// Pipeline mengikuti 7 STATUS UTAMA.
//
// SPK dan Closing tidak dimasukkan ke pipeline status.
// SPK / Deposit dan Closing tetap tersedia sebagai
// field/detail customer.
// ============================================================

const PIPELINE_STAGES = [

    {
        key: "new",
        status: "New",
        label: "New",
        className: "status-new"
    },

    {
        key: "first_contact",
        status: "First Contact",
        label: "First Contact",
        className: "status-first-contact"
    },

    {
        key: "first_meeting",
        status: "First Meeting / Appointment / Site Survey",
        label: "First Meeting / Appointment / Site Survey",
        className: "status-first-meeting"
    },

    {
        key: "quotation",
        status: "Quotation",
        label: "Quotation",
        className: "status-quotation"
    },

    {
        key: "second_appointment",
        status: "Second Appointment",
        label: "Second Appointment",
        className: "status-second-appointment"
    },

    {
        key: "deal",
        status: "Deal",
        label: "Deal",
        className: "status-deal"
    },

    {
        key: "no_deal",
        status: "No Deal",
        label: "No Deal",
        className: "status-no-deal"
    }
];


// ============================================================
// DASHBOARD STAT KEYS
// ============================================================

const DASHBOARD_STAT_KEYS = [

    "total",

    "new",

    "first_contact",

    "first_meeting",

    "quotation",

    "second_appointment",

    "deal",

    "no_deal"
];


// ============================================================
// ACTIVE STATUS VALUES
// ============================================================

const ACTIVE_STATUS_VALUES = [
    "Active",
    "active"
];


// ============================================================
// DATABASE TABLES
// ============================================================

const CRM_TABLES = {

    LEADS:
        "leads",

    SALES_USERS:
        "sales_users",

    ACTIVITIES:
        "activities"
};


// ============================================================
// SALES PROFILE COLUMN
// ============================================================
//
// IMPORTANT:
// Supabase menggunakan nama kolom:
// auth_user-id
//
// Karena nama kolom mengandung tanda "-",
// selalu gunakan string:
//
// "auth_user-id"
//
// Jangan gunakan:
// "auth_user_id"
// ============================================================

const SALES_PROFILE_AUTH_COLUMN =
    "auth_user-id";


// ============================================================
// LEADS FIELDS
// ============================================================

const LEAD_FIELDS = [

    "id",

    "customer_name",

    "phone",

    "business",

    "location",

    "status",

    "follow_up_date",

    "appointment",

    "site_survey",

    "quotation",

    "spk",

    "closing",

    "notes",

    "created_at",

    "sales_id",

    "created_by",

    "updated_by",

    "updated_at"
];


// ============================================================
// SALES USER FIELDS
// ============================================================

const SALES_USER_FIELDS = [

    "id",

    SALES_PROFILE_AUTH_COLUMN,

    "username",

    "name",

    "full_name",

    "email",

    "phone",

    "role",

    "status",

    "avatar_url",

    "created_at",

    "updated_at"
];


// ============================================================
// USER ROLES
// ============================================================

const USER_ROLES = {

    ADMIN:
        "admin",

    SALES:
        "sales"
};


// ============================================================
// CRM CONFIG
// ============================================================

const CRM_CONFIG = {

    appName:
        "FSI CRM",

    companyName:
        "FSI Consultant",

    version:
        "1.0.0",

    pageSize:
        100,

    searchDebounce:
        400,

    defaultPage:
        1,

    defaultSortColumn:
        "created_at",

    defaultSortDirection:
        "desc",

    supabaseUrl:
        SUPABASE_URL,

    tables:
        CRM_TABLES,

    profileAuthColumn:
        SALES_PROFILE_AUTH_COLUMN
};


// ============================================================
// GLOBAL FSI CRM NAMESPACE
// ============================================================

window.FSI_CRM = {

    // --------------------------------------------------------
    // VERSION / APP
    // --------------------------------------------------------

    version:
        CRM_CONFIG.version,

    appName:
        CRM_CONFIG.appName,

    companyName:
        CRM_CONFIG.companyName,


    // --------------------------------------------------------
    // SUPABASE
    // --------------------------------------------------------

    supabase:
        supabaseClient,

    supabaseUrl:
        SUPABASE_URL,


    // --------------------------------------------------------
    // DATABASE
    // --------------------------------------------------------

    tables:
        CRM_TABLES,

    leadFields:
        LEAD_FIELDS,

    salesUserFields:
        SALES_USER_FIELDS,

    salesProfileAuthColumn:
        SALES_PROFILE_AUTH_COLUMN,


    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    leadStatuses:
        LEAD_STATUSES,

    leadStatusLabels:
        LEAD_STATUS_LABELS,

    leadStatusClasses:
        LEAD_STATUS_CLASSES,

    pipelineStages:
        PIPELINE_STAGES,

    dashboardStatKeys:
        DASHBOARD_STAT_KEYS,

    activeStatusValues:
        ACTIVE_STATUS_VALUES,


    // --------------------------------------------------------
    // ROLES
    // --------------------------------------------------------

    roles:
        USER_ROLES,


    // --------------------------------------------------------
    // CONFIG
    // --------------------------------------------------------

    config:
        CRM_CONFIG
};


// ============================================================
// CONNECTION TEST
// ============================================================

async function testSupabaseConnection() {

    if (
        !supabaseClient
    ) {

        console.error(
            "FSI CRM: Supabase client tidak tersedia."
        );

        return false;
    }


    try {

        const {
            error
        } = await supabaseClient
            .from(CRM_TABLES.LEADS)
            .select("id")
            .limit(1);


        if (error) {

            console.error(
                "FSI CRM: Supabase connection test gagal:",
                error
            );

            return false;
        }


        console.log(
            "FSI CRM: Supabase connection OK."
        );

        return true;

    } catch (error) {

        console.error(
            "FSI CRM: Supabase connection exception:",
            error
        );

        return false;
    }
}


// ============================================================
// NORMALIZE ROLE
// ============================================================

function normalizeRole(role) {

    const value =
        String(role || "")
            .trim()
            .toLowerCase();


    if (
        value === "admin" ||
        value === "administrator" ||
        value === "owner"
    ) {

        return "admin";
    }


    if (
        value === "sales" ||
        value === "salesperson" ||
        value === "sales person"
    ) {

        return "sales";
    }


    return value || "sales";
}


// ============================================================
// NORMALIZE LEAD STATUS
// ============================================================
//
// Fungsi ini sekarang hanya mengenali 7 STATUS BARU.
//
// Status lama tetap bisa ditemukan di database lama,
// tetapi TIDAK akan dijadikan status baru.
// ============================================================

function normalizeLeadStatus(status) {

    const raw =
        String(status || "")
            .trim();


    if (!raw) {
        return "";
    }


    const normalized =
        raw.toLowerCase();


    const aliases = {

        // ----------------------------------------------------
        // NEW
        // ----------------------------------------------------

        "baru":
            "New",

        "new":
            "New",


        // ----------------------------------------------------
        // FIRST CONTACT
        // ----------------------------------------------------

        "first contact":
            "First Contact",

        "first-contact":
            "First Contact",

        "firstcontact":
            "First Contact",

        "kontak pertama":
            "First Contact",

        "contact pertama":
            "First Contact",

        "flyer":
            "First Contact",

        "flyer sent":
            "First Contact",

        "sudah kirim flyer":
            "First Contact",

        "sudah dikirim flyer":
            "First Contact",


        // ----------------------------------------------------
        // FIRST MEETING / APPOINTMENT / SITE SURVEY
        // ----------------------------------------------------

        "first meeting":
            "First Meeting / Appointment / Site Survey",

        "first meeting / appointment / site survey":
            "First Meeting / Appointment / Site Survey",

        "first-meeting":
            "First Meeting / Appointment / Site Survey",

        "firstmeeting":
            "First Meeting / Appointment / Site Survey",

        "meeting pertama":
            "First Meeting / Appointment / Site Survey",

        "interested":
            "First Meeting / Appointment / Site Survey",

        "tertarik":
            "First Meeting / Appointment / Site Survey",

        "appointment":
            "First Meeting / Appointment / Site Survey",

        "janji":
            "First Meeting / Appointment / Site Survey",

        "site survey":
            "First Meeting / Appointment / Site Survey",

        "site-survey":
            "First Meeting / Appointment / Site Survey",

        "survey":
            "First Meeting / Appointment / Site Survey",


        // ----------------------------------------------------
        // QUOTATION
        // ----------------------------------------------------

        "quotation":
            "Quotation",

        "quote":
            "Quotation",

        "penawaran":
            "Quotation",


        // ----------------------------------------------------
        // SECOND APPOINTMENT
        // ----------------------------------------------------

        "second appointment":
            "Second Appointment",

        "second-appointment":
            "Second Appointment",

        "secondappointment":
            "Second Appointment",

        "appointment kedua":
            "Second Appointment",

        "follow up":
            "Second Appointment",

        "follow-up":
            "Second Appointment",

        "followup":
            "Second Appointment",


        // ----------------------------------------------------
        // DEAL
        // ----------------------------------------------------

        "deal":
            "Deal",

        "closing":
            "Deal",

        "closed":
            "Deal",


        // ----------------------------------------------------
        // NO DEAL
        // ----------------------------------------------------

        "no deal":
            "No Deal",

        "no-deal":
            "No Deal",

        "nodeal":
            "No Deal",

        "tidak tertarik":
            "No Deal",

        "not interested":
            "No Deal",

        "tidak berminat":
            "No Deal"
    };


    if (
        aliases[normalized]
    ) {

        return aliases[normalized];
    }


    const exact =
        LEAD_STATUSES.find(
            item =>
                item.toLowerCase() ===
                normalized
        );


    return exact || raw;
}


// ============================================================
// CALCULATE TOTAL PAGES
// ============================================================

function calculateTotalPages(
    total,
    size = pageSize
) {

    const safeTotal =
        Math.max(
            0,
            Number(total) || 0
        );


    const safeSize =
        Math.max(
            1,
            Number(size) || 100
        );


    const pages =
        Math.ceil(
            safeTotal / safeSize
        );


    totalPages =
        Math.max(
            1,
            pages
        );


    return totalPages;
}


// ============================================================
// RESET PAGINATION
// ============================================================

function resetPagination() {

    currentPage =
        1;

    totalLeadsCount =
        0;

    totalPages =
        1;
}


// ============================================================
// RESET LEAD FILTERS
// ============================================================

function resetLeadFilters() {

    currentSearch =
        "";

    currentStatusFilter =
        "";

    currentBusinessFilter =
        "";

    currentLocationFilter =
        "";

    currentSalesFilter =
        "";

    currentSortColumn =
        "created_at";

    currentSortDirection =
        "desc";

    if (
        searchDebounceTimer
    ) {

        clearTimeout(
            searchDebounceTimer
        );

        searchDebounceTimer =
            null;
    }


    resetPagination();
}


// ============================================================
// RESET CRM STATE
// ============================================================

function resetCRMState() {

    leadsData =
        [];

    salesUsersData =
        [];

    currentCustomerId =
        null;

    currentCustomer =
        null;

    currentPage =
        1;

    pageSize =
        100;

    totalLeadsCount =
        0;

    totalPages =
        1;

    resetLeadFilters();

    editingLeadId =
        null;

    editingSalesId =
        null;


    currentUser =
        null;

    currentProfile =
        null;


    window.currentUser =
        null;

    window.currentProfile =
        null;

    window.crmCurrentCustomerId =
        null;

    window.crmCurrentCustomer =
        null;
}


// ============================================================
// GLOBAL FUNCTION EXPORTS
// ============================================================

window.testSupabaseConnection =
    testSupabaseConnection;


window.normalizeRole =
    normalizeRole;


window.normalizeLeadStatus =
    normalizeLeadStatus;


window.calculateTotalPages =
    calculateTotalPages;


window.resetPagination =
    resetPagination;


window.resetLeadFilters =
    resetLeadFilters;


window.resetCRMState =
    resetCRMState;


// ============================================================
// GLOBAL CONFIG EXPORTS
// ============================================================

window.LEAD_STATUSES =
    LEAD_STATUSES;

window.LEAD_STATUS_LABELS =
    LEAD_STATUS_LABELS;

window.LEAD_STATUS_CLASSES =
    LEAD_STATUS_CLASSES;

window.PIPELINE_STAGES =
    PIPELINE_STAGES;

window.DASHBOARD_STAT_KEYS =
    DASHBOARD_STAT_KEYS;

window.CRM_TABLES =
    CRM_TABLES;

window.LEAD_FIELDS =
    LEAD_FIELDS;

window.SALES_USER_FIELDS =
    SALES_USER_FIELDS;

window.USER_ROLES =
    USER_ROLES;

window.CRM_CONFIG =
    CRM_CONFIG;

window.SALES_PROFILE_AUTH_COLUMN =
    SALES_PROFILE_AUTH_COLUMN;


// ============================================================
// DEBUG INFORMATION
// ============================================================

console.log(
    "============================================"
);

console.log(
    "FSI CRM CONFIG LOADED"
);

console.log(
    "Supabase URL:",
    SUPABASE_URL
);

console.log(
    "Supabase Client:",
    !!supabaseClient
);

console.log(
    "Profile Auth Column:",
    SALES_PROFILE_AUTH_COLUMN
);

console.log(
    "Lead Page Size:",
    pageSize
);

console.log(
    "Lead Statuses:",
    LEAD_STATUSES
);

console.log(
    "============================================"
);
