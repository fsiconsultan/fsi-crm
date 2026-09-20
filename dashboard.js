// ============================================================
// CRM FSI - DASHBOARD.JS
// ============================================================
// KHUSUS DASHBOARD
//
// Membutuhkan dari script.js:
//   - supabaseClient
//   - currentProfile
//
// Membutuhkan HTML:
//   - <div id="dashboardPage"></div>
//
// ============================================================

(function () {
  "use strict";

  // ==========================================================
  // STATE
  // ==========================================================

  let dashboardLoading = false;
  let dashboardBuilt = false;
  let dashboardProfileId = null;


  // ==========================================================
  // GET SUPABASE CLIENT
  // ==========================================================

  function getClient() {
    try {
      if (typeof supabaseClient !== "undefined") {
        return supabaseClient;
      }
    } catch (error) {
      console.error(
        "CRM FSI Dashboard: supabaseClient tidak tersedia.",
        error
      );
    }

    return null;
  }


  // ==========================================================
  // GET CURRENT PROFILE
  // ==========================================================

  function getProfile() {
    try {
      if (typeof currentProfile !== "undefined") {
        return currentProfile;
      }
    } catch (error) {
      console.error(
        "CRM FSI Dashboard: currentProfile tidak tersedia.",
        error
      );
    }

    return null;
  }


  // ==========================================================
  // DOM HELPER
  // ==========================================================

  function getElement(id) {
    return document.getElementById(id);
  }


  function setText(id, value) {
    const element = getElement(id);

    if (element) {
      element.textContent =
        value === null ||
        value === undefined
          ? "0"
          : String(value);
    }
  }


  // ==========================================================
  // ESCAPE HTML
  // ==========================================================

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  // ==========================================================
  // DATE FORMAT
  // ==========================================================

  function formatDate(value) {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString(
      "id-ID",
      {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }
    );
  }


  // ==========================================================
  // TODAY
  // ==========================================================

  function getLocalToday() {
    const date = new Date();

    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        date.getDate()
      ).padStart(2, "0");

    return (
      year +
      "-" +
      month +
      "-" +
      day
    );
  }


  // ==========================================================
  // NORMALIZE STATUS
  // ==========================================================

  function normalizeStatus(status) {
    const value =
      String(status || "")
        .trim()
        .toLowerCase();

    if (
      value === "new" ||
      value === "belum dihubungi" ||
      value === "belum_dihubungi"
    ) {
      return "New";
    }

    if (
      value === "flyer sent" ||
      value === "flyer_sent" ||
      value === "flyer"
    ) {
      return "Flyer Sent";
    }

    if (
      value === "interested" ||
      value === "tertarik"
    ) {
      return "Interested";
    }

    if (
      value === "follow up" ||
      value === "follow-up" ||
      value === "follow_up"
    ) {
      return "Follow Up";
    }

    if (
      value === "closing" ||
      value === "closed"
    ) {
      return "Closing";
    }

    if (
      value === "not interested" ||
      value === "tidak tertarik" ||
      value === "tidak_tertarik"
    ) {
      return "Not Interested";
    }

    return status || "New";
  }


  // ==========================================================
  // STATUS CLASS
  // ==========================================================

  function statusClass(status) {
    return normalizeStatus(status)
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  }


  // ==========================================================
  // ROLE
  // ==========================================================

  function isSales(profile) {
    if (!profile) {
      return false;
    }

    const role =
      String(profile.role || "")
        .trim()
        .toLowerCase();

    return (
      role === "sales" ||
      role === "salesman" ||
      role === "sales person"
    );
  }


  function isAdmin(profile) {
    if (!profile) {
      return false;
    }

    const role =
      String(profile.role || "")
        .trim()
        .toLowerCase();

    return (
      role === "admin" ||
      role === "owner" ||
      role === "administrator"
    );
  }


  // ==========================================================
  // APPLY ROLE SCOPE
  // ==========================================================

  function applyScope(query, profile) {

    if (
      isSales(profile) &&
      profile.id
    ) {
      return query.eq(
        "sales_id",
        profile.id
      );
    }

    return query;
  }


  // ==========================================================
  // BUILD DASHBOARD
  // ==========================================================

  function buildDashboard() {

    const page =
      getElement("dashboardPage");

    if (!page) {

      console.error(
        "CRM FSI Dashboard: #dashboardPage tidak ditemukan."
      );

      return false;
    }


    const profile =
      getProfile();

    const salesMode =
      isSales(profile);


    // ========================================================
    // DASHBOARD HTML
    // ========================================================

    page.innerHTML =
      '<div class="dashboard-shell">' +

        '<div class="dashboard-toolbar">' +

          '<div class="dashboard-heading">' +

            '<div class="dashboard-heading-icon">' +
              '📊' +
            '</div>' +

            '<div>' +

              '<div class="dashboard-kicker">' +
                'CRM FSI' +
              '</div>' +

              '<h1>Sales Dashboard</h1>' +

              '<span class="dashboard-role-badge">' +
                (
                  salesMode
                    ? 'My Sales Overview'
                    : 'Admin Overview'
                ) +
              '</span>' +

            '</div>' +

          '</div>' +

          '<button ' +
            'type="button" ' +
            'class="dashboard-refresh-btn" ' +
            'id="dashboardRefreshButton">' +
            '↻ Refresh' +
          '</button>' +

        '</div>' +


        // ====================================================
        // STAT CARDS
        // ====================================================

        '<div class="dashboard-stats-grid">' +

          '<div class="dashboard-stat-card total">' +
            '<div class="dashboard-stat-icon">👥</div>' +
            '<div>' +
              '<span>Total Leads</span>' +
              '<strong id="dashTotal">0</strong>' +
            '</div>' +
          '</div>' +


          '<div class="dashboard-stat-card new">' +
            '<div class="dashboard-stat-icon">🆕</div>' +
            '<div>' +
              '<span>New</span>' +
              '<strong id="dashNew">0</strong>' +
            '</div>' +
          '</div>' +


          '<div class="dashboard-stat-card interested">' +
            '<div class="dashboard-stat-icon">❤️</div>' +
            '<div>' +
              '<span>Interested</span>' +
              '<strong id="dashInterested">0</strong>' +
            '</div>' +
          '</div>' +


          '<div class="dashboard-stat-card followup">' +
            '<div class="dashboard-stat-icon">🔔</div>' +
            '<div>' +
              '<span>Follow Up</span>' +
              '<strong id="dashFollowUp">0</strong>' +
            '</div>' +
          '</div>' +


          '<div class="dashboard-stat-card appointment">' +
            '<div class="dashboard-stat-icon">📅</div>' +
            '<div>' +
              '<span>Appointment</span>' +
              '<strong id="dashAppointment">0</strong>' +
            '</div>' +
          '</div>' +


          '<div class="dashboard-stat-card survey">' +
            '<div class="dashboard-stat-icon">📍</div>' +
            '<div>' +
              '<span>Site Survey</span>' +
              '<strong id="dashSiteSurvey">0</strong>' +
            '</div>' +
          '</div>' +


          '<div class="dashboard-stat-card quotation">' +
            '<div class="dashboard-stat-icon">📄</div>' +
            '<div>' +
              '<span>Quotation</span>' +
              '<strong id="dashQuotation">0</strong>' +
            '</div>' +
          '</div>' +


          '<div class="dashboard-stat-card closing">' +
            '<div class="dashboard-stat-icon">✓</div>' +
            '<div>' +
              '<span>Closing</span>' +
              '<strong id="dashClosing">0</strong>' +
            '</div>' +
          '</div>' +

        '</div>' +


        // ====================================================
        // PIPELINE + STATUS
        // ====================================================

        '<div class="dashboard-main-grid">' +

          '<section class="dashboard-panel">' +

            '<div class="dashboard-panel-header">' +

              '<div>' +
                '<h2>Sales Pipeline</h2>' +
                '<p>Lead progression</p>' +
              '</div>' +

              '<strong id="dashPipelineTotal">0</strong>' +

            '</div>' +

            '<div ' +
              'class="dashboard-pipeline" ' +
              'id="dashPipeline">' +
              '<div class="dashboard-empty">' +
                'Loading...' +
              '</div>' +
            '</div>' +

          '</section>' +


          '<section class="dashboard-panel">' +

            '<div class="dashboard-panel-header">' +

              '<div>' +
                '<h2>Lead Status</h2>' +
                '<p>Current distribution</p>' +
              '</div>' +

            '</div>' +

            '<div ' +
              'class="dashboard-status-list" ' +
              'id="dashStatusList">' +
              '<div class="dashboard-empty">' +
                'Loading...' +
              '</div>' +
            '</div>' +

          '</section>' +

        '</div>' +


        // ====================================================
        // RECENT + FOLLOW UP
        // ====================================================

        '<div class="dashboard-bottom-grid">' +

          '<section class="dashboard-panel">' +

            '<div class="dashboard-panel-header">' +

              '<div>' +
                '<h2>Recent Leads</h2>' +
                '<p>Latest customer activity</p>' +
              '</div>' +

              '<button ' +
                'type="button" ' +
                'class="dashboard-view-btn" ' +
                'id="dashboardViewLeadsButton">' +
                'View Leads' +
              '</button>' +

            '</div>' +

            '<div ' +
              'class="dashboard-recent-leads" ' +
              'id="dashRecentLeads">' +
              '<div class="dashboard-empty">' +
                'Loading...' +
              '</div>' +
            '</div>' +

          '</section>' +


          '<section class="dashboard-panel">' +

            '<div class="dashboard-panel-header">' +

              '<div>' +
                '<h2>Upcoming Follow Up</h2>' +
                '<p>Next customer actions</p>' +
              '</div>' +

            '</div>' +

            '<div ' +
              'class="dashboard-upcoming" ' +
              'id="dashUpcomingFollowups">' +
              '<div class="dashboard-empty">' +
                'Loading...' +
              '</div>' +
            '</div>' +

          '</section>' +

        '</div>' +

      '</div>';


    // ========================================================
    // REFRESH BUTTON
    // ========================================================

    const refreshButton =
      getElement(
        "dashboardRefreshButton"
      );

    if (refreshButton) {

      refreshButton.addEventListener(
        "click",
        function () {
          loadDashboard(true);
        }
      );

    }


    // ========================================================
    // VIEW LEADS BUTTON
    // ========================================================

    const viewLeadsButton =
      getElement(
        "dashboardViewLeadsButton"
      );

    if (viewLeadsButton) {

      viewLeadsButton.addEventListener(
        "click",
        function () {

          if (
            typeof showLeads ===
            "function"
          ) {
            showLeads();
            return;
          }

          if (
            typeof window.showLeads ===
            "function"
          ) {
            window.showLeads();
          }

        }
      );

    }


    dashboardBuilt = true;

    return true;
  }


  // ==========================================================
  // TOTAL
  // ==========================================================

  async function loadTotal(profile) {

    const client =
      getClient();

    if (!client) {
      return 0;
    }


    let query =
      client
        .from("leads")
        .select(
          "id",
          {
            count: "exact",
            head: true
          }
        );


    query =
      applyScope(
        query,
        profile
      );


    const result =
      await query;


    if (result.error) {

      console.error(
        "Dashboard total error:",
        result.error
      );

      return 0;
    }


    return result.count || 0;
  }


  // ==========================================================
  // STATUS COUNT
  // ==========================================================

  async function loadStatusCount(
    statuses,
    profile
  ) {

    const client =
      getClient();

    if (!client) {
      return 0;
    }


    let query =
      client
        .from("leads")
        .select("status");


    query =
      applyScope(
        query,
        profile
      );


    const result =
      await query;


    if (result.error) {

      console.error(
        "Dashboard status count error:",
        result.error
      );

      return 0;
    }


    const targets =
      statuses.map(
        normalizeStatus
      );


    return (
      result.data || []
    ).filter(function (row) {

      return targets.includes(
        normalizeStatus(
          row.status
        )
      );

    }).length;
  }


  // ==========================================================
  // DATE COUNT
  // ==========================================================

  async function loadDateCount(
    field,
    profile
  ) {

    const client =
      getClient();

    if (!client) {
      return 0;
    }


    let query =
      client
        .from("leads")
        .select(
          "id," +
          field
        )
        .not(
          field,
          "is",
          null
        );


    query =
      applyScope(
        query,
        profile
      );


    const result =
      await query;


    if (result.error) {

      console.error(
        "Dashboard " +
        field +
        " error:",
        result.error
      );

      return 0;
    }


    return (
      result.data || []
    ).filter(function (row) {

      return (
        row[field] !== null &&
        row[field] !== ""
      );

    }).length;
  }


  // ==========================================================
  // CLOSING COUNT
  // ==========================================================

  async function loadClosingCount(
    profile
  ) {

    const client =
      getClient();

    if (!client) {
      return 0;
    }


    let query =
      client
        .from("leads")
        .select(
          "status, closing"
        );


    query =
      applyScope(
        query,
        profile
      );


    const result =
      await query;


    if (result.error) {

      console.error(
        "Dashboard closing error:",
        result.error
      );

      return 0;
    }


    return (
      result.data || []
    ).filter(function (row) {

      const status =
        normalizeStatus(
          row.status
        );


      return (
        status === "Closing" ||
        (
          row.closing !== null &&
          row.closing !== ""
        )
      );

    }).length;
  }


  // ==========================================================
  // LOAD STATS
  // ==========================================================

  async function loadStats(profile) {

    const results =
      await Promise.all([

        loadTotal(profile),

        loadStatusCount(
          ["New"],
          profile
        ),

        loadStatusCount(
          ["Interested"],
          profile
        ),

        loadStatusCount(
          ["Follow Up"],
          profile
        ),

        loadDateCount(
          "appointment",
          profile
        ),

        loadDateCount(
          "site_survey",
          profile
        ),

        loadDateCount(
          "quotation",
          profile
        ),

        loadClosingCount(
          profile
        )

      ]);


    setText(
      "dashTotal",
      results[0]
    );

    setText(
      "dashNew",
      results[1]
    );

    setText(
      "dashInterested",
      results[2]
    );

    setText(
      "dashFollowUp",
      results[3]
    );

    setText(
      "dashAppointment",
      results[4]
    );

    setText(
      "dashSiteSurvey",
      results[5]
    );

    setText(
      "dashQuotation",
      results[6]
    );

    setText(
      "dashClosing",
      results[7]
    );
  }


  // ==========================================================
  // PIPELINE
  // ==========================================================

  async function loadPipeline(profile) {

    const client =
      getClient();

    if (!client) {
      return;
    }


    let query =
      client
        .from("leads")
        .select("status");


    query =
      applyScope(
        query,
        profile
      );


    const result =
      await query;


    if (result.error) {

      console.error(
        "Dashboard pipeline error:",
        result.error
      );

      return;
    }


    const rows =
      result.data || [];


    const statuses = [
      "New",
      "Flyer Sent",
      "Interested",
      "Follow Up",
      "Closing",
      "Not Interested"
    ];


    const total =
      rows.length;


    const container =
      getElement(
        "dashPipeline"
      );


    if (!container) {
      return;
    }


    setText(
      "dashPipelineTotal",
      total
    );


    container.innerHTML =
      statuses.map(
        function (status) {

          const count =
            rows.filter(
              function (row) {

                return (
                  normalizeStatus(
                    row.status
                  ) === status
                );

              }
            ).length;


          const percentage =
            total > 0
              ? Math.round(
                  (
                    count /
                    total
                  ) *
                  100
                )
              : 0;


          return (
            '<div class="dashboard-pipeline-row">' +

              '<div class="dashboard-pipeline-label">' +

                '<span>' +
                  escapeHtml(status) +
                '</span>' +

                '<strong>' +
                  count +
                '</strong>' +

              '</div>' +

              '<div class="dashboard-pipeline-track">' +

                '<div ' +
                  'class="dashboard-pipeline-fill ' +
                  statusClass(status) +
                  '" ' +
                  'style="width:' +
                  percentage +
                  '%">' +
                '</div>' +

              '</div>' +

              '<small>' +
                percentage +
                '%' +
              '</small>' +

            '</div>'
          );

        }
      ).join("");
  }


  // ==========================================================
  // STATUS DISTRIBUTION
  // ==========================================================

  async function loadStatusDistribution(
    profile
  ) {

    const client =
      getClient();

    if (!client) {
      return;
    }


    let query =
      client
        .from("leads")
        .select("status");


    query =
      applyScope(
        query,
        profile
      );


    const result =
      await query;


    if (result.error) {

      console.error(
        "Dashboard status list error:",
        result.error
      );

      return;
    }


    const rows =
      result.data || [];


    const statuses = [
      "New",
      "Flyer Sent",
      "Interested",
      "Follow Up",
      "Closing",
      "Not Interested"
    ];


    const total =
      rows.length;


    const container =
      getElement(
        "dashStatusList"
      );


    if (!container) {
      return;
    }


    container.innerHTML =
      statuses.map(
        function (status) {

          const count =
            rows.filter(
              function (row) {

                return (
                  normalizeStatus(
                    row.status
                  ) === status
                );

              }
            ).length;


          const percentage =
            total > 0
              ? Math.round(
                  (
                    count /
                    total
                  ) *
                  100
                )
              : 0;


          return (
            '<div class="dashboard-status-row">' +

              '<div class="dashboard-status-name">' +

                '<span ' +
                  'class="dashboard-status-dot ' +
                  statusClass(status) +
                  '">' +
                '</span>' +

                '<span>' +
                  escapeHtml(status) +
                '</span>' +

              '</div>' +

              '<strong>' +
                count +
              '</strong>' +

              '<small>' +
                percentage +
                '%' +
              '</small>' +

            '</div>'
          );

        }
      ).join("");
  }


  // ==========================================================
  // RECENT LEADS
  // ==========================================================

  async function loadRecentLeads(
    profile
  ) {

    const client =
      getClient();

    if (!client) {
      return;
    }


    let query =
      client
        .from("leads")
        .select(
          "customer_name, business, location, status, created_at"
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        )
        .limit(6);


    query =
      applyScope(
        query,
        profile
      );


    const result =
      await query;


    const container =
      getElement(
        "dashRecentLeads"
      );


    if (!container) {
      return;
    }


    if (result.error) {

      console.error(
        "Dashboard recent leads error:",
        result.error
      );

      container.innerHTML =
        '<div class="dashboard-empty">' +
          'Failed to load leads.' +
        '</div>';

      return;
    }


    const data =
      result.data || [];


    if (data.length === 0) {

      container.innerHTML =
        '<div class="dashboard-empty">' +
          'No leads yet.' +
        '</div>';

      return;
    }


    container.innerHTML =
      data.map(
        function (lead) {

          const status =
            normalizeStatus(
              lead.status
            );


          const initial =
            String(
              lead.customer_name ||
              "?"
            )
              .charAt(0)
              .toUpperCase();


          let locationText = "";


          if (lead.location) {

            locationText =
              " · " +
              escapeHtml(
                lead.location
              );

          }


          return (
            '<div class="dashboard-recent-lead">' +

              '<div class="dashboard-recent-avatar">' +
                escapeHtml(initial) +
              '</div>' +

              '<div class="dashboard-recent-info">' +

                '<strong>' +
                  escapeHtml(
                    lead.customer_name ||
                    "No Name"
                  ) +
                '</strong>' +

                '<span>' +
                  escapeHtml(
                    lead.business ||
                    "-"
                  ) +
                  locationText +
                '</span>' +

              '</div>' +

              '<div class="dashboard-recent-meta">' +

                '<span ' +
                  'class="dashboard-status-badge ' +
                  statusClass(status) +
                  '">' +
                  escapeHtml(status) +
                '</span>' +

                '<small>' +
                  formatDate(
                    lead.created_at
                  ) +
                '</small>' +

              '</div>' +

            '</div>'
          );

        }
      ).join("");
  }


  // ==========================================================
  // UPCOMING FOLLOW UPS
  // ==========================================================

  async function loadUpcomingFollowUps(
    profile
  ) {

    const client =
      getClient();

    if (!client) {
      return;
    }


    const today =
      getLocalToday();


    let query =
      client
        .from("leads")
        .select(
          "customer_name, business, location, status, follow_up_date"
        )
        .not(
          "follow_up_date",
          "is",
          null
        )
        .gte(
          "follow_up_date",
          today
        )
        .order(
          "follow_up_date",
          {
            ascending: true
          }
        )
        .limit(6);


    query =
      applyScope(
        query,
        profile
      );


    const result =
      await query;


    const container =
      getElement(
        "dashUpcomingFollowups"
      );


    if (!container) {
      return;
    }


    if (result.error) {

      console.error(
        "Dashboard follow-up error:",
        result.error
      );

      container.innerHTML =
        '<div class="dashboard-empty">' +
          'Failed to load follow-ups.' +
        '</div>';

      return;
    }


    const data =
      result.data || [];


    if (data.length === 0) {

      container.innerHTML =
        '<div class="dashboard-empty">' +
          'No upcoming follow-ups.' +
        '</div>';

      return;
    }


    container.innerHTML =
      data.map(
        function (lead) {

          const formattedDate =
            formatDate(
              lead.follow_up_date
            );


          const normalized =
            normalizeStatus(
              lead.status
            );


          return (
            '<div class="dashboard-followup-item">' +

              '<div class="dashboard-followup-date">' +

                '<strong>' +
                  escapeHtml(
                    formattedDate
                  ) +
                '</strong>' +

              '</div>' +

              '<div class="dashboard-followup-info">' +

                '<strong>' +
                  escapeHtml(
                    lead.customer_name ||
                    "No Name"
                  ) +
                '</strong>' +

                '<span>' +
                  escapeHtml(
                    lead.business ||
                    "-"
                  ) +
                '</span>' +

              '</div>' +

              '<span ' +
                'class="dashboard-status-badge ' +
                statusClass(normalized) +
                '">' +
                escapeHtml(normalized) +
              '</span>' +

            '</div>'
          );

        }
      ).join("");
  }


  // ==========================================================
  // LOAD DASHBOARD
  // ==========================================================

  async function loadDashboard(force) {

    if (
      dashboardLoading &&
      !force
    ) {
      return;
    }


    const page =
      getElement(
        "dashboardPage"
      );


    if (!page) {

      console.error(
        "CRM FSI Dashboard: #dashboardPage tidak ditemukan."
      );

      return;
    }


    const profile =
      getProfile();


    if (!profile) {

      console.log(
        "CRM FSI Dashboard: menunggu currentProfile..."
      );

      return;
    }


    const profileId =
      profile.id ||
      profile.auth_user_id ||
      null;


    if (
      !dashboardBuilt ||
      dashboardProfileId !== profileId
    ) {

      buildDashboard();

      dashboardProfileId =
        profileId;
    }


    dashboardLoading = true;


    try {

      await Promise.all([

        loadStats(profile),

        loadPipeline(profile),

        loadStatusDistribution(profile),

        loadRecentLeads(profile),

        loadUpcomingFollowUps(profile)

      ]);

    } catch (error) {

      console.error(
        "CRM FSI Dashboard error:",
        error
      );

    } finally {

      dashboardLoading = false;

    }
  }


  // ==========================================================
  // PUBLIC FUNCTIONS
  // ==========================================================

  window.loadFSIDashboard =
    function (force) {
      return loadDashboard(
        force === true
      );
    };


  window.refreshDashboard =
    function () {
      return loadDashboard(true);
    };


  // ==========================================================
  // AUTO REFRESH
  // ==========================================================

  setInterval(
    function () {

      const page =
        getElement(
          "dashboardPage"
        );


      if (!page) {
        return;
      }


      const style =
        window.getComputedStyle(
          page
        );


      const visible =
        style.display !== "none" &&
        page.offsetParent !== null;


      if (visible) {
        loadDashboard(false);
      }

    },
    30000
  );


  // ==========================================================
  // INITIALIZE
  // ==========================================================

  function initializeDashboard() {

    console.log(
      "CRM FSI Dashboard.js berhasil dimuat."
    );


    const page =
      getElement(
        "dashboardPage"
      );


    if (
      page &&
      page.offsetParent !== null
    ) {

      loadDashboard(true);

    }

  }


  // ==========================================================
  // DOM READY
  // ==========================================================

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initializeDashboard
    );

  } else {

    initializeDashboard();

  }

})();
