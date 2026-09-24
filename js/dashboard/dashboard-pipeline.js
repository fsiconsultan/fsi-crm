// FIND PIPELINE CONTAINER
// ============================================================
//
// index.html terbaru menggunakan:
//        pipeline-summary
//
// Versi lama menggunakan:
//        dashboard-pipeline
//
// Kita support keduanya agar tidak merusak versi lama.
// ============================================================
function dashboardFindPipelineContainer() {
const ids = [
"pipeline-summary",
"dashboard-pipeline",
"pipeline-summary-container",
"sales-pipeline"
];
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
// RENDER PIPELINE
// ============================================================
function renderDashboardPipeline(
data
) {
const container =
dashboardFindPipelineContainer();
if (!container) {
console.warn(
"FSI CRM: Pipeline container tidak ditemukan."
);
return;
}
const list =
Array.isArray(data)
? data
: [];
/*
* Pipeline dibuat mengikuti alur CRM:
*
* New
* Flyer Sent
* Interested
* Follow Up
* Appointment
* Site Survey
* Quotation
* SPK
* Closing
* Not Interested
*/
const stages = [
{
label: "New",
className: "status-new"
},
{
label: "Flyer Sent",
className: "status-flyer"
},
{
label: "Interested",
className: "status-interested"
},
{
label: "Follow Up",
className: "status-follow-up"
},
{
label: "Appointment",
className: "status-appointment"
},
{
label: "Site Survey",
className: "status-site-survey"
},
{
label: "Quotation",
className: "status-quotation"
},
{
label: "SPK",
className: "status-spk"
},
{
label: "Closing",
className: "status-closing"
},
{
label: "Not Interested",
className: "status-not-interested"
}
];
const html =
stages.map(
stage => {
let count = 0;
if (
stage.label === "Appointment"
) {
count =
dashboardCountDateField(
list,
"appointment"
);
} else if (
stage.label === "Site Survey"
) {
count =
dashboardCountDateField(
list,
"site_survey"
);
} else if (
stage.label === "Quotation"
) {
count =
dashboardCountDateField(
list,
"quotation"
);
} else if (
stage.label === "SPK"
) {
count =
dashboardCountDateField(
list,
"spk"
);
} else if (
stage.label === "Closing"
) {
count =
dashboardCountClosing(
list
);
} else {
count =
dashboardCountStatus(
list,
stage.label
);
}
return `
<div class="pipeline-item">
<div class="pipeline-item-main">
<span class="pipeline-status ${stage.className}">
${dashboardEscapeHTML(stage.label)}
</span>
</div>
<strong class="pipeline-count">
${count}
</strong>
</div>
`;
}
).join("");
container.innerHTML =
html;
if (
typeof window.refreshIcons === "function"
) {
window.refreshIcons();
}
}
// ============================================================
