// ================================
// CRM FSI - SUPABASE CONFIG
// ================================

const SUPABASE_URL =
  "https://yoyszukutqwoxxdolzcg.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_QcPULwc5-Axry0HRzfmq1A_CeXgiAHL";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );


// ================================
// GLOBAL APP STATE
// ================================

let currentUser;
let currentProfile;
let leadsData;
let salesUsersData;

let currentPage = 1;
let pageSize = 20;
let totalLeadsCount = 0;


// ================================
// LEAD STATUS
// ================================

const LEAD_STATUSES = [
  "New",
  "Flyer Sent",
  "Interested",
  "Follow Up",
  "Closing",
  "Not Interested"
];


// ================================
// CUSTOMER PIPELINE
// ================================

const CUSTOMER_PIPELINE = [
  {
    key: "new",
    field: null,
    status: "New",
    label: "Lead",
    icon: "sparkles"
  },
  {
    key: "flyer",
    field: null,
    status: "Flyer Sent",
    label: "Flyer Sent",
    icon: "send"
  },
  {
    key: "interested",
    field: null,
    status: "Interested",
    label: "Interested",
    icon: "heart"
  },
  {
    key: "followup",
    field: "follow_up_date",
    status: "Follow Up",
    label: "Follow Up",
    icon: "phone-call"
  },
  {
    key: "appointment",
    field: "appointment",
    status: null,
    label: "Appointment",
    icon: "calendar-days"
  },
  {
    key: "survey",
    field: "site_survey",
    status: null,
    label: "Site Survey",
    icon: "map-pin"
  },
  {
    key: "quotation",
    field: "quotation",
    status: null,
    label: "Quotation",
    icon: "file-text"
  },
  {
    key: "spk",
    field: "spk",
    status: null,
    label: "SPK",
    icon: "file-check"
  },
  {
    key: "closing",
    field: "closing",
    status: "Closing",
    label: "Closing",
    icon: "badge-check"
  }
];


// ================================
// ACTIVE CUSTOMER PIPELINE STEP
// ================================

let crmActivePipelineStep = "new";
