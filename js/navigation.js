const appNavigation = {
    showLogin: () => {
        document.getElementById('view-login').classList.remove('hidden');
        document.getElementById('view-app').classList.add('hidden');
    },

    showApp: () => {
        document.getElementById('view-login').classList.add('hidden');
        document.getElementById('view-app').classList.remove('hidden');
        appNavigation.initMenu();
    },

    initMenu: () => {
        const navItems = document.querySelectorAll('.sidebar-nav .nav-item[data-target]');
        navItems.forEach(item => {
            item.onclick = (e) => {
                e.preventDefault();
                const target = e.currentTarget.getAttribute('data-target');
                appNavigation.navigateTo(target);
            };
        });
    },

    navigateTo: (target) => {
        // Update menu aktif
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => el.classList.remove('active'));
        const activeNav = document.querySelector(`.sidebar-nav .nav-item[data-target="${target}"]`);
        if (activeNav) activeNav.classList.add('active');

        // Sembunyikan semua section
        document.querySelectorAll('.content-section').forEach(el => el.classList.add('hidden'));
        
        // Tampilkan section target
        const section = document.getElementById(`section-${target}`);
        if (section) section.classList.remove('hidden');

        // Memuat data sesuai section
        if (target === 'dashboard') dashboardManager.loadDashboardStats();
        if (target === 'leads') leadsManager.loadLeads();
        if (target === 'sales' && authManager.isAdmin()) salesManager.loadSales();
    },

    applyRolePermissions: (role) => {
        const adminElements = document.querySelectorAll('.admin-only');
        if (role === config.ROLES.ADMIN) {
            adminElements.forEach(el => el.classList.remove('hidden'));
        } else {
            adminElements.forEach(el => el.classList.add('hidden'));
        }
    }
};
