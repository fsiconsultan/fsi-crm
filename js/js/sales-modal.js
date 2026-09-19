/* =====================================================
   SALES MODAL CONTROLLER
====================================================== */

function openSalesModal() {
  const modal = document.getElementById("salesModal");
  if (modal) modal.style.display = "flex";
}

function closeSalesModal() {
  const modal = document.getElementById("salesModal");
  if (modal) modal.style.display = "none";
}
