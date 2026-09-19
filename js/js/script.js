/* =====================================================
   MAIN APPLICATION SCRIPT & INITIALIZATION
====================================================== */

document.addEventListener("DOMContentLoaded", function () {
  // Inisialisasi Ikon Lucide
  if (window.lucide) {
    lucide.createIcons();
  }

  // Tampilkan halaman awal (Dashboard)
  if (typeof crmNavigate === "function") {
    crmNavigate("dashboard");
  }
});
