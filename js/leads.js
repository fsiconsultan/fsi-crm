```javascript
// ================================
// LEADS MANAGEMENT
// ================================

async function loadFilterOptions() {
    try {
        const { data, error } = await supabaseClient
            .from("leads")
            .select("business, location");

        if (error) {
            console.error("Load filter options error:", error);
            return;
        }

        const leads = data || [];
        const businesses = [
            ...new Set(
                leads
                    .map(lead => getValue(lead.business).trim())
                    .filter(value => value !== "")
            )
        ].sort((a, b) => a.localeCompare(b));

        const locations = [
            ...new Set(
                leads
                    .map(lead => getValue(lead.location).trim())
                    .filter(value => value !== "")
            )
        ].sort((a, b) => a.localeCompare(b));

        populateFilter("businessFilter", businesses, "All Business");
        populateFilter("locationFilter", locations, "All Location");
        populateSalesDropdowns();
    } catch (error) {
        console.error("loadFilterOptions error:", error);
    }
}

function populateFilter(id, values, defaultText) {
    const select = document.getElementById(id);
    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = "";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = defaultText;
    select.appendChild(defaultOption);

    values.forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });

    if (values.includes(currentValue)) {
        select.value = currentValue;
    } else {
        select.value = "";
    }
}

async function loadLeads(page = 1) {
    try {
        currentPage = Math.max(1, Number(page) || 1);

        if (!salesUsersData || salesUsersData.length === 0) {
            await loadSalesLookup();
        }

        const search = document.getElementById("leadSearch")?.value.trim() || "";
        const status = document.getElementById("statusFilter")?.value || "";
        const business = document.getElementById("businessFilter")?.value || "";
        const location = document.getElementById("locationFilter")?.value || "";
        const salesFilter = document.getElementById("salesFilter")?.value || "";

        let query = supabaseClient.from("leads").select("*", { count: "exact" });

        if (search) {
            const safeSearch = search.replace(/%/g, "\\%").replace(/_/g, "\\_");
            query = query.or([
                `customer_name.ilike.%${safeSearch}%`,
                `phone.ilike.%${safeSearch}%`,
                `email.ilike.%${safeSearch}%`,
                `business.ilike.%${safeSearch}%`,
                `location.ilike.%${safeSearch}%`
            ].join(","));
        }

        if (status) query = query.eq("status", status);
        if (business) query = query.eq("business", business);
        if (location) query = query.eq("location", location);
        if (salesFilter && currentProfile && currentProfile.role === "Admin") {
            query = query.eq("sales_id", salesFilter);
        }

        const from = (currentPage - 1) * pageSize;
        const to = from + pageSize - 1;

        query = query.order("created_at", { ascending: false }).range(from, to);

        const { data, error, count } = await query;

        if (error) {
            console.error("Load leads error:", error);
            alert(error.message);
            return;
        }

        leadsData = data || [];
        totalLeadsCount = count || 0;

        renderLeads(leadsData);
        updatePagination();
    } catch (error) {
        console.error("loadLeads error:", error);
    }
}

function updatePagination() {
    const paginationInfo = document.getElementById("paginationInfo");
    const pageIndicator = document.getElementById("pageIndicator");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");

    const totalPages = Math.max(1, Math.ceil(totalLeadsCount / pageSize));
    const start = totalLeadsCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalLeadsCount);

    if (paginationInfo) paginationInfo.textContent = `${start}-${end} of ${totalLeadsCount} leads`;
    if (pageIndicator) pageIndicator.textContent = `Page ${currentPage} / ${totalPages}`;
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

function changePage(direction) {
    const totalPages = Math.max(1, Math.ceil(totalLeadsCount / pageSize));
    const newPage = currentPage + Number(direction);

    if (newPage < 1 || newPage > totalPages) return;
    loadLeads(newPage);
}

function renderLeads(data) {
    const table = document.getElementById("leadsTable");
    if (!table) return;

    table.innerHTML = "";

    if (!data || data.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="10" style="text-align:center;">
                    No leads found
                </td>
            </tr>
        `;
        return;
    }

    data.forEach(lead => {
        const tr = document.createElement("tr");
        const salesName = getSalesName(lead.sales_id);
        const displayStatus = normalizeLeadStatus(lead.status);

        tr.innerHTML = `
            <td>${escapeHTML(getValue(lead.customer_name))}</td>
            <td>
                ${lead.phone 
                    ? `<a href="${whatsappLink(lead.phone)}" target="_blank" rel="noopener noreferrer" class="wa-link">${escapeHTML(lead.phone)}</a>` 
                    : "-"
                }
            </td>
            <td>
                ${lead.email 
                    ? `<a href="mailto:${escapeHTML(lead.email)}">${escapeHTML(lead.email)}</a>` 
                    : "-"
                }
            </td>
            <td>${escapeHTML(getValue(lead.business))}</td>
            <td>${escapeHTML(getValue(lead.location))}</td>
            <td>${salesName !== "-" ? escapeHTML(salesName) : "-"}</td>
            <td>
                <span class="status-badge ${statusClass(displayStatus)}">
                    ${escapeHTML(displayStatus)}
                </span>
            </td>
            <td>${formatDate(lead.follow_up_date)}</td>
            <td>${formatDate(lead.appointment)}</td>
            <td>
                <div class="crm-lead-actions">
                    <button type="button" class="primary-btn small-btn" onclick="crmOpenCustomerProfile('${lead.id}')">
                        Profile
                    </button>
                    <button type="button" class="secondary-btn small-btn" onclick="deleteLead('${lead.id}')">
                        Delete
                    </button>
                </div>
            </td>
        `;
        table.appendChild(tr);
    });
}

function filterLeads() {
    loadLeads(1);
}

function onSearchInput() {
    loadLeads(1);
}

function openLeadModal() {
    const modal = document.getElementById("leadModal");
    if (!modal) {
        alert("Lead modal not found.");
        return;
    }
    clearLeadForm();
    const title = document.getElementById("leadModalTitle");
    if (title) title.textContent = "Add Lead";
    modal.classList.add("show");
    modal.style.display = "flex";
}

function closeLeadModal() {
    const modal = document.getElementById("leadModal");
    if (!modal) return;
    modal.classList.remove("show");
    modal.style.display = "none";
}

function clearLeadForm() {
    setValue("leadId", "");
    setValue("leadCustomer", "");
    setValue("leadPhone", "");
    setValue("leadEmail", "");
    setValue("leadBusiness", "");
    setValue("leadLocation", "");
    setValue("leadStatus", "New");
    setValue(
        "leadSalesAssign",
        currentProfile && currentProfile.role === "Sales" ? currentProfile.id : ""
    );
    setValue("leadFollowUp", "");
    setValue("leadAppointment", "");
    setValue("leadSiteSurvey", "");
    setValue("leadQuotation", "");
    setValue("leadSPK", "");
    setValue("leadClosing", "");
    setValue("leadNotes", "");
    setupSalesAssignmentAccess();
}

async function saveLead() {
    if (!currentProfile) {
        alert("User profile is not ready.");
        return;
    }

    const customer = document.getElementById("leadCustomer").value.trim();
    if (!customer) {
        alert("Customer name is required.");
        return;
    }

    const leadId = document.getElementById("leadId").value;
    const payload = {
        customer_name: document.getElementById("leadCustomer").value.trim(),
        phone: document.getElementById("leadPhone").value.trim(),
        email: document.getElementById("leadEmail").value.trim(),
        business: document.getElementById("leadBusiness").value.trim(),
        location: document.getElementById("leadLocation").value.trim(),
        status: normalizeLeadStatus(document.getElementById("leadStatus").value),
        follow_up_date: document.getElementById("leadFollowUp").value || null,
        appointment: document.getElementById("leadAppointment").value || null,
        site_survey: document.getElementById("leadSiteSurvey").value || null,
        quotation: document.getElementById("leadQuotation").value || null,
        spk: document.getElementById("leadSPK").value || null,
        closing: document.getElementById("leadClosing").value || null,
        notes: document.getElementById("leadNotes").value.trim()
    };

    const selectedSales = document.getElementById("leadSalesAssign")?.value || "";
    if (currentProfile.role === "Admin") {
        payload.sales_id = selectedSales || null;
    } else {
        payload.sales_id = currentProfile.id;
    }

    try {
        if (leadId) {
            payload.updated_by = currentProfile.id;
            const { error } = await supabaseClient.from("leads").update(payload).eq("id", leadId);
            if (error) {
                alert("Failed to update lead: \n" + error.message);
                return;
            }
            alert("Lead updated successfully.");
        } else {
            payload.created_by = currentProfile.id;
            payload.updated_by = currentProfile.id;
            const { error } = await supabaseClient.from("leads").insert([payload]);
            if (error) {
                alert("Failed to add lead: \n" + error.message);
                return;
            }
            alert("Lead added successfully.");
        }

        closeLeadModal();
        await loadFilterOptions();
        await loadLeads(currentPage);
        await updateDashboard();
    } catch (error) {
        alert("An error occurred: \n" + error.message);
    }
}

async function deleteLead(id) {
    const confirmDelete = confirm("Delete this lead?");
    if (!confirmDelete) return;

    try {
        const { error } = await supabaseClient.from("leads").delete().eq("id", id);
        if (error) {
            alert("Failed to delete lead: \n" + error.message);
            return;
        }

        if (String(window.crmCurrentCustomerId) === String(id)) {
            window.crmCurrentCustomerId = null;
            window.crmCurrentCustomer = null;
        }

        await loadFilterOptions();
        await loadLeads(currentPage);
        await updateDashboard();
    } catch (error) {
        alert(error.message);
    }
}
```
