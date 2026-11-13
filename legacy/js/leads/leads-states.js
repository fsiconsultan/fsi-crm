// LOADING STATE
// ========================================================
function showLeadsLoading() {
const table =
leadElement(
"leads-table-body",
"leadsTable"
);
if (!table) {
return;
}
table.innerHTML = `
<tr class="loading-row">
<td colspan="10">
<div class="empty-state loading-state">
<div class="empty-state-icon">
<i
data-lucide="loader-circle"
class="spin"
></i>
</div>
<div class="empty-state-title">
Loading Leads...
</div>

<div class="empty-state-text">
Please wait while the lead data is loaded.
</div>
</div>
</td>
</tr>
`;
if (
typeof window.refreshIcons ===
"function"
) {
window.refreshIcons();
}
}
// ========================================================
// EMPTY STATE
// ========================================================
function renderEmptyLeadsState() {
const table =
leadElement(
"leads-table-body",
"leadsTable"
);
if (!table) {
return;
}
const selectedSalesId =
getSelectedSalesId();
const selectedSalesName =
getSelectedSalesName();
let title =
"Belum Ada Leads";
let message =
"Belum ada data lead yang sesuai dengan filter saat ini.";
if (
selectedSalesId
) {
message =
selectedSalesName
? `Sales ${selectedSalesName} belum memiliki data lead.`
: "Sales yang dipilih belum memiliki data lead.";
} else {
const filters =

getLeadFilters();
if (
filters.search ||
filters.status ||
filters.business
) {
title =
"Tidak Ada Leads";
message =
"Tidak ada lead yang cocok dengan pencarian atau filter yang dipilih.";
}
}
table.innerHTML = `
<tr class="empty-row">
<td colspan="10">
<div class="empty-state leads-empty-state">
<div class="empty-state-icon">
<i data-lucide="inbox"></i>
</div>
<div class="empty-state-title">
${leadEscapeHTML(title)}
</div>
<div class="empty-state-text">
${leadEscapeHTML(message)}
</div>
${
selectedSalesId
? `
<button
type="button"
class="secondary-btn small-btn"
data-action="clear-sales-filter"
>
<i data-lucide="users"></i>
Lihat Semua Sales
</button>
`
: ""
}
</div>
</td>
</tr>
`;
if (
typeof window.refreshIcons ===
"function"
) {
window.refreshIcons();
}

}
// ========================================================
// ERROR STATE
// ========================================================
function renderLeadsErrorState(
message
) {
const table =
leadElement(
"leads-table-body",
"leadsTable"
);
if (!table) {
return;
}
table.innerHTML = `
<tr class="error-row">
<td colspan="10">
<div class="empty-state leads-error-state">
<div class="empty-state-icon">

<i data-lucide="circle-alert"></i>
</div>
<div class="empty-state-title">
Gagal Memuat Leads
</div>
<div class="empty-state-text">
${leadEscapeHTML(
message ||
"Terjadi kesalahan saat memuat data."
)}
</div>
<button
type="button"
class="primary-btn small-btn"
data-action="retry-leads"
>
<i data-lucide="refresh-cw"></i>
Coba Lagi
</button>
</div>
</td>
</tr>
`;
if (
typeof window.refreshIcons ===
"function"
) {
window.refreshIcons();
}

}
// ========================================================
