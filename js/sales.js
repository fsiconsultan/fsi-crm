// ============================================================
// FSI CRM - SALES MANAGEMENT
// File: js/sales.js
// Version: 2026.10.01
// ============================================================

"use strict";

(function () {

    // ========================================================
    // INTERNAL STATE
    // ========================================================

    let salesLoading = false;
    let salesInitialized = false;
    let salesEventsBound = false;
    let salesCreateLoading = false;

    // ========================================================
    // DOM HELPER
    // ========================================================

    function salesElement(...ids) {

        for (const id of ids) {

            if (!id) {
                continue;
            }

            const element =
                document.getElementById(id);

            if (element) {
                return element;
            }
        }

        return null;
    }

    function salesElements(selector) {

        try {
            return Array.from(
                document.querySelectorAll(selector)
            );
        } catch (error) {

            console.error(
                "FSI CRM: Invalid selector:",
                selector,
                error
            );

            return [];
        }
    }

    // ========================================================
    // SUPABASE
    // ========================================================

    function getSupabase() {

        if (window.supabaseClient) {
            return window.supabaseClient;
        }

        try {

            if (
                typeof supabaseClient !==
                "undefined" &&
                supabaseClient
            ) {
                return supabaseClient;
            }

        } catch (error) {
            // Ignore lexical global lookup error.
        }

        return null;
    }

    // ========================================================
    // PROFILE
    // ========================================================

    function salesGetProfile() {

        if (window.currentProfile) {
            return window.currentProfile;
        }

        try {

            if (
                typeof currentProfile !==
                "undefined" &&
                currentProfile
            ) {
                return currentProfile;
            }

        } catch (error) {
            // Ignore.
        }

        return null;
    }

    function getCurrentUser() {

        if (window.currentUser) {
            return window.currentUser;
        }

        try {

            if (
                typeof currentUser !==
                "undefined" &&
                currentUser
            ) {
                return currentUser;
            }

        } catch (error) {
            // Ignore.
        }

        return null;
    }

    function getProfileId() {

        const profile =
            salesGetProfile();

        if (!profile) {
            return "";
        }

        return String(
            profile.id ||
            profile.sales_id ||
            ""
        );
    }

    // ========================================================
    // ROLE
    // ========================================================
    //
    // IMPORTANT:
    //
    // Supabase may contain:
    //
    // sales
    // salesperson
    // secretary
    // digital marketing
    //
    // We normalize spaces and hyphens to "_".
    //
    // Examples:
    //
    // "digital marketing"
    // "Digital Marketing"
    // "digital-marketing"
    // "Digital_Marketing"
    //
    // All become:
    //
    // "digital_marketing"
    // ========================================================

    function normalizeRole(role) {

        return String(role || "")
            .trim()
            .toLowerCase()
            .replace(/[\s-]+/g, "_");
    }

    // ========================================================
    // SALES-LIKE ROLE
    // ========================================================
    //
    // Roles that behave like Sales:
    //
    // - sales
    // - salesperson
    // - secretary
    // - digital marketing
    //
    // These roles are NOT Admin.
    // They only share Sales operational behavior.
    // ========================================================

    function isSalesLikeRole(role) {

        const normalized =
            normalizeRole(role);

        return (
            normalized === "sales" ||
            normalized === "salesperson" ||
            normalized === "secretary" ||
            normalized === "digital_marketing"
        );
    }

    // ========================================================
    // ADMIN ROLE
    // ========================================================

    function salesIsAdmin() {

        const profile =
            salesGetProfile();

        if (!profile) {
            return false;
        }

        if (
            typeof window.isAdminRole ===
            "function"
        ) {

            return window.isAdminRole(
                profile
            );
        }

        const role =
            normalizeRole(
                profile.role
            );

        return (
            role === "admin" ||
            role === "owner" ||
            role === "administrator"
        );
    }

    // ========================================================
    // SALES ROLE
    // ========================================================

    function salesIsSales() {

        const profile =
            salesGetProfile();

        if (!profile) {
            return false;
        }

        if (
            typeof window.isSalesRole ===
            "function"
        ) {

            return window.isSalesRole(
                profile
            );
        }

        return isSalesLikeRole(
            profile.role
        );
    }

    // ========================================================
    // SALES NAME
    // ========================================================

    function getSalesDisplayName(
        sales
    ) {

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

    function getSalesInitial(
        name
    ) {

        const value =
            String(
                name || "S"
            ).trim();

        if (!value) {
            return "S";
        }

        const parts =
            value
                .split(/\s+/)
                .filter(Boolean);

        if (parts.length === 1) {

            return parts[0]
                .substring(0, 2)
                .toUpperCase();
        }

        return (
            parts[0].charAt(0) +
            parts[
                parts.length - 1
            ].charAt(0)
        ).toUpperCase();
    }

    function getSalesName(
        id
    ) {

        if (!id) {
            return "-";
        }

        const salesList =
            Array.isArray(
                window.salesUsersData
            )
                ? window.salesUsersData
                : [];

        const sales =
            salesList.find(
                function (user) {

                    return String(
                        user.id
                    ) === String(id);
                }
            );

        if (!sales) {
            return "-";
        }

        return getSalesDisplayName(
            sales
        );
    }

    // ========================================================
    // HTML ESCAPE
    // ========================================================

    function escapeSalesHTML(
        value
    ) {

        if (
            typeof window.escapeHTML ===
            "function"
        ) {

            return window.escapeHTML(
                value
            );
        }

        return String(
            value ?? ""
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }

    // ========================================================
    // STATUS
    // ========================================================

    function normalizeSalesStatus(
        status
    ) {

        const value =
            String(
                status || ""
            )
                .trim()
                .toLowerCase();

        if (
            value === "active" ||
            value === "aktif"
        ) {
            return "Active";
        }

        return "Inactive";
    }

    function getSalesStatusClass(
        status
    ) {

        return (
            normalizeSalesStatus(
                status
            ) === "Active"
        )
            ? "status-active"
            : "status-inactive";
    }

    // ========================================================
    // GET ACTIVE SALES-LIKE USERS
    // ========================================================

    function getActiveSales() {

        const salesList =
            Array.isArray(
                window.salesUsersData
            )
                ? window.salesUsersData
                : [];

        return salesList
            .filter(
                function (sales) {

                    const role =
                        normalizeRole(
                            sales.role
                        );

                    const status =
                        normalizeSalesStatus(
                            sales.status
                        );

                    return (
                        isSalesLikeRole(
                            role
                        ) &&
                        status === "Active"
                    );
                }
            )
            .sort(
                function (a, b) {

                    return getSalesDisplayName(
                        a
                    ).localeCompare(
                        getSalesDisplayName(
                            b
                        ),
                        undefined,
                        {
                            sensitivity:
                                "base"
                        }
                    );
                }
            );
    }

    // ========================================================
    // GET LEAD ASSIGNABLE USERS
    // ========================================================
    //
    // Includes:
    // - Active Admin
    // - Active Owner
    // - Active Administrator
    // - Active Sales
    // - Active Salesperson
    // - Active Secretary
    // - Active Digital Marketing
    // ========================================================

    function getLeadAssignableUsers() {

        const salesList =
            Array.isArray(
                window.salesUsersData
            )
                ? window.salesUsersData
                : [];

        return salesList
            .filter(
                function (user) {

                    const role =
                        normalizeRole(
                            user.role
                        );

                    const status =
                        normalizeSalesStatus(
                            user.status
                        );

                    if (
                        status !==
                        "Active"
                    ) {
                        return false;
                    }

                    return (
                        role === "admin" ||
                        role === "owner" ||
                        role === "administrator" ||
                        isSalesLikeRole(
                            role
                        )
                    );
                }
            )
            .sort(
                function (a, b) {

                    return getSalesDisplayName(
                        a
                    ).localeCompare(
                        getSalesDisplayName(
                            b
                        ),
                        undefined,
                        {
                            sensitivity:
                                "base"
                        }
                    );
                }
            );
    }

    // ========================================================
    // LOAD SALES LOOKUP
    // ========================================================

    async function loadSalesLookup() {

        const supabase =
            getSupabase();

        if (!supabase) {

            console.error(
                "FSI CRM: Supabase client is not ready."
            );

            return [];
        }

        try {

            const response =
                await supabase
                    .from("sales_users")
                    .select("*")
                    .order(
                        "name",
                        {
                            ascending:
                                true
                        }
                    );

            if (response.error) {

                console.error(
                    "FSI CRM: Load Sales lookup error:",
                    response.error
                );

                return [];
            }

            const data =
                Array.isArray(
                    response.data
                )
                    ? response.data
                    : [];

            window.salesUsersData =
                data;

            populateSalesDropdowns();

            return data;

        } catch (error) {

            console.error(
                "FSI CRM: loadSalesLookup error:",
                error
            );

            return [];
        }
    }

    // ========================================================
    // POPULATE LEAD SALES FILTER
    // ========================================================

    function populateLeadSalesFilter(
        activeSales
    ) {

        const salesFilter =
            salesElement(
                "leadSalesFilter",
                "filter-sales",
                "filterSales"
            );

        if (!salesFilter) {
            return;
        }

        const currentValue =
            salesFilter.value || "";

        salesFilter.innerHTML = "";

        const allOption =
            document.createElement(
                "option"
            );

        allOption.value = "";

        allOption.textContent =
            "All Sales";

        salesFilter.appendChild(
            allOption
        );

        activeSales.forEach(
            function (sales) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    sales.id || "";

                option.textContent =
                    getSalesDisplayName(
                        sales
                    );

                salesFilter.appendChild(
                    option
                );
            }
        );

        const exists =
            activeSales.some(
                function (sales) {

                    return String(
                        sales.id
                    ) === String(
                        currentValue
                    );
                }
            );

        salesFilter.value =
            exists
                ? currentValue
                : "";
    }

    // ========================================================
    // POPULATE DASHBOARD SALES FILTER
    // ========================================================

    function populateDashboardSalesFilter(
        activeSales
    ) {

        const salesFilter =
            document.getElementById(
                "salesFilter"
            );

        if (!salesFilter) {
            return;
        }

        const currentValue =
            salesFilter.value || "";

        salesFilter.innerHTML = "";

        const allOption =
            document.createElement(
                "option"
            );

        allOption.value = "";

        allOption.textContent =
            "All Sales";

        salesFilter.appendChild(
            allOption
        );

        const salesList =
            Array.isArray(activeSales)
                ? activeSales
                : [];

        salesList.forEach(
            function (sales) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    sales.id || "";

                option.textContent =
                    getSalesDisplayName(
                        sales
                    );

                salesFilter.appendChild(
                    option
                );
            }
        );

        const exists =
            salesList.some(
                function (sales) {

                    return String(
                        sales.id
                    ) === String(
                        currentValue
                    );
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

    function populateTopSalesDropdown(
        activeSales
    ) {

        const menu =
            salesElement(
                "salesDropdownMenu",
                "sales-dropdown-menu"
            );

        if (!menu) {
            return;
        }

        menu.innerHTML = "";

        const allButton =
            document.createElement(
                "button"
            );

        allButton.type = "button";

        allButton.className =
            "nav-dropdown-item";

        allButton.dataset.salesId =
            "";

        allButton.textContent =
            "All Sales";

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

        menu.appendChild(
            allButton
        );

        activeSales.forEach(
            function (sales) {

                const button =
                    document.createElement(
                        "button"
                    );

                button.type = "button";

                button.className =
                    "nav-dropdown-item";

                button.dataset.salesId =
                    sales.id || "";

                button.textContent =
                    getSalesDisplayName(
                        sales
                    );

                button.addEventListener(
                    "click",
                    function (event) {

                        event.preventDefault();
                        event.stopPropagation();

                        selectSalesFilter(
                            sales.id,
                            getSalesDisplayName(
                                sales
                            )
                        );
                    }
                );

                menu.appendChild(
                    button
                );
            }
        );
    }

    // ========================================================
    // POPULATE LEAD ASSIGNMENT
    // ========================================================

    function populateLeadAssignment(
        activeSales
    ) {

        const select =
            salesElement(
                "leadSalesAssign",
                "lead-sales-assign",
                "leadSales",
                "salesAssignment"
            );

        if (!select) {
            return;
        }

        const currentValue =
            select.value || "";

        select.innerHTML = "";

        const emptyOption =
            document.createElement(
                "option"
            );

        emptyOption.value = "";

        emptyOption.textContent =
            "Select Sales";

        select.appendChild(
            emptyOption
        );

        activeSales.forEach(
            function (sales) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    sales.id || "";

                option.textContent =
                    getSalesDisplayName(
                        sales
                    );

                select.appendChild(
                    option
                );
            }
        );

        const profile =
            salesGetProfile();

        if (
            profile &&
            salesIsSales()
        ) {

            const profileId =
                getProfileId();

            const ownSales =
                activeSales.find(
                    function (sales) {

                        return String(
                            sales.id
                        ) === String(
                            profileId
                        );
                    }
                );

            if (ownSales) {

                select.value =
                    ownSales.id;
            }

        } else {

            const exists =
                activeSales.some(
                    function (sales) {

                        return String(
                            sales.id
                        ) === String(
                            currentValue
                        );
                    }
                );

            if (exists) {

                select.value =
                    currentValue;
            }
        }

        setupSalesAssignmentAccess();
    }

    // ========================================================
    // POPULATE ALL SALES DROPDOWNS
    // ========================================================

    function populateSalesDropdowns() {

        const activeSales =
            getActiveSales();

        const leadAssignableUsers =
            getLeadAssignableUsers();

        populateLeadSalesFilter(
            leadAssignableUsers
        );

        populateTopSalesDropdown(
            activeSales
        );

        populateDashboardSalesFilter(
            activeSales
        );

        populateLeadAssignment(
            leadAssignableUsers
        );

        updateSalesDropdownButtonFromFilter();
    }

    // ========================================================
    // SALES ASSIGNMENT ACCESS
    // ========================================================

    function setupSalesAssignmentAccess() {

        const select =
            salesElement(
                "leadSalesAssign",
                "lead-sales-assign",
                "leadSales",
                "salesAssignment"
            );

        if (!select) {
            return;
        }

        const profile =
            salesGetProfile();

        if (!profile) {

            select.disabled =
                true;

            return;
        }

        // ----------------------------------------------------
        // ADMIN
        // ----------------------------------------------------

        if (salesIsAdmin()) {

            select.disabled =
                false;

            select.removeAttribute(
                "aria-disabled"
            );

            return;
        }

        // ----------------------------------------------------
        // SALES-LIKE
        // ----------------------------------------------------

        if (salesIsSales()) {

            const profileId =
                getProfileId();

            if (profileId) {

                const assignableUsers =
                    getLeadAssignableUsers();

                const exists =
                    assignableUsers.some(
                        function (sales) {

                            return String(
                                sales.id
                            ) === String(
                                profileId
                            );
                        }
                    );

                if (exists) {

                    select.value =
                        profileId;
                }
            }

            select.disabled =
                true;

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
            return [];
        }

        const supabase =
            getSupabase();

        if (!supabase) {

            showSalesMessage(
                "Supabase is not connected.",
                "error"
            );

            return [];
        }

        if (salesLoading) {
            return [];
        }

        salesLoading = true;

        renderSalesLoading();

        try {

            const response =
                await supabase
                    .from("sales_users")
                    .select("*")
                    .order(
                        "created_at",
                        {
                            ascending:
                                false
                        }
                    );

            if (response.error) {

                console.error(
                    "FSI CRM: Load Sales users error:",
                    response.error
                );

                renderSalesUsers([]);

                showSalesMessage(
                    response.error.message ||
                    "Failed to load Sales.",
                    "error"
                );

                return [];
            }

            const data =
                Array.isArray(
                    response.data
                )
                    ? response.data
                    : [];

            window.salesUsersData =
                data;

            renderSalesUsers(
                data
            );

            populateSalesDropdowns();

            return data;

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

            salesLoading =
                false;

            if (
                typeof window.refreshIcons ===
                "function"
            ) {

                window.refreshIcons();
            }
        }
    }

    // ========================================================
    // RENDER SALES LOADING
    // ========================================================

    function renderSalesLoading() {

        const tableBody =
            salesElement(
                "salesTableBody",
                "sales-table-body",
                "salesTable"
            );

        if (!tableBody) {
            return;
        }

        tableBody.innerHTML = "";

        const tr =
            document.createElement(
                "tr"
            );

        const td =
            document.createElement(
                "td"
            );

        td.colSpan = 6;

        td.innerHTML =
            '<div class="loading-state">' +
                '<div class="loading-spinner"></div>' +
                '<div>Loading Sales...</div>' +
            '</div>';

        tr.appendChild(td);

        tableBody.appendChild(tr);
    }

    // ========================================================
    // RENDER SALES USERS
    // ========================================================

    function renderSalesUsers(
        data
    ) {

        let tableBody =
            salesElement(
                "salesTableBody",
                "sales-table-body"
            );

        let table =
            salesElement(
                "salesTable"
            );

        if (
            table &&
            table.tagName &&
            table.tagName.toLowerCase() ===
            "tbody"
        ) {

            tableBody =
                table;
        }

        if (!tableBody) {
            return;
        }

        tableBody.innerHTML = "";

        const salesList =
            Array.isArray(data)
                ? data
                : [];

        if (
            salesList.length === 0
        ) {

            const tr =
                document.createElement(
                    "tr"
                );

            tr.className =
                "empty-row";

            const td =
                document.createElement(
                    "td"
                );

            td.colSpan = 6;

            td.innerHTML =
                '<div class="empty-state">' +
                    '<div class="empty-state-icon">👥</div>' +
                    '<div class="empty-state-title">' +
                        'No Sales Found' +
                    '</div>' +
                    '<div class="empty-state-text">' +
                        'Belum ada akun Sales yang terdaftar.' +
                    '</div>' +
                '</div>';

            tr.appendChild(td);

            tableBody.appendChild(tr);

            return;
        }

        salesList.forEach(
            function (sales) {

                const tr =
                    document.createElement(
                        "tr"
                    );

                tr.dataset.salesId =
                    sales.id || "";

                const name =
                    getSalesDisplayName(
                        sales
                    );

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

                let formattedDate =
                    sales.created_at ||
                    "-";

                if (
                    sales.created_at &&
                    typeof window.formatDateTime ===
                    "function"
                ) {

                    formattedDate =
                        window.formatDateTime(
                            sales.created_at
                        );
                }

                const nameTd =
                    document.createElement(
                        "td"
                    );

                const userCell =
                    document.createElement(
                        "div"
                    );

                userCell.className =
                    "sales-user-cell";

                const avatar =
                    document.createElement(
                        "div"
                    );

                avatar.className =
                    "sales-user-avatar";

                avatar.textContent =
                    getSalesInitial(
                        name
                    );

                const info =
                    document.createElement(
                        "div"
                    );

                info.className =
                    "sales-user-info";

                const strong =
                    document.createElement(
                        "strong"
                    );

                strong.textContent =
                    name;

                info.appendChild(
                    strong
                );

                userCell.appendChild(
                    avatar
                );

                userCell.appendChild(
                    info
                );

                nameTd.appendChild(
                    userCell
                );

                const usernameTd =
                    document.createElement(
                        "td"
                    );

                usernameTd.textContent =
                    username;

                const roleTd =
                    document.createElement(
                        "td"
                    );

                roleTd.textContent =
                    role;

                const statusTd =
                    document.createElement(
                        "td"
                    );

                const statusBadge =
                    document.createElement(
                        "span"
                    );

                statusBadge.className =
                    "status-badge " +
                    getSalesStatusClass(
                        status
                    );

                statusBadge.textContent =
                    status;

                statusTd.appendChild(
                    statusBadge
                );

                const dateTd =
                    document.createElement(
                        "td"
                    );

                dateTd.textContent =
                    formattedDate;

                const actionTd =
                    document.createElement(
                        "td"
                    );

                const actionWrapper =
                    document.createElement(
                        "div"
                    );

                actionWrapper.className =
                    "sales-actions";

                const statusButton =
                    document.createElement(
                        "button"
                    );

                statusButton.type =
                    "button";

                statusButton.className =
                    "secondary-btn small-btn";

                statusButton.dataset.action =
                    "toggle-sales-status";

                statusButton.dataset.salesId =
                    sales.id || "";

                statusButton.dataset.currentStatus =
                    status;

                statusButton.textContent =
                    isActive
                        ? "Deactivate"
                        : "Activate";

                actionWrapper.appendChild(
                    statusButton
                );

                actionTd.appendChild(
                    actionWrapper
                );

                tr.appendChild(
                    nameTd
                );

                tr.appendChild(
                    usernameTd
                );

                tr.appendChild(
                    roleTd
                );

                tr.appendChild(
                    statusTd
                );

                tr.appendChild(
                    dateTd
                );

                tr.appendChild(
                    actionTd
                );

                tableBody.appendChild(
                    tr
                );
            }
        );

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

        const tableBody =
            salesElement(
                "salesTableBody",
                "sales-table-body"
            );

        if (!tableBody) {
            return;
        }

        if (
            tableBody.dataset.salesTableBound ===
            "true"
        ) {
            return;
        }

        tableBody.dataset.salesTableBound =
            "true";

        tableBody.addEventListener(
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
                    button.dataset.salesId ||
                    "";

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
    // OPEN SALES MODAL
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
                "salesModal",
                "sales-modal"
            );

        if (!modal) {

            console.error(
                "FSI CRM: Sales modal not found."
            );

            showSalesMessage(
                "Sales modal not found in index.html.",
                "error"
            );

            return;
        }

        clearSalesForm();

        const title =
            salesElement(
                "salesModalTitle",
                "sales-modal-title"
            );

        if (title) {

            title.textContent =
                "Add New Sales";
        }

        modal.classList.add(
            "show"
        );

        modal.classList.remove(
            "hidden"
        );

        modal.removeAttribute(
            "hidden"
        );

        modal.style.display =
            "flex";

        modal.style.visibility =
            "visible";

        modal.style.opacity =
            "1";

        document.body.classList.add(
            "modal-open"
        );

        setTimeout(
            function () {

                const nameInput =
                    salesElement(
                        "salesName",
                        "sales-name"
                    );

                if (nameInput) {
                    nameInput.focus();
                }

            },
            80
        );
    }

    // ========================================================
    // CLOSE SALES MODAL
    // ========================================================

    function closeSalesModal() {

        const modal =
            salesElement(
                "salesModal",
                "sales-modal"
            );

        if (!modal) {
            return;
        }

        modal.classList.remove(
            "show"
        );

        modal.style.display =
            "none";

        modal.style.visibility =
            "hidden";

        document.body.classList.remove(
            "modal-open"
        );
    }

    // ========================================================
    // CLEAR FORM
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

            message.textContent =
                "";

            message.style.display =
                "none";

            message.dataset.type =
                "";
        }
    }

    function setSalesValue(
        id,
        value
    ) {

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
            document.getElementById(
                id
            );

        if (element) {

            element.value =
                value ?? "";
        }
    }

    // ========================================================
    // CREATE SALES
    // ========================================================

    async function createSales(
        event
    ) {

        if (event) {
            event.preventDefault();
        }

        if (salesCreateLoading) {
            return;
        }

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
                "salesName",
                "sales-name"
            );

        const usernameInput =
            salesElement(
                "salesUsername",
                "sales-username"
            );

        const passwordInput =
            salesElement(
                "salesPassword",
                "sales-password"
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

        if (
            password.length < 6
        ) {

            showSalesMessage(
                "Password must be at least 6 characters.",
                "error"
            );

            passwordInput?.focus();

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

            usernameInput?.focus();

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
                "#salesModal [data-action='create-sales'], " +
                "#salesModal #btn-create-sales, " +
                "#salesModal #createSalesBtn, " +
                "#salesModal .primary-btn, " +
                "#salesModal .btn-primary"
            );

        const originalText =
            createButton
                ? createButton.textContent
                : "";

        salesCreateLoading =
            true;

        try {

            if (createButton) {

                createButton.disabled =
                    true;

                createButton.textContent =
                    "CREATING...";
            }

            showSalesMessage(
                "Creating Sales account...",
                "info"
            );

            const response =
                await supabase.functions.invoke(
                    "create-sales",
                    {
                        body: {
                            name:
                                name,
                            username:
                                username,
                            password:
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
                    "FSI CRM: create-sales Edge Function error:",
                    error
                );

                let message =
                    error.message ||
                    "Failed to create Sales.";

                if (
                    error.context &&
                    typeof error.context ===
                    "object"
                ) {

                    try {

                        if (
                            error.context.body
                        ) {

                            message +=
                                " " +
                                String(
                                    error.context.body
                                );
                        }

                    } catch (contextError) {
                        // Ignore.
                    }
                }

                showSalesMessage(
                    message,
                    "error"
                );

                return;
            }

            if (
                data &&
                (
                    data.error ||
                    data.success === false
                )
            ) {

                let message =
                    data.error ||
                    data.message ||
                    "Failed to create Sales.";

                if (data.detail) {

                    message +=
                        " " +
                        String(
                            data.detail
                        );
                }

                showSalesMessage(
                    message,
                    "error"
                );

                return;
            }

            closeSalesModal();

            clearSalesForm();

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

            await refreshSalesData();

            if (
                typeof window.updateDashboard ===
                "function"
            ) {

                try {

                    await window.updateDashboard();

                } catch (dashboardError) {

                    console.warn(
                        "FSI CRM: Dashboard refresh after Sales creation failed:",
                        dashboardError
                    );
                }
            }

            document.dispatchEvent(
                new CustomEvent(
                    "fsi:sales-changed"
                )
            );

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

            salesCreateLoading =
                false;

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
            normalizedCurrent ===
            "Active"
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
                        status:
                            newStatus
                    })
                    .eq(
                        "id",
                        id
                    );

            if (response.error) {

                console.error(
                    "FSI CRM: Toggle Sales status error:",
                    response.error
                );

                showSalesMessage(
                    response.error.message ||
                    "Failed to update Sales status.",
                    "error"
                );

                return;
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

            await refreshSalesData();

            document.dispatchEvent(
                new CustomEvent(
                    "fsi:sales-changed"
                )
            );

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
                "leadSalesFilter",
                "filter-sales",
                "filterSales"
            );

        if (salesFilter) {

            salesFilter.value =
                salesId || "";
        }

        updateSalesDropdownButtonFromFilter();

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
                "leadSalesFilter",
                "filter-sales",
                "filterSales"
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
    // UPDATE TOP DROPDOWN
    // ========================================================

    function updateSalesDropdownButtonFromFilter() {

        const salesFilter =
            salesElement(
                "leadSalesFilter",
                "filter-sales",
                "filterSales"
            );

        if (!salesFilter) {
            return;
        }

        const value =
            salesFilter.value || "";

        if (!value) {

            updateSalesDropdownButton(
                "All Sales"
            );

            return;
        }

        const sales =
            (
                Array.isArray(
                    window.salesUsersData
                )
                    ? window.salesUsersData
                    : []
            ).find(
                function (item) {

                    return String(
                        item.id
                    ) === String(value);
                }
            );

        updateSalesDropdownButton(
            sales
                ? getSalesDisplayName(
                    sales
                )
                : "Sales"
        );
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
                "salesDropdownBtn",
                "sales-dropdown-btn"
            );

        if (!button) {
            return;
        }

        const value =
            salesName ||
            "Sales";

        const label =
            button.querySelector(
                ".nav-dropdown-label"
            );

        if (label) {

            label.textContent =
                value;

            return;
        }

        const span =
            button.querySelector(
                "span"
            );

        if (span) {

            span.textContent =
                value;

            return;
        }

        const textNodes = [];

        button.childNodes.forEach(
            function (node) {

                if (
                    node.nodeType ===
                    Node.TEXT_NODE
                ) {

                    textNodes.push(
                        node
                    );
                }
            }
        );

        if (
            textNodes.length > 0
        ) {

            textNodes[
                textNodes.length - 1
            ].textContent =
                " " +
                value;

            return;
        }

        button.appendChild(
            document.createTextNode(
                " " +
                value
            )
        );
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

        const lookup =
            await loadSalesLookup();

        if (
            salesIsAdmin()
        ) {

            await loadSalesUsers();

        } else {

            populateSalesDropdowns();
        }

        if (
            typeof window.loadFilterOptions ===
            "function"
        ) {

            try {

                await window.loadFilterOptions();

            } catch (error) {

                console.warn(
                    "FSI CRM: loadFilterOptions refresh failed:",
                    error
                );
            }
        }

        if (
            typeof window.loadLeads ===
            "function"
        ) {

            try {

                await window.loadLeads(
                    window.currentPage ||
                    1
                );

            } catch (error) {

                console.warn(
                    "FSI CRM: lead refresh after Sales change failed:",
                    error
                );
            }
        }

        return lookup;
    }

    // ========================================================
    // BIND SALES MODAL
    // ========================================================

    function bindSalesModalEvents() {

        const modal =
            salesElement(
                "salesModal",
                "sales-modal"
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
    // BIND ADD SALES BUTTON
    // ========================================================

    function bindCreateSalesButton() {

        const buttons =
            salesElements(
                '[data-action="open-sales-modal"], ' +
                '[data-action="add-sales"], ' +
                '[data-action="create-sales-modal"], ' +
                '#btn-add-sales, ' +
                '#addSalesBtn, ' +
                '#btn-create-sales, ' +
                '#createSalesBtn'
            );

        buttons.forEach(
            function (button) {

                if (
                    button.dataset.salesOpenBound ===
                    "true"
                ) {
                    return;
                }

                button.dataset.salesOpenBound =
                    "true";

                button.addEventListener(
                    "click",
                    function (event) {

                        event.preventDefault();

                        openSalesModal();
                    }
                );
            }
        );

        const salesPage =
            salesElement(
                "view-sales",
                "view-manage-sales"
            );

        if (salesPage) {

            const textButtons =
                salesPage.querySelectorAll(
                    "button"
                );

            textButtons.forEach(
                function (button) {

                    if (
                        button.dataset.salesOpenBound ===
                        "true"
                    ) {
                        return;
                    }

                    const text =
                        String(
                            button.textContent ||
                            ""
                        )
                            .trim()
                            .toLowerCase();

                    if (
                        text === "add sales" ||
                        text === "add new sales" ||
                        text.includes(
                            "add sales"
                        )
                    ) {

                        button.dataset.salesOpenBound =
                            "true";

                        button.addEventListener(
                            "click",
                            function (event) {

                                event.preventDefault();

                                openSalesModal();
                            }
                        );
                    }
                }
            );
        }
    }

    // ========================================================
    // BIND CREATE FORM
    // ========================================================

    function bindSalesForm() {

        const form =
            salesElement(
                "salesForm",
                "sales-form",
                "addSalesForm"
            );

        if (!form) {
            return;
        }

        if (
            form.dataset.salesSubmitBound ===
            "true"
        ) {
            return;
        }

        form.dataset.salesSubmitBound =
            "true";

        form.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();

                createSales(
                    event
                );
            }
        );
    }

    // ========================================================
    // BIND CLOSE BUTTONS
    // ========================================================

    function bindSalesCloseButtons() {

        const buttons =
            salesElements(
                '[data-action="close-sales-modal"], ' +
                '#closeSalesModal, ' +
                '#cancelSalesBtn, ' +
                '#salesModalClose, ' +
                '#sales-modal-close'
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
    // GLOBAL EVENTS
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
                        "salesModal",
                        "sales-modal"
                    );

                if (
                    modal &&
                    (
                        modal.classList.contains(
                            "show"
                        ) ||
                        modal.style.display ===
                            "flex"
                    )
                ) {

                    closeSalesModal();
                }
            }
        );

        document.addEventListener(
            "fsi:profile-ready",
            async function () {

                setupSalesAssignmentAccess();

                if (salesIsAdmin()) {

                    await loadSalesLookup();

                    await loadSalesUsers();

                } else {

                    await loadSalesLookup();
                }
            }
        );

        document.addEventListener(
            "fsi:auth-ready",
            async function () {

                setupSalesAssignmentAccess();

                if (salesIsAdmin()) {

                    await loadSalesLookup();

                    await loadSalesUsers();

                } else {

                    await loadSalesLookup();
                }
            }
        );

        document.addEventListener(
            "fsi:sales-changed",
            async function () {

                await refreshSalesData();
            }
        );

        document.addEventListener(
            "fsi:navigation-changed",
            function (event) {

                const page =
                    event.detail?.page ||
                    "";

                if (
                    page === "sales" ||
                    page === "manage-sales" ||
                    page === "manageSales"
                ) {

                    if (
                        salesIsAdmin()
                    ) {

                        loadSalesUsers();
                    }
                }
            }
        );
    }

    // ========================================================
    // INITIALIZE
    // ========================================================

    async function initializeSales() {

        if (salesInitialized) {
            return;
        }

        salesInitialized = true;

        bindGlobalSalesEvents();

        bindSalesTableEvents();

        bindSalesModalEvents();

        bindCreateSalesButton();

        bindSalesForm();

        bindSalesCloseButtons();

        setupSalesAssignmentAccess();

        setTimeout(
            async function () {

                try {

                    if (
                        salesIsAdmin()
                    ) {

                        await loadSalesLookup();

                        await loadSalesUsers();

                    } else {

                        await loadSalesLookup();
                    }

                } catch (error) {

                    console.warn(
                        "FSI CRM: Initial Sales loading failed:",
                        error
                    );
                }

            },
            300
        );

        console.log(
            "FSI CRM: Sales Management module loaded successfully."
        );
    }

    // ========================================================
    // EXPORT GLOBAL FUNCTIONS
    // ========================================================

    window.loadSalesLookup =
        loadSalesLookup;

    window.getActiveSales =
        getActiveSales;

    window.getLeadAssignableUsers =
        getLeadAssignableUsers;

    window.populateSalesDropdowns =
        populateSalesDropdowns;

    window.populateLeadSalesFilter =
        populateLeadSalesFilter;

    window.populateDashboardSalesFilter =
        populateDashboardSalesFilter;

    window.populateTopSalesDropdown =
        populateTopSalesDropdown;

    window.populateLeadAssignment =
        populateLeadAssignment;

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

        getActiveSales,

        getLeadAssignableUsers,

        populateSalesDropdowns,

        populateLeadSalesFilter,

        populateDashboardSalesFilter,

        populateTopSalesDropdown,

        populateLeadAssignment,

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
