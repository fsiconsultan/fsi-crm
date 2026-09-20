```javascript
// ============================================================
// CRM FSI - DASHBOARD
// ============================================================
// File ini KHUSUS mengurus Dashboard.
// Tidak mengubah Login, Leads, Sales, atau fungsi lainnya.
// Membutuhkan:
//   - supabaseClient dari script.js
//   - currentProfile dari script.js
//   - <div id="dashboardPage"></div>
//   - dashboard.css
// ============================================================

(function () {
  "use strict";

  let dashboardLoading = false;
  let dashboardBuilt = false;
  let dashboardProfileId = null;
  let dashboardAutoRefreshTimer = null;

  // ==========================================================
  // HELPERS
  // ==========================================================

  function getClient() {
    return window.supabaseClient || null;
  }

  function getProfile() {
    return window.currentProfile || null;
  }

  function getElement(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    const element = getElement(id);

    if (element) {
      element.textContent = value ?? "0";
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function getLocalToday() {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function normalizeStatus(status) {
    const value = String(status || "")
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

  function statusClass(status) {
    return normalizeStatus(status)
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  }

  function isSales(profile) {
    if (!profile) return false;

    const role = String(profile.role || "")
      .trim()
      .toLowerCase();

    return (
      role === "sales" ||
      role === "salesman" ||
      role === "sales person"
    );
  }

  function isAdmin(profile) {
    if (!profile) return false;

    const role = String(profile.role || "")
      .trim()
      .toLowerCase();

    return (
      role === "admin" ||
      role === "owner" ||
      role === "administrator"
    );
  }

  // ==========================================================
  // ROLE SCOPE
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
  // BUILD DASHBOARD HTML
  // ==========================================================

  function buildDashboard() {
    const page = getElement("dashboardPage");

    if (!page) {
      console.error(
        "CRM FSI Dashboard: #dashboardPage tidak ditemukan."
      );
      return false;
    }

    const profile = getProfile();
    const salesMode = isSales(profile);

    page.innerHTML = `
      <div class="dashboard-shell">

        <!-- ================================================
             HEADER
        ================================================= -->

        <div class="dashboard-toolbar">

          <div class="dashboard-heading">

            <div class="dashboard-heading-icon">
              📊
            </div>

            <div>

              <div class="dashboard-kicker">
                CRM FSI
              </div>

              <h1>
                Sales Dashboard
              </h1>

              <span class="dashboard-role-badge">
                ${
                  salesMode
                    ? "My Sales Overview"
                    : "Admin Overview"
                }
              </span>

            </div>

          </div>

          <button
            type="button"
            class="dashboard-refresh-btn"
            id="dashboardRefreshButton"
          >
            ↻ Refresh
          </button>

        </div>


        <!-- ================================================
             STATISTICS
        ================================================= -->

        <div class="dashboard-stats-grid">

          <div class="dashboard-stat-card total">

            <div class="dashboard-stat-icon">
              👥
            </div>

            <div>
              <span>Total Leads</span>
              <strong id="dashTotal">0</strong>
            </div>

          </div>


          <div class="dashboard-stat-card new">

            <div class="dashboard-stat-icon">
              🆕
            </div>

            <div>
              <span>New</span>
              <strong id="dashNew">0</strong>
            </div>

          </div>


          <div class="dashboard-stat-card interested">

            <div class="dashboard-stat-icon">
              ❤️
            </div>

            <div>
              <span>Interested</span>
              <strong id="dashInterested">0</strong>
            </div>

          </div>


          <div class="dashboard-stat-card followup">

            <div class="dashboard-stat-icon">
              🔔
            </div>

            <div>
              <span>Follow Up</span>
              <strong id="dashFollowUp">0</strong>
            </div>

          </div>


          <div class="dashboard-stat-card appointment">

            <div class="dashboard-stat-icon">
              📅
            </div>

            <div>
              <span>Appointment</span>
              <strong id="dashAppointment">0</strong>
            </div>

          </div>


          <div class="dashboard-stat-card survey">

            <div class="dashboard-stat-icon">
              📍
            </div>

            <div>
              <span>Site Survey</span>
              <strong id="dashSiteSurvey">0</strong>
            </div>

          </div>


          <div class="dashboard-stat-card quotation">

            <div class="dashboard-stat-icon">
              📄
            </div>

            <div>
              <span>Quotation</span>
              <strong id="dashQuotation">0</strong>
            </div>

          </div>


          <div class="dashboard-stat-card closing">

            <div class="dashboard-stat-icon">
              ✓
            </div>

            <div>
              <span>Closing</span>
              <strong id="dashClosing">0</strong>
            </div>

          </div>

        </div>


        <!-- ================================================
             PIPELINE + STATUS
        ================================================= -->

        <div class="dashboard-main-grid">

          <section class="dashboard-panel">

            <div class="dashboard-panel-header">

              <div>
                <h2>Sales Pipeline</h2>
                <p>Lead progression</p>
              </div>

              <strong id="dashPipelineTotal">
                0
              </strong>

            </div>

            <div
              class="dashboard-pipeline"
              id="dashPipeline"
            >
              <div class="dashboard-empty">
                Loading...
              </div>
            </div>

          </section>


          <section class="dashboard-panel">

            <div class="dashboard-panel-header">

              <div>
                <h2>Lead Status</h2>
                <p>Current distribution</p>
              </div>

            </div>

            <div
              class="dashboard-status-list"
              id="dashStatusList"
            >
              <div class="dashboard-empty">
                Loading...
              </div>
            </div>

          </section>

        </div>


        <!-- ================================================
             RECENT LEADS + FOLLOW UP
        ================================================= -->

        <div class="dashboard-bottom-grid">

          <section class="dashboard-panel">

            <div class="dashboard-panel-header">

              <div>
                <h2>Recent Leads</h2>
                <p>Latest customer activity</p>
              </div>

              <button
                type="button"
                class="dashboard-view-btn"
                id="dashboardViewLeadsButton"
              >
                View Leads
              </button>

            </div>

            <div
              class="dashboard-recent-leads"
              id="dashRecentLeads"
            >
              <div class="dashboard-empty">
                Loading...
              </div>
            </div>

          </section>


          <section class="dashboard-panel">

            <div class="dashboard-panel-header">

              <div>
                <h2>Upcoming Follow Up</h2>
                <p>Next customer actions</p>
              </div>

            </div>

            <div
              class="dashboard-upcoming"
              id="dashUpcomingFollowups"
            >
              <div class="dashboard-empty">
                Loading...
              </div>
            </div>

          </section>

        </div>

      </div>
    `;

    const refreshButton =
      getElement("dashboardRefreshButton");

    if (refreshButton) {
      refreshButton.addEventListener(
        "click",
        function () {
          loadDashboard(true);
        }
      );
    }

    const viewLeadsButton =
      getElement(
        "dashboardViewLeadsButton"
      );

    if (viewLeadsButton) {
      viewLeadsButton.addEventListener(
        "click",
        function () {

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
  // TOTAL COUNT
  // ==========================================================

  async function loadTotal(profile) {
    const client = getClient();

    if (!client) {
      return 0;
    }

    let query = client
      .from("leads")
      .select("id", {
        count: "exact",
        head: true
      });

    query = applyScope(
      query,
      profile
    );

    const { count, error } =
      await query;

    if (error) {
      console.error(
        "Dashboard total error:",
        error
      );

      return 0;
    }

    return count || 0;
  }

  // ==========================================================
  // STATUS COUNT
  // ==========================================================

  async function loadStatusCount(
    statuses,
    profile
  ) {
    const client = getClient();

    if (!client) {
      return 0;
    }

    let query = client
      .from("leads")
      .select("status");

    query = applyScope(
      query,
      profile
    );

    const { data, error } =
      await query;

    if (error) {
      console.error(
        "Dashboard status count error:",
        error
      );

      return 0;
    }

    const targets =
      statuses.map(normalizeStatus);

    return (data || []).filter(row => {
      return targets.includes(
        normalizeStatus(row.status)
      );
    }).length;
  }

  // ==========================================================
  // DATE FIELD COUNT
  // ==========================================================

  async function loadDateCount(
    field,
    profile
  ) {
    const client = getClient();

    if (!client) {
      return 0;
    }

    let query = client
      .from("leads")
      .select(`id, ${field}`)
      .not(field, "is", null);

    query = applyScope(
      query,
      profile
    );

    const { data, error } =
      await query;

    if (error) {
      console.error(
        `Dashboard ${field} error:`,
        error
      );

      return 0;
    }

    return (data || []).filter(row => {
      return (
        row[field] !== null &&
        row[field] !== ""
      );
    }).length;
  }

  // ==========================================================
  // CLOSING COUNT
  // ==========================================================

  async function loadClosingCount(profile) {
    const client = getClient();

    if (!client) {
      return 0;
    }

    let query = client
      .from("leads")
      .select(
        "status, closing"
      );

    query = applyScope(
      query,
      profile
    );

    const { data, error } =
      await query;

    if (error) {
      console.error(
        "Dashboard closing error:",
        error
      );

      return 0;
    }

    return (data || []).filter(row => {

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
  // LOAD STATISTICS
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

        loadClosingCount(profile)
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

    const client = getClient();

    if (!client) return;

    let query = client
      .from("leads")
      .select("status");

    query = applyScope(
      query,
      profile
    );

    const { data, error } =
      await query;

    if (error) {
      console.error(
        "Dashboard pipeline error:",
        error
      );

      return;
    }

    const rows = data || [];

    const statuses = [
      "New",
      "Flyer Sent",
      "Interested",
      "Follow Up",
      "Closing",
      "Not Interested"
    ];

    const total = rows.length;

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
      statuses.map(status => {

        const count =
          rows.filter(row => {
            return (
              normalizeStatus(
                row.status
              ) === status
            );
          }).length;

        const percentage =
          total > 0
            ? Math.round(
                (count / total) * 100
              )
            : 0;

        return `
          <div class="dashboard-pipeline-row">

            <div class="dashboard-pipeline-label">

              <span>
                ${escapeHtml(status)}
              </span>

              <strong>
                ${count}
              </strong>

            </div>

            <div class="dashboard-pipeline-track">

              <div
                class="dashboard-pipeline-fill ${statusClass(status)}"
                style="width:${percentage}%"
              ></div>

            </div>

            <small>
              ${percentage}%
            </small>

          </div>
        `;

      }).join("");
  }

  // ==========================================================
  // STATUS DISTRIBUTION
  // ==========================================================

  async function loadStatusDistribution(profile) {

    const client = getClient();

    if (!client) return;

    let query = client
      .from("leads")
      .select("status");

    query = applyScope(
      query,
      profile
    );

    const { data, error } =
      await query;

    if (error) {
      console.error(
        "Dashboard status list error:",
        error
      );

      return;
    }

    const rows = data || [];

    const statuses = [
      "New",
      "Flyer Sent",
      "Interested",
      "Follow Up",
      "Closing",
      "Not Interested"
    ];

    const total = rows.length;

    const container =
      getElement(
        "dashStatusList"
      );

    if (!container) {
      return;
    }

    container.innerHTML =
      statuses.map(status => {

        const count =
          rows.filter(row => {
            return (
              normalizeStatus(
                row.status
              ) === status
            );
          }).length;

        const percentage =
          total > 0
            ? Math.round(
                (count / total) * 100
              )
            : 0;

        return `
          <div class="dashboard-status-row">

            <div class="dashboard-status-name">

              <span
                class="dashboard-status-dot ${statusClass(status)}"
              ></span>

              <span>
                ${escapeHtml(status)}
              </span>

            </div>

            <strong>
              ${count}
            </strong>

            <small>
              ${percentage}%
            </small>

          </div>
        `;

      }).join("");
  }

  // ==========================================================
  // RECENT LEADS
  // ==========================================================

  async function loadRecentLeads(profile) {

    const client = getClient();

    if (!client) return;

    let query = client
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

    query = applyScope(
      query,
      profile
    );

    const { data, error } =
      await query;

    const container =
      getElement(
        "dashRecentLeads"
      );

    if (!container) {
      return;
    }

    if (error) {

      console.error(
        "Dashboard recent leads error:",
        error
      );

      container.innerHTML = `
        <div class="dashboard-empty">
          Failed to load leads.
        </div>
      `;

      return;
    }

    if (
      !data ||
      data.length === 0
    ) {

      container.innerHTML = `
        <div class="dashboard-empty">
          No leads yet.
        </div>
      `;

      return;
    }

    container.innerHTML =
      data.map(lead => {

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

        return `
          <div class="dashboard-recent-lead">

            <div class="dashboard-recent-avatar">
              ${escapeHtml(initial)}
            </div>

            <div class="dashboard-recent-info">

              <strong>
                ${escapeHtml(
                  lead.customer_name ||
                  "No Name"
                )}
              </strong>

              <span>
                ${escapeHtml(
                  lead.business ||
                  "-"
                )}

                ${
                  lead.location
                    ? ` · ${escapeHtml(
                        lead.location
                      )}`
                    : ""
                }
              </span>

            </div>

            <div class="dashboard-recent-meta">

              <span
                class="dashboard-status-badge ${statusClass(status)}"
              >
                ${escapeHtml(status)}
              </span>

              <small>
                ${formatDate(
                  lead.created_at
                )}
              </small>

            </div>

          </div>
        `;

      }).join("");
  }

  // ==========================================================
  // UPCOMING FOLLOW UPS
  // ==========================================================

  async function loadUpcomingFollowUps(profile) {

    const client = getClient();

    if (!client) return;

    const today =
      getLocalToday();

    let query = client
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

    query = applyScope(
      query,
      profile
    );

    const { data, error } =
      await query;

    const container =
      getElement(
        "dashUpcomingFollowups"
      );

    if (!container) {
      return;
    }

    if (error) {

      console.error(
        "Dashboard follow-up error:",
        error
      );

      container.innerHTML = `
        <div class="dashboard-empty">
          Failed to load follow-ups.
        </div>
      `;

      return;
    }

    if (
      !data ||
      data.length === 0
    ) {

      container.innerHTML = `
        <div class="dashboard-empty">
          No upcoming follow-ups.
        </div>
      `;

      return;
    }

    container.innerHTML =
      data.map(lead => {

        let formattedDate =
          formatDate(
            lead.follow_up_date
          );

        return `
          <div class="dashboard-followup-item">

            <div class="dashboard-followup-date">
              <strong>
                ${escapeHtml(
                  formattedDate
                )}
              </strong>
            </div>

            <div class="dashboard-followup-info">

              <strong>
                ${escapeHtml(
                  lead.customer_name ||
                  "No Name"
                )}
              </strong>

              <span>
                ${escapeHtml(
                  lead.business ||
                  "-"
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

      }).join("");
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
      return;
    }

    const profile =
      getProfile();

    if (!profile) {
      return;
    }

    const profileId =
      profile.id ||
      profile.auth_user_id ||
      profile.auth_user_id;

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
  // PUBLIC REFRESH
  // ==========================================================

  window.refreshDashboard =
    function () {
      return loadDashboard(true);
    };

  // ==========================================================
  // DASHBOARD VISIBILITY
  // ==========================================================

  function isDashboardVisible() {

    const page =
      getElement(
        "dashboardPage"
      );

    if (!page) {
      return false;
    }

    const style =
      window.getComputedStyle(
        page
      );

    return (
      style.display !== "none" &&
      page.offsetParent !== null
    );
  }

  // ==========================================================
  // WATCH DASHBOARD
  // ==========================================================

  function watchDashboard() {

    let wasVisible = false;

    setInterval(() => {

      const visible =
        isDashboardVisible();

      if (
        visible &&
        !wasVisible
      ) {
        loadDashboard(true);
      }

      wasVisible =
        visible;

    }, 500);
  }

  // ==========================================================
  // AUTO REFRESH
  // ==========================================================

  function startAutoRefresh() {

    if (
      dashboardAutoRefreshTimer
    ) {
      clearInterval(
        dashboardAutoRefreshTimer
      );
    }

    dashboardAutoRefreshTimer =
      setInterval(() => {

        if (
          isDashboardVisible()
        ) {
          loadDashboard(true);
        }

      }, 30000);
  }

  // ==========================================================
  // INITIALIZE
  // ==========================================================

  function initializeDashboard() {

    watchDashboard();

    startAutoRefresh();

    // Jika dashboard sudah terbuka
    // saat script selesai dimuat.
    if (
      isDashboardVisible()
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
```
