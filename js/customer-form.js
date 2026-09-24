// ============================================================
// FSI CRM - CUSTOMER FORM MODULE
// ============================================================
// Fungsi:
// 1. Add Customer popup
// 2. Edit Customer popup
// 3. Load customer dari Supabase
// 4. Save customer baru
// 5. Update customer
// 6. Close popup
//
// TIDAK menangani:
// - Customer Profile
// - Delete
// - Search
// - Filter
// - Pagination
// - Dashboard
// - Manage Sales
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
    // ROLE
    // ========================================================

    function isAdmin() {

        const profile = getProfile();

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


    function isSales() {

        const profile = getProfile();

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


    // ========================================================
    // TOAST
    // ========================================================

    function showToast(message, type) {

        if (
            window.FSIHelpers &&
            typeof window.FSIHelpers.showToast === "function"
        ) {

            window.FSIHelpers.showToast(
                message,
                type || "info"
            );

            return;
        }

        if (
            typeof window.showToast === "function"
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
            typeof window.FSIHelpers.showLoading === "function"
        ) {

            window.FSIHelpers.showLoading(
                message || "Loading..."
            );

            return;
        }

        if (
            typeof window.showLoading === "function"
        ) {

            window.showLoading(
                message || "Loading..."
            );

        }

    }


    function hideLoading() {

        if (
            window.FSIHelpers &&
            typeof window.FSIHelpers.hideLoading === "function"
        ) {

            window.FSIHelpers.hideLoading();

            return;
        }

        if (
            typeof window.hideLoading === "function"
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

        const modal = getModal();

        if (!modal) {

            console.error(
                "FSI CRM: #leadModal tidak ditemukan."
            );

            return false;

        }


        modal.classList.remove("hidden");

        modal.classList.add("show");

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
            typeof window.lucide.createIcons === "function"
        ) {

            window.lucide.createIcons();

        }


        return true;

    }


    function closeModal() {

        const modal = getModal();

        if (!modal) {
            return;
        }


        modal.classList.remove("show");

        modal.classList.add("hidden");

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

        const form = getForm();

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
            getElement("lead-modal-title");

        if (titleElement) {

            titleElement.textContent =
                title;

        }


        // Compatibility dengan ID
        // yang mungkin digunakan JS lama.

        const alternateTitle =
            getElement("leadModalTitle");

        if (alternateTitle) {

            alternateTitle.textContent =
                title;

        }

    }


    function setModalDescription(description) {

        const element =
            getElement("lead-modal-description");

        if (element) {

            element.textContent =
                description;

        }

    }


    function setSaveButtonText(text) {

        const element =
            getElement("lead-save-text");

        if (element) {

            element.textContent =
                text;

            return;

        }


        const button =
            getElement("lead-save-button");

        if (!button) {
            return;
        }


        const span =
            button.querySelector("span");

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
            getElement("lead-sales-group");

        if (!select) {
            return;
        }


        const profile =
            getProfile();


        if (!profile) {
            return;
        }


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


        if (isSales()) {

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

        }

    }


    // ========================================================
    // FIND LOCAL CUSTOMER
    // ========================================================

    function findLocalCustomer(id) {

        const customerId =
            String(id || "").trim();

        if (!customerId) {
            return null;
        }


        const data =
            Array.isArray(window.leadsData)
                ? window.leadsData
                : [];


        return (
            data.find(function (item) {

                return (
                    String(
                        item?.id || ""
                    ).trim() === customerId
                );

            }) || null
        );

    }


    // ========================================================
    // LOAD CUSTOMER
    // ========================================================

    async function loadCustomer(id) {

        const customerId =
            String(id || "").trim();


        if (!customerId) {

            throw new Error(
                "Customer ID tidak ditemukan."
            );

        }


        // Coba data yang sudah ada
        // terlebih dahulu.

        const localCustomer =
            findLocalCustomer(
                customerId
            );


        if (localCustomer) {

            return localCustomer;

        }


        // Kalau tidak ada di halaman
        // sekarang, ambil dari Supabase.

        const supabase =
            getSupabase();


        if (!supabase) {

            throw new Error(
                "Supabase belum tersedia."
            );

        }


        const result =
            await supabase
                .from("leads")
                .select("*")
                .eq("id", customerId)
                .single();


        if (result.error) {

            throw result.error;

        }


        if (!result.data) {

            throw new Error(
                "Customer tidak ditemukan."
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
                "Profile belum siap. Silakan tunggu sebentar.",
                "warning"
            );

            return;

        }


        editingCustomerId = null;

        resetForm();


        setModalTitle(
            "Add Customer"
        );


        setModalDescription(
            "Enter customer information and pipeline status."
        );


        setSaveButtonText(
            "Save Customer"
        );


        setupSalesAssignment();


        if (!openModal()) {
            return;
        }


        setTimeout(function () {

            const input =
                getElement(
                    "leadCustomerName"
                );

            if (input) {

                input.focus();

            }

        }, 100);

    }


    // ========================================================
    // OPEN EDIT CUSTOMER
    // ========================================================

    async function openEditCustomer(id) {

        const customerId =
            String(id || "").trim();


        if (!customerId) {

            showToast(
                "Customer ID tidak ditemukan.",
                "error"
            );

            return;

        }


        const profile =
            getProfile();


        if (!profile) {

            showToast(
                "Profile belum siap.",
                "warning"
            );

            return;

        }


        try {

            showLoading(
                "Memuat data customer..."
            );


            const customer =
                await loadCustomer(
                    customerId
                );


            editingCustomerId =
                customerId;


            resetForm();


            editingCustomerId =
                customerId;


            // ID

            setValue(
                "leadId",
                customer.id
            );


            // Basic information

            setValue(
                "leadCustomerName",
                customer.customer_name
            );


            setValue(
                "leadPhone",
                customer.phone
            );


            setValue(
                "leadBusiness",
                customer.business
            );


            setValue(
                "leadLocation",
                customer.location
            );


            // Status

            setValue(
                "leadStatus",
                customer.status || "New"
            );


            // Pipeline dates

            setValue(
                "leadFollowUp",
                dateValue(
                    customer.follow_up_date
                )
            );


            // =================================================
            // TAMBAHAN LAST FOLLOW UP
            // =================================================

            setValue(
                "leadLastFollowUp",
                dateValue(
                    customer.last_follow_up
                )
            );


            setValue(
                "leadAppointment",
                dateValue(
                    customer.appointment
                )
            );


            setValue(
                "leadSiteSurvey",
                dateValue(
                    customer.site_survey
                )
            );


            setValue(
                "leadQuotation",
                dateValue(
                    customer.quotation
                )
            );


            setFirstValue(
                [
                    "leadSpk",
                    "leadSPK"
                ],
                dateValue(
                    customer.spk
                )
            );


            setValue(
                "leadClosing",
                dateValue(
                    customer.closing
                )
            );


            // Sales assignment

            setFirstValue(
                [
                    "leadSales",
                    "leadSalesAssign"
                ],
                customer.sales_id || ""
            );


            // Notes

            setValue(
                "leadNotes",
                customer.notes
            );


            setModalTitle(
                "Edit Customer"
            );


            setModalDescription(
                "Update customer information and pipeline status."
            );


            setSaveButtonText(
                "Update Customer"
            );


            setupSalesAssignment();


            if (!openModal()) {
                return;
            }


            setTimeout(function () {

                const input =
                    getElement(
                        "leadCustomerName"
                    );

                if (input) {

                    input.focus();

                }

            }, 100);


        } catch (error) {

            console.error(
                "FSI CRM: Open edit customer error:",
                error
            );


            showToast(
                error?.message ||
                "Gagal memuat customer.",
                "error"
            );


        } finally {

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
                "User profile belum tersedia."
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


        if (!customerName) {

            throw new Error(
                "Customer Name wajib diisi."
            );

        }


        if (!phone) {

            throw new Error(
                "Phone wajib diisi."
            );

        }


        const payload = {

            customer_name:
                customerName,

            phone:
                phone,

            business:
                getValue(
                    "leadBusiness"
                ) || null,

            location:
                getValue(
                    "leadLocation"
                ) || null,

            status:
                getValue(
                    "leadStatus"
                ) || "New",

            follow_up_date:
                getValue(
                    "leadFollowUp"
                ) || null,


            // =================================================
            // TAMBAHAN LAST FOLLOW UP
            // =================================================

            last_follow_up:
                getValue(
                    "leadLastFollowUp"
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

            spk:
                getValue(
                    "leadSpk"
                ) || getValue(
                    "leadSPK"
                ) || null,

            closing:
                getValue(
                    "leadClosing"
                ) || null,

            notes:
                getValue(
                    "leadNotes"
                ) || null

        };


        // ----------------------------------------------------
        // SALES ASSIGNMENT
        // ----------------------------------------------------

        if (isAdmin()) {

            const selectedSales =
                getValue(
                    "leadSales"
                ) || getValue(
                    "leadSalesAssign"
                );


            payload.sales_id =
                selectedSales || null;

        }


        if (isSales()) {

            payload.sales_id =
                profile.id || null;

        }


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
                "Supabase belum tersedia.",
                "error"
            );

            return;

        }


        const profile =
            getProfile();


        if (!profile) {

            showToast(
                "Profile user belum tersedia.",
                "error"
            );

            return;

        }


        try {

            customerSaving = true;


            const payload =
                buildPayload();


            const customerId =
                String(
                    getValue("leadId") ||
                    editingCustomerId ||
                    ""
                ).trim();


            const saveButton =
                getElement(
                    "lead-save-button"
                );


            if (saveButton) {

                saveButton.disabled =
                    true;

            }


            showLoading(
                customerId
                    ? "Updating customer..."
                    : "Saving customer..."
            );


            // =================================================
            // UPDATE
            // =================================================

            if (customerId) {

                payload.updated_by =
                    profile.id || null;


                const result =
                    await supabase
                        .from("leads")
                        .update(payload)
                        .eq(
                            "id",
                            customerId
                        );


                if (result.error) {

                    throw result.error;

                }


                showToast(
                    "Customer berhasil diperbarui.",
                    "success"
                );

            }


            // =================================================
            // INSERT
            // =================================================

            else {

                payload.created_by =
                    profile.id || null;

                payload.updated_by =
                    profile.id || null;


                const result =
                    await supabase
                        .from("leads")
                        .insert(payload)
                        .select("*")
                        .single();


                if (result.error) {

                    throw result.error;

                }


                showToast(
                    "Customer berhasil ditambahkan.",
                    "success"
                );

            }


            // =================================================
            // CLOSE
            // =================================================

            closeModal();


            // =================================================
            // REFRESH LEADS
            // =================================================

            if (
                typeof window.loadLeads === "function"
            ) {

                await window.loadLeads(
                    window.currentPage || 1
                );

            }
            else if (
                window.FSILeads &&
                typeof window.FSILeads.loadLeads === "function"
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
                typeof window.FSIDashboard.loadDashboard === "function"
            ) {

                await window.FSIDashboard.loadDashboard();

            }
            else if (
                typeof window.loadDashboard === "function"
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
                                customerId || null
                        }
                    }
                )
            );


        } catch (error) {

            console.error(
                "FSI CRM: Save customer error:",
                error
            );


            showToast(
                error?.message ||
                "Gagal menyimpan customer.",
                "error"
            );


        } finally {

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
            loadCustomer

    };


    // Compatibility names

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
        document.readyState === "loading"
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
