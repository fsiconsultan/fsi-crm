```javascript
// ============================================================
// FSI CRM - DASHBOARD STATS
// ============================================================
// File : js/dashboard/dashboard-stats.js
//
// Fungsi:
// 1. Menghitung statistik Dashboard
// 2. Mendukung Admin dan Sales
// 3. Appointment dan Site Survey terpisah
// 4. Quotation
// 5. Deal / Closing
// 6. No Deal
// 7. Compatibility dengan modul Dashboard lama
// ============================================================

(function () {

    "use strict";


    // ========================================================
    // GET LEADS
    // ========================================================

    function getLeads() {

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


    // ========================================================
    // NORMALIZE STATUS
    // ========================================================

    function normalize(value) {

        if (
            typeof window.dashboardNormalizeStatus === "function"
        ) {
            return window.dashboardNormalizeStatus(value);
        }

        return String(value || "")
            .trim()
            .toLowerCase();
    }


    // ========================================================
    // HAS VALUE
    // ========================================================

    function hasValue(value) {

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


    // ========================================================
    // STATUS CHECK
    // ========================================================

    function statusIs(lead, statuses) {

        if (!lead) {
            return false;
        }

        const currentStatus =
            normalize(lead.status);

        return statuses.some(function (status) {

            return (
                currentStatus ===
                normalize(status)
            );

        });
    }


    // ========================================================
    // COUNT STATUS
    // ========================================================

    function countStatus(leads, statuses) {

        return leads.filter(function (lead) {

            return statusIs(
                lead,
                statuses
            );

        }).length;
    }


    // ========================================================
    // COUNT FIELD
    // ========================================================

    function countField(leads, field) {

        return leads.filter(function (lead) {

            return hasValue(
                lead && lead[field]
            );

        }).length;
    }


    // ========================================================
    // NEW CUSTOMER
    // ========================================================

    function isNewCustomer(lead) {

        return statusIs(
            lead,
            [
                "New Customer",
                "New"
            ]
        );
    }


    function countNewCustomer(leads) {

        return leads.filter(function (lead) {

            return isNewCustomer(lead);

        }).length;
    }


    // ========================================================
    // FIRST CONTACT
    // ========================================================

    function isFirstContact(lead) {

        return statusIs(
            lead,
            [
                "First Contact",
                "Interested"
            ]
        );
    }


    function countFirstContact(leads) {

        return leads.filter(function (lead) {

            return isFirstContact(lead);

        }).length;
    }


    // ========================================================
    // APPOINTMENT
    // ========================================================

    function isAppointment(lead) {

        if (!lead) {
            return false;
        }


        /*
         * Appointment field.
         */

        if (
            hasValue(lead.appointment)
        ) {
            return true;
        }


        /*
         * New status.
         */

        if (
            statusIs(
                lead,
                [
                    "Appointment"
                ]
            )
        ) {
            return true;
        }


        /*
         * Legacy status.
         */

        return statusIs(
            lead,
            [
                "First Meeting",
                "First Meeting / Appointment / Site Survey",
                "Follow Up"
            ]
        );
    }


    function countAppointment(leads) {

        return leads.filter(function (lead) {

            return isAppointment(lead);

        }).length;
    }


    // ========================================================
    // SITE SURVEY
    // ========================================================

    function isSiteSurvey(lead) {

        if (!lead) {
            return false;
        }


        if (
            hasValue(lead.site_survey)
        ) {
            return true;
        }


        return statusIs(
            lead,
            [
                "Site Survey"
            ]
        );
    }


    function countSiteSurvey(leads) {

        return leads.filter(function (lead) {

            return isSiteSurvey(lead);

        }).length;
    }


    // ========================================================
    // QUOTATION
    // ========================================================

    function isQuotation(lead) {

        if (!lead) {
            return false;
        }


        if (
            hasValue(lead.quotation)
        ) {
            return true;
        }


        return statusIs(
            lead,
            [
                "Quotation"
            ]
        );
    }


    function countQuotation(leads) {

        return leads.filter(function (lead) {

            return isQuotation(lead);

        }).length;
    }


    // ========================================================
    // DEAL / CLOSING
    // ========================================================

    function isDealClosing(lead) {

        if (!lead) {
            return false;
        }


        if (
            hasValue(lead.closing)
        ) {
            return true;
        }


        return statusIs(
            lead,
            [
                "Deal",
                "Deal / Closing",
                "Closing",
                "SPK"
            ]
        );
    }


    function countDealClosing(leads) {

        return leads.filter(function (lead) {

            return isDealClosing(lead);

        }).length;
    }


    // ========================================================
    // NO DEAL
    // ========================================================

    function isNoDeal(lead) {

        return statusIs(
            lead,
            [
                "No Deal",
                "Not Interested"
            ]
        );
    }


    function countNoDeal(leads) {

        return leads.filter(function (lead) {

            return isNoDeal(lead);

        }).length;
    }


    // ========================================================
    // CALCULATE STATS
    // ========================================================

    function calculateDashboardStats(leads) {

        const list =
            Array.isArray(leads)
                ? leads
                : [];


        const stats = {

            // Main statistics

            total:
                list.length,

            newCustomer:
                countNewCustomer(list),

            firstContact:
                countFirstContact(list),

            appointment:
                countAppointment(list),

            siteSurvey:
                countSiteSurvey(list),

            quotation:
                countQuotation(list),

            dealClosing:
                countDealClosing(list),

            noDeal:
                countNoDeal(list),


            // Activity fields

            appointmentActivity:
                countField(
                    list,
                    "appointment"
                ),

            siteSurveyActivity:
                countField(
                    list,
                    "site_survey"
                ),

            quotationActivity:
                countField(
                    list,
                    "quotation"
                ),

            closingActivity:
                countField(
                    list,
                    "closing"
                )
        };


        // ====================================================
        // LEGACY COMPATIBILITY
        // ====================================================

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
            countStatus(
                list,
                [
                    "Flyer Sent"
                ]
            );


        // ====================================================
        // GLOBAL STATE
        // ====================================================

        if (!window.FSIDashboard) {
            window.FSIDashboard = {};
        }


        window.FSIDashboard.stats =
            stats;


        window.FSIDashboard.statusStats =
            stats;


        return stats;
    }


    // ========================================================
    // SET VALUE
    // ========================================================

    function setValue(id, value) {

        const element =
            document.getElementById(id);


        if (!element) {
            return;
        }


        element.textContent =
            Number(value || 0)
                .toLocaleString("en-US");
    }


    // ========================================================
    // RENDER STATS
    // ========================================================

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
                        : getLeads()
                );
        }


        if (!stats) {
            return;
        }


        // ====================================================
        // NEW DASHBOARD
        // ====================================================

        setValue(
            "statTotal",
            stats.total
        );


        setValue(
            "statNew",
            stats.newCustomer
        );


        setValue(
            "statInterested",
            stats.firstContact
        );


        setValue(
            "statAppointment",
            stats.appointment
        );


        setValue(
            "statSiteSurvey",
            stats.siteSurvey
        );


        setValue(
            "statQuotation",
            stats.quotation
        );


        setValue(
            "statSPK",
            stats.dealClosing
        );


        setValue(
            "statNotInterested",
            stats.noDeal
        );


        // ====================================================
        // OPTIONAL NEW IDS
        // ====================================================

        setValue(
            "statNewCustomer",
            stats.newCustomer
        );


        setValue(
            "statFirstContact",
            stats.firstContact
        );


        setValue(
            "statDealClosing",
            stats.dealClosing
        );


        setValue(
            "statNoDeal",
            stats.noDeal
        );


        // ====================================================
        // LEGACY IDS
        // ====================================================

        setValue(
            "statFollowUp",
            stats.appointment
        );


        setValue(
            "statClosing",
            stats.dealClosing
        );


        setValue(
            "statFlyerSent",
            stats.flyerSent
        );


        // ====================================================
        // SALES COUNT
        // ====================================================

        setValue(
            "dashboardSalesAllCount",
            stats.total
        );


        setValue(
            "dashboardAllSalesCount",
            stats.total
        );


        return stats;
    }


    // ========================================================
    // UPDATE STATS
    // ========================================================

    function updateDashboardStats(leads) {

        const list =
            Array.isArray(leads)
                ? leads
                : getLeads();


        const stats =
            calculateDashboardStats(
                list
            );


        renderDashboardStats(
            stats
        );


        return stats;
    }


    // ========================================================
    // STAT CATEGORY
    // ========================================================

    function dashboardGetStatCategory(
        category,
        leads
    ) {

        const list =
            Array.isArray(leads)
                ? leads
                : getLeads();


        switch (category) {

            case "total":

                return list;


            case "new":
            case "newCustomer":

                return list.filter(
                    function (lead) {

                        return isNewCustomer(
                            lead
                        );

                    }
                );


            case "firstContact":
            case "interested":

                return list.filter(
                    function (lead) {

                        return isFirstContact(
                            lead
                        );

                    }
                );


            case "appointment":
            case "followUp":

                return list.filter(
                    function (lead) {

                        return isAppointment(
                            lead
                        );

                    }
                );


            case "siteSurvey":

                return list.filter(
                    function (lead) {

                        return isSiteSurvey(
                            lead
                        );

                    }
                );


            case "quotation":

                return list.filter(
                    function (lead) {

                        return isQuotation(
                            lead
                        );

                    }
                );


            case "closing":
            case "deal":
            case "dealClosing":
            case "spk":

                return list.filter(
                    function (lead) {

                        return isDealClosing(
                            lead
                        );

                    }
                );


            case "noDeal":
            case "notInterested":

                return list.filter(
                    function (lead) {

                        return isNoDeal(
                            lead
                        );

                    }
                );


            case "flyerSent":

                return list.filter(
                    function (lead) {

                        return statusIs(
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


    // ========================================================
    // GLOBAL EXPORTS
    // ========================================================

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
        isNewCustomer;


    window.dashboardIsFirstContact =
        isFirstContact;


    window.dashboardIsAppointment =
        isAppointment;


    window.dashboardIsSiteSurvey =
        isSiteSurvey;


    window.dashboardIsQuotation =
        isQuotation;


    window.dashboardIsDealClosing =
        isDealClosing;


    window.dashboardIsNoDeal =
        isNoDeal;


    // ========================================================
    // FSIDashboard NAMESPACE
    // ========================================================

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


})();
```
