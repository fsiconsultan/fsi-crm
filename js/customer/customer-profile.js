// ============================================================
// FSI CRM - CUSTOMER PROFILE
// File: js/shelter.js
// ============================================================
//
// Functions:
// 1. Display Customer Profile
// 2. Load customer data from "leads"
// 3. Load Sales name from "sales_users"
// 4. Display Follow Up Date
// 5. Calculate Follow Up difference based on CALENDAR DATE
// 6. Display Days Since Last Update
// 7. Fallback to created_at when updated_at is empty
// 8. Does not handle Add Customer
// 9. Does not handle Edit Customer
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
// SPK HAS BEEN REMOVED FROM CUSTOMER PROFILE.
//
// Add / Edit Customer is handled by:
//     js/customer-form.js
//
// Leads List is handled by:
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
        followUpDate,
        today
    ) {

        const followDate =
            startOfCalendarDay(
                followUpDate
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
                followDate.getTime()
            ) /
            millisecondsPerDay
        );
    }


    // ========================================================
    // CUSTOMER UPDATE AGE
    // Calculates how many calendar days have passed
    // since the customer's last update.
    // ========================================================

    function getUpdateAgeInDays(value) {

        const updatedDate =
            parseCalendarDate(value);


        if (!updatedDate) {
            return null;
        }


        const today =
            new Date();


        const start =
            startOfCalendarDay(
                updatedDate
            );


        const end =
            startOfCalendarDay(
                today
            );


        const difference =
            end.getTime() -
            start.getTime();


        return Math.max(
            0,
            Math.floor(
                difference /
                86400000
            )
        );
    }


    // ========================================================
    // CUSTOMER UPDATE AGE LABEL
    // ========================================================

    function getUpdateAgeLabel(value) {

        const age =
            getUpdateAgeInDays(
                value
            );


        if (age === null) {
            return "NO UPDATE DATE";
        }


        if (age === 0) {
            return "0 DAYS";
        }


        if (age === 1) {
            return "1 DAY";
        }


        return `${age} DAYS`;
    }


    // ========================================================
    // CUSTOMER UPDATE DETAIL
    // ========================================================

    function getUpdateAgeDetail(value) {

        const age =
            getUpdateAgeInDays(
                value
            );


        if (age === null) {
            return "No update date available";
        }


        if (age === 0) {
            return "Updated today";
        }


        if (age === 1) {
            return "Updated 1 day ago";
        }


        return `Updated ${age} days ago`;
    }


    // ========================================================
    // CUSTOMER LAST UPDATED VALUE
    // ========================================================
    //
    // Priority:
    // 1. updated_at
    // 2. created_at
    //
    // Customer lama mungkin belum memiliki updated_at.
    // Jika updated_at kosong, created_at digunakan sebagai
    // fallback agar Days Since Update tetap tampil.
    //
    // ========================================================

    function getCustomerLastUpdatedValue(customer) {

        if (!customer) {
            return null;
        }


        // ----------------------------------------------------
        // PRIORITY 1: updated_at
        // ----------------------------------------------------

        const updatedAt =
            customer.updated_at;


        if (
            updatedAt !== null &&
            updatedAt !== undefined &&
            String(updatedAt).trim() !== ""
        ) {

            return updatedAt;

        }


        // ----------------------------------------------------
        // PRIORITY 2: created_at
        // ----------------------------------------------------

        const createdAt =
            customer.created_at;


        if (
            createdAt !== null &&
            createdAt !== undefined &&
            String(createdAt).trim() !== ""
        ) {

            return createdAt;

        }


        // ----------------------------------------------------
        // NO DATE
        // ----------------------------------------------------

        return null;
    }


    // ========================================================
    // CUSTOMER JOURNEY DAY COUNT
    // Same day-count calculation used in Leads
    // ========================================================

    function getJourneyAgeInDays(value) {

        const createdDate =
            parseCalendarDate(value);


        if (!createdDate) {
            return null;
        }


        const now =
            new Date();


        const start =
            new Date(
                createdDate.getFullYear(),
                createdDate.getMonth(),
                createdDate.getDate()
            );


        const end =
            new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate()
            );


        const difference =
            end.getTime() -
            start.getTime();


        return Math.max(
            0,
            Math.floor(
                difference /
                86400000
            )
        );
    }


    function getJourneyAgeLabel(value) {

        const age =
            getJourneyAgeInDays(
                value
            );


        if (age === null) {
            return "";
        }


        if (age === 0) {
            return "0 days";
        }


        if (age === 1) {
            return "1 day";
        }


        return `${age} days`;
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
            "en-GB",
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
            "en-GB",
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

            "appointment":
                "status-first-meeting",

            "site survey":
                "status-first-meeting",

            "quotation":
                "status-quotation",

            "second appointment":
                "status-second-appointment",

            "deal":
                "status-deal",

            "closing":
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
    // CUSTOMER JOURNEY HELPER
    // ========================================================

    function getJourneyDate(customer, fields) {

        for (let i = 0; i < fields.length; i++) {

            const field =
                fields[i];

            if (
                customer[field] !== null &&
                customer[field] !== undefined &&
                String(customer[field]).trim() !== ""
            ) {

                return customer[field];

            }

        }

        return null;
    }


    function journeyStage(
        title,
        date,
        completed,
        icon,
        description
    ) {

        const ageLabel =
            date
                ? getJourneyAgeLabel(
                    date
                )
                : "";


        return `

            <div class="
                customer-journey-stage
                ${completed ? "completed" : "pending"}
            ">

                <div class="journey-stage-icon">

                    ${
                        completed
                            ? `<i data-lucide="check"></i>`
                            : `<i data-lucide="${escapeHTML(icon)}"></i>`
                    }

                </div>

                <div class="journey-stage-content">

                    <div class="journey-stage-title">
                        ${escapeHTML(title)}
                    </div>

                    <div class="journey-stage-date">

                        ${
                            date
                                ? escapeHTML(
                                    formatDate(date)
                                )
                                : "Not scheduled"
                        }

                    </div>

                    ${
                        ageLabel
                            ? `
                                <div class="journey-stage-age">
                                    ${escapeHTML(
                                        ageLabel
                                    )}
                                </div>
                            `
                            : ""
                    }

                    <div class="journey-stage-description">

                        ${
                            completed
                                ? escapeHTML(
                                    description || "Completed"
                                )
                                : escapeHTML(
                                    description || "Not yet"
                                )
                        }

                    </div>

                </div>

            </div>

        `;
    }


    // ========================================================
    // CUSTOMER JOURNEY
    // ========================================================

    function renderCustomerJourney(customer) {

        const appointmentDate =
            getJourneyDate(
                customer,
                [
                    "appointment"
                ]
            );


        const surveyDate =
            getJourneyDate(
                customer,
                [
                    "site_survey"
                ]
            );


        const quotationDate =
            getJourneyDate(
                customer,
                [
                    "quotation"
                ]
            );


        const closingDate =
            getJourneyDate(
                customer,
                [
                    "closing"
                ]
            );


        const firstContactDate =
            getJourneyDate(
                customer,
                [
                    "first_contact",
                    "contact_date",
                    "last_follow_up"
                ]
            );


        const secondAppointmentDate =
            getJourneyDate(
                customer,
                [
                    "second_appointment",
                    "second_meeting"
                ]
            );


        const createdDate =
            getJourneyDate(
                customer,
                [
                    "created_at"
                ]
            );


        const status =
            normalizeStatus(
                customer.status
            )
                .toLowerCase();


        const hasFirstContact =
            !!firstContactDate ||
            [
                "first contact",
                "first meeting / appointment / site survey",
                "appointment",
                "site survey",
                "quotation",
                "second appointment",
                "deal",
                "no deal"
            ].includes(status);


        const hasAppointment =
            !!appointmentDate ||
            [
                "first meeting / appointment / site survey",
                "appointment",
                "site survey",
                "quotation",
                "second appointment",
                "deal"
            ].includes(status);


        const hasSurvey =
            !!surveyDate ||
            [
                "site survey",
                "quotation",
                "second appointment",
                "deal"
            ].includes(status);


        const hasQuotation =
            !!quotationDate ||
            [
                "quotation",
                "second appointment",
                "deal"
            ].includes(status);


        const hasSecondAppointment =
            !!secondAppointmentDate ||
            [
                "second appointment",
                "deal"
            ].includes(status);


        const hasDeal =
            !!closingDate ||
            status === "deal" ||
            status === "closing";


        return `

            <div class="customer-journey">

                <div class="customer-journey-row">

                    ${journeyStage(
                        "New",
                        createdDate,
                        true,
                        "sparkles",
                        createdDate
                            ? "Customer created"
                            : "Customer record"
                    )}

                    <div class="journey-arrow">
                        <i data-lucide="arrow-right"></i>
                    </div>


                    ${journeyStage(
                        "Contact",
                        firstContactDate,
                        hasFirstContact,
                        "phone-call",
                        hasFirstContact
                            ? "Contact completed"
                            : "Not contacted"
                    )}


                    <div class="journey-arrow">
                        <i data-lucide="arrow-right"></i>
                    </div>


                    ${journeyStage(
                        "Appointment",
                        appointmentDate,
                        hasAppointment,
                        "calendar-check",
                        hasAppointment
                            ? "Completed"
                            : "Not scheduled"
                    )}

                </div>


                <div class="customer-journey-row">

                    ${journeyStage(
                        "Survey",
                        surveyDate,
                        hasSurvey,
                        "map-pin",
                        hasSurvey
                            ? "Completed"
                            : "Not scheduled"
                    )}


                    <div class="journey-arrow">
                        <i data-lucide="arrow-right"></i>
                    </div>


                    ${journeyStage(
                        "Quotation",
                        quotationDate,
                        hasQuotation,
                        "file-text",
                        hasQuotation
                            ? "Completed"
                            : "Not scheduled"
                    )}


                    <div class="journey-arrow">
                        <i data-lucide="arrow-right"></i>
                    </div>


                    ${journeyStage(
                        "2nd Meeting",
                        secondAppointmentDate,
                        hasSecondAppointment,
                        "users",
                        hasSecondAppointment
                            ? "Completed"
                            : "Not scheduled"
                    )}

                </div>


                <div class="customer-journey-final-arrow">

                    <i data-lucide="arrow-down"></i>

                </div>


                <div class="customer-journey-final">

                    ${journeyStage(
                        "Deal",
                        closingDate,
                        hasDeal,
                        "badge-check",
                        hasDeal
                            ? "Completed"
                            : "Not yet"
                    )}

                </div>

            </div>

        `;
    }


    // ========================================================
    // DOCUMENTS PLACEHOLDER
    // ========================================================

    function renderCustomerDocuments() {

        return `

            <section class="profile-card customer-documents-card">

                <div class="profile-card-header">

                    <div>

                        <h3>
                            Customer Documents
                        </h3>

                        <p>
                            Customer quotation and proposal documents
                        </p>

                    </div>

                    <div class="profile-card-header-icon">

                        <i data-lucide="folder-open"></i>

                    </div>

                </div>


                <div class="customer-documents-empty">

                    <div class="customer-documents-empty-icon">

                        <i data-lucide="file-up"></i>

                    </div>

                    <strong>
                        No documents uploaded
                    </strong>

                    <span>
                        Upload PDF documents for this customer.
                    </span>

                </div>


                <div class="customer-documents-upload">

                    <label
                        class="document-upload-btn"
                        for="customer-profile-pdf"
                    >

                        <i data-lucide="upload"></i>

                        Choose PDF

                    </label>


                    <input
                        type="file"
                        id="customer-profile-pdf"
                        accept="application/pdf"
                        hidden
                    />


                    <button
                        type="button"
                        class="primary-btn"
                        data-shelter-action="upload-document"
                    >

                        <i data-lucide="upload-cloud"></i>

                        Upload PDF

                    </button>

                </div>

            </section>

        `;
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


        // ====================================================
        // LAST UPDATED
        // ====================================================
        //
        // Use updated_at first.
        // If updated_at is empty, use created_at.
        //
        // This ensures older customers still show a
        // Days Since Update value.
        // ====================================================

        const customerLastUpdated =
            getCustomerLastUpdatedValue(
                customer
            );


        const updatedAt =
            formatDateTime(
                customerLastUpdated
            );


        // ====================================================
        // UPDATE AGE
        // ====================================================

        const updateAgeLabel =
            getUpdateAgeLabel(
                customerLastUpdated
            );


        const updateAgeDetail =
            getUpdateAgeDetail(
                customerLastUpdated
            );


        const updateAge =
            getUpdateAgeInDays(
                customerLastUpdated
            );


        const updateAgeClass =
            updateAge === null
                ? "customer-update-none"
                : updateAge === 0
                    ? "customer-update-today"
                    : updateAge >= 30
                        ? "customer-update-critical"
                        : updateAge >= 14
                            ? "customer-update-warning"
                            : "customer-update-normal";


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
        // PHONE FOR WHATSAPP
        // ====================================================

        const whatsappPhone =
            String(
                customer.phone || ""
            )
            .replace(
                /[^0-9]/g,
                ""
            );


        const whatsappURL =
            whatsappPhone
                ? `https://wa.me/${whatsappPhone}`
                : "#";


        const email =
            String(
                customer.email || ""
            ).trim();


        const emailURL =
            email
                ? `mailto:${encodeURIComponent(email)}`
                : "#";


        // ====================================================
        // FOLLOW UP BADGE
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
        // RENDER HTML
        // ====================================================

        container.innerHTML = `

            <div class="customer-profile">


                <!-- ========================================== -->
                <!-- HEADER -->
                <!-- ========================================== -->

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


                                <p class="customer-profile-subtitle">

                                    <span>
                                        <i data-lucide="building-2"></i>
                                        ${escapeHTML(
                                            business
                                        )}
                                    </span>


                                    <span>
                                        <i data-lucide="map-pin"></i>
                                        ${escapeHTML(
                                            location
                                        )}
                                    </span>

                                </p>


                                <!-- ================================= -->
                                <!-- LAST UPDATED -->
                                <!-- ================================= -->

                                <div class="
                                    customer-profile-last-update
                                    ${escapeHTML(
                                        updateAgeClass
                                    )}
                                ">

                                    <span
                                        class="customer-profile-last-update-icon"
                                    >

                                        <i data-lucide="refresh-cw"></i>

                                    </span>


                                    <span
                                        class="customer-profile-last-update-text"
                                    >

                                        <span
                                            class="customer-profile-last-update-label"
                                        >
                                            Last Updated
                                        </span>


                                        <strong>
                                            ${escapeHTML(
                                                updatedAt
                                            )}
                                        </strong>

                                    </span>

                                </div>

                            </div>

                        </div>

                    </div>


                    <!-- ========================================= -->
                    <!-- DAYS SINCE UPDATE -->
                    <!-- ========================================= -->

                    <div
                        class="
                            customer-profile-update-age
                            ${escapeHTML(
                                updateAgeClass
                            )}
                    "
                    >

                        <div class="customer-update-age-icon">

                            <i data-lucide="clock-3"></i>

                        </div>


                        <div class="customer-update-age-content">

                            <strong>
                                ${escapeHTML(
                                    updateAgeLabel
                                )}
                            </strong>


                            <span>
                                SINCE UPDATE
                            </span>


                            <small>
                                ${escapeHTML(
                                    updateAgeDetail
                                )}
                            </small>

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


                <!-- ========================================== -->
                <!-- ACTION BUTTONS -->
                <!-- ========================================== -->

                <div class="customer-profile-actions">

                    <a
                        href="${escapeHTML(
                            whatsappURL
                        )}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="profile-action-btn whatsapp-action ${
                            whatsappPhone
                                ? ""
                                : "disabled"
                        }"
                        ${
                            whatsappPhone
                                ? ""
                                : "aria-disabled=\"true\""
                        }
                    >

                        <i data-lucide="message-circle"></i>

                        WhatsApp

                    </a>


                    <a
                        href="${escapeHTML(
                            emailURL
                        )}"
                        class="profile-action-btn email-action ${
                            email
                                ? ""
                                : "disabled"
                        }"
                        ${
                            email
                                ? ""
                                : "aria-disabled=\"true\""
                        }
                    >

                        <i data-lucide="mail"></i>

                        Email

                    </a>


                    <button
                        type="button"
                        class="profile-action-btn appointment-action"
                        data-shelter-action="appointment"
                    >

                        <i data-lucide="calendar-plus"></i>

                        Appointment

                    </button>


                    <button
                        type="button"
                        class="profile-action-btn save-action"
                        data-shelter-action="save"
                    >

                        <i data-lucide="save"></i>

                        Save

                    </button>

                </div>


                <!-- ========================================== -->
                <!-- FOLLOW UP -->
                <!-- ========================================== -->

                <section
                    class="profile-followup-card ${escapeHTML(
                        followUpInfo.className
                    )}"
                >

                    <div class="profile-followup-icon">

                        <i data-lucide="calendar-clock"></i>

                    </div>


                    <div class="profile-followup-content">

                        <span class="profile-followup-label">
                            FOLLOW-UP
                        </span>


                        <strong>

                            ${
                                customer.follow_up_date
                                    ? escapeHTML(
                                        formatDate(
                                            customer.follow_up_date
                                        )
                                    )
                                    : "No date set"
                            }

                        </strong>


                        <small>

                            ${escapeHTML(
                                followUpInfo.detail
                            )}

                        </small>

                    </div>


                    <div class="profile-followup-days">

                        ${followUpBadge}


                        <span class="followup-days-text">

                            ${escapeHTML(
                                followUpDaysText
                            )}

                        </span>

                    </div>

                </section>


                <!-- ========================================== -->
                <!-- CUSTOMER INFORMATION -->
                <!-- ========================================== -->

                <section class="profile-card">

                    <div class="profile-card-header">

                        <div>

                            <h3>
                                Customer Information
                            </h3>

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

                                ${
                                    customer.follow_up_date
                                        ? escapeHTML(
                                            formatDate(
                                                customer.follow_up_date
                                            )
                                        )
                                        : "Not scheduled"
                                }

                            </strong>

                        </div>

                    </div>

                </section>


                <!-- ========================================== -->
                <!-- CUSTOMER JOURNEY -->
                <!-- ========================================== -->

                <section class="profile-card customer-journey-card">

                    <div class="profile-card-header">

                        <div>

                            <h3>
                                Customer Journey
                            </h3>

                            <p>
                                Customer progress and important dates
                            </p>

                        </div>

                    </div>


                    ${renderCustomerJourney(
                        customer
                    )}

                </section>


                <!-- ========================================== -->
                <!-- NOTES -->
                <!-- ========================================== -->

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


                <!-- ========================================== -->
                <!-- CUSTOMER DOCUMENTS -->
                <!-- ========================================== -->

                ${renderCustomerDocuments()}


                <!-- ========================================== -->
                <!-- RECORD INFORMATION -->
                <!-- ========================================== -->

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


                        <div class="profile-info-item">

                            <span class="profile-info-label">

                                <i data-lucide="calendar-check-2"></i>

                                Appointment

                            </span>


                            <strong>

                                ${escapeHTML(
                                    appointment
                                )}

                            </strong>

                        </div>


                        <div class="profile-info-item">

                            <span class="profile-info-label">

                                <i data-lucide="map"></i>

                                Site Survey

                            </span>


                            <strong>

                                ${escapeHTML(
                                    siteSurvey
                                )}

                            </strong>

                        </div>


                        <div class="profile-info-item">

                            <span class="profile-info-label">

                                <i data-lucide="file-text"></i>

                                Quotation

                            </span>


                            <strong>

                                ${escapeHTML(
                                    quotation
                                )}

                            </strong>

                        </div>


                        <div class="profile-info-item">

                            <span class="profile-info-label">

                                <i data-lucide="badge-check"></i>

                                Closing

                            </span>


                            <strong>

                                ${escapeHTML(
                                    closing
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

            // =================================================
            // IMPORTANT:
            // Always load directly from Supabase.
            //
            // This ensures updated_at is fresh after
            // customer-form.js performs an UPDATE.
            // =================================================

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
                "FSI CRM: #view-customer-profile not found."
            );

            return false;
        }


        // ----------------------------------------------------
        // PRIORITY 1
        // Main navigation system
        // ----------------------------------------------------

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


        // ----------------------------------------------------
        // PRIORITY 2
        // Global showPage if available
        // ----------------------------------------------------

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


        // ----------------------------------------------------
        // PRIORITY 3
        // Global navigation
        // ----------------------------------------------------

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


        // ----------------------------------------------------
        // FALLBACK
        // ----------------------------------------------------

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


        // ----------------------------------------------------
        // Open PROFILE page first.
        // ----------------------------------------------------

        showCustomerProfilePage();


        const container =
            getProfileContainer();


        if (!container) {

            console.error(
                "FSI CRM: customer-profile-container not found."
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


                // ------------------------------------------
                // BACK
                // ------------------------------------------

                if (
                    action === "back"
                ) {

                    event.preventDefault();

                    backToLeads();

                    return;
                }


                // ------------------------------------------
                // APPOINTMENT
                // ------------------------------------------

                if (
                    action === "appointment"
                ) {

                    event.preventDefault();

                    console.log(
                        "[FSI Customer Profile] Appointment clicked."
                    );


                    /*
                     * Appointment is not forced into
                     * Supabase from here.
                     *
                     * Existing system remains unchanged.
                     */

                    if (
                        typeof window.crmOpenAppointment ===
                        "function"
                    ) {

                        window.crmOpenAppointment(
                            currentCustomerId
                        );

                    }

                    return;
                }


                // ------------------------------------------
                // SAVE
                // ------------------------------------------

                if (
                    action === "save"
                ) {

                    event.preventDefault();

                    console.log(
                        "[FSI Customer Profile] Save clicked."
                    );


                    /*
                     * Save intentionally does not perform
                     * an automatic Supabase UPDATE.
                     *
                     * Customer editing remains handled
                     * by customer-form.js.
                     */

                    if (
                        typeof window.crmSaveCustomer ===
                        "function"
                    ) {

                        window.crmSaveCustomer(
                            currentCustomerId
                        );

                    }

                    return;
                }


                // ------------------------------------------
                // UPLOAD DOCUMENT
                // ------------------------------------------

                if (
                    action === "upload-document"
                ) {

                    event.preventDefault();

                    const fileInput =
                        document.getElementById(
                            "customer-profile-pdf"
                        );


                    if (fileInput) {

                        fileInput.click();

                    }

                    return;
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
