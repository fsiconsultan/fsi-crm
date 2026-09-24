
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
// RENDER RECENT LEADS
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


    if (
        !recent.length
    ) {

        container.innerHTML = `
<div class="empty-state">

<div class="empty-state-icon">
<i data-lucide="inbox"></i>
</div>

<h4>
No recent leads
</h4>

<p>
Belum ada data customer terbaru.
</p>

</div>
`;

        if (
            typeof window.refreshIcons === "function"
        ) {

            window.refreshIcons();
        }

        return;
    }


    container.innerHTML =
        recent.map(
            lead => {

                const name =
                    lead.customer_name ||
                    "Unnamed Customer";

                const status =
                    dashboardNormalizeStatus(
                        lead.status
                    ) ||
                    "New";

                const statusClass =
                    typeof window.getStatusClass === "function"
                        ? window.getStatusClass(
                            status
                        )
                        : "status-new";

                const date =
                    typeof window.formatDateTime === "function"
                        ? window.formatDateTime(
                            lead.created_at
                        )
                        : (
                            lead.created_at
                                ? new Date(
                                    lead.created_at
                                ).toLocaleString(
                                    "id-ID"
                                )
                                : "-"
                        );


                return `
<div class="activity-item">

<div class="activity-icon">
<i data-lucide="user-plus"></i>
</div>

<div class="activity-content">

<div class="activity-title">
${dashboardEscapeHTML(
    name
)}
</div>

<div class="activity-meta">

<span class="status-badge ${dashboardEscapeHTML(
    statusClass
)}">
${dashboardEscapeHTML(
    status
)}
</span>

<span>
${dashboardEscapeHTML(
    date
)}
</span>

</div>

</div>

</div>
`;
            }
        ).join("");


    if (
        typeof window.refreshIcons === "function"
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
        typeof window.escapeHTML === "function"
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
