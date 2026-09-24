// ============================================================
function dashboardNormalizeRole(role) {
if (
typeof window.authNormalizeRole === "function"
) {
return window.authNormalizeRole(role);
}
if (
typeof window.normalizeRole === "function"
) {
return window.normalizeRole(role);
}
return String(role || "")
.trim()
.toLowerCase();
}
// ============================================================
// ROLE HELPERS
// ============================================================
function dashboardIsAdmin() {
const profile =
dashboardGetProfile();
if (!profile) {
return false;
}
const role =
dashboardNormalizeRole(
profile.role
);
return (
role === "admin" ||
role === "owner" ||
role === "administrator"
);
}
function dashboardIsSales() {
const profile =
dashboardGetProfile();
if (!profile) {
return false;
}
const role =
dashboardNormalizeRole(
profile.role
);
return (
role === "sales" ||
role === "salesperson"
);
}
// ============================================================
// PAGE ELEMENT FINDER
// ============================================================
function dashboardFindPage(type) {
const pageMap = {
dashboard: [
"view-dashboard",
"dashboardPage",
"dashboard-page",
"dashboard-view"
],
leads: [
"view-leads",
"leadsPage",
"leads-page",
"leads-view"
],
sales: [
"view-sales",
"salesPage",
"sales-page",
"sales-view"
],
customerProfile: [
"view-customer-profile",
"customerProfilePage",
"customer-profile-page",
"customer-profile-view"
]
};
const ids =
pageMap[type] || [];
for (
const id of ids
) {
const element =
document.getElementById(id);
if (element) {
return element;
}
}
return null;
}
// ============================================================
// HIDE ALL PAGES
// ============================================================
function hideAllPages() {
const pageTypes = [
"dashboard",
"leads",
"sales",
"customerProfile"
];
pageTypes.forEach(
type => {
const element =
dashboardFindPage(type);
if (!element) {
return;
}
element.classList.add(
"hidden"
);
element.classList.remove(
"active"
);
element.style.display =
"none";
element.setAttribute(
"aria-hidden",
"true"
);
}
);
}
// ============================================================
// SHOW PAGE
// ============================================================
function dashboardShowPage(type) {
const page =
dashboardFindPage(type);
if (!page) {
console.warn(
`FSI CRM: page "${type}" tidak ditemukan.`
);
return null;
}
/*
* Jangan menggunakan navigation.js secara paksa di sini.
* Dashboard harus tetap bisa dibuka walaupun module
* navigation belum selesai melakukan binding.
*/
hideAllPages();
page.classList.remove(
"hidden"
);
page.classList.add(
"active"
);
page.style.display =
"block";
page.style.visibility =
"visible";
page.style.opacity =
"1";
page.setAttribute(
"aria-hidden",
"false"
);
return page;
}
// ============================================================
// PAGE TITLE
// ============================================================
function dashboardSetPageTitle(title) {
if (
typeof window.setPageTitle === "function"
) {
window.setPageTitle(title);
return;
}
const titleIds = [
"current-page-title",
"pageTitle",
"page-title"
];
titleIds.forEach(
id => {
const element =
document.getElementById(id);
if (element) {
element.textContent =
title;
}
}
);
}
// ============================================================
// PAGE DESCRIPTION
// ============================================================
function dashboardSetPageDescription(
description
) {
const ids = [
"current-page-description",
"pageDescription",
"page-description"
];
for (
const id of ids
) {
const element =
document.getElementById(id);
if (element) {
element.textContent =
description || "";
return;
}
}
}
// ============================================================
// UPDATE ACTIVE NAVIGATION
// ============================================================
function dashboardSetActiveNav(target) {
const links =
document.querySelectorAll(
[
".nav-link",
".nav-dropdown-item",
"[data-page]",
"[data-view]",
"[data-nav]",
"[data-crm-nav]"
].join(",")
);
links.forEach(
link => {
link.classList.remove(
"active"
);
link.removeAttribute(
"aria-current"
);
}
);
const selectors = [
`[data-page="${target}"]`,
`[data-view="${target}"]`,
`[data-nav="${target}"]`,
`[data-crm-nav="${target}"]`
];
selectors.forEach(
selector => {
document
.querySelectorAll(
selector
)
.forEach(
element => {
element.classList.add(
"active"
);
element.setAttribute(
"aria-current",
"page"
);
}
);
}
);
}
// ============================================================
// SHOW DASHBOARD
// ============================================================
async function showDashboard() {
const profile =
dashboardGetProfile();
if (!profile) {
console.warn(
"FSI CRM: profile belum siap. Dashboard belum dapat dimuat."
);
return;
}
const page =
dashboardShowPage(
"dashboard"
);
if (!page) {
return;
}
dashboardSetPageTitle(
"Dashboard"
);
dashboardSetPageDescription(
dashboardIsAdmin()
? "Overview seluruh aktivitas dan pipeline sales."
: "Overview aktivitas dan pipeline customer Anda."
);
dashboardSetActiveNav(
"dashboard"
);
/*
* Pastikan kartu statistik tetap interactive
* setiap kali Dashboard dibuka.
*/
dashboardBindStatCardClicks();
/*
* Selalu refresh ketika Dashboard dibuka.
* Jadi jika ada lead baru, angka langsung berubah.
*/
await updateDashboard();
dashboardScrollTop();
}
// ============================================================
// SHOW LEADS
// ============================================================
async function showLeads() {
const profile =
dashboardGetProfile();
if (!profile) {
console.warn(
"FSI CRM: profile belum siap, leads tidak dibuka."
);
return;
}
const page =
dashboardShowPage(
"leads"
);
if (!page) {
return;
}
const isAdmin =
dashboardIsAdmin();
dashboardSetPageTitle(
isAdmin
? "All Leads"
: "My Leads"
);
dashboardSetPageDescription(
isAdmin
? "Kelola seluruh database customer dan lead."
: "Kelola database customer dan lead Anda."
);
dashboardSetActiveNav(
"leads"
);
if (
typeof window.loadFilterOptions === "function"
) {
try {
await window.loadFilterOptions();
} catch (error) {
console.error(
"FSI CRM: load filter options error:",
error
);
}
}
if (
typeof window.loadLeads === "function"
) {
try {
await window.loadLeads(1);
} catch (error) {
console.error(
"FSI CRM: load leads error:",
error
);
}
}
dashboardScrollTop();
}
// ============================================================
// SHOW SALES MANAGEMENT
// ============================================================
async function showSales() {
if (!dashboardIsAdmin()) {
if (
typeof window.showToast === "function"
) {
window.showToast(
"Only Admin can access Sales Management.",
"warning"
);
} else {
alert(
"Access denied."
);
}
return;
}
const page =
dashboardShowPage(
"sales"
);
if (!page) {
return;
}
dashboardSetPageTitle(
"Manage Sales"
);
dashboardSetPageDescription(
"Kelola user Sales, status akun, dan akses tim."
);
dashboardSetActiveNav(
"sales"
);
if (
typeof window.loadSalesUsers === "function"
) {
try {
await window.loadSalesUsers();
} catch (error) {
console.error(
"FSI CRM: load Sales users error:",
error
);
}
}
dashboardScrollTop();
}
// ============================================================
// SHOW CUSTOMER PROFILE
// ============================================================
async function showCustomerProfile() {
const profile =
dashboardGetProfile();
if (!profile) {
return;
}
const page =
dashboardShowPage(
"customerProfile"
);
if (!page) {
return;
}
dashboardSetPageTitle(
"Customer Profile"
);
dashboardSetPageDescription(
"Detail customer, pipeline, aktivitas, dan follow-up."
);
dashboardSetActiveNav(
"customerProfile"
);
dashboardScrollTop();
}
// ============================================================
// SCROLL TOP
// ============================================================
function dashboardScrollTop() {
try {
window.scrollTo({
top: 0,
behavior: "smooth"
});
} catch (error) {
window.scrollTo(
0,
0
);
}
}
// ============================================================
