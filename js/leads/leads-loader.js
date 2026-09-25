```js
// LOAD LEADS
// ========================================================
async function loadLeads(
    page = 1
) {
    const client =
        leadGetSupabase();

    if (!client) {
        console.error(
            "FSI CRM: Supabase client is not ready."
        );
        renderLeadsErrorState(
            "Supabase belum terhubung."
        );
        updatePagination();
        return;
    }

    if (!leadGetProfile()) {
        console.warn(
            "FSI CRM: Cannot load leads - profile is not ready."
        );
        renderLeadsErrorState(
            "Profile user belum siap. Silakan tunggu sebentar."
        );
        updatePagination();
        return;
    }

    if (leadsLoading) {
        return;
    }

    leadsLoading =
        true;

    const requestId =
        ++activeRequestId;

    leadSetCurrentPage(
        page
    );

    const pageNumber =
        leadGetCurrentPage();

    showLeadsLoading();

    try {

        if (
            (
                !Array.isArray(
                    window.salesUsersData
                ) ||
                window.salesUsersData.length === 0
            ) &&
            typeof window.loadSalesLookup ===
            "function"
        ) {
            try {
                await window.loadSalesLookup();
            } catch (error) {
                console.warn(
                    "FSI CRM: unable to load Sales lookup:",
                    error
                );
            }
        }

        const businessFilter =
            leadElement(
                "filter-business",
                "businessFilter"
            );

        if (
            businessFilter &&
            businessFilter.options.length <= 1
        ) {
            await loadFilterOptions();
        }

        applySelectedSalesFilter();

        const filters =
            getLeadFilters();

        window.currentSearch =
            filters.search;

        window.currentStatusFilter =
            filters.status;

        window.currentBusinessFilter =
            filters.business;

        window.currentLocationFilter =
            "";

        window.currentSalesFilter =
            filters.salesFilter;

        let query =
            client
                .from("leads")
                .select(
                    "*",
                    {
                        count:
                            "exact"
                    }
                );

        // ------------------------------------------------
        // SEARCH
        // ------------------------------------------------

        query =
            buildSearchQuery(
                query,
                filters.search
            );

        // ------------------------------------------------
        // STATUS FILTER
        // ------------------------------------------------

        if (
            filters.status
        ) {
            query =
                query.eq(
                    "status",
                    filters.status
                );
        }

        // ------------------------------------------------
        // BUSINESS FILTER
        // ------------------------------------------------

        if (
            filters.business
        ) {
            query =
                query.eq(
                    "business",
                    filters.business
                );
        }

        // ------------------------------------------------
        // ADMIN
        // ------------------------------------------------

        if (
            leadIsAdmin()
        ) {
            if (
                filters.salesFilter
            ) {
                query =
                    query.eq(
                        "sales_id",
                        filters.salesFilter
                    );
            }
        }

        // ------------------------------------------------
        // SALES
        // ------------------------------------------------

        else if (
            leadIsSales()
        ) {
            const profile =
                leadGetProfile();

            if (
                profile?.id
            ) {
                query =
                    query.eq(
                        "sales_id",
                        profile.id
                    );
            }
        }

        const pageSize =
            leadGetPageSize();

        const from =
            (
                pageNumber - 1
            ) *
            pageSize;

        const to =
            from +
            pageSize -
            1;

        query =
            query
                .order(
                    "customer_name",
                    {
                        ascending:
                            true,
                        nullsFirst:
                            false
                    }
                )
                .range(
                    from,
                    to
                );

        const {
            data,
            error,
            count
        } =
            await query;

        if (
            requestId !==
            activeRequestId
        ) {
            return;
        }

        if (
            error
        ) {
            console.error(
                "FSI CRM: load leads error:",
                error
            );

            window.leadsData =
                [];

            window.totalLeadsCount =
                0;

            renderLeadsErrorState(
                typeof window.getSupabaseErrorMessage ===
                "function"
                    ? window.getSupabaseErrorMessage(
                        error,
                        "Failed to load leads."
                    )
                    : (
                        error?.message ||
                        "Failed to load leads."
                    )
            );

            updatePagination();

            showLeadError(
                error,
                "Failed to load leads."
            );

            return;
        }

        const leads =
            Array.isArray(data)
                ? data
                : [];

        const totalCount =
            Number.isFinite(
                Number(count)
            )
                ? Number(count)
                : 0;

        window.leadsData =
            leads;

        window.totalLeadsCount =
            Math.max(
                0,
                totalCount
            );

        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    (
                        Number(
                            window.totalLeadsCount
                        ) || 0
                    ) /
                    pageSize
                )
            );

        if (
            pageNumber >
            totalPages
        ) {
            leadSetCurrentPage(
                totalPages
            );

            leadsLoading =
                false;

            await loadLeads(
                totalPages
            );

            return;
        }

        if (
            leads.length === 0
        ) {
            renderEmptyLeadsState();
            updatePagination();
            updateLeadsContext();
            return;
        }

        renderLeads(
            leads
        );

        updatePagination();

        updateLeadsContext();

    } catch (error) {

        console.error(
            "FSI CRM: loadLeads error:",
            error
        );

        window.leadsData =
            [];

        window.totalLeadsCount =
            0;

        renderLeadsErrorState(
            typeof window.getSupabaseErrorMessage ===
            "function"
                ? window.getSupabaseErrorMessage(
                    error,
                    "An error occurred while loading leads."
                )
                : (
                    error?.message ||
                    "An error occurred while loading leads."
                )
        );

        updatePagination();

        showLeadError(
            error,
            "An error occurred while loading leads."
        );

    } finally {

        leadsLoading =
            false;

        if (
            typeof window.refreshIcons ===
            "function"
        ) {
            window.refreshIcons();
        }
    }
}


// ========================================================
// LEADS CONTEXT
// ========================================================

function updateLeadsContext() {

    const selectedSalesId =
        getSelectedSalesId();

    const selectedSalesName =
        getSelectedSalesName();

    const contextElements = [

        leadElement(
            "selected-sales-label"
        ),

        leadElement(
            "leads-selected-sales"
        ),

        leadElement(
            "active-sales-filter"
        )

    ].filter(Boolean);

    contextElements.forEach(
        element => {

            if (
                selectedSalesId
            ) {

                element.textContent =
                    selectedSalesName
                        ? `Sales: ${selectedSalesName}`
                        : "Sales terpilih";

                element.classList.add(
                    "active"
                );

            } else {

                element.textContent =
                    "Semua Sales";

                element.classList.remove(
                    "active"
                );
            }
        }
    );
}


// ========================================================
// ERROR MESSAGE
// ========================================================

function showLeadError(
    error,
    fallback
) {

    const message =
        typeof window.getSupabaseErrorMessage ===
        "function"
            ? window.getSupabaseErrorMessage(
                error,
                fallback
            )
            : (
                error?.message ||
                fallback
            );

    if (
        typeof window.showToast ===
        "function"
    ) {

        window.showToast(
            message,
            "error"
        );

    } else {

        console.error(
            message
        );
    }
}


// ========================================================
```
