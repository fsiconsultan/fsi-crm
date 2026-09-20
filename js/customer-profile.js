const profileManager = {
    viewProfile: async (id) => {
        appNavigation.navigateTo('profile');
        helpers.showLoading();
        
        try {
            const { data, error } = await supabase.from('leads').select(`
                *,
                profiles:sales_id (name)
            `).eq('id', id).single();

            if (error) throw error;
            
            profileManager.renderProfile(data);
        } catch (error) {
            helpers.showToast(error.message, 'error');
        } finally {
            helpers.hideLoading();
        }
    },

    renderProfile: (data) => {
        const container = document.getElementById('profile-container');
        if (!container) return;
        
        const stages = ['New', 'Flyer Sent', 'Interested', 'Follow Up', 'Appointment', 'Site Survey', 'Quotation', 'SPK', 'Closing'];
        const currentStageIndex = stages.indexOf(data.status) !== -1 ? stages.indexOf(data.status) : 0;

        let timelineHTML = '';
        stages.forEach((stage, idx) => {
            const isCompleted = idx <= currentStageIndex;
            timelineHTML += `
                <div class="timeline-item ${isCompleted ? 'completed' : ''}">
                    <div class="timeline-icon"></div>
                    <div class="timeline-content">
                        <h4>${stage}</h4>
                        ${stage === data.status ? `<p>${helpers.formatDate(data.updated_at || data.created_at)}</p>` : ''}
                    </div>
                </div>
            `;
        });

        const waNum = (data.phone || '').replace(/[^0-9]/g, '');
        const waMessage = encodeURIComponent(`Halo Bpk/Ibu dari ${data.business || 'perusahaan'}, saya ${authManager.currentProfile ? authManager.currentProfile.name : 'Sales'} dari FSI CRM...`);
        const waLink = `https://wa.me/${waNum}?text=${waMessage}`;

        container.innerHTML = `
            <div class="profile-card">
                <div class="profile-header">
                    <h3>${helpers.escapeHTML(data.customer_name)}</h3>
                    <p>${helpers.escapeHTML(data.business || '-')} | <span class="badge ${helpers.getBadgeClass(data.status)}">${data.status}</span></p>
                    <a href="${waLink}" target="_blank" class="wa-btn"><i class="fab fa-whatsapp"></i> Chat WhatsApp</a>
                </div>
                <ul class="info-list">
                    <li><span>No. Telepon:</span> <span>${helpers.escapeHTML(data.phone || '-')}</span></li>
                    <li><span>Lokasi:</span> <span>${helpers.escapeHTML(data.location || '-')}</span></li>
                    <li><span>Assigned Sales:</span> <span>${data.profiles ? helpers.escapeHTML(data.profiles.name) : '-'}</span></li>
                    <li><span>Tanggal Dibuat:</span> <span>${helpers.formatDate(data.created_at)}</span></li>
                </ul>
                <div style="margin-top:20px;">
                    <strong>Catatan Terakhir:</strong>
                    <p style="margin-top:10px; background:var(--bg-color); padding:10px; border-radius:4px;">
                        ${helpers.escapeHTML(data.notes) || 'Belum ada catatan.'}
                    </p>
                </div>
            </div>
            
            <div class="profile-card pipeline-container">
                <h3>Pipeline Progress</h3>
                <div class="timeline">
                    ${timelineHTML}
                </div>
            </div>
        `;
    }
};
