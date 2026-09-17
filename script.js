const SUPABASE_URL = "https://yoyszukutqwoxxdolzcg.supabase.co/rest/v1/";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_QcPULwc5-Axry0HRzfmq1A_CeXgiAHL";

const { createClient } = window.supabase;

const supabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


// =====================================================
// GLOBAL
// =====================================================

let currentUser = null;
let currentProfile = null;
let leads = [];
let salesUsers = [];


// =====================================================
// LOGIN
// =====================================================

async function login() {

  const username =
    document.getElementById("loginUsername").value.trim();

  const password =
    document.getElementById("loginPassword").value;

  const message =
    document.getElementById("loginMessage");

  if (!username || !password) {
    message.textContent = "Username dan password wajib diisi.";
    return;
  }

  message.textContent = "Logging in...";

  try {

    /*
      Untuk sementara username akan dicari
      dari sales_users.

      Supabase Auth menggunakan email/password.
      Karena CRM kita memakai username, kita
      membutuhkan email login yang tersimpan
      untuk setiap user.

      Untuk tahap awal, kita cari profile berdasarkan
      username setelah authentication.
    */

    const { data: profiles, error: profileError } =
      await supabaseClient
        .from("sales_users")
        .select("*")
        .eq("username", username)
        .limit(1);

    if (profileError) {
      console.error(profileError);
      message.textContent = profileError.message;
      return;
    }

    if (!profiles || profiles.length === 0) {
      message.textContent = "Username tidak ditemukan.";
      return;
    }

    const profile = profiles[0];

    if (profile.status !== "Active") {
      message.textContent = "User ini tidak aktif.";
      return;
    }

    /*
      NOTE:
      Supabase Auth membutuhkan email.
      Untuk sementara kita menggunakan auth_user-id
      sebagai penghubung profile.

      Sistem login final akan kita rapikan setelah
      koneksi database berhasil.
    */

    message.textContent =
      "Profile ditemukan. Sistem Auth sedang disiapkan.";

  } catch (error) {

    console.error(error);

    message.textContent =
      "Terjadi kesalahan saat login.";

  }
}


// =====================================================
// LOGOUT
// =====================================================

async function logout() {

  await supabaseClient.auth.signOut();

  currentUser = null;
  currentProfile = null;
  leads = [];
  salesUsers = [];

  document.getElementById("app").style.display = "none";
  document.getElementById("loginPage").style.display = "flex";

  document.getElementById("loginUsername").value = "";
  document.getElementById("loginPassword").value = "";
  document.getElementById("loginMessage").textContent = "";
}


// =====================================================
// SESSION CHECK
// =====================================================

async function checkSession() {

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (!session) {
    showLogin();
    return;
  }

  currentUser = session.user;

  await loadProfile();
}


// =====================================================
// LOAD PROFILE
// =====================================================

async function loadProfile() {

  if (!currentUser) return;

  const { data, error } =
    await supabaseClient
      .from("sales_users")
      .select("*")
      .eq('"auth_user-id"', currentUser.id)
      .single();

  if (error) {

    console.error(error);

    showLogin();

    return;
  }

  currentProfile = data;

  if (currentProfile.status !== "Active") {

    await supabaseClient.auth.signOut();

    showLogin();

    return;
  }

  showApp();

  updateUserInterface();

  await loadLeads();

  if (currentProfile.role === "Admin") {
    await loadSalesUsers();
  }
}


// =====================================================
// SHOW LOGIN
// =====================================================

function showLogin() {

  document.getElementById("loginPage").style.display = "flex";

  document.getElementById("app").style.display = "none";
}


// =====================================================
// SHOW APP
// =====================================================

function showApp() {

  document.getElementById("loginPage").style.display = "none";

  document.getElementById("app").style.display = "flex";
}


// =====================================================
// UPDATE USER INTERFACE
// =====================================================

function updateUserInterface() {

  if (!currentProfile) return;

  const userInfo =
    document.getElementById("userInfo");

  const currentUserElement =
    document.getElementById("currentUser");

  userInfo.textContent =
    `${currentProfile.name} • ${currentProfile.role}`;

  currentUserElement.textContent =
    currentProfile.name;

  const manageSalesBtn =
    document.getElementById("manageSalesBtn");

  if (currentProfile.role === "Admin") {

    manageSalesBtn.style.display = "block";

  } else {

    manageSalesBtn.style
