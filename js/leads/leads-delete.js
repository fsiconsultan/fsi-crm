// DELETE LEAD

// ========================================================
async function deleteLead(
id
) {
const customerId =
String(
id ?? ""
).trim();
if (!customerId) {
return;
}
const confirmed =
typeof window.confirmAction ===
"function"
? await window.confirmAction(
"Delete this customer?"
)
: confirm(
"Delete this customer?"
);
if (!confirmed) {
return;
}
const client =
leadGetSupabase();
if (!client) {
showLeadError(
new Error(
"Supabase is not connected."
),
"Supabase is not connected."
);
return;
}
try {
const {
error
} =
await client
.from("leads")
.delete()
.eq(
"id",
customerId
);
if (error) {
console.error(
"FSI CRM: delete lead error:",

error
);
showLeadError(
error,
"Failed to delete customer."
);
return;
}
if (
String(
window.crmCurrentCustomerId
) ===
customerId
) {
window.crmCurrentCustomerId =
null;
window.crmCurrentCustomer =
null;
}
await loadFilterOptions();
const oldTotal =
Number(
window.totalLeadsCount
) || 0;
const totalAfterDelete =
Math.max(
0,
oldTotal - 1
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
leadSetCurrentPage(
pageAfterDelete

);
await loadLeads(
pageAfterDelete
);
if (
typeof window.updateDashboard ===
"function"
) {
try {
await window.updateDashboard();
} catch (error) {
console.warn(
"FSI CRM: dashboard refresh failed:",
error
);
}
}
document.dispatchEvent(
new CustomEvent(
"fsi:lead-changed",
{
detail: {
action:
"deleted",
id:
customerId
}
}
)
);
if (
typeof window.showToast ===
"function"
) {
window.showToast(
"Customer deleted successfully.",
"success"
);
}
} catch (error) {
console.error(
"FSI CRM: deleteLead error:",
error
);
showLeadError(
error,
"An error occurred while deleting the customer."
);
}
}

// ========================================================
