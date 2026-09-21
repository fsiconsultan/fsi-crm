// ============================================================
// FSI CRM - CUSTOMER PROFILE & EDIT MODULE
// ============================================================
// File: Customer Profile Module
//
// Fungsi:
// - Membuka detail customer
// - Menampilkan customer profile
// - Edit customer
// - Update customer ke Supabase
// - Assignment Sales
// - Update pipeline
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


// Gunakan escapeHTML dari helpers.js jika tersedia
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
//
// Email hanya digunakan jika memang ada di database.
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
// GET CURRENT USER ROLE
// ============================================================

function crmProfileIsAdmin() {

    if (!window.currentProfile &&
        typeof currentProfile === "undefined") {
        return false;
    }

    const profile =
        window.currentProfile ||
        currentProfile;

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
// GET CURRENT PROFILE
// ============================================================

function crmGetCurrentProfile() {

    if (window.currentProfile) {
        return window.currentProfile;
    }

    if (
        typeof currentProfile !== "undefined"
    ) {
        return currentProfile;
    }

    return null;
}


// ============================================================
// OPEN CUSTOMER PROFILE
// ============================================================

window.crmOpenCustomerProfile =
    async function (id) {

        if (!id) {

            alert(
                "Customer ID tidak ditemukan."
            );

            return;
        }


        if (
            typeof supabaseClient === "undefined" ||
            !supabaseClient
        ) {

            alert(
                "Supabase belum siap."
            );

            return;
        }


        try {

            // ------------------------------------------------
            // Ambil data dari cache terlebih dahulu
            // ------------------------------------------------

            let customer = null;


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


            // ------------------------------------------------
            // Kalau tidak ada di cache,
            // ambil langsung dari Supabase
            // ------------------------------------------------

            if (!customer) {

                const {
                    data,
                    error
                } = await supabaseClient
                    .from("leads")
                    .select("*")
                    .eq("id", id)
                    .maybeSingle();


                if (error) {

                    console.error(
                        "Customer profile error:",
                        error
                    );


                    alert(
                        "Gagal mengambil data customer:\n\n" +
                        error.message
                    );

                    return;
                }


                if (!data) {

                    alert(
                        "Customer tidak ditemukan."
                    );

                    return;
                }


                customer = data;
            }


            // ------------------------------------------------
            // Simpan customer aktif
            // ------------------------------------------------

            window.crmCurrentCustomerId =
                customer.id;

            window.crmCurrentCustomer =
                customer;


            // ------------------------------------------------
            // Render profile
            // ------------------------------------------------

            crmRenderCustomerProfile(
                customer
            );


            // ------------------------------------------------
            // Navigate
            // ------------------------------------------------

            if (
                typeof window.crmNavigate ===
                "function"
            ) {

                window.crmNavigate(
                    "customerProfile"
                );

            } else {

                crmShowProfilePageFallback();
            }


            crmSetPageTitle(
                "Customer Profile"
            );


            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });


        } catch (error) {

            console.error(
                "crmOpenCustomerProfile error:",
                error
            );


            alert(
                "Terjadi kesalahan:\n\n" +
                error.message
            );
        }
    };


// ============================================================
// BACK TO LEADS
// ============================================================

window.crmCancelCustomerEdit =
    async function () {

        window.crmCurrentCustomerId =
            null;

        window.crmCurrentCustomer =
            null;


        if (
            typeof window.crmNavigate ===
            "function"
        ) {

            window.crmNavigate(
                "leads"
            );

        } else {

            crmShowLeadsPageFallback();
        }


        crmSetPageTitle(
            crmProfileIsAdmin()
                ? "All Leads"
                : "My Leads"
        );


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });


        // Refresh data
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
                    "Refresh leads error:",
                    error
                );
            }
        }
    };


// ============================================================
// EDIT LEAD
// ============================================================

window.editLead =
    async function (id) {

        if (!id) {

            alert(
                "Customer ID tidak ditemukan."
            );

            return;
        }


        await window.crmOpenCustomerProfile(
            id
        );
    };


// ============================================================
// RENDER CUSTOMER PROFILE
// ============================================================

window.crmRenderCustomerProfile =
    function (customer) {

        if (!customer) {
            return;
        }


        window.crmCurrentCustomerId =
            customer.id;

        window.crmCurrentCustomer =
            customer;


        const page =
            document.getElementById(
                "customerProfilePage"
            );


        // ----------------------------------------------------
        // Kalau halaman profile khusus tersedia
        // ----------------------------------------------------

        if (page) {

            page.innerHTML =
                crmBuildCustomerProfileHTML(
                    customer
                );


            crmPopulateEditStatus(
                customer.status
            );


            crmPopulateEditSales(
                customer.sales_id
            );


            crmLoadCustomerActivities(
                customer.id
            );


            return;
        }


        // ----------------------------------------------------
        // Fallback ke elemen profile yang sudah ada
        // ----------------------------------------------------

        crmRenderExistingProfileElements(
            customer
        );
    };


// ============================================================
// BUILD CUSTOMER PROFILE HTML
// ============================================================

function crmBuildCustomerProfileHTML(
    customer
) {

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
                customer.status
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
                        CUSTOMER PROFILE
                    </span>

                    <h2>
                        ${crmProfileEscapeHTML(
                            customerName
                        )}
                    </h2>

                    <p>
                        View and update customer
                        information and sales progress.
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

                </div>


                <div class="crm-edit-grid">


                    <!-- CUSTOMER NAME -->

                    <div class="crm-edit-field">

                        <label>
                            Customer Name
                        </label>

                        <input
                            id="crmEditCustomerName"
                            type="text"
                            value="${crmProfileEscapeHTML(
                                customerName
                            )}"
                            placeholder="Customer name"
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
                            value="${crmProfileEscapeHTML(
                                phone
                            )}"
                            placeholder="Phone / WhatsApp"
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
                            value="${crmProfileEscapeHTML(
                                email
                            )}"
                            placeholder="Email"
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
                            value="${crmProfileEscapeHTML(
                                business
                            )}"
                            placeholder="Business"
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
                            value="${crmProfileEscapeHTML(
                                location
                            )}"
                            placeholder="Location"
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
                            value="${crmProfileEscapeHTML(
                                followUp
                            )}"
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
                            value="${crmProfileEscapeHTML(
                                appointment
                            )}"
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
                            value="${crmProfileEscapeHTML(
                                siteSurvey
                            )}"
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
                            value="${crmProfileEscapeHTML(
                                quotation
                            )}"
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
                            value="${crmProfileEscapeHTML(
                                spk
                            )}"
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
                            value="${crmProfileEscapeHTML(
                                closing
                            )}"
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
                        placeholder="Customer notes..."
                    >${crmProfileEscapeHTML(
                        notes
                    )}</textarea>

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
                    <div class="activity-empty">
                        Loading activities...
                    </div>
                </div>


                <div class="crm-edit-field crm-activity-form">

                    <label>
                        Add Activity Note
                    </label>

                    <textarea
                        id="crmNewActivity"
                        rows="4"
                        placeholder="Write customer activity..."
                    ></textarea>


                    <button
                        type="button"
                        class="primary-btn"
                        onclick="crmAddCustomerActivity()"
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
                    SAVE CHANGES
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


    const editStatus =
        document.getElementById(
            "edit-cust-status"
        );


    if (editStatus) {
        editStatus.value =
            status;
    }
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
        (step, index) => {

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
        Array.isArray(
            window.FSI_CRM?.LEAD_STATUSES
        )
            ? window.FSI_CRM.LEAD_STATUSES
            : (
                typeof LEAD_STATUSES !==
                "undefined"
                    ? LEAD_STATUSES
                    : [
                        "New",
                        "Flyer Sent",
                        "Interested",
                        "Follow Up",
                        "Appointment",
                        "Site Survey",
                        "Quotation",
                        "Closing",
                        "Not Interested"
                    ]
            );


    const normalizedSelected =
        typeof normalizeLeadStatus ===
        "function"
            ? normalizeLeadStatus(
                selectedStatus
            )
            : (
                selectedStatus ||
                "New"
            );


    select.innerHTML = "";


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
                String(status) ===
                String(normalizedSelected)
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


    select.innerHTML = "";


    // --------------------------------------------------------
    // Default option
    // --------------------------------------------------------

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


    // --------------------------------------------------------
    // Sales data
    // --------------------------------------------------------

    const salesData =
        typeof salesUsersData !==
        "undefined" &&
        Array.isArray(salesUsersData)
            ? salesUsersData
            : [];


    salesData
        .filter(
            sales => {

                const role =
                    String(
                        sales.role || ""
                    )
                        .trim()
                        .toLowerCase();

                return (
                    role === "sales" ||
                    role === "salesperson"
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
    // SALES ROLE
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
// SAVE CUSTOMER EDIT
// ============================================================

window.crmSaveCustomerEdit =
    async function () {

        const profile =
            crmGetCurrentProfile();


        if (!profile) {

            alert(
                "User profile belum siap."
            );

            return;
        }


        const id =
            window.crmCurrentCustomerId;


        if (!id) {

            alert(
                "Customer ID tidak ditemukan."
            );

            return;
        }


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

            return;
        }


        const saveButton =
            document.getElementById(
                "crmEditSaveButton"
            );


        try {

            if (saveButton) {

                saveButton.disabled =
                    true;

                saveButton.innerHTML =
                    `
                    <i data-lucide="loader-circle"></i>
                    Saving...
                    `;
            }


            // =================================================
            // BUILD PAYLOAD
            // =================================================

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
                    typeof normalizeLeadStatus ===
                    "function"
                        ? normalizeLeadStatus(
                            document.getElementById(
                                "crmEditStatus"
                            )?.value ||
                            "New"
                        )
                        : (
                            document.getElementById(
                                "crmEditStatus"
                            )?.value ||
                            "New"
                        ),

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
                    profile.id || null
            };


            // =================================================
            // SALES ASSIGNMENT
            // =================================================

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
            // UPDATE SUPABASE
            // =================================================

            const {
                data,
                error
            } = await supabaseClient
                .from("leads")
                .update(payload)
                .eq("id", id)
                .select("*")
                .single();


            if (error) {

                console.error(
                    "Update customer error:",
                    error
                );


                alert(
                    "Gagal mengupdate customer:\n\n" +
                    error.message
                );


                return;
            }


            if (!data) {

                alert(
                    "Data customer tidak dikembalikan oleh Supabase."
                );

                return;
            }


            // =================================================
            // UPDATE LOCAL STATE
            // =================================================

            window.crmCurrentCustomerId =
                data.id;

            window.crmCurrentCustomer =
                data;


            // Update item di leadsData
            if (
                typeof leadsData !==
                "undefined" &&
                Array.isArray(leadsData)
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
                }
            }


            // =================================================
            // REFRESH FILTER OPTIONS
            // =================================================

            if (
                typeof window.loadFilterOptions ===
                "function"
            ) {

                try {

                    await window.loadFilterOptions();

                } catch (error) {

                    console.warn(
                        "Filter refresh error:",
                        error
                    );
                }
            }


            // =================================================
            // REFRESH LEADS
            // =================================================

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
                        "Leads refresh error:",
                        error
                    );
                }
            }


            // =================================================
            // REFRESH DASHBOARD
            // =================================================

            if (
                typeof window.updateDashboard ===
                "function"
            ) {

                try {

                    await window.updateDashboard();

                } catch (error) {

                    console.warn(
                        "Dashboard refresh error:",
                        error
                    );
                }
            }


            // =================================================
            // RENDER UPDATED PROFILE
            // =================================================

            crmRenderCustomerProfile(
                data
            );


            // =================================================
            // KEEP CUSTOMER PROFILE OPEN
            // =================================================

            if (
                typeof window.crmNavigate ===
                "function"
            ) {

                window.crmNavigate(
                    "customerProfile"
                );

            } else {

                crmShowProfilePageFallback();
            }


            crmSetPageTitle(
                "Customer Profile"
            );


            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });


            alert(
                "Customer berhasil diperbarui."
            );


        } catch (error) {

            console.error(
                "crmSaveCustomerEdit error:",
                error
            );


            alert(
                "Terjadi kesalahan:\n\n" +
                error.message
            );


        } finally {

            if (saveButton) {

                saveButton.disabled =
                    false;

                saveButton.innerHTML =
                    `
                    <i data-lucide="save"></i>
                    SAVE CHANGES
                    `;


                if (
                    window.lucide &&
                    typeof window.lucide.createIcons ===
                    "function"
                ) {

                    window.lucide.createIcons();
                }
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
                "Customer ID tidak ditemukan."
            );

            return;
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

            return;
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


            // Hanya kirim created_by kalau profile tersedia
            if (
                profile &&
                profile.id
            ) {

                payload.created_by =
                    profile.id;
            }


            const {
                error
            } = await supabaseClient
                .from("activities")
                .insert([
                    payload
                ]);


            if (error) {

                console.error(
                    "Add activity error:",
                    error
                );


                alert(
                    "Gagal menambahkan activity:\n\n" +
                    error.message
                );

                return;
            }


            textarea.value =
                "";


            await crmLoadCustomerActivities(
                customerId
            );


        } catch (error) {

            console.error(
                "crmAddCustomerActivity error:",
                error
            );


            alert(
                "Terjadi kesalahan:\n\n" +
                error.message
            );
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


    container.innerHTML = `
        <div class="activity-empty">
            Loading activities...
        </div>
    `;


    try {

        const {
            data,
            error
        } = await supabaseClient
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
                "Load activities error:",
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
                                    ${crmProfileEscapeHTML(
                                        createdAt
                                    )}
                                </small>

                            </div>

                        </div>

                    `;
                }
            ).join("");


    } catch (error) {

        console.error(
            "crmLoadCustomerActivities error:",
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
// EXISTING EDIT FUNCTION
// ============================================================
//
// Compatibility dengan kode lama.
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

        // Legacy IDs
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


    if (profilePage) {

        profilePage.classList.remove(
            "hidden"
        );


        profilePage.style.display =
            "";
    }
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


    if (leadsPage) {

        leadsPage.classList.remove(
            "hidden"
        );


        leadsPage.style.display =
            "";
    }
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


// Compatibility dengan setPageTitle lama
if (
    typeof window.setPageTitle !==
    "function"
) {

    window.setPageTitle =
        crmSetPageTitle;
}


// ============================================================
// COMPATIBILITY FUNCTION
// ============================================================

window.openCustomerProfile =
    window.crmOpenCustomerProfile;


// ============================================================
// INITIALIZE ICONS
// ============================================================

function crmRefreshProfileIcons() {

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
            "Lucide profile refresh error:",
            error
        );
    }
}


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        crmRefreshProfileIcons();

    }
);
