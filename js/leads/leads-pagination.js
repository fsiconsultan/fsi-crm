// PAGINATION
// ========================================================

function updatePagination() {
    const paginationInfo =
        leadElement(
            "leads-pagination-info",
            "paginationInfo"
        );

    const pageIndicator =
        leadElement(
            "pageIndicator"
        );

    const prevBtn =
        leadElement(
            "btn-prev-page",
            "prevBtn"
        );

    const nextBtn =
        leadElement(
            "btn-next-page",
            "nextBtn"
        );

    const pageSize =
        leadGetPageSize();

    const totalLeads =
        Number(
            window.totalLeadsCount
        ) || 0;

    const currentPage =
        leadGetCurrentPage();

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                totalLeads /
                pageSize
            )
        );

    const start =
        totalLeads === 0
            ? 0
            : (
                (
                    currentPage - 1
                ) *
                pageSize
            ) + 1;

    const end =
        Math.min(
            currentPage *
            pageSize,
            totalLeads
        );

    // INFO
    if (paginationInfo) {
        paginationInfo.textContent =
            totalLeads === 0
                ? "0 leads"
                : `${start}-${end} of ${totalLeads} leads`;
    }

    // PAGE INDICATOR
    if (pageIndicator) {
        pageIndicator.textContent =
            `Page ${currentPage} / ${totalPages}`;
    }

    // PREVIOUS
    if (prevBtn) {
        const disabled =
            totalLeads === 0 ||
            currentPage <= 1;

        prevBtn.disabled =
            disabled;

        prevBtn.setAttribute(
            "aria-disabled",
            String(disabled)
        );
    }

    // NEXT
    if (nextBtn) {
        const disabled =
            totalLeads === 0 ||
            currentPage >= totalPages;

        nextBtn.disabled =
            disabled;

        nextBtn.setAttribute(
            "aria-disabled",
            String(disabled)
        );
    }

    // SECOND PAGE INFO
    const pageInfo =
        leadElement(
            "pagination-page-info"
        );

    if (pageInfo) {
        pageInfo.textContent =
            totalLeads === 0
                ? "Page 1 / 1"
                : `Page ${currentPage} / ${totalPages}`;
    }

    window.totalPages =
        totalPages;
}


// ========================================================
// CHANGE PAGE
// ========================================================

function changePage(
    direction
) {
    const numericDirection =
        Number(direction);

    if (
        !Number.isFinite(
            numericDirection
        )
    ) {
        return;
    }

    if (leadsLoading) {
        return;
    }

    const pageSize =
        leadGetPageSize();

    const totalLeads =
        Number(
            window.totalLeadsCount
        ) || 0;

    if (totalLeads <= 0) {
        return;
    }

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                totalLeads /
                pageSize
            )
        );

    const currentPage =
        leadGetCurrentPage();

    const newPage =
        currentPage +
        numericDirection;

    if (
        newPage < 1 ||
        newPage > totalPages
    ) {
        return;
    }

    loadLeads(
        newPage
    );
}


// ========================================================
// NEXT / PREVIOUS
// ========================================================

function nextLeadPage() {
    changePage(1);
}

function previousLeadPage() {
    changePage(-1);
}


// ========================================================
// BIND PAGINATION BUTTONS
// ========================================================

function bindPaginationEvents() {

    const prevBtn =
        leadElement(
            "btn-prev-page",
            "prevBtn"
        );

    const nextBtn =
        leadElement(
            "btn-next-page",
            "nextBtn"
        );

    if (prevBtn) {

        // Hindari event listener dobel
        if (
            prevBtn.dataset.paginationBound !== "true"
        ) {

            prevBtn.addEventListener(
                "click",
                function () {
                    previousLeadPage();
                }
            );

            prevBtn.dataset.paginationBound =
                "true";
        }
    }

    if (nextBtn) {

        // Hindari event listener dobel
        if (
            nextBtn.dataset.paginationBound !== "true"
        ) {

            nextBtn.addEventListener(
                "click",
                function () {
                    nextLeadPage();
                }
            );

            nextBtn.dataset.paginationBound =
                "true";
        }
    }
}


// ========================================================
// GLOBAL FUNCTIONS
// ========================================================

window.updatePagination =
    updatePagination;

window.changePage =
    changePage;

window.nextLeadPage =
    nextLeadPage;

window.previousLeadPage =
    previousLeadPage;

window.bindPaginationEvents =
    bindPaginationEvents;


// ========================================================
// AUTO BIND
// ========================================================

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        function () {
            bindPaginationEvents();
            updatePagination();
        }
    );

} else {

    bindPaginationEvents();
    updatePagination();
}
