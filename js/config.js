// ============================================================
// FSI CRM - SUPABASE CONFIGURATION & GLOBAL STATE
// ============================================================
// File: js/config.js
//
// File ini hanya menangani:
// 1. Koneksi Supabase
// 2. Global state CRM
// 3. Pagination
// 4. Status lead
// 5. Konstanta aplikasi
//
// Jangan letakkan logic login, dashboard, leads, atau sales
// di file ini.
// ============================================================


// ============================================================
// SUPABASE CONFIGURATION
// ============================================================

const SUPABASE_URL =
    "https://yoyszukutqwoxxdolzcg.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_QcPULwc5-Axry0HRzfmq1A_CeXgiAHL";


// ============================================================
// CREATE SUPABASE CLIENT
// ============================================================

let supabaseClient = null;

try {

    if (
        typeof window.supabase === "undefined"
    ) {

        console.error(
            "FSI CRM ERROR: Supabase library belum dimuat."
        );

    } else {

        supabaseClient =
            window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_PUBLISHABLE_KEY
            );

        console.log(
            "FSI CRM: Supabase client berhasil dibuat."
        );
    }

} catch (error) {

    console.error(
        "FSI CRM: Gagal membuat Supabase client.",
        error
    );
}


// ============================================================
// GLOBAL USER STATE
// ============================================================

let currentUser = null;

let currentProfile = null;


// ============================================================
// GLOBAL CRM DATA
// ============================================================

// Data lead yang sedang ditampilkan
let leadsData = [];


// Data seluruh sales untuk lookup / assignment
let salesUsersData = [];


// ============================================================
// CURRENT CUSTOMER STATE
// ============================================================

// Customer yang sedang dibuka pada halaman detail
let currentCustomerId = null;

let currentCustomer = null;


// Simpan juga ke window agar bisa diakses file lain
window.crmCurrentCustomerId = null;

window.crmCurrentCustomer = null;


// ============================================================
// PAGINATION STATE
// ============================================================

let currentPage = 1;


// Jumlah data per halaman
const pageSize = 20;


// Total seluruh lead
let totalLeadsCount = 0;


// Total halaman
let totalPages = 1;


// ============================================================
// SEARCH STATE
// ============================================================

let currentSearchTerm = "";


// ============================================================
// FILTER STATE
// ============================================================

let currentStatusFilter = "";

let currentBusinessFilter = "";

let currentLocationFilter = "";

let currentSalesFilter = "";


// ============================================================
// SORT STATE
// ============================================================

let currentSortColumn = "created_at";

let currentSortAscending = false;


// ============================================================
// DEBOUNCE STATE
// ============================================================

let searchDebounceTimer = null;


// ============================================================
// EDITING STATE
// ============================================================

// ID lead yang sedang diedit
let editingLeadId = null;


// ID sales yang sedang diedit
let editingSalesId = null;


// ============================================================
// CRM LEAD STATUSES
// ============================================================
//
// Gunakan status ini secara konsisten di seluruh CRM.
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
// STATUS LABEL INDONESIA
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
// STATUS CSS CLASS
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
// PIPELINE ORDER
// ============================================================

const PIPELINE_STAGES = [

    {
        key: "New",
        label: "New",
        icon: "user-plus"
    },

    {
        key: "Flyer Sent",
        label: "Flyer Sent",
        icon: "send"
    },

    {
        key: "Interested",
        label: "Interested",
        icon: "heart"
    },

    {
        key: "Follow Up",
        label: "Follow Up",
        icon: "phone-call"
    },

    {
        key: "Appointment",
        label: "Appointment",
        icon: "calendar"
    },

    {
        key: "Site Survey",
        label: "Site Survey",
        icon: "map-pin"
    },

    {
        key: "Quotation",
        label: "Quotation",
        icon: "file-text"
    },

    {
        key: "Closing",
        label: "Closing",
        icon: "check-circle"
    }

];


// ============================================================
// DASHBOARD STATISTIC IDS
// ============================================================

const DASHBOARD_STAT_KEYS = [

    "total",

    "new",

    "interested",

    "follow_up",

    "appointment",

    "site_survey",

    "quotation",

    "closing"

];


// ============================================================
// CRM TABLE CONFIGURATION
// ============================================================

const CRM_TABLES = {

    leads:
        "leads",

    sales:
        "sales_users",

    activities:
        "activities"
};


// ============================================================
// LEAD DATABASE FIELDS
// ============================================================
//
// Nama field mengikuti struktur database CRM yang sudah kita
// sepakati.
// ============================================================

const LEAD_FIELDS = {

    id:
        "id",

    customerName:
        "customer_name",

    phone:
        "phone",

    business:
        "business",

    location:
        "location",

    status:
        "status",

    followUpDate:
        "follow_up_date",

    appointment:
        "appointment",

    siteSurvey:
        "site_survey",

    quotation:
        "quotation",

    spk:
        "spk",

    closing:
        "closing",

    notes:
        "notes",

    salesId:
        "sales_id",

    createdBy:
        "created_by",

    updatedBy:
        "updated_by",

    createdAt:
        "created_at",

    updatedAt:
        "updated_at"
};


// ============================================================
// SALES USER FIELDS
// ============================================================

const SALES_FIELDS = {

    id:
        "id",

    authUserId:
        "auth_user_id",

    username:
        "username",

    name:
        "name",

    fullName:
        "full_name",

    email:
        "email",

    phone:
        "phone",

    role:
        "role",

    status:
        "status",

    avatarUrl:
        "avatar_url",

    createdAt:
        "created_at"
};


// ============================================================
// USER ROLES
// ============================================================

const USER_ROLES = {

    ADMIN:
        "Admin",

    SALES:
        "Sales",

    OWNER:
        "Owner"
};


// ============================================================
// ACTIVE STATUS VALUES
// ============================================================

const ACTIVE_STATUS_VALUES = [

    "Active",

    "active",

    "ACTIVE"

];


// ============================================================
// APPLICATION SETTINGS
// ============================================================

const CRM_CONFIG = {

    appName:
        "FSI CRM",

    companyName:
        "FSI Consultant",

    pageSize:
        pageSize,

    searchDebounce:
        400,

    dateLocale:
        "id-ID",

    currency:
        "IDR"

};


// ============================================================
// MAKE IMPORTANT VALUES AVAILABLE GLOBALLY
// ============================================================
//
// Beberapa file JS mungkin membutuhkan akses melalui window.
// ============================================================

window.FSI_CRM = {

    SUPABASE_URL,

    SUPABASE_PUBLISHABLE_KEY,

    CRM_CONFIG,

    CRM_TABLES,

    LEAD_FIELDS,

    SALES_FIELDS,

    LEAD_STATUSES,

    LEAD_STATUS_LABELS,

    LEAD_STATUS_CLASSES,

    PIPELINE_STAGES,

    USER_ROLES

};


// ============================================================
// SUPABASE CONNECTION TEST
// ============================================================

async function testSupabaseConnection() {

    if (!supabaseClient) {

        console.error(
            "FSI CRM: supabaseClient tidak tersedia."
        );

        return false;
    }


    try {

        // Kita hanya memastikan client bisa melakukan
        // request. Query ringan terhadap sales_users.
        const {
            error
        } = await supabaseClient
            .from("sales_users")
            .select("id")
            .limit(1);


        if (error) {

            console.error(
                "FSI CRM: Supabase connection error:",
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
            "FSI CRM: Supabase connection test failed:",
            error
        );

        return false;
    }
}


// ============================================================
// NORMALIZE ROLE
// ============================================================

function normalizeRole(role) {

    if (!role) {
        return "";
    }


    const value =
        String(role)
            .trim()
            .toLowerCase();


    if (
        value === "admin" ||
        value === "administrator" ||
        value === "owner"
    ) {

        return "Admin";
    }


    if (
        value === "sales" ||
        value === "salesperson" ||
        value === "sales person"
    ) {

        return "Sales";
    }


    return String(role).trim();
}


// ============================================================
// NORMALIZE LEAD STATUS
// ============================================================

function normalizeLeadStatus(status) {

    if (!status) {
        return "New";
    }


    const value =
        String(status)
            .trim()
            .toLowerCase();


    const matchingStatus =
        LEAD_STATUSES.find(
            item =>
                item.toLowerCase() === value
        );


    return matchingStatus || "New";
}


// ============================================================
// CALCULATE TOTAL PAGES
// ============================================================

function calculateTotalPages(total) {

    const count =
        Number(total) || 0;


    totalPages =
        Math.max(
            1,
            Math.ceil(
                count / pageSize
            )
        );


    return totalPages;
}


// ============================================================
// RESET PAGINATION
// ============================================================

function resetPagination() {

    currentPage = 1;

    totalLeadsCount = 0;

    totalPages = 1;
}


// ============================================================
// RESET LEAD FILTERS
// ============================================================

function resetLeadFilters() {

    currentSearchTerm = "";

    currentStatusFilter = "";

    currentBusinessFilter = "";

    currentLocationFilter = "";

    currentSalesFilter = "";

    currentPage = 1;
}


// ============================================================
// RESET CRM STATE
// ============================================================

function resetCRMState() {

    currentUser = null;

    currentProfile = null;

    leadsData = [];

    salesUsersData = [];

    currentCustomerId = null;

    currentCustomer = null;

    currentPage = 1;

    totalLeadsCount = 0;

    totalPages = 1;

    currentSearchTerm = "";

    currentStatusFilter = "";

    currentBusinessFilter = "";

    currentLocationFilter = "";

    currentSalesFilter = "";

    currentSortColumn = "created_at";

    currentSortAscending = false;

    editingLeadId = null;

    editingSalesId = null;


    window.crmCurrentCustomerId =
        null;

    window.crmCurrentCustomer =
        null;
}


// ============================================================
// INITIALIZATION LOG
// ============================================================
//
// Jangan panggil checkSession() dari config.js.
//
// auth.js yang bertanggung jawab untuk authentication.
// Ini penting supaya tidak terjadi:
// config.js -> checkSession()
// auth.js -> checkSession()
// yang menyebabkan proses auth berjalan dua kali.
// ============================================================

console.log(
    "=================================================="
);

console.log(
    "FSI CRM CONFIG LOADED"
);

console.log(
    "Supabase URL:",
    SUPABASE_URL
);

console.log(
    "Page Size:",
    pageSize
);

console.log(
    "Lead Statuses:",
    LEAD_STATUSES
);

console.log(
    "=================================================="
);
