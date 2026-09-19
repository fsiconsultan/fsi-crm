// ==========================================
// FORM & MODAL MANAGEMENT (js/crm/leads.js)
// ==========================================

function closeLeadModal() {
  const modal = document.getElementById("leadModal");
  if (!modal) return;
  modal.classList.remove("show");
  modal.style.display = "none";
}

function clearLeadForm() {
  const fields = [
    "leadId", "leadCustomer", "leadPhone", "leadEmail", 
    "leadBusiness", "leadLocation", "leadFollowUp", "leadAppointment", 
    "leadSiteSurvey", "leadQuotation", "leadSPK", "leadClosing", "leadNotes"
  ];
  fields.forEach(field => setValue(field, ""));
  setValue("leadStatus", "New");
  setValue("leadSalesAssign", currentProfile?.role === "Sales" ? currentProfile.id : "");
  setupSalesAssignmentAccess();
}

async function saveLead() {
  if (!currentProfile) return alert("User profile is not ready.");
  
  const customer = document.getElementById("leadCustomer").value.trim();
  if (!customer) return alert("Customer name is required.");

  const leadId = document.getElementById("leadId").value;
  const payload = {
    customer_name: customer,
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
    notes: document.getElementById("leadNotes").value.trim(),
    updated_by: currentProfile.id
  };

  const selectedSales = document.getElementById("leadSalesAssign")?.value || "";
  payload.sales_id = currentProfile.role === "Admin" ? (selectedSales || null) : currentProfile.id;

  try {
    let error;
    if (leadId) {
      ({ error } = await supabaseClient.from("leads").update(payload).eq("id", leadId));
    } else {
      payload.created_by = currentProfile.id;
      ({ error } = await supabaseClient.from("leads").insert([payload]));
    }

    if (error) throw error;

    alert(`Lead ${leadId ? "updated" : "added"} successfully.`);
    closeLeadModal();
    await loadFilterOptions();
    await loadLeads(currentPage);
    await updateDashboard();
  } catch (err) {
    console.error("saveLead error:", err);
    alert("Error: " + err.message);
  }
}

// ==========================================
// PIPELINE INTERACTION
// ==========================================

window.crmSelectPipelineStep = function (stepKey) {
  const step = CUSTOMER_PIPELINE.find(item => item.key === stepKey);
  if (!step) return;

  crmActivePipelineStep = stepKey;
  const customer = window.crmCurrentCustomer;
  if (!customer) return;

  crmRenderCustomerWorkspace(customer);
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.crmSavePipelineStage = async function (stepKey) {
  if (!currentProfile) return alert("User profile is not ready.");
  const customer = window.crmCurrentCustomer;
  if (!customer) return alert("Customer not selected.");

  const step = CUSTOMER_PIPELINE.find(item => item.key === stepKey);
  if (!step) return;

  const payload = { updated_by: currentProfile.id };
  const dateInput = document.getElementById("crmPipelineDateInput")?.value || null;

  if (step.key === "new") payload.status = "New";
  if (step.key === "flyer") payload.status = "Flyer Sent";
  if (step.key === "interested") payload.status = "Interested";
  if (step.key === "followup") { payload.status = "Follow Up"; payload.follow_up_date = dateInput; }
  if (step.key === "appointment") payload.appointment = dateInput;
  if (step.key === "survey") payload.site_survey = dateInput;
  if (step.key === "quotation") payload.quotation = dateInput;
  if (step.key === "spk") payload.spk = dateInput;
  if (step.key === "closing") { payload.status = "Closing"; payload.closing = dateInput; }

  const button = document.querySelector("#crmPipelinePanel .crm-stage-save-button");

  try {
    if (button) {
      button.disabled = true;
      button.textContent = "Saving...";
    }

    const { data, error } = await supabaseClient
      .from("leads")
      .update(payload)
      .eq("id", customer.id)
      .select("*")
      .single();

    if (error) throw error;

    window.crmCurrentCustomer = data;
    crmRenderCustomerWorkspace(data);
    alert("Pipeline updated successfully.");
  } catch (err) {
    console.error("Pipeline save error:", err);
    alert("Failed to update pipeline:\n" + err.message);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Save";
    }
  }
};
