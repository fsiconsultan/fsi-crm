/* =========================================================
   CRM FSI - CUSTOMER PROFILE
   Professional Customer Detail View
========================================================= */


/* =========================================================
   OPEN PROFILE
========================================================= */

function openCustomerProfile(id) {

    if (!id) return;

    window.location.href =
        `customer-profile.html?id=${encodeURIComponent(id)}`;
}


/* =========================================================
   INITIALIZE
========================================================= */

let customerProfileInitialized = false;

async function initializeCustomerProfilePage() {

    if (customerProfileInitialized) {
        return;
    }

    customerProfileInitialized = true;

    const params =
        new URLSearchParams(window.location.search);

    const id = params.get("id");

    if (!id) {

        renderProfileError(
            "Customer ID tidak ditemukan."
        );

        return;
    }

    await loadCustomerProfile(id);
}


/* =========================================================
   LOAD CUSTOMER
========================================================= */

async function loadCustomerProfile(id) {

    const container =
        $("customerProfileContent");

    if (!container) return;

    container.innerHTML = `
        <div class="profile-loading">
            <div class="profile-loading-spinner">
                <i class="fa-solid fa-spinner fa-spin"></i>
            </div>
            <strong>Loading customer profile...</strong>
            <span>Menyiapkan informasi customer.</span>
        </div>
    `;

    const {
        data,
        error
    } = await supabaseClient
        .from(CRM_CONFIG.leadTable)
        .select(`
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
        `)
        .eq("id", id)
        .single();

    if (error) {

        console.error(
            "Customer profile:",
            error
        );

        renderProfileError(
            error.message ||
            "Customer tidak ditemukan."
        );

        return;
    }

    if (!canViewCustomer(data)) {

        renderProfileError(
            "Anda tidak memiliki akses ke customer ini."
        );

        return;
    }

    renderCustomerProfile(data);
}


/* =========================================================
   ACCESS CONTROL
========================================================= */

function canViewCustomer(lead) {

    if (
        currentProfile?.role ===
        "Admin"
    ) {
        return true;
    }

    return String(
        lead.sales_id
    ) === String(
        currentProfile?.id
    );
}


/* =========================================================
   RENDER CUSTOMER PROFILE
========================================================= */

function renderCustomerProfile(lead) {

    const container =
        $("customerProfileContent");

    if (!container) return;

    const status =
        normalizeLeadStatus(
            lead.status
        );

    const statusClass =
        getProfileStatusClass(status);

    const salesName =
        getSalesName(
            lead.sales_id
        );

    const initials =
        getProfileInitials(
            lead.customer_name
        );

    const phoneDisplay =
        lead.phone || "-";

    const whatsappButton =
        lead.phone
            ? `
                <a
                    href="${whatsappLink(lead.phone)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="profile-action-btn whatsapp"
                >
                    <i class="fa-brands fa-whatsapp"></i>
                    <span>WhatsApp</span>
                </a>
            `
            : `
                <button
                    type="button"
                    class="profile-action-btn whatsapp disabled"
                    disabled
                >
                    <i class="fa-brands fa-whatsapp"></i>
                    <span>No Phone</span>
                </button>
            `;


    container.innerHTML = `

        <div class="customer-profile-workspace">


            <!-- =================================================
                 HERO CUSTOMER
            ================================================== -->

            <section class="customer-hero-card">

                <div class="customer-hero-main">

                    <div class="customer-avatar-large">

                        <span>
                            ${escapeHTML(initials)}
                        </span>

                    </div>


                    <div class="customer-hero-info">

                        <div class="customer-eyebrow">
                            CUSTOMER PROFILE
                        </div>

                        <h1>
                            ${escapeHTML(
                                lead.customer_name ||
                                "Unnamed Customer"
                            )}
                        </h1>

                        <div class="customer-meta-row">

                            <span>
                                <i class="fa-solid fa-building"></i>
                                ${escapeHTML(
                                    lead.business || "No business"
                                )}
                            </span>

                            <span>
                                <i class="fa-solid fa-location-dot"></i>
                                ${escapeHTML(
                                    lead.location || "No location"
                                )}
                            </span>

                            <span>
                                <i class="fa-solid fa-hashtag"></i>
                                ${escapeHTML(
                                    String(lead.id)
                                )}
                            </span>

                        </div>

                    </div>

                </div>


                <div class="customer-hero-actions">

                    <span
                        class="profile-status ${statusClass}"
                    >
                        <span class="status-dot"></span>
                        ${escapeHTML(status)}
                    </span>


                    ${whatsappButton}


                    <button
                        type="button"
                        class="profile-action-btn primary"
                        onclick="editLeadFromProfile('${escapeHTML(String(lead.id))}')"
                    >
                        <i class="fa-regular fa-pen-to-square"></i>
                        <span>Edit Customer</span>
                    </button>

                </div>

            </section>


            <!-- =================================================
                 QUICK CONTACT
            ================================================== -->

            <section class="profile-quick-grid">

                <div class="profile-quick-card">

                    <div class="profile-quick-icon blue">
                        <i class="fa-solid fa-phone"></i>
                    </div>

                    <div>
                        <span>Phone</span>

                        <strong>
                            ${escapeHTML(phoneDisplay)}
                        </strong>
                    </div>

                </div>


                <div class="profile-quick-card">

                    <div class="profile-quick-icon purple">
                        <i class="fa-solid fa-user-tie"></i>
                    </div>

                    <div>
                        <span>Assigned Sales</span>

                        <strong>
                            ${escapeHTML(salesName)}
                        </strong>
                    </div>

                </div>


                <div class="profile-quick-card">

                    <div class="profile-quick-icon green">
                        <i class="fa-solid fa-calendar-plus"></i>
                    </div>

                    <div>
                        <span>Created</span>

                        <strong>
                            ${escapeHTML(
                                formatProfileDate(
                                    lead.created_at
                                )
                            )}
                        </strong>
                    </div>

                </div>


                <div class="profile-quick-card">

                    <div class="profile-quick-icon orange">
                        <i class="fa-solid fa-chart-line"></i>
                    </div>

                    <div>
                        <span>Current Stage</span>

                        <strong>
                            ${escapeHTML(status)}
                        </strong>
                    </div>

                </div>

            </section>


            <!-- =================================================
                 MAIN GRID
            ================================================== -->

            <div class="profile-main-grid">


                <!-- =============================================
                     CUSTOMER INFORMATION
                ============================================== -->

                <section class="profile-modern-card">

                    <div class="profile-card-heading">

                        <div class="profile-heading-icon blue">
                            <i class="fa-solid fa-user"></i>
                        </div>

                        <div>
                            <h2>Customer Information</h2>
                            <p>Informasi dasar customer</p>
                        </div>

                    </div>


                    <div class="profile-details-grid">


                        <div class="profile-detail">

                            <span class="profile-detail-label">
                                Customer Name
                            </span>

                            <strong>
                                ${escapeHTML(
                                    lead.customer_name || "-"
                                )}
                            </strong>

                        </div>


                        <div class="profile-detail">

                            <span class="profile-detail-label">
                                Phone
                            </span>

                            <strong>
                                ${escapeHTML(
                                    lead.phone || "-"
                                )}
                            </strong>

                        </div>


                        <div class="profile-detail">

                            <span class="profile-detail-label">
                                Business
                            </span>

                            <strong>
                                ${escapeHTML(
                                    lead.business || "-"
                                )}
                            </strong>

                        </div>


                        <div class="profile-detail full">

                            <span class="profile-detail-label">
                                Location
                            </span>

                            <strong>
                                ${escapeHTML(
                                    lead.location || "-"
                                )}
                            </strong>

                        </div>


                        <div class="profile-detail">

                            <span class="profile-detail-label">
                                Assigned Sales
                            </span>

                            <strong>
                                ${escapeHTML(salesName)}
                            </strong>

                        </div>


                        <div class="profile-detail">

                            <span class="profile-detail-label">
                                Lead ID
                            </span>

                            <strong>
                                #${escapeHTML(
                                    String(lead.id)
                                )}
                            </strong>

                        </div>

                    </div>

                </section>


                <!-- =============================================
                     PIPELINE
                ============================================== -->

                <section class="profile-modern-card pipeline-card">

                    <div class="profile-card-heading">

                        <div class="profile-heading-icon green">
                            <i class="fa-solid fa-chart-line"></i>
                        </div>

                        <div>
                            <h2>Sales Pipeline</h2>
                            <p>Customer journey & progress</p>
                        </div>

                    </div>


                    <div class="profile-pipeline">

                        ${renderPipelineStep(
                            "Follow Up",
                            lead.follow_up_date,
                            "fa-solid fa-phone",
                            "orange"
                        )}

                        ${renderPipelineStep(
                            "Appointment",
                            lead.appointment,
                            "fa-solid fa-calendar-check",
                            "purple"
                        )}

                        ${renderPipelineStep(
                            "Site Survey",
                            lead.site_survey,
                            "fa-solid fa-location-crosshairs",
                            "blue"
                        )}

                        ${renderPipelineStep(
                            "Quotation",
                            lead.quotation,
                            "fa-solid fa-file-invoice-dollar",
                            "orange"
                        )}

                        ${renderPipelineStep(
                            "SPK",
                            lead.spk,
                            "fa-solid fa-file-signature",
                            "purple"
                        )}

                        ${renderPipelineStep(
                            "Closing",
                            lead.closing,
                            "fa-solid fa-circle-check",
                            "green"
                        )}

                    </div>

                </section>


                <!-- =============================================
                     NOTES
                ============================================== -->

                <section class="profile-modern-card notes-card">

                    <div class="profile-card-heading">

                        <div class="profile-heading-icon orange">
                            <i class="fa-regular fa-note-sticky"></i>
                        </div>

                        <div>
                            <h2>Customer Notes</h2>
                            <p>Catatan penting customer</p>
                        </div>

                    </div>


                    <div class="customer-notes-box">

                        ${
                            lead.notes
                                ? `
                                    <div class="notes-text">
                                        ${escapeHTML(
                                            lead.notes
                                        ).replace(
                                            /\n/g,
                                            "<br>"
                                        )}
                                    </div>
                                `
                                : `
                                    <div class="notes-empty">
                                        <div class="notes-empty-icon">
                                            <i class="fa-regular fa-note-sticky"></i>
                                        </div>

                                        <div>
                                            <strong>
                                                Belum ada catatan
                                            </strong>

                                            <span>
                                                Tambahkan catatan melalui Edit Customer.
                                            </span>
                                        </div>
                                    </div>
                                `
                        }

                    </div>

                </section>


                <!-- =============================================
                     RECORD INFORMATION
                ============================================== -->

                <section class="profile-modern-card record-card">

                    <div class="profile-card-heading">

                        <div class="profile-heading-icon gray">
                            <i class="fa-solid fa-database"></i>
                        </div>

                        <div>
                            <h2>Record Information</h2>
                            <p>Informasi sistem CRM</p>
                        </div>

                    </div>


                    <div class="record-grid">

                        <div>
                            <span>Lead ID</span>
                            <strong>
                                #${escapeHTML(
                                    String(lead.id)
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Created</span>
                            <strong>
                                ${escapeHTML(
                                    formatProfileDate(
                                        lead.created_at
                                    )
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>Sales</span>
                            <strong>
                                ${escapeHTML(salesName)}
                            </strong>
                        </div>

                        <div>
                            <span>Status</span>
                            <strong>
                                ${escapeHTML(status)}
                            </strong>
                        </div>

                    </div>

                </section>

            </div>


            <!-- =================================================
                 BOTTOM ACTION BAR
            ================================================== -->

            <div class="profile-bottom-actions">

                <button
                    type="button"
                    class="profile-bottom-btn secondary"
                    onclick="window.location.href='leads.html'"
                >
                    <i class="fa-solid fa-arrow-left"></i>
                    Back to Leads
                </button>


                <button
                    type="button"
                    class="profile-bottom-btn primary"
                    onclick="editLeadFromProfile('${escapeHTML(String(lead.id))}')"
                >
                    <i class="fa-regular fa-pen-to-square"></i>
                    Edit Customer
                </button>

            </div>

        </div>
    `;
}


/* =========================================================
   PIPELINE STEP
========================================================= */

function renderPipelineStep(
    title,
    date,
    icon,
    color
) {

    const completed =
        Boolean(date);

    return `

        <div
            class="pipeline-step ${completed ? "completed" : "pending"}"
        >

            <div class="pipeline-step-icon ${color}">

                <i class="${icon}"></i>

            </div>


            <div class="pipeline-step-info">

                <strong>
                    ${escapeHTML(title)}
                </strong>

                <span>
                    ${
                        completed
                            ? escapeHTML(
                                formatProfileDate(date)
                            )
                            : "Belum dilakukan"
                    }
                </span>

            </div>


            <div
                class="pipeline-step-status ${completed ? "done" : "waiting"}"
            >

                ${
                    completed
                        ? `
                            <i class="fa-solid fa-check"></i>
                          `
                        : `
                            <i class="fa-solid fa-minus"></i>
                          `
                }

            </div>

        </div>

    `;
}


/* =========================================================
   EDIT CUSTOMER
========================================================= */

function editLeadFromProfile(id) {

    if (!id) return;

    window.location.href =
        `customer-form.html?id=${encodeURIComponent(id)}`;
}


/* =========================================================
   ERROR
========================================================= */

function renderProfileError(message) {

    const container =
        $("customerProfileContent");

    if (!container) return;

    container.innerHTML = `

        <div class="profile-error-card">

            <div class="profile-error-icon">

                <i class="fa-solid fa-circle-exclamation"></i>

            </div>


            <h2>
                Customer Tidak Dapat Dibuka
            </h2>


            <p>
                ${escapeHTML(message)}
            </p>


            <div class="profile-error-actions">

                <button
                    type="button"
                    class="profile-bottom-btn secondary"
                    onclick="history.back()"
                >
                    <i class="fa-solid fa-arrow-left"></i>
                    Kembali
                </button>

                <button
                    type="button"
                    class="profile-bottom-btn primary"
                    onclick="window.location.href='leads.html'"
                >
                    <i class="fa-solid fa-users"></i>
                    Buka Leads
                </button>

            </div>

        </div>
    `;
}


/* =========================================================
   INITIALS
========================================================= */

function getProfileInitials(name) {

    if (!name) {
        return "NA";
    }

    const parts =
        String(name)
            .trim()
            .split(/\s+/)
            .filter(Boolean);

    if (parts.length === 1) {

        return parts[0]
            .substring(0, 2)
            .toUpperCase();
    }

    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();
}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatProfileDate(value) {

    if (!value) {
        return "-";
    }

    try {

        return new Intl.DateTimeFormat(
            "id-ID",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        ).format(
            new Date(value)
        );

    } catch {

        return value;
    }
}


/* =========================================================
   STATUS CLASS
========================================================= */

function getProfileStatusClass(status) {

    return "status-" +
        String(status)
            .toLowerCase()
            .replace(
                /[^a-z0-9]+/g,
                "-"
            )
            .replace(
                /^-|-$/g,
                ""
            );
}


/* =========================================================
   AUTO INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        if (
            document.getElementById(
                "customerProfileContent"
            )
        ) {

            setTimeout(
                () => {

                    if (
                        typeof initializeCustomerProfilePage ===
                        "function"
                    ) {

                        initializeCustomerProfilePage();

                    }

                },
                250
            );
        }
    }
);
