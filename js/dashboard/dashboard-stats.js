// ============================================================
// CALCULATE DASHBOARD STATS
// ============================================================
function calculateDashboardStats(
    data
) {

    const list =
        Array.isArray(data)
            ? data
            : [];


    /*
     * ========================================================
     * STATISTIK UTAMA DASHBOARD
     * ========================================================
     *
     * Data yang masuk ke fungsi ini sudah harus merupakan
     * data yang sesuai scope Dashboard:
     *
     * Admin:
     *     All Sales -> semua leads
     *     Sales A   -> leads Sales A
     *     Sales B   -> leads Sales B
     *     Sales C   -> leads Sales C
     *
     * Sales:
     *     -> hanya leads miliknya
     *
     * Statistik utama:
     *
     * 1. Total Leads
     * 2. New
     * 3. Interested
     * 4. Follow Up
     * 5. Closing
     */


    const stats = {

        /*
         * TOTAL LEADS
         */
        total:
            list.length,


        /*
         * NEW
         */
        new:
            dashboardCountStatus(
                list,
                "New"
            ),


        /*
         * INTERESTED
         */
        interested:
            dashboardCountStatus(
                list,
                "Interested"
            ),


        /*
         * FOLLOW UP
         */
        followUp:
            dashboardCountStatus(
                list,
                "Follow Up"
            ),


        /*
         * CLOSING
         *
         * Closing dihitung dari status Closing.
         */
        closing:
            dashboardCountStatus(
                list,
                "Closing"
            )
    };


    /*
     * ========================================================
     * COMPATIBILITY / LEGACY STATISTICS
     * ========================================================
     *
     * Jangan dihapus karena beberapa modul lama masih
     * mungkin mengambil nama statistik berikut.
     */


    /*
     * Flyer Sent
     *
     * Tetap dihitung dari status aslinya jika ada.
     */
    stats.flyerSent =
        dashboardCountStatus(
            list,
            "Flyer Sent"
        );


    /*
     * First Contact
     *
     * Tetap dipertahankan karena pipeline lama masih ada.
     */
    stats.firstContact =
        dashboardCountStatus(
            list,
            "First Contact"
        );


    /*
     * First Meeting / Appointment / Site Survey
     *
     * Tetap dipertahankan untuk compatibility.
     */
    stats.firstMeeting =
        dashboardCountStatus(
            list,
            "First Meeting / Appointment / Site Survey"
        );


    /*
     * Quotation
     */
    stats.quotation =
        dashboardCountStatus(
            list,
            "Quotation"
        );


    /*
     * Second Appointment
     */
    stats.secondAppointment =
        dashboardCountStatus(
            list,
            "Second Appointment"
        );


    /*
     * Deal
     */
    stats.deal =
        dashboardCountStatus(
            list,
            "Deal"
        );


    /*
     * No Deal
     */
    stats.noDeal =
        dashboardCountStatus(
            list,
            "No Deal"
        );


    /*
     * Appointment legacy
     *
     * Tetap berdasarkan field appointment.
     */
    stats.appointment =
        dashboardCountDateField(
            list,
            "appointment"
        );


    /*
     * Site Survey legacy
     */
    stats.siteSurvey =
        dashboardCountDateField(
            list,
            "site_survey"
        );


    /*
     * SPK legacy
     *
     * Tetap mengikuti field SPK jika tersedia.
     */
    stats.spk =
        dashboardCountDateField(
            list,
            "spk"
        );


    /*
     * Not Interested legacy
     *
     * Dashboard utama sekarang menggunakan Closing,
     * tetapi statistik lama tetap tersedia.
     */
    stats.notInterested =
        dashboardCountStatus(
            list,
            "Not Interested"
        );


    /*
     * ========================================================
     * STATUS SUMMARY
     * ========================================================
     *
     * Statistik utama yang sekarang dipakai Dashboard.
     */
    stats.statuses = {

        new:
            stats.new,

        interested:
            stats.interested,

        followUp:
            stats.followUp,

        closing:
            stats.closing
    };


    /*
     * ========================================================
     * PIPELINE SUMMARY LEGACY
     * ========================================================
     *
     * Tetap disediakan supaya modul pipeline lama tidak error.
     */
    stats.pipeline = {

        new:
            stats.new,

        firstContact:
            stats.firstContact,

        firstMeeting:
            stats.firstMeeting,

        quotation:
            stats.quotation,

        secondAppointment:
            stats.secondAppointment,

        deal:
            stats.deal,

        noDeal:
            stats.noDeal
    };


    return stats;
}


// ============================================================
// SET ELEMENT TEXT
// ============================================================
function dashboardSetElementText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return;
    }


    element.textContent =
        String(
            value ?? 0
        );
}


// ============================================================
// UPDATE DASHBOARD CARDS
// ============================================================
function renderDashboardStats(
    stats
) {

    if (!stats) {
        return;
    }


    /*
     * ========================================================
     * STAT CARD MAP
     * ========================================================
     *
     * Kartu utama yang kita inginkan:
     *
     * statTotal
     *      -> Total Leads
     *
     * statNew
     *      -> New
     *
     * statInterested
     *      -> Interested
     *
     * statFollowUp
     *      -> Follow Up
     *
     * statClosing
     *      -> Closing
     *
     * ID lain tetap dipertahankan untuk compatibility.
     */
    const statMap = {

        /*
         * ====================================================
         * STATISTIK UTAMA
         * ====================================================
         */

        statTotal:
            stats.total,

        statNew:
            stats.new,

        statInterested:
            stats.interested,

        statFollowUp:
            stats.followUp,

        statClosing:
            stats.closing,


        /*
         * ====================================================
         * PIPELINE / LEGACY CARDS
         * ====================================================
         *
         * Tetap dirender supaya HTML lama tidak error.
         */

        statFlyerSent:
            stats.flyerSent,

        statAppointment:
            stats.appointment,

        statSiteSurvey:
            stats.siteSurvey,

        statQuotation:
            stats.quotation,

        statSPK:
            stats.spk,

        statNotInterested:
            stats.notInterested
    };


    /*
     * Set semua angka kartu.
     */
    Object.entries(
        statMap
    ).forEach(
        ([id, value]) => {

            if (
                typeof window.setText ===
                "function"
            ) {

                window.setText(
                    id,
                    value
                );
            }


            /*
             * Pastikan langsung di-set juga.
             */
            dashboardSetElementText(
                id,
                value
            );
        }
    );


    /*
     * ========================================================
     * LEGACY IDS
     * ========================================================
     *
     * Jangan dihapus.
     */
    const alternatives = {

        /*
         * Total
         */
        totalLeads:
            stats.total,


        /*
         * New
         */
        newLeads:
            stats.new,


        /*
         * Interested
         */
        interestedLeads:
            stats.interested,


        /*
         * Follow Up
         */
        followUpLeads:
            stats.followUp,


        /*
         * Closing
         */
        closingLeads:
            stats.closing,


        /*
         * Legacy Flyer Sent
         */
        flyerSentLeads:
            stats.flyerSent,


        /*
         * Legacy Appointment
         */
        appointmentLeads:
            stats.appointment,


        /*
         * Legacy Site Survey
         */
        siteSurveyLeads:
            stats.siteSurvey,


        /*
         * Quotation
         */
        quotationLeads:
            stats.quotation,


        /*
         * SPK
         */
        spkLeads:
            stats.spk,


        /*
         * Not Interested
         */
        notInterestedLeads:
            stats.notInterested
    };


    Object.entries(
        alternatives
    ).forEach(
        ([id, value]) => {

            dashboardSetElementText(
                id,
                value
            );
        }
    );


    /*
     * ========================================================
     * GLOBAL STATUS SUMMARY
     * ========================================================
     *
     * Statistik utama Dashboard.
     */
    window.FSIDashboard =
        window.FSIDashboard ||
        {};


    window.FSIDashboard.statusStats = {

        /*
         * Dashboard utama
         */
        total:
            stats.total,

        new:
            stats.new,

        interested:
            stats.interested,

        followUp:
            stats.followUp,

        closing:
            stats.closing,


        /*
         * Pipeline lama
         */
        firstContact:
            stats.firstContact,

        firstMeeting:
            stats.firstMeeting,

        quotation:
            stats.quotation,

        secondAppointment:
            stats.secondAppointment,

        deal:
            stats.deal,

        noDeal:
            stats.noDeal
    };


    /*
     * Simpan stats utama secara global.
     */
    window.FSIDashboard.stats =
        stats;


    /*
     * Setelah angka dirender,
     * pastikan kartu interactive.
     */
    if (
        typeof dashboardBindStatCardClicks ===
        "function"
    ) {

        dashboardBindStatCardClicks();
    }
}
