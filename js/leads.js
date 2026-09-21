```javascript
// ============================================================
// FSI CRM - LEADS MANAGEMENT
// File: js/leads.js
// ============================================================

"use strict";

(function () {

    // ========================================================
    // INTERNAL STATE
    // ========================================================

    let leadsInitialized = false;
    let leadsLoading = false;
    let searchTimer = null;

    // ========================================================
    // DOM HELPERS
    // ========================================================

    function leadElement(...ids) {
        for (const id of ids) {
            const element = document.getElementById(id);
            if (element) return element;
        }
        return null;
    }

    function leadGetProfile() {
        return window.currentProfile || null;
    }

    function leadIsAdmin() {
        const profile = leadGetProfile();

        if (typeof window.isAdminRole === "function") {
            return window.isAdminRole(profile);
        }

        return (
            profile &&
            String(profile.role || "").toLowerCase() === "admin"
        );
    }

    function leadIsSales() {
        const profile = leadGetProfile();

        if (typeof window.isSalesRole === "function") {
            return window.isSalesRole(profile);
        }

        return (
            profile &&
            String(profile.role || "").toLowerCase() === "sales"
        );
    }

    function leadGetPageSize() {
        return Number(window.pageSize) > 0
            ? Number(window.pageSize)
            : 20;
    }

    function leadGetCurrentPage() {
        return Math.max(
            1,
            Number(window.currentPage) || 1
        );
    }

    function leadSetCurrentPage(page) {
        window.currentPage = Math.max(
            1,
            Number(page) || 1
        );
    }

    function leadGetSalesData() {
        return Array.isArray(window.salesUsersData)
            ? window.salesUsersData
            : [];
    }

    // ========================================================
    // FILTER OPTIONS
    // ========================================================

    async function loadFilterOptions() {
        if (!window.supabaseClient) {
            console.error("Supabase client is not ready.");
            return;
        }

        try {
            const { data, error } = await window.supabaseClient
                .from("leads")
                .select("business, location");

            if (error) {
                console.error(
                    "Load filter options error:",
                    error
                );
                return;
            }

            const leads = Array.isArray(data)
                ? data
                : [];

            const businesses = [
                ...new Set(
                    leads
                        .map(lead =>
                            typeof window.getValue === "function"
                                ? window.getValue(lead.business).trim()
                                : String(lead.business || "").trim()
                        )
                        .filter(Boolean)
                )
            ].sort((a, b) =>
                a.localeCompare(b, undefined, {
                    sensitivity: "base"
                })
            );

            const locations = [
                ...new Set(
                    leads
                        .map(lead =>
                            typeof window.getValue === "function"
                                ? window.getValue(lead.location).trim()
                                : String(lead.location || "").trim()
                        )
                        .filter(Boolean)
                )
            ].sort((a, b) =>
                a.localeCompare(b, undefined, {
                    sensitivity: "base"
                })
            );

            populateFilter(
                "businessFilter",
                businesses,
                "All Business"
            );

            populateFilter(
                "locationFilter",
                locations,
                "All Location"
            );

            if (typeof window.populateSalesDropdowns === "function") {
                window.populateSalesDropdowns();
            }

        } catch (error) {
            console.error(
                "loadFilterOptions error:",
                error
            );
        }
    }

    function populateFilter(id, values, defaultText) {
        const select = leadElement(id);

        if (!select) return;

        const currentValue = select.value;

        select.innerHTML = "";

        const defaultOption =
            document.createElement("option");

        defaultOption.value = "";
        defaultOption.textContent = defaultText;

        select.appendChild(defaultOption);

        (Array.isArray(values) ? values : []).forEach(value => {
            const option =
                document.createElement("option");

            option.value = value;
            option.textContent = value;

            select.appendChild(option);
        });

        if (
            values.includes(currentValue)
        ) {
            select.value = currentValue;
        } else {
            select.value = "";
        }
    }

    // ========================================================
    // LOAD LEADS
    // ========================================================

    async function loadLeads(page = 1) {

        if (!window.supabaseClient) {
            console.error("Supabase client is not ready.");
            return;
        }

        if (!leadGetProfile()) {
            console.warn(
                "Cannot load leads: profile is not ready."
            );
            return;
        }

        if (leadsLoading) {
            return;
        }

        leadsLoading = true;

        leadSetCurrentPage(page);

        const pageNumber =
            leadGetCurrentPage();

        try {

            // ------------------------------------------------
            // SALES LOOKUP
            // ------------------------------------------------

            if (
                (!Array.isArray(window.salesUsersData) ||
                    window.salesUsersData.length === 0) &&
                typeof window.loadSalesLookup === "function"
            ) {
                await window.loadSalesLookup();
            }

            // ------------------------------------------------
            // FILTER VALUES
            // ------------------------------------------------

            const searchInput =
                leadElement("leadSearch", "leadsSearch");

            const statusInput =
                leadElement("statusFilter", "leadStatusFilter");

            const businessInput =
                leadElement("businessFilter");

            const locationInput =
                leadElement("locationFilter");

            const salesInput =
                leadElement("salesFilter");

            const search =
                searchInput?.value?.trim() || "";

            const status =
                statusInput?.value || "";

            const business =
                businessInput?.value || "";

            const location =
                locationInput?.value || "";

            const salesFilter =
                salesInput?.value || "";

            // ------------------------------------------------
            // QUERY
            // ------------------------------------------------

            let query =
                window.supabaseClient
                    .from("leads")
                    .select("*", {
                        count: "exact"
                    });

            // ------------------------------------------------
            // SEARCH
            // ------------------------------------------------

            if (search) {

                const safeSearch =
                    search
                        .replace(/\\/g, "\\\\")
                        .replace(/%/g, "\\%")
                        .replace(/_/g, "\\_")
                        .replace(/,/g, "\\,");

                const searchConditions = [
                    `customer_name.ilike.%${safeSearch}%`,
                    `phone.ilike.%${safeSearch}%`,
                    `email.ilike.%${safeSearch}%`,
                    `business.ilike.%${safeSearch}%`,
                    `location.ilike.%${safeSearch}%`
                ];

                query = query.or(
                    searchConditions.join(",")
                );
            }

            // ------------------------------------------------
            // STATUS FILTER
            // ------------------------------------------------

            if (status) {
                query = query.eq(
                    "status",
                    status
                );
            }

            // ------------------------------------------------
            // BUSINESS FILTER
            // ------------------------------------------------

            if (business) {
                query = query.eq(
                    "business",
                    business
                );
            }

            // ------------------------------------------------
            // LOCATION FILTER
            // ------------------------------------------------

            if (location) {
                query = query.eq(
                    "location",
                    location
                );
            }

            // ------------------------------------------------
            // SALES FILTER
            //
            // Admin:
            //   Can choose a specific Sales.
            //
            // Sales:
            //   Do not trust browser-side filter.
            //   Supabase RLS should enforce ownership.
            // ------------------------------------------------

            if (
                leadIsAdmin() &&
                salesFilter
            ) {
                query = query.eq(
                    "sales_id",
                    salesFilter
                );
            }

            // ------------------------------------------------
            // PAGINATION
            // ------------------------------------------------

            const pageSize =
                leadGetPageSize();

            const from =
                (pageNumber - 1) *
                pageSize;

            const to =
                from +
                pageSize -
                1;

            query = query
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                )
                .range(from, to);

            // ------------------------------------------------
            // EXECUTE
            // ------------------------------------------------

            const {
                data,
                error,
                count
            } = await query;

            if (error) {

                console.error(
                    "Load leads error:",
                    error
                );

                window.leadsData = [];
                window.totalLeadsCount = 0;

                renderLeads([]);

                updatePagination();

                if (
                    typeof window.showToast === "function"
                ) {
                    window.showToast(
                        error.message ||
                        "Failed to load leads.",
                        "error"
                    );
                }

                return;
            }

            window.leadsData =
                Array.isArray(data)
                    ? data
                    : [];

            window.totalLeadsCount =
                Number(count) || 0;

            renderLeads(
                window.leadsData
            );

            updatePagination();

        } catch (error) {

            console.error(
                "loadLeads error:",
                error
            );

            renderLeads([]);

            if (
                typeof window.showToast === "function"
            ) {
                window.showToast(
                    error.message ||
                    "An error occurred while loading leads.",
                    "error"
                );
            }

        } finally {

            leadsLoading = false;

            if (
                typeof window.refreshIcons === "function"
            ) {
                window.refreshIcons();
            }
        }
    }

    // ========================================================
    // PAGINATION
    // ========================================================

    function updatePagination() {

        const paginationInfo =
            leadElement("paginationInfo");

        const pageIndicator =
            leadElement("pageIndicator");

        const prevBtn =
            leadElement("prevBtn");

        const nextBtn =
            leadElement("nextBtn");

        const pageSize =
            leadGetPageSize();

        const totalLeads =
            Number(window.totalLeadsCount) || 0;

        const currentPage =
            leadGetCurrentPage();

        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    totalLeads /
                    pageSize
                )
            );

        const start =
            totalLeads === 0
                ? 0
                : (
                    (currentPage - 1) *
                    pageSize
                ) + 1;

        const end =
            Math.min(
                currentPage * pageSize,
                totalLeads
            );

        if (paginationInfo) {
            paginationInfo.textContent =
                `${start}-${end} of ${totalLeads} leads`;
        }

        if (pageIndicator) {
            pageIndicator.textContent =
                `Page ${currentPage} / ${totalPages}`;
        }

        if (prevBtn) {
            prevBtn.disabled =
                currentPage <= 1;

            prevBtn.setAttribute(
                "aria-disabled",
                String(currentPage <= 1)
            );
        }

        if (nextBtn) {
            nextBtn.disabled =
                currentPage >= totalPages;

            nextBtn.setAttribute(
                "aria-disabled",
                String(currentPage >= totalPages)
            );
        }
    }

    function changePage(direction) {

        const numericDirection =
            Number(direction);

        if (
            !Number.isFinite(
                numericDirection
            )
        ) {
            return;
        }

        const pageSize =
            leadGetPageSize();

        const totalLeads =
            Number(window.totalLeadsCount) || 0;

        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    totalLeads /
                    pageSize
                )
            );

        const currentPage =
            leadGetCurrentPage();

        const newPage =
            currentPage +
            numericDirection;

        if (
            newPage < 1 ||
            newPage > totalPages
        ) {
            return;
        }

        loadLeads(newPage);
    }

    function nextLeadPage() {
        changePage(1);
    }

    function previousLeadPage() {
        changePage(-1);
    }

    // ========================================================
    // RENDER LEADS TABLE
    // ========================================================

    function renderLeads(data) {

        const table =
            leadElement("leadsTable");

        if (!table) {
            console.warn(
                "Leads table not found."
            );
            return;
        }

        table.innerHTML = "";

        const leads =
            Array.isArray(data)
                ? data
                : [];

        if (leads.length === 0) {

            table.innerHTML = `
                <tr class="empty-row">
                    <td colspan="10">
                        <div class="empty-state">
                            <div class="empty-state-icon">
                                <span>📋</span>
                            </div>
                            <div class="empty-state-title">
                                No leads found
                            </div>
                            <div class="empty-state-text">
                                Try changing your search or filter.
                            </div>
                        </div>
                    </td>
                </tr>
            `;

            return;
        }

        leads.forEach(lead => {

            const tr =
                document.createElement("tr");

            const salesName =
                typeof window.getSalesName === "function"
                    ? window.getSalesName(
                        lead.sales_id
                    )
                    : "-";

            const displayStatus =
                typeof window.normalizeLeadStatus === "function"
                    ? window.normalizeLeadStatus(
                        lead.status
                    )
                    : (
                        lead.status ||
                        "New"
                    );

            const statusCSS =
                typeof window.statusClass === "function"
                    ? window.statusClass(
                        displayStatus
                    )
                    : "status-new";

            const customerName =
                typeof window.getValue === "function"
                    ? window.getValue(
                        lead.customer_name
                    )
                    : String(
                        lead.customer_name || ""
                    );

            const phone =
                typeof window.getValue === "function"
                    ? window.getValue(
                        lead.phone
                    )
                    : String(
                        lead.phone || ""
                    );

            const email =
                typeof window.getValue === "function"
                    ? window.getValue(
                        lead.email
                    )
                    : String(
                        lead.email || ""
                    );

            const business =
                typeof window.getValue === "function"
                    ? window.getValue(
                        lead.business
                    )
                    : String(
                        lead.business || ""
                    );

            const location =
                typeof window.getValue === "function"
                    ? window.getValue(
                        lead.location
                    )
                    : String(
                        lead.location || ""
                    );

            const escapedCustomer =
                typeof window.escapeHTML === "function"
                    ? window.escapeHTML(
                        customerName
                    )
                    : customerName;

            const escapedPhone =
                typeof window.escapeHTML === "function"
                    ? window.escapeHTML(phone)
                    : phone;

            const escapedEmail =
                typeof window.escapeHTML === "function"
                    ? window.escapeHTML(email)
                    : email;

            const escapedBusiness =
                typeof window.escapeHTML === "function"
                    ? window.escapeHTML(business)
                    : business;

            const escapedLocation =
                typeof window.escapeHTML === "function"
                    ? window.escapeHTML(location)
                    : location;

            const escapedSales =
                typeof window.escapeHTML === "function"
                    ? window.escapeHTML(
                        salesName || "-"
                    )
                    : (
                        salesName || "-"
                    );

            let whatsappHTML = "-";

            if (phone) {

                const waURL =
                    typeof window.whatsappLink === "function"
                        ? window.whatsappLink(phone)
                        : "#";

                whatsappHTML = `
                    <a
                        href="${waURL}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="wa-link"
                        title="Open WhatsApp"
                    >
                        ${escapedPhone}
                    </a>
                `;
            }

            let emailHTML = "-";

            if (email) {

                const mailURL =
                    `mailto:${encodeURIComponent(email)}`;

                emailHTML = `
                    <a
                        href="${mailURL}"
                        class="crm-email-link"
                    >
                        ${escapedEmail}
                    </a>
                `;
            }

            const formattedFollowUp =
                typeof window.formatDate === "function"
                    ? window.formatDate(
                        lead.follow_up_date
                    )
                    : (
                        lead.follow_up_date || "-"
                    );

            const formattedAppointment =
                typeof window.formatDate === "function"
                    ? window.formatDate(
                        lead.appointment
                    )
                    : (
                        lead.appointment || "-"
                    );

            const safeFollowUp =
                typeof window.escapeHTML === "function"
                    ? window.escapeHTML(
                        formattedFollowUp
                    )
                    : formattedFollowUp;

            const safeAppointment =
                typeof window.escapeHTML === "function"
                    ? window.escapeHTML(
                        formattedAppointment
                    )
                    : formattedAppointment;

            const safeStatus =
                typeof window.escapeHTML === "function"
                    ? window.escapeHTML(
                        displayStatus
                    )
                    : displayStatus;

            const leadId =
                String(
                    lead.id || ""
                );

            const escapedId =
                leadId.replace(
                    /'/g,
                    "\\'"
                );

            tr.innerHTML = `
                <td>
                    <div class="lead-customer-cell">
                        <button
                            type="button"
                            class="lead-name-btn"
                            onclick="crmOpenCustomerProfile('${escapedId}')"
                            title="Open customer profile"
                        >
                            ${escapedCustomer || "-"}
                        </button>
                    </div>
                </td>

                <td>
                    ${whatsappHTML}
                </td>

                <td>
                    ${emailHTML}
                </td>

                <td>
                    ${escapedBusiness || "-"}
                </td>

                <td>
                    ${escapedLocation || "-"}
                </td>

                <td>
                    ${escapedSales || "-"}
                </td>

                <td>
                    <span
                        class="status-badge ${statusCSS}"
                    >
                        ${safeStatus}
                    </span>
                </td>

                <td>
                    ${safeFollowUp}
                </td>

                <td>
                    ${safeAppointment}
                </td>

                <td>
                    <div class="crm-lead-actions">

                        <button
                            type="button"
                            class="primary-btn small-btn"
                            onclick="crmOpenCustomerProfile('${escapedId}')"
                        >
                            Profile
                        </button>

                        <button
                            type="button"
                            class="secondary-btn small-btn"
                            onclick="deleteLead('${escapedId}')"
                        >
                            Delete
                        </button>

                    </div>
                </td>
            `;

            table.appendChild(tr);
        });

        if (
            typeof window.refreshIcons === "function"
        ) {
            window.refreshIcons();
        }
    }

    // ========================================================
    // FILTER / SEARCH
    // ========================================================

    function filterLeads() {
        leadSetCurrentPage(1);
        loadLeads(1);
    }

    function onSearchInput() {

        clearTimeout(searchTimer);

        searchTimer = setTimeout(
            function () {
                leadSetCurrentPage(1);
                loadLeads(1);
            },
            400
        );
    }

    function clearLeadFilters() {

        const fields = [
            "leadSearch",
            "leadsSearch",
            "statusFilter",
            "leadStatusFilter",
            "businessFilter",
            "locationFilter",
            "salesFilter"
        ];

        fields.forEach(id => {

            const element =
                document.getElementById(id);

            if (element) {
                element.value = "";
            }
        });

        leadSetCurrentPage(1);

        loadLeads(1);
    }

    // ========================================================
    // LEAD MODAL
    // ========================================================

    function openLeadModal() {

        const modal =
            leadElement("leadModal");

        if (!modal) {

            console.error(
                "Lead modal not found."
            );

            if (
                typeof window.showToast === "function"
            ) {
                window.showToast(
                    "Lead modal not found.",
                    "error"
                );
            }

            return;
        }

        clearLeadForm();

        const title =
            leadElement(
                "leadModalTitle"
            );

        if (title) {
            title.textContent =
                "Add Lead";
        }

        modal.classList.add("show");

        modal.style.display =
            "flex";

        document.body.classList.add(
            "modal-open"
        );

        setTimeout(
            function () {

                const customerInput =
                    leadElement(
                        "leadCustomer"
                    );

                if (customerInput) {
                    customerInput.focus();
                }

            },
            50
        );
    }

    function closeLeadModal() {

        const modal =
            leadElement("leadModal");

        if (!modal) return;

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
    // CLEAR FORM
    // ========================================================

    function clearLeadForm() {

        setLeadValue(
            "leadId",
            ""
        );

        setLeadValue(
            "leadCustomer",
            ""
        );

        setLeadValue(
            "leadPhone",
            ""
        );

        setLeadValue(
            "leadEmail",
            ""
        );

        setLeadValue(
            "leadBusiness",
            ""
        );

        setLeadValue(
            "leadLocation",
            ""
        );

        setLeadValue(
            "leadStatus",
            "New"
        );

        const profile =
            leadGetProfile();

        setLeadValue(
            "leadSalesAssign",
            leadIsSales()
                ? (
                    profile?.id || ""
                )
                : ""
        );

        setLeadValue(
            "leadFollowUp",
            ""
        );

        setLeadValue(
            "leadAppointment",
            ""
        );

        setLeadValue(
            "leadSiteSurvey",
            ""
        );

        setLeadValue(
            "leadQuotation",
            ""
        );

        setLeadValue(
            "leadSPK",
            ""
        );

        setLeadValue(
            "leadClosing",
            ""
        );

        setLeadValue(
            "leadNotes",
            ""
        );

        if (
            typeof window.setupSalesAssignmentAccess ===
            "function"
        ) {
            window.setupSalesAssignmentAccess();
        }
    }

    function setLeadValue(
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
    // EDIT LEAD
    // ========================================================
    //
    // Main edit flow is handled by shelter.js.
    // This compatibility function opens the customer profile.
    // ========================================================

    async function openEditLead(id) {

        if (
            typeof window.crmOpenCustomerProfile ===
            "function"
        ) {
            await window.crmOpenCustomerProfile(id);
            return;
        }

        if (
            typeof window.editLead ===
            "function"
        ) {
            await window.editLead(id);
            return;
        }

        console.warn(
            "Customer profile editor is not available."
        );
    }

    // ========================================================
    // SAVE LEAD
    // ========================================================

    async function saveLead() {

        const profile =
            leadGetProfile();

        if (!profile) {

            if (
                typeof window.showToast === "function"
            ) {
                window.showToast(
                    "User profile is not ready.",
                    "error"
                );
            }

            return;
        }

        if (!window.supabaseClient) {

            if (
                typeof window.showToast === "function"
            ) {
                window.showToast(
                    "Supabase is not connected.",
                    "error"
                );
            }

            return;
        }

        const customerElement =
            leadElement(
                "leadCustomer"
            );

        const customer =
            customerElement?.value?.trim() || "";

        if (!customer) {

            if (
                typeof window.showToast === "function"
            ) {
                window.showToast(
                    "Customer name is required.",
                    "error"
                );
            } else {
                alert(
                    "Customer name is required."
                );
            }

            customerElement?.focus();

            return;
        }

        const leadId =
            leadElement(
                "leadId"
            )?.value || "";

        const getFormValue =
            function (id) {
                return (
                    leadElement(id)?.value?.trim() ||
                    ""
                );
            };

        const statusValue =
            getFormValue(
                "leadStatus"
            );

        const normalizedStatus =
            typeof window.normalizeLeadStatus ===
            "function"
                ? window.normalizeLeadStatus(
                    statusValue || "New"
                )
                : (
                    statusValue || "New"
                );

        const payload = {

            customer_name:
                customer,

            phone:
                getFormValue(
                    "leadPhone"
                ),

            email:
                getFormValue(
                    "leadEmail"
                ),

            business:
                getFormValue(
                    "leadBusiness"
                ),

            location:
                getFormValue(
                    "leadLocation"
                ),

            status:
                normalizedStatus,

            follow_up_date:
                leadElement(
                    "leadFollowUp"
                )?.value || null,

            appointment:
                leadElement(
                    "leadAppointment"
                )?.value || null,

            site_survey:
                leadElement(
                    "leadSiteSurvey"
                )?.value || null,

            quotation:
                leadElement(
                    "leadQuotation"
                )?.value || null,

            spk:
                leadElement(
                    "leadSPK"
                )?.value || null,

            closing:
                leadElement(
                    "leadClosing"
                )?.value || null,

            notes:
                getFormValue(
                    "leadNotes"
                )
        };

        // ----------------------------------------------------
        // SALES ASSIGNMENT
        // ----------------------------------------------------

        const salesAssignment =
            leadElement(
                "leadSalesAssign"
            );

        const selectedSales =
            salesAssignment?.value || "";

        if (leadIsAdmin()) {

            payload.sales_id =
                selectedSales ||
                null;

        } else {

            // Sales can only assign the lead
            // to their own profile.
            payload.sales_id =
                profile.id;
        }

        try {

            // ------------------------------------------------
            // UPDATE
            // ------------------------------------------------

            if (leadId) {

                payload.updated_by =
                    profile.id;

                const {
                    error
                } =
                    await window.supabaseClient
                        .from("leads")
                        .update(payload)
                        .eq(
                            "id",
                            leadId
                        );

                if (error) {

                    console.error(
                        "Update lead error:",
                        error
                    );

                    if (
                        typeof window.showToast ===
                        "function"
                    ) {
                        window.showToast(
                            error.message ||
                            "Failed to update lead.",
                            "error"
                        );
                    }

                    return;
                }

                if (
                    typeof window.showToast ===
                    "function"
                ) {
                    window.showToast(
                        "Lead updated successfully.",
                        "success"
                    );
                } else {
                    alert(
                        "Lead updated successfully."
                    );
                }

            } else {

                // ------------------------------------------------
                // INSERT
                // ------------------------------------------------

                payload.created_by =
                    profile.id;

                payload.updated_by =
                    profile.id;

                const {
                    error
                } =
                    await window.supabaseClient
                        .from("leads")
                        .insert([
                            payload
                        ]);

                if (error) {

                    console.error(
                        "Insert lead error:",
                        error
                    );

                    if (
                        typeof window.showToast ===
                        "function"
                    ) {
                        window.showToast(
                            error.message ||
                            "Failed to add lead.",
                            "error"
                        );
                    }

                    return;
                }

                if (
                    typeof window.showToast ===
                    "function"
                ) {
                    window.showToast(
                        "Lead added successfully.",
                        "success"
                    );
                } else {
                    alert(
                        "Lead added successfully."
                    );
                }
            }

            closeLeadModal();

            // ------------------------------------------------
            // REFRESH DATA
            // ------------------------------------------------

            await loadFilterOptions();

            await loadLeads(
                leadGetCurrentPage()
            );

            if (
                typeof window.updateDashboard ===
                "function"
            ) {
                await window.updateDashboard();
            }

            if (
                typeof window.refreshDashboard ===
                "function"
            ) {
                // Do not await again if updateDashboard
                // has already completed.
            }

        } catch (error) {

            console.error(
                "saveLead error:",
                error
            );

            if (
                typeof window.showToast ===
                "function"
            ) {
                window.showToast(
                    error.message ||
                    "An error occurred while saving the lead.",
                    "error"
                );
            } else {
                alert(
                    "An error occurred:\n" +
                    error.message
                );
            }
        }
    }

    // ========================================================
    // DELETE LEAD
    // ========================================================

    async function deleteLead(id) {

        if (!id) return;

        const confirmed =
            typeof window.confirmAction ===
            "function"
                ? await window.confirmAction(
                    "Delete this lead?"
                )
                : confirm(
                    "Delete this lead?"
                );

        if (!confirmed) {
            return;
        }

        if (!window.supabaseClient) {

            if (
                typeof window.showToast ===
                "function"
            ) {
                window.showToast(
                    "Supabase is not connected.",
                    "error"
                );
            }

            return;
        }

        try {

            const {
                error
            } =
                await window.supabaseClient
                    .from("leads")
                    .delete()
                    .eq(
                        "id",
                        id
                    );

            if (error) {

                console.error(
                    "Delete lead error:",
                    error
                );

                if (
                    typeof window.showToast ===
                    "function"
                ) {
                    window.showToast(
                        error.message ||
                        "Failed to delete lead.",
                        "error"
                    );
                } else {
                    alert(
                        "Failed to delete lead:\n" +
                        error.message
                    );
                }

                return;
            }

            // ------------------------------------------------
            // CLEAR CUSTOMER PROFILE CACHE
            // ------------------------------------------------

            if (
                String(
                    window.crmCurrentCustomerId
                ) === String(id)
            ) {
                window.crmCurrentCustomerId =
                    null;

                window.crmCurrentCustomer =
                    null;
            }

            // ------------------------------------------------
            // REFRESH
            // ------------------------------------------------

            await loadFilterOptions();

            const totalAfterDelete =
                Math.max(
                    0,
                    (
                        Number(
                            window.totalLeadsCount
                        ) || 1
                    ) - 1
                );

            const pageSize =
                leadGetPageSize();

            const maxPage =
                Math.max(
                    1,
                    Math.ceil(
                        totalAfterDelete /
                        pageSize
                    )
                );

            const pageAfterDelete =
                Math.min(
                    leadGetCurrentPage(),
                    maxPage
                );

            await loadLeads(
                pageAfterDelete
            );

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
                    "Lead deleted successfully.",
                    "success"
                );
            }

        } catch (error) {

            console.error(
                "deleteLead error:",
                error
            );

            if (
                typeof window.showToast ===
                "function"
            ) {
                window.showToast(
                    error.message ||
                    "An error occurred while deleting the lead.",
                    "error"
                );
            } else {
                alert(
                    error.message
                );
            }
        }
    }

    // ========================================================
    // SALES ASSIGNMENT ACCESS
    // ========================================================

    function setupSalesAssignmentAccess() {

        const select =
            leadElement(
                "leadSalesAssign"
            );

        if (!select) return;

        const profile =
            leadGetProfile();

        if (!profile) return;

        const isAdmin =
            leadIsAdmin();

        const isSales =
            leadIsSales();

        if (isAdmin) {

            select.disabled =
                false;

            select.removeAttribute(
                "aria-disabled"
            );

            return;
        }

        if (isSales) {

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
    // INITIALIZE EVENTS
    // ========================================================

    function initializeLeads() {

        if (leadsInitialized) {
            return;
        }

        leadsInitialized = true;

        // ----------------------------------------------------
        // Search
        // ----------------------------------------------------

        const searchInput =
            leadElement(
                "leadSearch",
                "leadsSearch"
            );

        if (searchInput) {

            searchInput.addEventListener(
                "input",
                onSearchInput
            );
        }

        // ----------------------------------------------------
        // Filters
        // ----------------------------------------------------

        [
            "statusFilter",
            "leadStatusFilter",
            "businessFilter",
            "locationFilter",
            "salesFilter"
        ].forEach(id => {

            const element =
                document.getElementById(id);

            if (!element) return;

            element.addEventListener(
                "change",
                filterLeads
            );
        });

        // ----------------------------------------------------
        // Previous / Next
        // ----------------------------------------------------

        const prevBtn =
            leadElement(
                "prevBtn"
            );

        if (prevBtn) {

            prevBtn.addEventListener(
                "click",
                function () {
                    changePage(-1);
                }
            );
        }

        const nextBtn =
            leadElement(
                "nextBtn"
            );

        if (nextBtn) {

            nextBtn.addEventListener(
                "click",
                function () {
                    changePage(1);
                }
            );
        }

        // ----------------------------------------------------
        // ESC closes modal
        // ----------------------------------------------------

        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key !== "Escape"
                ) {
                    return;
                }

                const modal =
                    leadElement(
                        "leadModal"
                    );

                if (
                    modal &&
                    modal.classList.contains(
                        "show"
                    )
                ) {
                    closeLeadModal();
                }
            }
        );

        // ----------------------------------------------------
        // Click outside modal
        // ----------------------------------------------------

        const modal =
            leadElement(
                "leadModal"
            );

        if (modal) {

            modal.addEventListener(
                "click",
                function (event) {

                    if (
                        event.target ===
                        modal
                    ) {
                        closeLeadModal();
                    }
                }
            );
        }

        setupSalesAssignmentAccess();
    }

    // ========================================================
    // EXPORT TO WINDOW
    // ========================================================

    window.loadFilterOptions =
        loadFilterOptions;

    window.populateFilter =
        populateFilter;

    window.loadLeads =
        loadLeads;

    window.updatePagination =
        updatePagination;

    window.changePage =
        changePage;

    window.nextLeadPage =
        nextLeadPage;

    window.previousLeadPage =
        previousLeadPage;

    window.renderLeads =
        renderLeads;

    window.filterLeads =
        filterLeads;

    window.onSearchInput =
        onSearchInput;

    window.clearLeadFilters =
        clearLeadFilters;

    window.openLeadModal =
        openLeadModal;

    window.closeLeadModal =
        closeLeadModal;

    window.clearLeadForm =
        clearLeadForm;

    window.openEditLead =
        openEditLead;

    window.saveLead =
        saveLead;

    window.deleteLead =
        deleteLead;

    window.setupSalesAssignmentAccess =
        setupSalesAssignmentAccess;

    // Namespace
    window.FSILeads = {
        loadFilterOptions,
        populateFilter,
        loadLeads,
        updatePagination,
        changePage,
        nextLeadPage,
        previousLeadPage,
        renderLeads,
        filterLeads,
        onSearchInput,
        clearLeadFilters,
        openLeadModal,
        closeLeadModal,
        clearLeadForm,
        openEditLead,
        saveLead,
        deleteLead,
        setupSalesAssignmentAccess
    };

    // ========================================================
    // DOM READY
    // ========================================================

    document.addEventListener(
        "DOMContentLoaded",
        function () {
            initializeLeads();

            console.log(
                "FSI CRM: Leads module loaded."
            );
        }
    );

})();
```
