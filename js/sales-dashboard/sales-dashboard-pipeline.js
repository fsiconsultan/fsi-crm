/* =========================================================
   FSI CRM - SALES DASHBOARD PIPELINE
   ---------------------------------------------------------
   Mengatur data dan tampilan pipeline khusus Sales Dashboard.

   Pipeline:
   1. New
   2. First Contact
   3. First Meeting / Appointment / Site Survey
   4. Quotation
   5. Second Appointment
   6. Deal
   7. No Deal

   File ini tidak mengubah data Supabase.
   ========================================================= */


/* =========================================================
   PIPELINE CONFIGURATION
   ========================================================= */

window.SALES_DASHBOARD_PIPELINE = [

    {
        key: "new",
        status: "New",
        label: "New",
        className: "status-new"
    },

    {
        key: "first_contact",
        status: "First Contact",
        label: "First Contact",
        className: "status-first-contact"
    },

    {
        key: "first_meeting",
        status: "First Meeting / Appointment / Site Survey",
        label: "First Meeting / Appointment / Site Survey",
        className: "status-first-meeting"
    },

    {
        key: "quotation",
        status: "Quotation",
        label: "Quotation",
        className: "status-quotation"
    },

    {
        key: "second_appointment",
        status: "Second Appointment",
        label: "Second Appointment",
        className: "status-second-appointment"
    },

    {
        key: "deal",
        status: "Deal",
        label: "Deal",
        className: "status-deal"
    },

    {
        key: "no_deal",
        status: "No Deal",
        label: "No Deal",
        className: "status-no-deal"
    }

];


/* =========================================================
   GET PIPELINE CONFIGURATION
   ========================================================= */

window.getSalesDashboardPipeline =
    function () {

        return window.SALES_DASHBOARD_PIPELINE.map(
            function (stage) {
                return {
                    ...stage
                };
            }
        );
    };


/* =========================================================
   GET STAGE BY STATUS
   ========================================================= */

window.getSalesDashboardPipelineStage =
    function (status) {

        const normalizedStatus =
            typeof normalizeSalesDashboardStatus ===
            "function"
                ? normalizeSalesDashboardStatus(status)
                : String(status || "").trim();

        return window.SALES_DASHBOARD_PIPELINE.find(
            function (stage) {
                return stage.status === normalizedStatus;
            }
        ) || null;
    };


/* =========================================================
   GET STAGE COUNT
   ========================================================= */

window.getSalesDashboardPipelineCount =
    function (
        leads,
        status
    ) {

        if (!Array.isArray(leads)) {
            return 0;
        }

        const normalizedStatus =
            typeof normalizeSalesDashboardStatus ===
            "function"
                ? normalizeSalesDashboardStatus(status)
                : String(status || "").trim();

        return leads.filter(
            function (lead) {

                const leadStatus =
                    typeof normalizeSalesDashboardStatus ===
                    "function"
                        ? normalizeSalesDashboardStatus(
                            lead?.status
                        )
                        : String(
                            lead?.status || ""
                        ).trim();

                return leadStatus === normalizedStatus;
            }
        ).length;
    };


/* =========================================================
   BUILD PIPELINE DATA
   ========================================================= */

window.buildSalesDashboardPipeline =
    function (leads) {

        const safeLeads =
            Array.isArray(leads)
                ? leads
                : [];

        return window.SALES_DASHBOARD_PIPELINE.map(
            function (stage) {

                const count =
                    window.getSalesDashboardPipelineCount(
                        safeLeads,
                        stage.status
                    );

                return {
                    key: stage.key,
                    status: stage.status,
                    label: stage.label,
                    className: stage.className,
                    count: count
                };
            }
        );
    };


/* =========================================================
   BUILD PIPELINE FROM CURRENT STATE
   ========================================================= */

window.getCurrentSalesDashboardPipeline =
    function () {

        if (
            typeof window.getSalesDashboardState !==
            "function"
        ) {
            return window.buildSalesDashboardPipeline(
                []
            );
        }

        const state =
            window.getSalesDashboardState();

        return window.buildSalesDashboardPipeline(
            state?.leads || []
        );
    };


/* =========================================================
   GET TOTAL PIPELINE LEADS
   ========================================================= */

window.getSalesDashboardPipelineLeadCount =
    function () {

        const pipeline =
            window.getCurrentSalesDashboardPipeline();

        return pipeline.reduce(
            function (total, stage) {

                return total +
                    Number(stage.count || 0);

            },
            0
        );
    };


/* =========================================================
   GET ACTIVE PIPELINE
   ---------------------------------------------------------
   Active pipeline tidak termasuk Deal dan No Deal.
   ========================================================= */

window.getSalesDashboardActivePipeline =
    function () {

        const pipeline =
            window.getCurrentSalesDashboardPipeline();

        return pipeline.filter(
            function (stage) {

                return (
                    stage.status !== "Deal" &&
                    stage.status !== "No Deal"
                );

            }
        );
    };


/* =========================================================
   GET PIPELINE STAGE PERCENTAGE
   ========================================================= */

window.getSalesDashboardPipelinePercentage =
    function (
        count,
        total
    ) {

        const safeCount =
            Number(count || 0);

        const safeTotal =
            Number(total || 0);

        if (!safeTotal) {
            return 0;
        }

        return (
            safeCount /
            safeTotal
        ) * 100;
    };


/* =========================================================
   BUILD PIPELINE HTML
   ---------------------------------------------------------
   Fungsi ini menghasilkan HTML untuk pipeline.

   CSS akan diatur oleh:
   css/sales-dashboard.css
   ========================================================= */

window.renderSalesDashboardPipeline =
    function (
        container,
        leads
    ) {

        if (!container) {
            return;
        }

        const pipeline =
            window.buildSalesDashboardPipeline(
                leads
            );

        const total =
            Array.isArray(leads)
                ? leads.length
                : 0;


        /*
         * Jika tidak ada leads.
         */

        if (!pipeline.length) {

            container.innerHTML = `
                <div class="sales-dashboard-empty">
                    <div class="sales-dashboard-empty-icon">
                        <i data-lucide="bar-chart-3"></i>
                    </div>

                    <div class="sales-dashboard-empty-title">
                        No Pipeline Data
                    </div>

                    <div class="sales-dashboard-empty-text">
                        Belum ada data pipeline untuk Sales ini.
                    </div>
                </div>
            `;

            refreshSalesDashboardIcons();

            return;
        }


        /*
         * Buat HTML setiap stage.
         */

        container.innerHTML = pipeline.map(
            function (stage) {

                const percentage =
                    window.getSalesDashboardPipelinePercentage(
                        stage.count,
                        total
                    );

                return `
                    <div
                        class="sales-pipeline-stage ${stage.className}"
                        data-status="${escapeSalesDashboardHtml(
                            stage.status
                        )}"
                    >

                        <div class="sales-pipeline-stage-header">

                            <div class="sales-pipeline-stage-title">
                                ${escapeSalesDashboardHtml(
                                    stage.label
                                )}
                            </div>

                            <div class="sales-pipeline-stage-count">
                                ${stage.count}
                            </div>

                        </div>

                        <div class="sales-pipeline-stage-bar">

                            <div
                                class="sales-pipeline-stage-progress"
                                style="width: ${percentage}%"
                            ></div>

                        </div>

                        <div class="sales-pipeline-stage-footer">
                            ${stage.count} lead${stage.count === 1 ? "" : "s"}
                        </div>

                    </div>
                `;

            }
        ).join("");


        /*
         * Aktifkan icon Lucide jika tersedia.
         */

        refreshSalesDashboardIcons();
    };


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeSalesDashboardHtml(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value === null ||
        value === undefined
            ? ""
            : String(value);

    return div.innerHTML;
}


/* =========================================================
   REFRESH LUCIDE ICONS
   ========================================================= */

function refreshSalesDashboardIcons() {

    if (
        typeof window.lucide !== "undefined" &&
        typeof window.lucide.createIcons ===
            "function"
    ) {
        window.lucide.createIcons();
    }
}


/* =========================================================
   RENDER PIPELINE FROM CURRENT STATE
   ========================================================= */

window.renderCurrentSalesDashboardPipeline =
    function (
        container
    ) {

        if (
            typeof window.getSalesDashboardState !==
            "function"
        ) {
            return;
        }

        const state =
            window.getSalesDashboardState();

        window.renderSalesDashboardPipeline(
            container,
            state?.leads || []
        );
    };


/* =========================================================
   GET NEXT PIPELINE STAGE
   ---------------------------------------------------------
   Berguna nanti kalau kita ingin membuat informasi
   progress customer.
   ========================================================= */

window.getSalesDashboardNextStage =
    function (status) {

        const pipeline =
            window.SALES_DASHBOARD_PIPELINE;

        const normalizedStatus =
            typeof normalizeSalesDashboardStatus ===
            "function"
                ? normalizeSalesDashboardStatus(status)
                : String(status || "").trim();

        const index =
            pipeline.findIndex(
                function (stage) {
                    return stage.status ===
                        normalizedStatus;
                }
            );

        if (
            index === -1 ||
            index >= pipeline.length - 1
        ) {
            return null;
        }

        return pipeline[index + 1];
    };


/* =========================================================
   GET PREVIOUS PIPELINE STAGE
   ========================================================= */

window.getSalesDashboardPreviousStage =
    function (status) {

        const pipeline =
            window.SALES_DASHBOARD_PIPELINE;

        const normalizedStatus =
            typeof normalizeSalesDashboardStatus ===
            "function"
                ? normalizeSalesDashboardStatus(status)
                : String(status || "").trim();

        const index =
            pipeline.findIndex(
                function (stage) {
                    return stage.status ===
                        normalizedStatus;
                }
            );

        if (index <= 0) {
            return null;
        }

        return pipeline[index - 1];
    };
