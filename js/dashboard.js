async function getDashboardData() {
  let q = supabaseClient
    .from("leads")
    .select("id,customer_name,business,status,appointment,site_survey,quotation,spk,closing,created_at,sales_id");

  if (currentProfile?.role !== "Admin") q = q.eq("sales_id", currentProfile.id);

  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

async function updateDashboard() {
  if (!currentProfile || !$("statTotal")) return;

  try {
    const data = await getDashboardData();

    $("statTotal").textContent = data.length;
    $("statNew").textContent = countStatus(data, "New");
    $("statInterested").textContent = countStatus(data, "Interested");
    $("statFollowUp").textContent = countStatus(data, "Follow Up");
    $("statAppointment").textContent = data.filter(x => !!x.appointment).length;
    $("statSiteSurvey").textContent = data.filter(x => !!x.site_survey).length;
    $("statQuotation").textContent = data.filter(x => !!x.quotation).length;
    $("statClosing").textContent = data.filter(x => !!x.closing || normalizeLeadStatus(x.status) === "Closing").length;

    renderChart(data);
    renderPipeline(data);
    renderRecentLeads(data);
  } catch (e) {
    console.error(e);
    showToast("Dashboard gagal dimuat: " + e.message, "error");
  }
}

function renderChart(data) {
  const box = $("salesOverviewChart");
  if (!box) return;

  const values = CRM_CONFIG.statuses.map(s => ({ label: s, value: countStatus(data, s) }));
  const max = Math.max(...values.map(x => x.value), 1);

  box.innerHTML = values.map(x => `
    <div class="bar-row">
      <span>${escapeHTML(x.label)}</span>
      <div><i style="width:${Math.round(x.value / max * 100)}%"></i></div>
      <strong>${x.value}</strong>
    </div>
  `).join("");
}

function renderPipeline(data) {
  const box = $("dashboardPipeline");
  if (!box) return;

  const stages = [
    ["New", countStatus(data, "New")],
    ["Interested", countStatus(data, "Interested")],
    ["Follow Up", countStatus(data, "Follow Up")],
    ["Appointment", data.filter(x => x.appointment).length],
    ["Quotation", data.filter(x => x.quotation).length],
    ["Closing", data.filter(x => x.closing || normalizeLeadStatus(x.status) === "Closing").length]
  ];

  box.innerHTML = stages.map(x => `
    <div class="pipeline-stage"><span>${escapeHTML(x[0])}</span><strong>${x[1]}</strong></div>
  `).join("");
}

function renderRecentLeads(data) {
  const box = $("recentLeads");
  if (!box) return;

  const recent = (data || []).slice(0, 6);
  if (!recent.length) {
    box.innerHTML = '<div class="empty-inline">Belum ada lead.</div>';
    return;
  }

  box.innerHTML = recent.map(l => `
    <button class="recent-lead" type="button" onclick="openCustomerProfile('${String(l.id).replace(/'/g, "\\'")}')">
      <span class="recent-avatar">${escapeHTML((l.customer_name || "?").charAt(0).toUpperCase())}</span>
      <span><strong>${safeText(l.customer_name)}</strong><small>${safeText(l.business || "")} · ${formatDate(l.created_at)}</small></span>
      <em class="status-badge status-${normalizeLeadStatus(l.status).toLowerCase().replace(/\s+/g, "-")}">${safeText(normalizeLeadStatus(l.status))}</em>
    </button>
  `).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  $("dashboardAddLead")?.addEventListener("click", () => {
    window.location.href = "leads.html?add=1";
  });
});
