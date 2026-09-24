```javascript
// DATE / TIME HELPERS
// ========================================================
function leadParseDate(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    if (
        value instanceof Date
    ) {
        const clonedDate =
            new Date(
                value.getTime()
            );

        if (
            Number.isNaN(
                clonedDate.getTime()
            )
        ) {
            return null;
        }

        return clonedDate;
    }

    if (
        typeof value === "number"
    ) {
        const numericDate =
            new Date(
                value
            );

        if (
            Number.isNaN(
                numericDate.getTime()
            )
        ) {
            return null;
        }

        return numericDate;
    }

    const stringValue =
        String(
            value
        ).trim();

    if (!stringValue) {
        return null;
    }

    // ----------------------------------------------------
    // DATE ONLY
    // Supaya 2026-09-22 tidak berubah menjadi
    // tanggal 21 karena timezone UTC.
    // ----------------------------------------------------
    const dateOnlyMatch =
        stringValue.match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );

    if (dateOnlyMatch) {
        const year =
            Number(
                dateOnlyMatch[1]
            );

        const month =
            Number(
                dateOnlyMatch[2]
            ) - 1;

        const day =
            Number(
                dateOnlyMatch[3]
            );

        const localDate =
            new Date(
                year,
                month,
                day
            );

        if (
            Number.isNaN(
                localDate.getTime()
            )
        ) {
            return null;
        }

        return localDate;
    }

    const date =
        new Date(
            stringValue
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return null;
    }

    return date;
}


function leadFormatDateTime(value) {
    const date =
        leadParseDate(
            value
        );

    if (!date) {
        return "-";
    }

    try {
        return new Intl.DateTimeFormat(
            "id-ID",
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        ).format(date);
    } catch (error) {
        return date.toLocaleString(
            "id-ID"
        );
    }
}


function leadFormatDateOnly(value) {
    const date =
        leadParseDate(
            value
        );

    if (!date) {
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
        ).format(date);
    } catch (error) {
        return date.toLocaleDateString(
            "id-ID"
        );
    }
}


function leadGetAgeInDays(value) {
    const createdDate =
        leadParseDate(
            value
        );

    if (!createdDate) {
        return null;
    }

    const now =
        new Date();

    const start =
        new Date(
            createdDate.getFullYear(),
            createdDate.getMonth(),
            createdDate.getDate()
        );

    const end =
        new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        );

    const difference =
        end.getTime() -
        start.getTime();

    return Math.max(
        0,
        Math.floor(
            difference /
            86400000
        )
    );
}


function leadGetAgeLabel(value) {
    const age =
        leadGetAgeInDays(
            value
        );

    if (age === null) {
        return "-";
    }

    if (age === 0) {
        return "0 hari";
    }

    if (age === 1) {
        return "1 hari";
    }

    return `${age} hari`;
}


function leadGetAgeClass(value) {
    const age =
        leadGetAgeInDays(
            value
        );

    if (age === null) {
        return "";
    }

    if (age >= 60) {
        return "lead-age-critical";
    }

    if (age >= 30) {
        return "lead-age-warning";
    }

    if (age >= 14) {
        return "lead-age-aging";
    }

    return "lead-age-new";
}


// ========================================================
// LAST UPDATE
// ========================================================
function leadGetRelativeTime(value) {
    const date =
        leadParseDate(
            value
        );

    if (!date) {
        return "-";
    }

    const now =
        new Date();

    const difference =
        now.getTime() -
        date.getTime();

    if (difference < 0) {
        return "Baru";
    }

    const minutes =
        Math.floor(
            difference /
            60000
        );

    const hours =
        Math.floor(
            difference /
            3600000
        );

    const days =
        Math.floor(
            difference /
            86400000
        );

    if (minutes < 1) {
        return "Baru saja";
    }

    if (minutes < 60) {
        return `${minutes} menit lalu`;
    }

    if (hours < 24) {
        return `${hours} jam lalu`;
    }

    if (days === 1) {
        return "1 hari lalu";
    }

    return `${days} hari lalu`;
}


function leadFormatLastUpdate(value) {
    const date =
        leadParseDate(
            value
        );

    if (!date) {
        return "-";
    }

    const exactDate =
        leadFormatDateTime(
            value
        );

    const relativeTime =
        leadGetRelativeTime(
            value
        );

    return `
        <div class="lead-last-update">
            <div class="lead-last-update-date">
                ${exactDate}
            </div>
            <div class="lead-last-update-relative">
                ${relativeTime}
            </div>
        </div>
    `;
}


// ========================================================
```
