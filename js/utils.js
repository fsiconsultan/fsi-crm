/* =====================================================
   UTILITY & HELPER FUNCTIONS
====================================================== */

function crmFormatDate(value) {
  if (!value) return "-";
  const raw = String(value);
  const date = new Date(raw.length === 10 ? raw + "T00:00:00" : raw);
  if (Number.isNaN(date.getTime())) return raw;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function crmCalculateLeadAge(createdAt) {
  if (!createdAt) return "-";
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return "-";

  const now = new Date();
  const diff = Math.max(0, now.getTime() - created.getTime());
  const days = Math.floor(diff / 86400000);

  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return days + " days";
}

function crmSetInputValue(id, value) {
  const element = document.getElementById(id);
  if (!element) return;
  element.value = value == null ? "" : String(value);
}

function crmEscapeHtml(value) {
  return String(value == null ? "" : value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
