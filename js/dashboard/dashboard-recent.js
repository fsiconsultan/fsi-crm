```js
// ============================================================
// FIND RECENT LEADS CONTAINER
// ============================================================
//
// index.html terbaru menggunakan:
//        recent-leads
//
// Versi lama menggunakan:
//        dashboard-activities
//
// Kita support keduanya.
// ============================================================
function dashboardFindRecentLeadsContainer() {

    const ids = [
        "recent-leads",
        "dashboard-activities",
        "recent-leads-container",
        "dashboard-recent-leads"
    ];

    for (
        const id
        of ids
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
// FORMAT HISTORY DATE
// ============================================================
function dashboardFormatHistoryDate(
    value
) {

    if (!value) {
        return "-";
    }

    if (
        typeof window.formatDateTime ===
        "function"
    ) {

        try {

            return window.formatDateTime(
                value
            );

        } catch (error) {

            console.warn(
                "FSI CRM: dashboard date format error:",
                error
            );
        }
    }

    const date =
        new Date(
            value
        );

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


// ============================================================
// GET CUSTOMER HISTORY
// ============================================================
function dashboardGetCustomerHistory(
    lead
) {

    const history = [];


    // --------------------------------------------------------
    // CREATED
    // --------------------------------------------------------
    if (
        lead.created_at
    ) {

        history.push(
            {
                label:
                    "Created",

                date:
                    lead.created_at,

                icon:
                    "user-plus"
            }
        );
    }


    // --------------------------------------------------------
    // INPUT DATE / CURRENT STATUS DATE
    // --------------------------------------------------------
    if (
        lead.status_started_at
    ) {

        history.push(
            {
                label:
                    "Input Date",

                date:
                    lead.status_started_at,

                icon:
                    "calendar-days"
            }
        );
    }


    // --------------------------------------------------------
    // APPOINTMENT
    // --------------------------------------------------------
    if (
        lead.appointment
    ) {

        history.push(
            {
                label:
                    "Appointment",

                date:
                    lead.appointment,

                icon:
                    "calendar-check"
            }
        );
    }


    // --------------------------------------------------------
    // SITE SURVEY
    // --------------------------------------------------------
    if (
        lead.site_survey
    ) {

        history.push(
            {
                label:
                    "Site Survey",

                date:
                    lead.site_survey,

                icon:
                    "map-pin"
            }
        );
    }


    // --------------------------------------------------------
    // QUOTATION
    // --------------------------------------------------------
    if (
        lead.quotation
    ) {

        history.push(
            {
                label:
                    "Quotation",

                date:
                    lead.quotation,

                icon:
                    "file-text"
            }
        );
    }


    // --------------------------------------------------------
    // DEAL
    // --------------------------------------------------------
    if (
        lead.closing
    ) {

        history.push(
            {
                label:
                    "Deal",

                date:
                    lead.closing,

                icon:
                    "handshake"
            }
        );
    }


    return history;
}


// ============================================================
// RENDER RECENT LEADS / CUSTOMER HISTORY
// ============================================================
function renderDashboardRecentLeads(
    data
) {

    const container =
        dashboardFindRecentLeadsContainer();

    if (!container) {

        console.warn(
            "FSI CRM: Recent Leads container tidak ditemukan."
        );

        return;
    }


    const list =
        Array.isArray(data)
            ? data
            : [];


    // --------------------------------------------------------
    // SORT
    // Tetap menggunakan created_at supaya data terbaru
    // tetap tampil di bagian atas.
    // --------------------------------------------------------
    const recent =
        [...list]
            .sort(
                (
                    a,
                    b
                ) => {

                    const dateA =
                        new Date(
                            a.created_at ||
                            0
                        ).getTime();

                    const dateB =
                        new Date(
                            b.created_at ||
                            0
                        ).getTime();

                    return dateB -
                        dateA;
                }
            )
            .slice(
                0,
                8
            );


    // --------------------------------------------------------
    // EMPTY
    // --------------------------------------------------------
    if (
        !recent.length
    ) {

        container.innerHTML =
            '<div class="empty-state">' +

            '<div class="empty-state-icon">' +
            '<i data-lucide="inbox"></i>' +
            '</div>' +

            '<h4>' +
            'No recent leads' +
            '</h4>' +

            '<p>' +
            'Belum ada data customer terbaru.' +
            '</p>' +

            '</div>';


        if (
            typeof window.refreshIcons ===
            "function"
        ) {

            window.refreshIcons();
        }

        return;
    }


    // --------------------------------------------------------
    // CUSTOMER HISTORY
    // --------------------------------------------------------
    container.innerHTML =
        recent.map(
            lead => {

                const name =
                    lead.customer_name ||
                    "Unnamed Customer";


                const status =
                    typeof window.dashboardNormalizeStatus ===
                    "function"
                        ? (
                            window.dashboardNormalizeStatus(
                                lead.status
                            ) ||
                            "New"
                        )
                        : (
                            lead.status ||
                            "New"
                        );


                const statusClass =
                    typeof window.getStatusClass ===
                    "function"
                        ? window.getStatusClass(
                            status
                        )
                        : "status-new";


                const history =
                    dashboardGetCustomerHistory(
                        lead
                    );


                let historyHTML =
                    "";


                if (
                    history.length
                ) {

                    historyHTML =
                        '<div class="dashboard-customer-history">';


                    history.forEach(
                        item => {

                            historyHTML +=
                                '<div class="dashboard-history-item">' +

                                '<div class="dashboard-history-icon">' +

                                '<i data-lucide="' +
                                dashboardEscapeHTML(
                                    item.icon
                                ) +
                                '"></i>' +

                                '</div>' +

                                '<div class="dashboard-history-content">' +

                                '<span class="dashboard-history-label">' +
                                dashboardEscapeHTML(
                                    item.label
                                ) +
                                '</span>' +

                                '<span class="dashboard-history-date">' +
                                dashboardEscapeHTML(
                                    dashboardFormatHistoryDate(
                                        item.date
                                    )
                                ) +
                                '</span>' +

                                '</div>' +

                                '</div>';
                        }
                    );


                    historyHTML +=
                        '</div>';

                } else {

                    historyHTML =
                        '<div class="dashboard-history-empty">' +
                        'Belum ada history tanggal.' +
                        '</div>';
                }


                return (

                    '<div class="activity-item dashboard-customer-history-card">' +

                    '<div class="activity-icon">' +
                    '<i data-lucide="user-round"></i>' +
                    '</div>' +

                    '<div class="activity-content">' +

                    '<div class="activity-title">' +
                    dashboardEscapeHTML(
                        name
                    ) +
                    '</div>' +

                    '<div class="activity-meta">' +

                    '<span class="status-badge ' +
                    dashboardEscapeHTML(
                        statusClass
                    ) +
                    '">' +
                    dashboardEscapeHTML(
                        status
                    ) +
                    '</span>' +

                    '</div>' +

                    historyHTML +

                    '</div>' +

                    '</div>'
                );
            }
        ).join("");


    // --------------------------------------------------------
    // REFRESH ICONS
    // --------------------------------------------------------
    if (
        typeof window.refreshIcons ===
        "function"
    ) {

        window.refreshIcons();
    }
}


// ============================================================
// ESCAPE HTML
// ============================================================
function dashboardEscapeHTML(
    value
) {

    if (
        typeof window.escapeHTML ===
        "function"
    ) {

        return window.escapeHTML(
            value
        );
    }


    const text =
        String(
            value ?? ""
        );


    return text
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
```
