/* =========================================================
   FSI CRM - SALES DASHBOARD STATE
   ---------------------------------------------------------
   Menyimpan state khusus untuk Sales Dashboard.
   Tidak mengubah state Dashboard utama atau Leads.
   ========================================================= */

window.salesDashboardState = {
    // Sales yang sedang dipilih oleh Admin
    selectedSalesId: null,

    // Data profile Sales yang sedang ditampilkan
    selectedSales: null,

    // Semua Sales yang tersedia
    salesList: [],

    // Data leads milik Sales yang sedang dipilih
    leads: [],

    // Statistik Sales
    stats: {
        total: 0,
        new: 0,
        first_contact: 0,
        first_meeting: 0,
        quotation: 0,
        second_appointment: 0,
        deal: 0,
        no_deal: 0
    },

    // Search leads di Sales Dashboard
    searchTerm: "",

    // Filter status
    statusFilter: "",

    // Loading state
    loading: false,

    // Error message
    error: null,

    // Pagination
    currentPage: 1,
    pageSize: 20,

    // Menyimpan apakah dashboard sudah dibuka
    initialized: false
};


/* =========================================================
   SET SELECTED SALES
   ========================================================= */

window.setSalesDashboardSales = function (sales) {
    window.salesDashboardState.selectedSales = sales || null;
    window.salesDashboardState.selectedSalesId =
        sales?.id || null;
};


/* =========================================================
   SET SALES LIST
   ========================================================= */

window.setSalesDashboardSalesList = function (salesList) {
    window.salesDashboardState.salesList =
        Array.isArray(salesList) ? salesList : [];
};


/* =========================================================
   SET LEADS
   ========================================================= */

window.setSalesDashboardLeads = function (leads) {
    window.salesDashboardState.leads =
        Array.isArray(leads) ? leads : [];
};


/* =========================================================
   SET STATS
   ========================================================= */

window.setSalesDashboardStats = function (stats) {

    window.salesDashboardState.stats = {
        total: Number(stats?.total || 0),
        new: Number(stats?.new || 0),
        first_contact: Number(stats?.first_contact || 0),
        first_meeting: Number(stats?.first_meeting || 0),
        quotation: Number(stats?.quotation || 0),
        second_appointment: Number(
            stats?.second_appointment || 0
        ),
        deal: Number(stats?.deal || 0),
        no_deal: Number(stats?.no_deal || 0)
    };
};


/* =========================================================
   SET SEARCH
   ========================================================= */

window.setSalesDashboardSearch = function (value) {
    window.salesDashboardState.searchTerm =
        String(value || "").trim();
};


/* =========================================================
   SET STATUS FILTER
   ========================================================= */

window.setSalesDashboardStatusFilter = function (value) {
    window.salesDashboardState.statusFilter =
        String(value || "").trim();
};


/* =========================================================
   RESET FILTER
   ========================================================= */

window.resetSalesDashboardFilters = function () {

    window.salesDashboardState.searchTerm = "";
    window.salesDashboardState.statusFilter = "";
    window.salesDashboardState.currentPage = 1;
};


/* =========================================================
   SET LOADING
   ========================================================= */

window.setSalesDashboardLoading = function (loading) {
    window.salesDashboardState.loading = Boolean(loading);
};


/* =========================================================
   SET ERROR
   ========================================================= */

window.setSalesDashboardError = function (error) {
    window.salesDashboardState.error =
        error ? String(error) : null;
};


/* =========================================================
   RESET DASHBOARD
   ========================================================= */

window.resetSalesDashboardState = function () {

    window.salesDashboardState.selectedSalesId = null;
    window.salesDashboardState.selectedSales = null;

    window.salesDashboardState.leads = [];

    window.salesDashboardState.stats = {
        total: 0,
        new: 0,
        first_contact: 0,
        first_meeting: 0,
        quotation: 0,
        second_appointment: 0,
        deal: 0,
        no_deal: 0
    };

    window.salesDashboardState.searchTerm = "";
    window.salesDashboardState.statusFilter = "";

    window.salesDashboardState.loading = false;
    window.salesDashboardState.error = null;

    window.salesDashboardState.currentPage = 1;
};


/* =========================================================
   GET CURRENT STATE
   ========================================================= */

window.getSalesDashboardState = function () {
    return window.salesDashboardState;
};
