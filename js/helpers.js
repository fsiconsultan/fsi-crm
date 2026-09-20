const helpers = {
    showLoading: () => {
        const el = document.getElementById('global-loading');
        if (el) el.classList.remove('hidden');
    },
    hideLoading: () => {
        const el = document.getElementById('global-loading');
        if (el) el.classList.add('hidden');
    },
    showToast: (message, type = 'success') => {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 3000);
    },
    formatDate: (dateString) => {
        if (!dateString) return '-';
        const options = { day: '2-digit', month: 'short', year: 'numeric' };
        return new Date(dateString).toLocaleDateString('id-ID', options);
    },
    escapeHTML: (str) => {
        if (!str) return '';
        const div = document.createElement('div');
        div.innerText = str;
        return div.innerHTML;
    },
    getBadgeClass: (status) => {
        if (!status) return '';
        return status.replace(/\s+/g, '.');
    }
};
