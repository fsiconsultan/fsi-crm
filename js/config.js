/* FSI CRM - Supabase configuration */

const SUPABASE_URL = "https://yoyszukutqwoxxdolzcg.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_QcPULwc5-Axry0HRzfmq1A_CeXgiAHL";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const CRM_CONFIG = {
  pageSize: 20,

  statuses: [
    "New",
    "Flyer Sent",
    "Interested",
    "Follow Up",
    "Closing",
    "Not Interested"
  ],

  leadTable: "leads",

  salesTable: "sales_users",

  salesCreateFunction: "create-sales"
};

let currentUser = null;
let currentProfile = null;

let leadsData = [];
let salesUsersData = [];

let currentPage = 1;
let totalLeadsCount = 0;

let selectedCustomerId = null;
