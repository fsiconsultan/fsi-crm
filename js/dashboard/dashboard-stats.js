// CALCULATE DASHBOARD STATS
// ============================================================
function calculateDashboardStats(
data
) {
const list =
Array.isArray(data)
? data
: [];
return {
total:
list.length,
new:
dashboardCountStatus(
list,
"New"
),
flyerSent:
dashboardCountStatus(
list,
"Flyer Sent"
),
interested:
dashboardCountStatus(
list,
"Interested"
),
followUp:
dashboardCountStatus(
list,
"Follow Up"
),
appointment:
dashboardCountDateField(
list,
"appointment"
),
siteSurvey:
dashboardCountDateField(
list,
"site_survey"
),
quotation:
dashboardCountDateField(
list,
"quotation"
),
spk:
dashboardCountDateField(
list,
"spk"
),
closing:
dashboardCountClosing(
list
),
notInterested:
dashboardCountStatus(
list,
"Not Interested"
)
};
}
// ============================================================
// SET ELEMENT TEXT
// ============================================================
function dashboardSetElementText(
id,
value
) {
const element =
document.getElementById(id);
if (!element) {
return;
}
element.textContent =
String(
value ?? 0
);
}
// ============================================================
// UPDATE DASHBOARD CARDS
// ============================================================
function renderDashboardStats(
stats
) {
if (!stats) {
return;
}
const statMap = {
statTotal:
stats.total,
statNew:
stats.new,
statFlyerSent:
stats.flyerSent,
statInterested:
stats.interested,
statFollowUp:
stats.followUp,
statAppointment:
stats.appointment,
statSiteSurvey:
stats.siteSurvey,
statQuotation:
stats.quotation,
statSPK:
stats.spk,
statClosing:
stats.closing,
statNotInterested:
stats.notInterested
};
Object.entries(
statMap
).forEach(
([id, value]) => {
if (
typeof window.setText === "function"
) {
window.setText(
id,
value
);
}
/*
* Pastikan langsung di-set juga.
*/
dashboardSetElementText(
id,
value
);
}
);
/*
* ========================================================
* LEGACY IDs
* ========================================================
*/
const alternatives = {
totalLeads:
stats.total,
newLeads:
stats.new,
flyerSentLeads:
stats.flyerSent,
interestedLeads:
stats.interested,
followUpLeads:
stats.followUp,
appointmentLeads:
stats.appointment,
siteSurveyLeads:
stats.siteSurvey,
quotationLeads:
stats.quotation,
spkLeads:
stats.spk,
closingLeads:
stats.closing,
notInterestedLeads:
stats.notInterested
};
Object.entries(
alternatives
).forEach(
([id, value]) => {
dashboardSetElementText(
id,
value
);
}
);
/*
* Setelah angka dirender,
* pastikan semua kartu kembali interactive.
*/
dashboardBindStatCardClicks();
}
// ============================================================
