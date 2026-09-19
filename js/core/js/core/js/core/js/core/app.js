// ================================
// CRM FSI - APP
// ================================


// ================================
// APPLICATION STARTUP
// ================================

document.addEventListener(
  "DOMContentLoaded",
  async function () {
    setupModalEvents();
    setupEnglishStatusOptions();

    await checkSession();
  }
);


// ================================
// GLOBAL COMPATIBILITY
// ================================

window.openCustomerProfile =
  window.crmOpenCustomerProfile;

window.crmProfileEdit = function () {
  if (
    typeof window.crmOpenCustomerProfile ===
    "function" &&
    window.crmCurrentCustomerId
  ) {
    window.crmOpenCustomerProfile(
      window.crmCurrentCustomerId
    );
  }
};

window.crmProfileWhatsApp =
  window.crmProfileWhatsApp;

window.crmProfileEmail =
  window.crmProfileEmail;

window.crmProfileAppointment =
  window.crmProfileAppointment;

window.crmSaveCustomerEdit =
  window.crmSaveCustomerEdit;

window.crmCancelCustomerEdit =
  window.crmCancelCustomerEdit;
