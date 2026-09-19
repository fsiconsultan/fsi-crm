// ==========================================
// NAVIGATION & ROUTING (js/core/navigation.js)
// ==========================================

async function editLead(id) {
  if (!id) return alert("Customer ID not found.");
  if (typeof window.crmOpenCustomerProfile === "function") {
    await window.crmOpenCustomerProfile(id);
  }
}

window.crmOpenCustomerProfile = async function (id) {
  if (!id) return alert("Customer ID not found.");

  try {
    const { data, error } = await supabaseClient
      .from("leads")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return alert("Customer not found.");

    window.crmCurrentCustomerId = data.id;
    window.crmCurrentCustomer = data;
    crmActivePipelineStep = crmGetCurrentPipelineKey(data);

    crmRenderCustomerWorkspace(data);
    crmShowProfilePage();
    setPageTitle("Customer Profile");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    console.error("crmOpenCustomerProfile error:", err);
    alert("Error: " + err.message);
  }
};

function crmShowProfilePage() {
  const pages = [
    "dashboardPage", "leadsPage", "salesPage", "customerProfilePage",
    "appointmentPage", "dailyReportPage", "pltsCalculatorPage", 
    "pltsSimulatorPage", "settingsPage"
  ];
  pages.forEach(id => {
    const page = document.getElementById(id);
    if (page) page.style.display = (id === "customerProfilePage") ? "block" : "none";
  });
}
