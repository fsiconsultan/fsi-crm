/* =====================================================
   CUSTOMER PROFILE CONTROLLER & RENDERER
====================================================== */

let crmCurrentCustomerId = null;
let crmCurrentCustomer = null;

async function openCustomerProfile(id) {
  if (!id) return;
  crmCurrentCustomerId = id;

  try {
    if (typeof supabaseClient === "undefined") {
      console.error("Supabase client tidak tersedia.");
      return;
    }

    const result = await supabaseClient
      .from("leads")
      .select("*")
      .eq("id", id)
      .single();

    if (result.error) {
      console.error("Gagal mengambil customer:", result.error);
      return;
    }

    crmCurrentCustomer = result.data;
    renderCustomerProfile(crmCurrentCustomer);

    crmPreviousPage = crmCurrentPage;
    hideCrmPages();

    const profile = document.getElementById("customerProfilePage");
    if (profile) profile.style.display = "block";
    crmCurrentPage = "customerProfilePage";

    updateCrmSidebarActive("customerProfilePage");
    updateCrmPageTitle("customerProfile");

    if (window.lucide) lucide.createIcons();
  } catch (error) {
    console.error("Customer profile error:", error);
  }
}

function crmGetSalesNameById(salesId) {
  if (!salesId) return "-";

  const source = window.salesUsersData || (typeof salesUsersData !== "undefined" ? salesUsersData : null);

  if (Array.isArray(source)) {
    const found = source.find(s => String(s.id || s.user_id || s.auth_user_id || "") === String(salesId));
    if (found) return found.name || found.sales_name || found.full_name || found.username || "-";
  }

  return String(salesId);
}

function crmPopulateProfileSales(selectedId) {
  const select = document.getElementById("crmEditSales");
  if (!select) return;

  const existing = select.value;
  select.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select Sales";
  select.appendChild(placeholder);

  const source = window.salesUsersData || (typeof salesUsersData !== "undefined" ? salesUsersData : null);

  if (Array.isArray(source)) {
    source.forEach(function(sales) {
      const salesId = sales.id || sales.user_id || sales.auth_user_id;
      if (!salesId) return;

      const role = String(sales.role || "sales").toLowerCase();
      if (role !== "sales" || sales.is_active === false || sales.active === false) return;

      const option = document.createElement("option");
      option.value = salesId;
      option.textContent = sales.name || sales.sales_name || sales.full_name || sales.username || "Sales";
      select.appendChild(option);
    });
  }

  if (selectedId != null) select.value = String(selectedId);
  else if (existing) select.value = existing;

  const activeProfile = window.currentProfile || (typeof currentProfile !== "undefined" ? currentProfile : null);
  const role = String(activeProfile?.role || "").toLowerCase();

  if (role === "sales" && activeProfile?.id) {
    select.value = String(activeProfile.id);
    select.disabled = true;
  } else {
    select.disabled = false;
  }
}

function renderCustomerProfile(customer) {
  if (!customer) return;

  const name = customer.customer_name || "Customer";
  const phone = customer.phone || "";
  const status = customer.status || "Belum Dihubungi";

  /* Header */
  if (document.getElementById("profileCustomerName")) document.getElementById("profileCustomerName").textContent = name;
  if (document.getElementById("profileCustomerContact")) document.getElementById("profileCustomerContact").textContent = phone || "No phone number";

  const avatar = document.getElementById("profileAvatar");
  if (avatar) avatar.textContent = name.trim().charAt(0).toUpperCase() || "C";

  if (document.getElementById("profileStatusBadge")) document.getElementById("profileStatusBadge").textContent = status;
  if (document.getElementById("profileSalesBadge")) document.getElementById("profileSalesBadge").textContent = crmGetSalesNameById(customer.sales_id);
  if (document.getElementById("profileLeadAge")) document.getElementById("profileLeadAge").textContent = "Lead age: " + crmCalculateLeadAge(customer.created_at);

  /* Form Population */
  crmSetInputValue("crmEditCustomerName", customer.customer_name);
  crmSetInputValue("crmEditPhone", customer.phone);
  crmSetInputValue("crmEditEmail", customer.email);
  crmSetInputValue("crmEditBusiness", customer.business);
  crmSetInputValue("crmEditLocation", customer.location);
  crmSetInputValue("crmEditStatus", customer.status || "Belum Dihubungi");

  crmPopulateProfileSales(customer.sales_id);

  crmSetInputValue("crmEditFollowUp", customer.follow_up_date);
  crmSetInputValue("crmEditAppointment", customer.appointment);
  crmSetInputValue("crmEditSiteSurvey", customer.site_survey);
  crmSetInputValue("crmEditQuotation", customer.quotation);
  crmSetInputValue("crmEditSPK", customer.spk);
  crmSetInputValue("crmEditClosing", customer.closing);

  crmSetInputValue("crmEditBusinessProject", customer.business);
  crmSetInputValue("crmEditLocationProject", customer.location);
  crmSetInputValue("crmEditNotes", customer.notes);

  const createdDate = document.getElementById("profileCreatedDate");
  if (createdDate) {
    createdDate.innerHTML = "<span>Lead Created</span><strong>" + crmEscapeHtml(crmFormatDate(customer.created_at)) + "</strong>";
  }

  crmRenderCustomerActivity(customer);
  updateCustomerPipeline(customer);
  crmRenderAppointment(customer);

  const saveStatus = document.getElementById("crmProfileSaveStatus");
  if (saveStatus) {
    saveStatus.textContent = "Changes are saved to this customer record.";
    saveStatus.className = "crm-profile-save-status";
  }
}

function updateCustomerPipeline(customer) {
  const fields = {
    pipelineLead: true,
    pipelineFollowUp: !!customer.follow_up_date,
    pipelineAppointment: !!customer.appointment,
    pipelineSurvey: !!customer.site_survey,
    pipelineQuotation: !!customer.quotation,
    pipelineSPK: !!customer.spk,
    pipelineClosing: !!customer.closing
  };

  Object.keys(fields).forEach(function(id) {
    const element = document.getElementById(id);
    if (element) element.classList.toggle("active", fields[id]);
  });
}

function crmRenderCustomerActivity(customer) {
  const container = document.getElementById("profileActivityList");
  if (!container) return;

  const activities = [
    { label: "Lead Created", date: customer.created_at },
    { label: "Follow Up", date: customer.follow_up_date },
    { label: "Appointment", date: customer.appointment },
    { label: "Site Survey", date: customer.site_survey },
    { label: "Quotation", date: customer.quotation },
    { label: "SPK", date: customer.spk },
    { label: "Closing", date: customer.closing }
  ].filter(item => !!item.date);

  if (!activities.length) {
    container.innerHTML = '<div class="crm-empty-module"><p>No activity yet.</p></div>';
    return;
  }

  container.innerHTML = activities.map(function(item) {
    const formattedDate = crmFormatDate(item.date);
    const parts = formattedDate.split(" ");
    return (
      '<div class="appointment-item">' +
        '<div class="appointment-date-box">' +
          '<strong>' + crmEscapeHtml(parts[0] || "") + '</strong>' +
          '<span>' + crmEscapeHtml(parts[1] || "") + '</span>' +
        '</div>' +
        '<div class="appointment-info">' +
          '<strong>' + crmEscapeHtml(item.label) + '</strong>' +
          '<span>' + crmEscapeHtml(formattedDate) + '</span>' +
        '</div>' +
      '</div>'
    );
  }).join("");
}

function crmRenderAppointment(customer) {
  const container = document.getElementById("profileAppointmentList");
  if (!container) return;

  if (!customer.appointment) {
    container.innerHTML = '<div class="crm-empty-module"><p>No appointment yet.</p></div>';
    return;
  }

  const formattedDate = crmFormatDate(customer.appointment);
  const parts = formattedDate.split(" ");

  container.innerHTML =
    '<div class="appointment-item">' +
      '<div class="appointment-date-box">' +
        '<strong>' + crmEscapeHtml(parts[0] || "") + '</strong>' +
        '<span>' + crmEscapeHtml(parts[1] || "") + '</span>' +
      '</div>' +
      '<div class="appointment-info">' +
        '<strong>Customer Appointment</strong>' +
        '<span>' + crmEscapeHtml(formattedDate) + '</span>' +
      '</div>' +
    '</div>';
}
