// ================================
// CRM FSI - HELPERS
// ================================


// ================================
// FORMAT DATE
// ================================

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}


// ================================
// FORMAT DATE TIME
// ================================

function formatDateTime(dateValue) {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}


// ================================
// STATUS CLASS
// ================================

function statusClass(status) {
  if (!status) {
    return "";
  }

  return String(status)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}


// ================================
// ESCAPE HTML
// ================================

function escapeHTML(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// ================================
// GET VALUE
// ================================

function getValue(id) {
  const element = document.getElementById(id);

  if (!element) {
    return "";
  }

  return element.value ?? "";
}


// ================================
// SET VALUE
// ================================

function setValue(id, value) {
  const element = document.getElementById(id);

  if (!element) {
    return;
  }

  element.value = value ?? "";
}


// ================================
// SET TEXT
// ================================

function setText(id, value) {
  const element = document.getElementById(id);

  if (!element) {
    return;
  }

  element.textContent = value ?? "";
}
