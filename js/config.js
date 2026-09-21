```javascript
// ================================
// CRM FSI SUPABASE CONFIG & GLOBALS
// ================================
const SUPABASE_URL = `https://yoyszukutqwoxxdolzcg.supabase.co`;
const SUPABASE_PUBLISHABLE_KEY = `sb_publishable_QcPULwc5-Axry0HRzfmq1A_CeXgiAHL`;
const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

// GLOBAL STATE
let currentUser = null;
let currentProfile = null;
let leadsData = [];
let salesUsersData = [];

// PAGINATION STATE
let currentPage = 1;
const pageSize = 20;
let totalLeadsCount = 0;

// CRM STATUSES
const LEAD_STATUSES = [
    "New",
    "Flyer Sent",
    "Interested",
    "Follow Up",
    "Closing",
    "Not Interested"
];

// APP INIT
document.addEventListener("DOMContentLoaded", async () => {
    console.log("CRM FSI started");
    if (typeof setupModalEvents === "function") setupModalEvents();
    if (typeof setupEnglishStatusOptions === "function") setupEnglishStatusOptions();
    if (typeof checkSession === "function") await checkSession();
});
```
