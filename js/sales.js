const salesManager = {
    loadSales: async () => {
        helpers.showLoading();
        try {
            const { data, error } = await supabase.from('profiles').select('*').eq('role', 'sales');
            if (error) throw error;
            
            const tbody = document.getElementById('sales-tbody');
            if (!tbody) return;
            tbody.innerHTML = '';
            
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Belum ada tim Sales terdaftar.</td></tr>';
                return;
            }

            data.forEach(sales => {
                const tr = document.createElement('tr');
                const status = sales.status || 'Active';
                tr.innerHTML = `
                    <td><strong>${helpers.escapeHTML(sales.name)}</strong></td>
                    <td>${helpers.escapeHTML(sales.email || '-')}</td>
                    <td><span class="badge" style="background:#6c757d;color:white;">${sales.role}</span></td>
                    <td class="${status === 'Active' ? 'status-active' : 'status-inactive'}">${status}</td>
                    <td class="action-btns">
                        <button class="action-btn" onclick="helpers.showToast('Gunakan dashboard Supabase untuk mengubah kredensial.')" title="Edit"><i class="fas fa-edit"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            helpers.showToast('Gagal memuat tim sales: ' + error.message, 'error');
            console.error(error);
        } finally {
            helpers.hideLoading();
        }
    },

    openModal: () => {
        alert('Untuk menambah akun Sales baru dengan hak akses login, silakan daftarkan Email & Password pengguna baru melalui tab Authentication di Supabase Dashboard Anda.');
    }
};
