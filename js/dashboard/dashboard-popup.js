// FIND STAT CARD ELEMENT
// ============================================================
function dashboardFindStatCardElement(
statElement
) {
if (!statElement) {
return null;
}
/*
* Support beberapa kemungkinan class
* yang mungkin digunakan oleh index.html.
*/
const directCard =
statElement.closest(
[
"[data-stat-card]",
".stat-card",
".dashboard-stat-card",
".stat-item",
".stat-box",
".stats-card"
].join(",")
);
if (directCard) {
return directCard;
}
/*
* Fallback:
* cari parent terdekat yang class-nya mengandung
* kata "stat".
*/
let parent =
statElement.parentElement;
let level =
0;
while (
parent &&
level < 5
) {
const className =
typeof parent.className === "string"
? parent.className
: "";
if (
/\bstat\b/i.test(className) ||
/stat-card/i.test(className) ||
/stat-item/i.test(className) ||
/stat-box/i.test(className)
) {
return parent;
}
parent =
parent.parentElement;
level++;
}
/*
* Jika struktur HTML sangat berbeda,
* gunakan elemen angka sebagai target.
*/
return statElement;
}
// ============================================================
// STAT POPUP CATEGORY CONFIG
// ============================================================
const DASHBOARD_STAT_CATEGORIES = {
total: {
statId: "statTotal",
legacyIds: [
"totalLeads"
],
title: "All Leads",
description:
"Seluruh customer dan lead yang dapat Anda akses.",
icon: "users",
filterType: "all"
},
new: {
statId: "statNew",
legacyIds: [
"newLeads"
],
title: "New Leads",
description:
"Customer dengan status New.",
icon: "sparkles",
filterType: "status",
value: "New"
},
flyerSent: {
statId: "statFlyerSent",
legacyIds: [
"flyerSentLeads"
],
title: "Flyer Sent",
description:
"Customer dengan status Flyer Sent.",
icon: "send",
filterType: "status",
value: "Flyer Sent"
},
interested: {
statId: "statInterested",
legacyIds: [
"interestedLeads"
],
title: "Interested Leads",
description:
"Customer dengan status Interested.",
icon: "heart",
filterType: "status",
value: "Interested"
},
followUp: {
statId: "statFollowUp",
legacyIds: [
"followUpLeads"
],
title: "Follow Up",
description:
"Customer dengan status Follow Up.",
icon: "phone-call",
filterType: "status",
value: "Follow Up"
},
appointment: {
statId: "statAppointment",
legacyIds: [
"appointmentLeads"
],
title: "Appointment",
description:
"Customer yang memiliki jadwal appointment.",
icon: "calendar-check",
filterType: "field",
value: "appointment"
},
siteSurvey: {
statId: "statSiteSurvey",
legacyIds: [
"siteSurveyLeads"
],
title: "Site Survey",
description:
"Customer yang memiliki jadwal site survey.",
icon: "map-pin",
filterType: "field",
value: "site_survey"
},
quotation: {
statId: "statQuotation",
legacyIds: [
"quotationLeads"
],
title: "Quotation",
description:
"Customer yang memiliki quotation.",
icon: "file-text",
filterType: "field",
value: "quotation"
},
spk: {
statId: "statSPK",
legacyIds: [
"spkLeads"
],
title: "SPK",
description:
"Customer yang memiliki SPK.",
icon: "file-check",
filterType: "field",
value: "spk"
},
closing: {
statId: "statClosing",
legacyIds: [
"closingLeads"
],
title: "Closing",
description:
"Customer yang sudah mencapai Closing.",
icon: "badge-check",
filterType: "closing"
},
notInterested: {
statId: "statNotInterested",
legacyIds: [
"notInterestedLeads"
],
title: "Not Interested",
description:
"Customer dengan status Not Interested.",
icon: "x-circle",
filterType: "status",
value: "Not Interested"
}
};
// ============================================================
// GET STAT CATEGORY FROM ELEMENT
// ============================================================
function dashboardGetStatCategoryFromElement(
element
) {
if (!element) {
return null;
}
const statId =
element.id;
for (
const [
category,
config
]
of Object.entries(
DASHBOARD_STAT_CATEGORIES
)
) {
if (
config.statId === statId
) {
return category;
}
if (
Array.isArray(
config.legacyIds
) &&
config.legacyIds.includes(
statId
)
) {
return category;
}
}
return null;
}
// ============================================================
// FILTER DATA FOR STAT CATEGORY
// ============================================================
function dashboardFilterDataForStat(
data,
category
) {
const list =
Array.isArray(data)
? data
: [];
const config =
DASHBOARD_STAT_CATEGORIES[
category
];
if (!config) {
return [];
}
if (
config.filterType === "all"
) {
return [...list];
}
if (
config.filterType === "status"
) {
return list.filter(
lead =>
dashboardNormalizeStatus(
lead.status
) === config.value
);
}
if (
config.filterType === "field"
) {
return list.filter(
lead =>
dashboardHasValue(
lead[
config.value
]
)
);
}
if (
config.filterType === "closing"
) {
return list.filter(
lead => {
const status =
dashboardNormalizeStatus(
lead.status
);
return (
status === "Closing" ||
dashboardHasValue(
lead.closing
)
);
}
);
}
return [];
}
// ============================================================
// SORT POPUP LEADS
// ============================================================
function dashboardSortPopupLeads(
list
) {
return [
...(
Array.isArray(list)
? list
: []
)
].sort(
(
a,
b
) => {
const dateA =
new Date(
a.updated_at ||
a.created_at ||
0
).getTime();
const dateB =
new Date(
b.updated_at ||
b.created_at ||
0
).getTime();
return dateB -
dateA;
}
);
}
// ============================================================
// GET LEAD SALES NAME
// ============================================================
//
// Kita tidak mengasumsikan struktur sales tertentu.
// Jika data sudah memiliki sales_name / sales / sales_user_name,
// gunakan nilai tersebut.
// ============================================================
function dashboardGetLeadSalesName(
lead
) {
if (!lead) {
return "-";
}
const possibleFields = [
"sales_name",
"sales",
"sales_user_name",
"sales_full_name",
"assigned_sales_name"
];
for (
const field
of possibleFields
) {
if (
dashboardHasValue(
lead[field]
)
) {
return String(
lead[field]
);
}
}
return "-";
}
// ============================================================
// FORMAT POPUP DATE
// ============================================================
function dashboardFormatPopupDate(
value
) {
if (!value) {
return "-";
}
if (
typeof window.formatDateTime === "function"
) {
try {
return window.formatDateTime(
value
);
} catch (error) {
// fallback
}
}
try {
const date =
new Date(value);
if (
Number.isNaN(
date.getTime()
)
) {
return "-";
}
return date.toLocaleDateString(
"id-ID",
{
day: "2-digit",
month: "short",
year: "numeric"
}
);
} catch (error) {
return "-";
}
}
// ============================================================
// GET POPUP STATUS CLASS
// ============================================================
function dashboardGetPopupStatusClass(
status
) {
if (
typeof window.getStatusClass === "function"
) {
try {
return window.getStatusClass(
status
);
} catch (error) {
// fallback
}
}
const normalized =
String(
status || ""
)
.trim()
.toLowerCase()
.replace(
/\s+/g,
"-"
);
return (
`status-${normalized}`
);
}
// ============================================================
// CREATE STAT POPUP STYLES
// ============================================================
//
// Style dibuat dari JS supaya kita tidak perlu menyentuh
// CSS atau index.html pada tahap ini.
// ============================================================
function dashboardEnsureStatPopupStyles() {
if (
document.getElementById(
"fsi-dashboard-stat-popup-styles"
)
) {
return;
}
const style =
document.createElement(
"style"
);
style.id =
"fsi-dashboard-stat-popup-styles";
style.textContent = `
.dashboard-stat-clickable {
cursor: pointer !important;
transition:
transform 0.18s ease,
box-shadow 0.18s ease,
border-color 0.18s ease;
}
.dashboard-stat-clickable:hover {
transform: translateY(-2px);
}
.dashboard-stat-clickable:focus-visible {
outline: 2px solid currentColor;
outline-offset: 3px;
}
.fsi-dashboard-stat-modal {
position: fixed;
inset: 0;
z-index: 99999;
display: flex;
align-items: center;
justify-content: center;
padding: 24px;
}
.fsi-dashboard-stat-backdrop {
position: absolute;
inset: 0;
background: rgba(15, 23, 42, 0.58);
backdrop-filter: blur(6px);
-webkit-backdrop-filter: blur(6px);
}
.fsi-dashboard-stat-dialog {
position: relative;
z-index: 2;
width: min(760px, 100%);
max-height: min(760px, calc(100vh - 48px));
display: flex;
flex-direction: column;
overflow: hidden;
background: var(--card-bg, #ffffff);
border: 1px solid rgba(148, 163, 184, 0.25);
border-radius: 20px;
box-shadow:
0 25px 70px rgba(15, 23, 42, 0.25);
}
.fsi-dashboard-stat-header {
display: flex;
align-items: flex-start;
justify-content: space-between;
gap: 16px;
padding: 22px 24px 18px;
border-bottom: 1px solid rgba(148, 163, 184, 0.18);
}
.fsi-dashboard-stat-title-wrap {
min-width: 0;
}
.fsi-dashboard-stat-title-row {
display: flex;
align-items: center;
gap: 10px;
}
.fsi-dashboard-stat-title-icon {
width: 38px;
height: 38px;
flex: 0 0 38px;
display: inline-flex;
align-items: center;
justify-content: center;
border-radius: 12px;
background: rgba(59, 130, 246, 0.10);
}
.fsi-dashboard-stat-title {
margin: 0;
font-size: 20px;
font-weight: 700;
line-height: 1.25;
}
.fsi-dashboard-stat-description {
margin: 8px 0 0;
color: #64748b;
font-size: 13px;
line-height: 1.5;
}
.fsi-dashboard-stat-close {
width: 38px;
height: 38px;
flex: 0 0 38px;
display: inline-flex;
align-items: center;
justify-content: center;
border: 0;
border-radius: 10px;
background: transparent;
color: #64748b;
cursor: pointer;
}
.fsi-dashboard-stat-close:hover {
background: rgba(148, 163, 184, 0.12);
color: #0f172a;
}
.fsi-dashboard-stat-toolbar {
display: flex;
align-items: center;
gap: 12px;
padding: 16px 24px;
border-bottom: 1px solid rgba(148, 163, 184, 0.14);
}
.fsi-dashboard-stat-search {
width: 100%;
min-width: 0;
height: 42px;
padding: 0 14px 0 42px;
border: 1px solid rgba(148, 163, 184, 0.35);
border-radius: 11px;
background: rgba(248, 250, 252, 0.9);
color: inherit;
outline: none;
font-size: 14px;
}
.fsi-dashboard-stat-search:focus {
border-color: rgba(59, 130, 246, 0.55);
box-shadow:
0 0 0 3px rgba(59, 130, 246, 0.10);
}
.fsi-dashboard-stat-search-wrap {
position: relative;
flex: 1;
}
.fsi-dashboard-stat-search-icon {
position: absolute;
left: 14px;
top: 50%;
transform: translateY(-50%);
color: #94a3b8;
pointer-events: none;
}
.fsi-dashboard-stat-count {
flex: 0 0 auto;
white-space: nowrap;
padding: 8px 11px;
border-radius: 999px;
background: rgba(59, 130, 246, 0.09);
color: #2563eb;
font-size: 12px;
font-weight: 700;
}
.fsi-dashboard-stat-list {
flex: 1;
min-height: 0;
overflow-y: auto;
padding: 8px 12px;
}
.fsi-dashboard-stat-row {
display: flex;
align-items: center;
gap: 14px;
padding: 14px 12px;
border-bottom: 1px solid rgba(148, 163, 184, 0.12);
border-radius: 12px;
}
.fsi-dashboard-stat-row:last-child {
border-bottom: 0;
}
.fsi-dashboard-stat-row:hover {
background: rgba(248, 250, 252, 0.9);
}
.fsi-dashboard-stat-avatar {
width: 42px;
height: 42px;
flex: 0 0 42px;
display: inline-flex;
align-items: center;
justify-content: center;
border-radius: 50%;
background: linear-gradient(
135deg,
rgba(59, 130, 246, 0.15),
rgba(99, 102, 241, 0.12)
);
color: #2563eb;
font-size: 14px;
font-weight: 700;
}
.fsi-dashboard-stat-main {
flex: 1;
min-width: 0;
}
.fsi-dashboard-stat-customer {
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
font-size: 14px;
font-weight: 700;
}
.fsi-dashboard-stat-meta {
display: flex;
flex-wrap: wrap;
align-items: center;
gap: 6px 10px;
margin-top: 5px;
color: #64748b;
font-size: 12px;
}
.fsi-dashboard-stat-meta-item {
display: inline-flex;
align-items: center;
gap: 4px;
}
.fsi-dashboard-stat-status {
flex: 0 0 auto;
}
.fsi-dashboard-stat-empty {
padding: 48px 24px;
text-align: center;
color: #64748b;
}
.fsi-dashboard-stat-empty-icon {
width: 52px;
height: 52px;
margin: 0 auto 12px;
display: inline-flex;
align-items: center;
justify-content: center;
border-radius: 16px;
background: rgba(148, 163, 184, 0.10);
color: #94a3b8;
}
.fsi-dashboard-stat-empty-title {
margin: 0;
color: inherit;
font-size: 15px;
font-weight: 700;
}
.fsi-dashboard-stat-empty-text {
margin: 6px 0 0;
font-size: 13px;
}
.fsi-dashboard-stat-footer {
display: flex;
align-items: center;
justify-content: space-between;
gap: 12px;
padding: 15px 24px;
border-top: 1px solid rgba(148, 163, 184, 0.18);
}
.fsi-dashboard-stat-footer-info {
color: #64748b;
font-size: 12px;
}
.fsi-dashboard-stat-view-all {
display: inline-flex;
align-items: center;
justify-content: center;
gap: 7px;
min-height: 40px;
padding: 0 15px;
border: 0;
border-radius: 10px;
background: #2563eb;
color: #ffffff;
cursor: pointer;
font-size: 13px;
font-weight: 700;
}
.fsi-dashboard-stat-view-all:hover {
filter: brightness(0.96);
}
.fsi-dashboard-stat-view-all.is-secondary {
background: rgba(37, 99, 235, 0.10);
color: #2563eb;
}
@media (max-width: 640px) {
.fsi-dashboard-stat-modal {
align-items: flex-end;
padding: 0;
}
.fsi-dashboard-stat-dialog {
width: 100%;
max-height: 92vh;
border-radius: 20px 20px 0 0;
}
.fsi-dashboard-stat-header {
padding: 18px;
}
.fsi-dashboard-stat-toolbar {
padding: 12px 18px;
}
.fsi-dashboard-stat-list {
padding: 6px 10px;
}
.fsi-dashboard-stat-footer {
padding: 12px 18px;
}
.fsi-dashboard-stat-description {
max-width: 260px;
}
.fsi-dashboard-stat-meta-item.sales-info {
display: none;
}
}
`;
document.head.appendChild(
style
);
}
// ============================================================
// GET CUSTOMER INITIALS
// ============================================================
function dashboardGetCustomerInitials(
name
) {
const text =
String(
name ||
"Customer"
)
.trim();
if (!text) {
return "C";
}
const parts =
text
.split(/\s+/)
.filter(Boolean);
if (
parts.length === 1
) {
return parts[0]
.substring(
0,
2
)
.toUpperCase();
}
return (
parts[0][0] +
parts[parts.length - 1][0]
).toUpperCase();
}
// ============================================================
// RENDER STAT POPUP
// ============================================================
function dashboardRenderStatPopup() {
if (
!dashboardStatPopupElement
) {
return;
}
const config =
DASHBOARD_STAT_CATEGORIES[
dashboardStatPopupCurrentCategory
];
if (!config) {
return;
}
const allCategoryData =
dashboardStatPopupCurrentData;
const searchTerm =
String(
dashboardStatPopupSearchTerm ||
""
)
.trim()
.toLowerCase();
let filtered =
[...allCategoryData];
if (searchTerm) {
filtered =
filtered.filter(
lead => {
const values = [
lead.customer_name,
lead.phone,
lead.email,
lead.business,
lead.location,
lead.notes,
dashboardGetLeadSalesName(
lead
)
];
return values.some(
value =>
String(
value ||
""
)
.toLowerCase()
.includes(
searchTerm
)
);
}
);
}
filtered =
dashboardSortPopupLeads(
filtered
);
/*
* Default:
* tampilkan beberapa customer dulu.
*
* View All:
* tampilkan seluruh hasil kategori.
*/
const displayLimit =
dashboardStatPopupShowingAll
? filtered.length
: Math.min(
5,
filtered.length
);
const visibleLeads =
filtered.slice(
0,
displayLimit
);
const totalCategory =
allCategoryData.length;
const title =
dashboardEscapeHTML(
config.title
);
const description =
dashboardEscapeHTML(
config.description
);
const icon =
dashboardEscapeHTML(
config.icon
);
const searchValue =
dashboardEscapeHTML(
dashboardStatPopupSearchTerm
);
const footerText =
dashboardStatPopupShowingAll
? `Menampilkan ${filtered.length} dari ${totalCategory} customer.`
: (
totalCategory > 5
? `Menampilkan 5 dari ${totalCategory} customer.`
: `Menampilkan ${totalCategory} customer.`
);
let listHTML = "";
if (!visibleLeads.length) {
listHTML = `
<div class="fsi-dashboard-stat-empty">
<div class="fsi-dashboard-stat-empty-icon">
<i data-lucide="search-x"></i>
</div>
<p class="fsi-dashboard-stat-empty-title">
Customer tidak ditemukan
</p>
<p class="fsi-dashboard-stat-empty-text">
Coba gunakan kata pencarian lain.
</p>
</div>
`;
} else {
listHTML =
visibleLeads.map(
lead => {
const customerName =
lead.customer_name ||
"Unnamed Customer";
const phone =
lead.phone ||
"-";
const email =
lead.email ||
"";
const business =
lead.business ||
"-";
const location =
lead.location ||
"";
const status =
dashboardNormalizeStatus(
lead.status
) ||
"New";
const salesName =
dashboardGetLeadSalesName(
lead
);
const lastUpdate =
dashboardFormatPopupDate(
lead.updated_at ||
lead.created_at
);
const statusClass =
dashboardGetPopupStatusClass(
status
);
return `
<div class="fsi-dashboard-stat-row">
<div class="fsi-dashboard-stat-avatar">
${dashboardEscapeHTML(
dashboardGetCustomerInitials(
customerName
)
)}
</div>
<div class="fsi-dashboard-stat-main">
<div class="fsi-dashboard-stat-customer">
${dashboardEscapeHTML(
customerName
)}
</div>
<div class="fsi-dashboard-stat-meta">
<span class="fsi-dashboard-stat-meta-item">
<i
data-lucide="briefcase-business"
width="13"
height="13"
></i>
${dashboardEscapeHTML(
business
)}
</span>
<span class="fsi-dashboard-stat-meta-item">
<i
data-lucide="phone"
width="13"
height="13"
></i>
${dashboardEscapeHTML(
phone
)}
</span>
${
email
? `
<span class="fsi-dashboard-stat-meta-it
<i
data-lucide="mail"
width="13"
height="13"
></i>
${dashboardEscapeHTML(
email
)}
</span>
`
: ""
}
${
location
? `
<span class="fsi-dashboard-stat-meta-it
<i
data-lucide="map-pin"
width="13"
height="13"
></i>
${dashboardEscapeHTML(
location
)}
</span>
`
: ""
}
<span class="fsi-dashboard-stat-meta-item sales-inf
<i
data-lucide="user"
width="13"
height="13"
></i>
${dashboardEscapeHTML(
salesName
)}
</span>
<span class="fsi-dashboard-stat-meta-item">
<i
data-lucide="clock-3"
width="13"
height="13"
></i>
${dashboardEscapeHTML(
lastUpdate
)}
</span>
</div>
</div>
<div class="fsi-dashboard-stat-status">
<span class="status-badge ${dashboardEscapeHTML(statusC
${dashboardEscapeHTML(status)}
</span>
</div>
</div>
`;
}
).join("");
}
dashboardStatPopupElement.innerHTML = `
<div
class="fsi-dashboard-stat-backdrop"
data-dashboard-stat-close="true"
></div>
<div
class="fsi-dashboard-stat-dialog"
role="dialog"
aria-modal="true"
aria-labelledby="fsi-dashboard-stat-title"
>
<div class="fsi-dashboard-stat-header">
<div class="fsi-dashboard-stat-title-wrap">
<div class="fsi-dashboard-stat-title-row">
<span class="fsi-dashboard-stat-title-icon">
<i
data-lucide="${icon}"
width="20"
height="20"
></i>
</span>
<h3
id="fsi-dashboard-stat-title"
class="fsi-dashboard-stat-title"
>
${title}
</h3>
</div>
<p class="fsi-dashboard-stat-description">
${description}
</p>
</div>
<button
type="button"
class="fsi-dashboard-stat-close"
aria-label="Close"
data-dashboard-stat-close="true"
>
<i
data-lucide="x"
width="19"
height="19"
></i>
</button>
</div>
<div class="fsi-dashboard-stat-toolbar">
<div class="fsi-dashboard-stat-search-wrap">
<span class="fsi-dashboard-stat-search-icon">
<i
data-lucide="search"
width="17"
height="17"
></i>
</span>
<input
type="search"
class="fsi-dashboard-stat-search"
id="fsi-dashboard-stat-search"
placeholder="Search customer..."
value="${searchValue}"
autocomplete="off"
/>
</div>
<span class="fsi-dashboard-stat-count">
${filtered.length}
</span>
</div>
<div class="fsi-dashboard-stat-list">
${listHTML}
</div>
<div class="fsi-dashboard-stat-footer">
<span class="fsi-dashboard-stat-footer-info">
${dashboardEscapeHTML(
footerText
)}
</span>
${
(
!dashboardStatPopupShowingAll &&
totalCategory > 5
)
? `
<button
type="button"
class="fsi-dashboard-stat-view-all"
id="fsi-dashboard-stat-view-all"
>
<span>
View All
</span>
<i
data-lucide="arrow-right"
width="16"
height="16"
></i>
</button>
`
: (
dashboardStatPopupShowingAll
? `
<button
type="button"
class="fsi-dashboard-stat-view-all is-secondary
id="fsi-dashboard-stat-show-less"
>
<span>
Show Less
</span>
<i
data-lucide="chevron-up"
width="16"
height="16"
></i>
</button>
`
: ""
)
}
</div>
</div>
`;
/*
* Search event.
*/
const searchInput =
document.getElementById(
"fsi-dashboard-stat-search"
);
if (searchInput) {
searchInput.addEventListener(
"input",
function (event) {
dashboardStatPopupSearchTerm =
event.target.value || "";
dashboardRenderStatPopup();
/*
* Fokus kembali ke search.
*/
const nextInput =
document.getElementById(
"fsi-dashboard-stat-search"
);
if (nextInput) {
nextInput.focus();
try {
const length =
nextInput.value.length;
nextInput.setSelectionRange(
length,
length
);
} catch (error) {
// ignore
}
}
}
);
}
/*
* View All.
*/
const viewAllButton =
document.getElementById(
"fsi-dashboard-stat-view-all"
);
if (viewAllButton) {
viewAllButton.addEventListener(
"click",
function () {
dashboardStatPopupShowingAll =
true;
dashboardRenderStatPopup();
}
);
}
/*
* Show Less.
*/
const showLessButton =
document.getElementById(
"fsi-dashboard-stat-show-less"
);
if (showLessButton) {
showLessButton.addEventListener(
"click",
function () {
dashboardStatPopupShowingAll =
false;
dashboardRenderStatPopup();
}
);
}
/*
* Close buttons.
*/
dashboardStatPopupElement
.querySelectorAll(
"[data-dashboard-stat-close='true']"
)
.forEach(
element => {
element.addEventListener(
"click",
function () {
dashboardCloseStatPopup();
}
);
}
);
if (
typeof window.refreshIcons === "function"
) {
window.refreshIcons();
}
}
// ============================================================
// OPEN STAT POPUP
// ============================================================
function dashboardOpenStatPopup(
category
) {
const config =
DASHBOARD_STAT_CATEGORIES[
category
];
if (!config) {
console.warn(
"FSI CRM: kategori statistik tidak ditemukan:",
category
);
return;
}
/*
* Data yang dipakai berasal dari dashboardData,
* yang sudah mengikuti access control Admin / Sales.
*/
const categoryData =
dashboardFilterDataForStat(
dashboardData,
category
);
dashboardStatPopupCurrentCategory =
category;
dashboardStatPopupCurrentData =
dashboardSortPopupLeads(
categoryData
);
dashboardStatPopupShowingAll =
false;
dashboardStatPopupSearchTerm =
"";
dashboardEnsureStatPopupStyles();
/*
* Jika popup sebelumnya ada,
* hapus dahulu supaya state bersih.
*/
if (
dashboardStatPopupElement
) {
dashboardStatPopupElement.remove();
dashboardStatPopupElement =
null;
}
const modal =
document.createElement(
"div"
);
modal.id =
"fsi-dashboard-stat-modal";
modal.className =
"fsi-dashboard-stat-modal";
modal.setAttribute(
"aria-label",
config.title
);
modal.innerHTML = "";
document.body.appendChild(
modal
);
dashboardStatPopupElement =
modal;
dashboardRenderStatPopup();
/*
* Lock scroll halaman ketika popup terbuka.
*/
document.body.dataset.fsiDashboardScrollLocked =
"true";
document.body.style.overflow =
"hidden";
/*
* Fokus ke search.
*/
setTimeout(
function () {
const search =
document.getElementById(
"fsi-dashboard-stat-search"
);
if (search) {
search.focus();
}
},
50
);
}
// ============================================================
// CLOSE STAT POPUP
// ============================================================
function dashboardCloseStatPopup() {
if (
dashboardStatPopupElement
) {
dashboardStatPopupElement.remove();
dashboardStatPopupElement =
null;
}
dashboardStatPopupCurrentCategory =
"total";
dashboardStatPopupCurrentData =
[];
dashboardStatPopupShowingAll =
false;
dashboardStatPopupSearchTerm =
"";
if (
document.body.dataset.fsiDashboardScrollLocked ===
"true"
) {
document.body.style.overflow =
"";
delete document.body.dataset
.fsiDashboardScrollLocked;
}
}
// ============================================================
// KEYBOARD HANDLER FOR STAT POPUP
// ============================================================
function dashboardHandleStatPopupKeydown(
event
) {
if (
event.key !== "Escape"
) {
return;
}
if (
dashboardStatPopupElement
) {
dashboardCloseStatPopup();
}
}
// ============================================================
// BIND STAT CARD CLICKS
// ============================================================
function dashboardBindStatCardClicks() {
dashboardEnsureStatPopupStyles();
const categoryEntries =
Object.entries(
DASHBOARD_STAT_CATEGORIES
);
let boundCount =
0;
categoryEntries.forEach(
([
category,
config
]) => {
const ids = [
config.statId,
...(config.legacyIds || [])
];
let statElement =
null;
for (
const id
of ids
) {
const element =
document.getElementById(
id
);
if (element) {
statElement =
element;
break;
}
}
if (!statElement) {
return;
}
const cardElement =
dashboardFindStatCardElement(
statElement
);
if (!cardElement) {
return;
}
/*
* Jangan bind dua kali.
*/
if (
cardElement.dataset
.fsiStatPopupBound ===
category
) {
return;
}
cardElement.dataset
.fsiStatPopupBound =
category;
cardElement.classList.add(
"dashboard-stat-clickable"
);
cardElement.setAttribute(
"role",
"button"
);
cardElement.setAttribute(
"tabindex",
"0"
);
cardElement.setAttribute(
"aria-label",
`Open ${config.title}`
);
cardElement.addEventListener(
"click",
function (event) {
/*
* Jangan membuka popup jika user
* menekan interactive element lain
* di dalam card.
*/
const interactive =
event.target.closest(
"button, a, input, select, textarea"
);
if (
interactive &&
interactive !== cardElement
) {
return;
}
dashboardOpenStatPopup(
category
);
}
);
cardElement.addEventListener(
"keydown",
function (event) {
if (
event.key === "Enter" ||
event.key === " "
) {
event.preventDefault();
dashboardOpenStatPopup(
category
);
}
}
);
boundCount++;
}
);
if (
!dashboardStatPopupBound
) {
document.addEventListener(
"keydown",
dashboardHandleStatPopupKeydown
);
dashboardStatPopupBound =
true;
}
if (
boundCount > 0
) {
console.log(
"FSI CRM: statistic cards interactive:",
boundCount
);
}
}
// ============================================================
