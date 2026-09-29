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
     */

    stats.flyerSent =
        dashboardCountStatus(
            list,
            "Flyer Sent"
        );


    stats.firstContact =
        dashboardCountStatus(
            list,
            "First Contact"
        );


    stats.firstMeeting =
        dashboardCountStatus(
            list,
            "First Meeting / Appointment / Site Survey"
        );


    stats.quotation =
        dashboardCountStatus(
            list,
            "Quotation"
        );


    stats.secondAppointment =
        dashboardCountStatus(
            list,
            "Second Appointment"
        );


    stats.deal =
        dashboardCountStatus(
            list,
            "Deal"
        );


    stats.noDeal =
        dashboardCountStatus(
            list,
            "No Deal"
        );


    /*
     * Appointment legacy
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
     */
    stats.spk =
        dashboardCountDateField(
            list,
            "spk"
        );


    /*
     * Not Interested legacy
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
// DASHBOARD COUNT-UP
// ============================================================

/*
 * Animasi angka dari angka sebelumnya menuju angka baru.
 *
 * Contoh:
 *
 * 0 -> 2141
 *
 * atau ketika data berubah:
 *
 * 2141 -> 2150
 *
 * Durasi sekitar 1 detik.
 */
function dashboardAnimateNumber(
    element,
    targetValue,
    duration = 1000
) {

    if (!element) {
        return;
    }


    /*
     * Pastikan target berupa angka.
     */
    const target =
        Number(
            targetValue
        ) || 0;


    /*
     * Ambil angka yang sedang tampil.
     *
     * Kalau sebelumnya kosong,
     * mulai dari 0.
     */
    const current =
        Number(
            String(
                element.textContent || "0"
            ).replace(
                /[^\d-]/g,
                ""
            )
        ) || 0;


    /*
     * Jika angka sama,
     * tidak perlu animasi.
     */
    if (current === target) {

        element.textContent =
            target.toLocaleString(
                "en-US"
            );

        return;
    }


    /*
     * Batalkan animasi sebelumnya
     * jika masih berjalan.
     */
    if (
        element._dashboardAnimationFrame
    ) {

        cancelAnimationFrame(
            element._dashboardAnimationFrame
        );
    }


    const startTime =
        performance.now();


    /*
     * Easing:
     *
     * mulai cepat,
     * kemudian melambat.
     */
    function easeOutCubic(
        progress
    ) {

        return 1 -
            Math.pow(
                1 - progress,
                3
            );
    }


    /*
     * Jalankan animasi.
     */
    function animate(
        currentTime
    ) {

        const elapsed =
            currentTime -
            startTime;


        let progress =
            elapsed /
            duration;


        /*
         * Batasi 0 - 1.
         */
        progress =
            Math.min(
                Math.max(
                    progress,
                    0
                ),
                1
            );


        /*
         * Apply easing.
         */
        const easedProgress =
            easeOutCubic(
                progress
            );


        /*
         * Hitung angka saat ini.
         */
        const value =
            Math.round(
                current +
                (
                    target -
                    current
                ) *
                easedProgress
            );


        /*
         * Tampilkan angka.
         */
        element.textContent =
            value.toLocaleString(
                "en-US"
            );


        /*
         * Lanjutkan sampai selesai.
         */
        if (
            progress < 1
        ) {

            element._dashboardAnimationFrame =
                requestAnimationFrame(
                    animate
                );

        } else {

            /*
             * Pastikan angka akhir
             * benar-benar sama dengan target.
             */
            element.textContent =
                target.toLocaleString(
                    "en-US"
                );


            element._dashboardAnimationFrame =
                null;
        }
    }


    /*
     * Mulai animasi.
     */
    element._dashboardAnimationFrame =
        requestAnimationFrame(
            animate
        );
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


    const numericValue =
        Number(
            value
        ) || 0;


    /*
     * Gunakan count-up untuk
     * angka dashboard.
     */
    dashboardAnimateNumber(
        element,
        numericValue,
        1000
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

            /*
             * Jika helper global tersedia,
             * tetap jalankan untuk compatibility.
             */
            if (
                typeof window.setText ===
                "function"
            ) {

                /*
                 * Jangan gunakan setText
                 * untuk angka utama karena
                 * bisa mematikan count-up.
                 *
                 * Count-up dilakukan oleh
                 * dashboardSetElementText().
                 */
            }


            /*
             * Count-up dashboard.
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
