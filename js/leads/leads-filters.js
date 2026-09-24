// SELECTED SALES
// ========================================================
function getSelectedSalesId() {
if (!leadIsAdmin()) {
return "";
}
const value =
window.crmSelectedSalesId;
if (
value === null ||
value === undefined
) {
return "";
}

return String(
value
).trim();
}
function getSelectedSalesName() {
const value =
window.crmSelectedSalesName;
if (
value === null ||
value === undefined
) {
return "";
}
return String(
value
).trim();
}
function applySelectedSalesFilter() {
const salesSelect =
leadElement(
"salesFilter"
);
const selectedSalesId =
getSelectedSalesId();
if (salesSelect) {
salesSelect.value =
selectedSalesId || "";
}
window.currentSalesFilter =
selectedSalesId || "";
return selectedSalesId;
}
// ========================================================
// FILTER OPTIONS
// ========================================================
async function loadFilterOptions() {
const client =
leadGetSupabase();
if (!client) {
console.error(

"FSI CRM: Supabase client is not ready."
);
return;
}
try {
if (
typeof window.loadSalesLookup ===
"function"
) {
try {
await window.loadSalesLookup();
} catch (error) {
console.warn(
"FSI CRM: Sales lookup failed:",
error
);
}
}
const {
data,
error
} =
await client
.from("leads")
.select(
"business"
);
if (error) {
console.error(
"FSI CRM: load business filter options error:",
error
);
populateBusinessFilter([]);
} else {
const leads =
Array.isArray(data)
? data
: [];
const databaseBusinesses =
leads.map(
lead =>
leadGetValue(
lead.business
)
);
populateBusinessFilter(
databaseBusinesses
);

}
if (
typeof window.populateSalesDropdowns ===
"function"
) {
try {
window.populateSalesDropdowns();
} catch (error) {
console.warn(
"FSI CRM: populateSalesDropdowns failed:",
error
);
}
}
applySelectedSalesFilter();
} catch (error) {
console.error(
"FSI CRM: loadFilterOptions error:",
error
);
populateBusinessFilter([]);
}
}
// ========================================================
// STANDARD BUSINESS OPTIONS
// ========================================================
function getStandardBusinessOptions() {
return [
"Residential",
"Villa",
"Hotel",
"Restaurant",
"Office",
"Factory",
"Commercial",
"Other"
];
}
// ========================================================
// POPULATE BUSINESS FILTER
// ========================================================
function populateBusinessFilter(
databaseValues
) {
const standardValues =
getStandardBusinessOptions();

const combinedValues = [
...standardValues,
...(Array.isArray(databaseValues)
? databaseValues
: [])
];
const businesses =
uniqueSortedValues(
combinedValues
);
populateFilter(
[
"filter-business",
"businessFilter"
],
businesses,
"All Business"
);
}
function uniqueSortedValues(values) {
return [
...new Set(
(
Array.isArray(values)
? values
: []
)
.map(
value =>
String(
value ?? ""
).trim()
)
.filter(
Boolean
)
)
].sort(
(
a,
b
) =>
a.localeCompare(
b,
undefined,
{
sensitivity:
"base"
}
)
);
}
function populateFilter(
ids,
values,

defaultText
) {
const idList =
Array.isArray(ids)
? ids
: [ids];
let select =
null;
for (
const id of idList
) {
select =
document.getElementById(
id
);
if (select) {
break;
}
}
if (!select) {
return;
}
const currentValue =
String(
select.value || ""
).trim();
select.innerHTML =
"";
const defaultOption =
document.createElement(
"option"
);
defaultOption.value =
"";
defaultOption.textContent =
defaultText;
select.appendChild(
defaultOption
);
const safeValues =
uniqueSortedValues(
Array.isArray(values)
? values
: []
);

safeValues.forEach(
value => {
const option =
document.createElement(
"option"
);
option.value =
value;
option.textContent =
value;
select.appendChild(
option
);
}
);
if (
safeValues.includes(
currentValue
)
) {
select.value =
currentValue;
} else {
select.value =
"";
}
}
// ========================================================
// GET FILTER VALUES
// ========================================================
function getLeadFilters() {
const searchInput =
leadElement(
"lead-search",
"leadSearch",
"leadsSearch"
);
const statusInput =
leadElement(
"filter-status",
"statusFilter",
"leadStatusFilter"
);
const businessInput =
leadElement(
"filter-business",
"businessFilter"

);
const salesInput =
leadElement(
"salesFilter"
);
let salesFilter =
salesInput?.value ||
"";
if (leadIsAdmin()) {
const headerSalesId =
getSelectedSalesId();
if (
headerSalesId !== ""
) {
salesFilter =
headerSalesId;
}
}
return {
search:
searchInput?.value?.trim() ||
"",
status:
statusInput?.value ||
"",
business:
businessInput?.value ||
"",
salesFilter:
salesFilter
};
}
// ========================================================
// BUILD SEARCH CONDITION
// ========================================================
function buildSearchQuery(
query,
search
) {
if (!search) {
return query;
}
const safeSearch =
String(search)
.replace(

/\\/g,
"\\\\"

)
.replace(
/%/g,
"\\%"
)
.replace(
/_/g,
"\\_"
)
.replace(
/,/g,
"\\,"
);
const searchConditions = [
`customer_name.ilike.%${safeSearch}%`,
`phone.ilike.%${safeSearch}%`,
`email.ilike.%${safeSearch}%`,
`business.ilike.%${safeSearch}%`,
`location.ilike.%${safeSearch}%`
];
return query.or(
searchConditions.join(",")
);
}
// ========================================================
