// ============================================================
// FSI CRM - DASHBOARD RECENT ACTIVITY
// ============================================================
// File : js/dashboard/dashboard-recent.js
//
// Fungsi:
// 1. Menampilkan Recent Activity
// 2. 1 activity = 1 row
// 3. Menampilkan Sales
// 4. Menampilkan waktu aktivitas
// 5. Support:
//    - New Customer
//    - First Contact
//    - Appointment
//    - Site Survey
//    - Quotation
//    - Deal / Closing
//    - No Deal
//
// IMPORTANT:
// - Tidak mengubah database.
// - Tidak mengubah struktur tabel.
// - Tetap support ID recent-leads.
// ============================================================


// ============================================================
// FIND RECENT ACTIVITY CONTAINER
// ============================================================

function dashboardFindRecentLeadsContainer() {

    const ids = [
        "recent-leads",
        "dashboard-activities",
        "recent-leads-container",
        "dashboard-recent-leads"
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
// ESCAPE HTML
// ============================================================

function dashboardRecentEscapeHTML(value) {

    if (
        typeof window.escapeHTML ===
        "function"
    ) {

        return window.escapeHTML(value);
    }

    const text =
        String(value ?? "");

    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ============================================================
// FORMAT ACTIVITY TIME
// ============================================================

function dashboardFormatActivityDate(value) {

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

    const now =
        new Date();

    const diffMs =
        now.getTime() -
        date.getTime();

    const diffMinutes =
        Math.floor(
            diffMs /
            60000
        );

    const diffHours =
        Math.floor(
            diffMinutes /
            60
        );

    const diffDays =
        Math.floor(
            diffHours /
            24
        );


    // --------------------------------------------------------
    // Future / invalid relative time
    // --------------------------------------------------------

    if (
        diffMinutes < 0
    ) {

        return date.toLocaleDateString(
            "id-ID",
            {
                day: "2-digit",
                month: "short"
            }
        );
    }


    // --------------------------------------------------------
    // TODAY
    // --------------------------------------------------------

    if (
        diffMinutes < 60
    ) {

        if (
            diffMinutes <= 1
        ) {

            return "Just now";
        }

        return (
            diffMinutes +
            " min ago"
        );
    }


    if (
        diffHours < 24 &&
        date.toDateString() ===
        now.toDateString()
    ) {

        return (
            diffHours +
            "h ago"
        );
    }


    // --------------------------------------------------------
    // YESTERDAY
    // --------------------------------------------------------

    const yesterday =
        new Date(now);

    yesterday.setDate(
        yesterday.getDate() - 1
    );

    if (
        date.toDateString() ===
        yesterday.toDateString()
    ) {

        return "Yesterday";
    }


    // --------------------------------------------------------
    // RECENT DAYS
    // --------------------------------------------------------

    if (
        diffDays < 7
    ) {

        return (
            diffDays +
            " days ago"
        );
    }


    // --------------------------------------------------------
    // OLDER
    // --------------------------------------------------------

    return date.toLocaleDateString(
        "id-ID",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


// ============================================================
// FORMAT EXACT TIME
// ============================================================

function dashboardFormatActivityClock(value) {

    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";
    }

    return date.toLocaleTimeString(
        "id-ID",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


// ============================================================
// GET SALES NAME
// ============================================================

function dashboardGetActivitySalesName(lead) {

    if (!lead) {
        return "Unassigned";
    }


    // --------------------------------------------------------
    // Direct fields
    // --------------------------------------------------------

    const directNames = [
        lead.sales_name,
        lead.sales,
        lead.sales_user_name,
        lead.sales_full_name,
        lead.assigned_sales_name
    ];


    for (
        const name
        of directNames
    ) {

        if (
            typeof name === "string" &&
            name.trim()
        ) {

            return name.trim();
        }
    }


    // --------------------------------------------------------
    // Object relation
    // --------------------------------------------------------

    if (
        lead.sales_users &&
        typeof lead.sales_users ===
        "object"
    ) {

        const relation =
            lead.sales_users;

        const relationName =
            relation.full_name ||
            relation.name ||
            relation.username ||
            relation.display_name;

        if (
            typeof relationName === "string" &&
            relationName.trim()
        ) {

            return relationName.trim();
        }
    }


    // --------------------------------------------------------
    // Global Sales data
    // --------------------------------------------------------

    const salesCollections = [
        window.salesUsersData,
        window.salesUsers,
        window.allSalesUsers,
        window.dashboardSalesUsers
    ];


    for (
        const collection
        of salesCollections
    ) {

        if (
            !Array.isArray(collection)
        ) {
            continue;
        }


        const sales =
            collection.find(
                item => {

                    if (!item) {
                        return false;
                    }

                    const itemId =
                        item.id ||
                        item.sales_id;

                    return String(itemId) ===
                        String(lead.sales_id);
                }
            );


        if (sales) {

            return (
                sales.full_name ||
                sales.name ||
                sales.username ||
                sales.display_name ||
                "Unassigned"
            );
        }
    }


    // --------------------------------------------------------
    // Fallback
    // --------------------------------------------------------

    if (
        lead.sales_id
    ) {

        return "Sales";
    }

    return "Unassigned";
}


// ============================================================
// NORMALIZE STATUS
// ============================================================

function dashboardRecentNormalizeStatus(
    status
) {

    if (
        typeof window.dashboardNormalizeStatus ===
        "function"
    ) {

        try {

            return window.dashboardNormalizeStatus(
                status
            );

        } catch (error) {

            console.warn(
                "FSI CRM: gagal normalize recent status:",
                error
            );
        }
    }

    return String(
        status || ""
    ).trim();
}


// ============================================================
// CHECK VALUE
// ============================================================

function dashboardRecentHasValue(value) {

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
// GET ACTIVITY FROM LEAD
// ============================================================
//
// Untuk Recent Activity kita menggunakan tanggal aktivitas
// apabila tersedia.
//
// Satu lead dapat menghasilkan beberapa activity.
// ============================================================

function dashboardGetLeadActivities(lead) {

    if (!lead) {
        return [];
    }

    const activities = [];

    const status =
        dashboardRecentNormalizeStatus(
            lead.status
        );


    // --------------------------------------------------------
    // NEW CUSTOMER
    // --------------------------------------------------------

    if (
        lead.created_at
    ) {

        activities.push({
            type: "New Customer",
            icon: "user-plus",
            date: lead.created_at,
            priority: 1
        });
    }


    // --------------------------------------------------------
    // FIRST CONTACT
    // --------------------------------------------------------

    const firstContactDate =
        lead.first_contact ||
        lead.first_contact_date ||
        lead.first_contact_at;

    if (
        dashboardRecentHasValue(
            firstContactDate
        )
    ) {

        activities.push({
            type: "First Contact",
            icon: "phone",
            date: firstContactDate,
            priority: 2
        });
    }


    // --------------------------------------------------------
    // APPOINTMENT
    // --------------------------------------------------------

    if (
        dashboardRecentHasValue(
            lead.appointment
        )
    ) {

        activities.push({
            type: "Appointment",
            icon: "calendar-check",
            date: lead.appointment,
            priority: 3
        });
    }


    // --------------------------------------------------------
    // SITE SURVEY
    // --------------------------------------------------------

    if (
        dashboardRecentHasValue(
            lead.site_survey
        )
    ) {

        activities.push({
            type: "Site Survey",
            icon: "map-pin",
            date: lead.site_survey,
            priority: 4
        });
    }


    // --------------------------------------------------------
    // QUOTATION
    // --------------------------------------------------------

    if (
        dashboardRecentHasValue(
            lead.quotation
        )
    ) {

        activities.push({
            type: "Quotation",
            icon: "file-text",
            date: lead.quotation,
            priority: 5
        });
    }


    // --------------------------------------------------------
    // DEAL / CLOSING
    // --------------------------------------------------------

    if (
        dashboardRecentHasValue(
            lead.closing
        ) ||
        status === "Deal" ||
        status === "Deal / Closing" ||
        status === "Closing" ||
        status === "SPK"
    ) {

        const dealDate =
            lead.closing ||
            lead.updated_at ||
            lead.created_at;

        activities.push({
            type: "Deal / Closing",
            icon: "handshake",
            date: dealDate,
            priority: 6
        });
    }


    // --------------------------------------------------------
    // NO DEAL
    // --------------------------------------------------------

    if (
        status === "No Deal" ||
        status === "Not Interested"
    ) {

        const noDealDate =
            lead.updated_at ||
            lead.created_at;

        activities.push({
            type: "No Deal",
            icon: "x-circle",
            date: noDealDate,
            priority: 7
        });
    }


    return activities;
}


// ============================================================
// GET ALL RECENT ACTIVITIES
// ============================================================

function dashboardBuildRecentActivities(
    leads
) {

    if (
        !Array.isArray(leads)
    ) {

        return [];
    }

    const activities = [];


    leads.forEach(
        lead => {

            const leadActivities =
                dashboardGetLeadActivities(
                    lead
                );


            leadActivities.forEach(
                activity => {

                    activities.push({

                        lead: lead,

                        customerName:
                            lead.customer_name ||
                            "Unnamed Customer",

                        salesName:
                            dashboardGetActivitySalesName(
                                lead
                            ),

                        type:
                            activity.type,

                        icon:
                            activity.icon,

                        date:
                            activity.date,

                        priority:
                            activity.priority
                    });
                }
            );
        }
    );


    // --------------------------------------------------------
    // SORT TERBARU
    // --------------------------------------------------------

    activities.sort(
        (
            a,
            b
        ) => {

            const dateA =
                new Date(
                    a.date || 0
                ).getTime();

            const dateB =
                new Date(
                    b.date || 0
                ).getTime();

            return dateB - dateA;
        }
    );


    return activities;
}


// ============================================================
// ACTIVITY CLASS
// ============================================================

function dashboardGetActivityClass(
    type
) {

    const map = {

        "New Customer":
            "activity-new",

        "First Contact":
            "activity-contact",

        "Appointment":
            "activity-appointment",

        "Site Survey":
            "activity-survey",

        "Quotation":
            "activity-quotation",

        "Deal / Closing":
            "activity-closing",

        "No Deal":
            "activity-no-deal"
    };

    return (
        map[type] ||
        "activity-default"
    );
}


// ============================================================
// RENDER RECENT ACTIVITY
// ============================================================

function renderDashboardRecentLeads(
    data
) {

    const container =
        dashboardFindRecentLeadsContainer();


    if (!container) {

        console.warn(
            "FSI CRM: Recent Activity container tidak ditemukan."
        );

        return;
    }


    const activities =
        dashboardBuildRecentActivities(
            data
        );


    // --------------------------------------------------------
    // EMPTY STATE
    // --------------------------------------------------------

    if (
        !activities.length
    ) {

        container.innerHTML =
            '<div class="empty-state">' +

            '<div class="empty-state-icon">' +
            '<i data-lucide="inbox"></i>' +
            '</div>' +

            '<h4>' +
            'No recent activity' +
            '</h4>' +

            '<p>' +
            'Belum ada aktivitas customer terbaru.' +
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
    // TAKE 8 ACTIVITIES
    // --------------------------------------------------------

    const recent =
        activities.slice(
            0,
            8
        );


    // --------------------------------------------------------
    // RENDER
    // --------------------------------------------------------

    container.innerHTML =
        recent.map(
            activity => {

                const activityClass =
                    dashboardGetActivityClass(
                        activity.type
                    );


                const timeLabel =
                    dashboardFormatActivityDate(
                        activity.date
                    );


                const clock =
                    dashboardFormatActivityClock(
                        activity.date
                    );


                return (

                    '<div class="activity-item dashboard-recent-activity-item ' +
                    dashboardRecentEscapeHTML(
                        activityClass
                    ) +
                    '">' +

                    // ------------------------------------------------
                    // ICON
                    // ------------------------------------------------

                    '<div class="activity-icon">' +

                    '<i data-lucide="' +
                    dashboardRecentEscapeHTML(
                        activity.icon
                    ) +
                    '"></i>' +

                    '</div>' +


                    // ------------------------------------------------
                    // CONTENT
                    // ------------------------------------------------

                    '<div class="activity-content">' +

                    '<div class="activity-title">' +

                    dashboardRecentEscapeHTML(
                        activity.salesName
                    ) +

                    '</div>' +


                    '<div class="activity-meta">' +

                    '<span class="recent-activity-type">' +

                    dashboardRecentEscapeHTML(
                        activity.type
                    ) +

                    '</span>' +

                    '<span class="recent-activity-separator">' +
                    "·" +
                    '</span>' +

                    '<span class="recent-activity-customer">' +

                    dashboardRecentEscapeHTML(
                        activity.customerName
                    ) +

                    '</span>' +

                    '</div>' +

                    '</div>' +


                    // ------------------------------------------------
                    // TIME
                    // ------------------------------------------------

                    '<div class="activity-time">' +

                    '<span class="activity-relative-time">' +
                    dashboardRecentEscapeHTML(
                        timeLabel
                    ) +
                    '</span>' +

                    (
                        clock
                            ? (
                                '<span class="activity-clock">' +
                                dashboardRecentEscapeHTML(
                                    clock
                                ) +
                                '</span>'
                            )
                            : ""
                    ) +

                    '</div>' +

                    '</div>'
                );
            }
        ).join("");


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
// LEGACY COMPATIBILITY
// ============================================================
//
// Beberapa bagian dashboard lama mungkin masih memanggil
// dashboardGetCustomerHistory().
//
// Kita pertahankan function tersebut agar tidak menyebabkan
// error JavaScript.
// ============================================================

function dashboardGetCustomerHistory(
    lead
) {

    const activities =
        dashboardGetLeadActivities(
            lead
        );

    return activities.map(
        activity => ({

            label:
                activity.type,

            date:
                activity.date,

            icon:
                activity.icon
        })
    );
}


// ============================================================
// GLOBAL EXPORTS
// ============================================================

window.dashboardFindRecentLeadsContainer =
    dashboardFindRecentLeadsContainer;

window.dashboardFormatActivityDate =
    dashboardFormatActivityDate;

window.dashboardFormatActivityClock =
    dashboardFormatActivityClock;

window.dashboardGetActivitySalesName =
    dashboardGetActivitySalesName;

window.dashboardGetLeadActivities =
    dashboardGetLeadActivities;

window.dashboardBuildRecentActivities =
    dashboardBuildRecentActivities;

window.renderDashboardRecentLeads =
    renderDashboardRecentLeads;

window.dashboardGetCustomerHistory =
    dashboardGetCustomerHistory;


// ============================================================
// FSIDashboard NAMESPACE
// ============================================================

window.FSIDashboard =
    window.FSIDashboard ||
    {};

window.FSIDashboard.recent = {

    findContainer:
        dashboardFindRecentLeadsContainer,

    getSalesName:
        dashboardGetActivitySalesName,

    getLeadActivities:
        dashboardGetLeadActivities,

    buildActivities:
        dashboardBuildRecentActivities,

    render:
        renderDashboardRecentLeads
};


// ============================================================
// CONSOLE
// ============================================================

console.log(
    "FSI CRM: dashboard-recent.js loaded."
);
