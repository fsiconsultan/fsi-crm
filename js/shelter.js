// ============================================================
// FSI CRM - CUSTOMER PROFILE & ADD / EDIT CUSTOMER MODULE
// ============================================================
// File: js/shelter.js
//
// Fungsi:
// - Add Customer
// - Customer Profile
// - Edit Customer
// - Insert customer baru ke Supabase
// - Update customer ke Supabase
// - Assignment Sales
// - Update pipeline
// - Customer activity
// - Cancel / Back
// ============================================================

"use strict";


// ============================================================
// GLOBAL CUSTOMER STATE
// ============================================================

window.crmCurrentCustomerId =
    window.crmCurrentCustomerId || null;

window.crmCurrentCustomer =
    window.crmCurrentCustomer || null;

window.crmCustomerMode =
    window.crmCustomerMode || "edit";


// ============================================================
// HELPER: GET ELEMENT
// ============================================================

function crmProfileElement(id) {
    return document.getElementById(id);
}


// ============================================================
// HELPER: GET VALUE
// ============================================================

function crmProfileValue(value, fallback = "") {

    if (
        value === null ||
        value === undefined
    ) {
        return fallback;
    }

    return String(value);
}


// ============================================================
// HELPER: ESCAPE HTML
// ============================================================

function crmProfileEscapeHTML(value) {

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


// ============================================================
// FALLBACK ESCAPE HTML
// ============================================================

if (
    typeof window.escapeHTML !== "function"
) {
    window.escapeHTML =
        crmProfileEscapeHTML;
}


// ============================================================
// GET CUSTOMER NAME
// ============================================================

function crmGetCustomerName(customer) {

    if (!customer) {
        return "";
    }

    return (
        customer.customer_name ||
        customer.name ||
        customer.full_name ||
        "Customer"
    );
}


// ============================================================
// GET CUSTOMER LOCATION
// ============================================================

function crmGetCustomerLocation(customer) {

    if (!customer) {
        return "";
    }

    return (
        customer.location ||
        customer.address ||
        ""
    );
}


// ============================================================
// GET CUSTOMER EMAIL
// ============================================================

function crmGetCustomerEmail(customer) {

    if (!customer) {
        return "";
    }

    return customer.email || "";
}


// ============================================================
// GET CUSTOMER PHONE
// ============================================================

function crmGetCustomerPhone(customer) {

    if (!customer) {
        return "";
    }

    return (
        customer.phone ||
        customer.whatsapp ||
        ""
    );
}


// ============================================================
// GET CURRENT PROFILE
// ============================================================

function crmGetCurrentProfile() {

    if (window.currentProfile) {
        return window.currentProfile;
    }

    try {

        if (
            typeof currentProfile !== "undefined" &&
            currentProfile
        ) {
            return currentProfile;
        }

    } catch (error) {
        // Ignore
    }

    return null;
}


// ============================================================
// CHECK ADMIN
// ============================================================

function crmProfileIsAdmin() {

    const profile =
        crmGetCurrentProfile();

    if (!profile) {
        return false;
    }

    const role =
        String(profile.role || "")
            .trim()
            .toLowerCase();

    return (
        role === "admin" ||
        role === "owner" ||
        role === "administrator"
    );
}


// ============================================================
// CHECK SALES
// ============================================================

function crmProfileIsSales() {

    const profile =
        crmGetCurrentProfile();

    if (!profile) {
        return false;
    }

    const role =
        String(profile.role || "")
            .trim()
            .toLowerCase();

    return (
        role === "sales" ||
        role === "salesperson"
    );
}


// ============================================================
// GET SUPABASE
// ============================================================

function crmGetSupabase() {

    if (
        window.supabaseClient
    ) {
        return window.supabaseClient;
    }

    try {

        if (
            typeof supabaseClient !== "undefined" &&
            supabaseClient
        ) {
            return supabaseClient;
        }

    } catch (error) {
        // Ignore
    }

    return null;
}


// ============================================================
// NAVIGATION TO CUSTOMER PROFILE
// ============================================================
//
// Mendukung:
// - customer-profile
// - customerProfile
//
// Ini penting agar kompatibel dengan navigation.js
// dan dashboard.js.
// ============================================================

function crmNavigateToCustomerProfile() {

    // --------------------------------------------------------
    // Prioritas 1: crmNavigate
    // --------------------------------------------------------

    if (
        typeof window.crmNavigate ===
        "function"
    ) {

        let result = false;

        try {

            result =
                window.crmNavigate(
                    "customer-profile"
                );

        } catch (error) {

            console.warn(
                "[Shelter] customer-profile navigation failed:",
                error
            );

        }

        if (result !== false) {
            return true;
        }


        // ----------------------------------------------------
        // Compatibility fallback
        // ----------------------------------------------------

        try {

            result =
                window.crmNavigate(
                    "customerProfile"
                );

        } catch (error) {

            console.warn(
                "[Shelter] customerProfile navigation failed:",
                error
            );

        }

        if (result !== false) {
            return true;
        }
    }


    // --------------------------------------------------------
    // Prioritas 2: FSINavigation
    // --------------------------------------------------------

    if (
        window.FSINavigation &&
        typeof window.FSINavigation.showPage ===
        "function"
    ) {

        let result = false;

        try {

            result =
                window.FSINavigation.showPage(
                    "customer-profile",
                    {
                        keepScroll: false
                    }
                );

        } catch (error) {

            console.warn(
                "[Shelter] FSINavigation error:",
                error
            );

        }

        if (result !== false) {
            return true;
        }


        try {

            result =
                window.FSINavigation.showPage(
                    "customerProfile",
                    {
                        keepScroll: false
                    }
                );

        } catch (error) {

            console.warn(
                "[Shelter] FSINavigation compatibility error:",
                error
            );

        }

        if (result !== false) {
            return true;
        }
    }


    // --------------------------------------------------------
    // Prioritas 3: fallback manual
    // --------------------------------------------------------

    return crmShowProfilePageFallback();
}


// ============================================================
// OPEN ADD CUSTOMER
// ============================================================

window.crmOpenAddCustomer =
    function () {

        const profile =
            crmGetCurrentProfile();


        if (!profile) {

            alert(
                "User profile belum siap. Silakan login kembali."
            );

            return false;
        }


        // ----------------------------------------------------
        // Reset state
        // ----------------------------------------------------

        window.crmCurrentCustomerId =
            null;

        window.crmCustomerMode =
            "add";


        // ----------------------------------------------------
        // Customer baru
        // ----------------------------------------------------

        const newCustomer = {

            id: null,

            customer_name: "",

            phone: "",

            email: "",

            business: "",

            location: "",

            status: "New",

            follow_up_date: null,

            appointment: null,

            site_survey: null,

            quotation: null,

            spk: null,

            closing: null,

            notes: "",

            sales_id:
                crmProfileIsAdmin()
                    ? ""
                    : (
                        profile.id ||
                        ""
                    )

        };


        window.crmCurrentCustomer =
            newCustomer;


        // ----------------------------------------------------
        // Pastikan halaman profile tersedia
        // ----------------------------------------------------

        const page =
            document.getElementById(
                "view-customer-profile"
            ) ||
            document.getElementById(
                "customerProfilePage"
            ) ||
            document.getElementById(
                "customer-profile-container"
            );


        if (!page) {

            console.error(
                "[Shelter] Customer Profile page tidak ditemukan."
            );


            alert(
                "Halaman Customer Profile tidak ditemukan. Periksa index.html."
            );

            return false;
        }


        // ----------------------------------------------------
        // Render form
        // ----------------------------------------------------

        crmRenderCustomerProfile(
            newCustomer
        );


        // ----------------------------------------------------
        // Navigate
        // ----------------------------------------------------

        crmNavigateToCustomerProfile();


        // ----------------------------------------------------
        // Title
        // ----------------------------------------------------

        crmSetPageTitle(
            "Add Customer"
        );


        // ----------------------------------------------------
        // Scroll
        // ----------------------------------------------------

        try {

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        } catch (error) {
            window.scrollTo(0, 0);
        }


        // ----------------------------------------------------
        // Icons
        // ----------------------------------------------------

        setTimeout(
            crmRefreshProfileIcons,
            50
        );


        return true;
    };


// ============================================================
// ADD CUSTOMER ALIASES
// ============================================================

window.addCustomer =
    window.crmOpenAddCustomer;

window.openAddCustomer =
    window.crmOpenAddCustomer;


// ============================================================
// OPEN CUSTOMER PROFILE
// ============================================================

window.crmOpenCustomerProfile =
    async function (id) {

        if (!id) {

            alert(
                "Customer ID tidak ditemukan."
            );

            return false;
        }


        const supabase =
            crmGetSupabase();


        if (!supabase) {

            alert(
                "Supabase belum siap."
            );

            return false;
        }


        try {

            let customer = null;


            // ------------------------------------------------
            // Cari dari cache
            // ------------------------------------------------

            try {

                if (
                    typeof leadsData !== "undefined" &&
                    Array.isArray(leadsData)
                ) {

                    customer =
                        leadsData.find(
                            item =>
                                String(item.id) ===
                                String(id)
                        );
                }

            } catch (error) {
                // Ignore cache error
            }


            // ------------------------------------------------
            // Kalau tidak ada di cache,
            // ambil dari Supabase
            // ------------------------------------------------

            if (!customer) {

                const {
                    data,
                    error
                } = await supabase
                    .from("leads")
                    .select("*")
                    .eq("id", id)
                    .maybeSingle();


                if (error) {

                    console.error(
                        "[Shelter] Customer profile error:",
                        error
                    );


                    alert(
                        "Gagal mengambil data customer:\n\n" +
                        error.message
                    );

                    return false;
                }


                if (!data) {

                    alert(
                        "Customer tidak ditemukan."
                    );

                    return false;
                }


                customer =
                    data;
            }


            // ------------------------------------------------
            // Save state
            // ------------------------------------------------

            window.crmCurrentCustomerId =
                customer.id;

            window.crmCurrentCustomer =
                customer;

            window.crmCustomerMode =
                "edit";


            // ------------------------------------------------
            // Render
            // ------------------------------------------------

            crmRenderCustomerProfile(
                customer
            );


            // ------------------------------------------------
            // Navigate
            // ------------------------------------------------

            crmNavigateToCustomerProfile();


            // ------------------------------------------------
            // Title
            // ------------------------------------------------

            crmSetPageTitle(
                "Customer Profile"
            );


            // ------------------------------------------------
            // Scroll
            // ------------------------------------------------

            try {

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

            } catch (error) {

                window.scrollTo(
                    0,
                    0
                );
            }


            // ------------------------------------------------
            // Icons
            // ------------------------------------------------

            setTimeout(
                crmRefreshProfileIcons,
                50
            );


            return true;


        } catch (error) {

            console.error(
                "[Shelter] crmOpenCustomerProfile error:",
                error
            );


            alert(
                "Terjadi kesalahan:\n\n" +
                (
                    error?.message ||
                    "Unknown error"
                )
            );


            return false;
        }
    };


// ============================================================
// EDIT LEAD COMPATIBILITY
// ============================================================

window.editLead =
    async function (id) {

        if (!id) {

            alert(
                "Customer ID tidak ditemukan."
            );

            return;
        }


        return window.crmOpenCustomerProfile(
            id
        );
    };


// ============================================================
// OPEN CUSTOMER PROFILE COMPATIBILITY
// ============================================================

window.openCustomerProfile =
    window.crmOpenCustomerProfile;


// ============================================================
// CANCEL / BACK
// ============================================================

window.crmCancelCustomerEdit =
    async function () {

        window.crmCurrentCustomerId =
            null;

        window.crmCurrentCustomer =
            null;

        window.crmCustomerMode =
            "edit";


        // ----------------------------------------------------
        // Navigate back to leads
        // ----------------------------------------------------

        if (
            typeof window.crmNavigate ===
            "function"
        ) {

            try {

                window.crmNavigate(
                    "leads"
                );

            } catch (error) {

                console.warn(
                    "[Shelter] Back navigation error:",
                    error
                );

                crmShowLeadsPageFallback();
            }

        } else {

            crmShowLeadsPageFallback();
        }


        // ----------------------------------------------------
        // Title
        // ----------------------------------------------------

        crmSetPageTitle(
            crmProfileIsAdmin()
                ? "All Customers"
                : "My Customers"
        );


        // ----------------------------------------------------
        // Scroll
        // ----------------------------------------------------

        try {

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        } catch (error) {

            window.scrollTo(
                0,
                0
            );
        }


        // ----------------------------------------------------
        // Refresh leads
        // ----------------------------------------------------

        if (
            typeof window.loadLeads ===
            "function"
        ) {

            try {

                const page =
                    typeof currentPage !==
                    "undefined"
                        ? currentPage
                        : 1;


                await window.loadLeads(
                    page
                );

            } catch (error) {

                console.error(
                    "[Shelter] Refresh leads error:",
                    error
                );
            }
        }
    };


// ============================================================
// RENDER CUSTOMER PROFILE
// ============================================================

window.crmRenderCustomerProfile =
    function (customer) {

        if (!customer) {
            return false;
        }


        window.crmCurrentCustomerId =
            customer.id || null;

        window.crmCurrentCustomer =
            customer;


        // ----------------------------------------------------
        // Find profile container
        // ----------------------------------------------------

        const page =
            document.getElementById(
                "customerProfilePage"
            ) ||
            document.getElementById(
                "customer-profile-container"
            );


        if (page) {

            page.innerHTML =
                crmBuildCustomerProfileHTML(
                    customer
                );


            crmPopulateEditStatus(
                customer.status || "New"
            );


            crmPopulateEditSales(
                customer.sales_id || ""
            );


            // ------------------------------------------------
            // Activities
            // ------------------------------------------------

            if (customer.id) {

                crmLoadCustomerActivities(
                    customer.id
                );

            } else {

                const activityContainer =
                    document.getElementById(
                        "crmCustomerActivities"
                    );


                if (activityContainer) {

                    activityContainer.innerHTML = `
                        <div class="activity-empty">
                            Activity akan tersedia setelah customer disimpan.
                        </div>
                    `;
                }
            }


            setTimeout(
                crmRefreshProfileIcons,
                20
            );


            return true;
        }


        // ----------------------------------------------------
        // Fallback
        // ----------------------------------------------------

        crmRenderExistingProfileElements(
            customer
        );


        return false;
    };


// ============================================================
// BUILD CUSTOMER PROFILE HTML
// ============================================================

function crmBuildCustomerProfileHTML(
    customer
) {

    const isAdd =
        !customer.id ||
        window.crmCustomerMode === "add";


    const customerName =
        crmGetCustomerName(
            customer
        );


    const phone =
        crmGetCustomerPhone(
            customer
        );


    const email =
        crmGetCustomerEmail(
            customer
        );


    const business =
        customer.business || "";


    const location =
        crmGetCustomerLocation(
            customer
        );


    const status =
        typeof normalizeLeadStatus ===
        "function"
            ? normalizeLeadStatus(
                customer.status || "New"
            )
            : (
                customer.status ||
                "New"
            );


    const salesId =
        customer.sales_id || "";


    const followUp =
        customer.follow_up_date || "";


    const appointment =
        customer.appointment || "";


    const siteSurvey =
        customer.site_survey || "";


    const quotation =
        customer.quotation || "";


    const spk =
        customer.spk || "";


    const closing =
        customer.closing || "";


    const notes =
        customer.notes || "";


    const pageDescription =
        isAdd
            ? "Create a new customer and start tracking the sales pipeline."
            : "View and update customer information and sales progress.";


    const saveLabel =
        isAdd
            ? "SAVE CUSTOMER"
            : "SAVE CHANGES";


    return `

        <div class="crm-full-edit-page">

            <!-- =========================================
                 TOOLBAR
            ========================================== -->

            <div class="crm-edit-toolbar">

                <button
                    type="button"
                    class="secondary-btn"
                    onclick="crmCancelCustomerEdit()"
                >
                    <i data-lucide="arrow-left"></i>
                    Back to Customers
                </button>


                <div class="crm-edit-toolbar-title">

                    <span class="eyebrow">
                        ${
                            isAdd
                                ? "NEW CUSTOMER"
                                : "CUSTOMER PROFILE"
                        }
                    </span>


                    <h2>
                        ${
                            crmProfileEscapeHTML(
                                isAdd
                                    ? "Add Customer"
                                    : customerName
                            )
                        }
                    </h2>


                    <p>
                        ${
                            crmProfileEscapeHTML(
                                pageDescription
                            )
                        }
                    </p>

                </div>

            </div>


            <!-- =========================================
                 BASIC INFORMATION
            ========================================== -->

            <div class="panel crm-edit-card">

                <div class="panel-header">

                    <div>

                        <div class="eyebrow">
                            CUSTOMER INFORMATION
                        </div>

                        <h3 class="panel-title">
                            Basic Information
                        </h3>

                    </div>


                    <div class="crm-profile-mode-badge">

                        <i
                            data-lucide="${
                                isAdd
                                    ? "user-plus"
                                    : "user-round"
                            }"
                        ></i>

                        ${
                            isAdd
                                ? "New Customer"
                                : "Customer Profile"
                        }

                    </div>

                </div>


                <div class="crm-edit-grid">

                    <!-- CUSTOMER NAME -->

                    <div class="crm-edit-field">

                        <label>
                            Customer Name
                            <span class="required">*</span>
                        </label>

                        <input
                            id="crmEditCustomerName"
                            type="text"
                            value="${
                                crmProfileEscapeHTML(
                                    customerName === "Customer"
                                        ? ""
                                        : customerName
                                )
                            }"
                            placeholder="Customer name"
                            autocomplete="off"
                        >

                    </div>


                    <!-- PHONE -->

                    <div class="crm-edit-field">

                        <label>
                            Phone / WhatsApp
                        </label>

                        <input
                            id="crmEditPhone"
                            type="text"
                            value="${
                                crmProfileEscapeHTML(
                                    phone
                                )
                            }"
                            placeholder="Phone / WhatsApp"
                            autocomplete="off"
                        >

                    </div>


                    <!-- EMAIL -->

                    <div class="crm-edit-field">

                        <label>
                            Email
                        </label>

                        <input
                            id="crmEditEmail"
                            type="email"
                            value="${
                                crmProfileEscapeHTML(
                                    email
                                )
                            }"
                            placeholder="Email"
                            autocomplete="off"
                        >

                    </div>


                    <!-- BUSINESS -->

                    <div class="crm-edit-field">

                        <label>
                            Business
                        </label>

                        <input
                            id="crmEditBusiness"
                            type="text"
                            value="${
                                crmProfileEscapeHTML(
                                    business
                                )
                            }"
                            placeholder="Business / Company"
                        >

                    </div>


                    <!-- LOCATION -->

                    <div class="crm-edit-field">

                        <label>
                            Location
                        </label>

                        <input
                            id="crmEditLocation"
                            type="text"
                            value="${
                                crmProfileEscapeHTML(
                                    location
                                )
                            }"
                            placeholder="Customer location"
                        >

                    </div>


                    <!-- STATUS -->

                    <div class="crm-edit-field">

                        <label>
                            Status
                        </label>

                        <select
                            id="crmEditStatus"
                        ></select>

                    </div>


                    <!-- SALES -->

                    <div class="crm-edit-field">

                        <label>
                            Sales
                        </label>

                        <select
                            id="crmEditSales"
                        ></select>

                    </div>

                </div>

            </div>


            <!-- =========================================
                 SALES PIPELINE
            ========================================== -->

            <div class="panel crm-edit-card">

                <div class="panel-header">

                    <div>

                        <div class="eyebrow">
                            SALES PIPELINE
                        </div>

                        <h3 class="panel-title">
                            Customer Progress
                        </h3>

                    </div>

                </div>


                <div class="crm-edit-grid">

                    <!-- FOLLOW UP -->

                    <div class="crm-edit-field">

                        <label>
                            Follow Up
                        </label>

                        <input
                            id="crmEditFollowUp"
                            type="date"
                            value="${
                                crmProfileEscapeHTML(
                                    followUp
                                )
                            }"
                        >

                    </div>


                    <!-- APPOINTMENT -->

                    <div class="crm-edit-field">

                        <label>
                            Appointment
                        </label>

                        <input
                            id="crmEditAppointment"
                            type="date"
                            value="${
                                crmProfileEscapeHTML(
                                    appointment
                                )
                            }"
                        >

                    </div>


                    <!-- SITE SURVEY -->

                    <div class="crm-edit-field">

                        <label>
                            Site Survey
                        </label>

                        <input
                            id="crmEditSiteSurvey"
                            type="date"
                            value="${
                                crmProfileEscapeHTML(
                                    siteSurvey
                                )
                            }"
                        >

                    </div>


                    <!-- QUOTATION -->

                    <div class="crm-edit-field">

                        <label>
                            Quotation
                        </label>

                        <input
                            id="crmEditQuotation"
                            type="date"
                            value="${
                                crmProfileEscapeHTML(
                                    quotation
                                )
                            }"
                        >

                    </div>


                    <!-- SPK -->

                    <div class="crm-edit-field">

                        <label>
                            SPK
                        </label>

                        <input
                            id="crmEditSPK"
                            type="date"
                            value="${
                                crmProfileEscapeHTML(
                                    spk
                                )
                            }"
                        >

                    </div>


                    <!-- CLOSING -->

                    <div class="crm-edit-field">

                        <label>
                            Closing
                        </label>

                        <input
                            id="crmEditClosing"
                            type="date"
                            value="${
                                crmProfileEscapeHTML(
                                    closing
                                )
                            }"
                        >

                    </div>

                </div>

            </div>


            <!-- =========================================
                 NOTES
            ========================================== -->

            <div class="panel crm-edit-card">

                <div class="panel-header">

                    <div>

                        <div class="eyebrow">
                            NOTES
                        </div>

                        <h3 class="panel-title">
                            Customer Notes
                        </h3>

                    </div>

                </div>


                <div class="crm-edit-field">

                    <label>
                        Notes
                    </label>

                    <textarea
                        id="crmEditNotes"
                        rows="7"
                        placeholder="Write customer notes..."
                    >${
                        crmProfileEscapeHTML(
                            notes
                        )
                    }</textarea>

                </div>

            </div>


            <!-- =========================================
                 ACTIVITY
            ========================================== -->

            <div class="panel crm-edit-card">

                <div class="panel-header">

                    <div>

                        <div class="eyebrow">
                            ACTIVITY
                        </div>

                        <h3 class="panel-title">
                            Customer Activity
                        </h3>

                    </div>

                </div>


                <div
                    id="crmCustomerActivities"
                    class="activity-timeline"
                >

                    ${
                        isAdd
                            ? `
                                <div class="activity-empty">
                                    Activity akan tersedia setelah customer disimpan.
                                </div>
                              `
                            : `
                                <div class="activity-empty">
                                    Loading activities...
                                </div>
                              `
                    }

                </div>


                <div class="crm-edit-field crm-activity-form">

                    <label>
                        Add Activity Note
                    </label>


                    <textarea
                        id="crmNewActivity"
                        rows="4"
                        placeholder="${
                            isAdd
                                ? "Save the customer first..."
                                : "Write customer activity..."
                        }"
                        ${isAdd ? "disabled" : ""}
                    ></textarea>


                    <button
                        type="button"
                        class="primary-btn"
                        onclick="crmAddCustomerActivity()"
                        ${isAdd ? "disabled" : ""}
                    >
                        <i data-lucide="plus"></i>
                        Add Activity
                    </button>

                </div>

            </div>


            <!-- =========================================
                 ACTIONS
            ========================================== -->

            <div class="crm-edit-actions">

                <button
                    type="button"
                    class="secondary-btn"
                    onclick="crmCancelCustomerEdit()"
                >
                    CANCEL
                </button>


                <button
                    type="button"
                    id="crmEditSaveButton"
                    class="primary-btn"
                    onclick="crmSaveCustomerEdit()"
                >
                    <i data-lucide="save"></i>
                    ${saveLabel}
                </button>

            </div>

        </div>
    `;
}


// ============================================================
// RENDER EXISTING PROFILE ELEMENTS
// ============================================================

function crmRenderExistingProfileElements(
    customer
) {

    const name =
        crmGetCustomerName(
            customer
        );


    const phone =
        crmGetCustomerPhone(
            customer
        );


    const email =
        crmGetCustomerEmail(
            customer
        );


    const location =
        crmGetCustomerLocation(
            customer
        );


    const status =
        typeof normalizeLeadStatus ===
        "function"
            ? normalizeLeadStatus(
                customer.status
            )
            : (
                customer.status ||
                "New"
            );


    const systemSize =
        customer.system_size ||
        customer.capacity_kwp ||
        customer.kwp ||
        customer.system_size_kwp ||
        "";


    const fields = {

        "cp-name":
            name,

        "cp-phone":
            phone,

        "cp-email":
            email,

        "cp-address":
            location,

        "cp-system-size":
            systemSize || "-",

        "cp-status-badge":
            status

    };


    Object.entries(fields)
        .forEach(
            ([id, value]) => {

                const element =
                    document.getElementById(
                        id
                    );


                if (element) {

                    element.textContent =
                        value;
                }
            }
        );


    crmUpdatePipelineUI(
        status
    );
}


// ============================================================
// UPDATE PIPELINE UI
// ============================================================

function crmUpdatePipelineUI(
    currentStatus
) {

    const steps =
        document.querySelectorAll(
            ".pipeline-step"
        );


    if (!steps.length) {
        return;
    }


    const normalized =
        String(
            currentStatus || ""
        )
            .trim()
            .toLowerCase();


    steps.forEach(
        step => {

            const stepStatus =
                String(
                    step.dataset.step ||
                    ""
                )
                    .trim()
                    .toLowerCase();


            step.classList.remove(
                "active",
                "completed"
            );


            if (
                stepStatus ===
                normalized
            ) {

                step.classList.add(
                    "active"
                );
            }
        }
    );
}


// ============================================================
// GET LEAD STATUSES
// ============================================================

function crmGetLeadStatuses() {

    if (
        window.FSI_CRM &&
        Array.isArray(
            window.FSI_CRM.LEAD_STATUSES
        )
    ) {

        return [
            ...window.FSI_CRM.LEAD_STATUSES
        ];
    }


    try {

        if (
            typeof LEAD_STATUSES !==
            "undefined" &&
            Array.isArray(
                LEAD_STATUSES
            )
        ) {

            return [
                ...LEAD_STATUSES
            ];
        }

    } catch (error) {
        // Ignore
    }


    return [
        "New",
        "Flyer Sent",
        "Interested",
        "Follow Up",
        "Appointment",
        "Site Survey",
        "Quotation",
        "Closing",
        "Not Interested"
    ];
}


// ============================================================
// POPULATE STATUS
// ============================================================

function crmPopulateEditStatus(
    selectedStatus
) {

    const select =
        document.getElementById(
            "crmEditStatus"
        );


    if (!select) {
        return;
    }


    const statuses =
        crmGetLeadStatuses();


    const normalizedSelected =
        typeof normalizeLeadStatus ===
        "function"
            ? normalizeLeadStatus(
                selectedStatus || "New"
            )
            : (
                selectedStatus ||
                "New"
            );


    select.innerHTML =
        "";


    statuses.forEach(
        status => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                status;


            option.textContent =
                status;


            if (
                String(status).toLowerCase() ===
                String(normalizedSelected).toLowerCase()
            ) {

                option.selected =
                    true;
            }


            select.appendChild(
                option
            );
        }
    );
}


// ============================================================
// POPULATE SALES
// ============================================================

function crmPopulateEditSales(
    selectedSalesId
) {

    const select =
        document.getElementById(
            "crmEditSales"
        );


    if (!select) {
        return;
    }


    const profile =
        crmGetCurrentProfile();


    select.innerHTML =
        "";


    const defaultOption =
        document.createElement(
            "option"
        );


    defaultOption.value =
        "";


    defaultOption.textContent =
        "Select Sales";


    select.appendChild(
        defaultOption
    );


    let salesData = [];


    try {

        if (
            typeof salesUsersData !==
            "undefined" &&
            Array.isArray(
                salesUsersData
            )
        ) {

            salesData =
                salesUsersData;

        }

    } catch (error) {
        // Ignore
    }


    salesData
        .filter(
            sales => {

                const role =
                    String(
                        sales.role || ""
                    )
                        .trim()
                        .toLowerCase();


                const status =
                    String(
                        sales.status ||
                        "active"
                    )
                        .trim()
                        .toLowerCase();


                return (
                    (
                        role === "sales" ||
                        role === "salesperson"
                    ) &&
                    status !== "inactive" &&
                    status !== "disabled"
                );
            }
        )
        .forEach(
            sales => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    sales.id;


                option.textContent =
                    sales.name ||
                    sales.full_name ||
                    sales.username ||
                    sales.email ||
                    "Sales";


                if (
                    String(sales.id) ===
                    String(selectedSalesId)
                ) {

                    option.selected =
                        true;
                }


                select.appendChild(
                    option
                );
            }
        );


    // --------------------------------------------------------
    // Sales biasa hanya boleh dirinya sendiri
    // --------------------------------------------------------

    if (
        profile &&
        !crmProfileIsAdmin()
    ) {

        select.value =
            profile.id || "";


        select.disabled =
            true;

    } else {

        select.disabled =
            false;
    }
}


// ============================================================
// SAVE CUSTOMER
// ============================================================

window.crmSaveCustomerEdit =
    async function () {

        const profile =
            crmGetCurrentProfile();


        if (!profile) {

            alert(
                "User profile belum siap."
            );

            return false;
        }


        const supabase =
            crmGetSupabase();


        if (!supabase) {

            alert(
                "Supabase belum siap."
            );

            return false;
        }


        const isAdd =
            window.crmCustomerMode === "add" ||
            !window.crmCurrentCustomerId;


        const id =
            window.crmCurrentCustomerId;


        // ----------------------------------------------------
        // Customer name
        // ----------------------------------------------------

        const nameInput =
            document.getElementById(
                "crmEditCustomerName"
            );


        const customerName =
            nameInput?.value
                ?.trim() || "";


        if (!customerName) {

            alert(
                "Customer name wajib diisi."
            );


            nameInput?.focus();


            return false;
        }


        const saveButton =
            document.getElementById(
                "crmEditSaveButton"
            );


        try {

            if (saveButton) {

                saveButton.disabled =
                    true;


                saveButton.innerHTML = `
                    <i data-lucide="loader-circle"></i>
                    Saving...
                `;


                crmRefreshProfileIcons();
            }


            // ------------------------------------------------
            // Status
            // ------------------------------------------------

            const rawStatus =
                document.getElementById(
                    "crmEditStatus"
                )?.value ||
                "New";


            const normalizedStatus =
                typeof normalizeLeadStatus ===
                "function"
                    ? normalizeLeadStatus(
                        rawStatus
                    )
                    : rawStatus;


            // ------------------------------------------------
            // Build payload
            // ------------------------------------------------

            const payload = {

                customer_name:
                    customerName,

                phone:
                    document.getElementById(
                        "crmEditPhone"
                    )?.value
                        ?.trim() || "",

                business:
                    document.getElementById(
                        "crmEditBusiness"
                    )?.value
                        ?.trim() || "",

                location:
                    document.getElementById(
                        "crmEditLocation"
                    )?.value
                        ?.trim() || "",

                status:
                    normalizedStatus,

                follow_up_date:
                    document.getElementById(
                        "crmEditFollowUp"
                    )?.value ||
                    null,

                appointment:
                    document.getElementById(
                        "crmEditAppointment"
                    )?.value ||
                    null,

                site_survey:
                    document.getElementById(
                        "crmEditSiteSurvey"
                    )?.value ||
                    null,

                quotation:
                    document.getElementById(
                        "crmEditQuotation"
                    )?.value ||
                    null,

                spk:
                    document.getElementById(
                        "crmEditSPK"
                    )?.value ||
                    null,

                closing:
                    document.getElementById(
                        "crmEditClosing"
                    )?.value ||
                    null,

                notes:
                    document.getElementById(
                        "crmEditNotes"
                    )?.value
                        ?.trim() || "",

                updated_by:
                    profile.id ||
                    null

            };


            // ------------------------------------------------
            // Sales assignment
            // ------------------------------------------------

            const salesSelect =
                document.getElementById(
                    "crmEditSales"
                );


            if (
                crmProfileIsAdmin()
            ) {

                payload.sales_id =
                    salesSelect?.value ||
                    null;

            } else {

                payload.sales_id =
                    profile.id ||
                    null;
            }


            // =================================================
            // INSERT
            // =================================================

            if (isAdd) {

                payload.created_by =
                    profile.id ||
                    null;


                const {
                    data,
                    error
                } = await supabase
                    .from("leads")
                    .insert([
                        payload
                    ])
                    .select("*")
                    .single();


                if (error) {

                    console.error(
                        "[Shelter] Insert customer error:",
                        error
                    );


                    alert(
                        "Gagal menambahkan customer:\n\n" +
                        error.message
                    );


                    return false;
                }


                if (!data) {

                    alert(
                        "Customer berhasil disimpan tetapi data tidak dikembalikan oleh Supabase."
                    );


                    return false;
                }


                // ------------------------------------------------
                // State
                // ------------------------------------------------

                window.crmCurrentCustomerId =
                    data.id;


                window.crmCurrentCustomer =
                    data;


                window.crmCustomerMode =
                    "edit";


                // ------------------------------------------------
                // Cache
                // ------------------------------------------------

                try {

                    if (
                        typeof leadsData !==
                        "undefined" &&
                        Array.isArray(
                            leadsData
                        )
                    ) {

                        leadsData.unshift(
                            data
                        );
                    }

                } catch (error) {
                    // Ignore
                }


                // ------------------------------------------------
                // Refresh leads
                // ------------------------------------------------

                if (
                    typeof window.loadLeads ===
                    "function"
                ) {

                    try {

                        await window.loadLeads(
                            1
                        );

                    } catch (error) {

                        console.warn(
                            "[Shelter] Leads refresh error:",
                            error
                        );
                    }
                }


                // ------------------------------------------------
                // Refresh dashboard
                // ------------------------------------------------

                if (
                    typeof window.updateDashboard ===
                    "function"
                ) {

                    try {

                        await window.updateDashboard();

                    } catch (error) {

                        console.warn(
                            "[Shelter] Dashboard refresh error:",
                            error
                        );
                    }
                }


                // ------------------------------------------------
                // Render profile
                // ------------------------------------------------

                crmRenderCustomerProfile(
                    data
                );


                crmNavigateToCustomerProfile();


                crmSetPageTitle(
                    "Customer Profile"
                );


                try {

                    window.scrollTo({
                        top: 0,
                        behavior: "smooth"
                    });

                } catch (error) {

                    window.scrollTo(
                        0,
                        0
                    );
                }


                alert(
                    "Customer berhasil ditambahkan."
                );


                return true;
            }


            // =================================================
            // UPDATE
            // =================================================

            if (!id) {

                alert(
                    "Customer ID tidak ditemukan."
                );

                return false;
            }


            const {
                data,
                error
            } = await supabase
                .from("leads")
                .update(payload)
                .eq("id", id)
                .select("*")
                .single();


            if (error) {

                console.error(
                    "[Shelter] Update customer error:",
                    error
                );


                alert(
                    "Gagal mengupdate customer:\n\n" +
                    error.message
                );


                return false;
            }


            if (!data) {

                alert(
                    "Data customer tidak dikembalikan oleh Supabase."
                );


                return false;
            }


            // ------------------------------------------------
            // Update state
            // ------------------------------------------------

            window.crmCurrentCustomerId =
                data.id;


            window.crmCurrentCustomer =
                data;


            window.crmCustomerMode =
                "edit";


            // ------------------------------------------------
            // Update cache
            // ------------------------------------------------

            try {

                if (
                    typeof leadsData !==
                    "undefined" &&
                    Array.isArray(
                        leadsData
                    )
                ) {

                    const index =
                        leadsData.findIndex(
                            item =>
                                String(item.id) ===
                                String(data.id)
                        );


                    if (index !== -1) {

                        leadsData[index] =
                            data;

                    } else {

                        leadsData.unshift(
                            data
                        );
                    }
                }

            } catch (error) {
                // Ignore
            }


            // ------------------------------------------------
            // Refresh leads
            // ------------------------------------------------

            if (
                typeof window.loadLeads ===
                "function"
            ) {

                try {

                    const page =
                        typeof currentPage !==
                        "undefined"
                            ? currentPage
                            : 1;


                    await window.loadLeads(
                        page
                    );

                } catch (error) {

                    console.warn(
                        "[Shelter] Leads refresh error:",
                        error
                    );
                }
            }


            // ------------------------------------------------
            // Refresh dashboard
            // ------------------------------------------------

            if (
                typeof window.updateDashboard ===
                "function"
            ) {

                try {

                    await window.updateDashboard();

                } catch (error) {

                    console.warn(
                        "[Shelter] Dashboard refresh error:",
                        error
                    );
                }
            }


            // ------------------------------------------------
            // Render updated profile
            // ------------------------------------------------

            crmRenderCustomerProfile(
                data
            );


            crmNavigateToCustomerProfile();


            crmSetPageTitle(
                "Customer Profile"
            );


            try {

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

            } catch (error) {

                window.scrollTo(
                    0,
                    0
                );
            }


            alert(
                "Customer berhasil diperbarui."
            );


            return true;


        } catch (error) {

            console.error(
                "[Shelter] crmSaveCustomerEdit error:",
                error
            );


            alert(
                "Terjadi kesalahan:\n\n" +
                (
                    error?.message ||
                    "Unknown error"
                )
            );


            return false;


        } finally {

            if (saveButton) {

                saveButton.disabled =
                    false;


                const currentlyAdd =
                    window.crmCustomerMode ===
                    "add";


                saveButton.innerHTML = `
                    <i data-lucide="save"></i>
                    ${
                        currentlyAdd
                            ? "SAVE CUSTOMER"
                            : "SAVE CHANGES"
                    }
                `;


                crmRefreshProfileIcons();
            }
        }
    };


// ============================================================
// ADD CUSTOMER ACTIVITY
// ============================================================

window.crmAddCustomerActivity =
    async function () {

        const customerId =
            window.crmCurrentCustomerId;


        if (!customerId) {

            alert(
                "Simpan customer terlebih dahulu sebelum menambahkan activity."
            );

            return false;
        }


        const supabase =
            crmGetSupabase();


        if (!supabase) {

            alert(
                "Supabase belum siap."
            );

            return false;
        }


        const textarea =
            document.getElementById(
                "crmNewActivity"
            );


        const content =
            textarea?.value
                ?.trim() || "";


        if (!content) {

            alert(
                "Isi activity terlebih dahulu."
            );


            textarea?.focus();


            return false;
        }


        try {

            const profile =
                crmGetCurrentProfile();


            const payload = {

                lead_id:
                    customerId,

                content:
                    content
            };


            if (
                profile &&
                profile.id
            ) {

                payload.created_by =
                    profile.id;
            }


            const {
                error
            } = await supabase
                .from("activities")
                .insert([
                    payload
                ]);


            if (error) {

                console.error(
                    "[Shelter] Add activity error:",
                    error
                );


                alert(
                    "Gagal menambahkan activity:\n\n" +
                    error.message
                );


                return false;
            }


            textarea.value =
                "";


            await crmLoadCustomerActivities(
                customerId
            );


            return true;


        } catch (error) {

            console.error(
                "[Shelter] crmAddCustomerActivity error:",
                error
            );


            alert(
                "Terjadi kesalahan:\n\n" +
                (
                    error?.message ||
                    "Unknown error"
                )
            );


            return false;
        }
    };


// ============================================================
// LOAD CUSTOMER ACTIVITIES
// ============================================================

async function crmLoadCustomerActivities(
    customerId
) {

    const container =
        document.getElementById(
            "crmCustomerActivities"
        );


    if (!container) {
        return;
    }


    const supabase =
        crmGetSupabase();


    if (!supabase) {

        container.innerHTML = `
            <div class="activity-empty">
                Supabase belum siap.
            </div>
        `;

        return;
    }


    container.innerHTML = `
        <div class="activity-empty">
            Loading activities...
        </div>
    `;


    try {

        const {
            data,
            error
        } = await supabase
            .from("activities")
            .select("*")
            .eq(
                "lead_id",
                customerId
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (error) {

            console.error(
                "[Shelter] Load activities error:",
                error
            );


            container.innerHTML = `
                <div class="activity-empty">
                    Gagal memuat activity.
                </div>
            `;


            return;
        }


        if (
            !data ||
            data.length === 0
        ) {

            container.innerHTML = `
                <div class="activity-empty">
                    Belum ada activity untuk customer ini.
                </div>
            `;


            return;
        }


        container.innerHTML =
            data.map(
                activity => {

                    const content =
                        crmProfileEscapeHTML(
                            activity.content ||
                            ""
                        );


                    const createdAt =
                        activity.created_at
                            ? new Date(
                                activity.created_at
                            ).toLocaleString(
                                "id-ID"
                            )
                            : "";


                    return `

                        <div class="activity-item">

                            <div class="activity-item-content">

                                <p>
                                    ${content}
                                </p>

                                <small>
                                    ${
                                        crmProfileEscapeHTML(
                                            createdAt
                                        )
                                    }
                                </small>

                            </div>

                        </div>

                    `;
                }
            ).join("");


    } catch (error) {

        console.error(
            "[Shelter] crmLoadCustomerActivities error:",
            error
        );


        container.innerHTML = `
            <div class="activity-empty">
                Gagal memuat activity.
            </div>
        `;
    }
}


// ============================================================
// OPEN EDIT PROFILE
// ============================================================

window.crmOpenEditModal =
    function () {

        const id =
            window.crmCurrentCustomerId;


        if (!id) {

            alert(
                "Customer ID tidak ditemukan."
            );

            return;
        }


        window.crmOpenCustomerProfile(
            id
        );
    };


// ============================================================
// FALLBACK PROFILE PAGE
// ============================================================

function crmShowProfilePageFallback() {

    const pageIds = [

        "view-dashboard",
        "view-leads",
        "view-sales",
        "view-customer-profile",

        "dashboardPage",
        "leadsPage",
        "salesPage",
        "customerProfilePage"
    ];


    pageIds.forEach(
        id => {

            const page =
                document.getElementById(
                    id
                );


            if (!page) {
                return;
            }


            page.classList.add(
                "hidden"
            );


            page.style.display =
                "none";
        }
    );


    const profilePage =
        document.getElementById(
            "view-customer-profile"
        ) ||
        document.getElementById(
            "customerProfilePage"
        );


    if (!profilePage) {

        console.error(
            "[Shelter] view-customer-profile tidak ditemukan."
        );

        return false;
    }


    profilePage.classList.remove(
        "hidden"
    );


    profilePage.style.display =
        "block";


    profilePage.style.visibility =
        "visible";


    profilePage.style.opacity =
        "1";


    return true;
}


// ============================================================
// FALLBACK LEADS PAGE
// ============================================================

function crmShowLeadsPageFallback() {

    const pageIds = [

        "view-dashboard",
        "view-leads",
        "view-sales",
        "view-customer-profile",

        "dashboardPage",
        "leadsPage",
        "salesPage",
        "customerProfilePage"
    ];


    pageIds.forEach(
        id => {

            const page =
                document.getElementById(
                    id
                );


            if (!page) {
                return;
            }


            page.classList.add(
                "hidden"
            );


            page.style.display =
                "none";
        }
    );


    const leadsPage =
        document.getElementById(
            "view-leads"
        ) ||
        document.getElementById(
            "leadsPage"
        );


    if (!leadsPage) {
        return false;
    }


    leadsPage.classList.remove(
        "hidden"
    );


    leadsPage.style.display =
        "block";


    leadsPage.style.visibility =
        "visible";


    leadsPage.style.opacity =
        "1";


    return true;
}


// ============================================================
// PAGE TITLE
// ============================================================

function crmSetPageTitle(
    title
) {

    const elements = [

        "current-page-title",

        "page-title",

        "pageTitle"
    ];


    elements.forEach(
        id => {

            const element =
                document.getElementById(
                    id
                );


            if (element) {

                element.textContent =
                    title;
            }
        }
    );
}


// ============================================================
// COMPATIBILITY WITH OLD setPageTitle
// ============================================================

if (
    typeof window.setPageTitle !==
    "function"
) {

    window.setPageTitle =
        crmSetPageTitle;
}


// ============================================================
// ICON REFRESH
// ============================================================

function crmRefreshProfileIcons() {

    try {

        if (
            typeof window.refreshIcons ===
            "function"
        ) {

            window.refreshIcons();

            return;
        }


        if (
            window.lucide &&
            typeof window.lucide.createIcons ===
            "function"
        ) {

            window.lucide.createIcons();
        }

    } catch (error) {

        console.warn(
            "[Shelter] Lucide refresh error:",
            error
        );
    }
}


// ============================================================
// ADD CUSTOMER BUTTON BINDING
// ============================================================
//
// Menangkap:
// - #btn-add-lead
// - #btn-add-customer
//
// Dipakai untuk kompatibilitas dengan leads.js lama.
// ============================================================

function crmBindAddCustomerButtons() {

    const buttonIds = [

        "btn-add-lead",

        "btn-add-customer"

    ];


    buttonIds.forEach(
        id => {

            const button =
                document.getElementById(
                    id
                );


            if (!button) {
                return;
            }


            if (
                button.dataset.crmAddCustomerBound ===
                "true"
            ) {
                return;
            }


            button.dataset.crmAddCustomerBound =
                "true";


            button.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    event.stopImmediatePropagation();

                    window.crmOpenAddCustomer();

                },
                true
            );


            // ------------------------------------------------
            // Update label
            // ------------------------------------------------

            const text =
                button.textContent
                    .trim()
                    .toLowerCase();


            if (
                text === "add lead" ||
                text === "add customer" ||
                text.includes("add lead")
            ) {

                button.innerHTML = `
                    <i data-lucide="user-plus"></i>
                    Add Customer
                `;
            }
        }
    );


    crmRefreshProfileIcons();
}


// ============================================================
// DYNAMIC ADD CUSTOMER BUTTON HANDLER
// ============================================================
//
// Jika leads.js merender ulang tombol secara dinamis,
// handler ini tetap menangkap klik.
// ============================================================

document.addEventListener(
    "click",
    function (event) {

        const target =
            event.target?.closest?.(
                "#btn-add-lead, #btn-add-customer"
            );


        if (!target) {
            return;
        }


        if (
            target.dataset.crmAddCustomerBound ===
            "true"
        ) {
            return;
        }


        event.preventDefault();

        event.stopImmediatePropagation();


        window.crmOpenAddCustomer();

    },
    true
);


// ============================================================
// INITIALIZATION
// ============================================================

function crmInitializeShelter() {

    crmBindAddCustomerButtons();

    crmRefreshProfileIcons();


    console.log(
        "FSI Customer Profile module initialized."
    );
}


if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        crmInitializeShelter
    );

} else {

    crmInitializeShelter();
}


// ============================================================
// PUBLIC API
// ============================================================

window.FSICustomerProfile = {

    openAdd:
        window.crmOpenAddCustomer,

    open:
        window.crmOpenCustomerProfile,

    save:
        window.crmSaveCustomerEdit,

    cancel:
        window.crmCancelCustomerEdit,

    render:
        window.crmRenderCustomerProfile,

    addActivity:
        window.crmAddCustomerActivity,

    loadActivities:
        crmLoadCustomerActivities

};
