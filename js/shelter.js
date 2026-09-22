// ============================================================
// FSI CRM - CUSTOMER PROFILE
// File: js/shelter.js
// ============================================================
//
// Fungsi:
// 1. Menampilkan Customer Profile
// 2. Mengambil data customer dari tabel "leads"
// 3. Mengambil nama Sales dari tabel "sales_users"
// 4. Menampilkan Follow Up Date
// 5. Menghitung selisih Follow Up berdasarkan TANGGAL KALENDER
// 6. Tidak menangani Add Customer
// 7. Tidak menangani Edit Customer
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

            const element = document.getElementById(id);

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
            typeof window.supabaseClient
                .from === "function"
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
    //
    // IMPORTANT:
    // Date "YYYY-MM-DD" dibuat sebagai tanggal LOCAL,
    // bukan UTC.
    //
    // Ini mencegah masalah timezone ketika menghitung
    // selisih tanggal Follow Up.
    //
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


        // ----------------------------------------------------
        // Format database utama:
        // YYYY-MM-DD
        // ----------------------------------------------------

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


        // ----------------------------------------------------
        // Fallback untuk format tanggal lain
        // ----------------------------------------------------

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
    //
    // Hasil:
    //
    // follow-up kemarin:
    //     +1
    //
    // follow-up hari ini:
    //      0
    //
    // follow-up besok:
    //     -1
    //
    // Jadi hasil positif = sudah lewat.
    //
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
                detail: "No follow-up date has been set.",
                className: "followup-none",
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


        // ----------------------------------------------------
        // HARI INI
        // ----------------------------------------------------

        if (difference === 0) {

            return {
                exists: true,
                label: "Today",
                detail: "Follow-up is due today.",
                className: "followup-today",
                days: 0
            };

        }


        // ----------------------------------------------------
        // SUDAH LEWAT
        // ----------------------------------------------------

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
                className: "followup-overdue",
                days: difference
            };

        }


        // ----------------------------------------------------
        // BELUM TIBA
        // ----------------------------------------------------

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
            className: "followup-upcoming",
            days: difference
        };
    }


    // ========================================================
    // STATUS CLASS
    // ========================================================

    function getStatusClass(status) {

        const normalized =
            String(status || "")
                .trim()
                .toLowerCase();


        const map = {

            "new":
                "status-new",

            "flyer sent":
                "status-flyer",

            "interested":
                "status-interested",

            "follow up":
                "status-follow-up",

            "appointment":
                "status-appointment",

            "site survey":
                "status-site-survey",

            "quotation":
                "status-quotation",

            "closing":
                "status-closing",

            "not interested":
                "status-not-interested"

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

    function showProfileEmpty(
        message
    ) {

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

    function showProfileError(
        message
    ) {

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


        const business =
            displayValue(
                customer.business
            );


        const location =
            displayValue(
                customer.location
            );


        const status =
            displayValue(
                customer.status,
                "New"
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


        const updatedAt =
            formatDateTime(
                customer.updated_at
            );


        // ----------------------------------------------------
        // FOLLOW UP VISUAL
        // ----------------------------------------------------

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


        // ----------------------------------------------------
        // DAYS TEXT
        // ----------------------------------------------------

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


        // ----------------------------------------------------
        // PIPELINE DATE DATA
        // ----------------------------------------------------

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


        const spk =
            formatDate(
                customer.spk
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


        // ----------------------------------------------------
        // RENDER
        // ----------------------------------------------------

        container.innerHTML = `

            <div class="customer-profile">

                <!-- =========================================
                     PROFILE HEADER
                ========================================== -->

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



                <!-- =========================================
                     FOLLOW UP HIGHLIGHT
                ========================================== -->

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
                            Follow Up
                        </span>

                        <strong>
                            ${escapeHTML(
                                customer.follow_up_date
                                    ? formatDate(
                                        customer.follow_up_date
                                    )
                                    : "No date set"
                            )}
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



                <!-- =========================================
                     CUSTOMER INFORMATION
                ========================================== -->

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



                <!-- =========================================
                     PIPELINE
                ========================================== -->

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
                                <i data-lucide="file-check-2"></i>
                            </div>

                            <div>

                                <span>
                                    SPK
                                </span>

                                <strong>
                                    ${escapeHTML(
                                        spk
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



                <!-- =========================================
                     NOTES
                ========================================== -->

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



                <!-- =========================================
                     RECORD INFORMATION
                ========================================== -->

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

    async function loadSales(
        salesId
    ) {

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

    async function loadCustomer(
        customerId
    ) {

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


            // ------------------------------------------------
            // Navigate to profile page
            // ------------------------------------------------

            if (
                typeof window.showPage ===
                "function"
            ) {

                window.showPage(
                    "customer-profile"
                );

            } else if (
                typeof window.navigateToPage ===
                "function"
            ) {

                window.navigateToPage(
                    "customer-profile"
                );

            } else {

                activateProfilePage();

            }


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
                ".crm-page"
            );


        pages.forEach(
            function (page) {

                page.classList.remove(
                    "active"
                );

                page.style.display =
                    "none";

            }
        );


        const profilePage =
            document.getElementById(
                "view-customer-profile"
            );


        if (profilePage) {

            profilePage.classList.add(
                "active"
            );

            profilePage.style.display =
                "block";

        }
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
            typeof window.showPage ===
            "function"
        ) {

            window.showPage(
                "leads"
            );

            return;
        }


        if (
            typeof window.navigateToPage ===
            "function"
        ) {

            window.navigateToPage(
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
                ".crm-page"
            );


        pages.forEach(
            function (page) {

                page.classList.remove(
                    "active"
                );

                page.style.display =
                    "none";

            }
        );


        const leadsPage =
            document.getElementById(
                "view-leads"
            );


        if (leadsPage) {

            leadsPage.classList.add(
                "active"
            );

            leadsPage.style.display =
                "block";

        }
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


        // Prevent duplicate listeners.
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


        if (
            profilePage &&
            !profilePage.classList.contains(
                "active"
            )
        ) {

            profilePage.style.display =
                "none";

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
