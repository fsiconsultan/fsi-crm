// SALES ASSIGNMENT ACCESS
// ========================================================
function setupSalesAssignmentAccess() {
const select =
leadElement(
"leadSales",
"leadSalesAssign"
);
if (!select) {
return;
}
const profile =
leadGetProfile();
if (!profile) {
select.disabled =
true;
return;
}
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
profile.id ||
"";
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
select.setAttribute(
"aria-disabled",
"true"
);
}
// ========================================================
// TABLE EVENT DELEGATION
// ========================================================
function setupTableActions() {
const table =
leadElement(
"leads-table-body",
"leadsTable"
);
if (!table) {
return;
}
if (
table.dataset.actionsBound ===
"true"
) {
return;
}
table.dataset.actionsBound =
"true";
table.addEventListener(
"click",
async function (event) {
const actionButton =
event.target.closest(
"[data-action]"
);
if (!actionButton) {
return;
}
const action =
actionButton.dataset.action;
const leadId =

String(
actionButton.dataset.leadId ||
""
).trim();
if (
action ===
"profile"
) {
if (!leadId) {
console.error(
"FSI CRM: Profile button has no customer ID.",
actionButton
);
if (
typeof window.showToast ===
"function"
) {
window.showToast(
"Customer ID tidak ditemukan.",
"error"
);
}
return;
}
event.preventDefault();
if (
typeof window.crmOpenCustomerProfile ===
"function"
) {
await window.crmOpenCustomerProfile(
leadId
);
} else {
console.warn(
"FSI CRM: Customer Profile function not available."
);
if (
typeof window.showToast ===

"function"
) {
window.showToast(
"Customer Profile belum tersedia.",
"error"
);
}
}
return;
}

if (
action ===
"edit"
) {
if (!leadId) {
console.error(
"FSI CRM: Edit button has no customer ID.",
actionButton
);
if (
typeof window.showToast ===
"function"
) {
window.showToast(
"Customer ID tidak ditemukan.",
"error"
);
}
return;
}
event.preventDefault();
await openEditLead(
leadId
);
return;
}
if (
action ===
"delete"
) {
if (!leadId) {
return;
}
await deleteLead(
leadId
);
return;
}
if (
action ===
"retry-leads"
) {
leadSetCurrentPage(
1

);
await loadLeads(
1
);
return;
}
if (
action ===
"clear-sales-filter"
) {
clearSalesHeaderFilter();
return;
}
}
);
}
// ========================================================
