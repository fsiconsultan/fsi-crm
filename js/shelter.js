```javascript
// ================================
// HELPER FUNCTIONS & UTILITIES
// ================================

function formatDate(date) {
    if (!date) return "-";
    try {
        const d = new Date(date + "T00:00:00");
        if (isNaN(d.getTime())) return date;
        return d.toLocaleDateString("en-US", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    } catch {
        return date;
    }
}

function formatDateTime(date) {
    if (!date) return "-";
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return date;
        return d.toLocaleDateString("en-US", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    } catch {
        return date;
    }
}

function statusClass(status) {
    if (!status) return "";
    return "status-" + String(status).toLowerCase().replace(/\s+/g, "-");
}

function escapeHTML(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getValue(value) {
    if (value === null || value === undefined || value === "") return "";
    return String(value);
}

function setValue(id, value) {
    const element = document.getElementById(id);
    if (!element) return;
    element.value = value === null || value === undefined ? "" : value;
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (!element) return;
    element.textContent = value;
}

function whatsappLink(phone) {
    const number = normalizePhone(phone);
    if (!number) return "#";
    return `https://wa.me/${number}`;
}

function normalizePhone(phone) {
    if (!phone) return "";
    let number = String(phone).replace(/\D/g, "");
    if (number.startsWith("0")) {
        number = "62" + number.substring(1);
    } else if (number.startsWith("8")) {
        number = "62" + number;
    }
    return number;
}

function normalizeLeadStatus(status) {
    if (!status) return "New";
    const value = String(status).trim().toLowerCase();
    const map = {
        "new": "New",
        "belum dihubungi": "New",
        "flyer sent": "Flyer Sent",
        "tertarik": "Interested",
        "interested": "Interested",
        "follow up": "Follow Up",
        "follow-up": "Follow Up",
        "closing": "Closing",
        "tidak tertarik": "Not Interested",
        "not interested": "Not Interested"
    };
    return map[value] || status;
}

function countNormalizedStatus(data, status) {
    return data.filter(item => normalizeLeadStatus(item.status) === status).length;
}

function countDateField(data, field) {
    return data.filter(item => 
        item[field] !== null && 
        item[field] !== undefined && 
        item[field] !== ""
    ).length;
}

function countClosing(data) {
    return data.filter(item => 
        normalizeLeadStatus(item.status) === "Closing" ||
        (item.closing !== null && item.closing !== undefined && item.closing !== "")
    ).length;
}

function countStatus(data, status) {
    return data.filter(item => 
        normalizeLeadStatus(item.status) === normalizeLeadStatus(status)
    ).length;
}

function setupModalEvents() {
    const leadModal = document.getElementById("leadModal");
    const salesModal = document.getElementById("salesModal");

    if (leadModal) {
        leadModal.addEventListener("click", function(event) {
            if (event.target === leadModal) closeLeadModal();
        });
    }
    if (salesModal) {
        salesModal.addEventListener("click", function(event) {
            if (event.target === salesModal) closeSalesModal();
        });
    }
}

function setupEnglishStatusOptions() {
    const statusFilter = document.getElementById("statusFilter");
    const leadStatus = document.getElementById("leadStatus");

    if (statusFilter) {
        statusFilter.innerHTML = "";
        const allOption = document.createElement("option");
        allOption.value = "";
        allOption.textContent = "All Status";
        statusFilter.appendChild(allOption);

        LEAD_STATUSES.forEach(status => {
            const option = document.createElement("option");
            option.value = status;
            option.textContent = status;
            statusFilter.appendChild(option);
        });
    }

    if (leadStatus) {
        leadStatus.innerHTML = "";
        LEAD_STATUSES.forEach(status => {
            const option = document.createElement("option");
            option.value = status;
            option.textContent = status;
            leadStatus.appendChild(option);
        });
    }
}
```
