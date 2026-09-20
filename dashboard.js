(function () {

  "use strict";

  let isLoading = false;
  let lastProfileId = null;
  let lastDashboardState = false;
  let autoRefreshTimer = null;


  /* =====================================================
     BASIC HELPERS
  ===================================================== */

  function getProfile() {
    try {
      return typeof currentProfile !== "undefined"
        ? currentProfile
        : null;
    } catch (error) {
      return null;
    }
  }


  function getClient() {
    try {
      return typeof supabaseClient !== "undefined"
        ? supabaseClient
        : null;
    } catch (error) {
      return null;
    }
  }


  function getDashboard() {
    return document.getElementById("dashboardPage");
  }


  function isDashboardVisible() {

    const el = getDashboard();

    if (!el) {
      return false;
    }

    return window.getComputedStyle(el).display !== "none";
  }


  function escapeHtml(value) {

    if (
      value === null ||
      value === undefined
    ) {
      return "";
    }

    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  function formatDate(value) {

    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }
    );
  }


  function normalizeStatus(status) {

    const value =
      String(status || "")
        .trim()
        .toLowerCase();

    if (
      value === "new" ||
      value === "belum dihubungi"
    ) {
      return "New";
    }

    if (value === "flyer sent") {
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
      value === "followup"
    ) {
      return "Follow Up";
    }

    if (value === "closing") {
      return "Closing";
    }

    if (
      value === "not interested" ||
      value === "tidak tertarik"
    ) {
      return "Not Interested";
    }

    return status || "Unknown";
  }


  function statusClass(status) {

    return normalizeStatus(status)
      .toLowerCase()
      .replace(/\s+/g, "-");
  }


  function isSales(profile) {

    return String(
      profile?.role || ""
    ).toLowerCase() === "sales";
  }


  /* =====================================================
     APPLY SALES SCOPE
  ===================================================== */

  function scopeQuery(query, profile) {

    if (
      profile &&
      isSales(profile)
    ) {

      return query.eq(
        "sales_id",
        profile.id
      );
    }

    return query;
  }


  /* =====================================================
     EXACT COUNT
  ===================================================== */

  async function exactCount(
    callback
  ) {

    const client = getClient();
    const profile = getProfile();

    if (!client || !profile) {
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
      scopeQuery(
        query,
        profile
      );

    if (callback) {
      query = callback(query);
    }

    const {
      count,
      error
    } = await query;

    if (error) {
      throw error;
    }

    return count || 0;
  }


  /* =====================================================
     STATUS COUNT
  ===================================================== */

  function statusCount(statuses) {

    return exactCount(
      function (query) {

        return query.in(
          "status",
          statuses
        );

      }
    );
  }


  /* =====================================================
     DATE COUNT
  ===================================================== */

  function dateCount(field) {

    return exactCount(
      function (query) {

        return query.not(
          field,
          "is",
          null
        );

      }
    );
  }


  /* =====================================================
     CLOSING COUNT
  ===================================================== */

  function closingCount() {

    return exactCount(
      function (query) {

        return query.or(
          "status.eq.Closing,closing.not.is.null"
        );

      }
    );
  }


  /* =====================================================
     DASHBOARD HTML
  ===================================================== */

  function buildDashboard() {

    const dashboard =
      getDashboard();

    if (!dashboard) {
      return;
    }


    const profile =
      getProfile();

    const name =
      profile?.sales_name ||
      profile?.name ||
      profile?.full_name ||
      profile?.username ||
      "User";


    const role =
      isSales(profile)
        ? "My Sales Overview"
        : "Admin Overview";


    dashboard.innerHTML = `

      <div class="dashboard-shell">

        <!-- HEADER -->

        <div class="dashboard-toolbar">

          <div class="dashboard-heading">

            <div class="dashboard-heading-icon">
              <i data-lucide="layout-dashboard"></i>
            </div>

            <div>

              <div class="dashboard-kicker">
                FSI CONSULTANT
              </div>

              <h1>
                Sales Dashboard
              </h1>

              <p>
                Welcome back, ${escapeHtml(name)}.
                Here's your latest CRM overview.
              </p>

            </div>

          </div>


          <div class="dashboard-toolbar-actions">

            <span
              class="dashboard-role-badge"
            >
              ${escapeHtml(role)}
            </span>

            <button
              type="button"
              class="dashboard-refresh-btn"
              id="dashboardRefreshButton"
              onclick="refreshDashboard()"
            >

              <i data-lucide="refresh-cw"></i>

              Refresh

            </button>

          </div>

        </div>


        <!-- STAT CARDS -->

        <div class="dashboard-stats-grid">

          <article class="dashboard-stat-card total">

            <div class="dashboard-stat-top">

              <div class="dashboard-stat-icon">
                <i data-lucide="layers"></i>
              </div>

              <span class="dashboard-stat-label">
                Total Leads
              </span>

            </div>

            <strong
              id="dashTotal"
              class="dashboard-stat-value"
            >
              0
            </strong>

            <div class="dashboard-stat-footer">
              All accessible leads
            </div>

          </article>


          <article class="dashboard-stat-card new">

            <div class="dashboard-stat-top">

              <div class="dashboard-stat-icon">
                <i data-lucide="user-plus"></i>
              </div>

              <span class="dashboard-stat-label">
                New Leads
              </span>

            </div>

            <strong
              id="dashNew"
              class="dashboard-stat-value"
            >
              0
            </strong>

            <div class="dashboard-stat-footer">
              New / not contacted
            </div>

          </article>


          <article class="dashboard-stat-card interested">

            <div class="dashboard-stat-top">

              <div class="dashboard-stat-icon">
                <i data-lucide="heart"></i>
              </div>

              <span class="dashboard-stat-label">
                Interested
              </span>

            </div>

            <strong
              id="dashInterested"
              class="dashboard-stat-value"
            >
              0
            </strong>

            <div class="dashboard-stat-footer">
              Interested customers
            </div>

          </article>


          <article class="dashboard-stat-card followup">

            <div class="dashboard-stat-top">

              <div class="dashboard-stat-icon">
                <i data-lucide="phone-forwarded"></i>
              </div>

              <span class="dashboard-stat-label">
                Follow Up
              </span>

            </div>

            <strong
              id="dashFollowUp"
              class="dashboard-stat-value"
            >
              0
            </strong>

            <div class="dashboard-stat-footer">
              Leads requiring follow-up
            </div>

          </article>


          <article class="dashboard-stat-card appointment">

            <div class="dashboard-stat-top">

              <div class="dashboard-stat-icon">
                <i data-lucide="calendar-check"></i>
              </div>

              <span class="dashboard-stat-label">
                Appointment
              </span>

            </div>

            <strong
              id="dashAppointment"
              class="dashboard-stat-value"
            >
              0
            </strong>

            <div class="dashboard-stat-footer">
              Scheduled appointments
            </div>

          </article>


          <article class="dashboard-stat-card survey">

            <div class="dashboard-stat-top">

              <div class="dashboard-stat-icon">
                <i data-lucide="map-pin"></i>
              </div>

              <span class="dashboard-stat-label">
                Site Survey
              </span>

            </div>

            <strong
              id="dashSiteSurvey"
              class="dashboard-stat-value"
            >
              0
            </strong>

            <div class="dashboard-stat-footer">
              Survey records
            </div>

          </article>


          <article class="dashboard-stat-card quotation">

            <div class="dashboard-stat-top">

              <div class="dashboard-stat-icon">
                <i data-lucide="file-text"></i>
              </div>

              <span class="dashboard-stat-label">
                Quotation
              </span>

            </div>

            <strong
              id="dashQuotation"
              class="dashboard-stat-value"
            >
              0
            </strong>

            <div class="dashboard-stat-footer">
              Quotation records
            </div>

          </article>


          <article class="dashboard-stat-card closing">

            <div class="dashboard-stat-top">

              <div class="dashboard-stat-icon">
                <i data-lucide="badge-check"></i>
              </div>

              <span class="dashboard-stat-label">
                Closing
              </span>

            </div>

            <strong
              id="dashClosing"
              class="dashboard-stat-value"
            >
              0
            </strong>

            <div class="dashboard-stat-footer">
              Closed customers
            </div>

          </article>

        </div>


        <!-- PIPELINE + STATUS -->

        <div class="dashboard-main-grid">

          <section class="dashboard-panel">

            <div class="dashboard-panel-header">

              <div>

                <span class="dashboard-panel-kicker">
                  SALES FUNNEL
                </span>

                <h2>
                  Lead Pipeline
                </h2>

                <p>
                  Current distribution of leads by status.
                </p>

              </div>

              <div
                id="dashPipelineTotal"
                class="dashboard-panel-total"
              >
                0 Leads
              </div>

            </div>

            <div
              id="dashPipeline"
              class="dashboard-pipeline"
            ></div>

          </section>


          <section class="dashboard-panel">

            <div class="dashboard-panel-header">

              <div>

                <span class="dashboard-panel-kicker">
                  STATUS
                </span>

                <h2>
                  Lead Status
                </h2>

                <p>
                  Quick status breakdown.
                </p>

              </div>

            </div>

            <div
              id="dashStatusList"
              class="dashboard-status-list"
            ></div>

          </section>

        </div>


        <!-- RECENT + FOLLOW UP -->

        <div class="dashboard-bottom-grid">

          <section class="dashboard-panel">

            <div class="dashboard-panel-header">

              <div>

                <span class="dashboard-panel-kicker">
                  ACTIVITY
                </span>

                <h2>
                  Recent Leads
                </h2>

                <p>
                  Latest leads added to CRM.
                </p>

              </div>

              <button
                type="button"
                class="dashboard-view-btn"
                onclick="showLeads()"
              >
                View Leads
                <i data-lucide="arrow-right"></i>
              </button>

            </div>

            <div
              id="dashRecentLeads"
              class="dashboard-recent-list"
            ></div>

          </section>


          <section class="dashboard-panel">

            <div class="dashboard-panel-header">

              <div>

                <span class="dashboard-panel-kicker">
                  NEXT ACTION
                </span>

                <h2>
                  Upcoming Follow Up
                </h2>

                <p>
                  Scheduled customer follow-ups.
                </p>

              </div>

            </div>

            <div
              id="dashUpcomingFollowups"
              class="dashboard-followup-list"
            ></div>

          </section>

        </div>

      </div>
    `;


    createIcons();

  }


  /* =====================================================
     LUCIDE
  ===================================================== */

  function createIcons() {

    if (
      window.lucide &&
      typeof window.lucide.createIcons === "function"
    ) {

      window.lucide.createIcons();

    }
  }


  /* =====================================================
     LOAD STATISTICS
  ===================================================== */

  async function loadStats() {

    const [
      total,
      newLeads,
      interested,
      followUp,
      appointment,
      siteSurvey,
      quotation,
      closing
    ] = await Promise.all([

      exactCount(),

      statusCount([
        "New",
        "Belum Dihubungi"
      ]),

      statusCount([
        "Interested",
        "Tertarik"
      ]),

      statusCount([
        "Follow Up",
        "follow-up",
        "Follow-up"
      ]),

      dateCount(
        "appointment"
      ),

      dateCount(
        "site_survey"
      ),

      dateCount(
        "quotation"
      ),

      closingCount()

    ]);


    return {

      total,
      newLeads,
      interested,
      followUp,
      appointment,
      siteSurvey,
      quotation,
      closing

    };

  }


  /* =====================================================
     LOAD PIPELINE
  ===================================================== */

  async function loadPipeline() {

    const [
      newLeads,
      flyer,
      interested,
      followUp,
      closing,
      notInterested
    ] = await Promise.all([

      statusCount([
        "New",
        "Belum Dihubungi"
      ]),

      statusCount([
        "Flyer Sent"
      ]),

      statusCount([
        "Interested",
        "Tertarik"
      ]),

      statusCount([
        "Follow Up",
        "follow-up",
        "Follow-up"
      ]),

      statusCount([
        "Closing"
      ]),

      statusCount([
        "Not Interested",
        "Tidak Tertarik"
      ])

    ]);


    return {

      newLeads,
      flyer,
      interested,
      followUp,
      closing,
      notInterested

    };

  }


  /* =====================================================
     RECENT LEADS
  ===================================================== */

  async function loadRecentLeads() {

    const client = getClient();
    const profile = getProfile();

    let query =
      client
        .from("leads")
        .select(
          "customer_name,business,location,status,created_at"
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        )
        .limit(6);

    query =
      scopeQuery(
        query,
        profile
      );

    const {
      data,
      error
    } = await query;

    if (error) {
      console.error(
        "Recent leads:",
        error
      );
      return [];
    }

    return data || [];

  }


  /* =====================================================
     UPCOMING FOLLOW UPS
  ===================================================== */

  async function loadFollowUps() {

    const client = getClient();
    const profile = getProfile();

    const today =
      new Date()
        .toISOString()
        .split("T")[0];

    let query =
      client
        .from("leads")
        .select(
          "customer_name,business,status,follow_up_date"
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
      scopeQuery(
        query,
        profile
      );

    const {
      data,
      error
    } = await query;

    if (error) {
      console.error(
        "Follow ups:",
        error
      );
      return [];
    }

    return data || [];

  }


  /* =====================================================
     RENDER STATS
  ===================================================== */

  function renderStats(stats) {

    document.getElementById(
      "dashTotal"
    ).textContent =
      stats.total;

    document.getElementById(
      "dashNew"
    ).textContent =
      stats.newLeads;

    document.getElementById(
      "dashInterested"
    ).textContent =
      stats.interested;

    document.getElementById(
      "dashFollowUp"
    ).textContent =
      stats.followUp;

    document.getElementById(
      "dashAppointment"
    ).textContent =
      stats.appointment;

    document.getElementById(
      "dashSiteSurvey"
    ).textContent =
      stats.siteSurvey;

    document.getElementById(
      "dashQuotation"
    ).textContent =
      stats.quotation;

    document.getElementById(
      "dashClosing"
    ).textContent =
      stats.closing;

  }


  /* =====================================================
     RENDER PIPELINE
  ===================================================== */

  function renderPipeline(
    pipeline,
    total
  ) {

    const container =
      document.getElementById(
        "dashPipeline"
      );

    if (!container) {
      return;
    }


    document.getElementById(
      "dashPipelineTotal"
    ).textContent =
      `${total} Leads`;


    const items = [

      ["New", pipeline.newLeads, "new"],

      ["Flyer Sent", pipeline.flyer, "flyer"],

      ["Interested", pipeline.interested, "interested"],

      ["Follow Up", pipeline.followUp, "followup"],

      ["Closing", pipeline.closing, "closing"],

      ["Not Interested", pipeline.notInterested, "not-interested"]

    ];


    container.innerHTML =
      items.map(
        function (item) {

          const percentage =
            total > 0
              ? Math.round(
                  (item[1] / total) * 100
                )
              : 0;

          return `

            <div class="dashboard-pipeline-row">

              <div class="dashboard-pipeline-label">

                <span
                  class="dashboard-status-dot ${item[2]}"
                ></span>

                ${item[0]}

              </div>

              <div class="dashboard-pipeline-track">

                <div
                  class="dashboard-pipeline-fill ${item[2]}"
                  style="width:${percentage}%"
                ></div>

              </div>

              <div class="dashboard-pipeline-value">

                <strong>
                  ${item[1]}
                </strong>

                <span>
                  ${percentage}%
                </span>

              </div>

            </div>

          `;

        }
      )
      .join("");

  }


  /* =====================================================
     RENDER STATUS
  ===================================================== */

  function renderStatus(
    pipeline,
    total
  ) {

    const container =
      document.getElementById(
        "dashStatusList"
      );

    if (!container) {
      return;
    }


    const items = [

      ["New", pipeline.newLeads, "new"],

      ["Flyer Sent", pipeline.flyer, "flyer"],

      ["Interested", pipeline.interested, "interested"],

      ["Follow Up", pipeline.followUp, "followup"],

      ["Closing", pipeline.closing, "closing"],

      ["Not Interested", pipeline.notInterested, "not-interested"]

    ];


    container.innerHTML =
      items.map(
        function (item) {

          const percentage =
            total > 0
              ? Math.round(
                  (item[1] / total) * 100
                )
              : 0;

          return `

            <div class="dashboard-status-item">

              <div class="dashboard-status-name">

                <span
                  class="dashboard-status-dot ${item[2]}"
                ></span>

                ${item[0]}

              </div>

              <strong>
                ${item[1]}
              </strong>

              <span
                class="dashboard-status-percent"
              >
                ${percentage}%
              </span>

            </div>

          `;

        }
      )
      .join("");

  }


  /* =====================================================
     RENDER RECENT
  ===================================================== */

  function renderRecent(
    leads
  ) {

    const container =
      document.getElementById(
        "dashRecentLeads"
      );

    if (!container) {
      return;
    }


    if (!leads.length) {

      container.innerHTML = `

        <div class="dashboard-empty-state">

          <strong>
            No recent leads
          </strong>

          <span>
            New leads will appear here.
          </span>

        </div>

      `;

      return;
    }


    container.innerHTML =
      leads.map(
        function (lead) {

          const name =
            lead.customer_name ||
            "Unnamed Customer";

          return `

            <div class="dashboard-recent-item">

              <div class="dashboard-recent-avatar">

                ${escapeHtml(
                  name
                    .charAt(0)
                    .toUpperCase()
                )}

              </div>


              <div class="dashboard-recent-info">

                <strong>
                  ${escapeHtml(name)}
                </strong>

                <span>
                  ${escapeHtml(
                    lead.business ||
                    lead.location ||
                    "Lead"
                  )}
                </span>

              </div>


              <div class="dashboard-recent-meta">

                <span
                  class="dashboard-status-badge ${statusClass(
                    lead.status
                  )}"
                >
                  ${escapeHtml(
                    normalizeStatus(
                      lead.status
                    )
                  )}
                </span>

                <small>
                  ${formatDate(
                    lead.created_at
                  )}
                </small>

              </div>

            </div>

          `;

        }
      )
      .join("");

  }


  /* =====================================================
     RENDER FOLLOW UPS
  ===================================================== */

  function renderFollowUps(
    leads
  ) {

    const container =
      document.getElementById(
        "dashUpcomingFollowups"
      );

    if (!container) {
      return;
    }


    if (!leads.length) {

      container.innerHTML = `

        <div class="dashboard-empty-state">

          <strong>
            No upcoming follow-ups
          </strong>

          <span>
            Scheduled follow-ups will appear here.
          </span>

        </div>

      `;

      return;
    }


    container.innerHTML =
      leads.map(
        function (lead) {

          return `

            <div class="dashboard-followup-item">

              <div class="dashboard-followup-date">

                ${formatDate(
                  lead.follow_up_date
                )}

              </div>


              <div class="dashboard-followup-info">

                <strong>
                  ${escapeHtml(
                    lead.customer_name ||
                    "Unnamed Customer"
                  )}
                </strong>

                <span>
                  ${escapeHtml(
                    lead.business ||
                    "Customer follow-up"
                  )}
                </span>

              </div>


              <span
                class="dashboard-status-badge ${statusClass(
                  lead.status
                )}"
              >
                ${escapeHtml(
                  normalizeStatus(
                    lead.status
                  )
                )}
              </span>

            </div>

          `;

        }
      )
      .join("");

  }


  /* =====================================================
     MAIN LOAD
  ===================================================== */

  async function loadDashboard(
    force = false
  ) {

    const profile =
      getProfile();

    const client =
      getClient();


    if (!profile || !client) {
      return;
    }


    if (!isDashboardVisible()) {
      return;
    }


    if (isLoading) {
      return;
    }


    const profileId =
      profile.id || "unknown";


    /*
      Only rebuild when:
      - first opening
      - user changed
      - force refresh
    */

    const needsBuild =
      !getDashboard()?.querySelector(
        ".dashboard-shell"
      ) ||
      lastProfileId !== profileId;


    if (needsBuild) {

      buildDashboard();

      lastProfileId =
        profileId;

    }


    isLoading = true;


    const refreshButton =
      document.getElementById(
        "dashboardRefreshButton"
      );


    if (refreshButton) {

      refreshButton.disabled =
        true;

      refreshButton.classList.add(
        "is-loading"
      );

    }


    try {

      const [
        stats,
        pipeline,
        recent,
        followUps
      ] = await Promise.all([

        loadStats(),

        loadPipeline(),

        loadRecentLeads(),

        loadFollowUps()

      ]);


      /*
        Only update values.
        DO NOT rebuild the whole dashboard.
      */

      renderStats(
        stats
      );

      renderPipeline(
        pipeline,
        stats.total
      );

      renderStatus(
        pipeline,
        stats.total
      );

      renderRecent(
        recent
      );

      renderFollowUps(
        followUps
      );


      createIcons();


    } catch (error) {

      console.error(
        "FSI Dashboard Error:",
        error
      );

    } finally {

      isLoading = false;


      if (refreshButton) {

        refreshButton.disabled =
          false;

        refreshButton.classList.remove(
          "is-loading"
        );

      }

    }

  }


  /* =====================================================
     PUBLIC REFRESH
  ===================================================== */

  window.refreshDashboard =
    function () {

      loadDashboard(true);

    };


  /* =====================================================
     WATCH PAGE CHANGE
     -----------------------------------------------------
     Does NOT reload every second.
  ===================================================== */

  function watchDashboard() {

    setInterval(
      function () {

        const visible =
          isDashboardVisible();

        const profile =
          getProfile();


        /*
          Dashboard just became visible.
        */

        if (
          visible &&
          profile &&
          !lastDashboardState
        ) {

          loadDashboard(
            true
          );

        }


        /*
          Dashboard just became hidden.
        */

        if (!visible) {

          lastProfileId =
            null;

        }


        lastDashboardState =
          visible;

      },
      500
    );

  }


  /* =====================================================
     AUTO REFRESH
     -----------------------------------------------------
     Every 30 seconds only.
  ===================================================== */

  function startAutoRefresh() {

    if (autoRefreshTimer) {

      clearInterval(
        autoRefreshTimer
      );

    }


    autoRefreshTimer =
      setInterval(
        function () {

          if (
            isDashboardVisible() &&
            getProfile()
          ) {

            loadDashboard();

          }

        },
        30000
      );

  }


  /* =====================================================
     DOM READY
  ===================================================== */

  document.addEventListener(
    "DOMContentLoaded",
    function () {

      watchDashboard();

      startAutoRefresh();

    }
  );


})();
