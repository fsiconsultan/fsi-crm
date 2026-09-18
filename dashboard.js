/* =========================================================
   FSI CRM - NEW DASHBOARD
   Dashboard tambahan.
   
   SCRIPT.JS TIDAK DIUBAH.
   ========================================================= */

(function () {

  let dashboardRefreshTimer = null;


  /* ========================================================
     HELPERS
  ======================================================== */

  function setText(id, value) {

    const element =
      document.getElementById(id);

    if (element) {
      element.textContent =
        value ?? 0;
    }

  }


  function formatNumber(value) {

    return Number(value || 0)
      .toLocaleString("id-ID");

  }


  function escapeHTML(value) {

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }


  function normalizeStatus(status) {

    if (!status) return "";

    const value =
      String(status)
        .trim()
        .toLowerCase();


    const map = {

      "new":
        "New",

      "belum dihubungi":
        "New",

      "flyer sent":
        "Flyer Sent",

      "flyer dikirim":
        "Flyer Sent",

      "interested":
        "Interested",

      "tertarik":
        "Interested",

      "follow up":
        "Follow Up",

      "follow-up":
        "Follow Up",

      "followup":
        "Follow Up",

      "closing":
        "Closing",

      "not interested":
        "Not Interested",

      "tidak tertarik":
        "Not Interested"

    };


    return map[value] || status;

  }


  /* ========================================================
     USER SCOPE
  ======================================================== */

  function getScope() {

    if (
      typeof currentProfile === "undefined" ||
      !currentProfile
    ) {

      return null;

    }


    const role =
      String(
        currentProfile.role || ""
      ).toLowerCase();


    return {

      isAdmin:
        role === "admin",

      salesId:
        currentProfile.id

    };

  }


  function applyScope(query, scope) {

    if (!scope) {
      return query;
    }


    if (!scope.isAdmin) {

      return query.eq(
        "sales_id",
        scope.salesId
      );

    }


    return query;

  }


  /* ========================================================
     EXACT COUNT
     
     Menggunakan count: exact + head:true
     agar tidak terkena batas 1.000 row.
  ======================================================== */

  async function exactCount(
    scope,
    callback
  ) {

    let query =
      supabaseClient
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
        scope
      );


    if (callback) {
      query =
        callback(query);
    }


    const {
      count,
      error
    } =
      await query;


    if (error) {

      console.error(
        "Dashboard count error:",
        error
      );

      return 0;

    }


    return count || 0;

  }


  async function countStatus(
    scope,
    statuses
  ) {

    return exactCount(
      scope,
      function (query) {

        return query.in(
          "status",
          statuses
        );

      }
    );

  }


  async function countDateField(
    scope,
    field
  ) {

    return exactCount(
      scope,
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


  async function countClosing(
    scope
  ) {

    return exactCount(
      scope,
      function (query) {

        return query.or(
          "status.eq.Closing,closing.not.is.null"
        );

      }
    );

  }


  /* ========================================================
     LOAD STATISTICS
  ======================================================== */

  async function loadStatistics(
    scope
  ) {

    const results =
      await Promise.all([

        exactCount(
          scope
        ),

        countStatus(
          scope,
          [
            "New",
            "Belum Dihubungi"
          ]
        ),

        countStatus(
          scope,
          [
            "Interested",
            "Tertarik"
          ]
        ),

        countStatus(
          scope,
          [
            "Follow Up",
            "follow-up",
            "Follow-up"
          ]
        ),

        countDateField(
          scope,
          "appointment"
        ),

        countDateField(
          scope,
          "site_survey"
        ),

        countDateField(
          scope,
          "quotation"
        ),

        countClosing(
          scope
        ),

        countStatus(
          scope,
          [
            "Not Interested",
            "Tidak Tertarik"
          ]
        )

      ]);


    const [
      total,
      newLeads,
      interested,
      followUp,
      appointment,
      siteSurvey,
      quotation,
      closing,
      notInterested
    ] = results;


    /* =============================================
       NEW DASHBOARD
    ============================================== */

    setText(
      "dashTotalLeads",
      formatNumber(total)
    );

    setText(
      "dashNewLeads",
      formatNumber(newLeads)
    );

    setText(
      "dashInterested",
      formatNumber(interested)
    );

    setText(
      "dashFollowUp",
      formatNumber(followUp)
    );

    setText(
      "dashAppointment",
      formatNumber(appointment)
    );

    setText(
      "dashSiteSurvey",
      formatNumber(siteSurvey)
    );

    setText(
      "dashQuotation",
      formatNumber(quotation)
    );

    setText(
      "dashClosing",
      formatNumber(closing)
    );


    /* =============================================
       PIPELINE
    ============================================== */

    setText(
      "pipeNew",
      newLeads
    );

    setText(
      "pipeInterested",
      interested
    );

    setText(
      "pipeFollowUp",
      followUp
    );

    setText(
      "pipeNotInterested",
      notInterested
    );

    setText(
      "pipeClosing",
      closing
    );


    /* =============================================
       STATUS
    ============================================== */

    setText(
      "dashStatusTotal",
      formatNumber(total)
    );

    setText(
      "legendNew",
      newLeads
    );

    setText(
      "legendInterested",
      interested
    );

    setText(
      "legendFollowUp",
      followUp
    );

    setText(
      "legendClosing",
      closing
    );


    updatePipelineBars({
      newLeads,
      interested,
      followUp,
      notInterested,
      closing
    });

  }


  /* ========================================================
     PIPELINE BARS
  ======================================================== */

  function updatePipelineBars(
    data
  ) {

    const values = [

      data.newLeads,

      data.interested,

      data.followUp,

      data.notInterested,

      data.closing

    ];


    const max =
      Math.max(
        ...values,
        1
      );


    const bars = [

      [
        "pipeNewBar",
        data.newLeads
      ],

      [
        "pipeInterestedBar",
        data.interested
      ],

      [
        "pipeFollowUpBar",
        data.followUp
      ],

      [
        "pipeNotInterestedBar",
        data.notInterested
      ],

      [
        "pipeClosingBar",
        data.closing
      ]

    ];


    bars.forEach(
      function ([id, value]) {

        const element =
          document.getElementById(id);


        if (!element) {
          return;
        }


        const percentage =
          Math.max(
            4,
            Math.round(
              (value / max) * 100
            )
          );


        element.style.width =
          percentage + "%";

      }
    );

  }


  /* ========================================================
     SALES PERFORMANCE
  ======================================================== */

  async function loadSalesPerformance(
    scope
  ) {

    const container =
      document.getElementById(
        "dashSalesPerformance"
      );


    if (!container) {
      return;
    }


    /* =============================================
       SALES USER
    ============================================== */

    if (!scope.isAdmin) {

      const total =
        await exactCount(
          scope
        );


      const name =
        currentProfile.full_name ||
        currentProfile.username ||
        "My Leads";


      const firstLetter =
        String(name)
          .charAt(0)
          .toUpperCase();


      container.innerHTML = `

        <div class="new-sales-self">

          <div class="new-sales-avatar">
            ${escapeHTML(firstLetter)}
          </div>

          <div class="new-sales-self-info">

            <strong>
              ${escapeHTML(name)}
            </strong>

            <span>
              My Leads
            </span>

          </div>

          <div class="new-sales-self-count">

            ${formatNumber(total)}

            <small>
              leads
            </small>

          </div>

        </div>

      `;


      return;

    }


    /* =============================================
       ADMIN - GET LEADS
    ============================================== */

    const {
      data,
      error
    } =
      await supabaseClient
        .from("leads")
        .select(
          "id, sales_id"
        );


    if (error) {

      console.error(
        "Sales performance error:",
        error
      );


      container.innerHTML = `

        <div class="new-dashboard-empty">
          Tidak dapat memuat data Sales.
        </div>

      `;


      return;

    }


    const leads =
      data || [];


    if (!leads.length) {

      container.innerHTML = `

        <div class="new-dashboard-empty">
          Belum ada data Sales.
        </div>

      `;


      return;

    }


    /* =============================================
       GROUP LEADS BY SALES
    ============================================== */

    const salesMap = {};


    leads.forEach(
      function (lead) {

        const salesId =
          lead.sales_id ||
          "unassigned";


        if (
          !salesMap[salesId]
        ) {

          salesMap[salesId] =
            0;

        }


        salesMap[salesId]++;

      }
    );


    const salesIds =
      Object.keys(
        salesMap
      );


    /* =============================================
       GET PROFILES
    ============================================== */

    let profiles = [];


    try {

      const {
        data: profileData
      } =
        await supabaseClient
          .from("profiles")
          .select("*");


      profiles =
        profileData || [];

    } catch (error) {

      console.error(
        "Profile error:",
        error
      );

    }


    const profileMap = {};


    profiles.forEach(
      function (profile) {

        profileMap[profile.id] =

          profile.full_name ||

          profile.username ||

          profile.name ||

          "Sales";

      }
    );


    /* =============================================
       CREATE ROWS
    ============================================== */

    const rows =
      salesIds
        .map(
          function (salesId) {

            return {

              id:
                salesId,

              name:
                salesId === "unassigned"

                  ? "Belum Assign"

                  : (
                      profileMap[salesId] ||
                      "Sales"
                    ),

              count:
                salesMap[salesId]

            };

          }
        )
        .sort(
          function (a, b) {

            return b.count -
              a.count;

          }
        )
        .slice(
          0,
          8
        );


    const max =
      Math.max(
        ...rows.map(
          function (row) {
            return row.count;
          }
        ),
        1
      );


    /* =============================================
       RENDER
    ============================================== */

    container.innerHTML =
      rows
        .map(
          function (sales, index) {

            const width =
              Math.max(
                5,
                Math.round(
                  (sales.count /
                    max) *
                  100
                )
              );


            return `

              <div class="new-sales-row">

                <div class="new-sales-rank">
                  ${index + 1}
                </div>

                <div class="new-sales-performance">

                  <div class="new-sales-name-line">

                    <strong>
                      ${escapeHTML(
                        sales.name
                      )}
                    </strong>

                    <span>
                      ${formatNumber(
                        sales.count
                      )}
                    </span>

                  </div>

                  <div class="new-sales-progress">

                    <div
                      style="width:${width}%"
                    ></div>

                  </div>

                </div>

              </div>

            `;

          }
        )
        .join("");


  }


  /* ========================================================
     RECENT ACTIVITY
  ======================================================== */

  async function loadRecentActivity(
    scope
  ) {

    const container =
      document.getElementById(
        "dashRecentActivity"
      );


    if (!container) {
      return;
    }


    let query =
      supabaseClient
        .from("leads")
        .select(`
          id,
          customer_name,
          status,
          created_at
        `)
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
        scope
      );


    const {
      data,
      error
    } =
      await query;


    if (error) {

      console.error(
        "Recent activity error:",
        error
      );


      container.innerHTML = `

        <div class="new-dashboard-empty">
          Tidak dapat memuat aktivitas.
        </div>

      `;


      return;

    }


    const leads =
      data || [];


    if (!leads.length) {

      container.innerHTML = `

        <div class="new-dashboard-empty">
          Belum ada aktivitas.
        </div>

      `;


      return;

    }


    container.innerHTML =
      leads
        .map(
          function (lead) {

            const status =
              normalizeStatus(
                lead.status
              );


            let icon =
              "user-plus";

            let iconClass =
              "blue";

            let activityText =
              "Lead baru ditambahkan";


            if (
              status === "Interested"
            ) {

              icon =
                "heart";

              iconClass =
                "green";

              activityText =
                "Lead tertarik";

            }


            else if (
              status === "Follow Up"
            ) {

              icon =
                "phone-call";

              iconClass =
                "orange";

              activityText =
                "Lead masuk Follow Up";

            }


            else if (
              status === "Closing"
            ) {

              icon =
                "badge-check";

              iconClass =
                "dark-green";

              activityText =
                "Lead berhasil Closing";

            }


            else if (
              status === "Not Interested"
            ) {

              icon =
                "x-circle";

              iconClass =
                "red";

              activityText =
                "Lead tidak tertarik";

            }


            const date =
              lead.created_at

                ? new Date(
                    lead.created_at
                  ).toLocaleDateString(
                    "id-ID",
                    {
                      day: "2-digit",
                      month: "short",
                      year: "numeric"
                    }
                  )

                : "-";


            return `

              <div class="new-activity-item">

                <div
                  class="
                    new-activity-icon
                    ${iconClass}
                  "
                >

                  <i
                    data-lucide="${icon}"
                  ></i>

                </div>


                <div class="new-activity-info">

                  <strong>
                    ${escapeHTML(
                      lead.customer_name ||
                      "Customer"
                    )}
                  </strong>

                  <span>
                    ${activityText}
                  </span>

                </div>


                <time>
                  ${date}
                </time>

              </div>

            `;

          }
        )
        .join("");


    if (window.lucide) {
      lucide.createIcons();
    }

  }


  /* ========================================================
     MAIN
  ======================================================== */

  async function loadNewDashboard() {

    const dashboard =
      document.getElementById(
        "dashboardPage"
      );


    if (!dashboard) {
      return;
    }


    const scope =
      getScope();


    if (!scope) {
      return;
    }


    try {

      await Promise.all([

        loadStatistics(
          scope
        ),

        loadSalesPerformance(
          scope
        ),

        loadRecentActivity(
          scope
        )

      ]);


      if (window.lucide) {
        lucide.createIcons();
      }


    } catch (error) {

      console.error(
        "New Dashboard Error:",
        error
      );

    }

  }


  /* ========================================================
     GLOBAL BUTTON
  ======================================================== */

  window.loadNewDashboard =
    loadNewDashboard;


  /* ========================================================
     START WATCHER
  ======================================================== */

  function startDashboardWatcher() {

    let attempts = 0;


    const watcher =
      setInterval(
        function () {

          attempts++;


          if (
            typeof currentProfile !== "undefined" &&
            currentProfile
          ) {

            clearInterval(
              watcher
            );


            loadNewDashboard();


            if (
              !dashboardRefreshTimer
            ) {

              dashboardRefreshTimer =
                setInterval(
                  function () {

                    const dashboard =
                      document.getElementById(
                        "dashboardPage"
                      );


                    if (
                      dashboard &&
                      (
                        dashboard.style.display !==
                        "none"
                      )
                    ) {

                      loadNewDashboard();

                    }

                  },
                  30000
                );

            }

          }


          if (
            attempts >= 60
          ) {

            clearInterval(
              watcher
            );

          }

        },
        1000
      );

  }


  /* ========================================================
     INIT
  ======================================================== */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      startDashboardWatcher
    );

  } else {

    startDashboardWatcher();

  }


})();
