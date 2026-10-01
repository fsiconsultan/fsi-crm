// ========================================================
// EDIT CUSTOMER
// ========================================================
async function openEditLead(id) {
    const customerId = String(id ?? "").trim();

    if (!customerId) {
        console.error(
            "FSI CRM: openEditLead called without customer ID."
        );

        if (typeof window.showToast === "function") {
            window.showToast(
                "Customer ID tidak ditemukan.",
                "error"
            );
        }

        return;
    }

    // ----------------------------------------------------
    // Prioritaskan modular Customer Form
    // ----------------------------------------------------
    if (
        window.FSICustomerForm &&
        typeof window.FSICustomerForm.openEditCustomer === "function"
    ) {
        await window.FSICustomerForm.openEditCustomer(customerId);
        return;
    }

    // ----------------------------------------------------
    // Fallback
    // ----------------------------------------------------
    if (
        typeof window.crmOpenEditCustomer === "function"
    ) {
        await window.crmOpenEditCustomer(customerId);
        return;
    }

    if (
        typeof window.openEditCustomer === "function" &&
        window.openEditCustomer !== openEditLead
    ) {
        await window.openEditCustomer(customerId);
        return;
    }

    console.warn(
        "FSI CRM: Customer form editor is not available."
    );

    if (typeof window.showToast === "function") {
        window.showToast(
            "Edit Customer belum tersedia. Pastikan customer-form.js sudah dimuat.",
            "error"
        );
    }
}


// ========================================================
// SAVE LEAD
// ========================================================
async function saveLead() {

    // ----------------------------------------------------
    // Gunakan Customer Form modular jika tersedia
    // ----------------------------------------------------
    if (
        window.FSICustomerForm &&
        typeof window.FSICustomerForm.saveCustomer === "function"
    ) {
        return window.FSICustomerForm.saveCustomer();
    }

    // ----------------------------------------------------
    // PROFILE
    // ----------------------------------------------------
    const profile = leadGetProfile();

    if (!profile) {
        showLeadError(
            new Error("User profile is not ready."),
            "User profile is not ready."
        );
        return;
    }

    // ----------------------------------------------------
    // SUPABASE
    // ----------------------------------------------------
    const client = leadGetSupabase();

    if (!client) {
        showLeadError(
            new Error("Supabase is not connected."),
            "Supabase is not connected."
        );
        return;
    }

    // ----------------------------------------------------
    // NORMALIZE ROLE
    // ----------------------------------------------------
    const role = String(
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

    console.log(
        "FSI CRM: saveLead permission check:",
        {
            userId: profile.id,
            role: profile.role,
            isAdmin,
            canManageOwnLeads
        }
    );

    // ----------------------------------------------------
    // PERMISSION CHECK
    // ----------------------------------------------------
    if (!isAdmin && !canManageOwnLeads) {
        console.warn(
            "FSI CRM: User is not allowed to manage leads.",
            profile
        );

        if (typeof window.showToast === "function") {
            window.showToast(
                "Anda tidak memiliki akses untuk mengelola customer.",
                "error"
            );
        }

        return;
    }

    // ----------------------------------------------------
    // CUSTOMER NAME
    // ----------------------------------------------------
    const customerElement = leadElement(
        "leadCustomerName",
        "leadCustomer"
    );

    const customer =
        customerElement?.value?.trim() || "";

    if (!customer) {
        if (typeof window.showToast === "function") {
            window.showToast(
                "Customer name is required.",
                "error"
            );
        } else {
            alert("Customer name is required.");
        }

        customerElement?.focus();
        return;
    }

    // ----------------------------------------------------
    // LEAD ID
    // ----------------------------------------------------
    const leadId =
        leadElement("leadId")?.value || "";

    // ----------------------------------------------------
    // FORM HELPER
    // ----------------------------------------------------
    const getFormValue = function (...ids) {
        const element = leadElement(...ids);

        return (
            element?.value?.trim() || ""
        );
    };

    // ----------------------------------------------------
    // STATUS
    // ----------------------------------------------------
    const statusValue = getFormValue(
        "leadStatus"
    );

    const normalizedStatus =
        typeof window.normalizeLeadStatus === "function"
            ? window.normalizeLeadStatus(
                  statusValue || "New"
              )
            : (
                statusValue || "New"
            );

    // ----------------------------------------------------
    // LAST FOLLOW UP
    // ----------------------------------------------------
    const lastFollowUpElement =
        leadElement(
            "leadLastFollowUp",
            "leadLastFollowup",
            "lastFollowUp"
        );

    // ----------------------------------------------------
    // BASIC PAYLOAD
    // ----------------------------------------------------
    const payload = {
        customer_name: customer,

        phone: getFormValue(
            "leadPhone"
        ),

        email: getFormValue(
            "leadEmail",
            "customerEmail",
            "email"
        ),

        business: getFormValue(
            "leadBusiness"
        ),

        location: getFormValue(
            "leadLocation"
        ),

        status: normalizedStatus,

        follow_up_date:
            leadElement(
                "leadFollowUp"
            )?.value || null,

        appointment:
            leadElement(
                "leadAppointment"
            )?.value || null,

        site_survey:
            leadElement(
                "leadSiteSurvey"
            )?.value || null,

        quotation:
            leadElement(
                "leadQuotation"
            )?.value || null,

        spk:
            leadElement(
                "leadSpk",
                "leadSPK"
            )?.value || null,

        closing:
            leadElement(
                "leadClosing"
            )?.value || null,

        notes: getFormValue(
            "leadNotes"
        )
    };

    // ----------------------------------------------------
    // LAST FOLLOW UP
    // Hanya dikirim jika field tersedia
    // ----------------------------------------------------
    if (lastFollowUpElement) {
        payload.last_follow_up =
            lastFollowUpElement.value || null;
    }

    // ----------------------------------------------------
    // SALES ASSIGNMENT
    // ----------------------------------------------------
    const salesAssignment =
        leadElement(
            "leadSales",
            "leadSalesAssign"
        );

    const selectedSales =
        salesAssignment?.value || "";

    /*
     * ADMIN
     * -------
     * Admin boleh memilih Sales.
     */
    if (isAdmin) {
        payload.sales_id =
            selectedSales || null;
    }

    /*
     * SALES / SECRETARY / DIGITAL MARKETING
     * -------------------------------------
     * User non-admin selalu memiliki lead sendiri.
     *
     * Jadi sales_id HARUS menggunakan profile.id.
     *
     * Ini penting untuk RLS:
     *
     * sales_id =
     * sales_users.id
     */
    else if (canManageOwnLeads) {
        payload.sales_id =
            profile.id;
    }

    console.log(
        "FSI CRM: final lead payload:",
        payload
    );

    // ----------------------------------------------------
    // SAVE
    // ----------------------------------------------------
    try {

        // =================================================
        // UPDATE EXISTING LEAD
        // =================================================
        if (leadId) {

            payload.updated_by =
                profile.id;

            /*
             * Untuk non-admin:
             *
             * sales_id tetap profile.id.
             *
             * RLS database tetap menjadi
             * pengaman utama.
             */
            if (!isAdmin && canManageOwnLeads) {
                payload.sales_id =
                    profile.id;
            }

            const {
                error
            } = await client
                .from("leads")
                .update(payload)
                .eq("id", leadId);

            if (error) {
                console.error(
                    "FSI CRM: update lead error:",
                    error
                );

                showLeadError(
                    error,
                    "Failed to update lead."
                );

                return;
            }

            if (
                typeof window.showToast === "function"
            ) {
                window.showToast(
                    "Customer updated successfully.",
                    "success"
                );
            }
        }

        // =================================================
        // CREATE NEW LEAD
        // =================================================
        else {

            payload.created_by =
                profile.id;

            payload.updated_by =
                profile.id;

            /*
             * Non-admin:
             * lead selalu menjadi milik user
             * yang sedang login.
             */
            if (!isAdmin && canManageOwnLeads) {
                payload.sales_id =
                    profile.id;
            }

            const {
                error
            } = await client
                .from("leads")
                .insert([
                    payload
                ]);

            if (error) {
                console.error(
                    "FSI CRM: insert lead error:",
                    error
                );

                showLeadError(
                    error,
                    "Failed to add customer."
                );

                return;
            }

            if (
                typeof window.showToast === "function"
            ) {
                window.showToast(
                    "Customer added successfully.",
                    "success"
                );
            }
        }

        // ------------------------------------------------
        // CLOSE MODAL
        // ------------------------------------------------
        closeLeadModal();

        // ------------------------------------------------
        // REFRESH FILTER OPTIONS
        // ------------------------------------------------
        await loadFilterOptions();

        // ------------------------------------------------
        // REFRESH LEADS
        // ------------------------------------------------
        await loadLeads(
            leadGetCurrentPage()
        );

        // ------------------------------------------------
        // REFRESH DASHBOARD
        // ------------------------------------------------
        if (
            typeof window.updateDashboard === "function"
        ) {
            try {
                await window.updateDashboard();
            } catch (error) {
                console.warn(
                    "FSI CRM: dashboard refresh failed:",
                    error
                );
            }
        }

        // ------------------------------------------------
        // DISPATCH EVENT
        // ------------------------------------------------
        document.dispatchEvent(
            new CustomEvent(
                "fsi:lead-changed",
                {
                    detail: {
                        action: leadId
                            ? "updated"
                            : "created"
                    }
                }
            )
        );

    } catch (error) {

        console.error(
            "FSI CRM: saveLead error:",
            error
        );

        showLeadError(
            error,
            "An error occurred while saving the customer."
        );
    }
}
