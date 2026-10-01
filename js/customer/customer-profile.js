// ============================================================
// FSI CRM - CUSTOMER PROFILE
// File: js/customer/customer-profile.js
// ============================================================
//
// Fungsi:
// 1. Menampilkan Customer Profile
// 2. Mengambil data customer dari tabel "leads"
// 3. Mengambil nama Sales dari tabel "sales_users"
// 4. Menampilkan Input Date
// 5. Menghitung selisih Input Date berdasarkan TANGGAL KALENDER
// 6. Menampilkan Email Customer
// 7. Email Customer menggunakan mailto:
// 8. Tidak menangani Add Customer
// 9. Tidak menangani Edit Customer
//
// STATUS SYSTEM:
// 1. New
// 2. First Contact
// 3. First Meeting / Appointment / Site Survey
// 4. Quotation
// 5. Second Appointment
// 6. Deal
// 7. No Deal
//
// DETAIL / ACTIVITY:
// - Follow Up
// - Last Follow Up
// - Appointment
// - Site Survey
// - Quotation
// - Closing
// - Notes
//
// INPUT DATE:
// Menggunakan field:
//     status_started_at
//
// Days Since Input:
// Menggunakan perhitungan tanggal kalender yang sama
// dengan sistem Leads.
//
// SPK SUDAH DIHAPUS DARI CUSTOMER PROFILE.
//
// Add / Edit Customer ditangani oleh:
//     js/customer-form.js
//
// Daftar Leads ditangani oleh:
//     js/leads.js
//
// ============================================================

(function () {

    "use strict";


    // ========================================================
    // STATE
    // ========================================================

    let currentCustomerId = null;
    let profileLoading = false;


    // ========================================================
    // DOM HELPER
    // ========================================================

    function shelterElement() {

        for (let i = 0; i < arguments.length; i++) {

            const id = arguments[i];

            if (!id) continue;

            const element =
                document.getElementById(id);

            if (element) {
                return element;
            }

        }

        return null;
    }


    // ========================================================
    // SUPABASE HELPER
    // ========================================================

    function getSupabaseClient() {

        if (
            window.supabaseClient &&
            typeof window.supabaseClient.from === "function"
        ) {
            return window.supabaseClient;
        }


        if (
            window.supabase &&
            typeof window.supabase.from === "function"
        ) {
            return window.supabase;
        }


        console.error(
            "FSI CRM: Supabase client is not available."
        );

        return null;
    }


    // ========================================================
    // HTML ESCAPE
    // ========================================================

    function escapeHTML(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    // ========================================================
    // TEXT HELPER
    // ========================================================

    function displayValue(value, fallback) {

        const text =
            value === null ||
            value === undefined
                ? ""
                : String(value).trim();

        if (!text) {
            return fallback || "—";
        }

        return text;
    }


    // ========================================================
    // EMAIL HELPER
    // ========================================================

    function createEmailLink(email) {

        const safeEmail =
            String(email || "").trim();


        if (!safeEmail) {

            return `
                <span class="customer-email-empty">
                    —
                </span>
            `;

        }


        const mailto =
            `mailto:${encodeURIComponent(
                safeEmail
            )}`;


        return `
            <a
                href="${mailto}"
                class="customer-email-link"
                title="Send email to ${escapeHTML(
                    safeEmail
                )}"
            >
                <i
                    data-lucide="mail"
                    aria-hidden="true"
                ></i>

                <span>
                    ${escapeHTML(
                        safeEmail
                    )}
                </span>
            </a>
        `;
    }


    // ========================================================
    // DATE PARSER
    // ========================================================

    function parseCalendarDate(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return null;
        }


        const raw =
            String(value).trim();


        if (!raw) {
            return null;
        }


        const match =
            raw.match(
                /^(\d{4})-(\d{2})-(\d{2})/
            );


        if (match) {

            const year =
                Number(match[1]);

            const month =
                Number(match[2]);

            const day =
                Number(match[3]);


            const date =
                new Date(
                    year,
                    month - 1,
                    day
                );


            if (
                date.getFullYear() === year &&
                date.getMonth() === month - 1 &&
                date.getDate() === day
            ) {

                return date;

            }

        }


        const fallback =
            new Date(raw);


        if (
            !Number.isNaN(
                fallback.getTime()
            )
        ) {

            return new Date(
                fallback.getFullYear(),
                fallback.getMonth(),
                fallback.getDate()
            );

        }


        return null;
    }


    // ========================================================
    // START OF DAY
    // ========================================================

    function startOfCalendarDay(date) {

        return new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        );
    }


    // ========================================================
    // DATE DIFFERENCE
    // ========================================================

    function getCalendarDayDifference(
        startDate,
        today
    ) {

        const start =
            startOfCalendarDay(
                startDate
            );

        const todayDate =
            startOfCalendarDay(
                today
            );


        const millisecondsPerDay =
            24 * 60 * 60 * 1000;


        return Math.round(
            (
                todayDate.getTime() -
                start.getTime()
            ) /
            millisecondsPerDay
        );
    }


    // ========================================================
    // INPUT DATE CALCULATION
    // ========================================================

    function getInputDateInfo(
        inputDateValue
    ) {

        const inputDate =
            parseCalendarDate(
                inputDateValue
            );


        if (!inputDate) {

            return {
                exists: false,
                date: null,
                days: null,
                label: "—",
                subtitle: "No input date",
                detail:
                    "No input date has been set."
            };

        }


        const today =
            new Date();


        const difference =
            getCalendarDayDifference(
                inputDate,
                today
            );


        const safeDays =
            Math.max(
                0,
                difference
            );


        let daysLabel;


        if (safeDays === 0) {

            daysLabel =
                "0 days";

        } else if (safeDays === 1) {

            daysLabel =
                "1 day";

        } else {

            daysLabel =
                `${safeDays} days`;

        }


        return {

            exists: true,

            date:
                inputDate,

            days:
                safeDays,

            label:
                daysLabel,

            subtitle:
                "SINCE INPUT",

            detail:
                `Customer created ${formatDate(
                    inputDateValue
                )}`

        };
    }


    // ========================================================
    // FORMAT DATE
    // ========================================================

    function formatDate(value) {

        const date =
            parseCalendarDate(value);


        if (!date) {
            return "—";
        }


        return new Intl.DateTimeFormat(
            "id-ID",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        ).format(date);
    }


    // ========================================================
    // FORMAT DATETIME
    // ========================================================

    function formatDateTime(value) {

        if (
            value === null ||
            value === undefined ||
            String(value).trim() === ""
        ) {
            return "—";
        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return displayValue(
                value,
                "—"
            );

        }


        return new Intl.DateTimeFormat(
            "id-ID",
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        ).format(date);
    }


    // ========================================================
    // FOLLOW UP CALCULATION
    // ========================================================

    function getFollowUpInfo(
        followUpValue
    ) {

        const followUpDate =
            parseCalendarDate(
                followUpValue
            );


        if (!followUpDate) {

            return {
                exists: false,
                label: "No follow-up date",
                detail:
                    "No follow-up date has been set.",
                className:
                    "followup-none",
                days: null
            };

        }


        const today =
            new Date();


        const difference =
            getCalendarDayDifference(
                followUpDate,
                today
            );


        if (difference === 0) {

            return {
                exists: true,
                label: "Today",
                detail:
                    "Follow-up is due today.",
                className:
                    "followup-today",
                days: 0
            };

        }


        if (difference > 0) {

            return {
                exists: true,
                label:
                    difference === 1
                        ? "1 day overdue"
                        : `${difference} days overdue`,
                detail:
                    `Follow-up date was ${difference} ` +
                    `${difference === 1 ? "day" : "days"} ago.`,
                className:
                    "followup-overdue",
                days: difference
            };

        }


        const daysUntil =
            Math.abs(difference);


        return {
            exists: true,
            label:
                daysUntil === 1
                    ? "In 1 day"
                    : `In ${daysUntil} days`,
            detail:
                `Follow-up is scheduled in ${daysUntil} ` +
                `${daysUntil === 1 ? "day" : "days"}.`,
            className:
                "followup-upcoming",
            days: difference
        };
    }


    // ========================================================
    // STATUS NORMALIZATION
    // ========================================================

    function normalizeStatus(status) {

        const rawStatus =
            String(status || "New").trim();


        if (
            typeof window.normalizeLeadStatus ===
            "function"
        ) {

            return window.normalizeLeadStatus(
                rawStatus || "New"
            );

        }


        return rawStatus || "New";
    }


    // ========================================================
    // STATUS CLASS
    // ========================================================

    function getStatusClass(status) {

        const normalized =
            normalizeStatus(status)
                .toLowerCase();


        const map = {

            "new":
                "status-new",

            "first contact":
                "status-first-contact",

            "first meeting / appointment / site survey":
                "status-first-meeting",

            "quotation":
                "status-quotation",

            "second appointment":
                "status-second-appointment",

            "deal":
                "status-deal",

            "no deal":
                "status-no-deal"

        };


        return (
            map[normalized] ||
            "status-default"
        );
    }


    // ========================================================
    // PROFILE CONTAINER
    // ========================================================

    function getProfileContainer() {

        return shelterElement(
            "customer-profile-container"
        );
    }


    // ========================================================
    // SHOW PROFILE LOADING
    // ========================================================

    function showProfileLoading() {

        const container =
            getProfileContainer();


        if (!container) {
            return;
        }


        container.innerHTML = `

            <div class="customer-profile-loading">

                <div class="profile-loading-icon">
                    <i data-lucide="loader-circle"></i>
                </div>

                <h3>
                    Loading Customer Profile
                </h3>

                <p>
                    Please wait while customer data is loaded.
                </p>

            </div>

        `;


        refreshIcons();
    }


    // ========================================================
    // SHOW PROFILE EMPTY
    // ========================================================

    function showProfileEmpty(message) {

        const container =
            getProfileContainer();


        if (!container) {
            return;
        }


        container.innerHTML = `

            <div class="empty-state customer-profile-empty">

                <i
                    data-lucide="contact"
                    aria-hidden="true"
                ></i>

                <span>
                    ${escapeHTML(
                        message ||
                        "Select a customer to view the profile."
                    )}
                </span>

            </div>

        `;


        refreshIcons();
    }


    // ========================================================
    // SHOW PROFILE ERROR
    // ========================================================

    function showProfileError(message) {

        const container =
            getProfileContainer();


        if (!container) {
            return;
        }


        container.innerHTML = `

            <div class="empty-state customer-profile-error">

                <i
                    data-lucide="circle-alert"
                    aria-hidden="true"
                ></i>

                <strong>
                    Unable to load customer
                </strong>

                <span>
                    ${escapeHTML(
                        message ||
                        "Customer profile could not be loaded."
                    )}
                </span>

                <button
                    type="button"
                    class="secondary-btn small-btn"
                    data-shelter-action="back"
                >
                    <i data-lucide="arrow-left"></i>
                    Back to Leads
                </button>

            </div>

        `;


        refreshIcons();
    }


    // ========================================================
    // RENDER PROFILE
    // ========================================================

    function renderCustomerProfile(
        customer,
        sales
    ) {

        const container =
            getProfileContainer();


        if (!container) {

            console.warn(
                "FSI CRM: customer-profile-container not found."
            );

            return;
        }


        const customerName =
            displayValue(
                customer.customer_name,
                "Unnamed Customer"
            );


        const phone =
            displayValue(
                customer.phone
            );


        // ====================================================
        // EMAIL
        // ====================================================

        const email =
            displayValue(
                customer.email,
                ""
            );


        const emailHTML =
            createEmailLink(
                email
            );


        const business =
            displayValue(
                customer.business
            );


        const location =
            displayValue(
                customer.location
            );


        // ====================================================
        // STATUS
        // ====================================================

        const status =
            normalizeStatus(
                customer.status || "New"
            );


        const salesName =
            sales
                ? displayValue(
                    sales.full_name ||
                    sales.name ||
                    sales.username,
                    "Unassigned"
                )
                : "Unassigned";


        // ====================================================
        // INPUT DATE
        // ====================================================

        const inputDateValue =
            customer.status_started_at;


        const inputDateInfo =
            getInputDateInfo(
                inputDateValue
            );


        const inputDate =
            inputDateInfo.exists
                ? formatDate(
                    inputDateValue
                )
                : "—";


        const inputDays =
            inputDateInfo.exists
                ? inputDateInfo.days
                : null;


        const inputDaysLabel =
            inputDateInfo.exists
                ? inputDateInfo.label
                : "—";


        // ====================================================
        // FOLLOW UP
        // ====================================================

        const followUpInfo =
            getFollowUpInfo(
                customer.follow_up_date
            );


        const avatarLetter =
            customerName
                .charAt(0)
                .toUpperCase();


        const createdAt =
            formatDateTime(
                customer.created_at
            );


        const updatedAt =
            formatDateTime(
                customer.updated_at
            );


        // ====================================================
        // FOLLOW UP DATA
        // ====================================================

        let followUpBadge = "";


        if (followUpInfo.exists) {

            followUpBadge = `

                <span
                    class="followup-badge ${escapeHTML(
                        followUpInfo.className
                    )}"
                >

                    <i data-lucide="clock-3"></i>

                    ${escapeHTML(
                        followUpInfo.label
                    )}

                </span>

            `;

        } else {

            followUpBadge = `

                <span
                    class="followup-badge followup-none"
                >

                    <i data-lucide="calendar-x-2"></i>

                    No follow-up date

                </span>

            `;

        }


        let followUpDaysText =
            "No follow-up date";


        if (followUpInfo.exists) {

            if (
                followUpInfo.days === 0
            ) {

                followUpDaysText =
                    "Today";

            } else if (
                followUpInfo.days > 0
            ) {

                followUpDaysText =
                    `${followUpInfo.days} ${
                        followUpInfo.days === 1
                            ? "day"
                            : "days"
                    } overdue`;

            } else {

                const daysUntil =
                    Math.abs(
                        followUpInfo.days
                    );


                followUpDaysText =
                    `In ${daysUntil} ${
                        daysUntil === 1
                            ? "day"
                            : "days"
                    }`;

            }

        }


        // ====================================================
        // DETAIL / ACTIVITY DATES
        // ====================================================

        const appointment =
            formatDate(
                customer.appointment
            );


        const siteSurvey =
            formatDate(
                customer.site_survey
            );


        const quotation =
            formatDate(
                customer.quotation
            );


        const closing =
            formatDate(
                customer.closing
            );


        const notes =
            displayValue(
                customer.notes,
                "No notes available."
            );


        // ====================================================
        // RENDER HTML
        // ====================================================

        container.innerHTML = `

            <div class="customer-profile">

                <div class="customer-profile-header">

                    <div class="customer-profile-heading">

                        <button
                            type="button"
                            class="secondary-btn small-btn customer-profile-back"
                            data-shelter-action="back"
                        >

                            <i data-lucide="arrow-left"></i>

                            Back to Leads

                        </button>


                        <div class="customer-identity">

                            <div class="customer-profile-avatar">

                                ${escapeHTML(
                                    avatarLetter
                                )}

                            </div>


                            <div class="customer-profile-name">

                                <h2>
                                    ${escapeHTML(
                                        customerName
                                    )}
                                </h2>

                                <p>
                                    Customer Profile
                                </p>

                            </div>

                        </div>

                    </div>


                    <div class="customer-profile-status">

                        <span
                            class="status-badge ${escapeHTML(
                                getStatusClass(status)
                            )}"
                        >

                            ${escapeHTML(
                                status
                            )}

                        </span>

                    </div>

                </div>


                <!-- ==================================================
                     INPUT DATE CARD
                =================================================== -->

                <section
                    class="profile-followup-card input-date-profile-card"
                >

                    <div class="profile-followup-icon">

                        <i data-lucide="calendar-days"></i>

                    </div>


                    <div class="profile-followup-content">

                        <span class="profile-followup-label">
                            Input Date
                        </span>

                        <strong>
                            ${escapeHTML(
                                inputDate
                            )}
                        </strong>

                        <small>
                            ${escapeHTML(
                                inputDateInfo.exists
                                    ? `Customer created ${inputDate}`
                                    : "No input date has been set."
                            )}
                        </small>

                    </div>


                    <div class="profile-followup-days">

                        <span
                            class="followup-badge input-date-badge"
                        >

                            <i data-lucide="clock-3"></i>

                            ${escapeHTML(
                                inputDaysLabel
                            )}

                        </span>


                        <span class="followup-days-text">
                            SINCE INPUT
                        </span>

                    </div>

                </section>


                <section class="profile-card">

                    <div class="profile-card-header">

                        <div>

                            <h3>
                                Customer Information
                            </h3>

                            <p>
                                Basic customer details
                            </p>

                        </div>

                    </div>


                    <div class="profile-info-grid">

                        <div class="profile-info-item">

                            <span class="profile-info-label">
                                <i data-lucide="user-round"></i>
                                Customer Name
                            </span>

                            <strong>
                                ${escapeHTML(
                                    customerName
                                )}
                            </strong>

                        </div>


                        <div class="profile-info-item">

                            <span class="profile-info-label">
                                <i data-lucide="phone"></i>
                                Phone
                            </span>

                            <strong>
                                ${escapeHTML(
                                    phone
                                )}
                            </strong>

                        </div>


                        <!-- ==================================================
                             EMAIL
                        =================================================== -->

                        <div class="profile-info-item">

                            <span class="profile-info-label">
                                <i data-lucide="mail"></i>
                                Email
                            </span>

                            <strong class="profile-info-value-email">
                                ${emailHTML}
                            </strong>

                        </div>


                        <div class="profile-info-item">

                            <span class="profile-info-label">
                                <i data-lucide="building-2"></i>
                                Business
                            </span>

                            <strong>
                                ${escapeHTML(
                                    business
                                )}
                            </strong>

                        </div>


                        <div class="profile-info-item">

                            <span class="profile-info-label">
                                <i data-lucide="map-pin"></i>
                                Location
                            </span>

                            <strong>
                                ${escapeHTML(
                                    location
                                )}
                            </strong>

                        </div>


                        <div class="profile-info-item">

                            <span class="profile-info-label">
                                <i data-lucide="briefcase-business"></i>
                                Sales
                            </span>

                            <strong>
                                ${escapeHTML(
                                    salesName
                                )}
                            </strong>

                        </div>


                        <div class="profile-info-item">

                            <span class="profile-info-label">
                                <i data-lucide="calendar-check"></i>
                                Follow Up Date
                            </span>

                            <strong>
                                ${escapeHTML(
                                    customer.follow_up_date
                                        ? formatDate(
                                            customer.follow_up_date
                                        )
                                        : "Not scheduled"
                                )}
                            </strong>

                        </div>

                    </div>

                </section>


                <section class="profile-card">

                    <div class="profile-card-header">

                        <div>

                            <h3>
                                Sales Pipeline
                            </h3>

                            <p>
                                Customer progress and important dates
                            </p>

                        </div>

                    </div>


                    <div class="profile-pipeline-grid">

                        <div class="pipeline-date-item">

                            <div class="pipeline-date-icon">
                                <i data-lucide="phone-call"></i>
                            </div>

                            <div>

                                <span>
                                    Follow Up
                                </span>

                                <strong>
                                    ${escapeHTML(
                                        customer.follow_up_date
                                            ? formatDate(
                                                customer.follow_up_date
                                            )
                                            : "—"
                                    )}
                                </strong>

                            </div>

                        </div>


                        <div class="pipeline-date-item">

                            <div class="pipeline-date-icon">
                                <i data-lucide="calendar-check"></i>
                            </div>

                            <div>

                                <span>
                                    Appointment
                                </span>

                                <strong>
                                    ${escapeHTML(
                                        appointment
                                    )}
                                </strong>

                            </div>

                        </div>


                        <div class="pipeline-date-item">

                            <div class="pipeline-date-icon">
                                <i data-lucide="map-pin"></i>
                            </div>

                            <div>

                                <span>
                                    Site Survey
                                </span>

                                <strong>
                                    ${escapeHTML(
                                        siteSurvey
                                    )}
                                </strong>

                            </div>

                        </div>


                        <div class="pipeline-date-item">

                            <div class="pipeline-date-icon">
                                <i data-lucide="file-text"></i>
                            </div>

                            <div>

                                <span>
                                    Quotation
                                </span>

                                <strong>
                                    ${escapeHTML(
                                        quotation
                                    )}
                                </strong>

                            </div>

                        </div>


                        <div class="pipeline-date-item">

                            <div class="pipeline-date-icon">
                                <i data-lucide="badge-check"></i>
                            </div>

                            <div>

                                <span>
                                    Closing
                                </span>

                                <strong>
                                    ${escapeHTML(
                                        closing
                                    )}
                                </strong>

                            </div>

                        </div>

                    </div>

                </section>


                <section class="profile-card">

                    <div class="profile-card-header">

                        <div>

                            <h3>
                                Notes
                            </h3>

                            <p>
                                Customer notes and information
                            </p>

                        </div>

                    </div>


                    <div class="profile-notes">

                        <i data-lucide="notebook-pen"></i>

                        <p>
                            ${escapeHTML(
                                notes
                            )}
                        </p>

                    </div>

                </section>


                <section class="profile-card profile-meta-card">

                    <div class="profile-card-header">

                        <div>

                            <h3>
                                Record Information
                            </h3>

                            <p>
                                CRM record details
                            </p>

                        </div>

                    </div>


                    <div class="profile-info-grid">

                        <div class="profile-info-item">

                            <span class="profile-info-label">
                                <i data-lucide="calendar-plus"></i>
                                Created
                            </span>

                            <strong>
                                ${escapeHTML(
                                    createdAt
                                )}
                            </strong>

                        </div>


                        <div class="profile-info-item">

                            <span class="profile-info-label">
                                <i data-lucide="refresh-cw"></i>
                                Last Updated
                            </span>

                            <strong>
                                ${escapeHTML(
                                    updatedAt
                                )}
                            </strong>

                        </div>

                    </div>

                </section>

            </div>

        `;


        refreshIcons();
    }


    // ========================================================
    // LOAD SALES
    // ========================================================

    async function loadSales(salesId) {

        if (
            !salesId ||
            String(salesId).trim() === ""
        ) {
            return null;
        }


        const supabase =
            getSupabaseClient();


        if (!supabase) {
            return null;
        }


        try {

            const {
                data,
                error
            } = await supabase
                .from("sales_users")
                .select("*")
                .eq(
                    "id",
                    salesId
                )
                .maybeSingle();


            if (error) {

                console.warn(
                    "FSI CRM: Unable to load sales profile.",
                    error
                );

                return null;
            }


            return data || null;

        } catch (error) {

            console.warn(
                "FSI CRM: Sales profile request failed.",
                error
            );

            return null;
        }
    }


    // ========================================================
    // LOAD CUSTOMER
    // ========================================================

    async function loadCustomer(customerId) {

        const supabase =
            getSupabaseClient();


        if (!supabase) {

            showProfileError(
                "Supabase connection is not available."
            );

            return null;
        }


        const id =
            String(
                customerId ?? ""
            ).trim();


        if (!id) {

            showProfileEmpty(
                "Select a customer to view the profile."
            );

            return null;
        }


        try {

            const {
                data,
                error
            } = await supabase
                .from("leads")
                .select("*")
                .eq(
                    "id",
                    id
                )
                .maybeSingle();


            if (error) {

                console.error(
                    "FSI CRM: Customer profile query failed:",
                    error
                );


                showProfileError(
                    error.message ||
                    "Unable to load customer data."
                );


                return null;
            }


            if (!data) {

                showProfileError(
                    "Customer was not found."
                );


                return null;
            }


            return data;

        } catch (error) {

            console.error(
                "FSI CRM: Customer profile request failed:",
                error
            );


            showProfileError(
                "Unable to load customer profile."
            );


            return null;
        }
    }


    // ========================================================
    // FORCE SHOW PROFILE PAGE
    // ========================================================

    function showCustomerProfilePage() {

        const profilePage =
            document.getElementById(
                "view-customer-profile"
            );


        if (!profilePage) {

            console.error(
                "FSI CRM: #view-customer-profile tidak ditemukan."
            );

            return false;
        }


        if (
            window.FSINavigation &&
            typeof window.FSINavigation.showPage ===
                "function"
        ) {

            const result =
                window.FSINavigation.showPage(
                    "customer-profile"
                );


            ensureProfilePageVisible();


            return result !== false;

        }


        if (
            typeof window.showPage ===
            "function"
        ) {

            const result =
                window.showPage(
                    "customer-profile"
                );


            ensureProfilePageVisible();


            return result !== false;

        }


        if (
            typeof window.crmNavigate ===
            "function"
        ) {

            const result =
                window.crmNavigate(
                    "customer-profile"
                );


            ensureProfilePageVisible();


            return result !== false;

        }


        activateProfilePage();


        return true;
    }


    // ========================================================
    // ENSURE PROFILE PAGE VISIBLE
    // ========================================================

    function ensureProfilePageVisible() {

        const pages =
            document.querySelectorAll(
                ".crm-page, .app-page, [id^='view-']"
            );


        pages.forEach(
            function (page) {

                if (
                    page.id ===
                    "view-customer-profile"
                ) {

                    page.classList.add(
                        "active"
                    );

                    page.classList.remove(
                        "hidden"
                    );

                    page.setAttribute(
                        "aria-hidden",
                        "false"
                    );

                    page.style.display =
                        "block";

                } else {

                    page.classList.remove(
                        "active"
                    );

                    page.classList.add(
                        "hidden"
                    );

                    page.setAttribute(
                        "aria-hidden",
                        "true"
                    );

                    page.style.display =
                        "none";

                }

            }
        );


        const container =
            getProfileContainer();


        if (container) {

            container.style.display =
                "block";

            container.style.visibility =
                "visible";

            container.style.opacity =
                "1";

        }


        console.log(
            "[FSI Customer Profile] Page visible:",
            {
                page:
                    !!document.getElementById(
                        "view-customer-profile"
                    ),

                active:
                    profilePageIsActive(),

                display:
                    profilePageDisplay(),

                container:
                    !!container
            }
        );
    }


    // ========================================================
    // PROFILE PAGE STATUS
    // ========================================================

    function profilePageIsActive() {

        const page =
            document.getElementById(
                "view-customer-profile"
            );


        if (!page) {
            return false;
        }


        return page.classList.contains(
            "active"
        );
    }


    function profilePageDisplay() {

        const page =
            document.getElementById(
                "view-customer-profile"
            );


        if (!page) {
            return "NOT FOUND";
        }


        return window.getComputedStyle(
            page
        ).display;
    }


    // ========================================================
    // OPEN CUSTOMER PROFILE
    // ========================================================

    async function openCustomerProfile(
        customerId
    ) {

        const id =
            String(
                customerId ?? ""
            ).trim();


        if (!id) {

            showCustomerProfilePage();


            showProfileEmpty(
                "Select a customer to view the profile."
            );

            return;
        }


        if (profileLoading) {
            return;
        }


        currentCustomerId =
            id;


        window.crmCurrentCustomerId =
            id;


        profileLoading = true;


        showCustomerProfilePage();


        const container =
            getProfileContainer();


        if (!container) {

            console.error(
                "FSI CRM: customer-profile-container tidak ditemukan."
            );

            profileLoading = false;

            return;
        }


        showProfileLoading();


        try {

            const customer =
                await loadCustomer(id);


            if (!customer) {
                return;
            }


            const sales =
                await loadSales(
                    customer.sales_id
                );


            renderCustomerProfile(
                customer,
                sales
            );


            ensureProfilePageVisible();


        } catch (error) {

            console.error(
                "FSI CRM: Open customer profile failed:",
                error
            );


            showProfileError(
                "Unable to open customer profile."
            );


        } finally {

            profileLoading = false;

        }
    }


    // ========================================================
    // ACTIVATE PROFILE PAGE
    // ========================================================

    function activateProfilePage() {

        const pages =
            document.querySelectorAll(
                ".crm-page, .app-page, [id^='view-']"
            );


        pages.forEach(
            function (page) {

                if (
                    page.id ===
                    "view-customer-profile"
                ) {

                    page.classList.add(
                        "active"
                    );

                    page.classList.remove(
                        "hidden"
                    );

                    page.setAttribute(
                        "aria-hidden",
                        "false"
                    );

                    page.style.display =
                        "block";

                } else {

                    page.classList.remove(
                        "active"
                    );

                    page.classList.add(
                        "hidden"
                    );

                    page.setAttribute(
                        "aria-hidden",
                        "true"
                    );

                    page.style.display =
                        "none";

                }

            }
        );


        const container =
            getProfileContainer();


        if (container) {

            container.style.display =
                "block";

            container.style.visibility =
                "visible";

            container.style.opacity =
                "1";

        }


        refreshIcons();
    }


    // ========================================================
    // BACK TO LEADS
    // ========================================================

    function backToLeads() {

        currentCustomerId =
            null;


        window.crmCurrentCustomerId =
            null;


        if (
            window.FSINavigation &&
            typeof window.FSINavigation.showPage ===
                "function"
        ) {

            window.FSINavigation.showPage(
                "leads"
            );

            return;
        }


        if (
            typeof window.showPage ===
            "function"
        ) {

            window.showPage(
                "leads"
            );

            return;
        }


        if (
            typeof window.crmNavigate ===
            "function"
        ) {

            window.crmNavigate(
                "leads"
            );

            return;
        }


        activateLeadsPage();
    }


    // ========================================================
    // ACTIVATE LEADS PAGE
    // ========================================================

    function activateLeadsPage() {

        const pages =
            document.querySelectorAll(
                ".crm-page, .app-page, [id^='view-']"
            );


        pages.forEach(
            function (page) {

                if (
                    page.id ===
                    "view-leads"
                ) {

                    page.classList.add(
                        "active"
                    );

                    page.classList.remove(
                        "hidden"
                    );

                    page.setAttribute(
                        "aria-hidden",
                        "false"
                    );

                    page.style.display =
                        "block";

                } else {

                    page.classList.remove(
                        "active"
                    );

                    page.classList.add(
                        "hidden"
                    );

                    page.setAttribute(
                        "aria-hidden",
                        "true"
                    );

                    page.style.display =
                        "none";

                }

            }
        );


        refreshIcons();
    }


    // ========================================================
    // REFRESH PROFILE
    // ========================================================

    async function refreshCustomerProfile() {

        if (!currentCustomerId) {
            return;
        }


        await openCustomerProfile(
            currentCustomerId
        );
    }


    // ========================================================
    // EVENT HANDLER
    // ========================================================

    function setupShelterEvents() {

        const container =
            getProfileContainer();


        if (!container) {
            return;
        }


        if (
            container.dataset.shelterEventsBound ===
            "true"
        ) {
            return;
        }


        container.dataset.shelterEventsBound =
            "true";


        container.addEventListener(
            "click",
            function (event) {

                const actionElement =
                    event.target.closest(
                        "[data-shelter-action]"
                    );


                if (!actionElement) {
                    return;
                }


                const action =
                    actionElement.getAttribute(
                        "data-shelter-action"
                    );


                if (
                    action === "back"
                ) {

                    event.preventDefault();

                    backToLeads();

                }

            }
        );
    }


    // ========================================================
    // LUCIDE
    // ========================================================

    function refreshIcons() {

        try {

            if (
                window.lucide &&
                typeof window.lucide.createIcons ===
                    "function"
            ) {

                window.lucide.createIcons();

            }

        } catch (error) {

            console.warn(
                "FSI CRM: Lucide icon rendering failed.",
                error
            );

        }
    }


    // ========================================================
    // PAGE INITIALIZATION
    // ========================================================

    function initializeShelter() {

        setupShelterEvents();


        const profilePage =
            document.getElementById(
                "view-customer-profile"
            );


        if (profilePage) {

            if (
                profilePage.classList.contains(
                    "active"
                )
            ) {

                profilePage.style.display =
                    "block";

            } else {

                profilePage.style.display =
                    "none";

            }

        }


        refreshIcons();
    }


    // ========================================================
    // PUBLIC API
    // ========================================================

    window.crmOpenCustomerProfile =
        openCustomerProfile;


    window.openCustomerProfile =
        openCustomerProfile;


    window.crmOpenShelter =
        openCustomerProfile;


    window.refreshCustomerProfile =
        refreshCustomerProfile;


    window.crmRefreshCustomerProfile =
        refreshCustomerProfile;


    window.crmBackToLeads =
        backToLeads;


    window.closeCustomerProfile =
        backToLeads;


    window.FSICustomerProfile = {

        open:
            openCustomerProfile,

        refresh:
            refreshCustomerProfile,

        back:
            backToLeads

    };


    // ========================================================
    // DOM READY
    // ========================================================

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeShelter
        );

    } else {

        initializeShelter();

    }


})();
