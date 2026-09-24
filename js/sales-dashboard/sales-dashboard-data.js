/* =========================================================
   FSI CRM - SALES DASHBOARD DATA
   ---------------------------------------------------------
   Mengambil data Sales dan Leads dari Supabase
   untuk Sales Dashboard.

   Tidak mengubah data.
   Tidak membuat / menghapus data.
   Hanya membaca data.
   ========================================================= */


/* =========================================================
   GET SUPABASE CLIENT
   ========================================================= */

function getSalesDashboardSupabase() {

    /*
     * Project CRM sudah menggunakan Supabase client
     * yang dibuat di config.js.
     *
     * Kita mencoba beberapa nama umum agar file ini
     * tetap kompatibel dengan struktur CRM yang sudah ada.
     */

    if (typeof supabaseClient !== "undefined") {
        return supabaseClient;
    }

    if (
        typeof window !== "undefined" &&
        window.supabaseClient
    ) {
        return window.supabaseClient;
    }

    /*
     * Beberapa project menggunakan nama "supabase".
     */

    if (
        typeof window !== "undefined" &&
        window.supabase
    ) {
        return window.supabase;
    }

    throw new Error(
        "Supabase client belum tersedia."
    );
}


/* =========================================================
   LOAD ALL SALES
   ---------------------------------------------------------
   Digunakan untuk membuat daftar:
   Sales A
   Sales B
   Sales C
   dst.
   ========================================================= */

window.loadSalesDashboardSales = async function () {

    try {

        const supabase = getSalesDashboardSupabase();

        const {
            data,
            error
        } = await supabase
            .from("sales_users")
            .select("*")
            .order("name", {
                ascending: true
            });

        if (error) {
            console.error(
                "Sales Dashboard - load sales error:",
                error
            );

            throw error;
        }

        const salesList = Array.isArray(data)
            ? data
            : [];

        /*
         * Simpan ke state.
         */

        if (
            typeof window.setSalesDashboardSalesList ===
            "function"
        ) {
            window.setSalesDashboardSalesList(
                salesList
            );
        }

        return salesList;

    } catch (error) {

        console.error(
            "Sales Dashboard - failed to load sales:",
            error
        );

        if (
            typeof window.setSalesDashboardError ===
            "function"
        ) {
            window.setSalesDashboardError(
                error?.message ||
                "Gagal mengambil data Sales."
            );
        }

        return [];
    }
};


/* =========================================================
   LOAD SELECTED SALES
   ---------------------------------------------------------
   Mengambil satu Sales berdasarkan ID.
   ========================================================= */

window.loadSalesDashboardSalesById = async function (
    salesId
) {

    if (!salesId) {
        throw new Error(
            "Sales ID tidak ditemukan."
        );
    }

    try {

        const supabase = getSalesDashboardSupabase();

        const {
            data,
            error
        } = await supabase
            .from("sales_users")
            .select("*")
            .eq("id", salesId)
            .maybeSingle();

        if (error) {
            console.error(
                "Sales Dashboard - load selected sales error:",
                error
            );

            throw error;
        }

        if (!data) {
            throw new Error(
                "Data Sales tidak ditemukan."
            );
        }

        /*
         * Simpan Sales yang sedang dipilih.
         */

        if (
            typeof window.setSalesDashboardSales ===
            "function"
        ) {
            window.setSalesDashboardSales(data);
        }

        return data;

    } catch (error) {

        console.error(
            "Sales Dashboard - failed to load selected sales:",
            error
        );

        if (
            typeof window.setSalesDashboardError ===
            "function"
        ) {
            window.setSalesDashboardError(
                error?.message ||
                "Gagal mengambil data Sales."
            );
        }

        return null;
    }
};


/* =========================================================
   LOAD LEADS BY SALES
   ---------------------------------------------------------
   Mengambil semua leads milik Sales tertentu.
   ========================================================= */

window.loadSalesDashboardLeads = async function (
    salesId
) {

    if (!salesId) {
        throw new Error(
            "Sales ID tidak ditemukan."
        );
    }

    try {

        const supabase = getSalesDashboardSupabase();

        const {
            data,
            error
        } = await supabase
            .from("leads")
            .select("*")
            .eq("sales_id", salesId)
            .order("created_at", {
                ascending: false
            });

        if (error) {

            console.error(
                "Sales Dashboard - load leads error:",
                error
            );

            throw error;
        }

        const leads = Array.isArray(data)
            ? data
            : [];

        /*
         * Simpan leads ke state.
         */

        if (
            typeof window.setSalesDashboardLeads ===
            "function"
        ) {
            window.setSalesDashboardLeads(
                leads
            );
        }

        return leads;

    } catch (error) {

        console.error(
            "Sales Dashboard - failed to load leads:",
            error
        );

        if (
            typeof window.setSalesDashboardError ===
            "function"
        ) {
            window.setSalesDashboardError(
                error?.message ||
                "Gagal mengambil data leads."
            );
        }

        return [];
    }
};


/* =========================================================
   LOAD SALES + LEADS
   ---------------------------------------------------------
   Fungsi utama untuk membuka dashboard Sales.
   ========================================================= */

window.loadSalesDashboard = async function (
    salesId
) {

    if (!salesId) {
        throw new Error(
            "Sales ID tidak ditemukan."
        );
    }

    try {

        if (
            typeof window.setSalesDashboardLoading ===
            "function"
        ) {
            window.setSalesDashboardLoading(true);
        }

        if (
            typeof window.setSalesDashboardError ===
            "function"
        ) {
            window.setSalesDashboardError(null);
        }

        /*
         * Ambil Sales dan Leads.
         */

        const [
            sales,
            leads
        ] = await Promise.all([
            window.loadSalesDashboardSalesById(
                salesId
            ),
            window.loadSalesDashboardLeads(
                salesId
            )
        ]);

        /*
         * Pastikan Sales ditemukan.
         */

        if (!sales) {
            throw new Error(
                "Sales tidak ditemukan."
            );
        }

        return {
            sales,
            leads
        };

    } catch (error) {

        console.error(
            "Sales Dashboard - load dashboard error:",
            error
        );

        if (
            typeof window.setSalesDashboardError ===
            "function"
        ) {
            window.setSalesDashboardError(
                error?.message ||
                "Gagal memuat Sales Dashboard."
            );
        }

        return {
            sales: null,
            leads: []
        };

    } finally {

        if (
            typeof window.setSalesDashboardLoading ===
            "function"
        ) {
            window.setSalesDashboardLoading(false);
        }
    }
};


/* =========================================================
   REFRESH SELECTED SALES DASHBOARD
   ========================================================= */

window.refreshSalesDashboard = async function () {

    const state =
        typeof window.getSalesDashboardState ===
        "function"
            ? window.getSalesDashboardState()
            : null;

    if (!state?.selectedSalesId) {

        console.warn(
            "Sales Dashboard: belum ada Sales yang dipilih."
        );

        return {
            sales: null,
            leads: []
        };
    }

    return await window.loadSalesDashboard(
        state.selectedSalesId
    );
};
