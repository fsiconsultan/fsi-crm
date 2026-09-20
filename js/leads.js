function populateStatusOptions() {
const selects = [$("statusFilter"), $("leadStatus")];

selects.forEach((select, i) => {
if (!select) return;
const current = select.value;
select.innerHTML = "";

```
if (i === 0) {
  const o = document.createElement("option");
  o.value = "";
  o.textContent = "All Status";
  select.appendChild(o);
}

CRM_CONFIG.statuses.forEach(s => {
  const o = document.createElement("option");
  o.value = s;
  o.textContent = s;
  select.appendChild(o);
});

if (CRM_CONFIG.statuses.includes(current)) select.value = current;
```

});
}

function populateSelect(id, values, first) {
const el = $(id);
if (!el) return;

const current = el.value;
el.innerHTML = `<option value="">${escapeHTML(first)}</option>`;

[...new Set((values || []).filter(Boolean))]
.sort((a, b) => String(a).localeCompare(String(b)))
.forEach(v => {
const o = document.createElement("option");
o.value = v;
o.textContent = v;
el.appendChild(o);
});

el.value = current;
}

function populateSales() {
const filter = $("salesFilter");
const assign = $("leadSalesAssign");

if (filter) {
filter.innerHTML = '<option value="">All Sales</option>';
salesUsersData
.filter(x => x.role === "Sales")
.forEach(s => {
const o = document.createElement("option");
o.value = s.id;
o.textContent = s.name || s.username;
filter.appendChild(o);
});
}

if (assign) {
assign.innerHTML = currentProfile?.role === "Admin" ? '<option value="">Unassigned</option>' : "";
salesUsersData
.filter(x => x.role === "Sales")
.forEach(s => {
const o = document.createElement("option");
o.value = s.id;
o.textContent = s.name || s.username;
assign.appendChild(o);
});

```
if (currentProfile?.role !== "Admin") assign.value = currentProfile.id;
```

}
}

async function loadSalesLookup() {
const { data, error } = await supabaseClient
.from("sales_users")
.select("id,name,username,role,status,created_at")
.order("name", { ascending: true });

if (error) {
console.error(error);
return;
}

salesUsersData = data || [];
populateSales();
}

async function loadFilterOptions() {
if (!$("statusFilter")) return;

populateStatusOptions();

const { data, error } = await supabaseClient
.from("leads")
.select("business,location");

if (error) {
console.error(error);
return;
}

populateSelect("businessFilter", (data || []).map(x => x.business), "All Business");
populateSelect("locationFilter", (data || []).map(x => x.location), "All Location");
populateSales();
}

function buildLeadQuery() {
const search = $("leadSearch")?.value.trim() || "";
const status = $("statusFilter")?.value || "";
const business = $("businessFilter")?.value || "";
const location = $("locationFilter")?.value || "";
const sales = $("salesFilter")?.value || "";

let q = supabaseClient.from("leads").select("*", { count: "exact" });

if (currentProfile?.role !== "Admin") q = q.eq("sales_id", currentProfile.id);

if (search) {
const safe = search.replace(/[(),%]/g, " ");
q = q.or(`customer_name.ilike.%${safe}%,phone.ilike.%${safe}%,business.ilike.%${safe}%,location.ilike.%${safe}%`);
}

if (status) q = q.eq("status", status);
if (business) q = q.eq("business", business);
if (location) q = q.eq("location", location);
if (currentProfile?.role === "Admin" && sales) q = q.eq("sales_id", sales);

return q;
}

async function loadLeads(page = 1) {
if (!$("leadsTableBody")) return;

currentPage = Math.max(1, page);
const tbody = $("leadsTableBody");
tbody.innerHTML = '<tr><td colspan="10" class="table-loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading leads...</td></tr>';
$("leadsEmptyState").style.display = "none";

try {
const from = (currentPage - 1) * CRM_CONFIG.pageSize;
const to = from + CRM_CONFIG.pageSize - 1;

```
const { data, error, count } = await buildLeadQuery()
  .order("created_at", { ascending: false })
  .range(from, to);

if (error) throw error;

leadsData = data || [];
totalLeadsCount = count || 0;

renderLeadsTable();
renderPagination();
```

} catch (e) {
console.error(e);
tbody.innerHTML = `<tr><td colspan="10" class="table-error">${escapeHTML(e.message)}</td></tr>`;
showToast("Leads gagal dimuat.", "error");
}
}

function renderLeadsTable() {
const tbody = $("leadsTableBody");
if (!tbody) return;

if (!leadsData.length) {
tbody.innerHTML = "";
$("leadsEmptyState").style.display = "block";
$("leadCountLabel").textContent = "0 leads";
renderPagination();
return;
}

$("leadsEmptyState").style.display = "none";
$("leadCountLabel").textContent = `${totalLeadsCount} leads`;

tbody.innerHTML = leadsData.map((l, i) => {
const sales = getSalesName(l.sales_id);
const st = normalizeLeadStatus(l.status);
const id = encodeURIComponent(l.id);

```
return `<tr>
  <td>${(currentPage - 1) * CRM_CONFIG.pageSize + i + 1}</td>
  <td><a class="customer-link" href="customer-profile.html?id=${id}">${safeText(l.customer_name)}</a></td>
  <td>${safeText(l.business)}</td>
  <td>${safeText(l.location)}</td>
  <td><span class="status-badge status-${st.toLowerCase().replace(/\s+/g, "-")}">${safeText(st)}</span></td>
  <td>${safeText(sales)}</td>
  <td>${l.phone ? `<a class="wa-link" target="_blank" rel="noopener" href="${whatsappLink(l.phone)}"><i class="fa-brands fa-whatsapp"></i>${safeText(l.phone)}</a>` : "-"}</td>
  <td>${formatDate(l.follow_up_date)}</td>
  <td>${formatDate(l.created_at)}</td>
  <td><div class="action-buttons">
    <a class="icon-btn" title="View" href="customer-profile.html?id=${id}"><i class="fa-solid fa-eye"></i></a>
    <button class="icon-btn" title="Edit" onclick="editLead('${String(l.id).replace(/'/g, "\\'")}')"><i class="fa-solid fa-pen"></i></button>
    <button class="icon-btn danger" title="Delete" onclick="deleteLead('${String(l.id).replace(/'/g, "\\'")}')"><i class="fa-solid fa-trash"></i></button>
  </div></td>
</tr>`;
```

}).join("");
}

function renderPagination() {
if (!$("paginationInfo")) return;

const pages = Math.max(1, Math.ceil(totalLeadsCount / CRM_CONFIG.pageSize));
const start = totalLeadsCount ? (currentPage - 1) * CRM_CONFIG.pageSize + 1 : 0;
const end = Math.min(currentPage * CRM_CONFIG.pageSize, totalLeadsCount);

$("paginationInfo").textContent = `${start}–${end} of ${totalLeadsCount}`;
$("prevPageBtn").disabled = currentPage <= 1;
$("nextPageBtn").disabled = currentPage >= pages;

const visiblePages = Math.min(pages, 5);
$("paginationNumbers").innerHTML = Array.from(
{ length: visiblePages },
(_, i) => `<button class="page-number ${i + 1 === currentPage ? "active" : ""}" onclick="loadLeads(${i + 1})">${i + 1}</button>`
).join("");
}

document.addEventListener("DOMContentLoaded", () => {
$("prevPageBtn")?.addEventListener("click", () => loadLeads(currentPage - 1));
$("nextPageBtn")?.addEventListener("click", () => loadLeads(currentPage + 1));

$("leadSearch")?.addEventListener("input", debounce(() => loadLeads(1)));
["statusFilter", "businessFilter", "locationFilter", "salesFilter"].forEach(id => {
$(id)?.addEventListener("change", () => loadLeads(1));
});

$("resetFiltersBtn")?.addEventListener("click", () => {
["leadSearch", "statusFilter", "businessFilter", "locationFilter", "salesFilter"].forEach(id => {
if ($(id)) $(id).value = "";
});
loadLeads(1);
});

$("globalSearch")?.addEventListener("change", e => {
if (getCurrentPageName() === "leads" && $("leadSearch")) {
$("leadSearch").value = e.target.value;
loadLeads(1);
}
});

$("addLeadBtn")?.addEventListener("click", () => openLeadModal());

$("exportLeadsBtn")?.addEventListener("click", async () => {
const { data, error } = await buildLeadQuery().order("created_at", { ascending: false }).limit(5000);
if (error) {
showToast(error.message, "error");
return;
}

```
exportCSV((data || []).map(l => ({
  customer_name: l.customer_name,
  phone: l.phone,
  email: l.email,
  business: l.business,
  location: l.location,
  status: l.status,
  sales: getSalesName(l.sales_id),
  follow_up_date: l.follow_up_date,
  appointment: l.appointment,
  site_survey: l.site_survey,
  quotation: l.quotation,
  spk: l.spk,
  closing: l.closing,
  notes: l.notes,
  created_at: l.created_at
})), "fsi-leads.csv");
```

});

$("leadForm")?.addEventListener("submit", async e => {
e.preventDefault();

```
const id = $("leadId").value;
const payload = formPayload();

if (!payload.customer_name) {
  showFormMessage("leadFormMessage", "Customer name wajib diisi.");
  return;
}

setButtonLoading($("saveLeadBtn"), true, "Save Lead");

try {
  let result;
  if (id) {
    result = await supabaseClient.from("leads").update(payload).eq("id", id);
  } else {
    result = await supabaseClient.from("leads").insert([{ ...payload, created_by: currentProfile.id }]);
  }

  if (result.error) throw result.error;

  closeModal("leadModal");
  showToast(id ? "Lead updated successfully." : "Lead added successfully.");

  await loadFilterOptions();
  await loadLeads(currentPage);
} catch (e) {
  console.error(e);
  showFormMessage("leadFormMessage", e.message);
} finally {
  setButtonLoading($("saveLeadBtn"), false, "Save Lead");
}
```

});
});

function resetLeadForm() {
$("leadForm").reset();
$("leadId").value = "";
$("leadModalTitle").textContent = "Add Lead";
populateStatusOptions();
populateSales();
showFormMessage("leadFormMessage", "");
}

function openLeadModal(lead = null) {
if (!$("leadModal")) return;
resetLeadForm();
if (lead) fillLeadForm(lead);
openModal("leadModal");
}

async function editLead(id) {
let lead = leadsData.find(x => String(x.id) === String(id));

if (!lead) {
const r = await supabaseClient.from("leads").select("*").eq("id", id).single();
if (r.error) {
showToast(r.error.message, "error");
return;
}
lead = r.data;
}

if (currentProfile?.role !== "Admin" && String(lead.sales_id) !== String(currentProfile.id)) {
showToast("Access denied.", "error");
return;
}

openLeadModal(lead);
}

function fillLeadForm(l) {
$("leadModalTitle").textContent = "Edit Lead";
$("leadId").value = l.id;
$("leadCustomerName").value = l.customer_name || "";
$("leadPhone").value = l.phone || "";
$("leadEmail").value = l.email || "";
$("leadBusiness").value = l.business || "";
$("leadLocation").value = l.location || "";
$("leadStatus").value = normalizeLeadStatus(l.status);
$("leadFollowUpDate").value = formatDateInput(l.follow_up_date);
$("leadAppointment").value = formatDateInput(l.appointment);
$("leadSiteSurvey").value = formatDateInput(l.site_survey);
$("leadQuotation").value = formatDateInput(l.quotation);
$("leadSpk").value = formatDateInput(l.spk);
$("leadClosing").value = formatDateInput(l.closing);
$("leadNotes").value = l.notes || "";
populateSales();
if (l.sales_id) $("leadSalesAssign").value = l.sales_id;
}

function formPayload() {
const p = {
customer_name: $("leadCustomerName").value.trim(),
phone: $("leadPhone").value.trim() || null,
email: $("leadEmail").value.trim() || null,
business: $("leadBusiness").value.trim() || null,
location: $("leadLocation").value.trim() || null,
status: $("leadStatus").value || "New",
follow_up_date: $("leadFollowUpDate").value || null,
appointment: $("leadAppointment").value || null,
site_survey: $("leadSiteSurvey").value || null,
quotation: $("leadQuotation").value || null,
spk: $("leadSpk").value || null,
closing: $("leadClosing").value || null,
notes: $("leadNotes").value.trim() || null,
updated_by: currentProfile.id
};

if (currentProfile.role === "Admin") p.sales_id = $("leadSalesAssign").value || null;
else p.sales_id = currentProfile.id;

return p;
}

async function deleteLead(id) {
openConfirm("Delete Lead", "Data lead ini akan dihapus. Lanjutkan?", async () => {
const { error } = await supabaseClient.from("leads").delete().eq("id", id);
if (error) {
showToast(error.message, "error");
return;
}

```
showToast("Lead deleted.");
await loadLeads(currentPage);
```

});
}

function openConfirm(title, message, action) {
$("confirmTitle").textContent = title;
$("confirmMessage").textContent = message;
$("confirmActionBtn").onclick = async () => {
closeModal("confirmModal");
await action();
};
openModal("confirmModal");
}
