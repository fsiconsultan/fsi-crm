// ============================================================
// FSI CRM — DASHBOARD PIPELINE
// ============================================================
// File:
// js/dashboard/dashboard-pipeline.js
//
// PIPELINE:
//
// 1. New Customer
// 2. First Contact
// 3. Appointment
// 4. Site Survey
// 5. Quotation
// 6. Deal / Closing
// 7. No Deal
//
// ============================================================


// ============================================================
// FIND PIPELINE CONTAINER
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
// PIPELINE STAGES
// ============================================================

const DASHBOARD_PIPELINE_STAGES = [

    {
        key: "newCustomer",

        label: "New Customer",

        className: "status-new",

        icon: "user-plus",

        description: "New customers",

        aliases: [
            "New Customer",
            "New"
        ]
    },


    {
        key: "firstContact",

        label: "First Contact",

        className: "status-first-contact",

        icon: "phone-call",

        description: "First contact made",

        aliases: [
            "First Contact",
            "Interested"
        ]
    },


    {
        key: "appointment",

        label: "Appointment",

        className: "status-appointment",

        icon: "calendar-check",

        description: "Customer appointment",

        aliases: [
            "Appointment",
            "First Meeting",
            "First Meeting / Appointment / Site Survey",
            "Follow Up"
        ]
    },


    {
        key: "siteSurvey",

        label: "Site Survey",

        className: "status-site-survey",

        icon: "map-pin",

        description: "Site survey activity",

        aliases: [
            "Site Survey"
        ]
    },


    {
        key: "quotation",

        label: "Quotation",

        className: "status-quotation",

        icon: "file-text",

        description: "Quotation sent",

        aliases: [
            "Quotation"
        ]
    },


    {
        key: "dealClosing",

        label: "Deal / Closing",

        className: "status-deal",

        icon: "handshake",

        description: "Successful deals",

        aliases: [
            "Deal / Closing",
            "Deal",
            "Closing",
            "SPK"
        ]
    },


    {
        key: "noDeal",

        label: "No Deal",

        className: "status-no-deal",

        icon: "user-round-x",

        description: "Customer did not continue",

        aliases: [
            "No Deal",
            "Not Interested"
        ]
    }

];


// ============================================================
// NORMALIZE STATUS
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
        function (stage) {

            return {

                ...stage,

                aliases:
                    Array.isArray(stage.aliases)
                        ? [...stage.aliases]
                        : []

            };
        }
    );
}


// ============================================================
// HAS VALUE
// ============================================================

function dashboardPipelineHasValue(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {
        return false;
    }


    if (
        typeof value === "string"
    ) {
        return value.trim() !== "";
    }


    return true;
}


// ============================================================
// STATUS MATCH
// ============================================================

function dashboardPipelineStatusMatches(
    leadStatus,
    stage
) {

    if (!stage) {
        return false;
    }


    const normalizedLeadStatus =
        dashboardNormalizePipelineStatus(
            leadStatus
        );


    if (!normalizedLeadStatus) {
        return false;
    }


    const aliases =
        Array.isArray(stage.aliases)
            ? stage.aliases
            : [];


    return aliases.some(
        function (alias) {

            return (
                dashboardNormalizePipelineStatus(
                    alias
                ) ===
                normalizedLeadStatus
            );

        }
    );
}


// ============================================================
// GET STAGE FOR LEAD
// ============================================================
//
// Status adalah sumber utama untuk current pipeline stage.
//
// Untuk Appointment / Site Survey / Quotation / Closing,
// activity field digunakan sebagai fallback jika status
// belum menggunakan status baru.
// ============================================================

function dashboardGetPipelineStageForLead(
    lead
) {

    if (!lead) {
        return null;
    }


    const status =
        dashboardNormalizePipelineStatus(
            lead.status
        );


    // --------------------------------------------------------
    // 1. NO DEAL
    // --------------------------------------------------------

    if (
        dashboardPipelineStatusMatches(
            lead.status,
            DASHBOARD_PIPELINE_STAGES[6]
        )
    ) {
        return DASHBOARD_PIPELINE_STAGES[6];
    }


    // --------------------------------------------------------
    // 2. DEAL / CLOSING
    // --------------------------------------------------------

    if (
        dashboardPipelineStatusMatches(
            lead.status,
            DASHBOARD_PIPELINE_STAGES[5]
        )
    ) {
        return DASHBOARD_PIPELINE_STAGES[5];
    }


    /*
     * Closing field.
     */

    if (
        dashboardPipelineHasValue(
            lead.closing
        )
    ) {
        return DASHBOARD_PIPELINE_STAGES[5];
    }


    // --------------------------------------------------------
    // 3. QUOTATION
    // --------------------------------------------------------

    if (
        dashboardPipelineStatusMatches(
            lead.status,
            DASHBOARD_PIPELINE_STAGES[4]
        )
    ) {
        return DASHBOARD_PIPELINE_STAGES[4];
    }


    if (
        dashboardPipelineHasValue(
            lead.quotation
        )
    ) {
        return DASHBOARD_PIPELINE_STAGES[4];
    }


    // --------------------------------------------------------
    // 4. SITE SURVEY
    // --------------------------------------------------------

    if (
        dashboardPipelineStatusMatches(
            lead.status,
            DASHBOARD_PIPELINE_STAGES[3]
        )
    ) {
        return DASHBOARD_PIPELINE_STAGES[3];
    }


    if (
        dashboardPipelineHasValue(
            lead.site_survey
        )
    ) {
        return DASHBOARD_PIPELINE_STAGES[3];
    }


    // --------------------------------------------------------
    // 5. APPOINTMENT
    // --------------------------------------------------------

    if (
        dashboardPipelineStatusMatches(
            lead.status,
            DASHBOARD_PIPELINE_STAGES[2]
        )
    ) {
        return DASHBOARD_PIPELINE_STAGES[2];
    }


    if (
        dashboardPipelineHasValue(
            lead.appointment
        )
    ) {
        return DASHBOARD_PIPELINE_STAGES[2];
    }


    // --------------------------------------------------------
    // 6. FIRST CONTACT
    // --------------------------------------------------------

    if (
        dashboardPipelineStatusMatches(
            lead.status,
            DASHBOARD_PIPELINE_STAGES[1]
        )
    ) {
        return DASHBOARD_PIPELINE_STAGES[1];
    }


    // --------------------------------------------------------
    // 7. NEW CUSTOMER
    // --------------------------------------------------------

    if (
        dashboardPipelineStatusMatches(
            lead.status,
            DASHBOARD_PIPELINE_STAGES[0]
        )
    ) {
        return DASHBOARD_PIPELINE_STAGES[0];
    }


    /*
     * Unknown status.
     *
     * Jangan memaksakan lead ke pipeline.
     */

    return null;
}


// ============================================================
// GET PIPELINE STAGE COUNT
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


    if (!stage) {
        return 0;
    }


    return list.filter(
        function (lead) {

            const currentStage =
                dashboardGetPipelineStageForLead(
                    lead
                );


            if (!currentStage) {
                return false;
            }


            return (
                currentStage.key ===
                stage.key
            );

        }
    ).length;
}


// ============================================================
// GET TOTAL
// ============================================================

function dashboardGetPipelineTotal(
    data
) {

    return Array.isArray(data)
        ? data.length
        : 0;
}


// ============================================================
// GET PERCENTAGE
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


    if (value <= 0) {
        return "0%";
    }


    if (value >= 100) {
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
// ICON
// ============================================================

function dashboardPipelineIcon(
    iconName
) {

    return `
        <i
            data-lucide="${dashboardPipelineEscapeHTML(
                iconName || "circle"
            )}"
            aria-hidden="true"
        ></i>
    `;
}


// ============================================================
// EMPTY PIPELINE
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
                ${dashboardPipelineIcon("inbox")}
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
    // EMPTY
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
    // RENDER
    // --------------------------------------------------------

    const html =
        stages.map(
            function (
                stage,
                index
            ) {

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


                let progressWidth =
                    percentage;


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


                const safeLabel =
                    dashboardPipelineEscapeHTML(
                        stage.label
                    );


                const safeClass =
                    dashboardPipelineEscapeHTML(
                        stage.className
                    );


                const ariaLabel =
                    `${stage.label}: ${count} customer${count === 1 ? "" : "s"}, ${percentageText} of total leads`;


                const terminal =
                    stage.key === "dealClosing" ||
                    stage.key === "noDeal";


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

                        data-pipeline-key="${dashboardPipelineEscapeHTML(
                            stage.key
                        )}"

                        data-pipeline-count="${count}"

                        data-pipeline-percentage="${percentage}"

                        title="${dashboardPipelineEscapeHTML(
                            ariaLabel
                        )}"
                    >

                        <div
                            class="pipeline-stage-icon"
                            aria-hidden="true"
                        >
                            ${dashboardPipelineIcon(
                                stage.icon
                            )}
                        </div>


                        <div class="pipeline-content">

                            <div class="pipeline-stage-top">

                                <div class="pipeline-stage-text">

                                    <span class="pipeline-label">
                                        ${safeLabel}
                                    </span>

                                    <small class="pipeline-description">
                                        ${dashboardPipelineEscapeHTML(
                                            stage.description
                                        )}
                                    </small>

                                </div>


                                <div class="pipeline-stage-number">

                                    <strong class="pipeline-count">
                                        ${count}
                                    </strong>

                                    <span class="pipeline-percentage">
                                        ${percentageText}
                                    </span>

                                </div>

                            </div>


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
                                        width: ${progressWidth}%;
                                    "
                                ></div>

                            </div>

                        </div>


                        ${
                            terminal
                                ? `

                                    <div
                                        class="pipeline-terminal-indicator"
                                        aria-hidden="true"
                                    >

                                        ${dashboardPipelineIcon(
                                            stage.key ===
                                            "dealClosing"
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
        function (stage) {

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

                key:
                    stage.key,

                label:
                    stage.label,

                className:
                    stage.className,

                icon:
                    stage.icon,

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


    if (!normalizedStatus) {
        return null;
    }


    return DASHBOARD_PIPELINE_STAGES.find(
        function (stage) {

            return stage.aliases.some(
                function (alias) {

                    return (
                        dashboardNormalizePipelineStatus(
                            alias
                        ) ===
                        normalizedStatus
                    );

                }
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
        function (event) {

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
// INITIALIZE
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

window.dashboardGetPipelineStageForLead =
    dashboardGetPipelineStageForLead;

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

        dashboardGetPipelineStageForLead,

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
