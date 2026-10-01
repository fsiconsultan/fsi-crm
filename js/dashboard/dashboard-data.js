// ============================================================
// FSI CRM - DASHBOARD DATA
// ============================================================
// File : js/dashboard/dashboard-data.js
//
// Fungsi:
// 1. Mengambil seluruh data leads untuk Dashboard
// 2. Membatasi data Sales hanya ke leads miliknya
// 3. Normalisasi status
// 4. Helper perhitungan status
// 5. Helper perhitungan field aktivitas
//
// IMPORTANT:
// - Admin  : melihat seluruh leads
// - Sales  : hanya melihat leads dengan sales_id miliknya
// - Status mengikuti sistem CRM terbaru
// ============================================================


// ============================================================
// DASHBOARD BATCH SIZE
// ============================================================

if (
    typeof window.DASHBOARD_BATCH_SIZE === "undefined"
) {
    window.DASHBOARD_BATCH_SIZE = 1000;
}

const DASHBOARD_BATCH_SIZE =
    window.DASHBOARD_BATCH_SIZE;


// ============================================================
// GET SUPABASE CLIENT
// ============================================================

function dashboardGetSupabase() {

    if (
        typeof window.supabaseClient !== "undefined" &&
        window.supabaseClient
    ) {
        return window.supabaseClient;
    }

    if (
        typeof window.supabase !== "undefined" &&
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

function dashboardGetProfile() {

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


    if (
        window.currentProfile
    ) {
        return window.currentProfile;
    }


    if (
        window.currentUserProfile
    ) {
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
// ROLE CHECK
// ============================================================

function dashboardNormalizeRole(role) {

    return String(
        role || ""
    )
        .trim()
        .toLowerCase();
}


function dashboardIsAdmin() {

    const profile =
        dashboardGetProfile();

    if (!profile) {
        return false;
    }

    const role =
        dashboardNormalizeRole(
            profile.role
        );

    return (
        role === "admin" ||
        role === "owner"
    );
}


function dashboardIsSales() {

    const profile =
        dashboardGetProfile();

    if (!profile) {
        return false;
    }

    const role =
        dashboardNormalizeRole(
            profile.role
        );

    return role === "sales";
}


// ============================================================
// FETCH LEADS
// ============================================================

async function dashboardFetchLeads() {

    const client =
        dashboardGetSupabase();

    if (!client) {
        throw new Error(
            "Supabase client belum siap."
        );
    }


    const profile =
        dashboardGetProfile();

    if (!profile) {
        throw new Error(
            "Profile user belum siap."
        );
    }


    const isAdmin =
        dashboardIsAdmin();

    const isSales =
        dashboardIsSales();


    // --------------------------------------------------------
    // FETCH ONE BATCH
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
        // SALES ONLY SEES OWN LEADS
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


        const {
            data,
            error
        } = await query;


        if (error) {
            throw error;
        }


        return Array.isArray(data)
            ? data
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
            DASHBOARD_BATCH_SIZE -
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
            DASHBOARD_BATCH_SIZE
        ) {
            break;
        }


        start +=
            DASHBOARD_BATCH_SIZE;


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
// Status CRM terbaru:
//
// New
// First Contact
// First Meeting / Appointment / Site Survey
// Quotation
// Second Appointment
// Deal
// No Deal
//
// Legacy status tetap dikenali agar data lama tidak hilang.
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


    // --------------------------------------------------------
    // Gunakan normalizer utama apabila tersedia
    // --------------------------------------------------------

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
    // Local fallback
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
// COUNT NORMALIZED STATUS
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


            const currentStatus =
                dashboardNormalizeStatus(
                    item.status
                );


            return (
                currentStatus ===
                target
            );
        }
    ).length;
}


// ============================================================
// COUNT DATE / ACTIVITY FIELD
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


    if (
        !field
    ) {
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
// Mengikuti status CRM terbaru:
//
// Deal
//
// Field `closing` tetap dibaca sebagai fallback untuk data lama.
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


            // Status terbaru
            if (
                status === "Deal"
            ) {
                return true;
            }


            // Data lama
            if (
                status === "Closing"
            ) {
                return true;
            }


            // Fallback untuk data lama
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
// COUNT NEW
// ============================================================

function dashboardCountNew(
    list
) {

    return dashboardCountStatus(
        list,
        "New"
    );
}


// ============================================================
// COUNT FIRST CONTACT
// ============================================================

function dashboardCountFirstContact(
    list
) {

    return dashboardCountStatus(
        list,
        "First Contact"
    );
}


// ============================================================
// COUNT FIRST MEETING / APPOINTMENT
// ============================================================

function dashboardCountAppointment(
    list
) {

    return dashboardCountStatus(
        list,
        "First Meeting / Appointment / Site Survey"
    );
}


// ============================================================
// COUNT SECOND APPOINTMENT
// ============================================================

function dashboardCountSecondAppointment(
    list
) {

    return dashboardCountStatus(
        list,
        "Second Appointment"
    );
}


// ============================================================
// COUNT QUOTATION
// ============================================================

function dashboardCountQuotation(
    list
) {

    return dashboardCountStatus(
        list,
        "Quotation"
    );
}


// ============================================================
// COUNT DEAL
// ============================================================

function dashboardCountDeal(
    list
) {

    return dashboardCountStatus(
        list,
        "Deal"
    );
}


// ============================================================
// COUNT NO DEAL
// ============================================================

function dashboardCountNoDeal(
    list
) {

    return dashboardCountStatus(
        list,
        "No Deal"
    );
}


// ============================================================
// COUNT SITE SURVEY
// ============================================================
// Site Survey merupakan activity/date field,
// bukan status utama.
// ============================================================

function dashboardCountSiteSurvey(
    list
) {

    return dashboardCountDateField(
        list,
        "site_survey"
    );
}


// ============================================================
// COUNT FOLLOW UP
// ============================================================

function dashboardCountFollowUp(
    list
) {

    return dashboardCountDateField(
        list,
        "follow_up_date"
    );
}


// ============================================================
// COUNT APPOINTMENT FIELD
// ============================================================

function dashboardCountAppointmentField(
    list
) {

    return dashboardCountDateField(
        list,
        "appointment"
    );
}


// ============================================================
// COUNT QUOTATION FIELD
// ============================================================

function dashboardCountQuotationField(
    list
) {

    return dashboardCountDateField(
        list,
        "quotation"
    );
}


// ============================================================
// COUNT CLOSING FIELD
// ============================================================

function dashboardCountClosingField(
    list
) {

    return dashboardCountDateField(
        list,
        "closing"
    );
}


// ============================================================
// GET STATUS COUNTS
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
// EXPORT GLOBAL FUNCTIONS
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
