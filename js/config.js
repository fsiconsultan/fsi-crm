// Konfigurasi Kredensial Supabase FSI CRM
const SUPABASE_URL = "https://yoyszukutqwoxxdolzcg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_QcPULwc5-Axry0HRzfmq1A_CeXgiAHL";

// Inisialisasi Supabase Client Utama
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const supabaseClient = supabase; // Alias untuk kompatibilitas

const config = {
    PAGE_SIZE: 10,
    ROLES: {
        ADMIN: 'admin',
        SALES: 'sales'
    }
};
