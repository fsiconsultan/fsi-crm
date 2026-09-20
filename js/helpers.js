// ========================================
// CRM FSI - HELPERS
// ========================================


// ========================================
// SHORT SELECTOR
// ========================================

function $(id) {

    return document.getElementById(id);

}


// ========================================
// ESCAPE HTML
// ========================================

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function safeText(value) {

    return escapeHTML(value);

}


// ========================================
// DATE
// ========================================

function formatDate(value) {

    if (!value) {
        return "-";
    }

    try {

        return new Intl.DateTimeFormat(
            "id-ID",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        ).format(
            new Date(value)
        );

    } catch {

        return value;

    }

}


function formatDateInput(value) {

    if (!value) {
        return "";
    }

    return String(value).substring(0, 10);

}


// ========================================
// PHONE
// ========================================

function normalizePhone(phone) {

    if (!phone) {
        return "";
    }

    let value =
        String(phone)
            .replace(/\D/g, "");


    if (
        value.startsWith("0")
    ) {
        value =
            "62" +
            value.substring(1);
    }


    return value;

}


function whatsappLink(phone) {

    const number =
        normalizePhone(phone);

    if (!number) {
        return "#";
    }

    return `https://wa.me/${number}`;

}


// ========================================
// STATUS
// ========================================

function normalizeLeadStatus(status) {

    if (!status) {
        return "New";
    }

    const value =
        String(status)
            .trim()
            .toLowerCase();


    const map = {

        "new": "New",
        "belum dihubungi": "New",

        "flyer sent": "Flyer Sent",
        "flyer": "Flyer Sent",

        "interested": "Interested",
        "tertarik": "Interested",

        "follow up": "Follow Up",
        "follow-up": "Follow Up",

        "closing": "Closing",

        "not interested": "Not Interested",
        "tidak tertarik": "Not Interested"

    };


    return (
        map[value] ||
        status
    );

}


// ========================================
// TOAST
// ========================================

function showToast(
    message,
    type = "success"
) {

    let toast =
        document.querySelector(
            ".crm-toast"
        );


    if (!toast) {

        toast =
            document.createElement("div");

        toast.className =
            "crm-toast";

        document.body.appendChild(
            toast
        );

    }


    toast.className =
        `crm-toast ${type}`;


    toast.innerHTML = `
        <i class="${
            type === "error"
            ? "fa-solid fa-circle-exclamation"
            : "fa-solid fa-circle-check"
        }"></i>

        <span>
            ${escapeHTML(message)}
        </span>
    `;


    requestAnimationFrame(() => {

        toast.classList.add("show");

    });


    clearTimeout(
        toast._timer
    );


    toast._timer =
        setTimeout(() => {

            toast.classList.remove(
                "show"
            );

        }, 3000);

}


// ========================================
// GLOBAL LOADING
// ========================================

function setGlobalLoading(
    active,
    message = "Loading..."
) {

    const loading =
        $("globalLoading");

    if (!loading) {
        return;
    }


    const text =
        loading.querySelector(
            ".loading-text"
        );


    if (text) {
        text.textContent =
            message;
    }


    if (active) {

        loading.classList.add(
            "active"
        );

        loading.style.display =
            "flex";

    } else {

        loading.classList.remove(
            "active"
        );

        loading.style.display =
            "none";

    }

}


function showGlobalLoading(message) {

    setGlobalLoading(
        true,
        message
    );

}


function hideGlobalLoading() {

    setGlobalLoading(
        false
    );

}


// ========================================
// BUTTON LOADING
// ========================================

function setButtonLoading(
    button,
    loading
) {

    if (!button) {
        return;
    }


    if (loading) {

        if (
            !button.dataset.originalHTML
        ) {

            button.dataset.originalHTML =
                button.innerHTML;

        }

        button.disabled = true;

        button.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Please wait...
        `;

    } else {

        button.disabled = false;

        if (
            button.dataset.originalHTML
        ) {

            button.innerHTML =
                button.dataset.originalHTML;

        }

    }

}


// ========================================
// FORM MESSAGE
// ========================================

function showFormMessage(
    element,
    message,
    type = "error"
) {

    if (!element) {
        return;
    }

    element.textContent =
        message;

    element.className =
        `form-message ${type}`;

}


// ========================================
// SALES NAME
// ========================================

function getSalesName(id) {

    if (!id) {
        return "-";
    }


    const sales =
        Array.isArray(
            salesUsersData
        )
            ? salesUsersData.find(
                (item) =>
                    String(item.id) ===
                    String(id)
            )
            : null;


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
// STATUS COUNT
// ========================================

function countStatus(
    data,
    status
) {

    if (!Array.isArray(data)) {
        return 0;
    }

    return data.filter(
        (item) =>
            normalizeLeadStatus(
                item.status
            ) === status
    ).length;

}


// ========================================
// DEBOUNCE
// ========================================

function debounce(
    callback,
    delay = 400
) {

    let timer;

    return function (...args) {

        clearTimeout(timer);

        timer =
            setTimeout(
                () => callback.apply(
                    this,
                    args
                ),
                delay
            );

    };

}


// ========================================
// EXPORT CSV
// ========================================

function exportCSV(
    rows,
    filename = "leads.csv"
) {

    if (
        !Array.isArray(rows) ||
        !rows.length
    ) {

        showToast(
            "Tidak ada data untuk diexport.",
            "error"
        );

        return;

    }


    const headers =
        Object.keys(rows[0]);


    const csv = [

        headers.join(","),

        ...rows.map((row) => {

            return headers
                .map((header) => {

                    const value =
                        row[header] ??
                        "";

                    return `"${String(value)
                        .replace(/"/g, '""')}"`;

                })
                .join(",");

        })

    ].join("\n");


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


    link.href = url;
    link.download = filename;

    document.body.appendChild(
        link
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

}
