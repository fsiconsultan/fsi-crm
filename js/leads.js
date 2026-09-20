<!DOCTYPE html>
<html lang="id">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <meta
        name="description"
        content="FSI CRM - Customer Leads"
    >

    <meta
        name="theme-color"
        content="#0b63ce"
    >

    <title>
        Leads | FSI CRM
    </title>


    <!-- ========================================
         FAVICON
    ========================================= -->

    <link
        rel="icon"
        href="../assets/logo-fsi.png"
    >


    <!-- ========================================
         GOOGLE FONT
    ========================================= -->

    <link
        rel="preconnect"
        href="https://fonts.googleapis.com"
    >

    <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossorigin
    >

    <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
    >


    <!-- ========================================
         FONT AWESOME
    ========================================= -->

    <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
    >


    <!-- ========================================
         GLOBAL CSS
    ========================================= -->

    <link
        rel="stylesheet"
        href="../css/style.css"
    >


    <!-- ========================================
         LEADS CSS
    ========================================= -->

    <link
        rel="stylesheet"
        href="../css/leads.css"
    >

</head>


<body>


<!-- ========================================
     GLOBAL LOADING
========================================= -->

<div
    id="globalLoading"
    class="global-loading"
    style="display:none;"
>

    <div>

        <i
            class="fa-solid fa-spinner fa-spin"
        ></i>

        <span>
            Loading...
        </span>

    </div>

</div>


<!-- =========================================================
     TOP HEADER
========================================================= -->

<header class="top-header">


    <!-- ======================================
         HEADER LEFT
    ======================================= -->

    <div class="header-left">


        <!-- FSI BRAND -->

        <a
            href="dashboard.html"
            class="brand-area"
            aria-label="FSI CRM Dashboard"
        >

            <img
                src="../assets/logo-fsi.png"
                alt="FSI Logo"
                class="brand-logo"
            >


            <div class="brand-text">

                <strong>
                    FSI CRM
                </strong>

                <span>
                    French Solar Industry
                </span>

            </div>

        </a>


        <!-- PAGE TITLE -->

        <div class="page-heading">

            <h1 id="pageTitle">
                Leads
            </h1>

            <p id="pageSubtitle">
                Customer Lead Management
            </p>

        </div>

    </div>


    <!-- ======================================
         HEADER RIGHT
    ======================================= -->

    <div class="header-right">


        <!-- ==================================
             MAIN NAVIGATION
        =================================== -->

        <nav class="top-navigation">


            <!-- Dashboard -->

            <a
                href="dashboard.html"
                class="top-nav-item"
            >

                <i
                    class="fa-solid fa-chart-pie"
                ></i>

                <span>
                    Dashboard
                </span>

            </a>


            <!-- Leads -->

            <a
                href="leads.html"
                class="top-nav-item active"
            >

                <i
                    class="fa-solid fa-users"
                ></i>

                <span>
                    Leads
                </span>

            </a>


            <!-- ==================================
                 MANAGE SALES - ADMIN ONLY
            =================================== -->

            <a
                href="sales.html"
                class="top-nav-item admin-only"
                id="manageSalesNav"
                style="display:none;"
            >

                <i
                    class="fa-solid fa-user-tie"
                ></i>

                <span>
                    Manage Sales
                </span>

            </a>


        </nav>


        <!-- ==================================
             USER MENU
        =================================== -->

        <div class="user-menu-wrapper">

            <button
                id="userMenu"
                class="user-menu"
                type="button"
                aria-haspopup="true"
                aria-expanded="false"
            >

                <span
                    id="userAvatarInitial"
                    class="user-avatar"
                >
                    F
                </span>


                <span
                    id="userInfo"
                    class="user-info"
                >

                    <strong>
                        User
                    </strong>

                    <small>
                        Sales
                    </small>

                </span>


                <i
                    class="fa-solid fa-chevron-down"
                ></i>

            </button>


            <!-- ==================================
                 USER DROPDOWN
            =================================== -->

            <div
                id="userDropdown"
                class="user-dropdown"
                style="display:none;"
            >


                <button
                    id="profileBtn"
                    type="button"
                    onclick="openProfileModal()"
                >

                    <i
                        class="fa-solid fa-user"
                    ></i>

                    <span>
                        Profile
                    </span>

                </button>


                <div class="dropdown-divider"></div>


                <button
                    id="dropdownLogout"
                    class="danger"
                    type="button"
                >

                    <i
                        class="fa-solid fa-right-from-bracket"
                    ></i>

                    <span>
                        Logout
                    </span>

                </button>


            </div>

        </div>

    </div>

</header>


<!-- =========================================================
     MAIN
========================================================= -->

<main class="leads-page">


    <!-- =====================================================
         PAGE HERO
    ====================================================== -->

    <section class="leads-hero">

        <div class="hero-copy">

            <div class="breadcrumb">

                <span>
                    CRM
                </span>

                <i
                    class="fa-solid fa-chevron-right"
                ></i>

                <strong>
                    Leads
                </strong>

            </div>


            <div class="hero-title-row">

                <div>

                    <h1>
                        Customer Leads
                    </h1>

                    <p>
                        Kelola seluruh prospek pelanggan,
                        follow-up, dan pipeline penjualan Anda.
                    </p>

                </div>

            </div>

        </div>


        <div class="hero-actions">

            <button
                type="button"
                class="btn btn-light"
                id="exportLeadsBtn"
            >

                <i
                    class="fa-solid fa-arrow-up-from-bracket"
                ></i>

                Export

            </button>


            <button
                type="button"
                class="btn btn-primary btn-add-lead"
                id="addLeadBtn"
            >

                <i
                    class="fa-solid fa-plus"
                ></i>

                Add New Lead

            </button>

        </div>

    </section>


    <!-- =====================================================
         KPI MINI CARDS
    ====================================================== -->

    <section class="lead-kpis">


        <!-- Total Leads -->

        <div class="lead-kpi-card">

            <div class="lead-kpi-icon blue">

                <i
                    class="fa-solid fa-users"
                ></i>

            </div>


            <div class="lead-kpi-content">

                <span>
                    Total Leads
                </span>

                <strong id="kpiTotalLeads">
                    0
                </strong>

                <small>
                    Semua customer
                </small>

            </div>

        </div>


        <!-- Follow Up -->

        <div class="lead-kpi-card">

            <div class="lead-kpi-icon orange">

                <i
                    class="fa-solid fa-clock"
                ></i>

            </div>


            <div class="lead-kpi-content">

                <span>
                    Follow Up
                </span>

                <strong id="kpiFollowUp">
                    0
                </strong>

                <small>
                    Perlu ditindaklanjuti
                </small>

            </div>

        </div>


        <!-- Appointment -->

        <div class="lead-kpi-card">

            <div class="lead-kpi-icon purple">

                <i
                    class="fa-solid fa-calendar-check"
                ></i>

            </div>


            <div class="lead-kpi-content">

                <span>
                    Appointment
                </span>

                <strong id="kpiAppointment">
                    0
                </strong>

                <small>
                    Jadwal customer
                </small>

            </div>

        </div>


        <!-- Closing -->

        <div class="lead-kpi-card">

            <div class="lead-kpi-icon green">

                <i
                    class="fa-solid fa-circle-check"
                ></i>

            </div>


            <div class="lead-kpi-content">

                <span>
                    Closing
                </span>

                <strong id="kpiClosing">
                    0
                </strong>

                <small>
                    Customer closing
                </small>

            </div>

        </div>

    </section>


    <!-- =====================================================
         FILTER PANEL
    ====================================================== -->

    <section class="lead-filter-card">


        <!-- Filter Header -->

        <div class="filter-top">

            <div class="filter-heading">

                <div class="filter-heading-icon">

                    <i
                        class="fa-solid fa-sliders"
                    ></i>

                </div>


                <div>

                    <strong>
                        Lead Database
                    </strong>

                    <span>
                        Search & filter customer
                    </span>

                </div>

            </div>


            <button
                type="button"
                class="filter-reset"
                id="resetFiltersBtn"
            >

                <i
                    class="fa-solid fa-rotate-left"
                ></i>

                Reset Filter

            </button>

        </div>


        <!-- ==============================================
             FILTERS
        =============================================== -->

        <div class="lead-filters">


            <!-- Search -->

            <div class="filter-field search-field">

                <label>
                    Search Customer
                </label>

                <div class="input-with-icon">

                    <i
                        class="fa-solid fa-magnifying-glass"
                    ></i>

                    <input
                        type="search"
                        id="leadSearch"
                        placeholder="Nama, phone, business..."
                        autocomplete="off"
                    >

                </div>

            </div>


            <!-- Status -->

            <div class="filter-field">

                <label>
                    Status
                </label>

                <div class="select-wrap">

                    <select id="statusFilter">

                        <option value="">
                            All Status
                        </option>

                    </select>

                </div>

            </div>


            <!-- Business -->

            <div class="filter-field">

                <label>
                    Business
                </label>

                <div class="select-wrap">

                    <select id="businessFilter">

                        <option value="">
                            All Business
                        </option>

                    </select>

                </div>

            </div>


            <!-- Location -->

            <div class="filter-field">

                <label>
                    Location
                </label>

                <div class="input-with-icon">

                    <i
                        class="fa-solid fa-location-dot"
                    ></i>

                    <input
                        type="text"
                        id="locationFilter"
                        placeholder="Location..."
                    >

                </div>

            </div>


            <!-- ==========================================
                 SALES FILTER - ADMIN ONLY
            =========================================== -->

            <div
                class="filter-field admin-only"
                id="salesFilterWrapper"
            >

                <label>
                    Sales
                </label>

                <div class="select-wrap">

                    <select id="salesFilter">

                        <option value="">
                            All Sales
                        </option>

                    </select>

                </div>

            </div>

        </div>

    </section>


    <!-- =====================================================
         TABLE CARD
    ====================================================== -->

    <section class="leads-table-card">


        <!-- Table Header -->

        <div class="table-card-header">

            <div class="table-title-area">

                <div class="table-title-icon">

                    <i
                        class="fa-solid fa-database"
                    ></i>

                </div>


                <div>

                    <h2>
                        Customer Database
                    </h2>

                    <span id="leadCountLabel">
                        0 leads
                    </span>

                </div>

            </div>


            <div class="table-header-tools">

                <span class="database-status">

                    <i></i>

                    Database Connected

                </span>

            </div>

        </div>


        <!-- =================================================
             TABLE
        ================================================== -->

        <div class="table-scroll">

            <table class="leads-table">

                <thead>

                    <tr>

                        <th class="col-no">
                            #
                        </th>

                        <th class="col-customer">
                            Customer
                        </th>

                        <th>
                            Business
                        </th>

                        <th>
                            Location
                        </th>

                        <th>
                            Status
                        </th>

                        <th>
                            Sales
                        </th>

                        <th>
                            Contact
                        </th>

                        <th>
                            Follow Up
                        </th>

                        <th>
                            Created
                        </th>

                        <th class="col-action">
                            Action
                        </th>

                    </tr>

                </thead>


                <tbody id="leadsTableBody">
                    <!-- JavaScript -->
                </tbody>

            </table>


            <!-- Empty State -->

            <div
                class="leads-empty"
                id="leadsEmptyState"
                style="display:none;"
            >

                <div class="empty-icon">

                    <i
                        class="fa-solid fa-user-group"
                    ></i>

                </div>


                <h3>
                    No Leads Found
                </h3>


                <p>
                    Belum ada customer yang sesuai
                    dengan filter Anda.
                </p>


                <button
                    type="button"
                    class="btn btn-primary"
                    id="emptyAddLeadBtn"
                >

                    <i
                        class="fa-solid fa-plus"
                    ></i>

                    Add New Lead

                </button>

            </div>

        </div>


        <!-- =================================================
             PAGINATION
        ================================================== -->

        <div
            class="leads-pagination"
            id="leadsPagination"
        >

            <div class="pagination-info">

                Showing

                <strong id="paginationStart">
                    0
                </strong>

                –

                <strong id="paginationEnd">
                    0
                </strong>

                of

                <strong id="paginationTotal">
                    0
                </strong>

            </div>


            <div class="pagination-controls">

                <button
                    type="button"
                    id="prevPageBtn"
                    class="page-btn"
                    disabled
                >

                    <i
                        class="fa-solid fa-chevron-left"
                    ></i>

                </button>


                <div
                    id="paginationNumbers"
                    class="pagination-numbers"
                ></div>


                <button
                    type="button"
                    id="nextPageBtn"
                    class="page-btn"
                >

                    <i
                        class="fa-solid fa-chevron-right"
                    ></i>

                </button>

            </div>

        </div>

    </section>

</main>


<!-- =========================================================
     ADD / EDIT LEAD MODAL
========================================================= -->

<div
    class="modal-overlay"
    id="leadModal"
    style="display:none;"
>

    <div class="lead-modal">


        <!-- Modal Header -->

        <div class="modal-header">

            <div class="modal-title">

                <div class="modal-title-icon">

                    <i
                        class="fa-solid fa-user-plus"
                    ></i>

                </div>


                <div>

                    <h3 id="leadModalTitle">
                        Add New Lead
                    </h3>

                    <span>
                        Customer information
                    </span>

                </div>

            </div>


            <button
                type="button"
                class="modal-close"
                data-close-modal="leadModal"
            >

                <i
                    class="fa-solid fa-xmark"
                ></i>

            </button>

        </div>


        <!-- Form -->

        <form id="leadForm">

            <input
                type="hidden"
                id="leadId"
            >


            <div class="modal-body">


                <!-- Customer Information -->

                <div class="form-section">

                    <div class="form-section-title">

                        <i
                            class="fa-solid fa-user"
                        ></i>

                        Customer Information

                    </div>


                    <div class="form-grid">


                        <!-- Customer Name -->

                        <div class="form-group full">

                            <label>
                                Customer Name
                                <span>*</span>
                            </label>

                            <input
                                type="text"
                                id="leadCustomerName"
                                placeholder="Nama customer"
                                required
                            >

                        </div>


                        <!-- Phone -->

                        <div class="form-group">

                            <label>
                                Phone
                            </label>

                            <input
                                type="text"
                                id="leadPhone"
                                placeholder="08xxxxxxxxxx"
                            >

                        </div>


                        <!-- Business -->

                        <div class="form-group">

                            <label>
                                Business
                            </label>

                            <input
                                type="text"
                                id="leadBusiness"
                                placeholder="Residential / Villa / Hotel..."
                            >

                        </div>


                        <!-- Location -->

                        <div class="form-group">

                            <label>
                                Location
                            </label>

                            <input
                                type="text"
                                id="leadLocation"
                                placeholder="Denpasar / Sanur / Seminyak..."
                            >

                        </div>

                    </div>

                </div>


                <!-- Sales Pipeline -->

                <div class="form-section">

                    <div class="form-section-title">

                        <i
                            class="fa-solid fa-chart-line"
                        ></i>

                        Sales Pipeline

                    </div>


                    <div class="form-grid">


                        <!-- Status -->

                        <div class="form-group">

                            <label>
                                Status
                            </label>

                            <select id="leadStatus"></select>

                        </div>


                        <!-- Assign Sales -->

                        <div
                            class="form-group admin-only"
                            id="leadSalesAssignWrapper"
                        >

                            <label>
                                Assign Sales
                            </label>

                            <select id="leadSalesAssign"></select>

                        </div>


                        <!-- Follow Up -->

                        <div class="form-group">

                            <label>
                                Follow Up Date
                            </label>

                            <input
                                type="date"
                                id="leadFollowUpDate"
                            >

                        </div>


                        <!-- Appointment -->

                        <div class="form-group">

                            <label>
                                Appointment
                            </label>

                            <input
                                type="date"
                                id="leadAppointment"
                            >

                        </div>


                        <!-- Site Survey -->

                        <div class="form-group">

                            <label>
                                Site Survey
                            </label>

                            <input
                                type="date"
                                id="leadSiteSurvey"
                            >

                        </div>


                        <!-- Quotation -->

                        <div class="form-group">

                            <label>
                                Quotation
                            </label>

                            <input
                                type="date"
                                id="leadQuotation"
                            >

                        </div>


                        <!-- SPK -->

                        <div class="form-group">

                            <label>
                                SPK
                            </label>

                            <input
                                type="date"
                                id="leadSpk"
                            >

                        </div>


                        <!-- Closing -->

                        <div class="form-group">

                            <label>
                                Closing
                            </label>

                            <input
                                type="date"
                                id="leadClosing"
                            >

                        </div>

                    </div>

                </div>


                <!-- Notes -->

                <div class="form-section">

                    <div class="form-section-title">

                        <i
                            class="fa-regular fa-note-sticky"
                        ></i>

                        Notes

                    </div>


                    <div class="form-group">

                        <textarea
                            id="leadNotes"
                            rows="4"
                            placeholder="Catatan customer, kebutuhan PLTS, budget, follow-up..."
                        ></textarea>

                    </div>

                </div>


                <div
                    id="leadFormMessage"
                    class="form-message"
                ></div>

            </div>


            <!-- Modal Footer -->

            <div class="modal-footer">

                <button
                    type="button"
                    class="btn btn-light"
                    data-close-modal="leadModal"
                >
                    Cancel
                </button>


                <button
                    type="submit"
                    class="btn btn-primary"
                    id="saveLeadBtn"
                >

                    <i
                        class="fa-solid fa-floppy-disk"
                    ></i>

                    Save Lead

                </button>

            </div>

        </form>

    </div>

</div>


<!-- =========================================================
     CONFIRM MODAL
========================================================= -->

<div
    class="modal-overlay"
    id="confirmModal"
    style="display:none;"
>

    <div class="confirm-modal">


        <div class="confirm-icon">

            <i
                class="fa-solid fa-triangle-exclamation"
            ></i>

        </div>


        <h3 id="confirmTitle">
            Confirm Action
        </h3>


        <p id="confirmMessage">
            Are you sure?
        </p>


        <div class="confirm-actions">

            <button
                type="button"
                class="btn btn-light"
                data-close-modal="confirmModal"
            >
                Cancel
            </button>


            <button
                type="button"
                class="btn btn-danger"
                id="confirmActionBtn"
            >
                Confirm
            </button>

        </div>

    </div>

</div>


<!-- =========================================================
     PROFILE MODAL
========================================================= -->

<div
    class="modal-overlay"
    id="profileModal"
    style="display:none;"
>

    <div class="profile-modal">


        <button
            type="button"
            class="modal-close"
            data-close-modal="profileModal"
        >

            <i
                class="fa-solid fa-xmark"
            ></i>

        </button>


        <div id="userProfileContent"></div>

    </div>

</div>


<!-- =========================================================
     TOAST
========================================================= -->

<div
    id="toastContainer"
    class="toast-container"
    aria-live="polite"
    aria-atomic="true"
></div>


<!-- =========================================================
     SUPABASE
========================================================= -->

<script
    src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
></script>


<!-- =========================================================
     FSI CRM JAVASCRIPT
========================================================= -->

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
