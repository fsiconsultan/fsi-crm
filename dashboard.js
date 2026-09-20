// ============================================================
// CRM FSI - FAST / OPTIMIZED DASHBOARD
// ============================================================

(function () {
    "use strict";

    // ========================================================
    // CONFIG
    // ========================================================

    var DASHBOARD_REFRESH_MS = 60000;
    var dashboardTimer = null;
    var dashboardLoading = false;
    var lastDashboardLoad = 0;

    // ========================================================
    // HELPERS
    // ========================================================

    function getClient() {
        try {
            if (typeof supabaseClient !== "undefined") {
                return supabaseClient;
            }
        } catch (e) {}

        return null;
    }

    function getProfile() {
        try {
            if (typeof currentProfile !== "undefined") {
                return currentProfile;
            }
        } catch (e) {}

        return null;
    }

    function el(id) {
        return document.getElementById(id);
    }

    function setText(id, value) {
        var element = el(id);

        if (element) {
            element.textContent = value == null ? "0" : String(value);
        }
    }

    function escapeHtml(value) {
        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function normalizeStatus(value) {
        return String(value || "")
            .trim()
            .toLowerCase()
            .replace(/_/g, " ")
            .replace(/-/g, " ")
            .replace(/\s+/g, " ");
    }

    function formatDate(value) {
        if (!value) {
            return "-";
        }

        var date = new Date(value);

        if (isNaN(date.getTime())) {
            return String(value);
        }

        var day = String(date.getDate()).padStart(2, "0");
        var month = String(date.getMonth() + 1).padStart(2, "0");
        var year = date.getFullYear();

        return day + "/" + month + "/" + year;
    }

    function formatDateTime(value) {
        if (!value) {
            return "-";
        }

        var date = new Date(value);

        if (isNaN(date.getTime())) {
            return String(value);
        }

        var day = String(date.getDate()).padStart(2, "0");
        var month = String(date.getMonth() + 1).padStart(2, "0");
        var year = date.getFullYear();

        var hours = String(date.getHours()).padStart(2, "0");
        var minutes = String(date.getMinutes()).padStart(2, "0");

        return (
            day +
            "/" +
            month +
            "/" +
            year +
            " " +
            hours +
            ":" +
            minutes
        );
    }

    function isDashboardVisible() {
        var page = el("dashboardPage");

        if (!page) {
            return false;
        }

        var style = window.getComputedStyle(page);

        return (
            style.display !== "none" &&
            page.offsetParent !== null
        );
    }

    // ========================================================
    // FAST LOADING STATE
    // ========================================================

    function showDashboardLoading() {
        var ids = [
            "dashTotal",
            "dashNew",
            "dashInterested",
            "dashFollowUp",
            "dashAppointment",
            "dashSiteSurvey",
            "dashQuotation",
            "dashClosing"
        ];

        for (var i = 0; i < ids.length; i++) {
            var element = el(ids[i]);

            if (element && !element.textContent.trim()) {
                element.textContent = "...";
            }
        }
    }

    function hideDashboardLoading() {
        // Sengaja kosong.
        // Angka langsung diganti ketika data selesai.
    }

    // ========================================================
    // STATUS MATCHING
    // ========================================================

    function isNewStatus(status) {
        return (
            status === "new" ||
            status === "belum dihubungi"
        );
    }

    function isInterestedStatus(status) {
        return (
            status === "interested" ||
            status === "tertarik"
        );
    }

    function isFollowUpStatus(status) {
        return (
            status === "follow up" ||
            status === "followup"
        );
    }

    function isClosingStatus(status) {
        return status === "closing";
    }

    // ========================================================
    // DASHBOARD HTML
    // ========================================================

    function ensureDashboardStructure() {
        var page = el("dashboardPage");

        if (!page) {
            return;
        }

        /*
         * Jangan menghapus HTML dashboard yang sudah dibuat
         * di index.html.
         *
         * Fungsi ini hanya membuat container jika belum ada.
         */

        var content = el("dashboardDynamicContent");

        if (!content) {
            content = document.createElement("div");
            content.id = "dashboardDynamicContent";

            page.appendChild(content);
        }
    }

    // ========================================================
    // STATS
    // ========================================================

    function calculateStats(leads) {
        var stats = {
            total: leads.length,
            newCount: 0,
            interested: 0,
            followUp: 0,
            appointment: 0,
            siteSurvey: 0,
            quotation: 0,
            closing: 0
        };

        for (var i = 0; i < leads.length; i++) {
            var lead = leads[i] || {};
            var status = normalizeStatus(lead.status);

            if (isNewStatus(status)) {
                stats.newCount++;
            }

            if (isInterestedStatus(status)) {
                stats.interested++;
            }

            if (isFollowUpStatus(status)) {
                stats.followUp++;
            }

            if (isClosingStatus(status)) {
                stats.closing++;
            }

            if (lead.appointment) {
                stats.appointment++;
            }

            if (lead.site_survey) {
                stats.siteSurvey++;
            }

            if (lead.quotation) {
                stats.quotation++;
            }
        }

        return stats;
    }

    function renderStats(stats) {
        setText("dashTotal", stats.total);
        setText("dashNew", stats.newCount);
        setText("dashInterested", stats.interested);
        setText("dashFollowUp", stats.followUp);
        setText("dashAppointment", stats.appointment);
        setText("dashSiteSurvey", stats.siteSurvey);
        setText("dashQuotation", stats.quotation);
        setText("dashClosing", stats.closing);

        // Support ID dashboard lama jika masih ada.
        setText("statTotal", stats.total);
        setText("statNew", stats.newCount);
        setText("statInterested", stats.interested);
        setText("statFollowUp", stats.followUp);
        setText("statAppointment", stats.appointment);
        setText("statSiteSurvey", stats.siteSurvey);
        setText("statQuotation", stats.quotation);
        setText("statClosing", stats.closing);
    }

    // ========================================================
    // PIPELINE
    // ========================================================

    function renderPipeline(stats) {
        var container = el("dashPipeline");

        if (!container) {
            return;
        }

        var items = [
            {
                label: "New",
                value: stats.newCount
            },
            {
                label: "Interested",
                value: stats.interested
            },
            {
                label: "Follow Up",
                value: stats.followUp
            },
            {
                label: "Appointment",
                value: stats.appointment
            },
            {
                label: "Site Survey",
                value: stats.siteSurvey
            },
            {
                label: "Quotation",
                value: stats.quotation
            },
            {
                label: "Closing",
                value: stats.closing
            }
        ];

        var max = 1;

        for (var i = 0; i < items.length; i++) {
            if (items[i].value > max) {
                max = items[i].value;
            }
        }

        var html = "";

        for (var j = 0; j < items.length; j++) {
            var item = items[j];

            var percent = Math.round(
                (item.value / max) * 100
            );

            html +=
                '<div class="dashboard-pipeline-row">' +
                    '<div class="dashboard-pipeline-label">' +
                        '<span>' +
                            escapeHtml(item.label) +
                        "</span>" +
                        "<strong>" +
                            item.value +
                        "</strong>" +
                    "</div>" +

                    '<div class="dashboard-pipeline-bar">' +
                        '<span style="width:' +
                            percent +
                            '%"></span>' +
                    "</div>" +
                "</div>";
        }

        container.innerHTML = html;

        setText(
            "dashPipelineTotal",
            stats.total
        );
    }

    // ========================================================
    // STATUS
    // ========================================================

    function renderStatus(leads) {
        var container = el("dashStatusList");

        if (!container) {
            return;
        }

        var statusMap = {};

        for (var i = 0; i < leads.length; i++) {
            var status = leads[i] && leads[i].status
                ? String(leads[i].status).trim()
                : "No Status";

            if (!statusMap[status]) {
                statusMap[status] = 0;
            }

            statusMap[status]++;
        }

        var entries = Object.keys(statusMap);

        entries.sort(function (a, b) {
            return statusMap[b] - statusMap[a];
        });

        if (!entries.length) {
            container.innerHTML =
                '<div class="dashboard-empty">' +
                    "Belum ada data status." +
                "</div>";

            return;
        }

        var html = "";

        for (var j = 0; j < entries.length; j++) {
            var key = entries[j];

            html +=
                '<div class="dashboard-status-row">' +
                    '<span class="dashboard-status-name">' +
                        escapeHtml(key) +
                    "</span>" +
                    '<strong class="dashboard-status-count">' +
                        statusMap[key] +
                    "</strong>" +
                "</div>";
        }

        container.innerHTML = html;
    }

    // ========================================================
    // RECENT LEADS
    // ========================================================

    function renderRecentLeads(leads) {
        var container = el("dashRecentLeads");

        if (!container) {
            return;
        }

        var sorted = leads.slice();

        sorted.sort(function (a, b) {
            var da = new Date(a.created_at || 0).getTime();
            var db = new Date(b.created_at || 0).getTime();

            return db - da;
        });

        var recent = sorted.slice(0, 6);

        if (!recent.length) {
            container.innerHTML =
                '<div class="dashboard-empty">' +
                    "Belum ada lead." +
                "</div>";

            return;
        }

        var html = "";

        for (var i = 0; i < recent.length; i++) {
            var lead = recent[i];

            html +=
                '<div class="dashboard-lead-row">' +

                    '<div class="dashboard-lead-main">' +
                        '<strong>' +
                            escapeHtml(
                                lead.customer_name ||
                                "Tanpa Nama"
                            ) +
                        "</strong>" +

                        '<span>' +
                            escapeHtml(
                                lead.business ||
                                lead.location ||
                                "-"
                            ) +
                        "</span>" +
                    "</div>" +

                    '<div class="dashboard-lead-side">' +
                        '<span class="dashboard-lead-status">' +
                            escapeHtml(
                                lead.status ||
                                "No Status"
                            ) +
                        "</span>" +

                        '<small>' +
                            formatDateTime(
                                lead.created_at
                            ) +
                        "</small>" +
                    "</div>" +

                "</div>";
        }

        container.innerHTML = html;
    }

    // ========================================================
    // UPCOMING FOLLOW UPS
    // ========================================================

    function renderUpcomingFollowups(leads) {
        var container = el("dashUpcomingFollowups");

        if (!container) {
            return;
        }

        var today = new Date();

        today.setHours(0, 0, 0, 0);

        var upcoming = [];

        for (var i = 0; i < leads.length; i++) {
            var lead = leads[i];

            if (!lead.follow_up_date) {
                continue;
            }

            var date = new Date(
                lead.follow_up_date + "T00:00:00"
            );

            if (isNaN(date.getTime())) {
                continue;
            }

            if (date >= today) {
                upcoming.push(lead);
            }
        }

        upcoming.sort(function (a, b) {
            return (
                new Date(
                    a.follow_up_date + "T00:00:00"
                ).getTime() -
                new Date(
                    b.follow_up_date + "T00:00:00"
                ).getTime()
            );
        });

        upcoming = upcoming.slice(0, 6);

        if (!upcoming.length) {
            container.innerHTML =
                '<div class="dashboard-empty">' +
                    "Tidak ada follow-up mendatang." +
                "</div>";

            return;
        }

        var html = "";

        for (var j = 0; j < upcoming.length; j++) {
            var lead = upcoming[j];

            html +=
                '<div class="dashboard-followup-row">' +

                    '<div class="dashboard-followup-date">' +
                        formatDate(
                            lead.follow_up_date
                        ) +
                    "</div>" +

                    '<div class="dashboard-followup-main">' +
                        '<strong>' +
                            escapeHtml(
                                lead.customer_name ||
                                "Tanpa Nama"
                            ) +
                        "</strong>" +

                        '<span>' +
                            escapeHtml(
                                lead.phone ||
                                lead.location ||
                                "-"
                            ) +
                        "</span>" +
                    "</div>" +

                    '<div class="dashboard-followup-status">' +
                        escapeHtml(
                            lead.status ||
                            "Follow Up"
                        ) +
                    "</div>" +

                "</div>";
        }

        container.innerHTML = html;
    }

    // ========================================================
    // ROLE
    // ========================================================

    function getSalesFilter(profile) {
        if (!profile) {
            return null;
        }

        var role = String(
            profile.role || ""
        ).toLowerCase();

        if (
            role === "admin" ||
            role === "owner"
        ) {
            return null;
        }

        /*
         * Untuk Sales, gunakan profile.id terlebih dahulu.
         * Jika tidak tersedia, fallback ke auth_user_id.
         */
        return (
            profile.id ||
            profile.auth_user_id ||
            null
        );
    }

    // ========================================================
    // DATABASE QUERY
    // ========================================================

    async function fetchDashboardData() {
        var client = getClient();
        var profile = getProfile();

        if (!client) {
            throw new Error(
                "Supabase client belum tersedia."
            );
        }

        if (!profile) {
            throw new Error(
                "Profile user belum tersedia."
            );
        }

        /*
         * HANYA SATU QUERY.
         *
         * Kita ambil field yang benar-benar dibutuhkan
         * dashboard. Tidak menggunakan select("*").
         */
        var query = client
            .from("leads")
            .select(
                "id,customer_name,phone,business,location,status," +
                "follow_up_date,appointment,site_survey,quotation," +
                "closing,created_at,sales_id"
            );

        var salesFilter = getSalesFilter(profile);

        if (salesFilter) {
            query = query.eq(
                "sales_id",
                salesFilter
            );
        }

        /*
         * Ambil data terbaru terlebih dahulu.
         */
        query = query.order(
            "created_at",
            {
                ascending: false
            }
        );

        var result = await query;

        if (result.error) {
            throw result.error;
        }

        return result.data || [];
    }

    // ========================================================
    // RENDER ALL
    // ========================================================

    function renderDashboard(leads) {
        var stats = calculateStats(leads);

        renderStats(stats);
        renderPipeline(stats);
        renderStatus(leads);
        renderRecentLeads(leads);
        renderUpcomingFollowups(leads);

        hideDashboardLoading();
    }

    // ========================================================
    // ERROR
    // ========================================================

    function renderDashboardError(error) {
        console.error(
            "CRM FSI Dashboard Error:",
            error
        );

        var message =
            error && error.message
                ? error.message
                : "Gagal mengambil data dashboard.";

        var containers = [
            "dashPipeline",
            "dashStatusList",
            "dashRecentLeads",
            "dashUpcomingFollowups"
        ];

        for (var i = 0; i < containers.length; i++) {
            var container = el(containers[i]);

            if (container) {
                container.innerHTML =
                    '<div class="dashboard-empty dashboard-error">' +
                        escapeHtml(message) +
                    "</div>";
            }
        }
    }

    // ========================================================
    // MAIN LOAD
    // ========================================================

    async function loadFSIDashboard(force) {
        /*
         * Jangan melakukan query jika dashboard tidak sedang
         * digunakan.
         */
        if (!isDashboardVisible()) {
            return;
        }

        /*
         * Hindari dua query dashboard berjalan bersamaan.
         */
        if (dashboardLoading) {
            return;
        }

        /*
         * Jika baru saja di-load, tidak perlu query lagi.
         */
        var now = Date.now();

        if (
            !force &&
            lastDashboardLoad &&
            now - lastDashboardLoad < 3000
        ) {
            return;
        }

        dashboardLoading = true;

        /*
         * Tampilkan dashboard terlebih dahulu.
         */
        showDashboardLoading();

        try {
            var leads = await fetchDashboardData();

            renderDashboard(leads);

            lastDashboardLoad = Date.now();

        } catch (error) {
            renderDashboardError(error);

        } finally {
            dashboardLoading = false;
        }
    }

    // ========================================================
    // PUBLIC REFRESH
    // ========================================================

    async function refreshDashboard() {
        await loadFSIDashboard(true);
    }

    window.loadFSIDashboard = loadFSIDashboard;
    window.refreshDashboard = refreshDashboard;

    // ========================================================
    // AUTO REFRESH
    // ========================================================

    function startDashboardAutoRefresh() {
        if (dashboardTimer) {
            clearInterval(dashboardTimer);
        }

        dashboardTimer = setInterval(
            function () {
                if (isDashboardVisible()) {
                    loadFSIDashboard(false);
                }
            },
            DASHBOARD_REFRESH_MS
        );
    }

    // ========================================================
    // INITIALIZE
    // ========================================================

    function initializeDashboard() {
        startDashboardAutoRefresh();

        if (isDashboardVisible()) {
            loadFSIDashboard(true);
        }

        console.log(
            "CRM FSI Fast Dashboard berhasil dimuat."
        );
    }

    // Tunggu DOM selesai.
    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initializeDashboard
        );
    } else {
        initializeDashboard();
    }

})();
