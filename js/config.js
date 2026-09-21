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
//
// Jangan menggunakan:
// var currentUser
// var currentProfile
//
// File auth.js menggunakan state ini.
//

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

let pageSize = 20;

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

const LEAD_STATUSES = [
    "New",
    "Flyer Sent",
    "Interested",
    "Follow Up",
    "Appointment",
    "Site Survey",
    "Quotation",
    "Closing",
    "Not Interested"
];


// ============================================================
// STATUS LABELS
// ============================================================

const LEAD_STATUS_LABELS = {

    "New":
        "New",

    "Flyer Sent":
        "Flyer Sent",

    "Interested":
        "Interested",

    "Follow Up":
        "Follow Up",

    "Appointment":
        "Appointment",

    "Site Survey":
        "Site Survey",

    "Quotation":
        "Quotation",

    "Closing":
        "Closing",

    "Not Interested":
        "Not Interested"
};


// ============================================================
// STATUS CSS CLASSES
// ============================================================

const LEAD_STATUS_CLASSES = {

    "New":
        "status-new",

    "Flyer Sent":
        "status-flyer",

    "Interested":
        "status-interested",

    "Follow Up":
        "status-follow-up",

    "Appointment":
        "status-appointment",

    "Site Survey":
        "status-site-survey",

    "Quotation":
        "status-quotation",

    "Closing":
        "status-closing",

    "Not Interested":
        "status-not-interested"
};


// ============================================================
// PIPELINE STAGES
// ============================================================
//
// SPK bukan status lead.
// SPK adalah milestone / field.
//
// Jadi SPK TIDAK dimasukkan ke LEAD_STATUSES.
//

const PIPELINE_STAGES = [

    {
        key: "new",
        status: "New",
        label: "New",
        className: "status-new"
    },

    {
        key: "flyer_sent",
        status: "Flyer Sent",
        label: "Flyer Sent",
        className: "status-flyer"
    },

    {
        key: "interested",
        status: "Interested",
        label: "Interested",
        className: "status-interested"
    },

    {
        key: "follow_up",
        status: "Follow Up",
        label: "Follow Up",
        className: "status-follow-up"
    },

    {
        key: "appointment",
        status: "Appointment",
        label: "Appointment",
        className: "status-appointment"
    },

    {
        key: "site_survey",
        status: "Site Survey",
        label: "Site Survey",
        className: "status-site-survey"
    },

    {
        key: "quotation",
        status: "Quotation",
        label: "Quotation",
        className: "status-quotation"
    },

    {
        key: "closing",
        status: "Closing",
        label: "Closing",
        className: "status-closing"
    },

    {
        key: "not_interested",
        status: "Not Interested",
        label: "Not Interested",
        className: "status-not-interested"
    }
];


// ============================================================
// DASHBOARD STAT KEYS
// ============================================================

const DASHBOARD_STAT_KEYS = [

    "total",

    "new",

    "flyer_sent",

    "interested",

    "follow_up",

    "appointment",

    "site_survey",

    "quotation",

    "spk",

    "closing",

    "not_interested"
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
        20,

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

        "baru":
            "New",

        "new":
            "New",


        "flyer":
            "Flyer Sent",

        "flyer sent":
            "Flyer Sent",

        "sudah kirim flyer":
            "Flyer Sent",

        "sudah dikirim flyer":
            "Flyer Sent",


        "tertarik":
            "Interested",

        "interested":
            "Interested",


        "follow up":
            "Follow Up",

        "follow-up":
            "Follow Up",

        "followup":
            "Follow Up",


        "appointment":
            "Appointment",

        "janji":
            "Appointment",


        "site survey":
            "Site Survey",

        "site-survey":
            "Site Survey",

        "survey":
            "Site Survey",


        "quotation":
            "Quotation",

        "quote":
            "Quotation",

        "penawaran":
            "Quotation",


        "closing":
            "Closing",

        "closed":
            "Closing",


        "tidak tertarik":
            "Not Interested",

        "not interested":
            "Not Interested",

        "tidak berminat":
            "Not Interested"
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
            Number(size) || 20
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
        20;

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
