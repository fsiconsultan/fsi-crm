// ============================================================
// CALCULATE DASHBOARD STATS
// ============================================================
//
// PIPELINE DASHBOARD:
//
// 1. New
// 2. First Contact
// 3. First Meeting / Appointment / Site Survey
// 4. Quotation
// 5. Second Appointment
// 6. Deal
// 7. No Deal
//
// Status lama tetap didukung sebagai alias:
//
// Interested      → First Contact
// Follow Up       → First Meeting / Appointment / Site Survey
// Appointment     → First Meeting / Appointment / Site Survey
// Site Survey     → First Meeting / Appointment / Site Survey
// SPK             → Deal
// Closing         → Deal
// Not Interested  → No Deal
//
// ============================================================

function calculateDashboardStats(
    data
) {

    const list =
        Array.isArray(data)
            ? data
            : [];


    // ========================================================
    // PIPELINE HELPER
    // ========================================================
    //
    // Gunakan fungsi dari dashboard-pipeline.js.
    //
    // Ini penting karena pipeline sudah memiliki
    // mapping status lama → status baru.
    //
    function countPipelineStage(
        label
    ) {

        if (
            typeof window.dashboardGetPipelineStageCount !==
            "function"
        ) {

            return 0;
        }


        if (
            typeof window.dashboardGetPipelineStage !==
            "function"
        ) {

            return 0;
        }


        const stage =
            window.dashboardGetPipelineStage(
                label
            );


        if (!stage) {
            return 0;
        }


        return window.dashboardGetPipelineStageCount(
            list,
            stage
        );
    }


    // ========================================================
    // MAIN PIPELINE STATISTICS
    // ========================================================

    const stats = {

        // ----------------------------------------------------
        // TOTAL
        // ----------------------------------------------------

        total:
            list.length,


        // ----------------------------------------------------
        // NEW
        // ----------------------------------------------------

        new:
            countPipelineStage(
                "New"
            ),


        // ----------------------------------------------------
        // FIRST CONTACT
        // ----------------------------------------------------

        firstContact:
            countPipelineStage(
                "First Contact"
            ),


        // ----------------------------------------------------
        // FIRST MEETING / APPOINTMENT / SITE SURVEY
        // ----------------------------------------------------

        firstMeeting:
            countPipelineStage(
                "First Meeting / Appointment / Site Survey"
            ),


        // ----------------------------------------------------
        // QUOTATION
        // ----------------------------------------------------

        quotation:
            countPipelineStage(
                "Quotation"
            ),


        // ----------------------------------------------------
        // SECOND APPOINTMENT
        // ----------------------------------------------------

        secondAppointment:
            countPipelineStage(
                "Second Appointment"
            ),


        // ----------------------------------------------------
        // DEAL
        // ----------------------------------------------------

        deal:
            countPipelineStage(
                "Deal"
            ),


        // ----------------------------------------------------
        // NO DEAL
        // ----------------------------------------------------

        noDeal:
            countPipelineStage(
                "No Deal"
            )
    };


    // ========================================================
    // LEGACY COMPATIBILITY
    // ========================================================
    //
    // Kita tetap simpan property lama supaya modul lain
    // yang masih membaca:
    //
    // stats.interested
    // stats.followUp
    // stats.closing
    //
    // tidak langsung rusak.
    //
    // Tetapi nilai tersebut sekarang mengambil dari
    // Pipeline baru.
    // ========================================================

    stats.interested =
        stats.firstContact;


    stats.followUp =
        stats.firstMeeting;


    stats.closing =
        stats.deal;


    // ========================================================
    // LEGACY DATA
    // ========================================================
    //
    // Tetap tersedia untuk modul lama.
    // ========================================================

    stats.flyerSent =
        dashboardCountStatus(
            list,
            "Flyer Sent"
        );


    // --------------------------------------------------------
    // Appointment legacy
    // --------------------------------------------------------
    //
    // Ini hanya informasi tambahan dari field tanggal.
    // Tidak digunakan sebagai Pipeline utama.
    // --------------------------------------------------------

    stats.appointment =
        dashboardCountDateField(
            list,
            "appointment"
        );


    // --------------------------------------------------------
    // Site Survey legacy
    // --------------------------------------------------------

    stats.siteSurvey =
        dashboardCountDateField(
            list,
            "site_survey"
        );


    // --------------------------------------------------------
    // SPK legacy
    // --------------------------------------------------------

    stats.spk =
        dashboardCountDateField(
            list,
            "spk"
        );


    // --------------------------------------------------------
    // Not Interested legacy
    // --------------------------------------------------------

    stats.notInterested =
        dashboardCountStatus(
            list,
            "Not Interested"
        );


    // ========================================================
    // STATUS SUMMARY
    // ========================================================

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


    // ========================================================
    // PIPELINE SUMMARY
    // ========================================================

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


    // ========================================================
    // DEBUG
    // ========================================================

    console.log(
        "FSI CRM: Dashboard Pipeline Stats",
        stats.pipeline
    );


    return stats;
}



// ============================================================
// DASHBOARD COUNT-UP
// ============================================================

function dashboardAnimateNumber(
    element,
    targetValue,
    duration = 1000
) {

    if (!element) {
        return;
    }


    const target =
        Number(
            targetValue
        ) || 0;


    const current =
        Number(
            String(
                element.textContent || "0"
            ).replace(
                /[^\d-]/g,
                ""
            )
        ) || 0;


    if (
        current === target
    ) {

        element.textContent =
            target.toLocaleString(
                "en-US"
            );

        return;
    }


    if (
        element._dashboardAnimationFrame
    ) {

        cancelAnimationFrame(
            element._dashboardAnimationFrame
        );
    }


    const startTime =
        performance.now();


    function easeOutCubic(
        progress
    ) {

        return 1 -
            Math.pow(
                1 - progress,
                3
            );
    }


    function animate(
        currentTime
    ) {

        const elapsed =
            currentTime -
            startTime;


        let progress =
            elapsed /
            duration;


        progress =
            Math.min(
                Math.max(
                    progress,
                    0
                ),
                1
            );


        const easedProgress =
            easeOutCubic(
                progress
            );


        const value =
            Math.round(
                current +
                (
                    target -
                    current
                ) *
                easedProgress
            );


        element.textContent =
            value.toLocaleString(
                "en-US"
            );


        if (
            progress < 1
        ) {

            element._dashboardAnimationFrame =
                requestAnimationFrame(
                    animate
                );

        } else {

            element.textContent =
                target.toLocaleString(
                    "en-US"
                );


            element._dashboardAnimationFrame =
                null;
        }
    }


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


    // ========================================================
    // STAT CARD MAP
    // ========================================================

    const statMap = {

        // ----------------------------------------------------
        // MAIN PIPELINE
        // ----------------------------------------------------

        statTotal:
            stats.total,

        statNew:
            stats.new,

        statInterested:
            stats.firstContact,

        statFollowUp:
            stats.firstMeeting,

        statQuotation:
            stats.quotation,

        statAppointment:
            stats.secondAppointment,

        statSPK:
            stats.deal,

        statNotInterested:
            stats.noDeal,

        // ----------------------------------------------------
        // LEGACY
        // ----------------------------------------------------

        statClosing:
            stats.deal,

        statFlyerSent:
            stats.flyerSent,

        statSiteSurvey:
            stats.siteSurvey
    };


    // ========================================================
    // RENDER MAIN CARDS
    // ========================================================

    Object.entries(
        statMap
    ).forEach(
        ([id, value]) => {

            dashboardSetElementText(
                id,
                value
            );
        }
    );


    // ========================================================
    // LEGACY IDS
    // ========================================================

    const alternatives = {

        totalLeads:
            stats.total,

        newLeads:
            stats.new,

        interestedLeads:
            stats.firstContact,

        followUpLeads:
            stats.firstMeeting,

        closingLeads:
            stats.deal,

        flyerSentLeads:
            stats.flyerSent,

        appointmentLeads:
            stats.secondAppointment,

        siteSurveyLeads:
            stats.siteSurvey,

        quotationLeads:
            stats.quotation,

        spkLeads:
            stats.deal,

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


    // ========================================================
    // GLOBAL STATUS SUMMARY
    // ========================================================

    window.FSIDashboard =
        window.FSIDashboard ||
        {};


    window.FSIDashboard.statusStats = {

        total:
            stats.total,

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


    // ========================================================
    // SAVE FULL STATS
    // ========================================================

    window.FSIDashboard.stats =
        stats;


    // ========================================================
    // INTERACTIVE STAT CARDS
    // ========================================================

    if (
        typeof dashboardBindStatCardClicks ===
        "function"
    ) {

        dashboardBindStatCardClicks();
    }
}
