const authManager = {
    currentUser: null,
    currentProfile: null,

    init: async () => {
        helpers.showLoading();
        try {
            // Cek sesi login aktif di Supabase
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (session && session.user) {
                await authManager.loadUserProfile(session.user);
            } else {
                helpers.hideLoading();
                appNavigation.showLogin();
            }
        } catch (err) {
            console.error('Session error:', err);
            helpers.hideLoading();
            appNavigation.showLogin();
        }

        // Listener Form Login & Logout
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', authManager.handleLogin);
        }
        
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', authManager.handleLogout);
        }
    },

    loadUserProfile: async (user) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            authManager.currentUser = user;
            authManager.currentProfile = data;

            const nameEl = document.getElementById('user-name');
            const roleEl = document.getElementById('user-role');
            
            if (nameEl) nameEl.innerText = data.name || user.email;
            if (roleEl) roleEl.innerText = data.role || 'Sales';

            appNavigation.applyRolePermissions(data.role);
            helpers.hideLoading();
            appNavigation.showApp();
            appNavigation.navigateTo('dashboard');
            
        } catch (error) {
            console.error('Error loading profile:', error);
            helpers.showToast('Gagal memuat profil user: ' + error.message, 'error');
            authManager.handleLogout();
        }
    },

    handleLogin: async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        helpers.showLoading();
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            helpers.hideLoading();
            helpers.showToast('Login gagal: ' + error.message, 'error');
        } else {
            await authManager.loadUserProfile(data.user);
        }
    },

    handleLogout: async () => {
        helpers.showLoading();
        await supabase.auth.signOut();
        authManager.currentUser = null;
        authManager.currentProfile = null;
        helpers.hideLoading();
        appNavigation.showLogin();
    },
    
    isAdmin: () => {
        return authManager.currentProfile && authManager.currentProfile.role === config.ROLES.ADMIN;
    }
};
