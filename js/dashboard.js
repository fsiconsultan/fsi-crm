const dashboardManager = {
    loadDashboardStats: async () => {
        try {
            let query = supabase.from('leads').select('status, id');
            
            // Filter data untuk Sales non-admin
            if (!authManager.isAdmin()) {
                query = query.eq('sales_id', authManager.currentUser.id);
            }

            const { data, error } = await query;
            if (error) throw error;

            const total = data.length;
            const qualified = data.filter(l => ['Interested', 'Qualified', 'Quotation'].includes(l.status)).length;
            const appointments = data.filter(l => l.status === 'Appointment' || l.status === 'Site Survey').length;
            const closed = data.filter(l => l.status === 'Closing' || l.status === 'SPK').length;

            document.getElementById('stat-total').innerText = total;
            document.getElementById('stat-qualified').innerText = qualified;
            document.getElementById('stat-appointments').innerText = appointments;
            document.getElementById('stat-closed').innerText = closed;

            await dashboardManager.renderRecentLeads();

        } catch (error) {
            console.error('Error load stats:', error);
            helpers.showToast('Gagal memuat data statistik dashboard', 'error');
        }
    },

    renderRecentLeads: async () => {
        try {
            let query = supabase
                .from('leads')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);

            if (!authManager.isAdmin()) {
                query = query.eq('sales_id', authManager.currentUser.id);
            }
            
            const { data, error } = await query;
            if (error) throw error;

            const tbody = document.getElementById('dash-recent-leads');
            if (!tbody) return;
            tbody.innerHTML = '';
            
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">Belum ada data leads.</td></tr>';
                return;
            }

            data.forEach(lead => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${helpers.escapeHTML(lead.customer_name)}</td>
                    <td>${helpers.escapeHTML(lead.business || '-')}</td>
                    <td><span class="badge ${helpers.getBadgeClass(lead.status)}">${helpers.escapeHTML(lead.status)}</span></td>
                    <td>${helpers.formatDate(lead.created_at)}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            console.error('Error recent leads:', error);
        }
    }
};
