// ============================================================
// FSI CRM - SALES MANAGEMENT
// File: js/sales.js
// Version: 2026.09
// ============================================================

"use strict";

(function () {

    // ========================================================
    // INTERNAL STATE
    // ========================================================

    let salesLoading = false;
    let salesInitialized = false;
    let salesEventsBound = false;

    // ========================================================
    // DOM HELPER
    // ========================================================

    function salesElement(...ids) {
        for (const id of ids) {
            if (!id) continue;

            const element = document.getElementById(id);

            if (element) {
                return element;
            }
        }

        return null;
    }

    // ========================================================
    // SUPABASE
    // ========================================================

    function getSupabase() {
        return window.supabaseClient || null;
    }

    // ========================================================
    // PROFILE / ROLE
    // ========================================================

    function salesGetProfile() {
        return window.currentProfile || null;
    }

    function getProfileId() {
        const profile = salesGetProfile();

        if (!profile) {
            return "";
        }

        return (
            profile.id ||
            profile.sales_id ||
            ""
        );
    }

    function normalizeRole(role) {
        return String(role || "")
            .trim()
            .toLowerCase();
    }

    function salesIsAdmin() {
        const profile = salesGetProfile();

        if (!profile) {
            return false;
        }

        if (typeof window.isAdminRole === "function") {
            return window.isAdminRole(profile);
        }

        const role = normalizeRole(profile.role);

        return (
            role === "admin" ||
            role === "owner"
        );
    }

    function salesIsSales() {
        const profile = salesGetProfile();

        if (!profile) {
            return false;
        }

        if (typeof window.isSalesRole === "function") {
            return window.isSalesRole(profile);
        }

        return normalizeRole(profile.role) === "sales";
    }

    // ========================================================
    // SALES DISPLAY NAME
    // ========================================================

    function getSalesDisplayName(sales) {
        if (!sales) {
            return "Sales";
        }

        return (
            sales.name ||
            sales.full_name ||
            sales.username ||
            "Sales"
        );
    }

    function getSalesInitial(name) {
        const value = String(name || "S").trim();

        if (!value) {
            return "S";
        }

        const parts = value
            .split(/\s+/)
            .filter(Boolean);

        if (parts.length === 1) {
            return parts[0]
                .substring(0, 2)
                .toUpperCase();
        }

        return (
            parts[0].charAt(0) +
            parts[parts.length - 1].charAt(0)
        ).toUpperCase();
    }

    function getSalesName(id) {
        if (!id) {
            return "-";
        }

        const salesList =
            Array.isArray(window.salesUsersData)
                ? window.salesUsersData
                : [];

        const sales = salesList.find(function (user) {
            return String(user.id) === String(id);
        });

        if (!sales) {
            return "-";
        }

        return getSalesDisplayName(sales);
    }

    // ========================================================
    // ESCAPE HTML
    // ========================================================

    function escapeSalesHTML(value) {
        if (typeof window.escapeHTML === "function") {
            return window.escapeHTML(value);
        }

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // ========================================================
    // STATUS HELPERS
    // ========================================================

    function normalizeSalesStatus(status) {
        const value = String(status || "")
            .trim()
            .toLowerCase();

        if (value === "active") {
            return "Active";
        }

        return "Inactive";
    }

    function getSalesStatusClass(status) {
        return normalizeSalesStatus(status) === "Active"
            ? "status-active"
            : "status-inactive";
    }

    // ========================================================
    // LOAD SALES LOOKUP
    // ========================================================

    async function loadSalesLookup() {

        const supabase = getSupabase();

        if (!supabase) {
            console.error(
                "FSI CRM: Supabase client is not ready."
            );
            return [];
        }

        try {

            /*
             * IMPORTANT:
             * Database column is exactly:
             *
             * auth_user-id
             *
             * We intentionally use select("*") here.
             * This avoids PostgREST problems with the hyphenated
             * column name inside a select string.
             */

            const response = await supabase
                .from("sales_users")
                .select("*")
                .order("name", {
                    ascending: true
                });

            const data = response.data;
            const error = response.error;

            if (error) {
                console.error(
                    "FSI CRM: Load sales lookup error:",
                    error
                );

                return [];
            }

            window.salesUsersData =
                Array.isArray(data)
                    ? data
                    : [];

            populateSalesDropdowns();

            return window.salesUsersData;

        } catch (error) {

            console.error(
                "FSI CRM: loadSalesLookup error:",
                error
            );

            return [];
        }
    }

    // ========================================================
    // GET ACTIVE SALES
    // ========================================================

    function getActiveSales() {

        const salesList =
            Array.isArray(window.salesUsersData)
                ? window.salesUsersData
                : [];

        return salesList
            .filter(function (sales) {

                const role =
                    normalizeRole(sales.role);

                const status =
                    normalizeSalesStatus(
                        sales.status
                    );

                return (
                    role === "sales" &&
                    status === "Active"
                );
            })
            .sort(function (a, b) {

                return getSalesDisplayName(a)
                    .localeCompare(
                        getSalesDisplayName(b),
                        undefined,
                        {
                            sensitivity: "base"
                        }
                    );
            });
    }

    // ========================================================
    // POPULATE SALES FILTER
    // ========================================================

    function populateLeadSalesFilter(activeSales) {

        const salesFilter = salesElement(
            "salesFilter",
            "leadSalesFilter"
        );

        if (!salesFilter) {
            return;
        }

        const currentValue =
            salesFilter.value || "";

        salesFilter.innerHTML = "";

        const allOption =
            document.createElement("option");

        allOption.value = "";
        allOption.textContent = "All Sales";

        salesFilter.appendChild(allOption);

        activeSales.forEach(function (sales) {

            const option =
                document.createElement("option");

            option.value = sales.id || "";

            option.textContent =
                getSalesDisplayName(sales);

            salesFilter.appendChild(option);
        });

        const exists = activeSales.some(
            function (sales) {
                return String(sales.id) ===
                    String(currentValue);
            }
        );

        salesFilter.value =
            exists
                ? currentValue
                : "";
    }

    // ========================================================
    // POPULATE TOP SALES DROPDOWN
    // ========================================================

    function populateTopSalesDropdown(activeSales) {

        const menu = salesElement(
            "salesDropdownMenu"
        );

        if (!menu) {
            return;
        }

        menu.innerHTML = "";

        // ----------------------------------------------------
        // ALL SALES
        // ----------------------------------------------------

        const allButton =
            document.createElement("button");

        allButton.type = "button";
        allButton.className = "nav-dropdown-item";
        allButton.dataset.salesId = "";
        allButton.textContent = "All Sales";

        allButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                selectSalesFilter(
                    "",
                    "All Sales"
                );
            }
        );

        menu.appendChild(allButton);

        // ----------------------------------------------------
        // ACTIVE SALES
        // ----------------------------------------------------

        activeSales.forEach(function (sales) {

            const button =
                document.createElement("button");

            button.type = "button";
            button.className =
                "nav-dropdown-item";

            button.dataset.salesId =
                sales.id || "";

            button.textContent =
                getSalesDisplayName(sales);

            button.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();
                    event.stopPropagation();

                    selectSalesFilter(
                        sales.id,
                        getSalesDisplayName(sales)
                    );
                }
            );

            menu.appendChild(button);
        });
    }

    // ========================================================
    // POPULATE LEAD ASSIGNMENT
    // ========================================================

    function populateLeadAssignment(activeSales) {

        const select = salesElement(
            "leadSalesAssign",
            "lead-sales-assign"
        );

        if (!select) {
            return;
        }

        const currentValue =
            select.value || "";

        select.innerHTML = "";

        const emptyOption =
            document.createElement("option");

        emptyOption.value = "";
        emptyOption.textContent =
            "Select Sales";

        select.appendChild(emptyOption);

        activeSales.forEach(function (sales) {

            const option =
                document.createElement("option");

            option.value =
                sales.id || "";

            option.textContent =
                getSalesDisplayName(sales);

            select.appendChild(option);
        });

        const exists = activeSales.some(
            function (sales) {
                return String(sales.id) ===
                    String(currentValue);
            }
        );

        if (exists) {
            select.value = currentValue;
        }

        setupSalesAssignmentAccess();
    }

    // ========================================================
    // POPULATE ALL DROPDOWNS
    // ========================================================

    function populateSalesDropdowns() {

        const activeSales =
            getActiveSales();

        populateLeadSalesFilter(
            activeSales
        );

        populateTopSalesDropdown(
            activeSales
        );

        populateLeadAssignment(
            activeSales
        );
    }

    // ========================================================
    // SALES ASSIGNMENT ACCESS
    // ========================================================

    function setupSalesAssignmentAccess() {

        const select = salesElement(
            "leadSalesAssign",
            "lead-sales-assign"
        );

        if (!select) {
            return;
        }

        const profile =
            salesGetProfile();

        if (!profile) {
            select.disabled = true;
            return;
        }

        // ----------------------------------------------------
        // ADMIN
        // ----------------------------------------------------

        if (salesIsAdmin()) {

            select.disabled = false;

            select.removeAttribute(
                "aria-disabled"
            );

            return;
        }

        // ----------------------------------------------------
        // SALES
        // ----------------------------------------------------

        if (salesIsSales()) {

            const profileId =
                getProfileId();

            if (profileId) {
                select.value = profileId;
            }

            select.disabled = true;

            select.setAttribute(
                "aria-disabled",
                "true"
            );

            return;
        }

        select.disabled = true;
    }

    // ========================================================
    // LOAD SALES USERS - ADMIN
    // ========================================================

    async function loadSalesUsers() {

        if (!salesIsAdmin()) {

            console.warn(
                "FSI CRM: Only Admin can load Sales management."
            );

            return [];
        }

        const supabase =
            getSupabase();

        if (!supabase) {

            console.error(
                "FSI CRM: Supabase client is not ready."
            );

            return [];
        }

        if (salesLoading) {
            return [];
        }

        salesLoading = true;

        try {

            const response =
                await supabase
                    .from("sales_users")
                    .select("*")
                    .order("created_at", {
                        ascending: true
                    });

            const data =
                response.data;

            const error =
                response.error;

            if (error) {

                console.error(
                    "FSI CRM: Load Sales users error:",
                    error
                );

                renderSalesUsers([]);

                showSalesMessage(
                    error.message ||
                    "Failed to load Sales.",
                    "error"
                );

                return [];
            }

            window.salesUsersData =
                Array.isArray(data)
                    ? data
                    : [];

            window.salesUsersData.sort(
                function (a, b) {

                    return getSalesDisplayName(a)
                        .localeCompare(
                            getSalesDisplayName(b),
                            undefined,
                            {
                                sensitivity: "base"
                            }
                        );
                }
            );

            renderSalesUsers(
                window.salesUsersData
            );

            populateSalesDropdowns();

            return window.salesUsersData;

        } catch (error) {

            console.error(
                "FSI CRM: loadSalesUsers error:",
                error
            );

            renderSalesUsers([]);

            showSalesMessage(
                error.message ||
                "Failed to load Sales.",
                "error"
            );

            return [];

        } finally {

            salesLoading = false;

            if (
                typeof window.refreshIcons ===
                "function"
            ) {
                window.refreshIcons();
            }
        }
    }

    // ========================================================
    // RENDER SALES USERS
    // ========================================================

    function renderSalesUsers(data) {

        const table = salesElement(
            "salesTable",
            "salesTableBody"
        );

        if (!table) {
            return;
        }

        table.innerHTML = "";

        const salesList =
            Array.isArray(data)
                ? data
                : [];

        // ----------------------------------------------------
        // EMPTY STATE
        // ----------------------------------------------------

        if (salesList.length === 0) {

            const tr =
                document.createElement("tr");

            tr.className = "empty-row";

            const td =
                document.createElement("td");

            td.colSpan = 6;

            const wrapper =
                document.createElement("div");

            wrapper.className =
                "empty-state";

            wrapper.innerHTML =
                '<div class="empty-state-icon">' +
                    '<span>👥</span>' +
                '</div>' +
                '<div class="empty-state-title">' +
                    'No Sales found' +
                '</div>' +
                '<div class="empty-state-text">' +
                    'Create a Sales account to start managing your team.' +
                '</div>';

            td.appendChild(wrapper);
            tr.appendChild(td);
            table.appendChild(tr);

            return;
        }

        // ----------------------------------------------------
        // ROWS
        // ----------------------------------------------------

        salesList.forEach(function (sales) {

            const tr =
                document.createElement("tr");

            const name =
                getSalesDisplayName(sales);

            const username =
                sales.username ||
                "-";

            const role =
                sales.role ||
                "Sales";

            const status =
                normalizeSalesStatus(
                    sales.status
                );

            const isActive =
                status === "Active";

            const formattedDate =
                sales.created_at &&
                typeof window.formatDateTime ===
                "function"
                    ? window.formatDateTime(
                        sales.created_at
                    )
                    : (
                        sales.created_at ||
                        "-"
                    );

            // ------------------------------------------------
            // NAME
            // ------------------------------------------------

            const nameTd =
                document.createElement("td");

            const userCell =
                document.createElement("div");

            userCell.className =
                "sales-user-cell";

            const avatar =
                document.createElement("div");

            avatar.className =
                "sales-user-avatar";

            avatar.textContent =
                getSalesInitial(name);

            const info =
                document.createElement("div");

            info.className =
                "sales-user-info";

            const strong =
                document.createElement("strong");

            strong.textContent = name;

            info.appendChild(strong);

            userCell.appendChild(avatar);
            userCell.appendChild(info);

            nameTd.appendChild(userCell);

            // ------------------------------------------------
            // USERNAME
            // ------------------------------------------------

            const usernameTd =
                document.createElement("td");

            usernameTd.textContent =
                username;

            // ------------------------------------------------
            // ROLE
            // ------------------------------------------------

            const roleTd =
                document.createElement("td");

            roleTd.textContent =
                role;

            // ------------------------------------------------
            // STATUS
            // ------------------------------------------------

            const statusTd =
                document.createElement("td");

            const statusBadge =
                document.createElement("span");

            statusBadge.className =
                "status-badge " +
                getSalesStatusClass(status);

            statusBadge.textContent =
                status;

            statusTd.appendChild(
                statusBadge
            );

            // ------------------------------------------------
            // CREATED DATE
            // ------------------------------------------------

            const dateTd =
                document.createElement("td");

            dateTd.textContent =
                formattedDate;

            // ------------------------------------------------
            // ACTION
            // ------------------------------------------------

            const actionTd =
                document.createElement("td");

            const actionButton =
                document.createElement("button");

            actionButton.type = "button";

            actionButton.className =
                "secondary-btn small-btn";

            actionButton.dataset.action =
                "toggle-sales-status";

            actionButton.dataset.salesId =
                sales.id || "";

            actionButton.dataset.currentStatus =
                status;

            actionButton.textContent =
                isActive
                    ? "Deactivate"
                    : "Activate";

            actionTd.appendChild(
                actionButton
            );

            // ------------------------------------------------
            // APPEND
            // ------------------------------------------------

            tr.appendChild(nameTd);
            tr.appendChild(usernameTd);
            tr.appendChild(roleTd);
            tr.appendChild(statusTd);
            tr.appendChild(dateTd);
            tr.appendChild(actionTd);

            table.appendChild(tr);
        });

        if (
            typeof window.refreshIcons ===
            "function"
        ) {
            window.refreshIcons();
        }
    }

    // ========================================================
    // SALES TABLE EVENTS
    // ========================================================

    function bindSalesTableEvents() {

        const table = salesElement(
            "salesTable",
            "salesTableBody"
        );

        if (!table) {
            return;
        }

        table.addEventListener(
            "click",
            async function (event) {

                const button =
                    event.target.closest(
                        '[data-action="toggle-sales-status"]'
                    );

                if (!button) {
                    return;
                }

                event.preventDefault();

                const salesId =
                    button.dataset.salesId || "";

                const currentStatus =
                    button.dataset.currentStatus ||
                    "Inactive";

                await toggleSalesStatus(
                    salesId,
                    currentStatus
                );
            }
        );
    }

    // ========================================================
    // SALES MODAL
    // ========================================================

    function openSalesModal() {

        if (!salesIsAdmin()) {

            showSalesMessage(
                "Only Admin can create Sales accounts.",
                "error"
            );

            return;
        }

        const modal =
            salesElement(
                "salesModal"
            );

        if (!modal) {

            console.error(
                "FSI CRM: Sales modal not found."
            );

            showSalesMessage(
                "Sales modal not found.",
                "error"
            );

            return;
        }

        clearSalesForm();

        const title =
            salesElement(
                "salesModalTitle"
            );

        if (title) {
            title.textContent =
                "Add New Sales";
        }

        modal.classList.add("show");
        modal.style.display = "flex";

        document.body.classList.add(
            "modal-open"
        );

        setTimeout(function () {

            const nameInput =
                salesElement(
                    "salesName"
                );

            if (nameInput) {
                nameInput.focus();
            }

        }, 80);
    }

    // ========================================================
    // CLOSE SALES MODAL
    // ========================================================

    function closeSalesModal() {

        const modal =
            salesElement(
                "salesModal"
            );

        if (!modal) {
            return;
        }

        modal.classList.remove("show");
        modal.style.display = "none";

        document.body.classList.remove(
            "modal-open"
        );
    }

    // ========================================================
    // CLEAR SALES FORM
    // ========================================================

    function clearSalesForm() {

        setSalesValue(
            "salesName",
            ""
        );

        setSalesValue(
            "salesUsername",
            ""
        );

        setSalesValue(
            "salesPassword",
            ""
        );

        const message =
            salesElement(
                "salesFormMessage"
            );

        if (message) {

            message.textContent = "";

            message.style.display =
                "none";

            message.dataset.type = "";
        }
    }

    function setSalesValue(id, value) {

        if (
            typeof window.setValue ===
            "function"
        ) {
            window.setValue(
                id,
                value
            );

            return;
        }

        const element =
            document.getElementById(id);

        if (element) {
            element.value =
                value ?? "";
        }
    }

    // ========================================================
    // CREATE SALES
    // ========================================================

    async function createSales() {

        if (!salesIsAdmin()) {

            showSalesMessage(
                "Only Admin can create Sales accounts.",
                "error"
            );

            return;
        }

        const supabase =
            getSupabase();

        if (!supabase) {

            showSalesMessage(
                "Supabase is not connected.",
                "error"
            );

            return;
        }

        const nameInput =
            salesElement(
                "salesName"
            );

        const usernameInput =
            salesElement(
                "salesUsername"
            );

        const passwordInput =
            salesElement(
                "salesPassword"
            );

        const name =
            nameInput?.value?.trim() ||
            "";

        const username =
            usernameInput?.value?.trim() ||
            "";

        const password =
            passwordInput?.value ||
            "";

        // ----------------------------------------------------
        // VALIDATION
        // ----------------------------------------------------

        if (
            !name ||
            !username ||
            !password
        ) {

            showSalesMessage(
                "Name, username and password are required.",
                "error"
            );

            return;
        }

        if (password.length < 6) {

            showSalesMessage(
                "Password must be at least 6 characters.",
                "error"
            );

            if (passwordInput) {
                passwordInput.focus();
            }

            return;
        }

        if (
            !/^[a-zA-Z0-9._-]+$/.test(
                username
            )
        ) {

            showSalesMessage(
                "Username can only contain letters, numbers, dots, underscores and hyphens.",
                "error"
            );

            if (usernameInput) {
                usernameInput.focus();
            }

            return;
        }

        const confirmText =
            'Create Sales account "' +
            name +
            '" with username "' +
            username +
            '"?';

        let confirmed = false;

        if (
            typeof window.confirmAction ===
            "function"
        ) {
            confirmed =
                await window.confirmAction(
                    confirmText
                );
        } else {
            confirmed =
                window.confirm(
                    confirmText
                );
        }

        if (!confirmed) {
            return;
        }

        const createButton =
            document.querySelector(
                "#salesModal .primary-btn, " +
                "#salesModal .btn-primary"
            );

        const originalText =
            createButton
                ? createButton.textContent
                : "";

        try {

            if (createButton) {

                createButton.disabled =
                    true;

                createButton.textContent =
                    "CREATING...";
            }

            /*
             * Sales account creation is performed
             * by the Supabase Edge Function.
             */

            const response =
                await supabase.functions.invoke(
                    "create-sales",
                    {
                        body: {
                            name,
                            username,
                            password
                        }
                    }
                );

            const data =
                response.data;

            const error =
                response.error;

            if (error) {

                console.error(
                    "FSI CRM: Create Sales error:",
                    error
                );

                showSalesMessage(
                    error.message ||
                    "Failed to create Sales.",
                    "error"
                );

                return;
            }

            if (
                data &&
                data.error
            ) {

                const detail =
                    data.detail
                        ? "\n\n" +
                          String(data.detail)
                        : "";

                showSalesMessage(
                    String(data.error) +
                    detail,
                    "error"
                );

                return;
            }

            showSalesMessage(
                "Sales account created successfully.",
                "success"
            );

            clearSalesForm();

            closeSalesModal();

            // ------------------------------------------------
            // REFRESH SALES
            // ------------------------------------------------

            await loadSalesLookup();

            if (salesIsAdmin()) {
                await loadSalesUsers();
            }

            if (
                typeof window.loadFilterOptions ===
                "function"
            ) {
                await window.loadFilterOptions();
            }

            if (
                typeof window.loadLeads ===
                "function"
            ) {
                await window.loadLeads(
                    window.currentPage || 1
                );
            }

            if (
                typeof window.updateDashboard ===
                "function"
            ) {
                await window.updateDashboard();
            }

            if (
                typeof window.showToast ===
                "function"
            ) {
                window.showToast(
                    'Sales "' +
                    name +
                    '" created successfully.',
                    "success"
                );
            }

        } catch (error) {

            console.error(
                "FSI CRM: createSales error:",
                error
            );

            showSalesMessage(
                error.message ||
                "An error occurred while creating Sales.",
                "error"
            );

        } finally {

            if (createButton) {

                createButton.disabled =
                    false;

                createButton.textContent =
                    originalText ||
                    "CREATE SALES";
            }
        }
    }

    // ========================================================
    // TOGGLE SALES STATUS
    // ========================================================

    async function toggleSalesStatus(
        id,
        currentStatus
    ) {

        if (!salesIsAdmin()) {

            showSalesMessage(
                "Only Admin can change Sales status.",
                "error"
            );

            return;
        }

        if (!id) {
            return;
        }

        const supabase =
            getSupabase();

        if (!supabase) {

            showSalesMessage(
                "Supabase is not connected.",
                "error"
            );

            return;
        }

        const normalizedCurrent =
            normalizeSalesStatus(
                currentStatus
            );

        const newStatus =
            normalizedCurrent === "Active"
                ? "Inactive"
                : "Active";

        const salesName =
            getSalesName(id);

        const confirmText =
            "Change " +
            salesName +
            "'s status to " +
            newStatus +
            "?";

        let confirmed = false;

        if (
            typeof window.confirmAction ===
            "function"
        ) {
            confirmed =
                await window.confirmAction(
                    confirmText
                );
        } else {
            confirmed =
                window.confirm(
                    confirmText
                );
        }

        if (!confirmed) {
            return;
        }

        try {

            const response =
                await supabase
                    .from("sales_users")
                    .update({
                        status: newStatus
                    })
                    .eq("id", id);

            const error =
                response.error;

            if (error) {

                console.error(
                    "FSI CRM: Toggle Sales status error:",
                    error
                );

                showSalesMessage(
                    error.message ||
                    "Failed to update Sales status.",
                    "error"
                );

                return;
            }

            // ------------------------------------------------
            // REFRESH
            // ------------------------------------------------

            await loadSalesLookup();

            if (salesIsAdmin()) {
                await loadSalesUsers();
            }

            if (
                typeof window.loadFilterOptions ===
                "function"
            ) {
                await window.loadFilterOptions();
            }

            if (
                typeof window.loadLeads ===
                "function"
            ) {
                await window.loadLeads(
                    window.currentPage || 1
                );
            }

            if (
                typeof window.updateDashboard ===
                "function"
            ) {
                await window.updateDashboard();
            }

            if (
                typeof window.showToast ===
                "function"
            ) {
                window.showToast(
                    salesName +
                    " is now " +
                    newStatus +
                    ".",
                    "success"
                );
            }

        } catch (error) {

            console.error(
                "FSI CRM: toggleSalesStatus error:",
                error
            );

            showSalesMessage(
                error.message ||
                "An error occurred while changing Sales status.",
                "error"
            );
        }
    }

    // ========================================================
    // TOP SALES FILTER
    // ========================================================

    function applyTopSalesFilter(
        salesId
    ) {

        const salesFilter =
            salesElement(
                "salesFilter",
                "leadSalesFilter"
            );

        if (salesFilter) {
            salesFilter.value =
                salesId || "";
        }

        if (
            typeof window.showLeads ===
            "function"
        ) {
            window.showLeads();
            return;
        }

        if (
            typeof window.loadLeads ===
            "function"
        ) {
            window.loadLeads(1);
        }
    }

    // ========================================================
    // SELECT SALES FILTER
    // ========================================================

    function selectSalesFilter(
        salesId,
        salesName
    ) {

        const salesFilter =
            salesElement(
                "salesFilter",
                "leadSalesFilter"
            );

        if (salesFilter) {

            salesFilter.value =
                salesId || "";
        }

        updateSalesDropdownButton(
            salesId
                ? salesName
                : "All Sales"
        );

        closeSalesDropdown();

        if (
            typeof window.showLeads ===
            "function"
        ) {

            window.showLeads();

            return;
        }

        if (
            typeof window.loadLeads ===
            "function"
        ) {

            window.loadLeads(1);
        }
    }

    // ========================================================
    // CLOSE SALES DROPDOWN
    // ========================================================

    function closeSalesDropdown() {

        const dropdowns =
            document.querySelectorAll(
                ".nav-dropdown"
            );

        dropdowns.forEach(
            function (dropdown) {

                dropdown.classList.remove(
                    "open"
                );

                const button =
                    dropdown.querySelector(
                        '[aria-expanded="true"]'
                    );

                if (button) {
                    button.setAttribute(
                        "aria-expanded",
                        "false"
                    );
                }
            }
        );

        const menus =
            document.querySelectorAll(
                ".nav-dropdown-menu.show"
            );

        menus.forEach(
            function (menu) {
                menu.classList.remove(
                    "show"
                );
            }
        );
    }

    // ========================================================
    // UPDATE SALES DROPDOWN BUTTON
    // ========================================================

    function updateSalesDropdownButton(
        salesName
    ) {

        const button =
            salesElement(
                "salesDropdownBtn"
            );

        if (!button) {
            return;
        }

        const text =
            button.querySelector(
                "span"
            );

        if (text) {

            text.textContent =
                salesName ||
                "Sales";

            return;
        }

        const label =
            button.querySelector(
                ".nav-dropdown-label"
            );

        if (label) {

            label.textContent =
                salesName ||
                "Sales";

            return;
        }

        // ----------------------------------------------------
        // Preserve icon
        // ----------------------------------------------------

        const icon =
            button.querySelector(
                "svg, i"
            );

        if (icon) {

            let textNode = null;

            button.childNodes.forEach(
                function (node) {

                    if (
                        node.nodeType ===
                        Node.TEXT_NODE
                    ) {
                        textNode = node;
                    }
                }
            );

            if (textNode) {

                textNode.textContent =
                    " " +
                    (
                        salesName ||
                        "Sales"
                    );

            } else {

                button.appendChild(
                    document.createTextNode(
                        " " +
                        (
                            salesName ||
                            "Sales"
                        )
                    )
                );
            }

            return;
        }

        button.textContent =
            salesName ||
            "Sales";
    }

    // ========================================================
    // SALES MESSAGE
    // ========================================================

    function showSalesMessage(
        message,
        type = "error"
    ) {

        if (
            typeof window.showToast ===
            "function"
        ) {

            window.showToast(
                message,
                type
            );

            return;
        }

        const messageElement =
            salesElement(
                "salesFormMessage"
            );

        if (messageElement) {

            messageElement.textContent =
                message;

            messageElement.style.display =
                "block";

            messageElement.dataset.type =
                type;

            return;
        }

        window.alert(
            message
        );
    }

    // ========================================================
    // REFRESH SALES DATA
    // ========================================================

    async function refreshSalesData() {

        await loadSalesLookup();

        if (salesIsAdmin()) {
            await loadSalesUsers();
        }

        if (
            typeof window.loadFilterOptions ===
            "function"
        ) {
            await window.loadFilterOptions();
        }

        if (
            typeof window.loadLeads ===
            "function"
        ) {
            await window.loadLeads(
                window.currentPage || 1
            );
        }
    }

    // ========================================================
    // BIND SALES MODAL EVENTS
    // ========================================================

    function bindSalesModalEvents() {

        const modal =
            salesElement(
                "salesModal"
            );

        if (!modal) {
            return;
        }

        if (
            modal.dataset.salesEventsBound ===
            "true"
        ) {
            return;
        }

        modal.dataset.salesEventsBound =
            "true";

        modal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    modal
                ) {
                    closeSalesModal();
                }
            }
        );
    }

    // ========================================================
    // BIND CREATE SALES BUTTON
    // ========================================================

    function bindCreateSalesButton() {

        const buttons =
            document.querySelectorAll(
                '[data-action="create-sales"], ' +
                '#btn-create-sales, ' +
                '#createSalesBtn'
            );

        buttons.forEach(
            function (button) {

                if (
                    button.dataset.salesCreateBound ===
                    "true"
                ) {
                    return;
                }

                button.dataset.salesCreateBound =
                    "true";

                button.addEventListener(
                    "click",
                    function (event) {

                        event.preventDefault();

                        createSales();
                    }
                );
            }
        );
    }

    // ========================================================
    // BIND CLOSE BUTTONS
    // ========================================================

    function bindSalesCloseButtons() {

        const buttons =
            document.querySelectorAll(
                '[data-action="close-sales-modal"], ' +
                '#closeSalesModal, ' +
                '#cancelSalesBtn'
            );

        buttons.forEach(
            function (button) {

                if (
                    button.dataset.salesCloseBound ===
                    "true"
                ) {
                    return;
                }

                button.dataset.salesCloseBound =
                    "true";

                button.addEventListener(
                    "click",
                    function (event) {

                        event.preventDefault();

                        closeSalesModal();
                    }
                );
            }
        );
    }

    // ========================================================
    // GLOBAL SALES EVENTS
    // ========================================================

    function bindGlobalSalesEvents() {

        if (salesEventsBound) {
            return;
        }

        salesEventsBound = true;

        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key !==
                    "Escape"
                ) {
                    return;
                }

                const modal =
                    salesElement(
                        "salesModal"
                    );

                if (
                    modal &&
                    modal.classList.contains(
                        "show"
                    )
                ) {
                    closeSalesModal();
                }
            }
        );

        document.addEventListener(
            "fsi:profile-ready",
            function () {

                setupSalesAssignmentAccess();

                populateSalesDropdowns();
            }
        );

        document.addEventListener(
            "fsi:auth-ready",
            function () {

                setupSalesAssignmentAccess();

                populateSalesDropdowns();
            }
        );

        document.addEventListener(
            "fsi:sales-changed",
            function () {

                refreshSalesData();
            }
        );
    }

    // ========================================================
    // INITIALIZE SALES MODULE
    // ========================================================

    function initializeSales() {

        if (salesInitialized) {
            return;
        }

        salesInitialized = true;

        bindGlobalSalesEvents();
        bindSalesTableEvents();
        bindSalesModalEvents();
        bindCreateSalesButton();
        bindSalesCloseButtons();

        setupSalesAssignmentAccess();

        console.log(
            "FSI CRM: Sales module loaded successfully."
        );
    }

    // ========================================================
    // EXPORT GLOBAL FUNCTIONS
    // ========================================================

    window.loadSalesLookup =
        loadSalesLookup;

    window.populateSalesDropdowns =
        populateSalesDropdowns;

    window.getSalesName =
        getSalesName;

    window.getSalesDisplayName =
        getSalesDisplayName;

    window.loadSalesUsers =
        loadSalesUsers;

    window.renderSalesUsers =
        renderSalesUsers;

    window.openSalesModal =
        openSalesModal;

    window.closeSalesModal =
        closeSalesModal;

    window.clearSalesForm =
        clearSalesForm;

    window.createSales =
        createSales;

    window.toggleSalesStatus =
        toggleSalesStatus;

    window.applyTopSalesFilter =
        applyTopSalesFilter;

    window.selectSalesFilter =
        selectSalesFilter;

    window.updateSalesDropdownButton =
        updateSalesDropdownButton;

    window.setupSalesAssignmentAccess =
        setupSalesAssignmentAccess;

    window.refreshSalesData =
        refreshSalesData;

    // ========================================================
    // NAMESPACE
    // ========================================================

    window.FSISales = {

        loadSalesLookup,
        populateSalesDropdowns,
        getSalesName,
        getSalesDisplayName,
        loadSalesUsers,
        renderSalesUsers,
        openSalesModal,
        closeSalesModal,
        clearSalesForm,
        createSales,
        toggleSalesStatus,
        applyTopSalesFilter,
        selectSalesFilter,
        updateSalesDropdownButton,
        setupSalesAssignmentAccess,
        refreshSalesData

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
            initializeSales
        );

    } else {

        initializeSales();
    }

})();
