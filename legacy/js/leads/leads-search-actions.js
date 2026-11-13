// FILTER / SEARCH
// ========================================================
function filterLeads() {
leadSetCurrentPage(
1
);
loadLeads(
1
);
}
function onSearchInput() {
clearTimeout(
searchTimer
);
searchTimer =
setTimeout(
function () {
leadSetCurrentPage(
1
);
loadLeads(
1
);
},
400
);
}
function clearLeadFilters() {
const fields = [
[

"lead-search",
"leadSearch",
"leadsSearch"
],
[
"filter-status",
"statusFilter",
"leadStatusFilter"
],
[
"filter-business",
"businessFilter"
]
];
fields.forEach(
ids => {
const element =
leadElement(
...ids
);
if (element) {
element.value =
"";
}
}
);
window.crmSelectedSalesId =
"";

window.crmSelectedSalesName =
"";
const salesSelect =
leadElement(
"salesFilter"
);
if (salesSelect) {
salesSelect.value =
"";
}
window.currentSearch =
"";
window.currentStatusFilter =
"";
window.currentBusinessFilter =
"";

window.currentLocationFilter =
"";
window.currentSalesFilter =
"";
leadSetCurrentPage(
1
);
updateLeadsContext();
loadLeads(
1
);
}
function clearSalesHeaderFilter() {
window.crmSelectedSalesId =
"";
window.crmSelectedSalesName =
"";
const salesSelect =
leadElement(
"salesFilter"
);
if (salesSelect) {
salesSelect.value =
"";
}
window.currentSalesFilter =
"";
leadSetCurrentPage(
1
);
updateLeadsContext();
loadLeads(
1
);
}
// ========================================================
