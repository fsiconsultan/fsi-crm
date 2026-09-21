```javascript
// ============================================================
// FSI CRM - SALES MANAGEMENT
// File: js/sales.js
// ============================================================

"use strict";

(function () {

    // ========================================================
    // INTERNAL STATE
    // ========================================================

    let salesLoading = false;
    let salesInitialized = false;

    // ========================================================
    // DOM HELPER
    // ========================================================

    function salesElement(...ids) {
        for (const id of ids) {
            const element = document.getElementById(id);

            if (element) {
                return element;
            }
        }

        return null;
    }

    // ========================================================
    // PROFILE / ROLE
    // ========================================================

    function salesGetProfile() {
        return window.currentProfile || null;
    }

    function salesIsAdmin() {
        const profile = salesGetProfile();

        if (!profile) {
            return false;
        }

        if (typeof window.isAdminRole === "function") {
            return window.isAdminRole(profile);
        }

        return (
            String(profile.role || "").toLowerCase() ===
            "admin"
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

        return (
            String(profile.role || "").toLowerCase() ===
            "sales"
        );
    }

    // ========================================================
    // SALES NAME
    // ========================================================

    function getSalesName(id) {

        if (!id) {
            return "-";
        }

        const salesList =
            Array.isArray(window.salesUsersData)
                ? window.salesUsersData
                : [];

        const sales =
            salesList.find(
                user =>
                    String(user.id) ===
                    String(id)
            );

        if (!sales) {
            return "-";
        }

        return (
            sales.name ||
            sales.full_name ||
            sales.username ||
            "-"
        );
    }

    // ========================================================
    // LOAD SALES LOOKUP
    // ========================================================

    async function loadSalesLookup() {

        if (!window.supabaseClient) {
            console.error(
                "Supabase client is not ready."
            );

            return;
        }

        try {

            const {
                data,
                error
            } =
                await window.supabaseClient
                    .from("sales_users")
                    .select(
                        "id, auth_user_id, name, full_name, username, email, phone, role, status, created_at"
                    )
                    .order(
                        "name",
                        {
                            ascending: true
                        }
                    );

            if (error) {

                console.error(
                    "Load sales lookup error:",
                    error
                );

                return;
            }

            window.salesUsersData =
                Array.isArray(data)
                    ? data
                    : [];

            populateSalesDropdowns();

        } catch (error) {

            console.error(
                "loadSalesLookup error:",
                error
            );
        }
    }

    // ========================================================
    // POPULATE SALES DROPDOWNS
    // ========================================================

    function populateSalesDropdowns() {

        const salesList =
            Array.isArray(window.salesUsersData)
                ? window.salesUsersData
                : [];

        const activeSales =
            salesList
                .filter(
                    sales =>
                        String(
                            sales.role || ""
                        ).toLowerCase() ===
                        "sales"
                )
                .filter(
                    sales =>
                        String(
                            sales.status || "Active"
                        ).toLowerCase() ===
                        "active"
                )
                .sort(
                    (a, b) =>
                        String(
                            a.name ||
                            a.full_name ||
                            a.username ||
                            ""
                        ).localeCompare(
                            String(
                                b.name ||
                                b.full_name ||
                                b.username ||
                                ""
                            ),
                            undefined,
                            {
                                sensitivity: "base"
                            }
                        )
                );

        // ====================================================
        // LEADS SALES FILTER
        // ====================================================

        const salesFilter =
            salesElement(
                "salesFilter"
            );

        if (salesFilter) {

            const currentValue =
                salesFilter.value;

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
                sales => {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        sales.id;

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
                    sales =>
                        String(sales.id) ===
                        String(currentValue)
                );

            salesFilter.value =
                exists
                    ? currentValue
                    : "";
        }

        // ====================================================
        // TOP NAV SALES DROPDOWN
        // ====================================================

        const salesDropdownMenu =
            salesElement(
                "salesDropdownMenu"
            );

        if (salesDropdownMenu) {

            salesDropdownMenu.innerHTML = "";

            // All Sales
            const allSalesButton =
                document.createElement(
                    "button"
                );

            allSalesButton.type =
                "button";

            allSalesButton.className =
                "nav-dropdown-item";

            allSalesButton.dataset.salesId =
                "";

            allSalesButton.textContent =
                "All Sales";

            allSalesButton.addEventListener(
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

            salesDropdownMenu.appendChild(
                allSalesButton
            );

            // Individual Sales
            activeSales.forEach(
                sales => {

                    const salesButton =
                        document.createElement(
                            "button"
                        );

                    salesButton.type =
                        "button";

                    salesButton.className =
                        "nav-dropdown-item";

                    salesButton.dataset.salesId =
                        sales.id;

                    salesButton.textContent =
                        getSalesDisplayName(
                            sales
                        );

                    salesButton.addEventListener(
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

                    salesDropdownMenu.appendChild(
                        salesButton
                    );
                }
            );
        }

        // ====================================================
        // LEAD ASSIGNMENT
        // ====================================================

        const leadSalesAssign =
            salesElement(
                "leadSalesAssign"
            );

        if (leadSalesAssign) {

            const currentValue =
                leadSalesAssign.value;

            leadSalesAssign.innerHTML = "";

            const selectOption =
                document.createElement(
                    "option"
                );

            selectOption.value =
                "";

            selectOption.textContent =
                "Select Sales";

            leadSalesAssign.appendChild(
                selectOption
            );

            activeSales.forEach(
                sales => {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        sales.id;

                    option.textContent =
                        getSalesDisplayName(
                            sales
                        );

                    leadSalesAssign.appendChild(
                        option
                    );
                }
            );

            const exists =
                activeSales.some(
                    sales =>
                        String(sales.id) ===
                        String(currentValue)
                );

            if (exists) {
                leadSalesAssign.value =
                    currentValue;
            }
        }

        setupSalesAssignmentAccess();
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

    // ========================================================
    // SALES ASSIGNMENT ACCESS
    // ========================================================

    function setupSalesAssignmentAccess() {

        const select =
            salesElement(
                "leadSalesAssign"
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

        // Admin can assign to any active Sales
        if (salesIsAdmin()) {

            select.disabled =
                false;

            select.removeAttribute(
                "aria-disabled"
            );

            return;
        }

        // Sales can only use their own profile
        if (salesIsSales()) {

            select.value =
                profile.id || "";

            select.disabled =
                true;

            select.setAttribute(
                "aria-disabled",
                "true"
            );

            return;
        }

        select.disabled =
            true;
    }

    // ========================================================
    // LOAD SALES USERS
    // ========================================================

    async function loadSalesUsers() {

        if (!salesIsAdmin()) {

            console.warn(
                "Only Admin can load Sales management."
            );

            return;
        }

        if (!window.supabaseClient) {

            console.error(
                "Supabase client is not ready."
            );

            return;
        }

        if (salesLoading) {
            return;
        }

        salesLoading = true;

        try {

            const {
                data,
                error
            } =
                await window.supabaseClient
                    .from("sales_users")
                    .select("*")
                    .order(
                        "created_at",
                        {
                            ascending: true
                        }
                    );

            if (error) {

                console.error(
                    "Load Sales users error:",
                    error
                );

                renderSalesUsers([]);

                showSalesMessage(
                    error.message ||
                    "Failed to load Sales.",
                    "error"
                );

                return;
            }

            window.salesUsersData =
                Array.isArray(data)
                    ? data
                    : [];

            window.salesUsersData.sort(
                function (a, b) {

                    return String(
                        a.name ||
                        a.full_name ||
                        a.username ||
                        ""
                    ).localeCompare(
                        String(
                            b.name ||
                            b.full_name ||
                            b.username ||
                            ""
                        ),
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

        } catch (error) {

            console.error(
                "loadSalesUsers error:",
                error
            );

            showSalesMessage(
                error.message ||
                "Failed to load Sales.",
                "error"
            );

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

        const table =
            salesElement(
                "salesTable"
            );

        if (!table) {
            return;
        }

        table.innerHTML = "";

        const salesList =
            Array.isArray(data)
                ? data
                : [];

        if (
            salesList.length === 0
        ) {

            table.innerHTML = `
                <tr class="empty-row">
                    <td colspan="6">
                        <div class="empty-state">
                            <div class="empty-state-icon">
                                <span>👥</span>
                            </div>

                            <div class="empty-state-title">
                                No Sales found
                            </div>

                            <div class="empty-state-text">
                                Create a Sales account to start managing your team.
                            </div>
                        </div>
                    </td>
                </tr>
            `;

            return;
        }

        salesList.forEach(
            function (sales) {

                const tr =
                    document.createElement(
                        "tr"
                    );

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
                    sales.status ||
                    "Inactive";

                const isActive =
                    String(status).toLowerCase() ===
                    "active";

                const statusClass =
                    isActive
                        ? "status-active"
                        : "status-inactive";

                const statusLabel =
                    isActive
                        ? "Active"
                        : "Inactive";

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

                const escape =
                    typeof window.escapeHTML ===
                    "function"
                        ? window.escapeHTML
                        : function (value) {
                            return String(
                                value ?? ""
                            );
                        };

                const safeName =
                    escape(name);

                const safeUsername =
                    escape(username);

                const safeRole =
                    escape(role);

                const safeStatus =
                    escape(statusLabel);

                const safeDate =
                    escape(
                        formattedDate
                    );

                const salesId =
                    String(
                        sales.id || ""
                    ).replace(
                        /'/g,
                        "\\'"
                    );

                const currentStatus =
                    String(
                        status
                    ).replace(
                        /'/g,
                        "\\'"
                    );

                tr.innerHTML = `
                    <td>
                        <div class="sales-user-cell">
                            <div class="sales-user-avatar">
                                ${escape(
                                    getSalesInitial(
                                        name
                                    )
                                )}
                            </div>

                            <div class="sales-user-info">
                                <strong>
                                    ${safeName}
                                </strong>
                            </div>
                        </div>
                    </td>

                    <td>
                        ${safeUsername}
                    </td>

                    <td>
                        ${safeRole}
                    </td>

                    <td>
                        <span
                            class="status-badge ${statusClass}"
                        >
                            ${safeStatus}
                        </span>
                    </td>

                    <td>
                        ${safeDate}
                    </td>

                    <td>
                        <button
                            type="button"
                            class="secondary-btn small-btn"
                            onclick="toggleSalesStatus('${salesId}', '${currentStatus}')"
                        >
                            ${
                                isActive
                                    ? "Deactivate"
                                    : "Activate"
                            }
                        </button>
                    </td>
                `;

                table.appendChild(
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
    // SALES INITIAL
    // ========================================================

    function getSalesInitial(name) {

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
            parts[parts.length - 1].charAt(0)
        ).toUpperCase();
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
                "Sales modal not found."
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

        modal.classList.add(
            "show"
        );

        modal.style.display =
            "flex";

        document.body.classList.add(
            "modal-open"
        );

        setTimeout(
            function () {

                const nameInput =
                    salesElement(
                        "salesName"
                    );

                if (nameInput) {
                    nameInput.focus();
                }

            },
            50
        );
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

        modal.classList.remove(
            "show"
        );

        modal.style.display =
            "none";

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
            message.textContent =
                "";
            message.style.display =
                "none";
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

        if (!window.supabaseClient) {

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

        if (
            password.length < 6
        ) {

            showSalesMessage(
                "Password must be at least 6 characters.",
                "error"
            );

            if (passwordInput) {
                passwordInput.focus();
            }

            return;
        }

        // Username basic validation
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

        const confirmed =
            typeof window.confirmAction ===
            "function"
                ? await window.confirmAction(
                    `Create Sales account "${name}" with username "${username}"?`
                )
                : confirm(
                    `Create Sales account "${name}" with username "${username}"?`
                );

        if (!confirmed) {
            return;
        }

        const createButton =
            document.querySelector(
                "#salesModal .primary-btn"
            );

        try {

            if (createButton) {

                createButton.disabled =
                    true;

                createButton.dataset.originalText =
                    createButton.textContent;

                createButton.textContent =
                    "CREATING...";
            }

            const {
                data,
                error
            } =
                await window.supabaseClient
                    .functions
                    .invoke(
                        "create-sales",
                        {
                            body: {
                                name,
                                username,
                                password
                            }
                        }
                    );

            if (error) {

                console.error(
                    "Create Sales error:",
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
                        ? `\n\n${data.detail}`
                        : "";

                showSalesMessage(
                    String(
                        data.error
                    ) +
                    detail,
                    "error"
                );

                return;
            }

            // ------------------------------------------------
            // SUCCESS
            // ------------------------------------------------

            showSalesMessage(
                "Sales account created successfully.",
                "success"
            );

            clearSalesForm();

            closeSalesModal();

            // ------------------------------------------------
            // REFRESH SALES
            // ------------------------------------------------

            await loadSalesUsers();

            await loadSalesLookup();

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
                    `Sales "${name}" created successfully.`,
                    "success"
                );
            }

        } catch (error) {

            console.error(
                "createSales error:",
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
                    createButton.dataset.originalText ||
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

        const isCurrentlyActive =
            String(
                currentStatus || ""
            ).toLowerCase() ===
            "active";

        const newStatus =
            isCurrentlyActive
                ? "Inactive"
                : "Active";

        const salesName =
            getSalesName(id);

        const confirmed =
            typeof window.confirmAction ===
            "function"
                ? await window.confirmAction(
                    `Change ${salesName}'s status to ${newStatus}?`
                )
                : confirm(
                    `Change ${salesName}'s status to ${newStatus}?`
                );

        if (!confirmed) {
            return;
        }

        if (!window.supabaseClient) {

            showSalesMessage(
                "Supabase is not connected.",
                "error"
            );

            return;
        }

        try {

            const {
                error
            } =
                await window.supabaseClient
                    .from("sales_users")
                    .update({
                        status:
                            newStatus
                    })
                    .eq(
                        "id",
                        id
                    );

            if (error) {

                console.error(
                    "Toggle Sales status error:",
                    error
                );

                showSalesMessage(
                    error.message ||
                    "Failed to update Sales status.",
                    "error"
                );

                return;
            }

            await loadSalesUsers();

            await loadSalesLookup();

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
                    `${salesName} is now ${newStatus}.`,
                    "success"
                );
            }

        } catch (error) {

            console.error(
                "toggleSalesStatus error:",
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
                "salesFilter"
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
                "salesFilter"
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

        // Close navigation dropdown
        const dropdown =
            document.querySelector(
                ".nav-dropdown.open"
            );

        if (dropdown) {
            dropdown.classList.remove(
                "open"
            );
        }

        const dropdownMenu =
            document.querySelector(
                ".nav-dropdown-menu.show"
            );

        if (dropdownMenu) {
            dropdownMenu.classList.remove(
                "show"
            );
        }

        if (
            typeof window.showLeads ===
            "function"
        ) {
            window.showLeads();
        } else if (
            typeof window.loadLeads ===
            "function"
        ) {
            window.loadLeads(1);
        }
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

        } else {

            // Keep icons intact if present
            const icon =
                button.querySelector(
                    "svg, i"
                );

            if (icon) {

                button.childNodes.forEach(
                    node => {

                        if (
                            node.nodeType ===
                            Node.TEXT_NODE
                        ) {
                            node.textContent =
                                ` ${salesName || "Sales"}`;
                        }
                    }
                );

            } else {

                button.textContent =
                    salesName ||
                    "Sales";
            }
        }
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

        alert(message);
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
    // INITIALIZE SALES MODULE
    // ========================================================

    function initializeSales() {

        if (salesInitialized) {
            return;
        }

        salesInitialized = true;

        // ----------------------------------------------------
        // ESC closes Sales modal
        // ----------------------------------------------------

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

        // ----------------------------------------------------
        // Click outside Sales modal
        // ----------------------------------------------------

        const modal =
            salesElement(
                "salesModal"
            );

        if (modal) {

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

        setupSalesAssignmentAccess();
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

    // Namespace
    window.FSISales = {
        loadSalesLookup,
        populateSalesDropdowns,
        getSalesName,
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

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            initializeSales();

            console.log(
                "FSI CRM: Sales module loaded."
            );
        }
    );

})();
```
