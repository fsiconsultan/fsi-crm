// PAGINATION
// ========================================================
function updatePagination() {
const paginationInfo =
leadElement(
"leads-pagination-info",
"paginationInfo"
);
const pageIndicator =
leadElement(
"pageIndicator"
);
const prevBtn =
leadElement(
"btn-prev-page",
"prevBtn"
);
const nextBtn =
leadElement(
"btn-next-page",
"nextBtn"
);
const pageSize =
leadGetPageSize();
const totalLeads =
Number(
window.totalLeadsCount
) || 0;
const currentPage =

leadGetCurrentPage();
const totalPages =
Math.max(
1,
Math.ceil(
totalLeads /
pageSize
)
);
const start =
totalLeads === 0
? 0
: (
(
currentPage -
1
) *
pageSize
) + 1;
const end =
Math.min(
currentPage *
pageSize,
totalLeads
);
if (paginationInfo) {
paginationInfo.textContent =
totalLeads === 0
? "0 leads"
: `${start}-${end} of ${totalLeads} leads`;
}
if (pageIndicator) {
pageIndicator.textContent =
`Page ${currentPage} / ${totalPages}`;
}
if (prevBtn) {
const disabled =
totalLeads === 0 ||
currentPage <= 1;
prevBtn.disabled =
disabled;
prevBtn.setAttribute(
"aria-disabled",
String(disabled)
);
}
if (nextBtn) {

const disabled =
totalLeads === 0 ||
currentPage >= totalPages;
nextBtn.disabled =
disabled;
nextBtn.setAttribute(
"aria-disabled",
String(disabled)
);
}
const pageInfo =
leadElement(
"pagination-page-info"
);
if (pageInfo) {
pageInfo.textContent =
totalLeads === 0
? "Page 1 / 1"
: `Page ${currentPage} / ${totalPages}`;
}
window.totalPages =
totalPages;
}
function changePage(
direction
) {
const numericDirection =
Number(direction);
if (
!Number.isFinite(
numericDirection
)
) {
return;
}

if (leadsLoading) {
return;
}
const pageSize =
leadGetPageSize();
const totalLeads =
Number(
window.totalLeadsCount
) || 0;
if (totalLeads <= 0) {

return;
}
const totalPages =
Math.max(
1,
Math.ceil(
totalLeads /
pageSize
)
);
const currentPage =
leadGetCurrentPage();
const newPage =
currentPage +
numericDirection;
if (
newPage < 1 ||
newPage > totalPages
) {
return;
}
loadLeads(
newPage
);
}
function nextLeadPage() {
changePage(1);
}
function previousLeadPage() {
changePage(-1);
}
// ========================================================
