// ========================================================
// DELETE LEAD
// ========================================================
//
// Permission:
//
// Admin:
// - Bisa delete semua lead
//
// Sales:
// - Bisa delete lead miliknya sendiri
//
// Secretary:
// - Bisa delete lead miliknya sendiri
//
// Digital Marketing:
// - Bisa delete lead miliknya sendiri
//
// IMPORTANT:
// - Security utama tetap Supabase RLS.
// - Frontend check hanya untuk UX dan mencegah
//   user mencoba delete lead milik user lain.
//
// ========================================================

async function deleteLead(id) {

    const customerId =
        String(
            id ?? ""
        ).trim();


    // ====================================================
    // VALIDATE ID
    // ====================================================

    if (!customerId) {

        showLeadError(
            new Error(
                "Customer ID not found."
            ),
            "Customer ID not found."
        );

        return;

    }


    // ====================================================
    // GET PROFILE
    // ====================================================

    const profile =
        window.currentProfile || null;


    if (!profile) {

        showLeadError(
            new Error(
                "User profile is not available."
            ),
            "User profile is not available."
        );

        return;

    }


    // ====================================================
    // ROLE
    // ====================================================

    const role =
        String(
            profile.role || ""
        )
            .trim()
            .toLowerCase();


    const isAdmin =
        role === "admin" ||
        role === "owner" ||
        role === "administrator";


    const canManageOwnLeads =
        role === "sales" ||
        role === "salesperson" ||
        role === "secretary" ||
        role === "digital marketing";


    // ====================================================
    // PERMISSION CHECK
    // ====================================================

    if (
        !isAdmin &&
        !canManageOwnLeads
    ) {

        showLeadError(
            new Error(
                "You do not have permission to delete leads."
            ),
            "You do not have permission to delete leads."
        );

        return;

    }


    // ====================================================
    // SUPABASE CLIENT
    // ====================================================

    const client =
        leadGetSupabase();


    if (!client) {

        showLeadError(
            new Error(
                "Supabase is not connected."
            ),
            "Supabase is not connected."
        );

        return;

    }


    try {

        // =================================================
        // LOAD LEAD FIRST
        // =================================================
        //
        // Kita perlu mengetahui sales_id lead.
        //
        // Admin:
        // - boleh semua
        //
        // Non-Admin:
        // - hanya boleh delete jika sales_id
        //   sama dengan profile.id
        //
        // =================================================

        const {
            data: lead,
            error: loadError
        } =
            await client
                .from("leads")
                .select(
                    "id, customer_name, sales_id"
                )
                .eq(
                    "id",
                    customerId
                )
                .maybeSingle();


        if (loadError) {

            console.error(
                "FSI CRM: load lead before delete error:",
                loadError
            );

            showLeadError(
                loadError,
                "Failed to load customer."
            );

            return;

        }


        if (!lead) {

            showLeadError(
                new Error(
                    "Customer not found."
                ),
                "Customer not found."
            );

            return;

        }


        // =================================================
        // OWNERSHIP CHECK
        // =================================================
        //
        // Secretary / Digital Marketing / Sales
        // hanya boleh menghapus lead sendiri.
        //
        // profile.id = sales_users.id
        //
        // =================================================

        if (
            !isAdmin &&
            canManageOwnLeads
        ) {

            const leadSalesId =
                String(
                    lead.sales_id || ""
                ).trim();


            const profileId =
                String(
                    profile.id || ""
                ).trim();


            if (!profileId) {

                showLeadError(
                    new Error(
                        "Profile ID not found."
                    ),
                    "Profile ID not found. Please logout and login again."
                );

                return;

            }


            if (
                !leadSalesId ||
                leadSalesId !== profileId
            ) {

                console.warn(
                    "FSI CRM: delete blocked - lead does not belong to current user.",
                    {
                        leadId:
                            customerId,

                        leadSalesId:
                            leadSalesId,

                        profileId:
                            profileId,

                        role:
                            profile.role
                    }
                );


                showLeadError(
                    new Error(
                        "You can only delete your own leads."
                    ),
                    "You can only delete your own leads."
                );

                return;

            }

        }


        // =================================================
        // CONFIRM DELETE
        // =================================================

        const customerName =
            String(
                lead.customer_name || ""
            ).trim();


        const confirmMessage =
            customerName
                ? `Delete "${customerName}"?`
                : "Delete this customer?";


        const confirmed =
            typeof window.confirmAction ===
            "function"
                ? await window.confirmAction(
                    confirmMessage
                )
                : confirm(
                    confirmMessage
                );


        if (!confirmed) {

            return;

        }


        // =================================================
        // DEBUG
        // =================================================

        console.log(
            "================================================"
        );

        console.log(
            "FSI CRM - DELETE LEAD"
        );

        console.log(
            "Role:",
            profile.role
        );

        console.log(
            "Profile ID:",
            profile.id
        );

        console.log(
            "Lead ID:",
            customerId
        );

        console.log(
            "Lead Sales ID:",
            lead.sales_id
        );

        console.log(
            "Admin:",
            isAdmin
        );

        console.log(
            "Can Manage Own Leads:",
            canManageOwnLeads
        );

        console.log(
            "================================================"
        );


        // =================================================
        // DELETE
        // =================================================
        //
        // RLS tetap melakukan security check di database.
        //
        // Admin:
        // is_admin() = true
        //
        // Own lead:
        // sales_id = sales_users.id
        // berdasarkan auth.uid()
        //
        // =================================================

        const {
            error
        } =
            await client
                .from("leads")
                .delete()
                .eq(
                    "id",
                    customerId
                );


        if (error) {

            console.error(
                "FSI CRM: delete lead error:",
                error
            );


            showLeadError(
                error,
                "Failed to delete customer."
            );

            return;

        }


        // =================================================
        // CLEAR CUSTOMER PROFILE
        // =================================================

        if (
            String(
                window.crmCurrentCustomerId
            ) ===
            customerId
        ) {

            window.crmCurrentCustomerId =
                null;

            window.crmCurrentCustomer =
                null;

        }


        // =================================================
        // REFRESH FILTER OPTIONS
        // =================================================

        if (
            typeof loadFilterOptions ===
            "function"
        ) {

            try {

                await loadFilterOptions();

            }
            catch (error) {

                console.warn(
                    "FSI CRM: filter options refresh failed:",
                    error
                );

            }

        }


        // =================================================
        // UPDATE TOTAL
        // =================================================

        const oldTotal =
            Number(
                window.totalLeadsCount
            ) || 0;


        const totalAfterDelete =
            Math.max(
                0,
                oldTotal - 1
            );


        const pageSize =
            leadGetPageSize();


        const maxPage =
            Math.max(
                1,
                Math.ceil(
                    totalAfterDelete /
                    pageSize
                )
            );


        const pageAfterDelete =
            Math.min(
                leadGetCurrentPage(),
                maxPage
            );


        leadSetCurrentPage(
            pageAfterDelete
        );


        // =================================================
        // REFRESH LEADS
        // =================================================

        await loadLeads(
            pageAfterDelete
        );


        // =================================================
        // REFRESH DASHBOARD
        // =================================================

        if (
            typeof window.updateDashboard ===
            "function"
        ) {

            try {

                await window.updateDashboard();

            }
            catch (error) {

                console.warn(
                    "FSI CRM: dashboard refresh failed:",
                    error
                );

            }

        }
        else if (
            window.FSIDashboard &&
            typeof window.FSIDashboard.loadDashboard ===
            "function"
        ) {

            try {

                await window.FSIDashboard.loadDashboard();

            }
            catch (error) {

                console.warn(
                    "FSI CRM: dashboard load failed:",
                    error
                );

            }

        }


        // =================================================
        // LEAD CHANGED EVENT
        // =================================================

        document.dispatchEvent(
            new CustomEvent(
                "fsi:lead-changed",
                {
                    detail: {

                        action:
                            "deleted",

                        id:
                            customerId

                    }
                }
            )
        );


        // =================================================
        // SUCCESS TOAST
        // =================================================

        if (
            typeof window.showToast ===
            "function"
        ) {

            window.showToast(
                "Customer deleted successfully.",
                "success"
            );

        }
        else if (
            window.FSIHelpers &&
            typeof window.FSIHelpers.showToast ===
            "function"
        ) {

            window.FSIHelpers.showToast(
                "Customer deleted successfully.",
                "success"
            );

        }


    }
    catch (error) {

        console.error(
            "FSI CRM: deleteLead error:",
            error
        );


        showLeadError(
            error,
            "An error occurred while deleting the customer."
        );

    }

}


// ========================================================
// END DELETE LEAD
// ========================================================
