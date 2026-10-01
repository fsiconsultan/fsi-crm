// ============================================================
// FSI CRM - DASHBOARD DATA
// ============================================================
// File : js/dashboard/dashboard-data.js
//
// Fungsi:
// 1. Mengambil data leads untuk Dashboard
// 2. Admin  -> semua leads
// 3. Sales  -> hanya leads miliknya
// 4. Normalisasi status
// 5. Helper perhitungan Dashboard
//
// IMPORTANT:
// Jangan membuat const global DASHBOARD_BATCH_SIZE.
// File lain mungkin sudah menggunakan nama tersebut.
// ============================================================


// ============================================================
// DASHBOARD BATCH SIZE
// ============================================================

if (
    typeof window.DASHBOARD_BATCH_SIZE !== "number"
) {
    window.DASHBOARD_BATCH_SIZE = 1000;
}


// ============================================================
// GET SUPABASE CLIENT
// ============================================================

function dashboardDataGetSupabase() {

    if (
        window.supabaseClient &&
        typeof window.supabaseClient.from === "function"
    ) {
        return window.supabaseClient;
    }

    if (
        window.supabase &&
        typeof window.supabase.from === "function"
    ) {
        return window.supabase;
    }

    return null;
}


// ============================================================
// GET CURRENT PROFILE
// ============================================================

function dashboardDataGetProfile() {

    if (
        typeof window.getCurrentProfile === "function"
    ) {
        const profile =
            window.getCurrentProfile();

        if (profile) {
            return profile;
        }
    }


    if (
        typeof window.getCurrentUserProfile === "function"
    ) {
        const profile =
            window.getCurrentUserProfile();

        if (profile) {
            return profile;
        }
    }


    if (window.currentProfile) {
        return window.currentProfile;
    }


    if (window.currentUserProfile) {
        return window.currentUserProfile;
    }


    if (
        window.FSICRM &&
        window.FSICRM.currentProfile
    ) {
        return window.FSICRM.currentProfile;
    }


    return null;
}


// ============================================================
// ROLE NORMALIZER
// ============================================================

function dashboardDataNormalizeRole(role) {

    return String(
        role || ""
    )
        .trim()
        .toLowerCase();
}


// ============================================================
// IS ADMIN
// ============================================================

function dashboardDataIsAdmin() {

    const profile =
        dashboardDataGetProfile();

    if (!profile) {
        return false;
    }


    const role =
        dashboardDataNormalizeRole(
            profile.role
        );


    return (
        role === "admin" ||
        role === "owner"
    );
}


// ============================================================
// IS SALES
// ============================================================

function dashboardDataIsSales() {

    const profile =
        dashboardDataGetProfile();

    if (!profile) {
        return false;
    }


    const role =
        dashboardDataNormalizeRole(
            profile.role
        );


    return role === "sales";
}


// ============================================================
// FETCH DASHBOARD LEADS
// ============================================================

async function dashboardFetchLeads() {

    const client =
        dashboardDataGetSupabase();


    if (!client) {
        throw new Error(
            "Supabase client belum siap."
        );
    }


    const profile =
        dashboardDataGetProfile();


    if (!profile) {
        throw new Error(
            "Profile user belum siap."
        );
    }


    const isAdmin =
        dashboardDataIsAdmin();


    const isSales =
        dashboardDataIsSales();


    // --------------------------------------------------------
    // FETCH BATCH
    // --------------------------------------------------------

    async function fetchBatch(
        from,
        to
    ) {

        let query =
            client
                .from("leads")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                )
                .range(
                    from,
                    to
                );


        // ----------------------------------------------------
        // SALES ONLY
        // ----------------------------------------------------

        if (
            isSales &&
            !isAdmin
        ) {

            if (!profile.id) {

                throw new Error(
                    "ID profile Sales tidak ditemukan."
                );
            }


            query =
                query.eq(
                    "sales_id",
                    profile.id
                );
        }


        const result =
            await query;


        if (result.error) {
            throw result.error;
        }


        return Array.isArray(result.data)
            ? result.data
            : [];
    }


    // --------------------------------------------------------
    // LOAD ALL BATCHES
    // --------------------------------------------------------

    const allLeads = [];

    let start = 0;


    while (true) {

        const end =
            start +
            window.DASHBOARD_BATCH_SIZE -
            1;


        const batch =
            await fetchBatch(
                start,
                end
            );


        if (!batch.length) {
            break;
        }


        allLeads.push(
            ...batch
        );


        if (
            batch.length <
            window.DASHBOARD_BATCH_SIZE
        ) {
            break;
        }


        start +=
            window.DASHBOARD_BATCH_SIZE;


        // Safety limit
        if (
            start > 1000000
        ) {

            console.warn(
                "FSI CRM: Dashboard berhenti setelah membaca 1.000.000 leads."
            );

            break;
        }
    }


    console.log(
        "FSI CRM Dashboard: leads berhasil dimuat:",
        allLeads.length,
        {
            role: profile.role,
            profileId: profile.id,
            admin: isAdmin,
            sales: isSales
        }
    );


    return allLeads;
}


// ============================================================
// NORMALIZE STATUS
// ============================================================

function dashboardNormalizeStatus(
    status
) {

    const raw =
        String(
            status || ""
        )
            .trim();


    if (!raw) {
        return "";
    }


    // Gunakan normalizer utama CRM jika tersedia
    if (
        typeof window.normalizeLeadStatus ===
        "function"
    ) {

        const normalized =
            window.normalizeLeadStatus(
                raw
            );


        if (
            normalized !== undefined &&
            normalized !== null &&
            String(normalized).trim() !== ""
        ) {

            return String(
                normalized
            ).trim();
        }
    }


    // --------------------------------------------------------
    // FALLBACK NORMALIZER
    // --------------------------------------------------------

    const key =
        raw
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();


    switch (key) {

        case "new":
        case "new customer":
            return "New";


        case "first contact":
        case "interested":
            return "First Contact";


        case "first meeting":
        case "appointment":
        case "site survey":
        case "first meeting / appointment / site survey":
        case "first meeting/appointment/site survey":
        case "follow up":
        case "follow-up":
            return "First Meeting / Appointment / Site Survey";


        case "second appointment":
        case "2nd appointment":
            return "Second Appointment";


        case "quotation":
            return "Quotation";


        case "deal":
        case "closing":
        case "deal / closing":
        case "deal/closing":
        case "spk":
            return "Deal";


        case "no deal":
        case "not interested":
            return "No Deal";


        default:
            return raw;
    }
}


// ============================================================
// HAS VALUE
// ============================================================

function dashboardHasValue(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {
        return false;
    }


    if (
        typeof value === "string"
    ) {

        return (
            value.trim() !== ""
        );
    }


    return true;
}


// ============================================================
// COUNT STATUS
// ============================================================

function dashboardCountStatus(
    list,
    status
) {

    if (
        !Array.isArray(list)
    ) {
        return 0;
    }


    const target =
        dashboardNormalizeStatus(
            status
        );


    return list.filter(
        item => {

            if (!item) {
                return false;
            }


            return (
                dashboardNormalizeStatus(
                    item.status
                ) === target
            );
        }
    ).length;
}


// ============================================================
// COUNT DATE FIELD
// ============================================================

function dashboardCountDateField(
    list,
    field
) {

    if (
        !Array.isArray(list)
    ) {
        return 0;
    }


    if (!field) {
        return 0;
    }


    return list.filter(
        item => {

            if (!item) {
                return false;
            }


            return dashboardHasValue(
                item[field]
            );
        }
    ).length;
}


// ============================================================
// COUNT CLOSING / DEAL
// ============================================================

function dashboardCountClosing(
    list
) {

    if (
        !Array.isArray(list)
    ) {
        return 0;
    }


    return list.filter(
        item => {

            if (!item) {
                return false;
            }


            const status =
                dashboardNormalizeStatus(
                    item.status
                );


            // Status CRM terbaru
            if (
                status === "Deal"
            ) {
                return true;
            }


            // Legacy
            if (
                status === "Closing"
            ) {
                return true;
            }


            // Legacy field
            if (
                dashboardHasValue(
                    item.closing
                )
            ) {
                return true;
            }


            return false;
        }
    ).length;
}


// ============================================================
// STATUS COUNTERS
// ============================================================

function dashboardCountNew(list) {

    return dashboardCountStatus(
        list,
        "New"
    );
}


function dashboardCountFirstContact(list) {

    return dashboardCountStatus(
        list,
        "First Contact"
    );
}


function dashboardCountAppointment(list) {

    return dashboardCountStatus(
        list,
        "First Meeting / Appointment / Site Survey"
    );
}


function dashboardCountSecondAppointment(list) {

    return dashboardCountStatus(
        list,
        "Second Appointment"
    );
}


function dashboardCountQuotation(list) {

    return dashboardCountStatus(
        list,
        "Quotation"
    );
}


function dashboardCountDeal(list) {

    return dashboardCountStatus(
        list,
        "Deal"
    );
}


function dashboardCountNoDeal(list) {

    return dashboardCountStatus(
        list,
        "No Deal"
    );
}


// ============================================================
// ACTIVITY COUNTERS
// ============================================================

function dashboardCountSiteSurvey(list) {

    return dashboardCountDateField(
        list,
        "site_survey"
    );
}


function dashboardCountFollowUp(list) {

    return dashboardCountDateField(
        list,
        "follow_up_date"
    );
}


function dashboardCountAppointmentField(list) {

    return dashboardCountDateField(
        list,
        "appointment"
    );
}


function dashboardCountQuotationField(list) {

    return dashboardCountDateField(
        list,
        "quotation"
    );
}


function dashboardCountClosingField(list) {

    return dashboardCountDateField(
        list,
        "closing"
    );
}


// ============================================================
// GET ALL STATUS COUNTS
// ============================================================

function dashboardGetStatusCounts(
    list
) {

    const leads =
        Array.isArray(list)
            ? list
            : [];


    return {

        total:
            leads.length,

        new:
            dashboardCountNew(
                leads
            ),

        firstContact:
            dashboardCountFirstContact(
                leads
            ),

        appointment:
            dashboardCountAppointment(
                leads
            ),

        secondAppointment:
            dashboardCountSecondAppointment(
                leads
            ),

        quotation:
            dashboardCountQuotation(
                leads
            ),

        deal:
            dashboardCountDeal(
                leads
            ),

        closing:
            dashboardCountClosing(
                leads
            ),

        noDeal:
            dashboardCountNoDeal(
                leads
            ),

        siteSurvey:
            dashboardCountSiteSurvey(
                leads
            ),

        followUp:
            dashboardCountFollowUp(
                leads
            )
    };
}


// ============================================================
// GLOBAL EXPORTS
// ============================================================

window.dashboardFetchLeads =
    dashboardFetchLeads;


window.dashboardNormalizeStatus =
    dashboardNormalizeStatus;


window.dashboardHasValue =
    dashboardHasValue;


window.dashboardCountStatus =
    dashboardCountStatus;


window.dashboardCountDateField =
    dashboardCountDateField;


window.dashboardCountClosing =
    dashboardCountClosing;


window.dashboardCountNew =
    dashboardCountNew;


window.dashboardCountFirstContact =
    dashboardCountFirstContact;


window.dashboardCountAppointment =
    dashboardCountAppointment;


window.dashboardCountSecondAppointment =
    dashboardCountSecondAppointment;


window.dashboardCountQuotation =
    dashboardCountQuotation;


window.dashboardCountDeal =
    dashboardCountDeal;


window.dashboardCountNoDeal =
    dashboardCountNoDeal;


window.dashboardCountSiteSurvey =
    dashboardCountSiteSurvey;


window.dashboardCountFollowUp =
    dashboardCountFollowUp;


window.dashboardCountAppointmentField =
    dashboardCountAppointmentField;


window.dashboardCountQuotationField =
    dashboardCountQuotationField;


window.dashboardCountClosingField =
    dashboardCountClosingField;


window.dashboardGetStatusCounts =
    dashboardGetStatusCounts;


// ============================================================
// FSI DASHBOARD DATA NAMESPACE
// ============================================================

window.FSIDashboardData =
    window.FSIDashboardData ||
    {};


window.FSIDashboardData.fetchLeads =
    dashboardFetchLeads;


window.FSIDashboardData.normalizeStatus =
    dashboardNormalizeStatus;


window.FSIDashboardData.countStatus =
    dashboardCountStatus;


window.FSIDashboardData.countClosing =
    dashboardCountClosing;


window.FSIDashboardData.getStatusCounts =
    dashboardGetStatusCounts;


// ============================================================
// READY LOG
// ============================================================

console.log(
    "FSI CRM: dashboard-data.js berhasil dimuat."
);
