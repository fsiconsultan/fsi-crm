// ========================================
// CRM FSI - HELPERS
// ========================================


// ========================================
// DOM HELPER
// ========================================

function $(id) {
  return document.getElementById(id);
}


// ========================================
// ESCAPE HTML
// ========================================

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/[&<>"']/g, (character) => {

      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      };

      return entities[character];
    });
}


// ========================================
// FORMAT DATE
// ========================================

function formatDate(value) {

  if (!value) {
    return "-";
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }


  return date.toLocaleDateString(
    "id-ID",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );
}


// ========================================
// FORMAT DATE INPUT
// ========================================

function formatDateInput(value) {

  if (!value) {
    return "";
  }


  return String(value).slice(
    0,
    10
  );
}


// ========================================
// NORMALIZE LEAD STATUS
// ========================================

function normalizeLeadStatus(value) {

  const status =
    String(value || "")
      .trim()
      .toLowerCase();


  const found =
    CRM_CONFIG.statuses.find(
      (item) =>
        item.toLowerCase() ===
        status
    );


  return (
    found ||
    value ||
    "New"
  );
}


// ========================================
// NORMALIZE PHONE
// ========================================

function normalizePhone(phone) {

  let number =
    String(phone || "")
      .replace(/\D/g, "");


  if (
    number.startsWith("0")
  ) {
    number =
      "62" +
      number.slice(1);
  }


  if (
    !number.startsWith("62") &&
    number.length >= 9
  ) {
    number =
      "62" +
      number;
  }


  return number;
}


// ========================================
// WHATSAPP LINK
// ========================================

function whatsappLink(
  phone,
  text = ""
) {

  const number =
    normalizePhone(phone);


  if (!number) {
    return "#";
  }


  return (
    "https://wa.me/" +
    number +
    (
      text
        ? "?text=" +
          encodeURIComponent(text)
        : ""
    )
  );
}


// ========================================
// TOAST NOTIFICATION
// ========================================

function showToast(
  message,
  type = "success"
) {

  const box =
    $("toastContainer");


  if (!box) {
    return;
  }


  const item =
    document.createElement("div");


  item.className =
    "toast " + type;


  let icon =
    "fa-circle-info";


  if (type === "success") {
    icon =
      "fa-circle-check";
  }


  if (type === "error") {
    icon =
      "fa-circle-xmark";
  }


  item.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>
      ${escapeHTML(message)}
    </span>
  `;


  box.appendChild(item);


  setTimeout(
    () => {
      item.remove();
    },
    3500
  );
}


// ========================================
// GLOBAL LOADING
// ========================================

function setGlobalLoading(
  show,
  text = "Loading..."
) {

  const element =
    $("globalLoading");


  if (!element) {
    return;
  }


  element.style.display =
    show
      ? "flex"
      : "none";


  const textElement =
    $("globalLoadingText");


  if (textElement) {
    textElement.textContent =
      text;
  }
}


// ========================================
// BUTTON LOADING
// ========================================

function setButtonLoading(
  button,
  loading,
  label
) {

  if (!button) {
    return;
  }


  button.disabled =
    loading;


  if (!button.dataset.label) {

    button.dataset.label =
      label ||
      button.textContent.trim();

  }


  if (loading) {

    button.innerHTML = `
      <i class="fa-solid fa-spinner fa-spin"></i>
      Loading...
    `;

  } else {

    button.textContent =
      button.dataset.label;
  }
}


// ========================================
// OPEN MODAL
// ========================================

function openModal(id) {

  const element =
    $(id);


  if (!element) {
    return;
  }


  element.style.display =
    "flex";


  element.classList.add(
    "active"
  );


  document.body.classList.add(
    "modal-open"
  );
}


// ========================================
// CLOSE MODAL
// ========================================

function closeModal(id) {

  const element =
    $(id);


  if (!element) {
    return;
  }


  if (
    element.dataset.locked ===
    "true"
  ) {
    return;
  }


  element.style.display =
    "none";


  element.classList.remove(
    "active"
  );


  document.body.classList.remove(
    "modal-open"
  );
}


// ========================================
// FORM MESSAGE
// ========================================

function showFormMessage(
  id,
  message = "",
  type = "error"
) {

  const element =
    $(id);


  if (!element) {
    return;
  }


  element.textContent =
    message;


  element.className =
    "form-message " +
    (
      message
        ? type
        : ""
    );
}


// ========================================
// GET SALES NAME
// ========================================

function getSalesName(id) {

  const sales =
    (salesUsersData || [])
      .find(
        (user) =>
          String(user.id) ===
          String(id)
      );


  if (!sales) {
    return "-";
  }


  return (
    sales.name ||
    sales.username ||
    "-"
  );
}


// ========================================
// COUNT STATUS
// ========================================

function countStatus(
  data,
  status
) {

  return (
    data || []
  ).filter(
    (lead) =>
      normalizeLeadStatus(
        lead.status
      ) === status
  ).length;
}


// ========================================
// DEBOUNCE
// ========================================

function debounce(
  fn,
  delay = 350
) {

  let timer;


  return (
    ...args
  ) => {

    clearTimeout(
      timer
    );


    timer =
      setTimeout(
        () => {
          fn(...args);
        },
        delay
      );
  };
}


// ========================================
// SAFE TEXT
// ========================================

function safeText(value) {

  return escapeHTML(
    value ?? "-"
  );
}


// ========================================
// EXPORT CSV
// ========================================

function exportCSV(
  rows,
  filename = "fsi-leads.csv"
) {

  if (
    !rows ||
    !rows.length
  ) {

    showToast(
      "Tidak ada data untuk diexport.",
      "info"
    );

    return;
  }


  const headers =
    Object.keys(
      rows[0]
    );


  const csvRows = [];


  // Header
  csvRows.push(
    headers
      .map(
        (header) =>
          `"${String(header)
            .replace(
              /"/g,
              '""'
            )}"`
      )
      .join(",")
  );


  // Data
  rows.forEach(
    (row) => {

      const values =
        headers.map(
          (header) => {

            const value =
              row[header] ??
              "";


            return `"${String(
              value
            ).replace(
              /"/g,
              '""'
            )}"`;
          }
        );


      csvRows.push(
        values.join(",")
      );
    }
  );


  const csv =
    "\uFEFF" +
    csvRows.join(
      "\n"
    );


  const blob =
    new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8;"
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const link =
    document.createElement(
      "a"
    );


  link.href =
    url;


  link.download =
    filename;


  document.body.appendChild(
    link
  );


  link.click();


  link.remove();


  URL.revokeObjectURL(
    url
  );
}
