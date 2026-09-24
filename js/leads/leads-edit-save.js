// EDIT CUSTOMER
// ========================================================
async function openEditLead(
id
) {
const customerId =
String(
id ?? ""
).trim();
if (!customerId) {
console.error(
"FSI CRM: openEditLead called without customer ID."
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
if (
window.FSICustomerForm &&
typeof window.FSICustomerForm.openEditCustomer ===

"function"
) {
await window.FSICustomerForm.openEditCustomer(
customerId
);
return;
}
if (
typeof window.crmOpenEditCustomer ===
"function"
) {
await window.crmOpenEditCustomer(
customerId
);
return;
}
if (
typeof window.openEditCustomer ===
"function" &&
window.openEditCustomer !== openEditLead
) {
await window.openEditCustomer(
customerId
);
return;
}
console.warn(
"FSI CRM: Customer form editor is not available."
);
if (
typeof window.showToast ===
"function"
) {
window.showToast(
"Edit Customer belum tersedia. Pastikan customer-form.js sudah dimuat.",
"error"
);
}
}
// ========================================================
// SAVE LEAD
// ========================================================
async function saveLead() {
if (
window.FSICustomerForm &&
typeof window.FSICustomerForm.saveCustomer ===
"function"
) {
return window.FSICustomerForm.saveCustomer();

}
const profile =
leadGetProfile();
if (!profile) {
showLeadError(
new Error(
"User profile is not ready."
),
"User profile is not ready."
);
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
const customerElement =
leadElement(
"leadCustomerName",
"leadCustomer"
);
const customer =
customerElement?.value?.trim() ||
"";
if (!customer) {
if (
typeof window.showToast ===
"function"
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
)?.value ||
"";
const getFormValue =
function (...ids) {
const element =
leadElement(
...ids
);
return (
element?.value?.trim() ||
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
statusValue ||
"New"
)
: (
statusValue ||
"New"
);
const lastFollowUpElement =
leadElement(
"leadLastFollowUp",
"leadLastFollowup",
"lastFollowUp"
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
"leadEmail",
"customerEmail",
"email"
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
)?.value ||
null,
appointment:
leadElement(
"leadAppointment"
)?.value ||
null,
site_survey:
leadElement(
"leadSiteSurvey"
)?.value ||
null,
quotation:
leadElement(
"leadQuotation"
)?.value ||
null,
spk:
leadElement(
"leadSpk",
"leadSPK"
)?.value ||
null,
closing:
leadElement(
"leadClosing"
)?.value ||
null,
notes:
getFormValue(
"leadNotes"
)
};
// ----------------------------------------------------
// LAST FOLLOW UP
// Hanya dikirim jika field tersebut memang tersedia
// di form. Ini mencegah perubahan otomatis ketika
// customer hanya diedit pada field lain.

// ----------------------------------------------------
if (lastFollowUpElement) {
payload.last_follow_up =
lastFollowUpElement.value ||
null;
}
const salesAssignment =
leadElement(
"leadSales",
"leadSalesAssign"
);
const selectedSales =
salesAssignment?.value ||
"";
if (leadIsAdmin()) {
payload.sales_id =
selectedSales ||
null;
} else if (
leadIsSales()
) {
payload.sales_id =
profile.id;
} else {
payload.sales_id =
null;
}
try {
if (leadId) {
payload.updated_by =
profile.id;
const {
error
} =
await client
.from("leads")
.update(
payload
)
.eq(
"id",
leadId
);
if (error) {
console.error(
"FSI CRM: update lead error:",
error

);
showLeadError(
error,
"Failed to update lead."
);
return;
}
if (
typeof window.showToast ===
"function"
) {
window.showToast(
"Customer updated successfully.",
"success"
);
}
} else {
payload.created_by =
profile.id;
payload.updated_by =
profile.id;
const {
error
} =
await client
.from("leads")
.insert([
payload
]);
if (error) {

console.error(
"FSI CRM: insert lead error:",
error
);
showLeadError(
error,
"Failed to add customer."
);
return;
}
if (
typeof window.showToast ===
"function"
) {
window.showToast(
"Customer added successfully.",

"success"
);
}
}
closeLeadModal();
await loadFilterOptions();
await loadLeads(
leadGetCurrentPage()
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
leadId
? "updated"
: "created"
}
}
)
);
} catch (error) {
console.error(
"FSI CRM: saveLead error:",
error
);
showLeadError(
error,
"An error occurred while saving the customer."
);
}
}
// ========================================================
