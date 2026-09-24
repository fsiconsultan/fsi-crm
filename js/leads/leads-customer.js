// ADD CUSTOMER VISIBILITY
// ========================================================
function updateAddCustomerVisibility() {
const profile =
leadGetProfile();
if (!profile) {
return;
}
const isAdmin =
leadIsAdmin();
const isSales =
leadIsSales();
const selectors = [

"#addCustomerBtn",
"#btn-add-customer",
"#btnAddCustomer",
"#add-customer-btn",
"#addCustomer",
"#addLeadBtn",
"#btn-add-lead",
"#btnAddLead",
"#add-lead-btn",
"#addLead"
];
const elements = [];
selectors.forEach(
selector => {
document
.querySelectorAll(selector)
.forEach(
element => {
if (
!elements.includes(element)
) {
elements.push(element);
}
}
);
}
);
document
.querySelectorAll(
"button, a, [role='button']"
)
.forEach(
element => {
const text =
String(
element.textContent || ""
)
.trim()
.toLowerCase();
const normalized =
text.replace(
/\s+/g,
" "
);
if (
normalized.includes(
"add customer"
)
) {
if (
!elements.includes(element)
) {

elements.push(element);
}
}
}
);
if (
isAdmin ||
isSales
) {
elements.forEach(
element => {
element.style.display = "";
element.removeAttribute(
"aria-hidden"
);
element.removeAttribute(
"data-admin-hidden"
);
element.disabled = false;
}
);
}
}
function refreshAddCustomerVisibility() {
updateAddCustomerVisibility();
setTimeout(
function () {
updateAddCustomerVisibility();
},
50
);
setTimeout(
function () {
updateAddCustomerVisibility();
},
300
);
}
// ========================================================
// ADD CUSTOMER BUTTON
// ========================================================
function handleAddCustomerButton(
event
) {
const target =
event.target?.closest(

"#addCustomerBtn, #btn-add-customer, #btnAddCustomer, #add-customer-btn, #addCustomer, #addLeadBtn, #btn-add-lead, #btnAddLead, #add-lead-btn, #addLead"
);
if (!target) {
return false;
}
const profile =
leadGetProfile();
if (!profile) {
if (
typeof window.showToast ===
"function"
) {
window.showToast(
"Profile user belum siap.",
"error"
);
}
return true;
}
event.preventDefault();
event.stopPropagation();
if (
typeof event.stopImmediatePropagation ===
"function"
) {
event.stopImmediatePropagation();
}
if (
window.FSICustomerForm &&
typeof window.FSICustomerForm.openAddCustomer ===
"function"
) {
window.FSICustomerForm.openAddCustomer();
return true;
}
if (
typeof window.crmOpenAddCustomer ===
"function"
) {
window.crmOpenAddCustomer();
return true;
}
if (
typeof window.openLeadModal ===
"function"

) {
window.openLeadModal();
return true;
}
if (
typeof window.showToast ===
"function"
) {
window.showToast(
"Customer form belum siap.",
"error"
);
}
return true;
}
function bindAddCustomerButtons() {
if (
document.documentElement.dataset
.fsiAddCustomerHandler === "true"
) {
return;
}
document.documentElement.dataset
.fsiAddCustomerHandler = "true";
document.addEventListener(

"click",
handleAddCustomerButton,
true
);
refreshAddCustomerVisibility();
}
// ========================================================
