<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="FSI CRM - French Solar Industry">
  <meta name="theme-color" content="#0b63ce">
  <title>Dashboard | FSI CRM</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
  <link rel="stylesheet" href="../css/style.css">
  <link rel="stylesheet" href="../css/dashboard.css">
  <link rel="stylesheet" href="../css/leads.css">
  <link rel="stylesheet" href="../css/profile.css">
  <link rel="stylesheet" href="../css/sales.css">
</head>
<body>
<div id="app" class="app">
  <aside id="sidebar" class="sidebar">
    <div class="sidebar-brand">
      <img src="../assets/logo-fsi.png" alt="FSI CRM">
      <div><strong>FSI CRM</strong><span>French Solar Industry</span></div>
    </div>
    <nav class="main-navigation">
      <a class="nav-item active" href="dashboard.html"><i class="fa-solid fa-chart-pie"></i><span>Dashboard</span></a>
      <a class="nav-item " href="leads.html"><i class="fa-solid fa-users"></i><span>Leads</span></a>
      <a class="nav-item admin-only " href="sales.html"><i class="fa-solid fa-user-tie"></i><span>Manage Sales</span></a>
    </nav>
    <div class="sidebar-bottom">
      <button class="nav-item" id="profileNavBtn" type="button" onclick="openProfileModal()"><i class="fa-solid fa-user"></i><span>Profile</span></button>
      <button class="nav-item" id="logoutBtn" type="button"><i class="fa-solid fa-right-from-bracket"></i><span>Logout</span></button>
    </div>
  </aside>
  <div id="sidebarOverlay" class="sidebar-overlay"></div>

  <main class="main-content">
    <header class="top-header">
      <div class="header-left">
        <button id="mobileMenuBtn" class="mobile-menu-btn" type="button"><i class="fa-solid fa-bars"></i></button>
        <div><h1 id="pageTitle">Dashboard</h1><p id="pageSubtitle">CRM French Solar Industry</p></div>
      </div>
      <div class="header-right">
        <div class="global-search"><i class="fa-solid fa-magnifying-glass"></i><input id="globalSearch" type="search" placeholder="Cari leads, pelanggan, atau nama..."></div>
        <button class="header-icon-btn" type="button"><i class="fa-regular fa-bell"></i></button>
        <button id="userMenu" class="user-menu" type="button">
          <span id="userAvatarInitial" class="user-avatar">F</span>
          <span id="userInfo" class="user-info"><strong>User</strong><small>Sales</small></span>
          <i class="fa-solid fa-chevron-down"></i>
        </button>
        <div id="userDropdown" class="user-dropdown" style="display:none">
          <button type="button" onclick="openProfileModal()"><i class="fa-solid fa-user"></i> Profile</button>
          <div></div>
          <button id="dropdownLogout" class="danger" type="button"><i class="fa-solid fa-right-from-bracket"></i> Logout</button>
        </div>
      </div>
    </header>
    <section class="page-content">

<section id="dashboardPage" class="page">
  <div class="section-header">
    <div><h2>Dashboard Overview</h2><p>Selamat datang kembali. Berikut ringkasan aktivitas CRM Anda.</p></div>
    <button id="dashboardAddLead" class="btn btn-primary" type="button"><i class="fa-solid fa-plus"></i> Add Lead</button>
  </div>
  <div id="dashboardStats" class="dashboard-stats">
    <div class="stat-card"><div><span>Total Leads</span><strong id="statTotal">0</strong></div><i class="fa-solid fa-users"></i></div>
    <div class="stat-card"><div><span>New</span><strong id="statNew">0</strong></div><i class="fa-solid fa-user-plus"></i></div>
    <div class="stat-card"><div><span>Interested</span><strong id="statInterested">0</strong></div><i class="fa-solid fa-fire"></i></div>
    <div class="stat-card"><div><span>Follow Up</span><strong id="statFollowUp">0</strong></div><i class="fa-solid fa-phone"></i></div>
    <div class="stat-card"><div><span>Appointment</span><strong id="statAppointment">0</strong></div><i class="fa-solid fa-calendar-check"></i></div>
    <div class="stat-card"><div><span>Site Survey</span><strong id="statSiteSurvey">0</strong></div><i class="fa-solid fa-location-dot"></i></div>
    <div class="stat-card"><div><span>Quotation</span><strong id="statQuotation">0</strong></div><i class="fa-solid fa-file-invoice-dollar"></i></div>
    <div class="stat-card"><div><span>Closing</span><strong id="statClosing">0</strong></div><i class="fa-solid fa-circle-check"></i></div>
  </div>
  <div class="dashboard-grid">
    <div class="dashboard-card">
      <div class="card-header"><div><h3>Sales Overview</h3><p>Distribusi status lead</p></div></div>
      <div id="salesOverviewChart" class="bar-chart"></div>
    </div>
    <div class="dashboard-card">
      <div class="card-header"><div><h3>Recent Leads</h3><p>Prospek terbaru</p></div><a href="leads.html" class="text-btn">View All</a></div>
      <div id="recentLeads" class="recent-leads"></div>
    </div>
  </div>
  <div class="dashboard-card">
    <div class="card-header"><div><h3>Sales Pipeline</h3><p>Perjalanan prospek dari lead sampai closing</p></div></div>
    <div id="dashboardPipeline" class="pipeline-overview"></div>
  </div>
</section>
    </section>
  </main>
</div>

<div id="confirmModal" class="modal-overlay" style="display:none">
  <div class="modal modal-small">
    <div class="confirm-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
    <h2 id="confirmTitle">Confirm</h2>
    <p id="confirmMessage"></p>
    <div class="modal-footer">
      <button class="btn btn-secondary" type="button" data-close="confirmModal">Cancel</button>
      <button id="confirmActionBtn" class="btn btn-danger" type="button">Confirm</button>
    </div>
  </div>
</div>

<div id="profileModal" class="modal-overlay" style="display:none">
  <div class="modal">
    <div class="modal-header">
      <div><h2>My Profile</h2><p>Informasi akun pengguna CRM.</p></div>
      <button class="modal-close" type="button" data-close="profileModal"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div id="userProfileContent" class="profile-card"></div>
  </div>
</div>

<div id="toastContainer" class="toast-container"></div>
<div id="globalLoading" class="global-loading" style="display:none">
  <div><i class="fa-solid fa-spinner fa-spin"></i><span id="globalLoadingText">Loading...</span></div>
</div>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="../js/config.js"></script>
<script src="../js/helpers.js"></script>
<script src="../js/modal.js"></script>
<script src="../js/auth.js"></script>
<script src="../js/navigation.js"></script>
<script src="../js/dashboard.js"></script>
<script src="../js/leads.js"></script>
<script src="../js/customer-profile.js"></script>
<script src="../js/sales.js"></script>
</body>
</html>
