// ============================================================
// FSI CRM - DASHBOARD STATS
// ============================================================
// File : js/dashboard/dashboard-stats.js
//
// Dashboard statistics + stat card navigation
//
// CURRENT STATUS:
// New
// First Contact
// First Meeting / Appointment / Site Survey
// Quotation
// Second Appointment
// Deal
// No Deal
//
// IMPORTANT:
// - Card tidak memanggil updateDashboard()
// - Card tidak memanggil loadLeads() langsung
// - Card hanya mengirim filter ke Leads
// - Tidak ada recursive dashboard navigation
// ============================================================


// ============================================================
// GET DASHBOARD LEADS
// ============================================================

function dashboardStatsGetLeads() {

    if (
        window.FSIDashboard &&
        Array.isArray(
            window.FSIDashboard.leads
        )
    ) {
        return window.FSIDashboard.leads;
    }


    if (
        Array.isArray(
            window.leadsData
        )
    ) {
        return window.leadsData;
    }


    return [];
}


// ============================================================
// NORMALIZE STATUS
// ============================================================

function dashboardStatsNormalize(
    value
) {

    if (
        typeof window.dashboardNormalizeStatus ===
        "function"
    ) {

        return window.dashboardNormalizeStatus(
            value
        );
    }


    return String(
        value || ""
    )
        .trim()
        .toLowerCase()
        .replace(
            /\s+/g,
            " "
        );
}


// ============================================================
// HAS VALUE
// ============================================================

function dashboardStatsHasValue(
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
// STATUS CHECK
// ============================================================

function dashboardStatsStatusIs(
    lead,
    statuses
) {

    if (
        !lead ||
        !Array.isArray(statuses)
    ) {
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
                dashboardStatsNormalize(
                    status
                )
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

    if (
        !Array.isArray(leads)
    ) {
        return 0;
    }


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

    if (
        !Array.isArray(leads)
    ) {
        return 0;
    }


    return leads.filter(
        function (lead) {

            return dashboardStatsHasValue(
                lead &&
                lead[field]
            );

        }
    ).length;
}


// ============================================================
// NEW
// ============================================================

function dashboardStatsIsNewCustomer(
    lead
) {

    return dashboardStatsStatusIs(
        lead,
        [
            "New",
            "New Customer"
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

    return dashboardStatsStatusIs(
        lead,
        [
            "First Meeting / Appointment / Site Survey",
            "Second Appointment",
            "Appointment",
            "First Meeting",
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

    return dashboardStatsStatusIs(
        lead,
        [
            "Quotation"
        ]
    );
}


// ============================================================
// DEAL
// ============================================================

function dashboardStatsIsDealClosing(
    lead
) {

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
// CALCULATE STATS
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


    // Legacy
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
// SET VALUE
// ============================================================

function dashboardStatsSetValue(
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
        Number(
            value || 0
        ).toLocaleString(
            "en-US"
        );
}


// ============================================================
// RENDER
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
                Array.isArray(
                    leadsOrStats
                )
                    ? leadsOrStats
                    : dashboardStatsGetLeads()
            );
    }


    if (!stats) {
        return;
    }


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


    // New IDs
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


    // Legacy
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
// UPDATE STATS
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
// GET CATEGORY
// ============================================================

function dashboardGetStatCategory(
    category,
    leads
) {

    const list =
        Array.isArray(leads)
            ? leads
            : dashboardStatsGetLeads();


    const key =
        String(
            category || ""
        )
            .trim()
            .toLowerCase();


    switch (key) {

        case "total":
            return list;


        case "new":
        case "newcustomer":
            return list.filter(
                dashboardStatsIsNewCustomer
            );


        case "firstcontact":
        case "interested":
            return list.filter(
                dashboardStatsIsFirstContact
            );


        case "appointment":
        case "followup":
            return list.filter(
                dashboardStatsIsAppointment
            );


        case "sitesurvey":
            return list.filter(
                dashboardStatsIsSiteSurvey
            );


        case "quotation":
            return list.filter(
                dashboardStatsIsQuotation
            );


        case "closing":
        case "deal":
        case "dealclosing":
        case "spk":
            return list.filter(
                dashboardStatsIsDealClosing
            );


        case "nodeal":
        case "notinterested":
            return list.filter(
                dashboardStatsIsNoDeal
            );


        default:
            return [];
    }
}


// ============================================================
// GET SELECTED SALES
// ============================================================

function dashboardStatsGetSelectedSalesId() {

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

            return String(
                value
            ).trim();
        }
    }


    if (
        window.crmSelectedSalesId !== null &&
        window.crmSelectedSalesId !== undefined &&
        String(
            window.crmSelectedSalesId
        ).trim() !== ""
    ) {

        return String(
            window.crmSelectedSalesId
        ).trim();
    }


    return "";
}


// ============================================================
// OPEN LEADS WITH FILTER
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
        config.salesId
            ? String(
                config.salesId
            ).trim()
            : "";


    const status =
        config.status
            ? String(
                config.status
            ).trim()
            : "";


    // --------------------------------------------------------
    // IMPORTANT:
    // Hanya kirim event/filter.
    // Jangan memanggil showDashboard().
    // Jangan memanggil updateDashboard().
    // --------------------------------------------------------

    window.FSIDashboardLeadFilter = {

        salesId:
            salesId,

        status:
            status,

        source:
            "dashboard-stat-card",

        timestamp:
            Date.now()
    };


    try {

        sessionStorage.setItem(
            "fsi_dashboard_leads_filter",
            JSON.stringify(
                window.FSIDashboardLeadFilter
            )
        );

    } catch (error) {

        console.warn(
            "FSI CRM: gagal menyimpan dashboard filter.",
            error
        );
    }


    // --------------------------------------------------------
    // Navigate directly to Leads
    // --------------------------------------------------------

    if (
        typeof window.showLeads ===
        "function"
    ) {

        window.showLeads();

        return true;
    }


    if (
        typeof window.navigateDashboard ===
        "function"
    ) {

        window.navigateDashboard(
            "leads"
        );

        return true;
    }


    if (
        typeof window.crmNavigate ===
        "function"
    ) {

        window.crmNavigate(
            "leads"
        );

        return true;
    }


    console.warn(
        "FSI CRM: fungsi navigasi Leads tidak ditemukan."
    );


    return false;
}


// ============================================================
// OPEN CATEGORY
// ============================================================

function dashboardStatsOpenCategory(
    category
) {

    const key =
        String(
            category || ""
        )
            .trim()
            .toLowerCase();


    const salesId =
        dashboardStatsGetSelectedSalesId();


    let status = "";


    switch (key) {

        case "total":

            status = "";
            break;


        case "new":
        case "newcustomer":

            status = "New";
            break;


        case "firstcontact":
        case "interested":

            status = "First Contact";
            break;


        case "appointment":
        case "followup":

            status =
                "First Meeting / Appointment / Site Survey";

            break;


        case "sitesurvey":

            // Activity field.
            // Jangan pakai status Site Survey.
            status = "";

            break;


        case "quotation":

            status = "Quotation";
            break;


        case "deal":
        case "dealclosing":
        case "closing":
        case "spk":

            status = "Deal";
            break;


        case "nodeal":
        case "notinterested":

            status = "No Deal";
            break;


        default:

            console.warn(
                "FSI CRM: kategori Dashboard tidak dikenal:",
                category
            );

            return false;
    }


    return dashboardStatsOpenLeadsWithFilters({

        salesId:
            salesId,

        status:
            status

    });
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


    const card =
        element.closest(
            "[data-stat-card]"
        );


    if (card) {
        return card;
    }


    // Fallback hanya berdasarkan ID statistik.
    const statIds = [

        "statTotal",
        "statNew",
        "statNewCustomer",
        "statInterested",
        "statFirstContact",
        "statAppointment",
        "statSiteSurvey",
        "statQuotation",
        "statSPK",
        "statDealClosing",
        "statNotInterested",
        "statNoDeal",
        "statFollowUp",
        "statClosing"
    ];


    let current =
        element;


    while (
        current &&
        current !== document.body
    ) {

        if (
            current.querySelector &&
            statIds.some(
                function (id) {

                    return Boolean(
                        current.querySelector(
                            "#" + id
                        )
                    );

                }
            )
        ) {

            return current;
        }


        current =
            current.parentElement;
    }


    return null;
}


// ============================================================
// GET CATEGORY FROM CARD
// ============================================================

function dashboardStatsGetCategoryFromElement(
    element
) {

    if (!element) {
        return "";
    }


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


    const statElement =
        element.querySelector
            ? element.querySelector(
                [
                    "#statTotal",
                    "#statNew",
                    "#statNewCustomer",
                    "#statInterested",
                    "#statFirstContact",
                    "#statAppointment",
                    "#statSiteSurvey",
                    "#statQuotation",
                    "#statSPK",
                    "#statDealClosing",
                    "#statNotInterested",
                    "#statNoDeal",
                    "#statFollowUp",
                    "#statClosing"
                ].join(",")
            )
            : null;


    const target =
        statElement ||
        element;


    const id =
        target.id || "";


    const map = {

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
            "dealClosing"
    };


    return map[id] || "";
}


// ============================================================
// BIND CARD CLICK
// ============================================================

let dashboardStatsClickBound =
    false;


function dashboardBindStatCardClicks() {

    if (
        dashboardStatsClickBound
    ) {
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


            const category =
                dashboardStatsGetCategoryFromElement(
                    card
                );


            if (!category) {
                return;
            }


            // Jangan menangkap tombol/link internal.
            const interactive =
                target.closest(
                    "button, a, input, select, textarea"
                );


            if (
                interactive &&
                interactive !== card
            ) {
                return;
            }


            event.preventDefault();
            event.stopPropagation();


            dashboardStatsOpenCategory(
                category
            );

        },
        false
    );
}


// ============================================================
// PREPARE CARDS
// ============================================================

function dashboardStatsPrepareCards() {

    const cards =
        document.querySelectorAll(
            "[data-stat-card]"
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
// KEYBOARD
// ============================================================

let dashboardStatsKeyboardBound =
    false;


function dashboardBindStatCardKeyboard() {

    if (
        dashboardStatsKeyboardBound
    ) {
        return;
    }


    dashboardStatsKeyboardBound =
        true;


    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key !== "Enter" &&
                event.key !== " "
            ) {
                return;
            }


            const card =
                dashboardStatsFindCard(
                    event.target
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
// INITIALIZE
// ============================================================

function dashboardInitializeStatCards() {

    dashboardBindStatCardClicks();

    dashboardBindStatCardKeyboard();

    dashboardStatsPrepareCards();
}


// ============================================================
// DOM READY
// ============================================================

if (
    document.readyState ===
    "loading"
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


window.dashboardStatsOpenCategory =
    dashboardStatsOpenCategory;

window.dashboardStatsOpenLeadsWithFilters =
    dashboardStatsOpenLeadsWithFilters;

window.dashboardBindStatCardClicks =
    dashboardBindStatCardClicks;

window.dashboardInitializeStatCards =
    dashboardInitializeStatCards;


// ============================================================
// FSI DASHBOARD NAMESPACE
// ============================================================

window.FSIDashboard =
    window.FSIDashboard ||
    {};


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
