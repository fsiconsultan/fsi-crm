// ============================================================
// FIND PIPELINE CONTAINER
// ============================================================
//
// index.html terbaru menggunakan:
//        pipeline-summary
//
// Versi lama menggunakan:
//        dashboard-pipeline
//
// Kita support keduanya agar tidak merusak versi lama.
// ============================================================
function dashboardFindPipelineContainer() {
    const ids = [
        "pipeline-summary",
        "dashboard-pipeline",
        "pipeline-summary-container",
        "sales-pipeline"
    ];

    for (
        const id of ids
    ) {
        const element =
            document.getElementById(
                id
            );

        if (element) {
            return element;
        }
    }

    return null;
}


// ============================================================
// DASHBOARD PIPELINE STATUS
// ============================================================
//
// Pipeline CRM terbaru:
//
// 1. New
// 2. First Contact
// 3. First Meeting / Appointment / Site Survey
// 4. Quotation
// 5. Second Appointment
// 6. Deal
// 7. No Deal
//
// Semua status dihitung langsung dari kolom:
//
//     leads.status
//
// Tidak lagi menggunakan field tanggal lama sebagai
// status pipeline utama.
// ============================================================

const DASHBOARD_PIPELINE_STAGES = [
    {
        label:
            "New",

        className:
            "status-new"
    },

    {
        label:
            "First Contact",

        className:
            "status-first-contact"
    },

    {
        label:
            "First Meeting / Appointment / Site Survey",

        className:
            "status-first-meeting"
    },

    {
        label:
            "Quotation",

        className:
            "status-quotation"
    },

    {
        label:
            "Second Appointment",

        className:
            "status-second-appointment"
    },

    {
        label:
            "Deal",

        className:
            "status-deal"
    },

    {
        label:
            "No Deal",

        className:
            "status-no-deal"
    }
];


// ============================================================
// GET PIPELINE STAGES
// ============================================================
function dashboardGetPipelineStages() {
    return DASHBOARD_PIPELINE_STAGES.map(
        stage => ({
            ...stage
        })
    );
}


// ============================================================
// GET PIPELINE COUNT
// ============================================================
function dashboardGetPipelineStageCount(
    list,
    stage
) {
    if (
        !Array.isArray(list)
    ) {
        return 0;
    }

    if (
        !stage ||
        !stage.label
    ) {
        return 0;
    }

    return dashboardCountStatus(
        list,
        stage.label
    );
}


// ============================================================
// RENDER PIPELINE
// ============================================================
function renderDashboardPipeline(
    data
) {
    const container =
        dashboardFindPipelineContainer();

    if (!container) {
        console.warn(
            "FSI CRM: Pipeline container tidak ditemukan."
        );

        return;
    }

    const list =
        Array.isArray(data)
            ? data
            : [];


    /*
     * ========================================================
     * PIPELINE BARU
     * ========================================================
     *
     * New
     * First Contact
     * First Meeting / Appointment / Site Survey
     * Quotation
     * Second Appointment
     * Deal
     * No Deal
     */
    const stages =
        dashboardGetPipelineStages();


    /*
     * ========================================================
     * RENDER
     * ========================================================
     */
    const html =
        stages.map(
            stage => {

                const count =
                    dashboardGetPipelineStageCount(
                        list,
                        stage
                    );

                return `
                    <div
                        class="pipeline-item"
                        data-pipeline-status="${dashboardEscapeHTML(
                            stage.label
                        )}"
                    >
                        <div class="pipeline-item-main">
                            <span
                                class="pipeline-status ${dashboardEscapeHTML(
                                    stage.className
                                )}"
                            >
                                ${dashboardEscapeHTML(
                                    stage.label
                                )}
                            </span>
                        </div>

                        <strong class="pipeline-count">
                            ${count}
                        </strong>
                    </div>
                `;
            }
        ).join("");


    /*
     * Masukkan ke container.
     */
    container.innerHTML =
        html;


    /*
     * Refresh Lucide icons jika tersedia.
     */
    if (
        typeof window.refreshIcons ===
        "function"
    ) {
        window.refreshIcons();
    }
}


// ============================================================
// GET PIPELINE SUMMARY
// ============================================================
//
// Fungsi tambahan untuk modul lain yang ingin mengambil
// jumlah setiap stage tanpa melakukan render.
// ============================================================
function getDashboardPipelineSummary(
    data
) {
    const list =
        Array.isArray(data)
            ? data
            : [];

    const stages =
        dashboardGetPipelineStages();

    return stages.map(
        stage => ({
            label:
                stage.label,

            className:
                stage.className,

            count:
                dashboardGetPipelineStageCount(
                    list,
                    stage
                )
        })
    );
}


// ============================================================
// GLOBAL EXPORTS
// ============================================================
window.dashboardFindPipelineContainer =
    dashboardFindPipelineContainer;

window.dashboardGetPipelineStages =
    dashboardGetPipelineStages;

window.dashboardGetPipelineStageCount =
    dashboardGetPipelineStageCount;

window.renderDashboardPipeline =
    renderDashboardPipeline;

window.getDashboardPipelineSummary =
    getDashboardPipelineSummary;


// ============================================================
// FSI DASHBOARD NAMESPACE
// ============================================================
window.FSIDashboard =
    window.FSIDashboard ||
    {};

Object.assign(
    window.FSIDashboard,
    {
        dashboardGetPipelineStages,
        dashboardGetPipelineStageCount,
        renderDashboardPipeline,
        getDashboardPipelineSummary
    }
);


// ============================================================
// INITIAL STATE
// ============================================================
console.log(
    "FSI CRM: Dashboard pipeline module initialized."
);
