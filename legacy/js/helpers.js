// ============================================================
// FSI CRM - HELPER FUNCTIONS & UTILITIES
// File: js/helpers.js
// ============================================================

"use strict";


// ============================================================
// GLOBAL CRM HELPER NAMESPACE
// ============================================================

window.FSIHelpers = window.FSIHelpers || {};


// ============================================================
// DOM HELPERS
// ============================================================

function getElement(id) {
    if (!id) return null;

    return document.getElementById(id);
}


function setText(id, value) {
    const element = getElement(id);

    if (!element) return;

    element.textContent =
        value === null || value === undefined
            ? ""
            : String(value);
}


function setValue(id, value) {
    const element = getElement(id);

    if (!element) return;

    element.value =
        value === null || value === undefined
            ? ""
            : value;
}


function getValue(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "";
    }

    return String(value);
}


function getInputValue(id) {
    const element = getElement(id);

    if (!element) return "";

    return element.value === null ||
        element.value === undefined
        ? ""
        : String(element.value).trim();
}


function showElement(id) {
    const element = getElement(id);

    if (!element) return;

    element.classList.remove("hidden");

    element.style.display = "";
}


function hideElement(id) {
    const element = getElement(id);

    if (!element) return;

    element.classList.add("hidden");

    element.style.display = "none";
}


function toggleElement(id, show) {
    if (show) {
        showElement(id);
    } else {
        hideElement(id);
    }
}


// ============================================================
// HTML ESCAPE
// ============================================================

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


// ============================================================
// DATE HELPERS
// ============================================================

function formatDate(date) {

    if (!date) {
        return "-";
    }

    try {

        const raw = String(date);

        const d =
            /^\d{4}-\d{2}-\d{2}$/.test(raw)
                ? new Date(raw + "T00:00:00")
                : new Date(raw);

        if (isNaN(d.getTime())) {
            return escapeHTML(raw);
        }

        return d.toLocaleDateString(
            "en-GB",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        );

    } catch {

        return escapeHTML(date);
    }
}


function formatDateID(date) {

    if (!date) {
        return "-";
    }

    try {

        const raw = String(date);

        const d =
            /^\d{4}-\d{2}-\d{2}$/.test(raw)
                ? new Date(raw + "T00:00:00")
                : new Date(raw);

        if (isNaN(d.getTime())) {
            return escapeHTML(raw);
        }

        return d.toLocaleDateString(
            "id-ID",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        );

    } catch {

        return escapeHTML(date);
    }
}


function formatDateLong(date) {

    if (!date) {
        return "-";
    }

    try {

        const raw = String(date);

        const d =
            /^\d{4}-\d{2}-\d{2}$/.test(raw)
                ? new Date(raw + "T00:00:00")
                : new Date(raw);

        if (isNaN(d.getTime())) {
            return escapeHTML(raw);
        }

        return d.toLocaleDateString(
            "en-US",
            {
                day: "2-digit",
                month: "long",
                year: "numeric"
            }
        );

    } catch {

        return escapeHTML(date);
    }
}


function formatDateTime(date) {

    if (!date) {
        return "-";
    }

    try {

        const d = new Date(date);

        if (isNaN(d.getTime())) {
            return escapeHTML(date);
        }

        return d.toLocaleString(
            "id-ID",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    } catch {

        return escapeHTML(date);
    }
}


function formatRelativeDate(date) {

    if (!date) {
        return "-";
    }

    try {

        const d = new Date(date);

        if (isNaN(d.getTime())) {
            return "-";
        }

        const now = new Date();

        const diff =
            d.getTime() -
            now.getTime();

        const day =
            24 * 60 * 60 * 1000;

        const days =
            Math.round(diff / day);

        if (days === 0) {
            return "Today";
        }

        if (days === 1) {
            return "Tomorrow";
        }

        if (days === -1) {
            return "Yesterday";
        }

        if (days > 1 && days <= 7) {
            return `In ${days} days`;
        }

        if (days < -1 && days >= -7) {
            return `${Math.abs(days)} days ago`;
        }

        return formatDate(date);

    } catch {

        return formatDate(date);
    }
}


// ============================================================
// PHONE / WHATSAPP HELPERS
// ============================================================

function normalizePhone(phone) {

    if (!phone) {
        return "";
    }

    let number =
        String(phone)
            .replace(/\D/g, "");

    if (!number) {
        return "";
    }

    // Indonesia
    if (number.startsWith("0")) {

        number =
            "62" +
            number.substring(1);

    } else if (
        number.startsWith("8")
    ) {

        number =
            "62" +
            number;
    }

    return number;
}


function formatPhone(phone) {

    if (!phone) {
        return "-";
    }

    return String(phone).trim();
}


function whatsappLink(phone) {

    const number =
        normalizePhone(phone);

    if (!number) {
        return "#";
    }

    return `https://wa.me/${number}`;
}


function openWhatsApp(phone, message = "") {

    const number =
        normalizePhone(phone);

    if (!number) {

        showToast(
            "Nomor WhatsApp tidak tersedia.",
            "warning"
        );

        return;
    }

    let url =
        `https://wa.me/${number}`;

    if (message) {

        url +=
            `?text=${encodeURIComponent(message)}`;
    }

    window.open(
        url,
        "_blank",
        "noopener,noreferrer"
    );
}


// ============================================================
// STATUS HELPERS
// ============================================================

function normalizeLeadStatus(status) {

    if (!status) {
        return "New";
    }

    const value =
        String(status)
            .trim()
            .toLowerCase();

    const map = {

        "new":
            "New",

        "baru":
            "New",

        "belum dihubungi":
            "New",

        "belum di hubungi":
            "New",

        "flyer sent":
            "Flyer Sent",

        "flyer":
            "Flyer Sent",

        "tertarik":
            "Interested",

        "interested":
            "Interested",

        "follow up":
            "Follow Up",

        "follow-up":
            "Follow Up",

        "followup":
            "Follow Up",

        "appointment":
            "Appointment",

        "janji":
            "Appointment",

        "site survey":
            "Site Survey",

        "site-survey":
            "Site Survey",

        "survey":
            "Site Survey",

        "quotation":
            "Quotation",

        "quote":
            "Quotation",

        "penawaran":
            "Quotation",

        "spk":
            "SPK",

        "closing":
            "Closing",

        "closed":
            "Closing",

        "tidak tertarik":
            "Not Interested",

        "not interested":
            "Not Interested",

        "not-interest":
            "Not Interested"
    };

    return map[value] || status;
}


function statusClass(status) {

    const normalized =
        normalizeLeadStatus(status);

    return (
        "status-" +
        String(normalized)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
    );
}


function getStatusClass(status) {
    return statusClass(status);
}


function getStatusLabel(status) {
    return normalizeLeadStatus(status);
}


function getStatusBadge(status) {

    const normalized =
        normalizeLeadStatus(status);

    const className =
        statusClass(normalized);

    return `
        <span class="status-badge ${className}">
            ${escapeHTML(normalized)}
        </span>
    `;
}


// ============================================================
// STATUS COUNT HELPERS
// ============================================================

function countNormalizedStatus(
    data,
    status
) {

    if (!Array.isArray(data)) {
        return 0;
    }

    const target =
        normalizeLeadStatus(status);

    return data.filter(
        item =>
            normalizeLeadStatus(
                item?.status
            ) === target
    ).length;
}


function countStatus(
    data,
    status
) {

    return countNormalizedStatus(
        data,
        status
    );
}


function countDateField(
    data,
    field
) {

    if (!Array.isArray(data)) {
        return 0;
    }

    if (!field) {
        return 0;
    }

    return data.filter(
        item =>
            item &&
            item[field] !== null &&
            item[field] !== undefined &&
            item[field] !== ""
    ).length;
}


function countClosing(data) {

    if (!Array.isArray(data)) {
        return 0;
    }

    return data.filter(
        item =>
            normalizeLeadStatus(
                item?.status
            ) === "Closing" ||
            (
                item?.closing !== null &&
                item?.closing !== undefined &&
                item?.closing !== ""
            )
    ).length;
}


// ============================================================
// CUSTOMER HELPERS
// ============================================================

function getCustomerName(customer) {

    if (!customer) {
        return "Customer";
    }

    return (
        customer.customer_name ||
        customer.name ||
        customer.full_name ||
        "Customer"
    );
}


function getCustomerPhone(customer) {

    if (!customer) {
        return "";
    }

    return (
        customer.phone ||
        customer.whatsapp ||
        ""
    );
}


function getCustomerLocation(customer) {

    if (!customer) {
        return "";
    }

    return (
        customer.location ||
        customer.address ||
        ""
    );
}


function getCustomerBusiness(customer) {

    if (!customer) {
        return "";
    }

    return (
        customer.business ||
        customer.company ||
        ""
    );
}


function getCustomerEmail(customer) {

    if (!customer) {
        return "";
    }

    return customer.email || "";
}


// ============================================================
// SALES HELPERS
// ============================================================

function getSalesName(sales) {

    if (!sales) {
        return "Unassigned";
    }

    return (
        sales.name ||
        sales.full_name ||
        sales.username ||
        sales.email ||
        "Sales"
    );
}


function isAdminRole(profile) {

    if (!profile) {
        return false;
    }

    const role =
        String(profile.role || "")
            .trim()
            .toLowerCase();

    return (
        role === "admin" ||
        role === "owner" ||
        role === "administrator"
    );
}


// ============================================================
// SALES-LIKE ROLE HELPERS
// ============================================================

/*
 * Sales-like operational roles
 *
 * These roles share the same operational Lead workflow:
 *
 * - Sales
 * - Secretary
 * - Digital Marketing
 *
 * IMPORTANT:
 * This does NOT give Admin permission.
 * Admin / Owner / Administrator remain separate.
 */

function isSalesRole(profile) {

    if (!profile) {
        return false;
    }

    const role =
        String(profile.role || "")
            .trim()
            .toLowerCase();

    return (
        role === "sales" ||
        role === "salesperson" ||
        role === "secretary" ||
        role === "digital_marketing"
    );
}


// ============================================================
// PIPELINE HELPERS
// ============================================================

function getNextStep(customer) {

    if (!customer) {
        return "Contact customer";
    }

    if (customer.closing) {
        return "Closing completed";
    }

    if (customer.spk) {
        return "SPK process";
    }

    if (customer.quotation) {
        return "Follow up quotation";
    }

    if (customer.site_survey) {
        return "Prepare quotation";
    }

    if (customer.appointment) {
        return "Prepare site survey";
    }

    if (customer.follow_up_date) {
        return "Follow up customer";
    }

    const status =
        normalizeLeadStatus(
            customer.status
        );

    switch (status) {

        case "New":
            return "Contact customer";

        case "Flyer Sent":
            return "Follow up flyer";

        case "Interested":
            return "Schedule appointment";

        case "Follow Up":
            return "Follow up customer";

        case "Appointment":
            return "Prepare appointment";

        case "Site Survey":
            return "Prepare quotation";

        case "Quotation":
            return "Follow up quotation";

        case "SPK":
            return "Process SPK";

        case "Closing":
            return "Closing completed";

        case "Not Interested":
            return "No further action";

        default:
            return "Contact customer";
    }
}


// ============================================================
// NUMBER / CURRENCY HELPERS
// ============================================================

function formatNumber(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "0";
    }

    const number =
        Number(value);

    if (isNaN(number)) {
        return String(value);
    }

    return number.toLocaleString(
        "id-ID"
    );
}


function formatRupiah(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "Rp 0";
    }

    const number =
        Number(value);

    if (isNaN(number)) {
        return "Rp 0";
    }

    return (
        "Rp " +
        number.toLocaleString(
            "id-ID"
        )
    );
}


// ============================================================
// MODAL HELPERS
// ============================================================

function openModal(id) {

    const modal =
        getElement(id);

    if (!modal) {
        return;
    }

    modal.classList.add("active");

    modal.classList.remove("hidden");

    modal.style.display = "";

    document.body.classList.add(
        "modal-open"
    );
}


function closeModal(id) {

    const modal =
        getElement(id);

    if (!modal) {
        return;
    }

    modal.classList.remove("active");

    modal.classList.add("hidden");

    modal.style.display = "none";

    document.body.classList.remove(
        "modal-open"
    );
}


function setupModalEvents() {

    const modalIds = [
        "leadModal",
        "salesModal",
        "customerModal",
        "modalLead",
        "modalSales"
    ];

    modalIds.forEach(
        id => {

            const modal =
                getElement(id);

            if (!modal) {
                return;
            }

            if (
                modal.dataset
                    .modalBound === "true"
            ) {
                return;
            }

            modal.dataset.modalBound =
                "true";

            modal.addEventListener(
                "click",
                function (event) {

                    if (
                        event.target ===
                        modal
                    ) {

                        const closeFunction =
                            window[
                                "close" +
                                id
                                    .replace(
                                        "Modal",
                                        ""
                                    ) +
                                "Modal"
                            ];

                        if (
                            typeof closeFunction ===
                            "function"
                        ) {
                            closeFunction();
                        } else {
                            closeModal(id);
                        }
                    }
                }
            );
        }
    );
}


// ============================================================
// STATUS SELECT OPTIONS
// ============================================================

function getLeadStatuses() {

    if (
        Array.isArray(
            window.FSI_CRM?.LEAD_STATUSES
        )
    ) {

        return [
            ...window.FSI_CRM.LEAD_STATUSES
        ];
    }

    if (
        typeof LEAD_STATUSES !==
        "undefined" &&
        Array.isArray(
            LEAD_STATUSES
        )
    ) {

        return [
            ...LEAD_STATUSES
        ];
    }

    return [
        "New",
        "Flyer Sent",
        "Interested",
        "Follow Up",
        "Appointment",
        "Site Survey",
        "Quotation",
        "Closing",
        "Not Interested"
    ];
}


function setupEnglishStatusOptions() {

    const statusFilter =
        getElement("statusFilter");

    const leadStatus =
        getElement("leadStatus");

    const crmEditStatus =
        getElement("crmEditStatus");


    const statuses =
        getLeadStatuses();


    // --------------------------------------------------------
    // STATUS FILTER
    // --------------------------------------------------------

    if (statusFilter) {

        const currentValue =
            statusFilter.value;

        statusFilter.innerHTML = "";

        const allOption =
            document.createElement(
                "option"
            );

        allOption.value = "";

        allOption.textContent =
            "All Status";

        statusFilter.appendChild(
            allOption
        );


        statuses.forEach(
            status => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    status;

                option.textContent =
                    status;

                statusFilter.appendChild(
                    option
                );
            }
        );


        if (
            currentValue &&
            statuses.includes(
                currentValue
            )
        ) {

            statusFilter.value =
                currentValue;
        }
    }


    // --------------------------------------------------------
    // LEAD STATUS
    // --------------------------------------------------------

    if (leadStatus) {

        const currentValue =
            leadStatus.value;

        leadStatus.innerHTML = "";

        statuses.forEach(
            status => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    status;

                option.textContent =
                    status;

                leadStatus.appendChild(
                    option
                );
            }
        );


        if (
            currentValue &&
            statuses.includes(
                currentValue
            )
        ) {

            leadStatus.value =
                currentValue;
        }
    }


    // --------------------------------------------------------
    // CUSTOMER EDIT STATUS
    // --------------------------------------------------------

    if (crmEditStatus) {

        const currentValue =
            crmEditStatus.value;

        crmEditStatus.innerHTML = "";

        statuses.forEach(
            status => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    status;

                option.textContent =
                    status;

                crmEditStatus.appendChild(
                    option
                );
            }
        );


        if (
            currentValue &&
            statuses.includes(
                currentValue
            )
        ) {

            crmEditStatus.value =
                currentValue;
        }
    }
}


// ============================================================
// DEBOUNCE
// ============================================================

function debounce(
    callback,
    delay = 400
) {

    let timeout = null;

    return function (...args) {

        clearTimeout(timeout);

        timeout =
            setTimeout(
                () => {
                    callback.apply(
                        this,
                        args
                    );
                },
                delay
            );
    };
}


// ============================================================
// THROTTLE
// ============================================================

function throttle(
    callback,
    delay = 300
) {

    let waiting = false;

    return function (...args) {

        if (waiting) {
            return;
        }

        callback.apply(
            this,
            args
        );

        waiting = true;

        setTimeout(
            () => {
                waiting = false;
            },
            delay
        );
    };
}


// ============================================================
// LOADING STATE
// ============================================================

function setLoading(
    elementOrId,
    loading = true,
    loadingText = "Loading..."
) {

    const element =
        typeof elementOrId === "string"
            ? getElement(elementOrId)
            : elementOrId;

    if (!element) {
        return;
    }

    if (loading) {

        if (
            !element.dataset.originalText
        ) {

            element.dataset.originalText =
                element.innerHTML;
        }

        element.disabled = true;

        element.innerHTML = `
            <span class="loading-spinner"></span>
            ${escapeHTML(loadingText)}
        `;

    } else {

        element.disabled = false;

        if (
            element.dataset.originalText
        ) {

            element.innerHTML =
                element.dataset.originalText;

            delete element.dataset.originalText;
        }

        refreshIcons();
    }
}


// ============================================================
// TOAST / NOTIFICATION
// ============================================================

function showToast(
    message,
    type = "info",
    duration = 3500
) {

    if (!message) {
        return;
    }

    let container =
        document.getElementById(
            "crmToastContainer"
        );

    if (!container) {

        container =
            document.createElement(
                "div"
            );

        container.id =
            "crmToastContainer";

        container.className =
            "toast-container";

        document.body.appendChild(
            container
        );
    }


    const toast =
        document.createElement(
            "div"
        );

    toast.className =
        `crm-toast toast-${type}`;


    const iconMap = {

        success:
            "check-circle",

        error:
            "alert-circle",

        warning:
            "alert-triangle",

        info:
            "info"
    };


    const icon =
        iconMap[type] ||
        iconMap.info;


    toast.innerHTML = `
        <div class="crm-toast-icon">
            <i data-lucide="${icon}"></i>
        </div>

        <div class="crm-toast-message">
            ${escapeHTML(message)}
        </div>

        <button
            type="button"
            class="crm-toast-close"
            aria-label="Close"
        >
            ×
        </button>
    `;


    const closeButton =
        toast.querySelector(
            ".crm-toast-close"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            () => {
                toast.remove();
            }
        );
    }


    container.appendChild(
        toast
    );


    refreshIcons();


    setTimeout(
        () => {

            if (
                toast &&
                toast.parentNode
            ) {

                toast.classList.add(
                    "toast-hide"
                );

                setTimeout(
                    () => {
                        toast.remove();
                    },
                    250
                );
            }

        },
        duration
    );
}


// ============================================================
// CONFIRMATION
// ============================================================

async function confirmAction(
    message,
    title = "Confirm Action"
) {

    return window.confirm(
        `${title}\n\n${message}`
    );
}


// ============================================================
// ICON HELPERS
// ============================================================

function refreshIcons() {

    try {

        if (
            window.lucide &&
            typeof window.lucide
                .createIcons ===
                "function"
        ) {

            window.lucide.createIcons();
        }

    } catch (error) {

        console.warn(
            "Lucide refresh error:",
            error
        );
    }
}


// ============================================================
// PAGE TITLE
// ============================================================

function setPageTitle(title) {

    if (!title) {
        return;
    }

    const ids = [
        "current-page-title",
        "page-title",
        "pageTitle"
    ];

    ids.forEach(
        id => {

            const element =
                getElement(id);

            if (element) {
                element.textContent =
                    title;
            }
        }
    );
}


// ============================================================
// TABLE EMPTY STATE
// ============================================================

function renderEmptyState(
    container,
    message = "No data found.",
    colspan = 1
) {

    if (!container) {
        return;
    }

    const target =
        typeof container === "string"
            ? getElement(container)
            : container;

    if (!target) {
        return;
    }

    target.innerHTML = `
        <tr>
            <td
                colspan="${Number(colspan) || 1}"
                class="table-empty"
            >
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i data-lucide="inbox"></i>
                    </div>

                    <div class="empty-state-title">
                        ${escapeHTML(message)}
                    </div>
                </div>
            </td>
        </tr>
    `;

    refreshIcons();
}


// ============================================================
// ERROR STATE
// ============================================================

function renderErrorState(
    container,
    message = "Failed to load data.",
    colspan = 1
) {

    const target =
        typeof container === "string"
            ? getElement(container)
            : container;

    if (!target) {
        return;
    }

    target.innerHTML = `
        <tr>
            <td
                colspan="${Number(colspan) || 1}"
                class="table-empty"
            >
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i data-lucide="alert-circle"></i>
                    </div>

                    <div class="empty-state-title">
                        ${escapeHTML(message)}
                    </div>
                </div>
            </td>
        </tr>
    `;

    refreshIcons();
}


// ============================================================
// PAGINATION HELPERS
// ============================================================

function calculatePagination(
    total,
    pageSize,
    currentPage
) {

    const safeTotal =
        Math.max(
            0,
            Number(total) || 0
        );

    const safePageSize =
        Math.max(
            1,
            Number(pageSize) || 20
        );

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                safeTotal /
                safePageSize
            )
        );

    const page =
        Math.min(
            Math.max(
                1,
                Number(currentPage) || 1
            ),
            totalPages
        );

    return {
        total: safeTotal,
        pageSize: safePageSize,
        currentPage: page,
        totalPages,
        from:
            safeTotal === 0
                ? 0
                : (page - 1) *
                  safePageSize +
                  1,
        to:
            Math.min(
                page *
                    safePageSize,
                safeTotal
            )
    };
}


// ============================================================
// ARRAY HELPERS
// ============================================================

function safeArray(value) {

    return Array.isArray(value)
        ? value
        : [];
}


function uniqueArray(
    array
) {

    if (!Array.isArray(array)) {
        return [];
    }

    return [
        ...new Set(
            array
        )
    ];
}


// ============================================================
// SUPABASE ERROR HELPER
// ============================================================

function getSupabaseErrorMessage(
    error,
    fallback = "Something went wrong."
) {

    if (!error) {
        return fallback;
    }

    return (
        error.message ||
        error.details ||
        error.hint ||
        fallback
    );
}


// ============================================================
// GLOBAL EXPORTS
// ============================================================

window.getElement = getElement;
window.setText = setText;
window.setValue = setValue;
window.getValue = getValue;
window.getInputValue = getInputValue;

window.showElement = showElement;
window.hideElement = hideElement;
window.toggleElement = toggleElement;

window.escapeHTML = escapeHTML;

window.formatDate = formatDate;
window.formatDateID = formatDateID;
window.formatDateLong = formatDateLong;
window.formatDateTime = formatDateTime;
window.formatRelativeDate = formatRelativeDate;

window.normalizePhone = normalizePhone;
window.formatPhone = formatPhone;
window.whatsappLink = whatsappLink;
window.openWhatsApp = openWhatsApp;

window.normalizeLeadStatus =
    normalizeLeadStatus;

window.statusClass =
    statusClass;

window.getStatusClass =
    getStatusClass;

window.getStatusLabel =
    getStatusLabel;

window.getStatusBadge =
    getStatusBadge;

window.countNormalizedStatus =
    countNormalizedStatus;

window.countStatus =
    countStatus;

window.countDateField =
    countDateField;

window.countClosing =
    countClosing;

window.getCustomerName =
    getCustomerName;

window.getCustomerPhone =
    getCustomerPhone;

window.getCustomerLocation =
    getCustomerLocation;

window.getCustomerBusiness =
    getCustomerBusiness;

window.getCustomerEmail =
    getCustomerEmail;

window.getSalesName =
    getSalesName;

window.isAdminRole =
    isAdminRole;

window.isSalesRole =
    isSalesRole;

window.getNextStep =
    getNextStep;

window.formatNumber =
    formatNumber;

window.formatRupiah =
    formatRupiah;

window.openModal =
    openModal;

window.closeModal =
    closeModal;

window.setupModalEvents =
    setupModalEvents;

window.getLeadStatuses =
    getLeadStatuses;

window.setupEnglishStatusOptions =
    setupEnglishStatusOptions;

window.debounce =
    debounce;

window.throttle =
    throttle;

window.setLoading =
    setLoading;

window.showToast =
    showToast;

window.confirmAction =
    confirmAction;

window.refreshIcons =
    refreshIcons;

window.setPageTitle =
    setPageTitle;

window.renderEmptyState =
    renderEmptyState;

window.renderErrorState =
    renderErrorState;

window.calculatePagination =
    calculatePagination;

window.safeArray =
    safeArray;

window.uniqueArray =
    uniqueArray;

window.getSupabaseErrorMessage =
    getSupabaseErrorMessage;


// ============================================================
// FSI HELPERS NAMESPACE
// ============================================================

Object.assign(
    window.FSIHelpers,
    {
        getElement,
        setText,
        setValue,
        getValue,
        getInputValue,

        showElement,
        hideElement,
        toggleElement,

        escapeHTML,

        formatDate,
        formatDateID,
        formatDateLong,
        formatDateTime,
        formatRelativeDate,

        normalizePhone,
        formatPhone,
        whatsappLink,
        openWhatsApp,

        normalizeLeadStatus,
        statusClass,
        getStatusClass,
        getStatusLabel,
        getStatusBadge,

        countNormalizedStatus,
        countStatus,
        countDateField,
        countClosing,

        getCustomerName,
        getCustomerPhone,
        getCustomerLocation,
        getCustomerBusiness,
        getCustomerEmail,

        getSalesName,
        isAdminRole,
        isSalesRole,

        getNextStep,

        formatNumber,
        formatRupiah,

        openModal,
        closeModal,
        setupModalEvents,

        getLeadStatuses,
        setupEnglishStatusOptions,

        debounce,
        throttle,

        setLoading,
        showToast,
        confirmAction,

        refreshIcons,
        setPageTitle,

        renderEmptyState,
        renderErrorState,

        calculatePagination,

        safeArray,
        uniqueArray,

        getSupabaseErrorMessage
    }
);


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        try {

            setupModalEvents();

            setupEnglishStatusOptions();

            refreshIcons();

            console.log(
                "FSI CRM helpers.js loaded successfully."
            );

        } catch (error) {

            console.error(
                "FSI CRM helpers initialization error:",
                error
            );
        }
    }
);
