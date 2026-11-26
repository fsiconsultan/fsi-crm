// ============================================================
// FSI CRM - CUSTOMER FORM MODULE
// ============================================================
//
// File : js/customer/customer-form.js
//
// Fungsi:
// 1. Add Customer popup
// 2. Edit Customer popup
// 3. Load customer dari Supabase
// 4. Save customer baru
// 5. Update customer
// 6. Update updated_at automatically
// 7. Close popup
// 8. Save Email Customer
// 9. Load Email Customer saat Edit
// 10. Role-based Sales Assignment
// 11. Support Sales / Secretary / Digital Marketing
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
// CUSTOMER FORM:
// - Customer Name
// - Phone
// - Email
// - Business
// - Lead Type
// - Location
// - Status
// - Input Date
// - Appointment
// - Site Survey
// - Quotation
// - Assign Sales
// - Notes
//
// ROLE PERMISSION:
//
// Admin:
// - Bisa melihat semua lead
// - Bisa Add Customer
// - Bisa Edit semua lead
// - Bisa Delete semua lead
// - Bisa memilih Sales
//
// Sales:
// - Bisa Add Customer
// - sales_id otomatis = currentProfile.id
// - Bisa Edit lead miliknya sendiri
// - Tidak bisa assign lead ke user lain
//
// Secretary:
// - Bisa Add Customer
// - sales_id otomatis = currentProfile.id
// - Bisa Edit lead miliknya sendiri
// - Tidak bisa assign lead ke user lain
//
// Digital Marketing:
// - Bisa Add Customer
// - sales_id otomatis = currentProfile.id
// - Bisa Edit lead miliknya sendiri
// - Tidak bisa assign lead ke user lain
//
// IMPORTANT RLS:
// - Admin → sales_id berasal dari Sales yang dipilih
// - Non-Admin → sales_id = sales_users.id milik user login
// - BUKAN auth.users.id
//
// Supabase RLS:
// own_lead_insert
// own_lead_update
// own_lead_delete
// own_lead_read
//
// ============================================================


(function () {

    "use strict";


    // ========================================================
    // STATE
    // ========================================================

    let customerFormInitialized = false;

    let editingCustomerId = null;

    let customerSaving = false;


    // ========================================================
    // DOM HELPER
    // ========================================================

    function getElement(id) {

        return document.getElementById(id);

    }


    // ========================================================
    // SUPABASE
    // ========================================================

    function getSupabase() {

        return window.supabaseClient || null;

    }


    // ========================================================
    // PROFILE
    // ========================================================

    function getProfile() {

        return window.currentProfile || null;

    }


    // ========================================================
    // CURRENT USER
    // ========================================================

    function getCurrentUser() {

        return window.currentUser || null;

    }


    // ========================================================
    // ROLE NORMALIZER
    // ========================================================

    function getCurrentRole() {

        const profile =
            getProfile();


        if (!profile) {

            return "";

        }


        return String(
            profile.role || ""
        )
            .trim()
            .toLowerCase();

    }


    // ========================================================
    // ADMIN CHECK
    // ========================================================

    function isAdmin() {

        const role =
            getCurrentRole();


        return (
            role === "admin" ||
            role === "owner" ||
            role === "administrator"
        );

    }


    // ========================================================
    // OWN LEAD ROLE CHECK
    // ========================================================
    //
    // Role yang boleh:
    //
    // - membuat lead sendiri
    // - mengedit lead sendiri
    // - menghapus lead sendiri
    //
    // Admin ditangani secara terpisah.
    //
    // ========================================================

    function canManageOwnLeads() {

        const role =
            getCurrentRole();


        return (
            role === "sales" ||
            role === "salesperson" ||
            role === "secretary" ||
            role === "digital marketing"
        );

    }


    // ========================================================
    // SALES COMPATIBILITY CHECK
    // ========================================================
    //
    // Fungsi lama tetap dipertahankan untuk compatibility.
    //
    // ========================================================

    function isSales() {

        const role =
            getCurrentRole();


        return (
            role === "sales" ||
            role === "salesperson"
        );

    }


    // ========================================================
    // STATUS
    // ========================================================

    function normalizeStatus(status) {

        const rawStatus =
            String(
                status || "New"
            ).trim();


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
    // TOAST
    // ========================================================

    function showToast(message, type) {

        if (
            window.FSIHelpers &&
            typeof window.FSIHelpers.showToast ===
            "function"
        ) {

            window.FSIHelpers.showToast(
                message,
                type || "info"
            );

            return;

        }


        if (
            typeof window.showToast ===
            "function"
        ) {

            window.showToast(
                message,
                type || "info"
            );

            return;

        }


        console.log(
            "FSI CRM:",
            message
        );

    }


    // ========================================================
    // LOADING
    // ========================================================

    function showLoading(message) {

        if (
            window.FSIHelpers &&
            typeof window.FSIHelpers.showLoading ===
            "function"
        ) {

            window.FSIHelpers.showLoading(
                message || "Loading..."
            );

            return;

        }


        if (
            typeof window.showLoading ===
            "function"
        ) {

            window.showLoading(
                message || "Loading..."
            );

        }

    }


    function hideLoading() {

        if (
            window.FSIHelpers &&
            typeof window.FSIHelpers.hideLoading ===
            "function"
        ) {

            window.FSIHelpers.hideLoading();

            return;

        }


        if (
            typeof window.hideLoading ===
            "function"
        ) {

            window.hideLoading();

        }

    }


    // ========================================================
    // MODAL
    // ========================================================

    function getModal() {

        return getElement("leadModal");

    }


    function openModal() {

        const modal =
            getModal();


        if (!modal) {

            console.error(
                "FSI CRM: #leadModal not found."
            );

            return false;

        }


        modal.classList.remove(
            "hidden"
        );

        modal.classList.add(
            "show"
        );

        modal.hidden = false;

        modal.style.display = "flex";

        modal.style.visibility = "visible";

        modal.style.opacity = "1";

        modal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.classList.add(
            "modal-open"
        );


        if (
            window.lucide &&
            typeof window.lucide.createIcons ===
            "function"
        ) {

            window.lucide.createIcons();

        }


        return true;

    }


    function closeModal() {

        const modal =
            getModal();


        if (!modal) {

            return;

        }


        modal.classList.remove(
            "show"
        );

        modal.classList.add(
            "hidden"
        );

        modal.hidden = true;

        modal.style.display = "none";

        modal.style.visibility = "hidden";

        modal.style.opacity = "0";

        modal.setAttribute(
            "aria-hidden",
            "true"
        );


        document.body.classList.remove(
            "modal-open"
        );


        editingCustomerId = null;

        customerSaving = false;

    }


    // ========================================================
    // FORM
    // ========================================================

    function getForm() {

        return getElement("lead-form");

    }


    function resetForm() {

        const form =
            getForm();


        if (form) {

            form.reset();

        }


        const leadId =
            getElement("leadId");


        if (leadId) {

            leadId.value = "";

        }


        editingCustomerId = null;

    }


    function setValue(id, value) {

        const element =
            getElement(id);


        if (!element) {

            return;

        }


        element.value =
            value == null
                ? ""
                : String(value);

    }


    function setFirstValue(ids, value) {

        const list =
            Array.isArray(ids)
                ? ids
                : [ids];


        for (const id of list) {

            const element =
                getElement(id);


            if (element) {

                element.value =
                    value == null
                        ? ""
                        : String(value);

                return;

            }

        }

    }


    function getValue(id) {

        const element =
            getElement(id);


        if (!element) {

            return "";

        }


        return String(
            element.value || ""
        ).trim();

    }


    // ========================================================
    // BUSINESS OPTIONS
    // ========================================================

    const CUSTOMER_BUSINESS_OPTIONS = [

        "Residential",

        "Villa",

        "Hotel",

        "Restaurant",

        "Office",

        "Factory",

        "Commercial",

        "EPC",

        "Other"

    ];


    const PARTNER_BUSINESS_OPTIONS = [

        "Real Estate",

        "Kontraktor",

        "Arsitek",

        "Developer",

        "Interior",

        "Property Agent",

        "Villa Management",

        "Hotel / HOREKA",

        "Electrical Contractor",

        "Supplier",

        "EPC",

        "Other"

    ];


    function setupBusinessOptions(
        leadType,
        selectedBusiness
    ) {

        const select =
            getElement("leadBusiness");


        if (!select) {

            return;

        }


        const type =
            String(
                leadType || "Customer"
            )
                .trim()
                .toLowerCase() ===
            "partner"
                ? "Partner"
                : "Customer";


        const currentValue =
            selectedBusiness != null
                ? String(
                    selectedBusiness
                ).trim()
                : "";


        const options =
            type === "Partner"
                ? PARTNER_BUSINESS_OPTIONS
                : CUSTOMER_BUSINESS_OPTIONS;


        select.innerHTML = "";


        const placeholder =
            document.createElement(
                "option"
            );


        placeholder.value = "";

        placeholder.textContent =
            "Select Business";


        select.appendChild(
            placeholder
        );


        options.forEach(
            function (business) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    business;


                option.textContent =
                    business;


                select.appendChild(
                    option
                );

            }
        );


        // Compatibility dengan data lama.

        if (
            currentValue &&
            !options.includes(
                currentValue
            )
        ) {

            const existingOption =
                document.createElement(
                    "option"
                );


            existingOption.value =
                currentValue;


            existingOption.textContent =
                currentValue;


            select.appendChild(
                existingOption
            );

        }


        select.value =
            currentValue;

    }


    // ========================================================
    // DATE
    // ========================================================

    function dateValue(value) {

        if (!value) {

            return "";

        }


        const text =
            String(value).trim();


        if (text.length >= 10) {

            return text.substring(
                0,
                10
            );

        }


        return text;

    }


    // ========================================================
    // MODAL TITLE
    // ========================================================

    function setModalTitle(title) {

        const titleElement =
            getElement(
                "lead-modal-title"
            );


        if (titleElement) {

            titleElement.textContent =
                title;

        }


        const alternateTitle =
            getElement(
                "leadModalTitle"
            );


        if (alternateTitle) {

            alternateTitle.textContent =
                title;

        }

    }


    function setModalDescription(
        description
    ) {

        const element =
            getElement(
                "lead-modal-description"
            );


        if (element) {

            element.textContent =
                description;

        }

    }


    function setSaveButtonText(text) {

        const element =
            getElement(
                "lead-save-text"
            );


        if (element) {

            element.textContent =
                text;

            return;

        }


        const button =
            getElement(
                "lead-save-button"
            );


        if (!button) {

            return;

        }


        const span =
            button.querySelector(
                "span"
            );


        if (span) {

            span.textContent =
                text;

        }

    }


    // ========================================================
    // SALES ASSIGNMENT
    // ========================================================

    function setupSalesAssignment() {

        const select =
            getElement("leadSales");


        const group =
            getElement(
                "lead-sales-group"
            );


        if (!select) {

            return;

        }


        const profile =
            getProfile();


        if (!profile) {

            return;

        }


        // ====================================================
        // ADMIN
        // ====================================================

        if (isAdmin()) {

            if (group) {

                group.classList.remove(
                    "hidden"
                );

                group.style.display = "";

            }


            select.disabled = false;


            return;

        }


        // ====================================================
        // SALES / SECRETARY / DIGITAL MARKETING
        // ====================================================
        //
        // Semua role ini:
        //
        // - hanya boleh memiliki lead sendiri
        // - tidak boleh memilih user lain
        // - sales_id otomatis = profile.id
        //
        // ====================================================

        if (canManageOwnLeads()) {

            if (group) {

                group.classList.add(
                    "hidden"
                );

                group.style.display =
                    "none";

            }


            select.value =
                profile.id || "";


            select.disabled = true;


            return;

        }


        // ====================================================
        // UNKNOWN / OTHER ROLE
        // ====================================================
        //
        // Jika role bukan Admin dan bukan role yang boleh
        // mengelola own leads, jangan berikan assignment.
        //
        // ====================================================

        if (group) {

            group.classList.add(
                "hidden"
            );

            group.style.display =
                "none";

        }


        select.value = "";

        select.disabled = true;

    }


    // ========================================================
    // FIND LOCAL CUSTOMER
    // ========================================================

    function findLocalCustomer(id) {

        const customerId =
            String(
                id || ""
            ).trim();


        if (!customerId) {

            return null;

        }


        const data =
            Array.isArray(
                window.leadsData
            )
                ? window.leadsData
                : [];


        return (
            data.find(
                function (item) {

                    return (
                        String(
                            item?.id || ""
                        ).trim() ===
                        customerId
                    );

                }
            ) || null
        );

    }


    // ========================================================
    // LOAD CUSTOMER
    // ========================================================

    async function loadCustomer(id) {

        const customerId =
            String(
                id || ""
            ).trim();


        if (!customerId) {

            throw new Error(
                "Customer ID not found."
            );

        }


        const localCustomer =
            findLocalCustomer(
                customerId
            );


        if (localCustomer) {

            return localCustomer;

        }


        const supabase =
            getSupabase();


        if (!supabase) {

            throw new Error(
                "Supabase is not available."
            );

        }


        const result =
            await supabase
                .from("leads")
                .select("*")
                .eq(
                    "id",
                    customerId
                )
                .single();


        if (result.error) {

            throw result.error;

        }


        if (!result.data) {

            throw new Error(
                "Customer not found."
            );

        }


        return result.data;

    }


    // ========================================================
    // OPEN ADD CUSTOMER
    // ========================================================

    function openAddCustomer() {

        const profile =
            getProfile();


        if (!profile) {

            showToast(
                "Profile is not ready. Please wait a moment.",
                "warning"
            );

            return;

        }


        // Hanya role yang memiliki permission
        // yang boleh menggunakan form.

        if (
            !isAdmin() &&
            !canManageOwnLeads()
        ) {

            showToast(
                "You do not have permission to add customers.",
                "error"
            );

            return;

        }


        editingCustomerId = null;


        resetForm();


        setValue(
            "leadType",
            "Customer"
        );


        setupBusinessOptions(
            "Customer",
            ""
        );


        setValue(
            "leadStatus",
            normalizeStatus(
                "New"
            )
        );


        // ====================================================
        // EMAIL
        // ====================================================

        setValue(
            "leadEmail",
            ""
        );


        // ====================================================
        // SALES ASSIGNMENT
        // ====================================================

        setupSalesAssignment();


        // ====================================================
        // MODAL
        // ====================================================

        setModalTitle(
            "Add Customer"
        );


        setModalDescription(
            "Enter customer information and pipeline status."
        );


        setSaveButtonText(
            "Save Customer"
        );


        if (!openModal()) {

            return;

        }


        setTimeout(
            function () {

                const input =
                    getElement(
                        "leadCustomerName"
                    );


                if (input) {

                    input.focus();

                }

            },
            100
        );

    }


    // ========================================================
    // OPEN EDIT CUSTOMER
    // ========================================================

    async function openEditCustomer(id) {

        const customerId =
            String(
                id || ""
            ).trim();


        if (!customerId) {

            showToast(
                "Customer ID not found.",
                "error"
            );

            return;

        }


        const profile =
            getProfile();


        if (!profile) {

            showToast(
                "Profile is not ready.",
                "warning"
            );

            return;

        }


        try {

            showLoading(
                "Loading customer data..."
            );


            const customer =
                await loadCustomer(
                    customerId
                );


            // =================================================
            // FRONTEND OWNERSHIP CHECK
            // =================================================
            //
            // Admin:
            // - boleh edit semua
            //
            // Sales / Secretary / Digital Marketing:
            // - hanya boleh edit lead sendiri
            //
            // RLS tetap menjadi security utama di database.
            // Check ini hanya untuk UX dan mencegah user
            // mencoba membuka lead milik orang lain.
            //
            // =================================================

            if (
                !isAdmin() &&
                canManageOwnLeads()
            ) {

                const ownLead =
                    String(
                        customer?.sales_id || ""
                    ).trim() ===
                    String(
                        profile.id || ""
                    ).trim();


                if (!ownLead) {

                    throw new Error(
                        "You can only edit your own leads."
                    );

                }

            }


            // Role lain yang bukan Admin / own-lead role
            // tidak boleh mengedit.

            if (
                !isAdmin() &&
                !canManageOwnLeads()
            ) {

                throw new Error(
                    "You do not have permission to edit this lead."
                );

            }


            editingCustomerId =
                customerId;


            resetForm();


            editingCustomerId =
                customerId;


            // =================================================
            // ID
            // =================================================

            setValue(
                "leadId",
                customer.id
            );


            // =================================================
            // BASIC INFORMATION
            // =================================================

            setValue(
                "leadCustomerName",
                customer.customer_name
            );


            setValue(
                "leadPhone",
                customer.phone
            );


            // =================================================
            // EMAIL
            // =================================================

            setValue(
                "leadEmail",
                customer.email
            );


            // =================================================
            // LEAD TYPE
            // =================================================

            const customerLeadType =
                customer.lead_type ||
                "Customer";


            setValue(
                "leadType",
                customerLeadType
            );


            // =================================================
            // BUSINESS
            // =================================================

            setupBusinessOptions(
                customerLeadType,
                customer.business || ""
            );


            // =================================================
            // LOCATION
            // =================================================

            setValue(
                "leadLocation",
                customer.location
            );


            // =================================================
            // STATUS
            // =================================================

            const normalizedStatus =
                normalizeStatus(
                    customer.status ||
                    "New"
                );


            setValue(
                "leadStatus",
                normalizedStatus
            );


            // =================================================
            // STATUS STARTED DATE
            // =================================================

            setValue(
                "leadStatusStartedAt",
                dateValue(
                    customer.status_started_at
                )
            );


            // =================================================
            // APPOINTMENT
            // =================================================

            setValue(
                "leadAppointment",
                dateValue(
                    customer.appointment
                )
            );


            // =================================================
            // SITE SURVEY
            // =================================================

            setValue(
                "leadSiteSurvey",
                dateValue(
                    customer.site_survey
                )
            );


            // =================================================
            // QUOTATION
            // =================================================

            setValue(
                "leadQuotation",
                dateValue(
                    customer.quotation
                )
            );


            // =================================================
            // SALES ASSIGNMENT
            // =================================================

            setFirstValue(
                [
                    "leadSales",
                    "leadSalesAssign"
                ],
                customer.sales_id || ""
            );


            // =================================================
            // NOTES
            // =================================================

            setValue(
                "leadNotes",
                customer.notes
            );


            // =================================================
            // RE-APPLY ROLE PERMISSION
            // =================================================

            setupSalesAssignment();


            // =================================================
            // MODAL
            // =================================================

            setModalTitle(
                "Edit Customer"
            );


            setModalDescription(
                "Update customer information and pipeline status."
            );


            setSaveButtonText(
                "Update Customer"
            );


            if (!openModal()) {

                return;

            }


            setTimeout(
                function () {

                    const input =
                        getElement(
                            "leadCustomerName"
                        );


                    if (input) {

                        input.focus();

                    }

                },
                100
            );


        }
        catch (error) {

            console.error(
                "FSI CRM: Open edit customer error:",
                error
            );


            showToast(
                error?.message ||
                "Unable to load customer.",
                "error"
            );

        }
        finally {

            hideLoading();

        }

    }


    // ========================================================
    // BUILD PAYLOAD
    // ========================================================

    function buildPayload() {

        const profile =
            getProfile();


        if (!profile) {

            throw new Error(
                "User profile is not available."
            );

        }


        const customerName =
            getValue(
                "leadCustomerName"
            );


        const phone =
            getValue(
                "leadPhone"
            );


        // ====================================================
        // EMAIL
        // ====================================================

        const email =
            getValue(
                "leadEmail"
            );


        if (!customerName) {

            throw new Error(
                "Customer Name is required."
            );

        }


        if (!phone) {

            throw new Error(
                "Phone is required."
            );

        }


        // ====================================================
        // STATUS
        // ====================================================

        const rawStatus =
            getValue(
                "leadStatus"
            ) || "New";


        const normalizedStatus =
            normalizeStatus(
                rawStatus
            );


        // ====================================================
        // LEAD TYPE
        // ====================================================

        const leadType =
            getValue(
                "leadType"
            ) || "Customer";


        // ====================================================
        // PAYLOAD
        // ====================================================

        const payload = {

            customer_name:
                customerName,

            phone:
                phone,

            email:
                email || null,

            business:
                getValue(
                    "leadBusiness"
                ) || null,

            location:
                getValue(
                    "leadLocation"
                ) || null,

            lead_type:
                leadType,

            status:
                normalizedStatus,

            status_started_at:
                getValue(
                    "leadStatusStartedAt"
                ) || null,

            appointment:
                getValue(
                    "leadAppointment"
                ) || null,

            site_survey:
                getValue(
                    "leadSiteSurvey"
                ) || null,

            quotation:
                getValue(
                    "leadQuotation"
                ) || null,

            notes:
                getValue(
                    "leadNotes"
                ) || null

        };


        // ====================================================
        // SALES ASSIGNMENT
        // ====================================================
        //
        // ADMIN:
        //   Ambil Sales yang dipilih dari form.
        //
        // SALES:
        //   WAJIB menggunakan profile.id.
        //
        // SECRETARY:
        //   WAJIB menggunakan profile.id.
        //
        // DIGITAL MARKETING:
        //   WAJIB menggunakan profile.id.
        //
        // profile.id = sales_users.id
        //
        // BUKAN:
        // profile."auth_user-id"
        // auth.users.id
        //
        // ====================================================

        if (isAdmin()) {

            const selectedSales =
                getValue(
                    "leadSales"
                ) ||
                getValue(
                    "leadSalesAssign"
                );


            payload.sales_id =
                selectedSales || null;

        }
        else if (canManageOwnLeads()) {

            if (!profile.id) {

                throw new Error(
                    "Profile ID tidak ditemukan. Silakan logout dan login kembali."
                );

            }


            payload.sales_id =
                profile.id;

        }
        else {

            payload.sales_id = null;

        }


        // ====================================================
        // DEBUG
        // ====================================================

        console.log(
            "================================================"
        );

        console.log(
            "FSI CRM - SAVE CUSTOMER DEBUG"
        );

        console.log(
            "Role:",
            profile.role
        );

        console.log(
            "Current Role:",
            getCurrentRole()
        );

        console.log(
            "Is Admin:",
            isAdmin()
        );

        console.log(
            "Can Manage Own Leads:",
            canManageOwnLeads()
        );

        console.log(
            "Is Sales:",
            isSales()
        );

        console.log(
            "Profile ID:",
            profile.id
        );

        console.log(
            "Sales ID:",
            payload.sales_id
        );

        console.log(
            "Email:",
            payload.email
        );

        console.log(
            "Auth User:",
            getCurrentUser()?.id || null
        );

        console.log(
            "Payload:",
            payload
        );

        console.log(
            "================================================"
        );


        return payload;

    }


    // ========================================================
    // SAVE CUSTOMER
    // ========================================================

    async function saveCustomer() {

        if (customerSaving) {

            return;

        }


        const supabase =
            getSupabase();


        if (!supabase) {

            showToast(
                "Supabase is not available.",
                "error"
            );

            return;

        }


        const profile =
            getProfile();


        if (!profile) {

            showToast(
                "User profile is not available.",
                "error"
            );

            return;

        }


        // ====================================================
        // PERMISSION CHECK
        // ====================================================

        if (
            !isAdmin() &&
            !canManageOwnLeads()
        ) {

            showToast(
                "You do not have permission to manage leads.",
                "error"
            );

            return;

        }


        try {

            customerSaving = true;


            // =================================================
            // BUILD PAYLOAD
            // =================================================

            const payload =
                buildPayload();


            // =================================================
            // CUSTOMER ID
            // =================================================

            const customerId =
                String(
                    getValue("leadId") ||
                    editingCustomerId ||
                    ""
                ).trim();


            // =================================================
            // VALIDATE OWN LEAD SALES ID
            // =================================================
            //
            // Untuk Sales / Secretary /
            // Digital Marketing:
            //
            // sales_id WAJIB ada.
            //
            // sales_id harus sama dengan:
            //
            // sales_users.id
            //
            // berdasarkan auth.uid().
            //
            // =================================================

            if (
                canManageOwnLeads() &&
                !payload.sales_id
            ) {

                throw new Error(
                    "Profile ID tidak ditemukan. Silakan logout dan login kembali."
                );

            }


            // =================================================
            // UPDATE OWNERSHIP PROTECTION
            // =================================================
            //
            // Non-Admin tidak boleh mengubah sales_id
            // menjadi milik user lain.
            //
            // =================================================

            if (
                customerId &&
                canManageOwnLeads()
            ) {

                const existingCustomer =
                    await loadCustomer(
                        customerId
                    );


                const existingSalesId =
                    String(
                        existingCustomer?.sales_id || ""
                    ).trim();


                const currentProfileId =
                    String(
                        profile.id || ""
                    ).trim();


                if (
                    existingSalesId &&
                    existingSalesId !==
                    currentProfileId
                ) {

                    throw new Error(
                        "You can only edit your own leads."
                    );

                }


                // Pastikan update tetap menggunakan
                // ownership user yang sedang login.

                payload.sales_id =
                    profile.id;

            }


            // =================================================
            // SAVE BUTTON
            // =================================================

            const saveButton =
                getElement(
                    "lead-save-button"
                );


            if (saveButton) {

                saveButton.disabled =
                    true;

            }


            // =================================================
            // LOADING
            // =================================================

            showLoading(
                customerId
                    ? "Updating customer..."
                    : "Saving customer..."
            );


            // =================================================
            // UPDATE EXISTING CUSTOMER
            // =================================================

            if (customerId) {

                payload.updated_by =
                    profile.id || null;


                payload.updated_at =
                    new Date().toISOString();


                console.log(
                    "FSI CRM: Updating lead:",
                    {
                        id:
                            customerId,

                        payload:
                            payload
                    }
                );


                const result =
                    await supabase
                        .from("leads")
                        .update(payload)
                        .eq(
                            "id",
                            customerId
                        );


                if (result.error) {

                    console.error(
                        "FSI CRM: UPDATE ERROR:",
                        result.error
                    );


                    console.error(
                        "FSI CRM: UPDATE ERROR DETAILS:",
                        {
                            code:
                                result.error.code,

                            message:
                                result.error.message,

                            details:
                                result.error.details,

                            hint:
                                result.error.hint
                        }
                    );


                    throw result.error;

                }


                showToast(
                    "Customer updated successfully.",
                    "success"
                );

            }


            // =================================================
            // INSERT NEW CUSTOMER
            // =================================================

            else {

                payload.created_by =
                    profile.id || null;


                payload.updated_by =
                    profile.id || null;


                const now =
                    new Date().toISOString();


                payload.created_at =
                    now;


                payload.updated_at =
                    now;


                // =================================================
                // FINAL INSERT DEBUG
                // =================================================

                console.log(
                    "================================================"
                );

                console.log(
                    "FSI CRM - INSERT LEAD"
                );

                console.log(
                    "Auth User ID:",
                    getCurrentUser()?.id || null
                );

                console.log(
                    "Profile ID:",
                    profile.id || null
                );

                console.log(
                    "Role:",
                    profile.role || null
                );

                console.log(
                    "Current Role:",
                    getCurrentRole()
                );

                console.log(
                    "Is Admin:",
                    isAdmin()
                );

                console.log(
                    "Can Manage Own Leads:",
                    canManageOwnLeads()
                );

                console.log(
                    "Email:",
                    payload.email || null
                );

                console.log(
                    "Payload.sales_id:",
                    payload.sales_id || null
                );

                console.log(
                    "Full INSERT Payload:",
                    payload
                );

                console.log(
                    "================================================"
                );


                // =================================================
                // INSERT
                // =================================================
                //
                // Sengaja TIDAK menggunakan:
                //
                // .select("*")
                // .single()
                //
                // supaya kita menguji INSERT RLS
                // secara langsung.
                //
                // =================================================

                const result =
                    await supabase
                        .from("leads")
                        .insert(
                            payload
                        );


                if (result.error) {

                    console.error(
                        "FSI CRM: INSERT ERROR:",
                        result.error
                    );


                    console.error(
                        "FSI CRM: INSERT ERROR DETAILS:",
                        {
                            code:
                                result.error.code,

                            message:
                                result.error.message,

                            details:
                                result.error.details,

                            hint:
                                result.error.hint
                        }
                    );


                    throw result.error;

                }


                showToast(
                    "Customer added successfully.",
                    "success"
                );

            }


            // =================================================
            // CLOSE MODAL
            // =================================================

            closeModal();


            // =================================================
            // REFRESH CUSTOMER PROFILE
            // =================================================

            if (
                customerId &&
                typeof window.crmRefreshCustomerProfile ===
                "function"
            ) {

                await window.crmRefreshCustomerProfile();

            }


            // =================================================
            // REFRESH LEADS
            // =================================================

            if (
                typeof window.loadLeads ===
                "function"
            ) {

                await window.loadLeads(
                    window.currentPage || 1
                );

            }
            else if (
                window.FSILeads &&
                typeof window.FSILeads.loadLeads ===
                "function"
            ) {

                await window.FSILeads.loadLeads(
                    window.currentPage || 1
                );

            }


            // =================================================
            // REFRESH DASHBOARD
            // =================================================

            if (
                window.FSIDashboard &&
                typeof window.FSIDashboard.loadDashboard ===
                "function"
            ) {

                await window.FSIDashboard.loadDashboard();

            }
            else if (
                typeof window.loadDashboard ===
                "function"
            ) {

                await window.loadDashboard();

            }


            // =================================================
            // EVENT
            // =================================================

            document.dispatchEvent(
                new CustomEvent(
                    "fsi:lead-changed",
                    {
                        detail: {

                            action:
                                customerId
                                    ? "update"
                                    : "insert",

                            id:
                                customerId ||
                                null

                        }
                    }
                )
            );


        }
        catch (error) {

            console.error(
                "FSI CRM: Save customer error:",
                error
            );


            showToast(
                error?.message ||
                "Unable to save customer.",
                "error"
            );

        }
        finally {

            customerSaving = false;


            const saveButton =
                getElement(
                    "lead-save-button"
                );


            if (saveButton) {

                saveButton.disabled =
                    false;

            }


            hideLoading();

        }

    }


    // ========================================================
    // BUTTON EVENTS
    // ========================================================

    function bindButtons() {

        const closeButton =
            getElement(
                "lead-modal-close"
            );


        if (
            closeButton &&
            !closeButton.dataset.customerFormBound
        ) {

            closeButton.dataset.customerFormBound =
                "true";


            closeButton.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    closeModal();

                }
            );

        }


        const cancelButton =
            getElement(
                "lead-modal-cancel"
            );


        if (
            cancelButton &&
            !cancelButton.dataset.customerFormBound
        ) {

            cancelButton.dataset.customerFormBound =
                "true";


            cancelButton.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    closeModal();

                }
            );

        }


        const form =
            getForm();


        if (
            form &&
            !form.dataset.customerFormBound
        ) {

            form.dataset.customerFormBound =
                "true";


            form.addEventListener(
                "submit",
                function (event) {

                    event.preventDefault();

                    saveCustomer();

                }
            );

        }


        const modal =
            getModal();


        if (
            modal &&
            !modal.dataset.customerFormBound
        ) {

            modal.dataset.customerFormBound =
                "true";


            modal.addEventListener(
                "click",
                function (event) {

                    if (
                        event.target === modal
                    ) {

                        closeModal();

                    }

                }
            );

        }


        // ====================================================
        // LEAD TYPE → BUSINESS
        // ====================================================

        const leadTypeSelect =
            getElement(
                "leadType"
            );


        if (
            leadTypeSelect &&
            !leadTypeSelect.dataset.customerFormBusinessBound
        ) {

            leadTypeSelect.dataset.customerFormBusinessBound =
                "true";


            leadTypeSelect.addEventListener(
                "change",
                function () {

                    setupBusinessOptions(
                        leadTypeSelect.value,
                        ""
                    );

                }
            );

        }

    }


    // ========================================================
    // ESC KEY
    // ========================================================

    function bindKeyboard() {

        if (
            document.body.dataset.customerFormKeyboardBound
        ) {

            return;

        }


        document.body.dataset.customerFormKeyboardBound =
            "true";


        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key !== "Escape"
                ) {

                    return;

                }


                const modal =
                    getModal();


                if (!modal) {

                    return;

                }


                if (
                    modal.classList.contains(
                        "show"
                    )
                ) {

                    closeModal();

                }

            }
        );

    }


    // ========================================================
    // INITIALIZE
    // ========================================================

    function initialize() {

        if (customerFormInitialized) {

            return;

        }


        customerFormInitialized = true;


        bindButtons();

        bindKeyboard();


        console.log(
            "FSI CRM: Customer Form module initialized."
        );

    }


    // ========================================================
    // GLOBAL EXPORT
    // ========================================================

    window.FSICustomerForm = {

        openAddCustomer:
            openAddCustomer,

        openEditCustomer:
            openEditCustomer,

        closeModal:
            closeModal,

        saveCustomer:
            saveCustomer,

        loadCustomer:
            loadCustomer,

        canManageOwnLeads:
            canManageOwnLeads,

        isAdmin:
            isAdmin,

        isSales:
            isSales

    };


    // ========================================================
    // COMPATIBILITY NAMES
    // ========================================================

    window.crmOpenAddCustomer =
        openAddCustomer;


    window.crmOpenEditCustomer =
        openEditCustomer;


    window.openAddCustomer =
        openAddCustomer;


    window.openEditCustomer =
        openEditCustomer;


    window.closeCustomerForm =
        closeModal;


    window.saveCustomer =
        saveCustomer;


    // ========================================================
    // DOM READY
    // ========================================================

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    }
    else {

        initialize();

    }


})();
