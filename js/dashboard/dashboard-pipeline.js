// ============================================================
// FSI CRM — DASHBOARD PIPELINE
// ============================================================
//
// File:
// js/dashboard/dashboard-pipeline.js
//
// FUNGSI:
// - Menampilkan Sales Pipeline di Dashboard
// - Membaca status dari leads.status
// - Mendukung status CRM BARU
// - Tetap kompatibel dengan status LAMA
//
// PIPELINE BARU:
//
// 1. New
// 2. First Contact
// 3. First Meeting / Appointment / Site Survey
// 4. Quotation
// 5. Second Appointment
// 6. Deal
// 7. No Deal
//
// ============================================================



// ============================================================
// FIND PIPELINE CONTAINER
// ============================================================
//
// index.html terbaru:
//
//     pipeline-summary
//
// Versi lama:
//
//     dashboard-pipeline
//
// Kita support semuanya agar tidak merusak versi lama.
// ============================================================

function dashboardFindPipelineContainer() {

    const ids = [
        "pipeline-summary",
        "dashboard-pipeline",
        "pipeline-summary-container",
        "sales-pipeline"
    ];


    for (const id of ids) {

        const element =
            document.getElementById(id);


        if (element) {
            return element;
        }
    }


    return null;
}



// ============================================================
// DASHBOARD PIPELINE STAGES
// ============================================================
//
// Pipeline CRM terbaru.
//
// Setiap stage memiliki:
// - label
// - className
// - aliases
//
// aliases digunakan untuk membaca status lama dari database.
//
// Contoh:
//
// Interested
//      ↓
// First Contact
//
// Follow Up
// Appointment
// Site Survey
//      ↓
// First Meeting / Appointment / Site Survey
//
// SPK
// Closing
//      ↓
// Deal
//
// Not Interested
//      ↓
// No Deal
// ============================================================

const DASHBOARD_PIPELINE_STAGES = [

    {
        label:
            "New",

        className:
            "status-new",

        aliases: [
            "New"
        ]
    },


    {
        label:
            "First Contact",

        className:
            "status-first-contact",

        aliases: [
            "First Contact",
            "Interested"
        ]
    },


    {
        label:
            "First Meeting / Appointment / Site Survey",

        className:
            "status-first-meeting",

        aliases: [
            "First Meeting / Appointment / Site Survey",
            "First Meeting",
            "Appointment",
            "Site Survey",
            "Follow Up"
        ]
    },


    {
        label:
            "Quotation",

        className:
            "status-quotation",

        aliases: [
            "Quotation"
        ]
    },


    {
        label:
            "Second Appointment",

        className:
            "status-second-appointment",

        aliases: [
            "Second Appointment"
        ]
    },


    {
        label:
            "Deal",

        className:
            "status-deal",

        aliases: [
            "Deal",
            "SPK",
            "Closing"
        ]
    },


    {
        label:
            "No Deal",

        className:
            "status-no-deal",

        aliases: [
            "No Deal",
            "Not Interested"
        ]
    }

];



// ============================================================
// NORMALIZE STATUS
// ============================================================
//
// Membuat perbandingan status lebih aman.
//
// Contoh:
//
// "Interested"
// " interested "
// "INTERESTED"
//
// semuanya dianggap sama.
// ============================================================

function dashboardNormalizePipelineStatus(
    status
) {

    if (
        status === null ||
        status === undefined
    ) {
        return "";
    }


    return String(status)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}



// ============================================================
// GET PIPELINE STAGES
// ============================================================

function dashboardGetPipelineStages() {

    return DASHBOARD_PIPELINE_STAGES.map(
        stage => ({
            ...stage,

            aliases:
                Array.isArray(stage.aliases)
                    ? [...stage.aliases]
                    : []
        })
    );
}



// ============================================================
// CHECK STATUS MATCH
// ============================================================
//
// Contoh:
//
// lead.status = "Interested"
//
// stage = First Contact
//
// hasil:
//
// true
// ============================================================

function dashboardPipelineStatusMatches(
    leadStatus,
    stage
) {

    if (
        !stage
    ) {
        return false;
    }


    const normalizedLeadStatus =
        dashboardNormalizePipelineStatus(
            leadStatus
        );


    if (
        !normalizedLeadStatus
    ) {
        return false;
    }


    const aliases =
        Array.isArray(stage.aliases)
            ? stage.aliases
            : [];


    return aliases.some(
        alias =>
            dashboardNormalizePipelineStatus(
                alias
            ) === normalizedLeadStatus
    );
}



// ============================================================
// GET PIPELINE STAGE COUNT
// ============================================================
//
// PENTING:
//
// Fungsi ini sengaja TIDAK lagi langsung menggunakan:
//
//     dashboardCountStatus()
//
// Karena dashboardCountStatus() hanya mencocokkan nama status
// secara langsung.
//
// Sekarang kita menggunakan aliases.
//
// Contoh:
//
// database:
//
// Interested
//
// dashboard:
//
// First Contact
//
// tetap dihitung.
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


    return list.filter(
        lead => {

            if (!lead) {
                return false;
            }


            return dashboardPipelineStatusMatches(
                lead.status,
                stage
            );
        }
    ).length;
}



// ============================================================
// GET TOTAL PIPELINE
// ============================================================

function dashboardGetPipelineTotal(
    data
) {

    return Array.isArray(data)
        ? data.length
        : 0;
}



// ============================================================
// GET PIPELINE PERCENTAGE
// ============================================================

function dashboardGetPipelinePercentage(
    count,
    total
) {

    const safeCount =
        Number(count) || 0;


    const safeTotal =
        Number(total) || 0;


    if (
        safeTotal <= 0
    ) {
        return 0;
    }


    return (
        safeCount /
        safeTotal
    ) * 100;
}



// ============================================================
// FORMAT PERCENTAGE
// ============================================================

function dashboardFormatPipelinePercentage(
    percentage
) {

    const value =
        Number(percentage) || 0;


    if (
        value <= 0
    ) {
        return "0%";
    }


    if (
        value >= 100
    ) {
        return "100%";
    }


    const rounded =
        Math.round(
            value * 10
        ) / 10;


    return `${rounded}%`;
}



// ============================================================
// ESCAPE HTML
// ============================================================

function dashboardPipelineEscapeHTML(
    value
) {

    if (
        typeof window.dashboardEscapeHTML ===
        "function"
    ) {

        return window.dashboardEscapeHTML(
            value
        );
    }


    if (
        typeof dashboardEscapeHTML ===
        "function"
    ) {

        return dashboardEscapeHTML(
            value
        );
    }


    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}



// ============================================================
// ICON HELPER
// ============================================================

function dashboardPipelineIcon(
    iconName
) {

    const icon =
        String(
            iconName || "circle"
        );


    return `
        <i
            data-lucide="${dashboardPipelineEscapeHTML(
                icon
            )}"
            aria-hidden="true"
        ></i>
    `;
}



// ============================================================
// RENDER EMPTY PIPELINE
// ============================================================

function dashboardRenderEmptyPipeline(
    container
) {

    if (!container) {
        return;
    }


    container.innerHTML = `

        <div class="pipeline-loading">

            <div class="pipeline-empty-icon">
                ${dashboardPipelineIcon(
                    "inbox"
                )}
            </div>

            <div class="pipeline-empty-title">
                No leads yet
            </div>

            <div class="pipeline-empty-text">
                Customer pipeline data will appear here.
            </div>

        </div>

    `;


    if (
        typeof window.refreshIcons ===
        "function"
    ) {

        window.refreshIcons();
    }
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


    const stages =
        dashboardGetPipelineStages();


    const total =
        dashboardGetPipelineTotal(
            list
        );


    // --------------------------------------------------------
    // EMPTY STATE
    // --------------------------------------------------------

    if (
        total === 0
    ) {

        dashboardRenderEmptyPipeline(
            container
        );

        return;
    }



    // --------------------------------------------------------
    // RENDER STAGES
    // --------------------------------------------------------

    const html =
        stages.map(
            (
                stage,
                index
            ) => {

                const count =
                    dashboardGetPipelineStageCount(
                        list,
                        stage
                    );


                const percentage =
                    dashboardGetPipelinePercentage(
                        count,
                        total
                    );


                const percentageText =
                    dashboardFormatPipelinePercentage(
                        percentage
                    );


                const safeLabel =
                    dashboardPipelineEscapeHTML(
                        stage.label
                    );


                const safeClass =
                    dashboardPipelineEscapeHTML(
                        stage.className
                    );


                const terminal =
                    stage.label === "Deal" ||
                    stage.label === "No Deal";


                let progressWidth =
                    percentage;


                /*
                 * Jika ada customer tetapi
                 * persentasenya sangat kecil,
                 * tetap tampil sedikit agar
                 * progress bar terlihat.
                 */

                if (
                    count > 0 &&
                    progressWidth < 4
                ) {

                    progressWidth = 4;
                }


                if (
                    progressWidth > 100
                ) {

                    progressWidth = 100;
                }


                const ariaLabel =
                    `${stage.label}: ${count} customer${count === 1 ? "" : "s"}, ${percentageText} of total leads`;


                return `

                    <div
                        class="
                            pipeline-item
                            pipeline-stage-${index + 1}
                            ${safeClass}
                            ${terminal
                                ? "pipeline-terminal"
                                : ""
                            }
                        "

                        data-pipeline-status="${safeLabel}"

                        data-pipeline-count="${count}"

                        data-pipeline-percentage="${percentage}"

                        title="${dashboardPipelineEscapeHTML(
                            ariaLabel
                        )}"
                    >


                        <!-- ICON -->

                        <div
                            class="pipeline-stage-icon"
                            aria-hidden="true"
                        >

                            ${dashboardPipelineIcon(
                                stage.label === "New"
                                    ? "user-plus"

                                    : stage.label === "First Contact"
                                        ? "phone-call"

                                    : stage.label === "First Meeting / Appointment / Site Survey"
                                        ? "calendar-check"

                                    : stage.label === "Quotation"
                                        ? "file-text"

                                    : stage.label === "Second Appointment"
                                        ? "calendar-clock"

                                    : stage.label === "Deal"
                                        ? "badge-check"

                                    : "circle-x"
                            )}

                        </div>



                        <!-- CONTENT -->

                        <div class="pipeline-content">


                            <div class="pipeline-stage-top">


                                <div class="pipeline-stage-text">

                                    <span
                                        class="pipeline-label"
                                    >
                                        ${safeLabel}
                                    </span>


                                    <small
                                        class="pipeline-description"
                                    >

                                        ${
                                            stage.label === "New"

                                                ? "New customers"

                                            : stage.label === "First Contact"

                                                ? "First contact made"

                                            : stage.label === "First Meeting / Appointment / Site Survey"

                                                ? "Meeting, appointment or survey"

                                            : stage.label === "Quotation"

                                                ? "Quotation sent"

                                            : stage.label === "Second Appointment"

                                                ? "Second appointment"

                                            : stage.label === "Deal"

                                                ? "Successful deals"

                                            : "Closed without deal"
                                        }

                                    </small>

                                </div>



                                <!-- NUMBER -->

                                <div
                                    class="pipeline-stage-number"
                                >

                                    <strong
                                        class="pipeline-count"
                                    >
                                        ${count}
                                    </strong>


                                    <span
                                        class="pipeline-percentage"
                                    >
                                        ${percentageText}
                                    </span>

                                </div>

                            </div>



                            <!-- PROGRESS BAR -->

                            <div
                                class="pipeline-bar"

                                role="progressbar"

                                aria-valuemin="0"

                                aria-valuemax="100"

                                aria-valuenow="${Math.round(
                                    percentage * 10
                                ) / 10}"

                                aria-label="${dashboardPipelineEscapeHTML(
                                    ariaLabel
                                )}"
                            >

                                <div
                                    class="pipeline-bar-fill"

                                    style="
                                        width:
                                        ${progressWidth}%;
                                    "
                                ></div>

                            </div>


                        </div>



                        <!-- TERMINAL INDICATOR -->

                        ${
                            terminal

                                ? `

                                    <div
                                        class="
                                            pipeline-terminal-indicator
                                        "

                                        aria-hidden="true"
                                    >

                                        ${dashboardPipelineIcon(
                                            stage.label === "Deal"
                                                ? "check"
                                                : "x"
                                        )}

                                    </div>

                                `

                                : ""
                        }

                    </div>

                `;
            }
        ).join("");


    container.innerHTML =
        html;


    // --------------------------------------------------------
    // REFRESH LUCIDE ICONS
    // --------------------------------------------------------

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

function getDashboardPipelineSummary(
    data
) {

    const list =
        Array.isArray(data)
            ? data
            : [];


    const stages =
        dashboardGetPipelineStages();


    const total =
        dashboardGetPipelineTotal(
            list
        );


    return stages.map(
        stage => {

            const count =
                dashboardGetPipelineStageCount(
                    list,
                    stage
                );


            const percentage =
                dashboardGetPipelinePercentage(
                    count,
                    total
                );


            return {

                label:
                    stage.label,

                className:
                    stage.className,

                aliases:
                    stage.aliases,

                count:
                    count,

                total:
                    total,

                percentage:
                    percentage,

                percentageText:
                    dashboardFormatPipelinePercentage(
                        percentage
                    )

            };
        }
    );
}



// ============================================================
// GET STAGE BY STATUS
// ============================================================

function dashboardGetPipelineStage(
    status
) {

    const normalizedStatus =
        dashboardNormalizePipelineStatus(
            status
        );


    return DASHBOARD_PIPELINE_STAGES.find(
        stage => {

            return stage.aliases.some(
                alias =>
                    dashboardNormalizePipelineStatus(
                        alias
                    ) === normalizedStatus
            );
        }
    ) || null;
}



// ============================================================
// GET PIPELINE CLASS
// ============================================================

function dashboardGetPipelineClass(
    status
) {

    const stage =
        dashboardGetPipelineStage(
            status
        );


    return stage
        ? stage.className
        : "";
}



// ============================================================
// PIPELINE CLICK SUPPORT
// ============================================================

function dashboardBindPipelineClicks() {

    const container =
        dashboardFindPipelineContainer();


    if (!container) {
        return;
    }


    if (
        container.dataset.pipelineBound ===
        "true"
    ) {
        return;
    }


    container.dataset.pipelineBound =
        "true";


    container.addEventListener(
        "click",
        event => {

            const item =
                event.target.closest(
                    ".pipeline-item"
                );


            if (!item) {
                return;
            }


            const status =
                item.dataset.pipelineStatus;


            if (!status) {
                return;
            }


            if (
                typeof window.filterDashboardByStatus ===
                "function"
            ) {

                window.filterDashboardByStatus(
                    status
                );

                return;
            }


            if (
                typeof window.dashboardFilterByStatus ===
                "function"
            ) {

                window.dashboardFilterByStatus(
                    status
                );

                return;
            }


            /*
             * Jika tidak ada fungsi filter,
             * buka Leads.
             */

            if (
                typeof window.showLeads ===
                "function"
            ) {

                window.showLeads();
            }

        }
    );
}



// ============================================================
// INITIALIZE PIPELINE
// ============================================================

function dashboardInitializePipeline() {

    const container =
        dashboardFindPipelineContainer();


    if (!container) {
        return;
    }


    dashboardBindPipelineClicks();


    if (
        typeof window.refreshIcons ===
        "function"
    ) {

        window.refreshIcons();
    }
}



// ============================================================
// GLOBAL EXPORTS
// ============================================================

window.dashboardFindPipelineContainer =
    dashboardFindPipelineContainer;


window.dashboardGetPipelineStages =
    dashboardGetPipelineStages;


window.dashboardNormalizePipelineStatus =
    dashboardNormalizePipelineStatus;


window.dashboardPipelineStatusMatches =
    dashboardPipelineStatusMatches;


window.dashboardGetPipelineStageCount =
    dashboardGetPipelineStageCount;


window.dashboardGetPipelineTotal =
    dashboardGetPipelineTotal;


window.dashboardGetPipelinePercentage =
    dashboardGetPipelinePercentage;


window.dashboardFormatPipelinePercentage =
    dashboardFormatPipelinePercentage;


window.dashboardGetPipelineStage =
    dashboardGetPipelineStage;


window.dashboardGetPipelineClass =
    dashboardGetPipelineClass;


window.renderDashboardPipeline =
    renderDashboardPipeline;


window.getDashboardPipelineSummary =
    getDashboardPipelineSummary;


window.dashboardBindPipelineClicks =
    dashboardBindPipelineClicks;


window.dashboardInitializePipeline =
    dashboardInitializePipeline;



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

        dashboardNormalizePipelineStatus,

        dashboardPipelineStatusMatches,

        dashboardGetPipelineStageCount,

        dashboardGetPipelineTotal,

        dashboardGetPipelinePercentage,

        dashboardFormatPipelinePercentage,

        dashboardGetPipelineStage,

        dashboardGetPipelineClass,

        renderDashboardPipeline,

        getDashboardPipelineSummary,

        dashboardBindPipelineClicks,

        dashboardInitializePipeline

    }
);



// ============================================================
// DOM READY
// ============================================================

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        dashboardInitializePipeline
    );

} else {

    dashboardInitializePipeline();
}



// ============================================================
// INITIALIZED
// ============================================================

console.log(
    "FSI CRM: Dashboard pipeline module initialized."
);
