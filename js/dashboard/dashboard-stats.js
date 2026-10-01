// ============================================================
// FSI CRM - DASHBOARD STATS
// ============================================================
// File : js/dashboard/dashboard-stats.js
//
// Fungsi:
// 1. Calculate dashboard statistics
// 2. Render dashboard statistics
// 3. Get leads by statistic category
// 4. Handle statistic card click
// 5. Open Leads page with selected filters
// 6. Preserve selected Sales filter
// 7. Legacy compatibility
//
// IMPORTANT:
// - Stat card TIDAK membuka popup
// - Stat card TIDAK menjalankan updateDashboard()
// - Stat card langsung menuju Leads
// - Filter Sales dari Dashboard tetap dipertahankan
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

        // ====================================================
        // MAIN STATISTICS
        // ====================================================

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


        // ====================================================
        // ACTIVITY FIELDS
        // ====================================================

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
    // LEGACY SALES COUNT
    //
    // Tetap di-render untuk compatibility.
    // ALL SALES card sendiri sudah dihapus dari dashboard.js.
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

        // ====================================================
        // TOTAL
        // ====================================================

        case "total":

            return list;


        // ====================================================
        // NEW CUSTOMER
        // ====================================================

        case "new":
        case "newCustomer":

            return list.filter(
                dashboardStatsIsNewCustomer
            );


        // ====================================================
        // FIRST CONTACT
        // ====================================================

        case "firstContact":
        case "interested":

            return list.filter(
                dashboardStatsIsFirstContact
            );


        // ====================================================
        // APPOINTMENT
        // ====================================================

        case "appointment":
        case "followUp":

            return list.filter(
                dashboardStatsIsAppointment
            );


        // ====================================================
        // SITE SURVEY
        // ====================================================

        case "siteSurvey":

            return list.filter(
                dashboardStatsIsSiteSurvey
            );


        // ====================================================
        // QUOTATION
        // ====================================================

        case "quotation":

            return list.filter(
                dashboardStatsIsQuotation
            );


        // ====================================================
        // DEAL / CLOSING
        // ====================================================

        case "closing":
        case "deal":
        case "dealClosing":
        case "spk":

            return list.filter(
                dashboardStatsIsDealClosing
            );


        // ====================================================
        // NO DEAL
        // ====================================================

        case "noDeal":
        case "notInterested":

            return list.filter(
                dashboardStatsIsNoDeal
            );


        // ====================================================
        // FLYER SENT
        // ====================================================

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


        // ====================================================
        // UNKNOWN
        // ====================================================

        default:

            return [];
    }
}


// ============================================================
// DASHBOARD SELECTED SALES
// ============================================================

function dashboardStatsGetSelectedSalesId() {

    // --------------------------------------------------------
    // Primary source:
    // dashboard.js
    // --------------------------------------------------------

    if (
        typeof window.dashboardGetSelectedSalesId ===
        "function"
    ) {

        const value =
            window.dashboardGetSelectedSalesId();

        if (
            value !== null &&
            value !== undefined &&
            String(value).trim() !== ""
        ) {
            return String(value).trim();
        }
    }


    // --------------------------------------------------------
    // Secondary source:
    // global state
    // --------------------------------------------------------

    if (
        window.crmSelectedSalesId !== null &&
        window.crmSelectedSalesId !== undefined &&
        String(window.crmSelectedSalesId).trim() !== ""
    ) {

        return String(
            window.crmSelectedSalesId
        ).trim();
    }


    // --------------------------------------------------------
    // No Sales selected
    // --------------------------------------------------------

    return "";
}


// ============================================================
// NORMALIZE DASHBOARD STAT FILTER
// ============================================================

function dashboardStatsNormalizeFilterStatus(
    status
) {

    if (
        status === null ||
        status === undefined
    ) {
        return "";
    }

    return String(status)
        .trim();
}


// ============================================================
// OPEN LEADS WITH STAT FILTER
// ============================================================
//
// IMPORTANT:
// Jangan:
// - updateDashboard()
// - reload Dashboard
// - popup
// - render customer list
//
// Langsung simpan filter ke sessionStorage lalu buka Leads.
// ============================================================

function dashboardStatsOpenLeadsWithFilters(
    options
) {

    const config =
        options &&
        typeof options === "object"
            ? options
            : {};


    const salesId =
        config.salesId !== undefined &&
        config.salesId !== null
            ? String(config.salesId).trim()
            : "";


    const status =
        dashboardStatsNormalizeFilterStatus(
            config.status
        );


    // ========================================================
    // USE EXISTING DASHBOARD NAVIGATION FUNCTION
    // ========================================================
    //
    // dashboard.js sudah mempunyai fungsi:
    // dashboardOpenLeadsWithFilters()
    //
    // Kita gunakan itu kalau tersedia.
    // Ini menjaga semua logic existing tetap satu pintu.
    // ========================================================

    if (
        typeof window.dashboardOpenLeadsWithFilters ===
        "function"
    ) {

        window.dashboardOpenLeadsWithFilters({
            salesId:
                salesId,

            status:
                status
        });

        return true;
    }


    // ========================================================
    // FALLBACK
    // ========================================================
    //
    // Kalau dashboard.js belum termuat, tetap simpan filter.
    // ========================================================

    try {

        sessionStorage.setItem(
            "fsi_dashboard_leads_filter",
            JSON.stringify({

                salesId:
                    salesId,

                status:
                    status
            })
        );

    } catch (error) {

        console.error(
            "FSI CRM: unable to save dashboard Leads filter.",
            error
        );

    }


    // ========================================================
    // FALLBACK NAVIGATION
    // ========================================================

    try {

        if (
            typeof window.navigateTo ===
            "function"
        ) {

            window.navigateTo(
                "leads"
            );

            return true;
        }


        if (
            typeof window.showPage ===
            "function"
        ) {

            window.showPage(
                "leads"
            );

            return true;
        }


        // ----------------------------------------------------
        // Last fallback
        // ----------------------------------------------------

        const currentPath =
            String(
                window.location.pathname || ""
            );


        if (
            currentPath.endsWith(
                "leads.html"
            )
        ) {

            window.location.reload();

            return true;
        }


        window.location.href =
            "pages/leads.html";

        return true;

    } catch (error) {

        console.error(
            "FSI CRM: failed to open Leads from dashboard stat.",
            error
        );

        return false;
    }
}


// ============================================================
// OPEN LEADS FROM STAT CARD
// ============================================================

function dashboardStatsOpenCategory(
    category
) {

    const normalizedCategory =
        String(
            category || ""
        )
            .trim()
            .toLowerCase();


    // ========================================================
    // TOTAL
    // ========================================================

    if (
        normalizedCategory ===
        "total"
    ) {

        dashboardStatsOpenLeadsWithFilters({

            salesId:
                dashboardStatsGetSelectedSalesId(),

            status:
                ""
        });

        return;
    }


    // ========================================================
    // NEW CUSTOMER
    // ========================================================

    if (
        normalizedCategory === "new" ||
        normalizedCategory === "newcustomer"
    ) {

        dashboardStatsOpenLeadsWithFilters({

            salesId:
                dashboardStatsGetSelectedSalesId(),

            status:
                "New Customer"
        });

        return;
    }


    // ========================================================
    // FIRST CONTACT
    // ========================================================

    if (
        normalizedCategory === "firstcontact" ||
        normalizedCategory === "interested"
    ) {

        dashboardStatsOpenLeadsWithFilters({

            salesId:
                dashboardStatsGetSelectedSalesId(),

            status:
                "First Contact"
        });

        return;
    }


    // ========================================================
    // APPOINTMENT
    // ========================================================

    if (
        normalizedCategory === "appointment" ||
        normalizedCategory === "followup"
    ) {

        dashboardStatsOpenLeadsWithFilters({

            salesId:
                dashboardStatsGetSelectedSalesId(),

            status:
                "Appointment"
        });

        return;
    }


    // ========================================================
    // SITE SURVEY
    // ========================================================

    if (
        normalizedCategory === "sitesurvey"
    ) {

        dashboardStatsOpenLeadsWithFilters({

            salesId:
                dashboardStatsGetSelectedSalesId(),

            status:
                "Site Survey"
        });

        return;
    }


    // ========================================================
    // QUOTATION
    // ========================================================

    if (
        normalizedCategory === "quotation"
    ) {

        dashboardStatsOpenLeadsWithFilters({

            salesId:
                dashboardStatsGetSelectedSalesId(),

            status:
                "Quotation"
        });

        return;
    }


    // ========================================================
    // DEAL / CLOSING
    // ========================================================

    if (
        normalizedCategory === "deal" ||
        normalizedCategory === "dealclosing" ||
        normalizedCategory === "closing" ||
        normalizedCategory === "spk"
    ) {

        dashboardStatsOpenLeadsWithFilters({

            salesId:
                dashboardStatsGetSelectedSalesId(),

            status:
                "Deal / Closing"
        });

        return;
    }


    // ========================================================
    // NO DEAL
    // ========================================================

    if (
        normalizedCategory === "nodeal" ||
        normalizedCategory === "notinterested"
    ) {

        dashboardStatsOpenLeadsWithFilters({

            salesId:
                dashboardStatsGetSelectedSalesId(),

            status:
                "No Deal"
        });

        return;
    }


    // ========================================================
    // UNKNOWN CATEGORY
    // ========================================================

    console.warn(
        "FSI CRM: unknown dashboard stat category:",
        category
    );
}


// ============================================================
// GET CATEGORY FROM STAT ELEMENT
// ============================================================

function dashboardStatsGetCategoryFromElement(
    element
) {

    if (!element) {
        return "";
    }


    // ========================================================
    // DATA ATTRIBUTES
    // ========================================================

    const dataCategory =
        element.getAttribute(
            "data-stat"
        ) ||
        element.getAttribute(
            "data-category"
        ) ||
        element.getAttribute(
            "data-stat-category"
        );


    if (dataCategory) {
        return dataCategory;
    }


    // ========================================================
    // ID MAPPING
    // ========================================================

    const id =
        element.id || "";


    const idMap = {

        statTotal:
            "total",

        statNew:
            "newCustomer",

        statNewCustomer:
            "newCustomer",

        statInterested:
            "firstContact",

        statFirstContact:
            "firstContact",

        statAppointment:
            "appointment",

        statSiteSurvey:
            "siteSurvey",

        statQuotation:
            "quotation",

        statSPK:
            "dealClosing",

        statDealClosing:
            "dealClosing",

        statNotInterested:
            "noDeal",

        statNoDeal:
            "noDeal",

        statFollowUp:
            "appointment",

        statClosing:
            "dealClosing",

        statFlyerSent:
            "flyerSent"
    };


    if (
        Object.prototype.hasOwnProperty.call(
            idMap,
            id
        )
    ) {

        return idMap[id];
    }


    return "";
}


// ============================================================
// FIND STAT CARD
// ============================================================

function dashboardStatsFindCard(
    element
) {

    if (!element) {
        return null;
    }


    // ========================================================
    // Direct known selectors
    // ========================================================

    const directCard =
        element.closest(
            [
                "[data-stat-card]",
                ".stat-card",
                ".dashboard-stat-card",
                ".stat-item",
                ".stat-box",
                ".overview-stat",
                ".dashboard-stat"
            ].join(",")
        );


    if (directCard) {
        return directCard;
    }


    // ========================================================
    // If element itself is a card
    // ========================================================

    if (
        element.matches &&
        element.matches(
            [
                "[data-stat-card]",
                ".stat-card",
                ".dashboard-stat-card",
                ".stat-item",
                ".stat-box",
                ".overview-stat",
                ".dashboard-stat"
            ].join(",")
        )
    ) {

        return element;
    }


    return null;
}


// ============================================================
// BIND STAT CARD CLICKS
// ============================================================
//
// This function is deliberately event-delegated.
//
// Advantages:
// - tidak perlu bind satu-satu
// - aman kalau card di-render ulang
// - tidak menyebabkan duplicate listener
// - tidak menjalankan updateDashboard()
// ============================================================

let dashboardStatsClickBound =
    false;


function dashboardBindStatCardClicks() {

    if (dashboardStatsClickBound) {
        return;
    }


    dashboardStatsClickBound =
        true;


    document.addEventListener(
        "click",
        function (event) {

            if (!event) {
                return;
            }


            const target =
                event.target;


            if (!target) {
                return;
            }


            const card =
                dashboardStatsFindCard(
                    target
                );


            if (!card) {
                return;
            }


            // ------------------------------------------------
            // Jangan menangkap click dari button/link internal
            // ------------------------------------------------

            const internalInteractive =
                target.closest(
                    "button, a, input, select, textarea"
                );


            if (
                internalInteractive &&
                internalInteractive !== card
            ) {

                return;
            }


            // ------------------------------------------------
            // Get category
            // ------------------------------------------------

            let category =
                dashboardStatsGetCategoryFromElement(
                    card
                );


            // ------------------------------------------------
            // Kalau tidak ada di card,
            // cari dari target
            // ------------------------------------------------

            if (!category) {

                category =
                    dashboardStatsGetCategoryFromElement(
                        target
                    );
            }


            if (!category) {
                return;
            }


            // ------------------------------------------------
            // Stop default behavior
            // ------------------------------------------------

            event.preventDefault();
            event.stopPropagation();


            // ------------------------------------------------
            // IMPORTANT:
            // Tidak menjalankan updateDashboard()
            // Tidak membuka popup
            // ------------------------------------------------

            dashboardStatsOpenCategory(
                category
            );

        },
        false
    );
}


// ============================================================
// APPLY CLICKABLE STATE TO STAT CARDS
// ============================================================

function dashboardStatsPrepareCards() {

    const selectors = [

        "[data-stat-card]",

        ".stat-card",

        ".dashboard-stat-card",

        ".stat-item",

        ".stat-box",

        ".overview-stat",

        ".dashboard-stat"

    ];


    const cards =
        document.querySelectorAll(
            selectors.join(",")
        );


    cards.forEach(
        function (card) {

            const category =
                dashboardStatsGetCategoryFromElement(
                    card
                );


            if (!category) {
                return;
            }


            card.setAttribute(
                "data-stat-clickable",
                "true"
            );


            // ------------------------------------------------
            // Accessibility
            // ------------------------------------------------

            if (
                !card.hasAttribute(
                    "role"
                )
            ) {

                card.setAttribute(
                    "role",
                    "button"
                );
            }


            if (
                !card.hasAttribute(
                    "tabindex"
                )
            ) {

                card.setAttribute(
                    "tabindex",
                    "0"
                );
            }

        }
    );
}


// ============================================================
// KEYBOARD SUPPORT
// ============================================================

let dashboardStatsKeyboardBound =
    false;


function dashboardBindStatCardKeyboard() {

    if (dashboardStatsKeyboardBound) {
        return;
    }


    dashboardStatsKeyboardBound =
        true;


    document.addEventListener(
        "keydown",
        function (event) {

            if (!event) {
                return;
            }


            if (
                event.key !== "Enter" &&
                event.key !== " "
            ) {

                return;
            }


            const target =
                event.target;


            if (!target) {
                return;
            }


            const card =
                dashboardStatsFindCard(
                    target
                );


            if (!card) {
                return;
            }


            const category =
                dashboardStatsGetCategoryFromElement(
                    card
                );


            if (!category) {
                return;
            }


            event.preventDefault();


            dashboardStatsOpenCategory(
                category
            );

        },
        false
    );
}


// ============================================================
// INITIALIZE STAT CARD INTERACTIONS
// ============================================================

function dashboardInitializeStatCards() {

    dashboardBindStatCardClicks();

    dashboardBindStatCardKeyboard();

    dashboardStatsPrepareCards();
}


// ============================================================
// AUTO INITIALIZE
// ============================================================
//
// DOMContentLoaded:
// Dashboard HTML sudah tersedia.
// ============================================================

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            dashboardInitializeStatCards();

        }
    );

} else {

    dashboardInitializeStatCards();
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
// STAT CARD NAVIGATION EXPORTS
// ============================================================

window.dashboardStatsOpenCategory =
    dashboardStatsOpenCategory;

window.dashboardStatsOpenLeadsWithFilters =
    dashboardStatsOpenLeadsWithFilters;

window.dashboardBindStatCardClicks =
    dashboardBindStatCardClicks;

window.dashboardInitializeStatCards =
    dashboardInitializeStatCards;


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

window.FSIDashboard.openStatCategory =
    dashboardStatsOpenCategory;

window.FSIDashboard.openLeadsWithFilters =
    dashboardStatsOpenLeadsWithFilters;
