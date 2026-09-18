/* =========================================================
   FSI CRM - DASHBOARD
   ---------------------------------------------------------
   Dashboard is separated from index.html.
   Existing script.js is NOT modified.
   Existing Supabase client is reused.
========================================================= */

(function () {

  "use strict";

  let dashboardLoading = false;
  let dashboardRefreshTimer = null;
  let dashboardBootTimer = null;


  /* =========================================================
     HELPERS
  ========================================================= */

  function getProfile() {

    try {

      if (typeof currentProfile !== "undefined") {
        return currentProfile;
      }

    } catch (error) {

      console.error(
        "Unable to access currentProfile:",
        error
      );

    }

    return null;

  }


  function getSupabase() {

    try {

      if (
        typeof supabaseClient !== "undefined" &&
        supabaseClient
      ) {

        return supabaseClient;

      }

    } catch (error) {

      console.error(
        "Unable to access Supabase client:",
        error
      );

    }

    return null;

  }


  function getDashboardElement() {

    return document.getElementById(
      "dashboardPage"
    );

  }


  function isDashboardVisible() {

    const dashboard =
      getDashboardElement();

    if (!dashboard) {
      return false;
    }

    const style =
      window.getComputedStyle(dashboard);

    return style.display !== "none";

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


  function setText(
    id,
    value
  ) {

    const element =
      document.getElementById(id);

    if (!element) return;

    element.textContent =
      value ?? "0";

  }


  function formatDate(
    value
  ) {

    if (!value) {
      return "-";
    }

    try {

      const date =
        new Date(value);

      if (Number.isNaN(date.getTime())) {
        return value;
      }

      return date.toLocaleDateString(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }
      );

    } catch (error) {

      return value;

    }

  }


  function formatDateTime(
    value
  ) {

    if (!value) {
      return "-";
    }

    try {

      const date =
        new Date(value);

      if (Number.isNaN(date.getTime())) {
        return value;
      }

      return date.toLocaleDateString(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }
      );

    } catch (error) {

      return value;

    }

  }


  function isSalesUser(
    profile
  ) {

    if (!profile) {
      return false;
    }

    return String(
      profile.role || ""
    ).toLowerCase() === "sales";

  }


  function isAdminUser(
    profile
  ) {

    if (!profile) {
      return false;
    }

    return !isSalesUser(profile);

  }


  function applyLeadScope(
    query,
    profile
  ) {

    if (
      profile &&
      isSalesUser(profile)
    ) {

      return query.eq(
        "sales_id",
        profile.id
      );

    }

    return query;

  }


  /* =========================================================
     STATUS NORMALIZATION
  ========================================================= */

  function normalizeStatus(
    status
  ) {

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

    if (
      value === "flyer sent"
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
      value === "followup"
    ) {

      return "Follow Up";

    }

    if (
      value === "closing"
    ) {

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


  function getStatusClass(
    status
  ) {

    const normalized =
      normalizeStatus(status);

    return normalized
      .toLowerCase()
      .replace(/\s+/g, "-");

  }


  /* =========================================================
     EXACT COUNT
     ---------------------------------------------------------
     Uses count:"exact",head:true so dashboard does NOT depend
     on Supabase's default 1000-row response limit.
  ========================================================= */

  async function exactCount(
    builder
  ) {

    const supabase =
      getSupabase();

    const profile =
      getProfile();

    if (!supabase || !profile) {
      return 0;
    }

    let query =
      supabase
        .from("leads")
        .select(
          "id",
          {
            count: "exact",
            head: true
          }
        );

    query =
      applyLeadScope(
        query,
        profile
      );

    if (typeof builder === "function") {

      query =
        builder(query);

    }

    const {
      count,
      error
    } = await query;

    if (error) {

      console.error(
        "Dashboard count error:",
        error
      );

      throw error;

    }

    return Number(count || 0);

  }


  /* =========================================================
     STATUS COUNT
  ========================================================= */

  async function countStatus(
    statuses
  ) {

    return exactCount(
      function (query) {

        return query.in(
          "status",
          statuses
        );

      }
    );

  }


  /* =========================================================
     DATE FIELD COUNT
  ========================================================= */

  async function countDateField(
    field
  ) {

    return exactCount(
      function (query) {

        return query
          .not(
            field,
            "is",
            null
          )
          .neq(
            field,
            ""
          );

      }
    );

  }


  /* =========================================================
     CLOSING COUNT
     ---------------------------------------------------------
     Closing is counted when:
     - status = Closing
       OR
     - closing date exists
  ========================================================= */

  async function countClosing() {

    return exactCount(
      function (query) {

        return query.or(
          "status.eq.Closing,closing.not.is.null"
        );

      }
    );

  }


  /* =========================================================
     LOAD MAIN STATISTICS
  ========================================================= */

  async function loadStatistics() {

    const results =
      await Promise.all([

        exactCount(),

        countStatus([
          "New",
          "Belum Dihubungi"
        ]),

        countStatus([
          "Interested",
          "Tertarik"
        ]),

        countStatus([
          "Follow Up",
          "follow-up",
          "Follow-up"
        ]),

        countDateField(
          "appointment"
        ),

        countDateField(
          "site_survey"
        ),

        countDateField(
          "quotation"
        ),

        countClosing()

      ]);

    return {

      total: results[0],
      newLeads: results[1],
      interested: results[2],
      followUp: results[3],
      appointment: results[4],
      siteSurvey: results[5],
      quotation: results[6],
      closing: results[7]

    };

  }


  /* =========================================================
     LOAD PIPELINE COUNTS
  ========================================================= */

  async function loadPipeline() {

    const results =
      await Promise.all([

        countStatus([
          "New",
          "Belum Dihubungi"
        ]),

        countStatus([
          "Flyer Sent"
        ]),

        countStatus([
          "Interested",
          "Tertarik"
        ]),

        countStatus([
          "Follow Up",
          "follow-up",
          "Follow-up"
        ]),

        countStatus([
          "Closing"
        ]),

        countStatus([
          "Not Interested",
          "Tidak Tertarik"
        ])

      ]);

    return {

      newLeads: results[0],
      flyerSent: results[1],
      interested: results[2],
      followUp: results[3],
      closing: results[4],
      notInterested: results[5]

    };

  }


  /* =========================================================
     LOAD RECENT LEADS
  ========================================================= */

  async function loadRecentLeads() {

    const supabase =
      getSupabase();

    const profile =
      getProfile();

    if (!supabase || !profile) {
      return [];
    }

    let query =
      supabase
        .from("leads")
        .select(
          "id, customer_name, business, location, status, created_at, sales_id"
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        )
        .limit(6);

    query =
      applyLeadScope(
        query,
        profile
      );

    const {
      data,
      error
    } = await query;

    if (error) {

      console.error(
        "Recent leads error:",
        error
      );

      return [];

    }

    return data || [];

  }


  /* =========================================================
     LOAD UPCOMING FOLLOW UPS
  ========================================================= */

  async function loadUpcomingFollowUps() {

    const supabase =
      getSupabase();

    const profile =
      getProfile();

    if (!supabase || !profile) {
      return [];
    }

    const today =
      new Date()
        .toISOString()
        .split("T")[0];

    let query =
      supabase
        .from("leads")
        .select(
          "id, customer_name, phone, status, follow_up_date, business"
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
      applyLeadScope(
        query,
        profile
      );

    const {
      data,
      error
    } = await query;

    if (error) {

      console.error(
        "Upcoming follow-up error:",
        error
      );

      return [];

    }

    return data || [];

  }


  /* =========================================================
     RENDER DASHBOARD SHELL
  ========================================================= */

  function renderDashboardShell(
    profile
  ) {

    const dashboard =
      getDashboardElement();

    if (!dashboard) {
      return;
    }

    const roleLabel =
      isAdminUser(profile)
        ? "Admin Overview"
        : "My Sales Overview";

    const displayName =
      profile.name ||
      profile.sales_name ||
      profile.full_name ||
      profile.username ||
      "User";

    dashboard.innerHTML = `

      <div class="dashboard-shell">

        <!-- =========================================
             DASHBOARD HEADER
        ========================================== -->

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
                Welcome back, ${escapeHtml(displayName)}.
                Here's your latest CRM overview.
              </p>

            </div>

          </div>


          <div class="dashboard-toolbar-actions">

            <span
              class="dashboard-role-badge"
              id="dashRole"
            >
              ${escapeHtml(roleLabel)}
            </span>

            <button
              type="button"
              class="dashboard-refresh-btn"
              onclick="refreshDashboard()"
              id="dashboardRefreshBtn"
            >

              <i data-lucide="refresh-cw"></i>

              <span>
                Refresh
              </span>

            </button>

          </div>

        </div>


        <!-- =========================================
             STAT CARDS
        ========================================== -->

        <div class="dashboard-stats-grid">


          <!-- TOTAL -->

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


          <!-- NEW -->

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


          <!-- INTERESTED -->

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


          <!-- FOLLOW UP -->

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


          <!-- APPOINTMENT -->

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


          <!-- SITE SURVEY -->

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


          <!-- QUOTATION -->

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


          <!-- CLOSING -->

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


        <!-- =========================================
             MAIN DASHBOARD GRID
        ========================================== -->

        <div class="dashboard-main-grid">


          <!-- =======================================
               PIPELINE
          ======================================== -->

          <section class="dashboard-panel dashboard-pipeline-panel">

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
                class="dashboard-panel-total"
                id="dashPipelineTotal"
              >
                0 Leads
              </div>

            </div>


            <div
              id="dashPipeline"
              class="dashboard-pipeline"
            >

              <!-- Filled by JavaScript -->

            </div>

          </section>


          <!-- =======================================
               STATUS DISTRIBUTION
          ======================================== -->

          <section class="dashboard-panel dashboard-status-panel">

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
            >

              <!-- Filled by JavaScript -->

            </div>

          </section>


        </div>


        <!-- =========================================
             RECENT + FOLLOW UP
        ========================================== -->

        <div class="dashboard-bottom-grid">


          <!-- =======================================
               RECENT LEADS
          ======================================== -->

          <section class="dashboard-panel dashboard-recent-panel">

            <div class="dashboard-panel-header">

              <div>

                <span class="dashboard-panel-kicker">
                  ACTIVITY
                </span>

                <h2>
                  Recent Leads
                </h2>

                <p>
                  Latest leads added to the CRM.
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
            >

              <!-- Filled by JavaScript -->

            </div>

          </section>


          <!-- =======================================
               UPCOMING FOLLOW UPS
          ======================================== -->

          <section class="dashboard-panel dashboard-followup-panel">

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
            >

              <!-- Filled by JavaScript -->

            </div>

          </section>


        </div>


        <!-- =========================================
             DASHBOARD FOOTER
        ========================================== -->

        <div class="dashboard-footer">

          <span>
            FSI CRM
          </span>

          <span class="dashboard-footer-dot">
            •
          </span>

          <span>
            Dashboard data is loaded directly from Supabase.
          </span>

        </div>


      </div>

    `;


    if (
      window.lucide &&
      typeof lucide.createIcons === "function"
    ) {

      lucide.createIcons();

    }

  }


  /* =========================================================
     RENDER STATISTICS
  ========================================================= */

  function renderStatistics(
    stats
  ) {

    setText(
      "dashTotal",
      stats.total
    );

    setText(
      "dashNew",
      stats.newLeads
    );

    setText(
      "dashInterested",
      stats.interested
    );

    setText(
      "dashFollowUp",
      stats.followUp
    );

    setText(
      "dashAppointment",
      stats.appointment
    );

    setText(
      "dashSiteSurvey",
      stats.siteSurvey
    );

    setText(
      "dashQuotation",
      stats.quotation
    );

    setText(
      "dashClosing",
      stats.closing
    );

  }


  /* =========================================================
     PIPELINE
  ========================================================= */

  function renderPipeline(
    pipeline,
    total
  ) {

    const container =
      document.getElementById(
        "dashPipeline"
      );

    const totalElement =
      document.getElementById(
        "dashPipelineTotal"
      );

    if (!container) {
      return;
    }

    if (totalElement) {

      totalElement.textContent =
        `${total} Leads`;

    }


    const items = [

      {
        label: "New",
        value: pipeline.newLeads,
        className: "new",
        icon: "user-plus"
      },

      {
        label: "Flyer Sent",
        value: pipeline.flyerSent,
        className: "flyer",
        icon: "send"
      },

      {
        label: "Interested",
        value: pipeline.interested,
        className: "interested",
        icon: "heart"
      },

      {
        label: "Follow Up",
        value: pipeline.followUp,
        className: "followup",
        icon: "phone-forwarded"
      },

      {
        label: "Closing",
        value: pipeline.closing,
        className: "closing",
        icon: "badge-check"
      },

      {
        label: "Not Interested",
        value: pipeline.notInterested,
        className: "not-interested",
        icon: "x-circle"
      }

    ];


    container.innerHTML =
      items.map(
        function (item) {

          const percentage =
            total > 0
              ? Math.round(
                  (item.value / total) * 100
                )
              : 0;

          return `

            <div class="dashboard-pipeline-row">

              <div class="dashboard-pipeline-label">

                <div
                  class="dashboard-pipeline-icon ${item.className}"
                >
                  <i data-lucide="${item.icon}"></i>
                </div>

                <span>
                  ${escapeHtml(item.label)}
                </span>

              </div>


              <div class="dashboard-pipeline-track">

                <div
                  class="dashboard-pipeline-fill ${item.className}"
                  style="width:${percentage}%"
                ></div>

              </div>


              <div class="dashboard-pipeline-value">

                <strong>
                  ${item.value}
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


    if (
      window.lucide &&
      typeof lucide.createIcons === "function"
    ) {

      lucide.createIcons();

    }

  }


  /* =========================================================
     STATUS LIST
  ========================================================= */

  function renderStatusList(
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

      {
        label: "New",
        value: pipeline.newLeads,
        className: "new"
      },

      {
        label: "Flyer Sent",
        value: pipeline.flyerSent,
        className: "flyer"
      },

      {
        label: "Interested",
        value: pipeline.interested,
        className: "interested"
      },

      {
        label: "Follow Up",
        value: pipeline.followUp,
        className: "followup"
      },

      {
        label: "Closing",
        value: pipeline.closing,
        className: "closing"
      },

      {
        label: "Not Interested",
        value: pipeline.notInterested,
        className: "not-interested"
      }

    ];


    container.innerHTML =
      items.map(
        function (item) {

          const percentage =
            total > 0
              ? Math.round(
                  (item.value / total) * 100
                )
              : 0;

          return `

            <div class="dashboard-status-item">

              <div class="dashboard-status-name">

                <span
                  class="dashboard-status-dot ${item.className}"
                ></span>

                <span>
                  ${escapeHtml(item.label)}
                </span>

              </div>

              <strong>
                ${item.value}
              </strong>

              <span class="dashboard-status-percent">
                ${percentage}%
              </span>

            </div>

          `;

        }
      )
      .join("");

  }


  /* =========================================================
     RECENT LEADS
  ========================================================= */

  function renderRecentLeads(
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

          <div class="dashboard-empty-icon">
            <i data-lucide="inbox"></i>
          </div>

          <strong>
            No recent leads
          </strong>

          <span>
            New leads will appear here.
          </span>

        </div>

      `;

      if (
        window.lucide &&
        typeof lucide.createIcons === "function"
      ) {

        lucide.createIcons();

      }

      return;

    }


    container.innerHTML =
      leads.map(
        function (lead) {

          const status =
            normalizeStatus(
              lead.status
            );

          const statusClass =
            getStatusClass(
              lead.status
            );

          return `

            <div class="dashboard-recent-item">

              <div class="dashboard-recent-avatar">

                ${
                  escapeHtml(
                    String(
                      lead.customer_name || "?"
                    )
                    .charAt(0)
                    .toUpperCase()
                  )
                }

              </div>


              <div class="dashboard-recent-info">

                <strong>
                  ${escapeHtml(
                    lead.customer_name ||
                    "Unnamed Customer"
                  )}
                </strong>

                <span>

                  ${
                    escapeHtml(
                      lead.business ||
                      lead.location ||
                      "Lead"
                    )
                  }

                </span>

              </div>


              <div class="dashboard-recent-meta">

                <span
                  class="dashboard-status-badge ${statusClass}"
                >
                  ${escapeHtml(status)}
                </span>

                <small>
                  ${formatDateTime(
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


  /* =========================================================
     UPCOMING FOLLOW UPS
  ========================================================= */

  function renderUpcomingFollowUps(
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

          <div class="dashboard-empty-icon">
            <i data-lucide="calendar-check"></i>
          </div>

          <strong>
            No upcoming follow-ups
          </strong>

          <span>
            Your scheduled follow-ups will appear here.
          </span>

        </div>

      `;

      if (
        window.lucide &&
        typeof lucide.createIcons === "function"
      ) {

        lucide.createIcons();

      }

      return;

    }


    container.innerHTML =
      leads.map(
        function (lead) {

          const status =
            normalizeStatus(
              lead.status
            );

          return `

            <div class="dashboard-followup-item">

              <div class="dashboard-followup-date">

                <span>
                  ${formatDate(
                    lead.follow_up_date
                  )}
                </span>

              </div>


              <div class="dashboard-followup-info">

                <strong>
                  ${escapeHtml(
                    lead.customer_name ||
                    "Unnamed Customer"
                  )}
                </strong>

                <span>
                  ${
                    escapeHtml(
                      lead.business ||
                      "Customer follow-up"
                    )
                  }
                </span>

              </div>


              <span
                class="dashboard-status-badge ${getStatusClass(
                  lead.status
                )}"
              >
                ${escapeHtml(status)}
              </span>

            </div>

          `;

        }
      )
      .join("");

  }


  /* =========================================================
     LOADING STATE
  ========================================================= */

  function showDashboardLoading() {

    const elements = [

      "dashTotal",
      "dashNew",
      "dashInterested",
      "dashFollowUp",
      "dashAppointment",
      "dashSiteSurvey",
      "dashQuotation",
      "dashClosing"

    ];


    elements.forEach(
      function (id) {

        const element =
          document.getElementById(id);

        if (element) {

          element.classList.add(
            "dashboard-loading-number"
          );

          element.textContent =
            "—";

        }

      }
    );

  }


  /* =========================================================
     ERROR STATE
  ========================================================= */

  function showDashboardError(
    error
  ) {

    console.error(
      "Dashboard loading failed:",
      error
    );


    const pipeline =
      document.getElementById(
        "dashPipeline"
      );

    if (pipeline) {

      pipeline.innerHTML = `

        <div class="dashboard-error-state">

          <div class="dashboard-error-icon">
            <i data-lucide="alert-circle"></i>
          </div>

          <strong>
            Unable to load dashboard data
          </strong>

          <span>
            Please check your connection and try again.
          </span>

          <button
            type="button"
            onclick="refreshDashboard()"
          >
            Try Again
          </button>

        </div>

      `;

    }


    if (
      window.lucide &&
      typeof lucide.createIcons === "function"
    ) {

      lucide.createIcons();

    }

  }


  /* =========================================================
     BUTTON STATE
  ========================================================= */

  function setRefreshButtonState(
    loading
  ) {

    const button =
      document.getElementById(
        "dashboardRefreshBtn"
      );

    if (!button) {
      return;
    }


    if (loading) {

      button.classList.add(
        "is-loading"
      );

      button.disabled = true;

      button.innerHTML = `

        <i data-lucide="loader-circle"></i>

        <span>
          Loading...
        </span>

      `;

    } else {

      button.classList.remove(
        "is-loading"
      );

      button.disabled = false;

      button.innerHTML = `

        <i data-lucide="refresh-cw"></i>

        <span>
          Refresh
        </span>

      `;

    }


    if (
      window.lucide &&
      typeof lucide.createIcons === "function"
    ) {

      lucide.createIcons();

    }

  }


  /* =========================================================
     MAIN DASHBOARD LOADER
  ========================================================= */

  async function loadDashboard() {

    if (dashboardLoading) {
      return;
    }

    if (!isDashboardVisible()) {
      return;
    }


    const profile =
      getProfile();

    const supabase =
      getSupabase();


    if (!profile || !supabase) {
      return;
    }


    dashboardLoading = true;


    try {

      /*
        Build dashboard shell if it does not exist yet.
      */

      const dashboard =
        getDashboardElement();

      if (
        dashboard &&
        !dashboard.querySelector(
          ".dashboard-shell"
        )
      ) {

        renderDashboardShell(
          profile
        );

      }


      setRefreshButtonState(
        true
      );

      showDashboardLoading();


      /*
        Load all dashboard information.
      */

      const [
        statistics,
        pipeline,
        recentLeads,
        upcomingFollowUps
      ] = await Promise.all([

        loadStatistics(),

        loadPipeline(),

        loadRecentLeads(),

        loadUpcomingFollowUps()

      ]);


      /*
        Render everything.
      */

      renderStatistics(
        statistics
      );

      renderPipeline(
        pipeline,
        statistics.total
      );

      renderStatusList(
        pipeline,
        statistics.total
      );

      renderRecentLeads(
        recentLeads
      );

      renderUpcomingFollowUps(
        upcomingFollowUps
      );


      /*
        Remove loading class from numbers.
      */

      [
        "dashTotal",
        "dashNew",
        "dashInterested",
        "dashFollowUp",
        "dashAppointment",
        "dashSiteSurvey",
        "dashQuotation",
        "dashClosing"
      ].forEach(
        function (id) {

          const element =
            document.getElementById(id);

          if (element) {

            element.classList.remove(
              "dashboard-loading-number"
            );

          }

        }
      );


    } catch (error) {

      showDashboardError(
        error
      );

    } finally {

      dashboardLoading = false;

      setRefreshButtonState(
        false
      );

    }

  }


  /* =========================================================
     PUBLIC REFRESH FUNCTION
     ---------------------------------------------------------
     This allows:
       onclick="refreshDashboard()"
  ========================================================= */

  window.refreshDashboard =
    function () {

      loadDashboard();

    };


  /* =========================================================
     START DASHBOARD
  ========================================================= */

  function startDashboardWatcher() {

    /*
      Small boot watcher because login may happen
      after DOMContentLoaded.
    */

    if (dashboardBootTimer) {

      clearInterval(
        dashboardBootTimer
      );

    }


    dashboardBootTimer =
      setInterval(
        function () {

          const profile =
            getProfile();

          if (
            profile &&
            isDashboardVisible()
          ) {

            loadDashboard();

          }

        },
        1000
      );


    /*
      Automatic refresh every 15 seconds.
    */

    if (dashboardRefreshTimer) {

      clearInterval(
        dashboardRefreshTimer
      );

    }


    dashboardRefreshTimer =
      setInterval(
        function () {

          const profile =
            getProfile();

          if (
            profile &&
            isDashboardVisible() &&
            !dashboardLoading
          ) {

            loadDashboard();

          }

        },
        15000
      );

  }


  /* =========================================================
     DOM READY
  ========================================================= */

  document.addEventListener(
    "DOMContentLoaded",
    function () {

      startDashboardWatcher();

    }
  );


})();
