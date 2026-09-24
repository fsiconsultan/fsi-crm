// ============================================================
async function dashboardFetchLeads() {
const client =
dashboardGetSupabase();
if (!client) {
throw new Error(
"Supabase client belum siap."
);
}
const profile =
dashboardGetProfile();
if (!profile) {
throw new Error(
"Profile user belum siap."
);
}
const isAdmin =
dashboardIsAdmin();
const isSales =
dashboardIsSales();
/*
* ========================================================
* QUERY DASAR
* ========================================================
*
* Kita gunakan select("*") supaya Dashboard tidak gagal
* hanya karena ada field tambahan pada tabel leads.
*/
async function fetchBatch(
from,
to
) {
let query =
client
.from("leads")
.select("*")
.order(
"created_at",
{
ascending: false
}
)
.range(
from,
to
);
/*
* SALES:
*
* Dashboard Sales hanya mengambil leads miliknya.
*
* Admin:
* tidak diberi filter sales_id.
*/
if (
isSales &&
!isAdmin
) {
if (!profile.id) {
throw new Error(
"ID profile Sales tidak ditemukan."
);
}
query =
query.eq(
"sales_id",
profile.id
);
}
const {
data,
error
} = await query;
if (error) {
throw error;
}
return Array.isArray(data)
? data
: [];
}
/*
* ========================================================
* LOAD BERTAHAP
* ========================================================
*
* Supabase biasanya membatasi hasil query.
* Kita ambil 1.000 row per batch sampai data habis.
*/
const allLeads = [];
let start =
0;
while (true) {
const end =
start +
DASHBOARD_BATCH_SIZE -
1;
const batch =
await fetchBatch(
start,
end
);
if (!batch.length) {
break;
}
allLeads.push(
...batch
);
/*
* Jika jumlah batch kurang dari 1000,
* berarti sudah sampai data terakhir.
*/
if (
batch.length <
DASHBOARD_BATCH_SIZE
) {
break;
}
start +=
DASHBOARD_BATCH_SIZE;
/*
* Pengaman agar tidak terjadi loop tidak terbatas.
*/
if (
start >
1000000
) {
console.warn(
"FSI CRM: Dashboard berhenti setelah membaca 1.000.000 leads."
);
break;
}
}
console.log(
"FSI CRM Dashboard: leads berhasil dimuat:",
allLeads.length,
{
role: profile.role,
profileId: profile.id,
admin: isAdmin,
sales: isSales
}
);
return allLeads;
}
// ============================================================
// NORMALIZE STATUS
// ============================================================
function dashboardNormalizeStatus(status) {
if (
typeof window.normalizeLeadStatus === "function"
) {
return window.normalizeLeadStatus(
status
);
}
return String(status || "")
.trim();
}
// ============================================================
// CHECK VALUE
// ============================================================
function dashboardHasValue(value) {
if (
value === null ||
value === undefined
) {
return false;
}
if (
typeof value === "string"
) {
return value.trim() !== "";
}
return true;
}
// ============================================================
// COUNT STATUS
// ============================================================
function dashboardCountStatus(
list,
status
) {
if (
typeof window.countNormalizedStatus === "function"
) {
return window.countNormalizedStatus(
list,
status
);
}
return list.filter(
item =>
dashboardNormalizeStatus(
item.status
) === status
).length;
}
// ============================================================
// COUNT DATE FIELD
// ============================================================
function dashboardCountDateField(
list,
field
) {
if (
typeof window.countDateField === "function"
) {
return window.countDateField(
list,
field
);
}
return list.filter(
item =>
dashboardHasValue(
item[field]
)
).length;
}
// ============================================================
// COUNT CLOSING
// ============================================================
function dashboardCountClosing(
list
) {
if (
typeof window.countClosing === "function"
) {
return window.countClosing(
list
);
}
return list.filter(
item => {
const status =
dashboardNormalizeStatus(
item.status
);
return (
status === "Closing" ||
dashboardHasValue(
item.closing
)
);
}
).length;
}
// ============================================================
