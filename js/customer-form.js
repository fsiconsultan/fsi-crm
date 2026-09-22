// ========================================
// FSI CRM - CUSTOMER FORM
// Add Customer + Edit Customer
// ========================================

(function () {
  "use strict";

  // ========================================
  // STATE
  // ========================================

  let editingCustomerId = null;
  let customerFormInitialized = false;


  // ========================================
  // DOM HELPERS
  // ========================================

  function customerElement(id) {
    return document.getElementById(id);
  }

  function customerGetSupabase() {
    return window.supabaseClient || null;
  }

  function customerGetProfile() {
    return window.currentProfile || null;
  }


  // ========================================
  // ROLE HELPERS
  // ========================================

  function customerIsAdmin() {
    const profile = customerGetProfile();
    if (!profile) return false;

    const role = String(profile.role || "").toLowerCase().trim();

    return (
      role === "admin" ||
      role === "owner" ||
      role === "administrator"
    );
  }

  function customerIsSales() {
    const profile = customerGetProfile();
    if (!profile) return false;

    const role = String(profile.role || "").toLowerCase().trim();

    return (
      role === "sales" ||
      role === "salesperson"
    );
  }


  // ========================================
  // NORMALIZE DATE
  // ========================================

  function customerDateValue(value) {
    if (!value) return "";

    const text = String(value).trim();

    if (text.length >= 10) {
      return text.substring(0, 10);
    }

    return text;
  }


  // ========================================
  // FIND CUSTOMER IN CURRENT DATA
  // ========================================

  function findCustomerLocal(id) {
    const customerId = String(id || "").trim();

    if (!customerId) return null;

    const data = Array.isArray(window.leadsData)
      ? window.leadsData
      : [];

    return (
      data.find(function (customer) {
        return String(customer?.id || "").trim() === customerId;
      }) || null
    );
  }


  // ========================================
  // LOAD CUSTOMER FOR EDIT
  // ========================================

  async function loadCustomerForEdit(id) {
    const customerId = String(id || "").trim();

    if (!customerId) {
      throw new Error("Customer ID tidak ditemukan.");
    }

    // Coba ambil dari data yang sudah ada terlebih dahulu
    const localCustomer = findCustomerLocal(customerId);

    if (localCustomer) {
      return localCustomer;
    }

    // Kalau tidak ada di halaman sekarang,
    // ambil langsung dari Supabase
    const supabase = customerGetSupabase();

    if (!supabase) {
      throw new Error("Supabase belum tersedia.");
    }

    const result = await supabase
      .from("leads")
      .select("*")
      .eq("id", customerId)
      .single();

    if (result.error) {
      throw result.error;
    }

    if (!result.data) {
      throw new Error("Data customer tidak ditemukan.");
    }

    return result.data;
  }


  // ========================================
  // SET FIELD VALUE
  // ========================================

  function setCustomerField(ids, value) {
    const fieldIds = Array.isArray(ids) ? ids : [ids];

    for (const id of fieldIds) {
      const element = customerElement(id);

      if (element) {
        element.value = value ?? "";
        return;
      }
    }
  }


  // ========================================
  // CLEAR FORM
  // ========================================

  function clearCustomerForm() {
    const form = customerElement("lead-form");

    if (form) {
      form.reset();
    }

    setCustomerField("leadId", "");

    editingCustomerId = null;

    const title = customerElement("leadModalTitle");

    if (title) {
      title.textContent = "Add Customer";
    }
  }


  // ========================================
  // OPEN MODAL
  // ========================================

  function showCustomerModal() {
    const modal = customerElement("leadModal");

    if (!modal) {
      console.error(
        "FSI CRM: #leadModal tidak ditemukan."
      );
      return false;
    }

    modal.classList.add("show");

    modal.style.display = "flex";
    modal.style.visibility = "visible";
    modal.style.opacity = "1";

    document.body.classList.add("modal-open");

    return true;
  }


  // ========================================
  // CLOSE MODAL
  // ========================================

  function closeCustomerForm() {
    const modal = customerElement("leadModal");

    if (!modal) return;

    modal.classList.remove("show");

    modal.style.display = "none";

    document.body.classList.remove("modal-open");

    editingCustomerId = null;
  }


  // ========================================
  // OPEN ADD CUSTOMER
  // ========================================

  function openAddCustomer() {
    const profile = customerGetProfile();

    if (!profile) {
      console.warn(
        "FSI CRM: Profile belum siap."
      );
      return;
    }

    editingCustomerId = null;

    clearCustomerForm();

    const title = customerElement("leadModalTitle");

    if (title) {
      title.textContent = "Add Customer";
    }

    showCustomerModal();

    setTimeout(function () {
      const input = customerElement("leadCustomerName");

      if (input) {
        input.focus();
      }
    }, 100);
  }


  // ========================================
  // OPEN EDIT CUSTOMER
  // ========================================

  async function openEditCustomer(id) {
    const customerId = String(id || "").trim();

    if (!customerId) {
      console.warn(
        "FSI CRM: Customer ID tidak ditemukan."
      );
      return;
    }

    const profile = customerGetProfile();

    if (!profile) {
      console.warn(
        "FSI CRM: Profile belum siap."
      );
      return;
    }

    try {
      if (window.FSIHelpers?.showLoading) {
        window.FSIHelpers.showLoading(
          "Memuat data customer..."
        );
      }

      const customer = await loadCustomerForEdit(customerId);

      editingCustomerId = customerId;

      clearCustomerForm();

      editingCustomerId = customerId;

      setCustomerField(
        "leadId",
        customer.id
      );

      setCustomerField(
        "leadCustomerName",
        customer.customer_name
      );

      setCustomerField(
        "leadPhone",
        customer.phone
      );

      setCustomerField(
        "leadBusiness",
        customer.business
      );

      setCustomerField(
        "leadLocation",
        customer.location
      );

      setCustomerField(
        "leadStatus",
        customer.status
      );

      setCustomerField(
        "leadFollowUp",
        customerDateValue(customer.follow_up_date)
      );

      setCustomerField(
        "leadAppointment",
        customerDateValue(customer.appointment)
      );

      setCustomerField(
        "leadSiteSurvey",
        customerDateValue(customer.site_survey)
      );

      setCustomerField(
        "leadQuotation",
        customerDateValue(customer.quotation)
      );

      setCustomerField(
        ["leadSpk", "leadSPK"],
        customerDateValue(customer.spk)
      );

      setCustomerField(
        "leadClosing",
        customerDateValue(customer.closing)
      );

      setCustomerField(
        ["leadSalesAssign", "leadSales"],
        customer.sales_id || ""
      );

      setCustomerField(
        "leadNotes",
        customer.notes
      );

      const title = customerElement("leadModalTitle");

      if (title) {
        title.textContent = "Edit Customer";
      }

      // Berikan kontrol assignment sesuai role
      if (typeof window.setupSalesAssignmentAccess === "function") {
        window.setupSalesAssignmentAccess();
      }

      showCustomerModal();

      setTimeout(function () {
        const input = customerElement("leadCustomerName");

        if (input) {
          input.focus();
        }
      }, 100);

    } catch (error) {
      console.error(
        "FSI CRM: Gagal membuka customer:",
        error
      );

      if (window.FSIHelpers?.showToast) {
        window.FSIHelpers.showToast(
          error?.message ||
          "Gagal memuat data customer.",
          "error"
        );
      }
    } finally {
      if (window.FSIHelpers?.hideLoading) {
        window.FSIHelpers.hideLoading();
      }
    }
  }


  // ========================================
  // INITIALIZE
  // ========================================

  function initializeCustomerForm() {
    if (customerFormInitialized) {
      return;
    }

    customerFormInitialized = true;

    const modal = customerElement("leadModal");

    if (!modal) {
      console.warn(
        "FSI CRM: #leadModal belum tersedia."
      );
      return;
    }

    // Tombol close
    const closeButtons = modal.querySelectorAll(
      '[data-action="close-modal"], ' +
      ".modal-close, " +
      ".close-modal, " +
      "#btn-cancel-lead, " +
      "#cancelLead"
    );

    closeButtons.forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.preventDefault();
        closeCustomerForm();
      });
    });

    // Klik background modal
    modal.addEventListener("click", function (event) {
      if (event.target === modal) {
        closeCustomerForm();
      }
    });

    // ESC
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        if (
          modal.classList.contains("show") ||
          modal.style.display === "flex"
        ) {
          closeCustomerForm();
        }
      }
    });

    console.log(
      "FSI CRM: Customer Form initialized."
    );
  }


  // ========================================
  // GLOBAL EXPORT
  // ========================================

  window.FSICustomerForm = {
    openAddCustomer,
    openEditCustomer,
    closeCustomerForm,
    clearCustomerForm,
    loadCustomerForEdit
  };

  // Compatibility
  window.crmOpenAddCustomer = openAddCustomer;
  window.crmOpenEditCustomer = openEditCustomer;
  window.openAddCustomer = openAddCustomer;
  window.openEditCustomer = openEditCustomer;
  window.closeCustomerForm = closeCustomerForm;


  // ========================================
  // DOM READY
  // ========================================

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeCustomerForm
    );
  } else {
    initializeCustomerForm();
  }

})();
