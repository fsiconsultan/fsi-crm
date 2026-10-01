// ============================================================
// FSI CRM - DASHBOARD STATS
// ============================================================
// File : js/dashboard/dashboard-stats.js
// ============================================================


// ============================================================
// GET LEADS
// ============================================================

function dashboardStatsGetLeads() {

    if (
        window.FSIDashboard &&
        Array.isArray(window.FSIDashboard.leads)
    ) {
        return window.FSIDashboard.leads;
    }

    if (Array.isArray(window.leadsData)) {
        return window.leadsData;
    }

    return [];
}


// ============================================================
// NORMALIZE STATUS
// ============================================================

function dashboardStatsNormalize(value) {

    if (
        typeof window.dashboardNormalizeStatus === "function"
    ) {
        return window.dashboardNormalizeStatus(value);
    }

    return String(value || "")
        .trim()
        .toLowerCase();
}


// ============================================================
// HAS VALUE
// ============================================================

function dashboardStatsHasValue(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return false;
    }

    if (typeof value === "string") {
        return value.trim() !== "";
    }

    return true;
}


// ============================================================
// STATUS CHECK
// ============================================================

function dashboardStatsStatusIs(
    lead,
    statuses
) {

    if (!lead) {
        return false;
    }

    const currentStatus =
        dashboardStatsNormalize(
            lead.status
        );

    return statuses.some(
        function (status) {

            return (
                currentStatus ===
                dashboardStatsNormalize(status)
            );

        }
    );
}


// ============================================================
// COUNT STATUS
// ============================================================

function dashboardStatsCountStatus(
    leads,
    statuses
) {

    return leads.filter(
        function (lead) {

            return dashboardStatsStatusIs(
                lead,
                statuses
            );

        }
    ).length;
}


// ============================================================
// COUNT FIELD
// ============================================================

function dashboardStatsCountField(
    leads,
    field
) {

    return leads.filter(
        function (lead) {

            return dashboardStatsHasValue(
                lead && lead[field]
            );

        }
    ).length;
}


// ============================================================
// NEW CUSTOMER
// ============================================================

function dashboardStatsIsNewCustomer(
    lead
) {

    return dashboardStatsStatusIs(
        lead,
        [
            "New Customer",
            "New"
        ]
    );
}


// ============================================================
// FIRST CONTACT
// ============================================================

function dashboardStatsIsFirstContact(
    lead
) {

    return dashboardStatsStatusIs(
        lead,
        [
            "First Contact",
            "Interested"
        ]
    );
}


// ============================================================
// APPOINTMENT
// ============================================================

function dashboardStatsIsAppointment(
    lead
) {

    if (!lead) {
        return false;
    }

    if (
        dashboardStatsHasValue(
            lead.appointment
        )
    ) {
        return true;
    }

    if (
        dashboardStatsStatusIs(
            lead,
            [
                "Appointment"
            ]
        )
    ) {
        return true;
    }

    return dashboardStatsStatusIs(
        lead,
        [
            "First Meeting",
            "First Meeting / Appointment / Site Survey",
            "Follow Up"
        ]
    );
}


// ============================================================
// SITE SURVEY
// ============================================================

function dashboardStatsIsSiteSurvey(
    lead
) {

    if (!lead) {
        return false;
    }

    if (
        dashboardStatsHasValue(
            lead.site_survey
        )
    ) {
        return true;
    }

    return dashboardStatsStatusIs(
        lead,
        [
            "Site Survey"
        ]
    );
}


// ============================================================
// QUOTATION
// ============================================================

function dashboardStatsIsQuotation(
    lead
) {

    if (!lead) {
        return false;
    }

    if (
        dashboardStatsHasValue(
            lead.quotation
        )
    ) {
        return true;
    }

    return dashboardStatsStatusIs(
        lead,
        [
            "Quotation"
        ]
    );
}


// ============================================================
// DEAL / CLOSING
// ============================================================

function dashboardStatsIsDealClosing(
    lead
) {

    if (!lead) {
        return false;
    }

    if (
        dashboardStatsHasValue(
            lead.closing
        )
    ) {
        return true;
    }

    return dashboardStatsStatusIs(
        lead,
        [
            "Deal",
            "Deal / Closing",
            "Closing",
            "SPK"
        ]
    );
}


// ============================================================
// NO DEAL
// ============================================================

function dashboardStatsIsNoDeal(
    lead
) {

    return dashboardStatsStatusIs(
        lead,
        [
            "No Deal",
            "Not Interested"
        ]
    );
}


// ============================================================
// CALCULATE DASHBOARD STATS
// ============================================================

function calculateDashboardStats(
    leads
) {

    const list =
        Array.isArray(leads)
            ? leads
            : [];


    const stats = {

        total:
            list.length,

        newCustomer:
            list.filter(
                dashboardStatsIsNewCustomer
            ).length,

        firstContact:
            list.filter(
                dashboardStatsIsFirstContact
            ).length,

        appointment:
            list.filter(
                dashboardStatsIsAppointment
            ).length,

        siteSurvey:
            list.filter(
                dashboardStatsIsSiteSurvey
            ).length,

        quotation:
            list.filter(
                dashboardStatsIsQuotation
            ).length,

        dealClosing:
            list.filter(
                dashboardStatsIsDealClosing
            ).length,

        noDeal:
            list.filter(
                dashboardStatsIsNoDeal
            ).length,


        // Activity fields

        appointmentActivity:
            dashboardStatsCountField(
                list,
                "appointment"
            ),

        siteSurveyActivity:
            dashboardStatsCountField(
                list,
                "site_survey"
            ),

        quotationActivity:
            dashboardStatsCountField(
                list,
                "quotation"
            ),

        closingActivity:
            dashboardStatsCountField(
                list,
                "closing"
            )
    };


    // ========================================================
    // LEGACY COMPATIBILITY
    // ========================================================

    stats.new =
        stats.newCustomer;

    stats.interested =
        stats.firstContact;

    stats.followUp =
        stats.appointment;

    stats.closing =
        stats.dealClosing;

    stats.spk =
        stats.dealClosing;

    stats.notInterested =
        stats.noDeal;

    stats.flyerSent =
        dashboardStatsCountStatus(
            list,
            [
                "Flyer Sent"
            ]
        );


    // ========================================================
    // SAVE GLOBAL STATE
    // ========================================================

    if (!window.FSIDashboard) {
        window.FSIDashboard = {};
    }

    window.FSIDashboard.stats =
        stats;

    window.FSIDashboard.statusStats =
        stats;


    return stats;
}


// ============================================================
// SET DASHBOARD VALUE
// ============================================================

function dashboardStatsSetValue(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (!element) {
        return;
    }

    element.textContent =
        Number(value || 0)
            .toLocaleString("en-US");
}


// ============================================================
// RENDER DASHBOARD STATS
// ============================================================

function renderDashboardStats(
    leadsOrStats
) {

    let stats;


    if (
        leadsOrStats &&
        typeof leadsOrStats === "object" &&
        !Array.isArray(leadsOrStats) &&
        Object.prototype.hasOwnProperty.call(
            leadsOrStats,
            "total"
        )
    ) {

        stats =
            leadsOrStats;

    } else {

        stats =
            calculateDashboardStats(
                Array.isArray(leadsOrStats)
                    ? leadsOrStats
                    : dashboardStatsGetLeads()
            );
    }


    if (!stats) {
        return;
    }


    // ========================================================
    // MAIN DASHBOARD
    // ========================================================

    dashboardStatsSetValue(
        "statTotal",
        stats.total
    );

    dashboardStatsSetValue(
        "statNew",
        stats.newCustomer
    );

    dashboardStatsSetValue(
        "statInterested",
        stats.firstContact
    );

    dashboardStatsSetValue(
        "statAppointment",
        stats.appointment
    );

    dashboardStatsSetValue(
        "statSiteSurvey",
        stats.siteSurvey
    );

    dashboardStatsSetValue(
        "statQuotation",
        stats.quotation
    );

    dashboardStatsSetValue(
        "statSPK",
        stats.dealClosing
    );

    dashboardStatsSetValue(
        "statNotInterested",
        stats.noDeal
    );


    // ========================================================
    // OPTIONAL NEW IDS
    // ========================================================

    dashboardStatsSetValue(
        "statNewCustomer",
        stats.newCustomer
    );

    dashboardStatsSetValue(
        "statFirstContact",
        stats.firstContact
    );

    dashboardStatsSetValue(
        "statDealClosing",
        stats.dealClosing
    );

    dashboardStatsSetValue(
        "statNoDeal",
        stats.noDeal
    );


    // ========================================================
    // LEGACY IDS
    // ========================================================

    dashboardStatsSetValue(
        "statFollowUp",
        stats.appointment
    );

    dashboardStatsSetValue(
        "statClosing",
        stats.dealClosing
    );

    dashboardStatsSetValue(
        "statFlyerSent",
        stats.flyerSent
    );


    // ========================================================
    // SALES COUNT
    // ========================================================

    dashboardStatsSetValue(
        "dashboardSalesAllCount",
        stats.total
    );

    dashboardStatsSetValue(
        "dashboardAllSalesCount",
        stats.total
    );


    return stats;
}


// ============================================================
// UPDATE DASHBOARD STATS
// ============================================================

function updateDashboardStats(
    leads
) {

    const list =
        Array.isArray(leads)
            ? leads
            : dashboardStatsGetLeads();


    const stats =
        calculateDashboardStats(
            list
        );


    renderDashboardStats(
        stats
    );


    return stats;
}


// ============================================================
// GET STAT CATEGORY
// ============================================================

function dashboardGetStatCategory(
    category,
    leads
) {

    const list =
        Array.isArray(leads)
            ? leads
            : dashboardStatsGetLeads();


    switch (category) {

        case "total":

            return list;


        case "new":
        case "newCustomer":

            return list.filter(
                dashboardStatsIsNewCustomer
            );


        case "firstContact":
        case "interested":

            return list.filter(
                dashboardStatsIsFirstContact
            );


        case "appointment":
        case "followUp":

            return list.filter(
                dashboardStatsIsAppointment
            );


        case "siteSurvey":

            return list.filter(
                dashboardStatsIsSiteSurvey
            );


        case "quotation":

            return list.filter(
                dashboardStatsIsQuotation
            );


        case "closing":
        case "deal":
        case "dealClosing":
        case "spk":

            return list.filter(
                dashboardStatsIsDealClosing
            );


        case "noDeal":
        case "notInterested":

            return list.filter(
                dashboardStatsIsNoDeal
            );


        case "flyerSent":

            return list.filter(
                function (lead) {

                    return dashboardStatsStatusIs(
                        lead,
                        [
                            "Flyer Sent"
                        ]
                    );

                }
            );


        default:

            return [];
    }
}


// ============================================================
// GLOBAL EXPORTS
// ============================================================

window.dashboardCalculateStats =
    calculateDashboardStats;

window.calculateDashboardStats =
    calculateDashboardStats;

window.renderDashboardStats =
    renderDashboardStats;

window.updateDashboardStats =
    updateDashboardStats;

window.dashboardGetStatCategory =
    dashboardGetStatCategory;

window.dashboardIsNewCustomer =
    dashboardStatsIsNewCustomer;

window.dashboardIsFirstContact =
    dashboardStatsIsFirstContact;

window.dashboardIsAppointment =
    dashboardStatsIsAppointment;

window.dashboardIsSiteSurvey =
    dashboardStatsIsSiteSurvey;

window.dashboardIsQuotation =
    dashboardStatsIsQuotation;

window.dashboardIsDealClosing =
    dashboardStatsIsDealClosing;

window.dashboardIsNoDeal =
    dashboardStatsIsNoDeal;


// ============================================================
// FSIDashboard NAMESPACE
// ============================================================

if (!window.FSIDashboard) {
    window.FSIDashboard = {};
}

window.FSIDashboard.calculateStats =
    calculateDashboardStats;

window.FSIDashboard.renderStats =
    renderDashboardStats;

window.FSIDashboard.updateStats =
    updateDashboardStats;

window.FSIDashboard.getStatCategory =
    dashboardGetStatCategory;
