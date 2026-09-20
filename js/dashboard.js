/* =========================================================
   CRM FSI - DASHBOARD MODULE
========================================================= */

let dashboardInitialized = false;


/* =========================================================
   INITIALIZE
========================================================= */

async function initializeDashboard(){

    if(dashboardInitialized){
        return;
    }

    dashboardInitialized = true;

    bindDashboardEvents();

    await loadDashboardData();

}


/* =========================================================
   EVENTS
========================================================= */

function bindDashboardEvents(){

    /* =====================================================
       ADD LEAD / ADD CUSTOMER
    ===================================================== */

    const dashboardAddLead =
        document.getElementById(
            "dashboardAddLead"
        );

    if(dashboardAddLead){

        dashboardAddLead.addEventListener(
            "click",
            function(){

                window.location.href =
                    "customer-form.html?new=1";

            }
        );

    }


    /* =====================================================
       BACKWARD COMPATIBILITY
       Jika ada tombol lama addCustomerBtn
    ===================================================== */

    const addCustomerBtn =
        document.getElementById(
            "addCustomerBtn"
        );

    if(
        addCustomerBtn &&
        addCustomerBtn !== dashboardAddLead
    ){

        addCustomerBtn.addEventListener(
            "click",
            function(){

                window.location.href =
                    "customer-form.html?new=1";

            }
        );

    }


    /* =====================================================
       REFRESH DASHBOARD
    ===================================================== */

    const refreshDashboardBtn =
        document.getElementById(
            "refreshDashboardBtn"
        );

    if(refreshDashboardBtn){

        refreshDashboardBtn.addEventListener(
            "click",
            async function(){

                await loadDashboardData();

            }
        );

    }

}


/* =========================================================
   LOAD DASHBOARD DATA
========================================================= */

async function loadDashboardData(){

    try{

        const {
            data,
            error
        } =
            await supabaseClient
                .from(
                    CRM_CONFIG.leadTable
                )
                .select(
                    `
                    id,
                    customer_name,
                    phone,
                    business,
                    location,
                    status,
                    follow_up_date,
                    appointment,
                    site_survey,
                    quotation,
                    spk,
                    closing,
                    notes,
                    created_at,
                    sales_id,
                    created_by,
                    updated_by
                    `
                );


        if(error){

            console.error(
                "Dashboard data error:",
                error
            );

            throw error;

        }


        const leads =
            Array.isArray(data)
                ? data
                : [];


        /* =================================================
           STATISTICS
        ================================================= */

        renderDashboardStatistics(
            leads
        );


        /* =================================================
           NEXT STEP
        ================================================= */

        renderDashboardNextStep(
            leads
        );


        /* =================================================
           RECENT LEADS
        ================================================= */

        renderDashboardRecentLeads(
            leads
        );


        /* =================================================
           SALES OVERVIEW
        ================================================= */

        renderDashboardSalesOverview(
            leads
        );


        /* =================================================
           SALES PIPELINE
        ================================================= */

        renderDashboardPipeline(
            leads
        );


    }
    catch(error){

        console.error(
            "Load dashboard error:",
            error
        );

    }

}


/* =========================================================
   DASHBOARD STATISTICS
========================================================= */

function renderDashboardStatistics(
    leads
){

    const total =
        leads.length;


    const newCount =
        countDashboardStatus(
            leads,
            "New"
        );


    const interestedCount =
        countDashboardStatus(
            leads,
            "Interested"
        );


    const followUpCount =
        countDashboardStatus(
            leads,
            "Follow Up"
        );


    const closingCount =
        countDashboardStatus(
            leads,
            "Closing"
        );


    const appointmentCount =
        leads.filter(
            lead =>
                Boolean(
                    lead.appointment
                )
        ).length;


    const siteSurveyCount =
        leads.filter(
            lead =>
                Boolean(
                    lead.site_survey
                )
        ).length;


    const quotationCount =
        leads.filter(
            lead =>
                Boolean(
                    lead.quotation
                )
        ).length;


    /* =====================================================
       TOTAL
    ===================================================== */

    setDashboardValue(
        [
            "statTotal",

            "totalLeads",
            "totalCustomers",
            "totalCustomer",
            "dashboardTotal",
            "kpiTotalLeads"
        ],
        total
    );


    /* =====================================================
       NEW
    ===================================================== */

    setDashboardValue(
        [
            "statNew",

            "newLeads",
            "newCount",
            "dashboardNew"
        ],
        newCount
    );


    /* =====================================================
       INTERESTED
    ===================================================== */

    setDashboardValue(
        [
            "statInterested",

            "interestedLeads",
            "interestedCount",
            "dashboardInterested"
        ],
        interestedCount
    );


    /* =====================================================
       FOLLOW UP
    ===================================================== */

    setDashboardValue(
        [
            "statFollowUp",

            "followUpLeads",
            "followUpCount",
            "dashboardFollowUp",
            "kpiFollowUp"
        ],
        followUpCount
    );


    /* =====================================================
       APPOINTMENT
    ===================================================== */

    setDashboardValue(
        [
            "statAppointment",

            "appointmentLeads",
            "appointmentCount",
            "dashboardAppointment",
            "kpiAppointment"
        ],
        appointmentCount
    );


    /* =====================================================
       SITE SURVEY
    ===================================================== */

    setDashboardValue(
        [
            "statSiteSurvey",

            "siteSurveyLeads",
            "siteSurveyCount",
            "dashboardSiteSurvey"
        ],
        siteSurveyCount
    );


    /* =====================================================
       QUOTATION
    ===================================================== */

    setDashboardValue(
        [
            "statQuotation",

            "quotationLeads",
            "quotationCount",
            "dashboardQuotation"
        ],
        quotationCount
    );


    /* =====================================================
       CLOSING
    ===================================================== */

    setDashboardValue(
        [
            "statClosing",

            "closingLeads",
            "closingCount",
            "dashboardClosing",
            "kpiClosing"
        ],
        closingCount
    );

}


/* =========================================================
   SET DASHBOARD VALUE
========================================================= */

function setDashboardValue(
    ids,
    value
){

    if(!Array.isArray(ids)){
        return;
    }


    ids.forEach(
        id => {

            const element =
                document.getElementById(
                    id
                );


            if(element){

                element.textContent =
                    Number(
                        value || 0
                    ).toLocaleString(
                        "id-ID"
                    );

            }

        }
    );

}


/* =========================================================
   COUNT STATUS
========================================================= */

function countDashboardStatus(
    leads,
    targetStatus
){

    if(!Array.isArray(leads)){
        return 0;
    }


    return leads.filter(
        lead => {

            const status =
                typeof normalizeLeadStatus ===
                "function"
                    ?
                    normalizeLeadStatus(
                        lead.status
                    )
                    :
                    String(
                        lead.status ||
                        ""
                    ).trim();


            return (
                status.toLowerCase() ===
                targetStatus.toLowerCase()
            );

        }
    ).length;

}


/* =========================================================
   NEXT STEP
========================================================= */

function renderDashboardNextStep(
    leads
){

    const container =
        document.getElementById(
            "dashboardNextStep"
        );


    if(!container){
        return;
    }


    if(
        !Array.isArray(leads) ||
        leads.length === 0
    ){

        container.innerHTML = `
            <div class="empty-state">

                <i class="fa-solid fa-users"></i>

                <p>
                    Belum ada customer.
                </p>

            </div>
        `;

        return;

    }


    const sortedLeads =
        [...leads].sort(
            (
                a,
                b
            ) => {

                const dateA =
                    new Date(
                        a.created_at || 0
                    ).getTime();


                const dateB =
                    new Date(
                        b.created_at || 0
                    ).getTime();


                return dateB - dateA;

            }
        );


    const latest =
        sortedLeads.slice(
            0,
            5
        );


    container.innerHTML =
        latest.map(
            lead => {

                const status =
                    typeof normalizeLeadStatus ===
                    "function"
                        ?
                        normalizeLeadStatus(
                            lead.status
                        )
                        :
                        (
                            lead.status ||
                            "New"
                        );


                const nextStep =
                    getDashboardNextStep(
                        lead
                    );


                return `
                    <div class="dashboard-next-item">

                        <div class="dashboard-next-avatar">

                            ${escapeDashboardText(
                                getDashboardInitials(
                                    lead.customer_name
                                )
                            )}

                        </div>


                        <div class="dashboard-next-info">

                            <strong>
                                ${escapeDashboardText(
                                    lead.customer_name ||
                                    "Unnamed Customer"
                                )}
                            </strong>

                            <span>
                                ${escapeDashboardText(
                                    lead.business ||
                                    lead.location ||
                                    "-"
                                )}
                            </span>

                        </div>


                        <div class="dashboard-next-status">

                            <span class="status-pill">

                                ${escapeDashboardText(
                                    status
                                )}

                            </span>

                            <small>

                                ${escapeDashboardText(
                                    nextStep
                                )}

                            </small>

                        </div>

                    </div>
                `;

            }
        ).join("");

}


/* =========================================================
   RECENT LEADS
========================================================= */

function renderDashboardRecentLeads(
    leads
){

    const container =
        document.getElementById(
            "recentLeads"
        );


    if(!container){
        return;
    }


    if(
        !Array.isArray(leads) ||
        leads.length === 0
    ){

        container.innerHTML = `
            <div class="empty-state">

                <i class="fa-solid fa-users"></i>

                <p>
                    Belum ada lead.
                </p>

            </div>
        `;

        return;

    }


    const sortedLeads =
        [...leads].sort(
            (
                a,
                b
            ) => {

                return (
                    new Date(
                        b.created_at || 0
                    ).getTime()
                    -
                    new Date(
                        a.created_at || 0
                    ).getTime()
                );

            }
        );


    const recent =
        sortedLeads.slice(
            0,
            5
        );


    container.innerHTML =
        recent.map(
            lead => {

                const status =
                    typeof normalizeLeadStatus ===
                    "function"
                        ?
                        normalizeLeadStatus(
                            lead.status
                        )
                        :
                        (
                            lead.status ||
                            "New"
                        );


                return `
                    <div
                        class="recent-lead-item"
                        onclick="showCustomerProfile(${Number(
                            lead.id
                        )})"
                    >

                        <div class="recent-lead-avatar">

                            ${escapeDashboardText(
                                getDashboardInitials(
                                    lead.customer_name
                                )
                            )}

                        </div>


                        <div class="recent-lead-info">

                            <strong>
                                ${escapeDashboardText(
                                    lead.customer_name ||
                                    "Unnamed Customer"
                                )}
                            </strong>

                            <span>
                                ${escapeDashboardText(
                                    lead.business ||
                                    lead.location ||
                                    "-"
                                )}
                            </span>

                        </div>


                        <span class="status-pill">

                            ${escapeDashboardText(
                                status
                            )}

                        </span>

                    </div>
                `;

            }
        ).join("");

}


/* =========================================================
   SALES OVERVIEW
========================================================= */

function renderDashboardSalesOverview(
    leads
){

    const container =
        document.getElementById(
            "salesOverviewChart"
        );


    if(!container){
        return;
    }


    const statuses = [
        {
            name: "New",
            key: "New"
        },
        {
            name: "Interested",
            key: "Interested"
        },
        {
            name: "Follow Up",
            key: "Follow Up"
        },
        {
            name: "Closing",
            key: "Closing"
        },
        {
            name: "Not Interested",
            key: "Not Interested"
        }
    ];


    const total =
        leads.length || 1;


    container.innerHTML =
        statuses.map(
            item => {

                const count =
                    countDashboardStatus(
                        leads,
                        item.key
                    );


                const percentage =
                    Math.round(
                        (
                            count /
                            total
                        ) * 100
                    );


                return `
                    <div class="chart-row">

                        <div class="chart-label">

                            <span>
                                ${escapeDashboardText(
                                    item.name
                                )}
                            </span>

                            <strong>
                                ${count}
                            </strong>

                        </div>


                        <div class="chart-track">

                            <div
                                class="chart-bar"
                                style="width:${percentage}%"
                            ></div>

                        </div>

                    </div>
                `;

            }
        ).join("");

}


/* =========================================================
   SALES PIPELINE
========================================================= */

function renderDashboardPipeline(
    leads
){

    const container =
        document.getElementById(
            "dashboardPipeline"
        );


    if(!container){
        return;
    }


    const pipeline = [
        {
            label: "New",
            value: countDashboardStatus(
                leads,
                "New"
            )
        },
        {
            label: "Interested",
            value: countDashboardStatus(
                leads,
                "Interested"
            )
        },
        {
            label: "Follow Up",
            value: countDashboardStatus(
                leads,
                "Follow Up"
            )
        },
        {
            label: "Closing",
            value: countDashboardStatus(
                leads,
                "Closing"
            )
        }
    ];


    container.innerHTML =
        pipeline.map(
            item => {

                return `
                    <div class="pipeline-stage">

                        <div class="pipeline-stage-title">

                            <span>
                                ${escapeDashboardText(
                                    item.label
                                )}
                            </span>

                            <strong>
                                ${item.value}
                            </strong>

                        </div>

                    </div>
                `;

            }
        ).join("");

}


/* =========================================================
   NEXT STEP TEXT
========================================================= */

function getDashboardNextStep(
    lead
){

    if(!lead){

        return "Belum ada next step";

    }


    if(lead.closing){

        return "Closing selesai";

    }


    if(lead.spk){

        return "Follow up SPK";

    }


    if(lead.quotation){

        return "Follow up quotation";

    }


    if(lead.site_survey){

        return "Follow up site survey";

    }


    if(lead.appointment){

        return "Follow up appointment";

    }


    if(lead.follow_up_date){

        return (
            "Follow up " +
            formatDashboardDate(
                lead.follow_up_date
            )
        );

    }


    return "Belum ada jadwal follow up";

}


/* =========================================================
   INITIALS
========================================================= */

function getDashboardInitials(
    name
){

    if(!name){

        return "NA";

    }


    const parts =
        String(name)
            .trim()
            .split(/\s+/)
            .filter(Boolean);


    if(parts.length === 1){

        return parts[0]
            .substring(
                0,
                2
            )
            .toUpperCase();

    }


    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();

}


/* =========================================================
   DATE
========================================================= */

function formatDashboardDate(
    value
){

    if(!value){

        return "-";

    }


    try{

        return new Intl.DateTimeFormat(
            "id-ID",
            {
                day: "2-digit",
                month: "short"
            }
        ).format(
            new Date(value)
        );

    }
    catch{

        return String(value);

    }

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeDashboardText(
    value
){

    if(
        value === null ||
        value === undefined
    ){

        return "";

    }


    return String(value)
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


/* =========================================================
   AUTO INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function(){

        setTimeout(
            function(){

                if(
                    document.getElementById(
                        "dashboardAddLead"
                    ) ||
                    document.getElementById(
                        "addCustomerBtn"
                    ) ||
                    document.getElementById(
                        "dashboardNextStep"
                    ) ||
                    document.getElementById(
                        "recentLeads"
                    ) ||
                    document.getElementById(
                        "salesOverviewChart"
                    ) ||
                    document.getElementById(
                        "dashboardPipeline"
                    )
                ){

                    initializeDashboard();

                }

            },
            250
        );

    }
);
