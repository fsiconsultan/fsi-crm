```javascript
// ============================================================
// CUSTOMER PROFILE & CUSTOMER EDIT MODULE
// ============================================================

async function editLead(id) {
    if (!id) {
        alert("Customer ID not found.");
        return;
    }

    if (typeof window.crmOpenCustomerProfile === "function") {
        await window.crmOpenCustomerProfile(id);
        return;
    }

    let lead = leadsData.find(item => String(item.id) === String(id));
    if (!lead) {
        const { data, error } = await supabaseClient
            .from("leads")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        if (error || !data) {
            alert("Customer not found.");
            return;
        }
        lead = data;
    }

    window.crmCurrentCustomerId = lead.id;
    window.crmCurrentCustomer = lead;
    crmRenderCustomerEditPage(lead);
    crmShowProfilePageFallback();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

window.crmSaveCustomerEdit = async function () {
    if (!currentProfile) {
        alert("User profile is not ready.");
        return;
    }

    const id = window.crmCurrentCustomerId;
    if (!id) {
        alert("Customer ID not found.");
        return;
    }

    const customerName = document.getElementById("crmEditCustomerName")?.value.trim() || "";
    if (!customerName) {
        alert("Customer name is required.");
        return;
    }

    const payload = {
        customer_name: customerName,
        phone: document.getElementById("crmEditPhone")?.value.trim() || "",
        email: document.getElementById("crmEditEmail")?.value.trim() || "",
        business: document.getElementById("crmEditBusiness")?.value.trim() || "",
        location: document.getElementById("crmEditLocation")?.value.trim() || "",
        status: normalizeLeadStatus(document.getElementById("crmEditStatus")?.value || "New"),
        follow_up_date: document.getElementById("crmEditFollowUp")?.value || null,
        appointment: document.getElementById("crmEditAppointment")?.value || null,
        site_survey: document.getElementById("crmEditSiteSurvey")?.value || null,
        quotation: document.getElementById("crmEditQuotation")?.value || null,
        spk: document.getElementById("crmEditSPK")?.value || null,
        closing: document.getElementById("crmEditClosing")?.value || null,
        notes: document.getElementById("crmEditNotes")?.value.trim() || "",
        updated_by: currentProfile.id
    };

    const selectedSales = document.getElementById("crmEditSales")?.value || "";
    if (currentProfile.role === "Admin") {
        payload.sales_id = selectedSales || null;
    } else {
        payload.sales_id = currentProfile.id;
    }

    const saveButton = document.getElementById("crmEditSaveButton");

    try {
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = "Saving...";
        }

        const { data, error } = await supabaseClient
            .from("leads")
            .update(payload)
            .eq("id", id)
            .select("*")
            .single();

        if (error) {
            alert("Failed to update customer: \n" + error.message);
            return;
        }

        window.crmCurrentCustomerId = data.id;
        window.crmCurrentCustomer = data;

        alert("Customer updated successfully.");

        await loadFilterOptions();
        await loadLeads(currentPage);
        await updateDashboard();

        crmRenderCustomerEditPage(data);

        if (typeof window.crmNavigate === "function") {
            window.crmNavigate("customerProfile");
        } else {
            crmShowProfilePageFallback();
        }

        setPageTitle("Customer Profile");
        window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
        alert("An error occurred: \n" + error.message);
    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = "SAVE CHANGES";
        }
    }
};

function crmRenderCustomerEditPage(customer) {
    const page = document.getElementById("customerProfilePage");
    if (!page) {
        alert("Customer page not found.");
        return;
    }

    const customerName = getValue(customer.customer_name);
    const phone = getValue(customer.phone);
    const email = getValue(customer.email);
    const business = getValue(customer.business);
    const location = getValue(customer.location);
    const status = normalizeLeadStatus(customer.status);
    const salesId = customer.sales_id || "";

    page.innerHTML = `
        <div class="crm-full-edit-page">
            <div class="crm-edit-toolbar">
                <button type="button" class="crm-back-btn" onclick="crmCancelCustomerEdit()">
                    ← Back to Customers
                </button>
                <div class="crm-edit-toolbar-title">
                    <span class="eyebrow">CUSTOMER PROFILE</span>
                    <h2>${escapeHTML(customerName || "Customer")}</h2>
                    <p>View and update customer information and sales progress.</p>
                </div>
            </div>

            <div class="panel crm-edit-card">
                <div class="panel-header">
                    <div>
                        <div class="eyebrow">CUSTOMER INFORMATION</div>
                        <h3 class="panel-title">Basic Information</h3>
                    </div>
                </div>
                <div class="crm-edit-grid">
                    <div class="crm-edit-field">
                        <label>Customer Name</label>
                        <input id="crmEditCustomerName" type="text" value="${escapeHTML(customerName)}" placeholder="Customer name">
                    </div>
                    <div class="crm-edit-field">
                        <label>Phone / WhatsApp</label>
                        <input id="crmEditPhone" type="text" value="${escapeHTML(phone)}" placeholder="Phone / WhatsApp">
                    </div>
                    <div class="crm-edit-field">
                        <label>Email</label>
                        <input id="crmEditEmail" type="email" value="${escapeHTML(email)}" placeholder="Email">
                    </div>
                    <div class="crm-edit-field">
                        <label>Business</label>
                        <input id="crmEditBusiness" type="text" value="${escapeHTML(business)}" placeholder="Business">
                    </div>
                    <div class="crm-edit-field">
                        <label>Location</label>
                        <input id="crmEditLocation" type="text" value="${escapeHTML(location)}" placeholder="Location">
                    </div>
                    <div class="crm-edit-field">
                        <label>Status</label>
                        <select id="crmEditStatus"></select>
                    </div>
                    <div class="crm-edit-field">
                        <label>Sales</label>
                        <select id="crmEditSales"></select>
                    </div>
                </div>
            </div>

            <div class="panel crm-edit-card">
                <div class="panel-header">
                    <div>
                        <div class="eyebrow">SALES PIPELINE</div>
                        <h3 class="panel-title">Customer Progress</h3>
                    </div>
                </div>
                <div class="crm-edit-grid">
                    <div class="crm-edit-field">
                        <label>Follow Up</label>
                        <input id="crmEditFollowUp" type="date" value="${escapeHTML(customer.follow_up_date || '')}">
                    </div>
                    <div class="crm-edit-field">
                        <label>Appointment</label>
                        <input id="crmEditAppointment" type="date" value="${escapeHTML(customer.appointment || '')}">
                    </div>
                    <div class="crm-edit-field">
                        <label>Site Survey</label>
                        <input id="crmEditSiteSurvey" type="date" value="${escapeHTML(customer.site_survey || '')}">
                    </div>
                    <div class="crm-edit-field">
                        <label>Quotation</label>
                        <input id="crmEditQuotation" type="date" value="${escapeHTML(customer.quotation || '')}">
                    </div>
                    <div class="crm-edit-field">
                        <label>SPK</label>
                        <input id="crmEditSPK" type="date" value="${escapeHTML(customer.spk || '')}">
                    </div>
                    <div class="crm-edit-field">
                        <label>Closing</label>
                        <input id="crmEditClosing" type="date" value="${escapeHTML(customer.closing || '')}">
                    </div>
                </div>
            </div>

            <div class="panel crm-edit-card">
                <div class="panel-header">
                    <div>
                        <div class="eyebrow">NOTES</div>
                        <h3 class="panel-title">Customer Notes</h3>
                    </div>
                </div>
                <div class="crm-edit-field">
                    <label>Notes</label>
                    <textarea id="crmEditNotes" rows="7" placeholder="Customer notes...">${escapeHTML(customer.notes || '')}</textarea>
                </div>
            </div>

            <div class="crm-edit-actions">
                <button type="button" class="secondary-btn" onclick="crmCancelCustomerEdit()">CANCEL</button>
                <button type="button" id="crmEditSaveButton" class="primary-btn" onclick="crmSaveCustomerEdit()">SAVE CHANGES</button>
            </div>
        </div>
    `;

    crmPopulateEditStatus(status);
    crmPopulateEditSales(salesId);
}

function crmPopulateEditStatus(selectedStatus) {
    const select = document.getElementById("crmEditStatus");
    if (!select) return;

    select.innerHTML = "";
    LEAD_STATUSES.forEach(status => {
        const option = document.createElement("option");
        option.value = status;
        option.textContent = status;
        if (status === selectedStatus) option.selected = true;
        select.appendChild(option);
    });
}

function crmPopulateEditSales(selectedSalesId) {
    const select = document.getElementById("crmEditSales");
    if (!select) return;

    select.innerHTML = "";
    const selectOption = document.createElement("option");
    selectOption.value = "";
    selectOption.textContent = "Select Sales";
    select.appendChild(selectOption);

    salesUsersData
        .filter(sales => sales.role === "Sales")
        .forEach(sales => {
            const option = document.createElement("option");
            option.value = sales.id;
            option.textContent = sales.name || sales.username || "Sales";
            if (String(sales.id) === String(selectedSalesId)) option.selected = true;
            select.appendChild(option);
        });

    if (currentProfile && currentProfile.role !== "Admin") {
        select.value = currentProfile.id;
        select.disabled = true;
    }
}

window.crmCancelCustomerEdit = function () {
    if (typeof window.crmNavigate === "function") {
        window.crmNavigate("leads");
    } else {
        const customerPage = document.getElementById("customerProfilePage");
        if (customerPage) customerPage.style.display = "none";
        
        const allPages = ["dashboardPage", "leadsPage", "salesPage"];
        allPages.forEach(pageId => {
            const page = document.getElementById(pageId);
            if (page) page.style.display = pageId === "leadsPage" ? "block" : "none";
        });
        setPageTitle(currentProfile && currentProfile.role === "Admin" ? "All Leads" : "My Leads");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    loadLeads(currentPage);
};

(function () {
    "use strict";

    window.crmCurrentCustomerId = null;
    window.crmCurrentCustomer = null;

    window.crmOpenCustomerProfile = async function (id) {
        if (!id) {
            alert("Customer ID not found.");
            return;
        }

        try {
            const { data, error } = await supabaseClient
                .from("leads")
                .select("*")
                .eq("id", id)
                .single();

            if (error || !data) {
                alert("Customer not found.");
                return;
            }

            window.crmCurrentCustomerId = data.id;
            window.crmCurrentCustomer = data;

            crmRenderCustomerEditPage(data);

            if (typeof window.crmNavigate === "function") {
                window.crmNavigate("customerProfile");
            } else {
                crmShowProfilePageFallback();
            }

            setPageTitle("Customer Profile");
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (error) {
            alert("An error occurred:\n" + error.message);
        }
    };

    function crmShowProfilePageFallback() {
        const pages = ["dashboardPage", "leadsPage", "salesPage", "customerProfilePage"];
        pages.forEach(function (id) {
            const page = document.getElementById(id);
            if (page) page.style.display = id === "customerProfilePage" ? "block" : "none";
        });
        setPageTitle("Customer Profile");
    }

    window.crmRenderCustomerProfile = function(customer) {
        window.crmCurrentCustomerId = customer.id;
        window.crmCurrentCustomer = customer;
        crmRenderCustomerEditPage(customer);
    };

    window.crmShowProfilePageFallback = crmShowProfilePageFallback;
    window.openCustomerProfile = window.crmOpenCustomerProfile;
})();
```
