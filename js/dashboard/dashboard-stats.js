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
     * STATUS PIPELINE BARU
     * ========================================================
     *
     * 1. New
     * 2. First Contact
     * 3. First Meeting / Appointment / Site Survey
     * 4. Quotation
     * 5. Second Appointment
     * 6. Deal
     * 7. No Deal
     *
     * Status utama sekarang dihitung langsung
     * dari kolom `status`.
     */
    const stats = {
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
         * FIRST CONTACT
         */
        firstContact:
            dashboardCountStatus(
                list,
                "First Contact"
            ),

        /*
         * FIRST MEETING /
         * APPOINTMENT /
         * SITE SURVEY
         */
        firstMeeting:
            dashboardCountStatus(
                list,
                "First Meeting / Appointment / Site Survey"
            ),

        /*
         * QUOTATION
         */
        quotation:
            dashboardCountStatus(
                list,
                "Quotation"
            ),

        /*
         * SECOND APPOINTMENT
         */
        secondAppointment:
            dashboardCountStatus(
                list,
                "Second Appointment"
            ),

        /*
         * DEAL
         */
        deal:
            dashboardCountStatus(
                list,
                "Deal"
            ),

        /*
         * NO DEAL
         */
        noDeal:
            dashboardCountStatus(
                list,
                "No Deal"
            )
    };

    /*
     * ========================================================
     * LEGACY / COMPATIBILITY
     * ========================================================
     *
     * ID lama masih dipakai oleh beberapa bagian Dashboard.
     * Kita isi dengan mapping ke status baru agar tidak
     * menyebabkan error pada modul lama.
     */

    /*
     * Flyer Sent lama
     * sekarang = First Contact
     */
    stats.flyerSent =
        stats.firstContact;

    /*
     * Interested lama
     * sekarang = First Contact
     *
     * ID statInterested di index.html sekarang
     * ditampilkan sebagai "First Contact".
     */
    stats.interested =
        stats.firstContact;

    /*
     * Follow Up lama
     * sekarang = First Meeting / Appointment / Site Survey
     *
     * ID statFollowUp sekarang digunakan untuk
     * status First Meeting.
     */
    stats.followUp =
        stats.firstMeeting;

    /*
     * Appointment lama
     * sekarang = Second Appointment
     *
     * ID statAppointment sekarang digunakan untuk
     * status Second Appointment.
     */
    stats.appointment =
        stats.secondAppointment;

    /*
     * Site Survey lama
     *
     * Tetap dihitung sebagai field legacy jika
     * modul lama masih membutuhkannya.
     */
    stats.siteSurvey =
        dashboardCountDateField(
            list,
            "site_survey"
        );

    /*
     * SPK lama
     * sekarang = Deal
     */
    stats.spk =
        stats.deal;

    /*
     * Closing lama
     *
     * Tetap dihitung untuk compatibility.
     */
    stats.closing =
        dashboardCountClosing(
            list
        );

    /*
     * Not Interested lama
     * sekarang = No Deal
     */
    stats.notInterested =
        stats.noDeal;

    /*
     * ========================================================
     * ALIAS STATUS BARU
     * ========================================================
     *
     * Alias ini memudahkan modul Dashboard lain mengambil
     * statistik menggunakan nama status baru.
     */
    stats.statuses = {
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
     * HTML lama tetap digunakan supaya tidak merusak
     * index.html.
     *
     * ID lama → status baru:
     *
     * statNew
     *      → New
     *
     * statInterested
     *      → First Contact
     *
     * statFollowUp
     *      → First Meeting / Appointment / Site Survey
     *
     * statQuotation
     *      → Quotation
     *
     * statAppointment
     *      → Second Appointment
     *
     * statSPK
     *      → Deal
     *
     * statNotInterested
     *      → No Deal
     */
    const statMap = {

        /*
         * TOTAL
         */
        statTotal:
            stats.total,

        /*
         * NEW
         */
        statNew:
            stats.new,

        /*
         * FIRST CONTACT
         */
        statInterested:
            stats.firstContact,

        /*
         * FIRST MEETING /
         * APPOINTMENT /
         * SITE SURVEY
         */
        statFollowUp:
            stats.firstMeeting,

        /*
         * SECOND APPOINTMENT
         */
        statAppointment:
            stats.secondAppointment,

        /*
         * QUOTATION
         */
        statQuotation:
            stats.quotation,

        /*
         * DEAL
         */
        statSPK:
            stats.deal,

        /*
         * NO DEAL
         */
        statNotInterested:
            stats.noDeal,

        /*
         * LEGACY
         */
        statFlyerSent:
            stats.firstContact,

        statSiteSurvey:
            stats.siteSurvey,

        statClosing:
            stats.closing
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
     * LEGACY IDs
     * ========================================================
     *
     * Jangan dihapus.
     *
     * Modul lama mungkin masih menggunakan ID berikut.
     */
    const alternatives = {

        totalLeads:
            stats.total,

        newLeads:
            stats.new,

        /*
         * First Contact
         */
        flyerSentLeads:
            stats.firstContact,

        interestedLeads:
            stats.firstContact,

        /*
         * First Meeting
         */
        followUpLeads:
            stats.firstMeeting,

        /*
         * Second Appointment
         */
        appointmentLeads:
            stats.secondAppointment,

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
         * Deal
         */
        spkLeads:
            stats.deal,

        /*
         * Legacy Closing
         */
        closingLeads:
            stats.closing,

        /*
         * No Deal
         */
        notInterestedLeads:
            stats.noDeal
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
     * STATUS SUMMARY
     * ========================================================
     *
     * Simpan juga statistik 7 status secara global.
     * Modul Dashboard lain bisa menggunakan ini.
     */
    window.FSIDashboard =
        window.FSIDashboard ||
        {};

    window.FSIDashboard.statusStats = {
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


    /*
     * Setelah angka dirender,
     * pastikan semua kartu kembali interactive.
     */
    if (
        typeof dashboardBindStatCardClicks ===
        "function"
    ) {
        dashboardBindStatCardClicks();
    }
}
