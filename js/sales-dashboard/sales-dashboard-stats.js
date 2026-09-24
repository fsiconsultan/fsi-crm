/* =========================================================
   FSI CRM - SALES DASHBOARD STATS
   ---------------------------------------------------------
   Menghitung statistik leads untuk Sales Dashboard.

   Status CRM:
   1. New
   2. First Contact
   3. First Meeting / Appointment / Site Survey
   4. Quotation
   5. Second Appointment
   6. Deal
   7. No Deal

   File ini hanya menghitung data.
   Tidak mengubah database.
   ========================================================= */


/* =========================================================
   NORMALIZE STATUS
   ---------------------------------------------------------
   Menggunakan normalizeLeadStatus() dari CRM utama
   jika fungsi tersebut sudah tersedia.

   Jika belum tersedia, digunakan normalisasi lokal.
   ========================================================= */

function normalizeSalesDashboardStatus(status) {

    if (
        typeof window.normalizeLeadStatus ===
        "function"
    ) {
        return window.normalizeLeadStatus(status);
    }

    const value = String(status || "")
        .trim()
        .toLowerCase();

    switch (value) {

        case "new":
        case "baru":
            return "New";

        case "flyer sent":
        case "flyer":
        case "first contact":
            return "First Contact";

        case "interested":
        case "appointment":
        case "site survey":
        case "first meeting":
        case "first meeting / appointment / site survey":
            return "First Meeting / Appointment / Site Survey";

        case "quotation":
        case "quote":
        case "penawaran":
            return "Quotation";

        case "follow up":
        case "follow-up":
        case "second appointment":
            return "Second Appointment";

        case "closing":
        case "closed":
        case "deal":
            return "Deal";

        case "not interested":
        case "no deal":
            return "No Deal";

        default:
            return String(status || "").trim();
    }
}


/* =========================================================
   CREATE EMPTY STATS
   ========================================================= */

function createEmptySalesDashboardStats() {

    return {
        total: 0,

        new: 0,

        first_contact: 0,

        first_meeting: 0,

        quotation: 0,

        second_appointment: 0,

        deal: 0,

        no_deal: 0
    };
}


/* =========================================================
   CALCULATE STATS
   ========================================================= */

window.calculateSalesDashboardStats = function (
    leads
) {

    const stats =
        createEmptySalesDashboardStats();

    if (!Array.isArray(leads)) {
        return stats;
    }

    /*
     * Total Leads
     */

    stats.total = leads.length;


    /*
     * Hitung setiap status.
     */

    leads.forEach(function (lead) {

        const status =
            normalizeSalesDashboardStatus(
                lead?.status
            );

        switch (status) {

            case "New":

                stats.new++;

                break;


            case "First Contact":

                stats.first_contact++;

                break;


            case "First Meeting / Appointment / Site Survey":

                stats.first_meeting++;

                break;


            case "Quotation":

                stats.quotation++;

                break;


            case "Second Appointment":

                stats.second_appointment++;

                break;


            case "Deal":

                stats.deal++;

                break;


            case "No Deal":

                stats.no_deal++;

                break;


            default:

                /*
                 * Status yang tidak dikenal tidak dimasukkan
                 * ke statistik pipeline.
                 */

                break;
        }
    });


    return stats;
};


/* =========================================================
   UPDATE STATE STATS
   ========================================================= */

window.updateSalesDashboardStats = function (
    leads
) {

    const stats =
        window.calculateSalesDashboardStats(
            leads
        );

    if (
        typeof window.setSalesDashboardStats ===
        "function"
    ) {
        window.setSalesDashboardStats(
            stats
        );
    }

    return stats;
};


/* =========================================================
   CALCULATE STATS FROM CURRENT STATE
   ========================================================= */

window.calculateCurrentSalesDashboardStats =
    function () {

        if (
            typeof window.getSalesDashboardState !==
            "function"
        ) {
            return createEmptySalesDashboardStats();
        }

        const state =
            window.getSalesDashboardState();

        const stats =
            window.calculateSalesDashboardStats(
                state?.leads || []
            );

        if (
            typeof window.setSalesDashboardStats ===
            "function"
        ) {
            window.setSalesDashboardStats(
                stats
            );
        }

        return stats;
    };


/* =========================================================
   GET STAT BY KEY
   ========================================================= */

window.getSalesDashboardStat = function (
    key
) {

    if (
        typeof window.getSalesDashboardState !==
        "function"
    ) {
        return 0;
    }

    const state =
        window.getSalesDashboardState();

    return Number(
        state?.stats?.[key] || 0
    );
};


/* =========================================================
   GET ALL STATS
   ========================================================= */

window.getSalesDashboardStats = function () {

    if (
        typeof window.getSalesDashboardState !==
        "function"
    ) {
        return createEmptySalesDashboardStats();
    }

    const state =
        window.getSalesDashboardState();

    return {
        total: Number(
            state?.stats?.total || 0
        ),

        new: Number(
            state?.stats?.new || 0
        ),

        first_contact: Number(
            state?.stats?.first_contact || 0
        ),

        first_meeting: Number(
            state?.stats?.first_meeting || 0
        ),

        quotation: Number(
            state?.stats?.quotation || 0
        ),

        second_appointment: Number(
            state?.stats?.second_appointment || 0
        ),

        deal: Number(
            state?.stats?.deal || 0
        ),

        no_deal: Number(
            state?.stats?.no_deal || 0
        )
    };
};


/* =========================================================
   CALCULATE CONVERSION RATE
   ---------------------------------------------------------
   Deal dibandingkan dengan total leads.
   Hanya untuk informasi dashboard.
   ========================================================= */

window.getSalesDashboardDealRate = function () {

    const stats =
        window.getSalesDashboardStats();

    if (!stats.total) {
        return 0;
    }

    return (
        stats.deal /
        stats.total
    ) * 100;
};


/* =========================================================
   CALCULATE ACTIVE LEADS
   ---------------------------------------------------------
   Active = semua leads selain Deal dan No Deal.
   ========================================================= */

window.getSalesDashboardActiveLeads =
    function () {

        const stats =
            window.getSalesDashboardStats();

        return Math.max(
            0,
            stats.total -
            stats.deal -
            stats.no_deal
        );
    };


/* =========================================================
   CALCULATE PIPELINE TOTAL
   ---------------------------------------------------------
   Jumlah seluruh status pipeline.
   ========================================================= */

window.getSalesDashboardPipelineTotal =
    function () {

        const stats =
            window.getSalesDashboardStats();

        return (
            stats.new +
            stats.first_contact +
            stats.first_meeting +
            stats.quotation +
            stats.second_appointment +
            stats.deal +
            stats.no_deal
        );
    };


/* =========================================================
   REFRESH STATS FROM CURRENT LEADS
   ========================================================= */

window.refreshSalesDashboardStats =
    function () {

        if (
            typeof window.getSalesDashboardState !==
            "function"
        ) {
            return createEmptySalesDashboardStats();
        }

        const state =
            window.getSalesDashboardState();

        return window.updateSalesDashboardStats(
            state?.leads || []
        );
    };
