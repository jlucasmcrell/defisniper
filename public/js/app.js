/**
 * Main application script for CryptoSniperBot UI
 * Handles initialization and global functionality
 */

// Global notification function
function showNotification(message, type = 'info') {
    // Implementation depends on your UI framework
    // For example, using Bootstrap toasts:
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : 'primary'} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Create and show Bootstrap Toast
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 5000
    });
    bsToast.show();
    
    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', () => {
        toastContainer.removeChild(toast);
    });
}

// Global function to update bot status indicator
function updateBotStatus(isRunning) {
    const indicator = document.getElementById('bot-status-indicator');
    const text = document.getElementById('bot-status-text');
    
    if (!indicator || !text) return;
    
    if (isRunning) {
        indicator.className = 'status-indicator bg-success';
        text.textContent = 'Running';
    } else {
        indicator.className = 'status-indicator bg-danger';
        text.textContent = 'Stopped';
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('CryptoSniperBot UI initialized');
    
    // Set up global AJAX error handling
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        try {
            const response = await originalFetch(...args);
            
            // Handle 401 Unauthorized responses
            if (response.status === 401) {
                // Check if this is not a login request to avoid redirect loops
                if (!args[0].includes('/api/auth/login') && !args[0].includes('/api/auth/status')) {
                    console.warn('Session expired or unauthorized, redirecting to login');
                    if (window.auth && typeof window.auth.showLoginScreen === 'function') {
                        window.auth.showLoginScreen();
                    }
                    showNotification('Your session has expired. Please log in again.', 'error');
                }
            }
            
            return response;
        } catch (error) {
            // Handle network errors
            console.error('Network error:', error);
            
            // Only show notification for non-login requests to avoid loops
            if (!args[0].includes('/api/auth/login')) {
                showNotification('Network error. Please check your connection.', 'error');
            }
            
            throw error;
        }
    };
    
    // Set up tab navigation
    document.querySelectorAll('a[data-bs-toggle="tab"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', (event) => {
            const targetId = event.target.getAttribute('href');
            
            // Load tab-specific data
            switch (targetId) {
                case '#dashboard':
                    if (window.dashboard && typeof window.dashboard.fetchStats === 'function') {
                        window.dashboard.fetchStats();
                        window.dashboard.fetchBalances();
                        window.dashboard.fetchTrades();
                    }
                    break;
                case '#trades':
                    if (window.trades && typeof window.trades.fetchTradeHistory === 'function') {
                        window.trades.fetchTradeHistory();
                    }
                    break;
                case '#settings':
                    if (window.settings && typeof window.settings.loadConfiguration === 'function') {
                        window.settings.loadConfiguration();
                    }
                    break;
                case '#logs':
                    // Logs are handled via socket.io
                    break;
            }
        });
    });
});

// Make functions globally available
window.showNotification = showNotification;
window.updateBotStatus = updateBotStatus;