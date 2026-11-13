// LEGACY LEAD MODAL
// ========================================================
function openLeadModal() {

const modal =
leadElement(
"leadModal"
);
if (!modal) {
console.error(
"FSI CRM: Lead modal not found."
);
if (
typeof window.showToast ===
"function"
) {
window.showToast(
"Lead modal not found.",
"error"
);
}
return;
}
clearLeadForm();
const title =
leadElement(
"lead-modal-title",
"leadModalTitle"
);
if (title) {
title.textContent =
"Add Customer";
}
modal.classList.add(
"show"
);
modal.style.display =
"flex";
document.body.classList.add(
"modal-open"
);
setTimeout(
function () {
const customerInput =
leadElement(
"leadCustomerName",
"leadCustomer"
);

if (customerInput) {
customerInput.focus();
}
},
50
);
}
function closeLeadModal() {
const modal =
leadElement(
"leadModal"
);
if (!modal) {
return;
}
modal.classList.remove(
"show"
);
modal.style.display =
"none";
document.body.classList.remove(
"modal-open"
);
}
// ========================================================
// CLEAR FORM
// ========================================================
function clearLeadForm() {
setLeadValue(
["leadId"],
""
);
setLeadValue(
[
"leadCustomerName",
"leadCustomer"
],
""
);
setLeadValue(
["leadPhone"],
""
);
setLeadValue(

[
"leadEmail",
"customerEmail",
"email"
],
""
);
setLeadValue(
["leadBusiness"],
""
);
setLeadValue(
["leadLocation"],
""
);
setLeadValue(
["leadStatus"],
"New"
);
const profile =
leadGetProfile();
setLeadValue(
[
"leadSales",
"leadSalesAssign"
],
leadIsSales()
? (
profile?.id ||
""
)
: (
getSelectedSalesId() ||
""
)
);
setLeadValue(
["leadFollowUp"],
""
);
setLeadValue(
[
"leadLastFollowUp",
"leadLastFollowup",
"lastFollowUp"
],
""
);
setLeadValue(
["leadAppointment"],
""
);

setLeadValue(
["leadSiteSurvey"],
""
);
setLeadValue(
["leadQuotation"],
""
);
setLeadValue(
[
"leadSpk",

"leadSPK"
],
""
);
setLeadValue(
["leadClosing"],
""
);
setLeadValue(
["leadNotes"],
""
);
if (
typeof window.setupSalesAssignmentAccess ===
"function"
) {
window.setupSalesAssignmentAccess();
}
}
function setLeadValue(
ids,
value
) {
const idList =
Array.isArray(ids)
? ids
: [ids];
let element =
null;
for (
const id of idList
) {
element =
document.getElementById(
id
);

if (element) {
break;
}
}
if (!element) {
return;
}
if (
typeof window.setValue ===
"function"
) {
window.setValue(
element.id,
value
);
} else {
element.value =
value ?? "";
}
}
// ========================================================
