const leadsManager = {
    currentPage: 1,
    salesList: [],

    init: async () => {
        const leadForm = document.getElementById('form-lead');
        if (leadForm) {
            leadForm.addEventListener('submit', leadsManager.saveLead);
        }
        if (authManager.isAdmin()) {
            await leadsManager.loadSalesDropdown();
        }
    },

    loadSalesDropdown: async () => {
        const { data, error } = await supabase.from('profiles').select('id, name').eq('role', 'sales');
        if (!error && data) {
            leadsManager.salesList = data;
            const filterSelect = document.getElementById('filter-sales');
            const assignSelect = document.getElementById('lead-sales-id');
            
            if (filterSelect) {
                filterSelect.innerHTML = '<option value="">Semua Sales</option>';
                data.forEach(s => {
                    filterSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
                });
            }
            if (assignSelect) {
                assignSelect.innerHTML = '<option value="">Pilih Sales</option>';
                data.forEach(s => {
                    assignSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
                });
            }
        }
    },

    loadLeads: async () => {
        helpers.showLoading();
        try {
            const searchInput = document.getElementById('filter-search');
            const statusInput = document.getElementById('filter-status');
            const salesInput = document.getElementById('filter-sales');

            const search = searchInput ? searchInput.value : '';
            const status = statusInput ? statusInput.value : '';
            const salesId = salesInput ? salesInput.value : '';

            let query = supabase.from('leads').select(`
                *,
                profiles:sales_id (name)
            `, { count: 'exact' });

            if (!authManager.isAdmin()) {
                query = query.eq('sales_id', authManager.currentUser.id);
            } else if (salesId) {
                query = query.eq('sales_id', salesId);
            }

            if (status) query = query.eq('status', status);
            if (search) query = query.or(`customer_name.ilike.%${search}%,business.ilike.%${search}%`);

            // Paginasi
            const from = (leadsManager.currentPage - 1) * config.PAGE_SIZE;
            const to = from + config.PAGE_SIZE - 1;
            query = query.order('created_at', { ascending: false }).range(from, to);

            const { data, count, error } = await query;
            if (error) throw error;

            leadsManager.renderLeads(data || [], count || 0);
        } catch (error) {
            helpers.showToast('Gagal memuat daftar leads: ' + error.message, 'error');
            console.error(error);
        } finally {
            helpers.hideLoading();
        }
    },

    renderLeads: (data, totalCount) => {
        const tbody = document.getElementById('leads-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${authManager.isAdmin() ? 7 : 6}" style="text-align:center">Tidak ada data ditemukan.</td></tr>`;
            return;
        }

        data.forEach(lead => {
            const tr = document.createElement('tr');
            const adminCol = authManager.isAdmin() ? `<td>${lead.profiles ? helpers.escapeHTML(lead.profiles.name) : '-'}</td>` : '';
            
            tr.innerHTML = `
                <td><strong>${helpers.escapeHTML(lead.customer_name)}</strong></td>
                <td>${helpers.escapeHTML(lead.phone || '-')}</td>
                <td>${helpers.escapeHTML(lead.business || '-')}</td>
                <td>${helpers.escapeHTML(lead.location || '-')}</td>
                <td><span class="badge ${helpers.getBadgeClass(lead.status)}">${helpers.escapeHTML(lead.status)}</span></td>
                ${adminCol}
                <td class="action-btns">
                    <button class="action-btn" onclick="profileManager.viewProfile('${lead.id}')" title="Detail Profile"><i class="fas fa-eye"></i></button>
                    <button class="action-btn" onclick="leadsManager.editLead('${lead.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" onclick="leadsManager.deleteLead('${lead.id}')" title="Hapus"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        const pageInfo = document.getElementById('page-info');
        if (pageInfo) pageInfo.innerText = `Page ${leadsManager.currentPage}`;
    },

    nextPage: () => { leadsManager.currentPage++; leadsManager.loadLeads(); },
    prevPage: () => { if (leadsManager.currentPage > 1) { leadsManager.currentPage--; leadsManager.loadLeads(); } },

    openModal: () => {
        document.getElementById('form-lead').reset();
        document.getElementById('lead-id').value = '';
        document.getElementById('modal-lead-title').innerText = 'Add New Lead';
        document.getElementById('modal-lead').classList.remove('hidden');
    },

    closeModal: () => {
        document.getElementById('modal-lead').classList.add('hidden');
    },

    saveLead: async (e) => {
        e.preventDefault();
        helpers.showLoading();
        const id = document.getElementById('lead-id').value;
        const payload = {
            customer_name: document.getElementById('lead-name').value,
            phone: document.getElementById('lead-phone').value,
            business: document.getElementById('lead-business').value,
            location: document.getElementById('lead-location').value,
            status: document.getElementById('lead-status').value,
            notes: document.getElementById('lead-notes').value,
            updated_by: authManager.currentUser.id
        };

        if (authManager.isAdmin()) {
            const sId = document.getElementById('lead-sales-id').value;
            if (sId) payload.sales_id = sId;
        } else if (!id) {
            payload.sales_id = authManager.currentUser.id;
            payload.created_by = authManager.currentUser.id;
        }

        try {
            if (id) {
                const { error } = await supabase.from('leads').update(payload).eq('id', id);
                if (error) throw error;
                helpers.showToast('Lead berhasil diupdate');
            } else {
                const { error } = await supabase.from('leads').insert([payload]);
                if (error) throw error;
                helpers.showToast('Lead baru berhasil ditambahkan');
            }
            leadsManager.closeModal();
            leadsManager.loadLeads();
        } catch (error) {
            helpers.showToast(error.message, 'error');
        } finally {
            helpers.hideLoading();
        }
    },

    editLead: async (id) => {
        helpers.showLoading();
        try {
            const { data, error } = await supabase.from('leads').select('*').eq('id', id).single();
            if (error) throw error;
            
            document.getElementById('lead-id').value = data.id;
            document.getElementById('lead-name').value = data.customer_name;
            document.getElementById('lead-phone').value = data.phone;
            document.getElementById('lead-business').value = data.business;
            document.getElementById('lead-location').value = data.location;
            document.getElementById('lead-status').value = data.status;
            document.getElementById('lead-notes').value = data.notes || '';
            
            if (authManager.isAdmin() && data.sales_id) {
                const assignSelect = document.getElementById('lead-sales-id');
                if (assignSelect) assignSelect.value = data.sales_id;
            }

            document.getElementById('modal-lead-title').innerText = 'Edit Lead';
            document.getElementById('modal-lead').classList.remove('hidden');
        } catch (error) {
            helpers.showToast(error.message, 'error');
        } finally {
            helpers.hideLoading();
        }
    },

    deleteLead: async (id) => {
        if (!confirm('Apakah Anda yakin ingin menghapus lead ini?')) return;
        helpers.showLoading();
        try {
            const { error } = await supabase.from('leads').delete().eq('id', id);
            if (error) throw error;
            helpers.showToast('Lead berhasil dihapus');
            leadsManager.loadLeads();
        } catch (error) {
            helpers.showToast(error.message, 'error');
        } finally {
            helpers.hideLoading();
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => leadsManager.init(), 500); 
});
