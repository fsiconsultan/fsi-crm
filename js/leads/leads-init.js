// INITIALIZE EVENTS
// ========================================================
function initializeLeads() {
if (leadsInitialized) {
return;
}
leadsInitialized =
true;
bindAddCustomerButtons();
const searchInput =
leadElement(
"lead-search",
"leadSearch",
"leadsSearch"
);
if (searchInput) {
searchInput.addEventListener(
"input",
onSearchInput
);
}
[
[
"filter-status",
"statusFilter",
"leadStatusFilter"
],

[
"filter-business",
"businessFilter"
],
[
"salesFilter"
]
].forEach(
ids => {
const element =
leadElement(
...ids
);
if (!element) {
return;
}
element.addEventListener(
"change",
function () {
if (
element.id ===
"salesFilter"
) {
window.crmSelectedSalesId =
element.value ||
"";
const selected =
leadGetSalesData()
.find(
sales =>
String(
sales.id
) ===
String(
element.value
)
);
window.crmSelectedSalesName =
selected
? (
selected.name ||
selected.full_name ||
selected.username ||
""
)
: "";
}
filterLeads();
}
);
}
);

const prevBtn =
leadElement(
"btn-prev-page",
"prevBtn"
);
if (prevBtn) {
prevBtn.addEventListener(
"click",
function () {
changePage(
-1
);
}
);
}
const nextBtn =
leadElement(
"btn-next-page",
"nextBtn"
);
if (nextBtn) {
nextBtn.addEventListener(
"click",
function () {
changePage(
1
);
}
);
}
const clearFilterBtn =
leadElement(
"btn-clear-filters",
"clearLeadFilters"
);
if (clearFilterBtn) {
clearFilterBtn.addEventListener(
"click",
clearLeadFilters
);
}
setupTableActions();
document.addEventListener(
"keydown",
function (event) {
if (
event.key !==
"Escape"
) {

return;
}
const modal =
leadElement(
"leadModal"
);
if (
modal &&
modal.classList.contains(
"show"
)
) {
if (
window.FSICustomerForm &&
typeof window.FSICustomerForm.closeCustomerForm ===
"function"
) {
window.FSICustomerForm.closeCustomerForm();
} else {
closeLeadModal();
}
}
}
);
const modal =
leadElement(
"leadModal"
);
if (modal) {
modal.addEventListener(
"click",
function (event) {
if (
event.target ===
modal
) {
if (
window.FSICustomerForm &&
typeof window.FSICustomerForm.closeCustomerForm ===
"function"
) {
window.FSICustomerForm.closeCustomerForm();
} else {
closeLeadModal();
}
}
}
);
}

setupSalesAssignmentAccess();
refreshAddCustomerVisibility();
loadFilterOptions()
.catch(
error => {
console.warn(
"FSI CRM: initial filter options load failed:",
error
);
}
);
}
// ========================================================
// PROFILE READY
// ========================================================
function handleProfileReady() {
setupSalesAssignmentAccess();
refreshAddCustomerVisibility();
bindAddCustomerButtons();
loadFilterOptions()
.catch(
error => {
console.warn(
"FSI CRM: profile-ready filter load failed:",
error
);
}
);
}
// ========================================================
// SALES SELECTED FROM HEADER
// ========================================================
function handleSalesSelected(
event
) {
if (!leadIsAdmin()) {
return;
}
const detail =
event?.detail || {};
if (
Object.prototype.hasOwnProperty.call(
detail,
"salesId"
)
) {
window.crmSelectedSalesId =

detail.salesId ||
"";
}
if (
Object.prototype.hasOwnProperty.call(
detail,
"salesName"
)
) {
window.crmSelectedSalesName =
detail.salesName ||
"";
}
const salesSelect =
leadElement(
"salesFilter"
);
if (salesSelect) {
salesSelect.value =
window.crmSelectedSalesId ||
"";
}
leadSetCurrentPage(
1
);
updateLeadsContext();
loadLeads(
1
);
}
// ========================================================
// APP READY
// ========================================================
function handleAppReady() {
setupSalesAssignmentAccess();
updateLeadsContext();
refreshAddCustomerVisibility();
bindAddCustomerButtons();
loadFilterOptions()
.catch(
error => {
console.warn(
"FSI CRM: app-ready filter load failed:",
error
);
}

);
}
// ========================================================
// EXPORT TO WINDOW
// ========================================================
window.loadFilterOptions =
loadFilterOptions;
window.populateFilter =
populateFilter;
window.loadLeads =
loadLeads;
window.updatePagination =
updatePagination;
window.changePage =
changePage;
window.nextLeadPage =
nextLeadPage;
window.previousLeadPage =
previousLeadPage;
window.renderLeads =
renderLeads;
window.filterLeads =
filterLeads;
window.onSearchInput =
onSearchInput;
window.clearLeadFilters =
clearLeadFilters;
window.openLeadModal =
openLeadModal;
window.closeLeadModal =
closeLeadModal;
window.clearLeadForm =
clearLeadForm;
window.openEditLead =
openEditLead;
window.saveLead =

saveLead;
window.deleteLead =
deleteLead;
window.setupSalesAssignmentAccess =
setupSalesAssignmentAccess;
window.clearSalesHeaderFilter =
clearSalesHeaderFilter;
window.updateAddCustomerVisibility =
updateAddCustomerVisibility;
window.bindAddCustomerButtons =
bindAddCustomerButtons;
window.FSILeads = {
loadFilterOptions,
populateFilter,
loadLeads,
updatePagination,
changePage,
nextLeadPage,
previousLeadPage,
renderLeads,
filterLeads,
onSearchInput,
clearLeadFilters,
openLeadModal,
closeLeadModal,
clearLeadForm,
openEditLead,
saveLead,
deleteLead,
setupSalesAssignmentAccess,
clearSalesHeaderFilter,
updateAddCustomerVisibility,
bindAddCustomerButtons
};

// ========================================================
// DOM READY
// ========================================================
document.addEventListener(
"DOMContentLoaded",
function () {
initializeLeads();
console.log(
"FSI CRM: Leads module loaded successfully."
);
}
);
// ========================================================
// PROFILE READY
// ========================================================
document.addEventListener(
"fsi:profile-ready",
function () {
handleProfileReady();
}
);
// ========================================================
// APP READY
// ========================================================
document.addEventListener(
"fsi:app-ready",
function () {
handleAppReady();
}
);
// ========================================================
// SALES SELECTED
// ========================================================
document.addEventListener(
"fsi:sales-selected",
function (event) {
handleSalesSelected(
event
);
}
);
// ========================================================
// LEAD CHANGED
// ========================================================
document.addEventListener(
"fsi:lead-changed",
function () {
// Save/delete melakukan refresh sendiri.
}

);
