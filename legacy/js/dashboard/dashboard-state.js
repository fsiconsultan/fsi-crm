// ============================================================
// FSI CRM - DASHBOARD MODULE
// File: js/dashboard.js
// ============================================================
//
// Fungsi:
// - Dashboard navigation
// - Dashboard statistics
// - Load data leads dari Supabase
// - Admin / Sales access handling
// - Refresh dashboard
// - Pipeline summary
// - Recent leads / activities
// - Pagination data Supabase > 1000 rows
// - Modern + legacy page ID compatibility
// - Dashboard panel ID compatibility
// - View All -> Leads
// - Interactive statistic cards
// - Statistic popup / customer list
// - View All per statistic category
// - Search customer inside statistic popup
// ============================================================
"use strict";
// ============================================================
// DASHBOARD STATE
// ============================================================
window.FSIDashboard = window.FSIDashboard || {};
let dashboardLoading = false;
let dashboardInitialized = false;
let dashboardData = [];
let dashboardStats = null;
const DASHBOARD_BATCH_SIZE = 1000;
// ============================================================
// STATISTIC POPUP STATE
// ============================================================
let dashboardStatPopupBound = false;
let dashboardStatPopupElement = null;
let dashboardStatPopupCurrentCategory = "total";
let dashboardStatPopupCurrentData = [];
let dashboardStatPopupShowingAll = false;
let dashboardStatPopupSearchTerm = "";
// ============================================================
// GET SUPABASE CLIENT
// ============================================================
function dashboardGetSupabase() {
try {
if (
window.supabaseClient &&
typeof window.supabaseClient.from === "function"
) {
return window.supabaseClient;
}
} catch (error) {
console.warn(
"FSI CRM: window.supabaseClient error:",
error
);
}
try {
if (
typeof supabaseClient !== "undefined" &&
supabaseClient &&
typeof supabaseClient.from === "function"
) {
return supabaseClient;
}
} catch (error) {
console.warn(
"FSI CRM: supabaseClient error:",
error
);
}
return null;
}
// ============================================================
// GET CURRENT PROFILE
// ============================================================
function dashboardGetProfile() {
try {
if (
window.currentProfile &&
typeof window.currentProfile === "object"
) {
return window.currentProfile;
}
} catch (error) {
// ignore
}
try {
if (
typeof currentProfile !== "undefined" &&
currentProfile
) {
return currentProfile;
}
} catch (error) {
// ignore
}
return null;
}
// ============================================================
// GET CURRENT USER
// ============================================================
function dashboardGetUser() {
try {
if (
window.currentUser &&
typeof window.currentUser === "object"
) {
return window.currentUser;
}
} catch (error) {
// ignore
}
try {
if (
typeof currentUser !== "undefined" &&
currentUser
) {
return currentUser;
}
} catch (error) {
// ignore
}
return null;
}
// ============================================================
