/* =========================================================
   FSI CRM - SALES DASHBOARD LEADS
   ---------------------------------------------------------
   Mengatur daftar leads/customer pada Sales Dashboard.

   Fitur:
   - Search
   - Filter status
   - Pagination
   - Render table
   - View customer
   - Data leads Sales yang dipilih

   File ini tidak mengubah database.
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
   FILTER LEADS
   ========================================================= */

window.filterSalesDashboardLeads =
    function (leads) {

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

                /*
                 * SEARCH
                 */

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


                /*
                 * STATUS FILTER
                 */

                if (statusFilter) {

                    const leadStatus =
                        typeof normalizeSalesDashboardStatus ===
                        "function"
                            ? normalizeSalesDashboardStatus(
                                lead?.status
                            )
                            : String(
                                lead?.status || ""
                            ).trim();

                    if (
                        leadStatus.toLowerCase() !==
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
    function (leads) {

        const filteredLeads =
            window.filterSalesDashboardLeads(
                leads
            );

        if (
            typeof window.getSalesDashboardState !==
            "function"
        ) {
            return {
                leads: filteredLeads,
                total: filteredLeads.length,
                totalPages: 1,
                currentPage: 1
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
                    total / pageSize
                )
            );


        /*
         * Pastikan current page tidak melebihi
         * total halaman.
         */

        if (currentPage > totalPages) {
            currentPage = totalPages;
        }

        if (currentPage < 1) {
            currentPage = 1;
        }


        /*
         * Simpan current page.
         */

        state.currentPage =
            currentPage;


        const start =
            (currentPage - 1) *
            pageSize;

        const end =
            start + pageSize;


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
            day: "2-digit",
            month: "short",
            year: "numeric"
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
        typeof normalizeSalesDashboardStatus ===
        "function"
            ? normalizeSalesDashboardStatus(status)
            : String(status || "").trim();

    const pipelineStage =
        typeof window.getSalesDashboardPipelineStage ===
        "function"
            ? window.getSalesDashboardPipelineStage(
                normalizedStatus
            )
            : null;

    if (pipelineStage?.className) {
        return pipelineStage.className;
    }


    /*
     * Fallback.
     */

    return "status-new";
}


/* =========================================================
   GET STATUS LABEL
   ========================================================= */

function getSalesDashboardStatusLabel(
    status
) {

    const normalizedStatus =
        typeof normalizeSalesDashboardStatus ===
        "function"
            ? normalizeSalesDashboardStatus(status)
            : String(status || "").trim();

    return normalizedStatus || "New";
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeSalesDashboardLeadsHtml(
    value
) {

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
   RENDER LEADS TABLE
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
         * EMPTY RESULT
         */

        if (!result.leads.length) {

            container.innerHTML = `
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
            `;

            refreshSalesDashboardLeadIcons();

            return;
        }


        /*
         * TABLE
         */

        container.innerHTML = `

            <div class="sales-dashboard-table-wrapper">

                <table class="sales-dashboard-table">

                    <thead>

                        <tr>

                            <th>
                                Customer
                            </th>

                            <th>
                                Phone
                            </th>

                            <th>
                                Business
                            </th>

                            <th>
                                Location
                            </th>

                            <th>
                                Status
                            </th>

                            <th>
                                Follow Up
                            </th>

                            <th>
                                Action
                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        ${result.leads.map(
                            function (lead) {

                                const status =
                                    getSalesDashboardStatusLabel(
                                        lead?.status
                                    );

                                const statusClass =
                                    getSalesDashboardStatusClass(
                                        lead?.status
                                    );

                                return `

                                    <tr
                                        data-lead-id="${escapeSalesDashboardLeadsHtml(
                                            lead?.id
                                        )}"
                                    >

                                        <td>

                                            <div class="sales-dashboard-customer">

                                                <div class="sales-dashboard-customer-avatar">

                                                    <i data-lucide="user"></i>

                                                </div>

                                                <div class="sales-dashboard-customer-info">

                                                    <div class="sales-dashboard-customer-name">
                                                        ${escapeSalesDashboardLeadsHtml(
                                                            lead?.customer_name ||
                                                            "Unnamed Customer"
                                                        )}
                                                    </div>

                                                    <div class="sales-dashboard-customer-email">

                                                        ${escapeSalesDashboardLeadsHtml(
                                                            lead?.email || "-"
                                                        )}

                                                    </div>

                                                </div>

                                            </div>

                                        </td>


                                        <td>
                                            ${escapeSalesDashboardLeadsHtml(
                                                lead?.phone || "-"
                                            )}
                                        </td>


                                        <td>
                                            ${escapeSalesDashboardLeadsHtml(
                                                lead?.business || "-"
                                            )}
                                        </td>


                                        <td>
                                            ${escapeSalesDashboardLeadsHtml(
                                                lead?.location || "-"
                                            )}
                                        </td>


                                        <td>

                                            <span
                                                class="
                                                    sales-dashboard-status
                                                    ${statusClass}
                                                "
                                            >
                                                ${escapeSalesDashboardLeadsHtml(
                                                    status
                                                )}
                                            </span>

                                        </td>


                                        <td>
                                            ${formatSalesDashboardDate(
                                                lead?.follow_up_date
                                            )}
                                        </td>


                                        <td>

                                            <div class="sales-dashboard-actions">

                                                <button
                                                    type="button"
                                                    class="sales-dashboard-action-btn"
                                                    data-action="view-lead"
                                                    data-lead-id="${escapeSalesDashboardLeadsHtml(
                                                        lead?.id
                                                    )}"
                                                    title="View Customer"
                                                >

                                                    <i data-lucide="eye"></i>

                                                </button>

                                            </div>

                                        </td>

                                    </tr>

                                `;
                            }
                        ).join("")}

                    </tbody>

                </table>

            </div>

            ${renderSalesDashboardPagination(
                result
            )}

        `;


        refreshSalesDashboardLeadIcons();
    };


/* =========================================================
   RENDER PAGINATION
   ========================================================= */

function renderSalesDashboardPagination(
    result
) {

    if (
        !result ||
        result.totalPages <= 1
    ) {
        return "";
    }


    const currentPage =
        result.currentPage;

    const totalPages =
        result.totalPages;


    return `

        <div class="sales-dashboard-pagination">

            <button
                type="button"
                class="sales-dashboard-page-btn"
                data-page-action="previous"
                ${currentPage <= 1 ? "disabled" : ""}
            >
                <i data-lucide="chevron-left"></i>
                Previous
            </button>


            <div class="sales-dashboard-page-info">

                Page
                <strong>
                    ${currentPage}
                </strong>
                of
                <strong>
                    ${totalPages}
                </strong>

            </div>


            <button
                type="button"
                class="sales-dashboard-page-btn"
                data-page-action="next"
                ${currentPage >= totalPages ? "disabled" : ""}
            >
                Next
                <i data-lucide="chevron-right"></i>
            </button>

        </div>

    `;
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


        if (direction === "next") {

            nextPage++;

        } else if (
            direction === "previous"
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

            state.currentPage = 1;
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

            state.currentPage = 1;
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
    };


/* =========================================================
   HANDLE LEAD ACTION
   ========================================================= */

window.handleSalesDashboardLeadAction =
    function (
        action,
        leadId
    ) {

        if (!action || !leadId) {
            return;
        }


        if (action === "view-lead") {

            openSalesDashboardLead(
                leadId
            );

            return;
        }
    };


/* =========================================================
   OPEN LEAD
   ---------------------------------------------------------
   Untuk sementara mencari lead dari state.
   Nanti dapat disambungkan ke Customer Profile CRM utama.
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
                    ) === String(
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
         * Jika CRM utama memiliki fungsi untuk membuka
         * Customer Profile, gunakan fungsi tersebut.
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
         * Fallback sementara.
         */

        console.info(
            "Sales Dashboard - selected lead:",
            lead
        );
    };


/* =========================================================
   INITIALIZE LEAD EVENTS
   ========================================================= */

window.initSalesDashboardLeadEvents =
    function (
        container
    ) {

        if (!container) {
            return;
        }


        /*
         * Event delegation untuk action button.
         */

        container.addEventListener(
            "click",
            function (event) {

                const actionButton =
                    event.target.closest(
                        "[data-action]"
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
                 * Pagination
                 */

                const pageButton =
                    event.target.closest(
                        "[data-page-action]"
                    );

                if (pageButton) {

                    const pageAction =
                        pageButton.dataset.pageAction;

                    window.changeSalesDashboardPage(
                        pageAction
                    );

                    /*
                     * Render ulang table.
                     */

                    window.renderCurrentSalesDashboardLeads();

                }

            }
        );
    };


/* =========================================================
   RENDER CURRENT STATE LEADS
   ========================================================= */

window.renderCurrentSalesDashboardLeads =
    function () {

        const container =
            document.getElementById(
                "sales-dashboard-leads-container"
            );

        if (!container) {
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
   REFRESH ICONS
   ========================================================= */

function refreshSalesDashboardLeadIcons() {

    if (
        typeof window.lucide !== "undefined" &&
        typeof window.lucide.createIcons ===
            "function"
    ) {

        window.lucide.createIcons();
    }
}
