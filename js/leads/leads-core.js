// ============================================================
// FSI CRM - LEADS MANAGEMENT
// File: js/leads.js
// ============================================================
//
// Fungsi:
// - Load leads dari Supabase
// - Search & filter
// - Pagination
// - Add Customer
// - Edit Customer
// - Delete customer
// - Sales assignment
// - Admin / Sales access
// - Integrasi Customer Profile / shelter.js
// - Sales header selection
// - Empty state tanpa stuck loading
// - Add Customer tersedia untuk Admin & Sales
// - Profile selalu menggunakan Customer ID yang benar
// - Status & Business filter dropdown
// - Location filter DIHAPUS
// - Menampilkan Email
// - Menampilkan Last Follow Up
// - Menampilkan Follow Up Age
// - Menampilkan Progress PLTS
// - Menampilkan Note
// ============================================================
"use strict";

// ========================================================
// INTERNAL STATE
// ========================================================
let leadsInitialized = false;
let leadsLoading = false;
let searchTimer = null;
let activeRequestId = 0;
// ========================================================
// DOM HELPERS
// ========================================================
function leadElement(...ids) {
for (const id of ids) {
if (!id) {
continue;
}
const element =
document.getElementById(id);
if (element) {
return element;
}
}
return null;
}
function leadGetSupabase() {

if (
typeof window.supabaseClient !== "undefined" &&
window.supabaseClient
) {
return window.supabaseClient;
}
try {
if (
typeof supabaseClient !== "undefined" &&
supabaseClient
) {
return supabaseClient;
}
} catch (error) {
// Ignore lexical lookup error.
}
return null;
}
function leadGetProfile() {
if (
typeof window.currentProfile !== "undefined" &&
window.currentProfile
) {
return window.currentProfile;
}
try {
if (
typeof currentProfile !== "undefined" &&
currentProfile
) {
return currentProfile;
}
} catch (error) {
// Ignore lexical lookup error.
}
return null;
}
function leadIsAdmin() {
const profile =
leadGetProfile();
if (!profile) {
return false;
}
if (
typeof window.isAdminRole ===
"function"
) {
return window.isAdminRole(
profile
);
}

const role =
String(
profile.role || ""
)
.trim()
.toLowerCase();
return (
role === "admin" ||
role === "owner" ||
role === "administrator"
);
}
function leadIsSales() {
const profile =
leadGetProfile();
if (!profile) {
return false;
}
if (
typeof window.isSalesRole ===
"function"
) {
return window.isSalesRole(
profile
);
}
const role =
String(
profile.role || ""
)
.trim()
.toLowerCase();
return (
role === "sales" ||
role === "salesperson"

);
}
// ========================================================
