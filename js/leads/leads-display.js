// LAST FOLLOW UP
// ========================================================
function leadGetLastFollowUpHTML(
value
) {
if (!value) {
return `
<div class="lead-last-update-stack lead-last-update-empty">
<div class="lead-date-main">
-
</div>
<div class="lead-date-sub">
<i data-lucide="clock-3"></i>

Belum ada update
</div>
</div>
`;
}
const formatted =
leadFormatDateTime(
value
);
const age =
leadGetAgeInDays(
value
);
const ageLabel =
leadGetAgeLabel(
value
);
const ageClass =
leadGetAgeClass(
value
);
return `
<div
class="lead-last-update-stack ${leadEscapeHTML(ageClass)}"
data-last-follow-up="${leadEscapeHTML(String(value))}"
>
<div class="lead-date-main">
${leadEscapeHTML(formatted)}
</div>
<div class="lead-last-update-age">
<i data-lucide="clock-3"></i>
<span>
${leadEscapeHTML(ageLabel)}
</span>
</div>
</div>
`;
}
// ========================================================
// FOLLOW UP PLANNED DATE
// ========================================================
function leadIsOverdue(value) {
const followUpDate =
leadParseDate(
value
);

if (!followUpDate) {
return false;
}
const now =
new Date();
const today =
new Date(
now.getFullYear(),
now.getMonth(),
now.getDate()
);
const followUpDay =
new Date(
followUpDate.getFullYear(),
followUpDate.getMonth(),
followUpDate.getDate()
);
return followUpDay < today;
}
function leadGetOverdueDays(value) {
const followUpDate =
leadParseDate(
value
);
if (!followUpDate) {
return 0;
}
const now =
new Date();
const today =
new Date(
now.getFullYear(),
now.getMonth(),
now.getDate()
);
const followUpDay =
new Date(
followUpDate.getFullYear(),
followUpDate.getMonth(),
followUpDate.getDate()
);
const difference =
today.getTime() -
followUpDay.getTime();
if (difference <= 0) {
return 0;

}
return Math.floor(
difference /
86400000
);
}
function leadGetFollowUpStatusHTML(
value
) {
if (!value) {
return "-";
}
const formatted =
leadFormatDateTime(
value
);
const safeDate =
leadEscapeHTML(
formatted
);
if (
leadIsOverdue(
value
)
) {
const overdueDays =
leadGetOverdueDays(
value
);
const overdueLabel =
overdueDays === 1
? "1 hari lewat"
: `${overdueDays} hari lewat`;
return `
<div class="lead-date-stack lead-followup-overdue">
<div class="lead-date-main">
${safeDate}
</div>
<div class="lead-date-alert">
<i data-lucide="triangle-alert"></i>
${leadEscapeHTML(
overdueLabel
)}
</div>
</div>
`;
}

return `
<div class="lead-date-stack">
<div class="lead-date-main">
${safeDate}
</div>
<div class="lead-date-sub">
<i data-lucide="calendar-clock"></i>
Follow Up
</div>
</div>
`;
}
// ========================================================
// MILESTONE / PROGRESS
// ========================================================
function leadGetMilestoneHTML(
label,
icon,
value
) {
if (
value === null ||
value === undefined ||
value === ""
) {
return "";
}
const safeLabel =
leadEscapeHTML(
label
);
const formattedValue =
leadFormatDateTime(
value
);
const safeValue =
leadEscapeHTML(
formattedValue
);
return `
<div class="lead-milestone-item">
<i
data-lucide="${leadEscapeHTML(icon)}"
></i>
<div class="lead-milestone-content">
<span class="lead-milestone-label">

${safeLabel}
</span>
<span class="lead-milestone-date">
${safeValue}
</span>
</div>
</div>
`;
}
function leadGetProgressHTML(
lead
) {
const milestones = [];
const appointmentHTML =
leadGetMilestoneHTML(
"Appointment",
"calendar-days",
lead.appointment
);
const siteSurveyHTML =
leadGetMilestoneHTML(
"Site Survey",
"map-pin-check",
lead.site_survey
);
const quotationHTML =
leadGetMilestoneHTML(
"Quotation",
"file-text",
lead.quotation
);
const spkHTML =
leadGetMilestoneHTML(
"SPK",
"file-check-2",
lead.spk
);
const closingHTML =
leadGetMilestoneHTML(
"Closing",
"circle-check",
lead.closing
);
if (appointmentHTML) {
milestones.push(
appointmentHTML
);
}
if (siteSurveyHTML) {

milestones.push(
siteSurveyHTML
);
}
if (quotationHTML) {
milestones.push(
quotationHTML
);
}
if (spkHTML) {
milestones.push(
spkHTML
);
}
if (closingHTML) {

milestones.push(
closingHTML
);
}
if (
milestones.length === 0
) {
return `
<div class="lead-progress-empty">
Belum ada progress
</div>
`;
}
return `
<div class="lead-progress-list">
${milestones.join("")}
</div>
`;
}
// ========================================================
