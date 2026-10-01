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
// 7. Support current CRM status system
// 8. Legacy compatibility
//
// CURRENT CRM STATUS SYSTEM:
// - New
// - First Contact
// - First Meeting / Appointment / Site Survey
// - Quotation
// - Second Appointment
// - Deal
// - No Deal
//
// IMPORTANT:
// - Dashboard status cards menggunakan lead.status
// - Field activity TIDAK mengubah status utama
// - Stat card langsung menuju Leads
// - Tidak membuka popup
// - Tidak menjalankan updateDashboard()
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
        typeof window.dashboardNormalizeStatus ===
        "function"
    ) {
        return window.dashboardNormalizeStatus(value);
    }

    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
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

    if (!Array.isArray(leads)) {
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
//
// Ini hanya untuk activity statistics.
// Tidak digunakan untuk menentukan status utama.
// ============================================================

function dashboardStatsCountField(
    leads,
    field
) {

    if (!Array.isArray(leads)) {
        return 0;
    }

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
//
// Current database status:
// New
//
// "New Customer" tetap didukung untuk compatibility.
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
//
// Current database status:
// First Contact
//
// "Interested" hanya compatibility legacy.
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
//
// Current CRM:
// First Meeting / Appointment / Site Survey
// Second Appointment
// Appointment
//
// IMPORTANT:
// Jangan menggunakan lead.appointment di sini.
// Dashboard status harus berdasarkan lead.status.
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

            // Legacy compatibility
            "First Meeting",
            "Follow Up"
        ]
    );
}


// ============================================================
// SITE SURVEY
// ============================================================
//
// IMPORTANT:
// Site Survey sebagai STAT STATUS tidak lagi dipisahkan
// dari status utama "First Meeting / Appointment / Site Survey".
//
// Karena itu kartu Site Survey menggunakan activity field.
//
// Dengan cara ini:
// - Appointment = status pipeline
// - Site Survey = activity yang benar-benar diisi
//
// ============================================================

function dashboardStatsIsSiteSurvey(
    lead
) {

    if (!lead) {
        return false;
    }

    // Activity field
    if (
        dashboardStatsHasValue(
            lead.site_survey
        )
    ) {
        return true;
    }

    // Compatibility jika ada status lama
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
//
// Main dashboard status:
// Quotation
//
// Jika quotation field terisi tetapi status belum Quotation,
// kita TIDAK mengubah kategori status utama.
//
// Untuk compatibility, fungsi ini tetap mengenali
// quotation activity.
// ============================================================

function dashboardStatsIsQuotation(
    lead
) {

    if (!lead) {
        return false;
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
//
// Current CRM status:
// Deal
//
// Legacy:
// Deal / Closing
// Closing
// SPK
//
// IMPORTANT:
// closing field tidak menentukan status utama.
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
// CALCULATE DASHBOARD STATS
// ============================================================

function calculateDashboardStats(
    leads
) {

    const list =
        Array.isArray(leads)
            ? leads
            : [];


    // ========================================================
    // MAIN STATUS STATISTICS
    // ========================================================
    //
    // Semua angka pipeline utama dihitung dari lead.status.
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

        newCustomer:
            list.filter(
                dashboardStatsIsNewCustomer
            ).length,


        // ----------------------------------------------------
        // FIRST CONTACT
        // ----------------------------------------------------

        firstContact:
            list.filter(
                dashboardStatsIsFirstContact
            ).length,


        // ----------------------------------------------------
        // APPOINTMENT
        // ----------------------------------------------------

        appointment:
            list.filter(
                dashboardStatsIsAppointment
            ).length,


        // ----------------------------------------------------
        // SITE SURVEY
        // ----------------------------------------------------
        //
        // Activity count.
        // ----------------------------------------------------

        siteSurvey:
            list.filter(
                dashboardStatsIsSiteSurvey
            ).length,


        // ----------------------------------------------------
        // QUOTATION
        // ----------------------------------------------------

        quotation:
            list.filter(
                dashboardStatsIsQuotation
            ).length,


        // ----------------------------------------------------
        // DEAL
        // ----------------------------------------------------

        dealClosing:
            list.filter(
                dashboardStatsIsDealClosing
            ).length,


        // ----------------------------------------------------
        // NO DEAL
        // ----------------------------------------------------

        noDeal:
            list.filter(
                dashboardStatsIsNoDeal
            ).length,


        // ====================================================
        // ACTIVITY COUNTS
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


    switch (
        String(category || "")
            .trim()
            .toLowerCase()
    ) {

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


        case "flyersent":

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
// DASHBOARD SELECTED SALES
// ============================================================

function dashboardStatsGetSelectedSalesId() {

    // --------------------------------------------------------
    // Primary source
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
    // Secondary source
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
    // PRIMARY NAVIGATION
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
    // FALLBACK SESSION STORAGE
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


    const selectedSalesId =
        dashboardStatsGetSelectedSalesId();


    // ========================================================
    // TOTAL
    // ========================================================

    if (
        normalizedCategory ===
        "total"
    ) {

        dashboardStatsOpenLeadsWithFilters({

            salesId:
                selectedSalesId,

            status:
                ""

        });

        return;
    }


    // ========================================================
    // NEW CUSTOMER
    // ========================================================
    //
    // Database status = New
    // ========================================================

    if (
        normalizedCategory === "new" ||
        normalizedCategory === "newcustomer"
    ) {

        dashboardStatsOpenLeadsWithFilters({

            salesId:
                selectedSalesId,

            status:
                "New"

        });

        return;
    }


    // ========================================================
    // FIRST CONTACT
    // ========================================================
    //
    // Database status = First Contact
    // ========================================================

    if (
        normalizedCategory === "firstcontact" ||
        normalizedCategory === "interested"
    ) {

        dashboardStatsOpenLeadsWithFilters({

            salesId:
                selectedSalesId,

            status:
                "First Contact"

        });

        return;
    }


    // ========================================================
    // APPOINTMENT
    // ========================================================
    //
    // Dashboard appointment mewakili dua status:
    //
    // First Meeting / Appointment / Site Survey
    // Second Appointment
    //
    // Karena filter Leads hanya menerima satu status,
    // gunakan status pertama sebagai default.
    // ========================================================

    if (
        normalizedCategory === "appointment" ||
        normalizedCategory === "followup"
    ) {

        dashboardStatsOpenLeadsWithFilters({

            salesId:
                selectedSalesId,

            status:
                "First Meeting / Appointment / Site Survey"

        });

        return;
    }


    // ========================================================
    // SITE SURVEY
    // ========================================================
    //
    // Site Survey merupakan activity field.
    //
    // Leads filter berbasis status tidak bisa secara langsung
    // memfilter field site_survey.
    //
    // Karena itu kita buka Leads tanpa memaksakan status yang
    // salah.
    // ========================================================

    if (
        normalizedCategory === "sitesurvey"
    ) {

        dashboardStatsOpenLeadsWithFilters({

            salesId:
                selectedSalesId,

            status:
                ""

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
                selectedSalesId,

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
                selectedSalesId,

            status:
                "Deal"

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
                selectedSalesId,

            status:
                "No Deal"

        });

        return;
    }


    // ========================================================
    // UNKNOWN
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


    const selectors = [
        "[data-stat-card]",
        ".stat-card",
        ".dashboard-stat-card",
        ".stat-item",
        ".stat-box",
        ".overview-stat",
        ".dashboard-stat"
    ].join(",");


    const directCard =
        element.closest(
            selectors
        );


    if (directCard) {
        return directCard;
    }


    if (
        element.matches &&
        element.matches(
            selectors
        )
    ) {

        return element;
    }


    return null;
}


// ============================================================
// BIND STAT CARD CLICKS
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


            let category =
                dashboardStatsGetCategoryFromElement(
                    card
                );


            if (!category) {

                category =
                    dashboardStatsGetCategoryFromElement(
                        target
                    );
            }


            if (!category) {
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
// APPLY CLICKABLE STATE
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
// INITIALIZE STAT CARDS
// ============================================================

function dashboardInitializeStatCards() {

    dashboardBindStatCardClicks();

    dashboardBindStatCardKeyboard();

    dashboardStatsPrepareCards();
}


// ============================================================
// AUTO INITIALIZE
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
// FSI DASHBOARD NAMESPACE
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
