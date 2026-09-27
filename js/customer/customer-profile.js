// ========================================================
// FSI CRM - CUSTOMER PROFILE / SHELTER
// ========================================================

(function () {
    "use strict";

    // ========================================================
    // STATE
    // ========================================================

    let currentCustomerId = null;
    let profileLoading = false;


    // ========================================================
    // SUPABASE
    // ========================================================

    function getSupabase() {
        return window.supabaseClient || window.supabase || null;
    }


    // ========================================================
    // DATE HELPERS
    // ========================================================

    function parseCalendarDate(value) {
        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return null;
        }

        if (value instanceof Date) {
            const clonedDate = new Date(value.getTime());

            if (Number.isNaN(clonedDate.getTime())) {
                return null;
            }

            return clonedDate;
        }

        if (typeof value === "number") {
            const numericDate = new Date(value);

            if (Number.isNaN(numericDate.getTime())) {
                return null;
            }

            return numericDate;
        }

        const stringValue = String(value).trim();

        if (!stringValue) {
            return null;
        }

        const dateOnlyMatch = stringValue.match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );

        if (dateOnlyMatch) {
            const year = Number(dateOnlyMatch[1]);
            const month = Number(dateOnlyMatch[2]) - 1;
            const day = Number(dateOnlyMatch[3]);

            const localDate = new Date(
                year,
                month,
                day
            );

            if (Number.isNaN(localDate.getTime())) {
                return null;
            }

            return localDate;
        }

        const date = new Date(stringValue);

        if (Number.isNaN(date.getTime())) {
            return null;
        }

        return date;
    }


    // ========================================================
    // SAME AGE LOGIC AS LEADS
    // Input Date = status_started_at
    // ========================================================

    function getLeadAgeInDays(value) {
        const createdDate = parseCalendarDate(value);

        if (!createdDate) {
            return null;
        }

        const now = new Date();

        const start = new Date(
            createdDate.getFullYear(),
            createdDate.getMonth(),
            createdDate.getDate()
        );

        const end = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );

        const difference =
            end.getTime() - start.getTime();

        return Math.max(
            0,
            Math.floor(
                difference / 86400000
            )
        );
    }


    function getLeadAgeLabel(value) {
        const age = getLeadAgeInDays(value);

        if (age === null) {
            return "-";
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
    // DATE FORMAT
    // ========================================================

    function formatDate(value) {
        const date = parseCalendarDate(value);

        if (!date) {
            return "-";
        }

        return date.toLocaleDateString(
            "en-GB",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );
    }


    function formatDateTime(value) {
        const date = parseCalendarDate(value);

        if (!date) {
            return "-";
        }

        return date.toLocaleString(
            "en-GB",
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        );
    }


    // ========================================================
    // ESCAPE HTML
    // ========================================================

    function escapeHtml(value) {
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
    // FOLLOW UP HELPER
    // ========================================================

    function getFollowUpDate(customer) {
        if (!customer) {
            return null;
        }

        return (
            customer.follow_up_date ||
            customer.last_follow_up ||
            null
        );
    }


    // ========================================================
    // STATUS
    // ========================================================

    function normalizeStatus(status) {
        if (!status) {
            return "New";
        }

        return String(status).trim();
    }


    function getStatusClass(status) {
        const normalized = normalizeStatus(status)
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/\//g, "-");

        return `status-${normalized}`;
    }


    // ========================================================
    // JOURNEY DATE
    // ========================================================

    function getJourneyDate(customer, stage) {
        if (!customer) {
            return null;
        }

        switch (stage) {
            case "New":
                return customer.status_started_at || null;

            case "First Contact":
                return (
                    customer.first_contact ||
                    customer.contact_date ||
                    customer.last_follow_up ||
                    null
                );

            case "Appointment":
                return customer.appointment || null;

            case "Site Survey":
                return customer.site_survey || null;

            case "Quotation":
                return customer.quotation || null;

            case "Second Appointment":
                return (
                    customer.second_appointment ||
                    customer.second_meeting ||
                    null
                );

            case "Deal":
                return customer.closing || null;

            default:
                return null;
        }
    }


    // ========================================================
    // CUSTOMER JOURNEY
    // ========================================================

    function renderCustomerJourney(customer) {
        const stages = [
            {
                key: "New",
                label: "New"
            },
            {
                key: "First Contact",
                label: "First Contact"
            },
            {
                key: "Appointment",
                label: "Appointment"
            },
            {
                key: "Site Survey",
                label: "Site Survey"
            },
            {
                key: "Quotation",
                label: "Quotation"
            },
            {
                key: "Second Appointment",
                label: "Second Appointment"
            },
            {
                key: "Deal",
                label: "Deal"
            }
        ];

        const currentStatus =
            normalizeStatus(customer.status);

        const currentIndex =
            stages.findIndex(
                stage =>
                    stage.key.toLowerCase() ===
                    currentStatus.toLowerCase()
            );

        return stages.map(
            (stage, index) => {
                const dateValue =
                    getJourneyDate(
                        customer,
                        stage.key
                    );

                const hasDate =
                    !!dateValue;

                let stateClass = "";

                if (
                    currentIndex >= 0 &&
                    index < currentIndex
                ) {
                    stateClass = "completed";
                } else if (
                    currentIndex === index
                ) {
                    stateClass = "active";
                } else if (hasDate) {
                    stateClass = "completed";
                }

                return `
                    <div class="customer-journey-item ${stateClass}">
                        <div class="customer-journey-dot"></div>

                        <div class="customer-journey-content">
                            <div class="customer-journey-title">
                                ${escapeHtml(stage.label)}
                            </div>

                            <div class="customer-journey-date">
                                ${
                                    hasDate
                                        ? escapeHtml(
                                            formatDate(dateValue)
                                        )
                                        : "-"
                                }
                            </div>
                        </div>
                    </div>
                `;
            }
        ).join("");
    }


    // ========================================================
    // DOCUMENTS
    // ========================================================

    function renderCustomerDocuments(customer) {
        return `
            <div class="customer-profile-section customer-documents-section">

                <div class="customer-profile-section-header">
                    <div>
                        <h3>Documents</h3>
                        <p>Customer related documents</p>
                    </div>

                    <label
                        class="customer-document-upload"
                        for="customerDocumentUpload"
                    >
                        Upload PDF
                    </label>

                    <input
                        type="file"
                        id="customerDocumentUpload"
                        accept="application/pdf"
                        style="display:none;"
                    >
                </div>

                <div class="customer-document-list">
                    <div class="customer-document-empty">
                        No documents uploaded.
                    </div>
                </div>

            </div>
        `;
    }


    // ========================================================
    // CUSTOMER PROFILE
    // ========================================================

    function renderCustomerProfile(customer) {
        if (!customer) {
            return `
                <div class="customer-profile-empty">
                    Customer not found.
                </div>
            `;
        }

        // ====================================================
        // IMPORTANT:
        // INPUT DATE MUST BE THE SAME AS LEADS
        // ====================================================

        const inputDateValue =
            customer.status_started_at;

        const inputDate =
            formatDate(inputDateValue);

        const customerAge =
            getLeadAgeInDays(inputDateValue);

        const customerAgeLabel =
            getLeadAgeLabel(inputDateValue);


        // ====================================================
        // CUSTOMER DATA
        // ====================================================

        const customerName =
            customer.customer_name || "-";

        const phone =
            customer.phone || "-";

        const email =
            customer.email || "-";

        const business =
            customer.business || "-";

        const location =
            customer.location || "-";

        const salesName =
            customer.sales_name ||
            customer.sales ||
            "-";

        const status =
            normalizeStatus(customer.status);


        // ====================================================
        // NOTES
        // ====================================================

        const notes =
            customer.notes || "";


        // ====================================================
        // PROFILE HTML
        // ====================================================

        return `
            <div class="customer-profile-container">

                <!-- ==========================================
                     PROFILE HEADER
                =========================================== -->

                <div class="customer-profile-header">

                    <div class="customer-profile-header-left">

                        <button
                            type="button"
                            class="customer-profile-back-btn"
                            onclick="window.crmBackToLeads()"
                        >
                            <i data-lucide="arrow-left"></i>
                            Back to Leads
                        </button>

                        <div class="customer-profile-avatar">
                            ${escapeHtml(
                                customerName
                                    .charAt(0)
                                    .toUpperCase()
                            )}
                        </div>

                        <div class="customer-profile-title">

                            <h1>
                                ${escapeHtml(customerName)}
                            </h1>

                            <div class="customer-profile-status-row">

                                <span
                                    class="customer-profile-status ${getStatusClass(status)}"
                                >
                                    ${escapeHtml(status)}
                                </span>

                            </div>

                        </div>

                    </div>


                    <div class="customer-profile-header-actions">

                        <button
                            type="button"
                            class="btn btn-secondary"
                            onclick="window.crmBackToLeads()"
                        >
                            <i data-lucide="list"></i>
                            Leads
                        </button>

                    </div>

                </div>


                <!-- ==========================================
                     TOP INFORMATION CARDS
                =========================================== -->

                <div class="customer-profile-stats">

                    <!-- INPUT DATE -->
                    <div class="customer-profile-stat-card">

                        <div class="customer-profile-stat-icon">
                            <i data-lucide="calendar-days"></i>
                        </div>

                        <div class="customer-profile-stat-content">

                            <div class="customer-profile-stat-label">
                                INPUT DATE
                            </div>

                            <div class="customer-profile-stat-value">
                                ${escapeHtml(inputDate)}
                            </div>

                            <div class="customer-profile-stat-subtitle">
                                ${escapeHtml(customerAgeLabel)}
                            </div>

                        </div>

                    </div>


                    <!-- DAYS SINCE INPUT -->
                    <div class="customer-profile-stat-card">

                        <div class="customer-profile-stat-icon">
                            <i data-lucide="clock-3"></i>
                        </div>

                        <div class="customer-profile-stat-content">

                            <div class="customer-profile-stat-label">
                                ${escapeHtml(customerAgeLabel)}
                            </div>

                            <div class="customer-profile-stat-value">
                                ${escapeHtml(customerAgeLabel)}
                            </div>

                            <div class="customer-profile-stat-subtitle">
                                SINCE INPUT
                            </div>

                        </div>

                    </div>


                    <!-- CUSTOMER CREATED -->
                    <div class="customer-profile-stat-card">

                        <div class="customer-profile-stat-icon">
                            <i data-lucide="user-plus"></i>
                        </div>

                        <div class="customer-profile-stat-content">

                            <div class="customer-profile-stat-label">
                                CUSTOMER CREATED
                            </div>

                            <div class="customer-profile-stat-value">
                                ${escapeHtml(inputDate)}
                            </div>

                            <div class="customer-profile-stat-subtitle">
                                Input Date ${escapeHtml(inputDate)}
                            </div>

                        </div>

                    </div>

                </div>


                <!-- ==========================================
                     CUSTOMER INFORMATION
                =========================================== -->

                <div class="customer-profile-section">

                    <div class="customer-profile-section-header">

                        <div>
                            <h3>Customer Information</h3>
                            <p>Customer details and sales assignment</p>
                        </div>

                    </div>


                    <div class="customer-profile-info-grid">

                        <div class="customer-profile-info-item">

                            <span class="customer-profile-info-label">
                                Customer Name
                            </span>

                            <span class="customer-profile-info-value">
                                ${escapeHtml(customerName)}
                            </span>

                        </div>


                        <div class="customer-profile-info-item">

                            <span class="customer-profile-info-label">
                                WhatsApp
                            </span>

                            <span class="customer-profile-info-value">
                                ${escapeHtml(phone)}
                            </span>

                        </div>


                        <div class="customer-profile-info-item">

                            <span class="customer-profile-info-label">
                                Email
                            </span>

                            <span class="customer-profile-info-value">
                                ${escapeHtml(email)}
                            </span>

                        </div>


                        <div class="customer-profile-info-item">

                            <span class="customer-profile-info-label">
                                Business
                            </span>

                            <span class="customer-profile-info-value">
                                ${escapeHtml(business)}
                            </span>

                        </div>


                        <div class="customer-profile-info-item">

                            <span class="customer-profile-info-label">
                                Location
                            </span>

                            <span class="customer-profile-info-value">
                                ${escapeHtml(location)}
                            </span>

                        </div>


                        <div class="customer-profile-info-item">

                            <span class="customer-profile-info-label">
                                Sales
                            </span>

                            <span class="customer-profile-info-value">
                                ${escapeHtml(salesName)}
                            </span>

                        </div>

                    </div>

                </div>


                <!-- ==========================================
                     CUSTOMER JOURNEY
                =========================================== -->

                <div class="customer-profile-section">

                    <div class="customer-profile-section-header">

                        <div>
                            <h3>Customer Journey</h3>
                            <p>Sales process progress</p>
                        </div>

                    </div>


                    <div class="customer-journey">

                        ${renderCustomerJourney(customer)}

                    </div>

                </div>


                <!-- ==========================================
                     NOTES
                =========================================== -->

                <div class="customer-profile-section">

                    <div class="customer-profile-section-header">

                        <div>
                            <h3>Notes</h3>
                            <p>Customer notes and information</p>
                        </div>

                    </div>


                    <div class="customer-profile-notes">

                        ${
                            notes
                                ? escapeHtml(notes)
                                : "No notes available."
                        }

                    </div>

                </div>


                <!-- ==========================================
                     DOCUMENTS
                =========================================== -->

                ${renderCustomerDocuments(customer)}


                <!-- ==========================================
                     RECORD INFORMATION
                =========================================== -->

                <div class="customer-profile-section">

                    <div class="customer-profile-section-header">

                        <div>
                            <h3>Record Information</h3>
                            <p>CRM customer record</p>
                        </div>

                    </div>


                    <div class="customer-profile-info-grid">

                        <div class="customer-profile-info-item">

                            <span class="customer-profile-info-label">
                                Input Date
                            </span>

                            <span class="customer-profile-info-value">
                                ${escapeHtml(inputDate)}
                            </span>

                        </div>


                        <div class="customer-profile-info-item">

                            <span class="customer-profile-info-label">
                                Days Since Input
                            </span>

                            <span class="customer-profile-info-value">
                                ${escapeHtml(customerAgeLabel)}
                            </span>

                        </div>


                        <div class="customer-profile-info-item">

                            <span class="customer-profile-info-label">
                                Status
                            </span>

                            <span class="customer-profile-info-value">
                                ${escapeHtml(status)}
                            </span>

                        </div>

                    </div>

                </div>

            </div>
        `;
    }


    // ========================================================
    // LOAD CUSTOMER
    // ========================================================

    async function loadCustomer(customerId) {

        const supabase = getSupabase();

        if (!supabase) {
            console.error(
                "Supabase client not found."
            );

            return null;
        }

        if (!customerId) {
            console.error(
                "Customer ID is missing."
            );

            return null;
        }

        const {
            data,
            error
        } = await supabase
            .from("leads")
            .select("*")
            .eq("id", customerId)
            .maybeSingle();

        if (error) {
            console.error(
                "Error loading customer:",
                error
            );

            return null;
        }

        return data || null;
    }


    // ========================================================
    // LOAD SALES
    // ========================================================

    async function loadSales() {

        const supabase = getSupabase();

        if (!supabase) {
            return [];
        }

        const {
            data,
            error
        } = await supabase
            .from("sales_users")
            .select("*");

        if (error) {
            console.error(
                "Error loading sales:",
                error
            );

            return [];
        }

        return data || [];
    }


    // ========================================================
    // OPEN CUSTOMER PROFILE
    // ========================================================

    async function openCustomerProfile(customerId) {

        if (!customerId) {
            return;
        }

        currentCustomerId =
            customerId;

        profileLoading = true;

        window.crmCurrentCustomerId =
            customerId;

        const profileContainer =
            document.querySelector(
                "#customerProfile"
            ) ||
            document.querySelector(
                "#customer-profile"
            ) ||
            document.querySelector(
                ".customer-profile"
            );

        if (!profileContainer) {
            console.error(
                "Customer profile container not found."
            );

            profileLoading = false;
            return;
        }

        profileContainer.classList.add(
            "active"
        );

        profileContainer.innerHTML = `
            <div class="customer-profile-loading">
                <div class="customer-profile-loading-spinner"></div>
                <div>Loading customer...</div>
            </div>
        `;


        try {

            const customer =
                await loadCustomer(
                    customerId
                );

            if (!customer) {

                profileContainer.innerHTML = `
                    <div class="customer-profile-empty">

                        <div class="customer-profile-empty-icon">
                            <i data-lucide="user-x"></i>
                        </div>

                        <h3>
                            Customer not found
                        </h3>

                        <p>
                            The customer record could not be loaded.
                        </p>

                        <button
                            type="button"
                            class="btn btn-secondary"
                            onclick="window.crmBackToLeads()"
                        >
                            Back to Leads
                        </button>

                    </div>
                `;

                if (
                    window.lucide &&
                    typeof window.lucide.createIcons ===
                        "function"
                ) {
                    window.lucide.createIcons();
                }

                return;
            }


            // Load sales so existing sales-related
            // functionality remains available.
            await loadSales();


            profileContainer.innerHTML =
                renderCustomerProfile(
                    customer
                );


            if (
                window.lucide &&
                typeof window.lucide.createIcons ===
                    "function"
            ) {
                window.lucide.createIcons();
            }

        } catch (error) {

            console.error(
                "Customer profile error:",
                error
            );

            profileContainer.innerHTML = `
                <div class="customer-profile-empty">

                    <div class="customer-profile-empty-icon">
                        <i data-lucide="alert-circle"></i>
                    </div>

                    <h3>
                        Unable to load customer
                    </h3>

                    <p>
                        Please try again.
                    </p>

                    <button
                        type="button"
                        class="btn btn-secondary"
                        onclick="window.crmBackToLeads()"
                    >
                        Back to Leads
                    </button>

                </div>
            `;

            if (
                window.lucide &&
                typeof window.lucide.createIcons ===
                    "function"
            ) {
                window.lucide.createIcons();
            }

        } finally {

            profileLoading = false;

        }
    }


    // ========================================================
    // REFRESH CUSTOMER PROFILE
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
    // BACK TO LEADS
    // ========================================================

    function backToLeads() {

        currentCustomerId = null;

        window.crmCurrentCustomerId =
            null;

        const profileContainer =
            document.querySelector(
                "#customerProfile"
            ) ||
            document.querySelector(
                "#customer-profile"
            ) ||
            document.querySelector(
                ".customer-profile"
            );

        if (profileContainer) {
            profileContainer.classList.remove(
                "active"
            );
        }

        if (
            typeof window.crmShowPage ===
            "function"
        ) {
            window.crmShowPage("leads");
            return;
        }

        if (
            typeof window.showPage ===
            "function"
        ) {
            window.showPage("leads");
            return;
        }

        const leadsPage =
            document.querySelector(
                "#leadsPage"
            ) ||
            document.querySelector(
                "#leads-page"
            );

        if (leadsPage) {
            leadsPage.classList.add(
                "active"
            );
        }
    }


    // ========================================================
    // CLOSE CUSTOMER PROFILE
    // ========================================================

    function closeCustomerProfile() {
        backToLeads();
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
        closeCustomerProfile;


    window.FSICustomerProfile = {
        open:
            openCustomerProfile,

        refresh:
            refreshCustomerProfile,

        close:
            closeCustomerProfile,

        back:
            backToLeads,

        getCurrentCustomerId:
            function () {
                return currentCustomerId;
            },

        isLoading:
            function () {
                return profileLoading;
            }
    };

})();
