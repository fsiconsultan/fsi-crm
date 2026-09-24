/* =========================================================
   FSI CRM - SALES DASHBOARD LEADS
   ---------------------------------------------------------
   Mengatur daftar leads/customer pada Sales Dashboard.

   Fitur:
   - Search
   - Filter status
   - Pagination
   - Render table rows
   - View customer
   - Data leads Sales yang dipilih

   Compatible dengan index.html terbaru.
   Tidak mengubah database.
   ========================================================= */


/* =========================================================
   GET LEADS FROM STATE
   ========================================================= */

function getSalesDashboardLeadsFromState() {

    if (
        typeof window.getSalesDashboardState !==
        "function"
    ) {
        return [];
    }

    const state =
        window.getSalesDashboardState();

    return Array.isArray(state?.leads)
        ? state.leads
        : [];
}


/* =========================================================
   NORMALIZE STATUS
   ========================================================= */

function normalizeSalesDashboardLeadStatus(
    status
) {

    /*
     * Gunakan normalizer CRM utama jika tersedia.
     */

    if (
        typeof window.normalizeLeadStatus ===
        "function"
    ) {
        return window.normalizeLeadStatus(
            status
        );
    }


    /*
     * Fallback untuk memastikan status lama
     * tetap dapat dibaca.
     */

    const value =
        String(
            status || ""
        ).trim();


    const aliases = {

        "New":
            "New",

        "Flyer Sent":
            "First Contact",

        "Interested":
            "First Meeting / Appointment / Site Survey",

        "Appointment":
            "First Meeting / Appointment / Site Survey",

        "Site Survey":
            "First Meeting / Appointment / Site Survey",

        "Follow Up":
            "Second Appointment",

        "Quotation":
            "Quotation",

        "Closing":
            "Deal",

        "Not Interested":
            "No Deal"

    };


    return (
        aliases[value] ||
        value ||
        "New"
    );
}


/* =========================================================
   FILTER LEADS
   ========================================================= */

window.filterSalesDashboardLeads =
    function (
        leads
    ) {

        const safeLeads =
            Array.isArray(leads)
                ? leads
                : [];


        if (
            typeof window.getSalesDashboardState !==
            "function"
        ) {
            return safeLeads;
        }


        const state =
            window.getSalesDashboardState();


        const searchTerm =
            String(
                state?.searchTerm || ""
            )
                .trim()
                .toLowerCase();


        const statusFilter =
            String(
                state?.statusFilter || ""
            )
                .trim()
                .toLowerCase();


        return safeLeads.filter(
            function (lead) {

                /* -----------------------------------------
                   SEARCH
                ----------------------------------------- */

                if (searchTerm) {

                    const searchableText = [

                        lead?.customer_name,

                        lead?.phone,

                        lead?.email,

                        lead?.business,

                        lead?.location

                    ]
                        .map(
                            function (value) {

                                return String(
                                    value || ""
                                ).toLowerCase();
                            }
                        )
                        .join(" ");


                    if (
                        !searchableText.includes(
                            searchTerm
                        )
                    ) {
                        return false;
                    }
                }


                /* -----------------------------------------
                   STATUS FILTER
                ----------------------------------------- */

                if (statusFilter) {

                    const leadStatus =
                        normalizeSalesDashboardLeadStatus(
                            lead?.status
                        );


                    if (
                        leadStatus
                            .toLowerCase() !==
                        statusFilter
                    ) {
                        return false;
                    }
                }


                return true;
            }
        );
    };


/* =========================================================
   GET PAGINATED LEADS
   ========================================================= */

window.getSalesDashboardPaginatedLeads =
    function (
        leads
    ) {

        const filteredLeads =
            window.filterSalesDashboardLeads(
                leads
            );


        if (
            typeof window.getSalesDashboardState !==
            "function"
        ) {

            return {

                leads:
                    filteredLeads,

                total:
                    filteredLeads.length,

                totalPages:
                    1,

                currentPage:
                    1,

                pageSize:
                    filteredLeads.length || 20

            };
        }


        const state =
            window.getSalesDashboardState();


        const pageSize =
            Number(
                state?.pageSize || 20
            );


        let currentPage =
            Number(
                state?.currentPage || 1
            );


        const total =
            filteredLeads.length;


        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    total /
                    pageSize
                )
            );


        if (
            currentPage >
            totalPages
        ) {

            currentPage =
                totalPages;
        }


        if (
            currentPage <
            1
        ) {

            currentPage =
                1;
        }


        state.currentPage =
            currentPage;


        const start =
            (
                currentPage -
                1
            ) *
            pageSize;


        const end =
            start +
            pageSize;


        return {

            leads:
                filteredLeads.slice(
                    start,
                    end
                ),

            total,

            totalPages,

            currentPage,

            pageSize

        };
    };


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatSalesDashboardDate(
    value
) {

    if (!value) {
        return "-";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "-";
    }


    return date.toLocaleDateString(
        "id-ID",
        {
            day:
                "2-digit",

            month:
                "short",

            year:
                "numeric"
        }
    );
}


/* =========================================================
   GET STATUS CLASS
   ========================================================= */

function getSalesDashboardStatusClass(
    status
) {

    const normalizedStatus =
        normalizeSalesDashboardLeadStatus(
            status
        );


    if (
        typeof window.getSalesDashboardPipelineStage ===
        "function"
    ) {

        const pipelineStage =
            window.getSalesDashboardPipelineStage(
                normalizedStatus
            );


        if (
            pipelineStage?.className
        ) {

            return pipelineStage.className;
        }
    }


    /*
     * Fallback status classes.
     */

    const classMap = {

        "New":
            "status-new",

        "First Contact":
            "status-first-contact",

        "First Meeting / Appointment / Site Survey":
            "status-first-meeting",

        "Quotation":
            "status-quotation",

        "Second Appointment":
            "status-second-appointment",

        "Deal":
            "status-deal",

        "No Deal":
            "status-no-deal"

    };


    return (
        classMap[
            normalizedStatus
        ] ||
        "status-new"
    );
}


/* =========================================================
   GET STATUS LABEL
   ========================================================= */

function getSalesDashboardStatusLabel(
    status
) {

    return normalizeSalesDashboardLeadStatus(
        status
    );
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeSalesDashboardLeadsHtml(
    value
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        value === null ||
        value === undefined
            ? ""
            : String(value);


    return div.innerHTML;
}


/* =========================================================
   RENDER EMPTY TABLE
   ========================================================= */

function renderSalesDashboardLeadsEmpty(
    container
) {

    if (!container) {
        return;
    }


    container.innerHTML = `
        <tr class="sales-dashboard-empty-row">

            <td
                colspan="7"
                class="sales-dashboard-empty-cell"
            >

                <div class="sales-dashboard-empty">

                    <div class="sales-dashboard-empty-icon">
                        <i data-lucide="users"></i>
                    </div>

                    <div class="sales-dashboard-empty-title">
                        No Leads Found
                    </div>

                    <div class="sales-dashboard-empty-text">
                        Tidak ada customer yang sesuai dengan
                        pencarian atau filter.
                    </div>

                </div>

            </td>

        </tr>
    `;


    refreshSalesDashboardLeadIcons();
}


/* =========================================================
   RENDER LEADS TABLE BODY
   ---------------------------------------------------------
   PENTING:
   container sekarang adalah <tbody>
   sesuai index.html terbaru.
   ========================================================= */

window.renderSalesDashboardLeads =
    function (
        container,
        leads
    ) {

        if (!container) {
            return;
        }


        const result =
            window.getSalesDashboardPaginatedLeads(
                leads
            );


        /*
         * EMPTY
         */

        if (
            !result.leads.length
        ) {

            renderSalesDashboardLeadsEmpty(
                container
            );


            updateSalesDashboardPagination(
                result
            );


            return;
        }


        /*
         * RENDER ROWS SAJA.
         *
         * Jangan membuat <table> / <tbody>
         * di sini karena container sudah merupakan
         * <tbody> dari index.html.
         */

        container.innerHTML =
            result.leads
                .map(
                    function (lead) {

                        const status =
                            getSalesDashboardStatusLabel(
                                lead?.status
                            );


                        const statusClass =
                            getSalesDashboardStatusClass(
                                lead?.status
                            );


                        const leadId =
                            escapeSalesDashboardLeadsHtml(
                                lead?.id
                            );


                        const customerName =
                            escapeSalesDashboardLeadsHtml(
                                lead?.customer_name ||
                                "Unnamed Customer"
                            );


                        const email =
                            escapeSalesDashboardLeadsHtml(
                                lead?.email ||
                                "-"
                            );


                        const phone =
                            escapeSalesDashboardLeadsHtml(
                                lead?.phone ||
                                "-"
                            );


                        const business =
                            escapeSalesDashboardLeadsHtml(
                                lead?.business ||
                                "-"
                            );


                        const location =
                            escapeSalesDashboardLeadsHtml(
                                lead?.location ||
                                "-"
                            );


                        const followUp =
                            formatSalesDashboardDate(
                                lead?.follow_up_date
                            );


                        return `
                            <tr
                                data-lead-id="${leadId}"
                            >

                                <td>

                                    <div class="sales-dashboard-customer">

                                        <div class="sales-dashboard-customer-avatar">

                                            <i
                                                data-lucide="user"
                                            ></i>

                                        </div>

                                        <div class="sales-dashboard-customer-info">

                                            <div class="sales-dashboard-customer-name">
                                                ${customerName}
                                            </div>

                                            <div class="sales-dashboard-customer-email">
                                                ${email}
                                            </div>

                                        </div>

                                    </div>

                                </td>


                                <td>
                                    ${phone}
                                </td>


                                <td>
                                    ${business}
                                </td>


                                <td>
                                    ${location}
                                </td>


                                <td>

                                    <span
                                        class="sales-dashboard-status ${statusClass}"
                                    >
                                        ${escapeSalesDashboardLeadsHtml(
                                            status
                                        )}
                                    </span>

                                </td>


                                <td>
                                    ${followUp}
                                </td>


                                <td>

                                    <div class="sales-dashboard-actions">

                                        <button
                                            type="button"
                                            class="sales-dashboard-action-btn"
                                            data-action="view-lead"
                                            data-lead-id="${leadId}"
                                            title="View Customer"
                                        >

                                            <i
                                                data-lucide="eye"
                                            ></i>

                                        </button>

                                    </div>

                                </td>

                            </tr>
                        `;
                    }
                )
                .join("");


        updateSalesDashboardPagination(
            result
        );


        refreshSalesDashboardLeadIcons();
    };


/* =========================================================
   UPDATE PAGINATION
   ---------------------------------------------------------
   Menggunakan ID yang memang ada di index.html.
   ========================================================= */

function updateSalesDashboardPagination(
    result
) {

    const info =
        document.getElementById(
            "sales-dashboard-pagination-info"
        );


    const previousButton =
        document.getElementById(
            "sales-dashboard-prev-page"
        );


    const pageNumber =
        document.getElementById(
            "sales-dashboard-page-number"
        );


    const nextButton =
        document.getElementById(
            "sales-dashboard-next-page"
        );


    const currentPage =
        Number(
            result?.currentPage || 1
        );


    const totalPages =
        Number(
            result?.totalPages || 1
        );


    const total =
        Number(
            result?.total || 0
        );


    /*
     * Info.
     */

    if (info) {

        if (!total) {

            info.textContent =
                "0 customers";

        } else {

            const start =
                (
                    (
                        currentPage -
                        1
                    ) *
                    (
                        result?.pageSize ||
                        20
                    )
                ) + 1;


            const end =
                Math.min(
                    currentPage *
                    (
                        result?.pageSize ||
                        20
                    ),
                    total
                );


            info.textContent =
                `${start}-${end} of ${total}`;
        }
    }


    /*
     * Page number.
     */

    if (pageNumber) {

        pageNumber.textContent =
            `${currentPage} / ${totalPages}`;
    }


    /*
     * Previous.
     */

    if (previousButton) {

        previousButton.disabled =
            currentPage <= 1;
    }


    /*
     * Next.
     */

    if (nextButton) {

        nextButton.disabled =
            currentPage >= totalPages;
    }
}


/* =========================================================
   CHANGE PAGE
   ========================================================= */

window.changeSalesDashboardPage =
    function (
        direction
    ) {

        if (
            typeof window.getSalesDashboardState !==
            "function"
        ) {
            return;
        }


        const state =
            window.getSalesDashboardState();


        const leads =
            getSalesDashboardLeadsFromState();


        const result =
            window.getSalesDashboardPaginatedLeads(
                leads
            );


        let nextPage =
            Number(
                state.currentPage || 1
            );


        if (
            direction ===
            "next"
        ) {

            nextPage++;

        } else if (
            direction ===
            "previous"
        ) {

            nextPage--;
        }


        nextPage =
            Math.max(
                1,
                Math.min(
                    nextPage,
                    result.totalPages
                )
            );


        state.currentPage =
            nextPage;


        /*
         * Render ulang.
         */

        window.renderCurrentSalesDashboardLeads();
    };


/* =========================================================
   SET SEARCH
   ========================================================= */

window.handleSalesDashboardSearch =
    function (
        value
    ) {

        if (
            typeof window.setSalesDashboardSearch ===
            "function"
        ) {

            window.setSalesDashboardSearch(
                value
            );
        }


        if (
            typeof window.getSalesDashboardState ===
            "function"
        ) {

            const state =
                window.getSalesDashboardState();


            state.currentPage =
                1;
        }
    };


/* =========================================================
   SET STATUS FILTER
   ========================================================= */

window.handleSalesDashboardStatusFilter =
    function (
        value
    ) {

        if (
            typeof window.setSalesDashboardStatusFilter ===
            "function"
        ) {

            window.setSalesDashboardStatusFilter(
                value
            );
        }


        if (
            typeof window.getSalesDashboardState ===
            "function"
        ) {

            const state =
                window.getSalesDashboardState();


            state.currentPage =
                1;
        }
    };


/* =========================================================
   RESET FILTER
   ========================================================= */

window.resetSalesDashboardLeadFilters =
    function () {

        if (
            typeof window.resetSalesDashboardFilters ===
            "function"
        ) {

            window.resetSalesDashboardFilters();
        }


        window.renderCurrentSalesDashboardLeads();
    };


/* =========================================================
   HANDLE LEAD ACTION
   ========================================================= */

window.handleSalesDashboardLeadAction =
    function (
        action,
        leadId
    ) {

        if (
            !action ||
            !leadId
        ) {
            return;
        }


        if (
            action ===
            "view-lead"
        ) {

            window.openSalesDashboardLead(
                leadId
            );
        }
    };


/* =========================================================
   OPEN LEAD
   ========================================================= */

window.openSalesDashboardLead =
    function (
        leadId
    ) {

        const leads =
            getSalesDashboardLeadsFromState();


        const lead =
            leads.find(
                function (item) {

                    return String(
                        item?.id
                    ) ===
                    String(
                        leadId
                    );
                }
            );


        if (!lead) {

            console.warn(
                "Sales Dashboard: lead tidak ditemukan.",
                leadId
            );

            return;
        }


        /*
         * Customer Profile CRM utama.
         */

        if (
            typeof window.openCustomerProfile ===
            "function"
        ) {

            window.openCustomerProfile(
                lead
            );

            return;
        }


        if (
            typeof window.showCustomerProfile ===
            "function"
        ) {

            window.showCustomerProfile(
                lead
            );

            return;
        }


        /*
         * Fallback.
         */

        console.info(
            "Sales Dashboard - selected lead:",
            lead
        );
    };


/* =========================================================
   RENDER CURRENT LEADS
   ========================================================= */

window.renderCurrentSalesDashboardLeads =
    function () {

        const container =
            document.getElementById(
                "sales-dashboard-leads-body"
            );


        if (!container) {

            console.warn(
                "sales-dashboard-leads-body tidak ditemukan."
            );

            return;
        }


        const leads =
            getSalesDashboardLeadsFromState();


        window.renderSalesDashboardLeads(
            container,
            leads
        );
    };


/* =========================================================
   LEAD EVENTS
   ---------------------------------------------------------
   Event delegation dipasang sekali pada document.
   Jadi tidak masalah kalau table dirender ulang.
   ========================================================= */

let salesDashboardLeadEventsInitialized =
    false;


function initSalesDashboardLeadEvents() {

    if (
        salesDashboardLeadEventsInitialized
    ) {

        return;
    }


    salesDashboardLeadEventsInitialized =
        true;


    document.addEventListener(
        "click",
        function (event) {

            /*
             * View Customer
             */

            const actionButton =
                event.target.closest(
                    "#sales-dashboard-leads-body [data-action]"
                );


            if (actionButton) {

                const action =
                    actionButton.dataset.action;


                const leadId =
                    actionButton.dataset.leadId;


                window.handleSalesDashboardLeadAction(
                    action,
                    leadId
                );


                return;
            }


            /*
             * Previous page
             */

            const previousButton =
                event.target.closest(
                    "#sales-dashboard-prev-page"
                );


            if (
                previousButton &&
                !previousButton.disabled
            ) {

                window.changeSalesDashboardPage(
                    "previous"
                );


                return;
            }


            /*
             * Next page
             */

            const nextButton =
                event.target.closest(
                    "#sales-dashboard-next-page"
                );


            if (
                nextButton &&
                !nextButton.disabled
            ) {

                window.changeSalesDashboardPage(
                    "next"
                );
            }
        }
    );
}


/* =========================================================
   REFRESH ICONS
   ========================================================= */

function refreshSalesDashboardLeadIcons() {

    if (
        typeof window.lucide !==
        "undefined" &&
        typeof window.lucide.createIcons ===
        "function"
    ) {

        window.lucide.createIcons();
    }
}


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initSalesDashboardLeadEvents();
    }
);
