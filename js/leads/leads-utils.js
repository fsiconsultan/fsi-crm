// PAGE SIZE
// ========================================================
function leadGetPageSize() {
const configuredSize =
Number(
window.pageSize
);
if (
Number.isFinite(
configuredSize
) &&
configuredSize > 0
) {
return configuredSize;
}

if (
window.FSI_CRM &&
window.FSI_CRM.config &&
Number(
window.FSI_CRM.config.pageSize
) > 0
) {
return Number(
window.FSI_CRM.config.pageSize
);
}
return 20;
}
function leadGetCurrentPage() {
return Math.max(
1,
Number(
window.currentPage
) || 1
);
}
function leadSetCurrentPage(page) {
const numericPage =
Number(page);
window.currentPage =
Math.max(
1,
Number.isFinite(
numericPage
)
? numericPage
: 1
);
}
function leadGetSalesData() {
return Array.isArray(
window.salesUsersData
)
? window.salesUsersData
: [];
}
// ========================================================
// TEXT / HTML HELPERS
// ========================================================
function leadEscapeHTML(value) {
if (
typeof window.escapeHTML ===
"function"
) {

return window.escapeHTML(
value
);
}
return String(
value ?? ""
)
.replace(
/&/g,
"&amp;"
)
.replace(
/</g,
"&lt;"
)
.replace(
/>/g,
"&gt;"
)
.replace(
/"/g, "&quot;" ) .replace( /'/g, "&#039;" ); } function leadGetValue(value) { return String( value ?? "" ).trim(); } function leadTruncateText( value, maxLength = 90 ) { const text = leadGetValue( value ); if (!text) { return ""; } if ( text.length <= maxLength ) { return text; } return ( text.substring( 0, 
Math.max(

0,
maxLength - 3
)
) +
"..."
);
}
// ========================================================
