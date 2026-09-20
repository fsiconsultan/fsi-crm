/* =========================================================
   CRM FSI - CUSTOMER FORM
   ADD + EDIT CUSTOMER
========================================================= */

let customerFormMode = "add";
let customerFormId = null;
let customerFormInitialized = false;


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    if (!document.getElementById("customerForm")) {
        return;
    }

    setTimeout(() => {
        initializeCustomerForm();
    }, 250);

});


async function initializeCustomerForm() {

    if (customerFormInitialized) {
        return;
    }

    customerFormInitialized = true;

    const params =
        new URLSearchParams(
            window.location.search
        );

    customerFormId =
        params.get("id");

    const isNew =
        params.get("new") === "1" ||
        params.get("new") === "true";


    /* ---------------------------------------------
       MODE
    --------------------------------------------- */

    if (customerFormId && !isNew) {

        customerFormMode = "edit";

        setEditMode();

    } else {

        customerFormMode = "add";

        setAddMode();

    }


    /* ---------------------------------------------
       EVENTS
    --------------------------------------------- */

    bindCustomerFormEvents();


    /* ---------------------------------------------
       SALES
    --------------------------------------------- */

    await loadCustomerFormSales();


    /* ---------------------------------------------
       EDIT DATA
    --------------------------------------------- */

    if (
        customerFormMode === "edit" &&
        customerFormId
    ) {

        await loadCustomerFormData(
            customerFormId
        );

    }

}


/* =========================================================
   MODE - ADD
========================================================= */

function setAddMode() {

    document.title =
        "Add Customer | FSI CRM";

    const title =
        $("formPageTitle");

    const subtitle =
        $("formPageSubtitle");

    const icon =
        $("formPageIcon");

    const saveText =
        $("saveCustomerText");


    if (title) {
        title.textContent =
            "Add Customer";
    }

    if (subtitle) {
        subtitle.textContent =
            "Tambahkan customer baru ke database CRM.";
    }

    if (icon) {

        icon.innerHTML =
            `<i class="fa-solid fa-user-plus"></i>`;

    }

    if (saveText) {
        saveText.textContent =
            "Save Customer";
    }

}


/* =========================================================
   MODE - EDIT
========================================================= */

function setEditMode() {

    document.title =
        "Edit Customer | FSI CRM";

    const title =
        $("formPageTitle");

    const subtitle =
        $("formPageSubtitle");

    const icon =
        $("formPageIcon");

    const saveText =
        $("saveCustomerText");


    if (title) {
        title.textContent =
            "Edit Customer";
    }

    if (subtitle) {
        subtitle.textContent =
            "Perbarui informasi customer dan sales pipeline.";
    }

    if (icon) {

        icon.innerHTML =
            `<i class="fa-solid fa-user-pen"></i>`;

    }

    if (saveText) {
        saveText.textContent =
            "Save Changes";
    }

}


/* =========================================================
   EVENTS
========================================================= */

function bindCustomerFormEvents() {

    const form =
        $("customerForm");

    if (form) {

        form.addEventListener(
            "submit",
            handleCustomerFormSubmit
        );

    }


    const cancelBtn =
        $("cancelCustomerBtn");

    if (cancelBtn) {

        cancelBtn.addEventListener(
            "click",
            cancelCustomerForm
        );

    }


    const backBtn =
        $("backToLeadsBtn");

    if (backBtn) {

        backBtn.addEventListener(
            "click",
            () => {

                window.location.href =
                    "leads.html";

            }
        );

    }

}


/* =========================================================
   LOAD SALES
========================================================= */

async function loadCustomerFormSales() {

    const select =
        $("customerSales");

    if (!select) return;


    const {
        data,
        error
    } = await supabaseClient
        .from(CRM_CONFIG.salesTable)
        .select(`
            id,
            name,
            role,
            status
        `)
        .order(
            "name",
            {
                ascending: true
            }
        );


    if (error) {

        console.error(
            "Load sales:",
            error
        );

        return;

    }


    const activeSales =
        (data || []).filter(
            sales => {

                const role =
                    String(
                        sales.role || ""
                    ).toLowerCase();

                const status =
                    String(
                        sales.status || ""
                    ).toLowerCase();

                return (
                    role !== "admin" &&
                    status !== "inactive"
                );

            }
        );


    select.innerHTML = `
        <option value="">
            Pilih Sales
        </option>
    `;


    activeSales.forEach(
        sales => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                sales.id;

            option.textContent =
                sales.name ||
                "Sales";

            select.appendChild(
                option
            );

        }
    );


    /* ---------------------------------------------
       SALES USER
    --------------------------------------------- */

    if (
        currentProfile &&
        String(
            currentProfile.role
        ).toLowerCase() !== "admin"
    ) {

        select.value =
            currentProfile.id;

        select.disabled = true;

    }

}


/* =========================================================
   LOAD CUSTOMER FOR EDIT
========================================================= */

async function loadCustomerFormData(id) {

    setCustomerFormLoading(
        true
    );


    const {
        data,
        error
    } = await supabaseClient
        .from(CRM_CONFIG.leadTable)
        .select(`
            id,
            customer_name,
            phone,
            business,
            location,
            status,
            follow_up_date,
            appointment,
            site_survey,
            quotation,
            spk,
            closing,
            notes,
            sales_id
        `)
        .eq(
            "id",
            id
        )
        .single();


    setCustomerFormLoading(
        false
    );


    if (error) {

        console.error(
            "Load customer:",
            error
        );

        showCustomerFormMessage(
            error.message ||
            "Customer tidak ditemukan.",
            "error"
        );

        return;

    }


    if (!canEditCustomer(
        data
    )) {

        showCustomerFormMessage(
            "Anda tidak memiliki akses untuk mengedit customer ini.",
            "error"
        );

        disableCustomerForm();

        return;

    }


    fillCustomerForm(
        data
    );

}


/* =========================================================
   ACCESS
========================================================= */

function canEditCustomer(lead) {

    if (!currentProfile) {
        return false;
    }


    if (
        String(
            currentProfile.role
        ).toLowerCase() === "admin"
    ) {

        return true;

    }


    return String(
        lead.sales_id
    ) === String(
        currentProfile.id
    );

}


/* =========================================================
   FILL FORM
========================================================= */

function fillCustomerForm(lead) {

    setValue(
        "customerName",
        lead.customer_name
    );

    setValue(
        "customerPhone",
        lead.phone
    );

    setValue(
        "customerBusiness",
        lead.business
    );

    setValue(
        "customerLocation",
        lead.location
    );

    setValue(
        "customerStatus",
        lead.status || "New"
    );

    setValue(
        "customerSales",
        lead.sales_id
    );

    setValue(
        "followUpDate",
        lead.follow_up_date
    );

    setValue(
        "appointmentDate",
        lead.appointment
    );

    setValue(
        "siteSurveyDate",
        lead.site_survey
    );

    setValue(
        "quotationDate",
        lead.quotation
    );

    setValue(
        "spkDate",
        lead.spk
    );

    setValue(
        "closingDate",
        lead.closing
    );

    setValue(
        "customerNotes",
        lead.notes
    );

}


/* =========================================================
   SUBMIT
========================================================= */

async function handleCustomerFormSubmit(
    event
) {

    event.preventDefault();


    clearCustomerFormMessage();


    const customerName =
        getValue(
            "customerName"
        ).trim();


    if (!customerName) {

        showCustomerFormMessage(
            "Customer Name wajib diisi.",
            "error"
        );

        $("customerName")?.focus();

        return;

    }


    const saveBtn =
        $("saveCustomerBtn");

    setButtonLoading(
        saveBtn,
        true,
        customerFormMode === "edit"
            ? "Saving..."
            : "Saving..."
    );


    try {

        const payload =
            buildCustomerPayload();


        let result;


        /* ---------------------------------------------
           EDIT
        --------------------------------------------- */

        if (
            customerFormMode === "edit" &&
            customerFormId
        ) {

            result =
                await supabaseClient
                    .from(
                        CRM_CONFIG.leadTable
                    )
                    .update(
                        payload
                    )
                    .eq(
                        "id",
                        customerFormId
                    )
                    .select()
                    .single();


        }


        /* ---------------------------------------------
           ADD
        --------------------------------------------- */

        else {

            result =
                await supabaseClient
                    .from(
                        CRM_CONFIG.leadTable
                    )
                    .insert(
                        payload
                    )
                    .select()
                    .single();

        }


        if (result.error) {

            throw result.error;

        }


        showCustomerFormMessage(
            customerFormMode === "edit"
                ? "Customer berhasil diperbarui."
                : "Customer berhasil ditambahkan.",
            "success"
        );


        setTimeout(() => {

            window.location.href =
                "leads.html";

        }, 700);


    } catch (error) {

        console.error(
            "Save customer:",
            error
        );


        showCustomerFormMessage(
            error.message ||
            "Gagal menyimpan customer.",
            "error"
        );


    } finally {

        setButtonLoading(
            saveBtn,
            false
        );

    }

}


/* =========================================================
   BUILD PAYLOAD
========================================================= */

function buildCustomerPayload() {

    const payload = {

        customer_name:
            getValue(
                "customerName"
            ).trim(),

        phone:
            getValue(
                "customerPhone"
            ).trim(),

        business:
            getValue(
                "customerBusiness"
            ).trim(),

        location:
            getValue(
                "customerLocation"
            ).trim(),

        status:
            getValue(
                "customerStatus"
            ) || "New",

        follow_up_date:
            emptyToNull(
                getValue(
                    "followUpDate"
                )
            ),

        appointment:
            emptyToNull(
                getValue(
                    "appointmentDate"
                )
            ),

        site_survey:
            emptyToNull(
                getValue(
                    "siteSurveyDate"
                )
            ),

        quotation:
            emptyToNull(
                getValue(
                    "quotationDate"
                )
            ),

        spk:
            emptyToNull(
                getValue(
                    "spkDate"
                )
            ),

        closing:
            emptyToNull(
                getValue(
                    "closingDate"
                )
            ),

        notes:
            getValue(
                "customerNotes"
            ).trim()

    };


    /* ---------------------------------------------
       SALES
    --------------------------------------------- */

    const salesSelect =
        $("customerSales");


    if (
        salesSelect &&
        !salesSelect.disabled
    ) {

        payload.sales_id =
            salesSelect.value || null;

    }


    /* ---------------------------------------------
       SALES USER
    --------------------------------------------- */

    else if (
        currentProfile &&
        String(
            currentProfile.role
        ).toLowerCase() !== "admin"
    ) {

        payload.sales_id =
            currentProfile.id;

    }


    /* ---------------------------------------------
       CREATED BY
    --------------------------------------------- */

    if (
        customerFormMode === "add" &&
        currentProfile
    ) {

        payload.created_by =
            currentProfile.id;

    }


    /* ---------------------------------------------
       UPDATED BY
    --------------------------------------------- */

    if (
        currentProfile
    ) {

        payload.updated_by =
            currentProfile.id;

    }


    return payload;

}


/* =========================================================
   CANCEL
========================================================= */

function cancelCustomerForm() {

    if (
        customerFormMode === "edit"
    ) {

        window.location.href =
            "leads.html";

        return;

    }


    window.location.href =
        "leads.html";

}


/* =========================================================
   HELPERS
========================================================= */

function getValue(id) {

    const element =
        $(id);

    return element
        ? element.value || ""
        : "";

}


function setValue(
    id,
    value
) {

    const element =
        $(id);

    if (!element) return;

    element.value =
        value || "";

}


function emptyToNull(value) {

    const clean =
        String(
            value || ""
        ).trim();

    return clean
        ? clean
        : null;

}


/* =========================================================
   MESSAGE
========================================================= */

function showCustomerFormMessage(
    message,
    type
) {

    const box =
        $("formMessage");

    if (!box) return;

    box.textContent =
        message;

    box.className =
        `form-message ${type}`;

    box.style.display =
        "block";

    box.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

}


function clearCustomerFormMessage() {

    const box =
        $("formMessage");

    if (!box) return;

    box.textContent =
        "";

    box.style.display =
        "none";

    box.className =
        "form-message";

}


/* =========================================================
   FORM LOADING
========================================================= */

function setCustomerFormLoading(
    loading
) {

    const form =
        $("customerForm");

    if (!form) return;


    if (loading) {

        form.classList.add(
            "is-loading"
        );

    } else {

        form.classList.remove(
            "is-loading"
        );

    }

}


function disableCustomerForm() {

    const form =
        $("customerForm");

    if (!form) return;

    form.querySelectorAll(
        "input, select, textarea, button"
    ).forEach(
        element => {

            element.disabled =
                true;

        }
    );

}
