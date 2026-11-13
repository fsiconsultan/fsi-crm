// SHOW DASHBOARD LOADING
// ============================================================
function dashboardShowLoading() {
const page =
dashboardFindPage(
"dashboard"
);
if (page) {
page.classList.add(
"dashboard-loading"
);
}
}
// ============================================================
// HIDE DASHBOARD LOADING
// ============================================================
function dashboardHideLoading() {
const page =
dashboardFindPage(
"dashboard"
);
if (page) {
page.classList.remove(
"dashboard-loading"
);
}
}
// ============================================================
