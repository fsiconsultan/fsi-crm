/* =========================================================
   CRM FSI - CUSTOMER PROFILE
========================================================= */


/* =========================================================
   OPEN PROFILE
========================================================= */

function openCustomerProfile(id){

    if(!id) return;


    window.location.href =
        `customer-profile.html?id=${encodeURIComponent(id)}`;

}


/* =========================================================
   INITIALIZE
========================================================= */

let customerProfileInitialized = false;


async function initializeCustomerProfilePage(){

    if(customerProfileInitialized){

        return;

    }


    customerProfileInitialized = true;


    const params =
        new URLSearchParams(
            window.location.search
        );


    const id =
        params.get("id");


    if(!id){

        renderProfileError(
            "Customer ID tidak ditemukan."
        );

        return;

    }


    await loadCustomerProfile(
        id
    );

}


/* =========================================================
   LOAD
========================================================= */

async function loadCustomerProfile(id){

    const container =
        $("customerProfileContent");


    if(!container) return;


    container.innerHTML = `
        <div class="profile-loading">
            <div class="loading-spinner"></div>
            <span>Loading customer profile...</span>
        </div>
    `;


    const {
        data,
        error
    } =
        await supabaseClient
            .from(
                CRM_CONFIG.leadTable
            )
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
            .eq(
                "id",
                id
            )
            .single();


    if(error){

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


    if(!canViewCustomer(data)){

        renderProfileError(
            "Anda tidak memiliki akses ke customer ini."
        );

        return;

    }


    renderCustomerProfile(
        data
    );

}


/* =========================================================
   ACCESS
========================================================= */

function canViewCustomer(lead){

    if(
        currentProfile?.role ===
        "Admin"
    ){

        return true;

    }


    return String(
        lead.sales_id
    ) === String(
        currentProfile?.id
    );

}


/* =========================================================
   RENDER
========================================================= */

function renderCustomerProfile(lead){

    const container =
        $("customerProfileContent");


    if(!container) return;


    const status =
        normalizeLeadStatus(
            lead.status
        );


    const statusClass =
        getProfileStatusClass(
            status
        );


    const salesName =
        getSalesName(
            lead.sales_id
        );


    const initials =
        getProfileInitials(
            lead.customer_name
        );


    container.innerHTML = `

        <div class="customer-profile-page">


            <!-- HERO -->

            <div class="profile-hero">

                <div class="profile-back">

                    <button
                        type="button"
                        class="profile-back-btn"
                        onclick="history.back()"
                    >
                        <i class="fa-solid fa-arrow-left"></i>
                        Back
                    </button>

                </div>


                <div class="profile-main">

                    <div class="profile-avatar-large">
                        ${escapeHTML(initials)}
                    </div>


                    <div class="profile-identity">

                        <div class="profile-breadcrumb">
                            CRM
                            <i class="fa-solid fa-chevron-right"></i>
                            Customer Profile
                        </div>


                        <h1>
                            ${escapeHTML(
                                lead.customer_name ||
                                "Unnamed Customer"
                            )}
                        </h1>


                        <div class="profile-subline">

                            <span>
                                <i class="fa-solid fa-location-dot"></i>
                                ${escapeHTML(
                                    lead.location || "-"
                                )}
                            </span>


                            <span>
                                <i class="fa-solid fa-building"></i>
                                ${escapeHTML(
                                    lead.business || "-"
                                )}
                            </span>


                            <span>
                                Lead #${escapeHTML(lead.id)}
                            </span>

                        </div>

                    </div>


                    <div class="profile-hero-actions">

                        <span class="status-pill ${statusClass}">
                            ${escapeHTML(status)}
                        </span>


                        ${
                            lead.phone
                            ?
                            `
                            <a
                                href="${whatsappLink(lead.phone)}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="profile-whatsapp"
                            >
                                <i class="fa-brands fa-whatsapp"></i>
                                WhatsApp
                            </a>
                            `
                            :
                            ""
                        }


                        <button
                            type="button"
                            class="profile-edit-btn"
                            onclick="editLeadFromProfile('${escapeHTML(lead.id)}')"
                        >
                            <i class="fa-regular fa-pen-to-square"></i>
                            Edit
                        </button>

                    </div>

                </div>

            </div>


            <!-- BODY -->

            <div class="profile-grid">


                <!-- CUSTOMER INFO -->

                <section class="profile-card">

                    <div class="profile-card-header">

                        <div>

                            <h2>
                                Customer Information
                            </h2>

                            <span>
                                Basic customer details
                            </span>

                        </div>

                        <div class="profile-card-icon blue">
                            <i class="fa-solid fa-user"></i>
                        </div>

                    </div>


                    <div class="profile-info-grid">


                        <div class="profile-info-item">

                            <span>
                                Customer
                            </span>

                            <strong>
                                ${escapeHTML(
                                    lead.customer_name || "-"
                                )}
                            </strong>

                        </div>


                        <div class="profile-info-item">

                            <span>
                                Phone
                            </span>

                            <strong>
                                ${escapeHTML(
                                    lead.phone || "-"
                                )}
                            </strong>

                        </div>


                        <div class="profile-info-item">

                            <span>
                                Business
                            </span>

                            <strong>
                                ${escapeHTML(
                                    lead.business || "-"
                                )}
                            </strong>

                        </div>


                        <div class="profile-info-item">

                            <span>
                                Location
                            </span>

                            <strong>
                                ${escapeHTML(
                                    lead.location || "-"
                                )}
                            </strong>

                        </div>


                        <div class="profile-info-item">

                            <span>
                                Assigned Sales
                            </span>

                            <strong>
                                ${escapeHTML(
                                    salesName
                                )}
                            </strong>

                        </div>


                        <div class="profile-info-item">

                            <span>
                                Created
                            </span>

                            <strong>
                                ${escapeHTML(
                                    formatProfileDate(
                                        lead.created_at
                                    )
                                )}
                            </strong>

                        </div>

                    </div>

                </section>


                <!-- PIPELINE -->

                <section class="profile-card">

                    <div class="profile-card-header">

                        <div>

                            <h2>
                                Sales Pipeline
                            </h2>

                            <span>
                                Customer journey
                            </span>

                        </div>

                        <div class="profile-card-icon green">
                            <i class="fa-solid fa-chart-line"></i>
                        </div>

                    </div>


                    <div class="profile-timeline">

                        ${renderTimelineItem(
                            "Follow Up",
                            lead.follow_up_date,
                            "fa-solid fa-phone",
                            "orange"
                        )}

                        ${renderTimelineItem(
                            "Appointment",
                            lead.appointment,
                            "fa-solid fa-calendar-check",
                            "purple"
                        )}

                        ${renderTimelineItem(
                            "Site Survey",
                            lead.site_survey,
                            "fa-solid fa-location-crosshairs",
                            "blue"
                        )}

                        ${renderTimelineItem(
                            "Quotation",
                            lead.quotation,
                            "fa-solid fa-file-invoice-dollar",
                            "orange"
                        )}

                        ${renderTimelineItem(
                            "SPK",
                            lead.spk,
                            "fa-solid fa-file-signature",
                            "purple"
                        )}

                        ${renderTimelineItem(
                            "Closing",
                            lead.closing,
                            "fa-solid fa-circle-check",
                            "green"
                        )}

                    </div>

                </section>


                <!-- NOTES -->

                <section class="profile-card profile-card-wide">

                    <div class="profile-card-header">

                        <div>

                            <h2>
                                Customer Notes
                            </h2>

                            <span>
                                Sales notes and important information
                            </span>

                        </div>

                        <div class="profile-card-icon orange">
                            <i class="fa-regular fa-note-sticky"></i>
                        </div>

                    </div>


                    <div class="profile-notes">

                        ${
                            lead.notes
                            ?
                            escapeHTML(
                                lead.notes
                            ).replace(
                                /\n/g,
                                "<br>"
                            )
                            :
                            `
                            <div class="profile-no-notes">
                                <i class="fa-regular fa-note-sticky"></i>
                                <span>
                                    Belum ada catatan.
                                </span>
                            </div>
                            `
                        }

                    </div>

                </section>


                <!-- SYSTEM -->

                <section class="profile-card profile-card-wide">

                    <div class="profile-card-header">

                        <div>

                            <h2>
                                System Information
                            </h2>

                            <span>
                                CRM record information
                            </span>

                        </div>

                        <div class="profile-card-icon gray">
                            <i class="fa-solid fa-database"></i>
                        </div>

                    </div>


                    <div class="profile-system-grid">

                        <div>
                            <span>Lead ID</span>
                            <strong>#${escapeHTML(lead.id)}</strong>
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
                            <span>Current Status</span>
                            <strong>
                                ${escapeHTML(status)}
                            </strong>
                        </div>

                    </div>

                </section>


            </div>

        </div>

    `;

}


/* =========================================================
   TIMELINE
========================================================= */

function renderTimelineItem(
    title,
    date,
    icon,
    color
){

    const completed =
        Boolean(date);


    return `

        <div class="
            profile-timeline-item
            ${completed ? "completed" : ""}
        ">

            <div class="
                timeline-icon
                ${color}
            ">

                <i class="${icon}"></i>

            </div>


            <div class="timeline-content">

                <strong>
                    ${escapeHTML(title)}
                </strong>

                <span>
                    ${
                        date
                        ?
                        escapeHTML(
                            formatProfileDate(date)
                        )
                        :
                        "Belum dilakukan"
                    }
                </span>

            </div>


            <div class="timeline-check">

                ${
                    completed
                    ?
                    `
                    <i class="fa-solid fa-check"></i>
                    `
                    :
                    `
                    <i class="fa-solid fa-minus"></i>
                    `
                }

            </div>

        </div>

    `;

}


/* =========================================================
   EDIT FROM PROFILE
========================================================= */

function editLeadFromProfile(id){

    window.location.href =
        `leads.html?edit=${encodeURIComponent(id)}`;

}


/* =========================================================
   ERROR
========================================================= */

function renderProfileError(message){

    const container =
        $("customerProfileContent");


    if(!container) return;


    container.innerHTML = `

        <div class="profile-error">

            <div class="profile-error-icon">

                <i class="fa-solid fa-circle-exclamation"></i>

            </div>


            <h2>
                Customer Tidak Dapat Dibuka
            </h2>


            <p>
                ${escapeHTML(message)}
            </p>


            <button
                type="button"
                class="btn btn-primary"
                onclick="history.back()"
            >
                <i class="fa-solid fa-arrow-left"></i>
                Kembali
            </button>

        </div>

    `;

}


/* =========================================================
   HELPERS
========================================================= */

function getProfileInitials(name){

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
            .substring(0,2)
            .toUpperCase();

    }


    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();

}


function formatProfileDate(value){

    if(!value){

        return "-";

    }


    try{

        return new Intl.DateTimeFormat(
            "id-ID",
            {
                day:"2-digit",
                month:"long",
                year:"numeric"
            }
        ).format(
            new Date(value)
        );

    }
    catch{

        return value;

    }

}


function getProfileStatusClass(
    status
){

    return "status-" +
        String(status)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g,"-")
            .replace(/^-|-$/g,"");

}


/* =========================================================
   AUTO INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        if(
            document.getElementById(
                "customerProfileContent"
            )
        ){

            setTimeout(() => {

                if(
                    typeof initializeCustomerProfilePage ===
                    "function"
                ){

                    initializeCustomerProfilePage();

                }

            }, 250);

        }

    }
);
