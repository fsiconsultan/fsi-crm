// RENDER LEADS TABLE
// ========================================================
function renderLeads(
    data
) {

    const table =
        leadElement(
            "leads-table-body",
            "leadsTable"
        );

    if (!table) {

        console.warn(
            "FSI CRM: leads table body not found."
        );

        return;
    }

    table.innerHTML =
        "";

    const leads =
        Array.isArray(data)
            ? data
            : [];

    if (
        leads.length === 0
    ) {

        renderEmptyLeadsState();

        return;
    }

    // ====================================================
    // STATUS DATE HELPER
    // ====================================================

    function getInputDate(
        value
    ) {

        if (!value) {
            return "-";
        }

        const raw =
            String(value)
                .trim();

        if (!raw) {
            return "-";
        }

        // ------------------------------------------------
        // Jika value berupa YYYY-MM-DD
        // gunakan langsung agar tidak terkena
        // masalah timezone.
        // ------------------------------------------------

        const dateOnlyMatch =
            raw.match(
                /^(\d{4})-(\d{2})-(\d{2})/
            );

        if (
            dateOnlyMatch
        ) {

            const year =
                dateOnlyMatch[1];

            const month =
                dateOnlyMatch[2];

            const day =
                dateOnlyMatch[3];

            return `${day}/${month}/${year}`;
        }

        // ------------------------------------------------
        // Fallback untuk timestamp
        // ------------------------------------------------

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "-";
        }

        const day =
            String(
                date.getDate()
            ).padStart(
                2,
                "0"
            );

        const month =
            String(
                date.getMonth() + 1
            ).padStart(
                2,
                "0"
            );

        const year =
            date.getFullYear();

        return `${day}/${month}/${year}`;
    }

    // ====================================================
    // DAYS HELPER
    // ====================================================

    function getStatusDays(
        value
    ) {

        if (!value) {
            return "-";
        }

        const raw =
            String(value)
                .trim();

        if (!raw) {
            return "-";
        }

        let startDate;

        // ------------------------------------------------
        // Untuk YYYY-MM-DD, buat tanggal lokal.
        // Ini mencegah tanggal mundur 1 hari akibat UTC.
        // ------------------------------------------------

        const dateOnlyMatch =
            raw.match(
                /^(\d{4})-(\d{2})-(\d{2})/
            );

        if (
            dateOnlyMatch
        ) {

            startDate =
                new Date(
                    Number(
                        dateOnlyMatch[1]
                    ),
                    Number(
                        dateOnlyMatch[2]
                    ) - 1,
                    Number(
                        dateOnlyMatch[3]
                    )
                );

        } else {

            startDate =
                new Date(value);

            if (
                Number.isNaN(
                    startDate.getTime()
                )
            ) {

                return "-";
            }

            // ------------------------------------------------
            // Gunakan tanggal kalender lokal saja.
            // ------------------------------------------------

            startDate =
                new Date(
                    startDate.getFullYear(),
                    startDate.getMonth(),
                    startDate.getDate()
                );
        }

        const now =
            new Date();

        const today =
            new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate()
            );

        const difference =
            today.getTime()
            -
            startDate.getTime();

        const days =
            Math.floor(
                difference /
                (
                    1000 *
                    60 *
                    60 *
                    24
                )
            );

        // ------------------------------------------------
        // Jika tanggal berada di masa depan,
        // jangan tampilkan angka negatif.
        // ------------------------------------------------

        if (
            days < 0
        ) {

            return "0";
        }

        return String(
            days
        );
    }

    // ====================================================
    // RENDER EACH LEAD
    // ====================================================

    leads.forEach(
        lead => {

            const tr =
                document.createElement(
                    "tr"
                );

            // =================================================
            // SALES
            // =================================================
            // Penting:
            // Sales selalu diambil berdasarkan sales_id
            // milik LEAD yang sedang dirender.
            // Tidak menggunakan index array.
            // =================================================

            const salesName =
                typeof window.getSalesName ===
                "function"
                    ? window.getSalesName(
                        lead.sales_id
                    )
                    : "-";

            // =================================================
            // STATUS
            // =================================================

            const displayStatus =
                typeof window.normalizeLeadStatus ===
                "function"
                    ? window.normalizeLeadStatus(
                        lead.status
                    )
                    : (
                        lead.status ||
                        "New"
                    );

            const statusCSS =
                typeof window.getStatusClass ===
                "function"
                    ? window.getStatusClass(
                        displayStatus
                    )
                    : (
                        typeof window.statusClass ===
                        "function"
                            ? window.statusClass(
                                displayStatus
                            )
                            : "status-new"
                    );

            // =================================================
            // BASIC DATA
            // =================================================

            const customerName =
                leadGetValue(
                    lead.customer_name
                );

            const phone =
                leadGetValue(
                    lead.phone
                );

            const email =
                leadGetValue(
                    lead.email
                );

            const business =
                leadGetValue(
                    lead.business
                );

            const note =
                leadGetValue(
                    lead.notes
                );

            // =================================================
            // INPUT DATE
            // =================================================

            const statusStartedAt =
                lead.status_started_at ||
                null;

            const inputDateHTML =
                statusStartedAt
                    ? getInputDate(
                        statusStartedAt
                    )
                    : "-";

            // =================================================
            // DAYS
            // =================================================

            const statusDays =
                statusStartedAt
                    ? getStatusDays(
                        statusStartedAt
                    )
                    : "-";

            // =================================================
            // ESCAPED VALUES
            // =================================================

            const escapedCustomer =
                leadEscapeHTML(
                    customerName
                );

            const escapedPhone =
                leadEscapeHTML(
                    phone
                );

            const escapedEmail =
                leadEscapeHTML(
                    email
                );

            const escapedBusiness =
                leadEscapeHTML(
                    business
                );

            const escapedSales =
                leadEscapeHTML(
                    salesName || "-"
                );

            const safeStatus =
                leadEscapeHTML(
                    displayStatus
                );

            // =================================================
            // LAST FOLLOW UP
            // =================================================

            const lastFollowUpHTML =
                leadGetLastFollowUpHTML(
                    lead.last_follow_up
                );

            // =================================================
            // PROGRESS PLTS
            // =================================================

            const progressHTML =
                leadGetProgressHTML(
                    lead
                );

            // =================================================
            // NOTE
            // =================================================

            const noteHTML =
                note
                    ? `
<div
    class="lead-note-cell"
    title="${leadEscapeHTML(note)}"
>
    <i data-lucide="sticky-note"></i>

    <span>
        ${leadEscapeHTML(
            leadTruncateText(
                note,
                100
            )
        )}
    </span>
</div>
`
                    : `
<div class="lead-note-empty">
    <i data-lucide="sticky-note"></i>
    Belum ada catatan
</div>
`;

            // =================================================
            // WHATSAPP
            // =================================================

            let whatsappHTML =
                "-";

            if (
                phone
            ) {

                const waURL =
                    typeof window.whatsappLink ===
                    "function"
                        ? window.whatsappLink(
                            phone
                        )
                        : "#";

                if (
                    waURL &&
                    waURL !== "#"
                ) {

                    whatsappHTML = `
<a
    href="${leadEscapeHTML(waURL)}"
    target="_blank"
    rel="noopener noreferrer"
    class="wa-link"
    title="Open WhatsApp"
>
    ${escapedPhone}
</a>
`;

                } else {

                    whatsappHTML =
                        escapedPhone;
                }
            }

            // =================================================
            // CUSTOMER ID
            // =================================================

            const leadId =
                String(
                    lead.id ?? ""
                ).trim();

            tr.dataset.leadId =
                leadId;

            // =================================================
            // ROW
            // =================================================
            // URUTAN HARUS SAMA DENGAN TABLE HEADER:
            //
            // Customer
            // WhatsApp
            // Email
            // Business
            // Sales
            // Status
            // Input Date
            // Days
            // Progress
            // Note
            // Actions
            // =================================================

            tr.innerHTML = `

<!-- =========================================
CUSTOMER
========================================= -->
<td>

    <div class="lead-customer-cell">

        <button
            type="button"
            class="lead-name-btn"
            data-action="profile"
            data-lead-id="${leadEscapeHTML(leadId)}"
            title="Open customer profile"
        >
            ${escapedCustomer || "-"}
        </button>

    </div>

</td>


<!-- =========================================
WHATSAPP
========================================= -->
<td>

    ${whatsappHTML}

</td>


<!-- =========================================
EMAIL
========================================= -->
<td>

    ${
        escapedEmail
            ? `
<a
    href="mailto:${escapedEmail}"
    class="lead-email-link"
    title="${escapedEmail}"
>
    ${escapedEmail}
</a>
`
            : "-"
    }

</td>


<!-- =========================================
BUSINESS
========================================= -->
<td>

    ${escapedBusiness || "-"}

</td>


<!-- =========================================
SALES
========================================= -->
<td>

    <div class="lead-sales-cell">

        <span class="lead-sales-name">
            ${escapedSales || "-"}
        </span>

    </div>

</td>


<!-- =========================================
STATUS
========================================= -->
<td>

    <div class="lead-status-wrapper">

        <span
            class="status-badge ${leadEscapeHTML(statusCSS)}"
        >
            ${safeStatus}
        </span>

        ${
            lead.last_follow_up
                ? `
<div class="lead-status-update">

    <i data-lucide="clock-3"></i>

    <span>
        ${leadEscapeHTML(
            leadFormatDateTime(
                lead.last_follow_up
            )
        )}
    </span>

</div>
`
                : ""
        }

    </div>

</td>


<!-- =========================================
INPUT DATE
========================================= -->
<td>

    <span class="lead-input-date">

        ${leadEscapeHTML(
            inputDateHTML
        )}

    </span>

</td>


<!-- =========================================
DAYS
========================================= -->
<td>

    <span
        class="lead-days"
        title="Days since Input Date"
    >
        ${leadEscapeHTML(
            statusDays
        )}
    </span>

</td>


<!-- =========================================
PROGRESS
========================================= -->
<td>

    <div class="lead-progress-wrapper">

        ${progressHTML}

    </div>

</td>


<!-- =========================================
NOTE
========================================= -->
<td>

    ${noteHTML}

</td>


<!-- =========================================
ACTIONS
========================================= -->
<td>

    <div class="crm-lead-actions">

        <!-- PROFILE -->

        <button
            type="button"
            class="primary-btn small-btn"
            data-action="profile"
            data-lead-id="${leadEscapeHTML(leadId)}"
            title="Open customer profile"
        >

            <i data-lucide="user-round"></i>

            Profile

        </button>


        <!-- EDIT -->

        <button
            type="button"
            class="secondary-btn small-btn"
            data-action="edit"
            data-lead-id="${leadEscapeHTML(leadId)}"
            title="Edit customer"
        >

            <i data-lucide="pencil"></i>

            Edit

        </button>


        <!-- DELETE -->

        <button
            type="button"
            class="secondary-btn small-btn"
            data-action="delete"
            data-lead-id="${leadEscapeHTML(leadId)}"
            title="Delete customer"
        >

            <i data-lucide="trash-2"></i>

            Delete

        </button>

    </div>

</td>

`;

            // =================================================
            // APPEND ROW
            // =================================================

            table.appendChild(
                tr
            );
        }
    );

    // ========================================================
    // REFRESH ICONS
    // ========================================================

    if (
        typeof window.refreshIcons ===
        "function"
    ) {

        window.refreshIcons();

    }

}
// ========================================================
