// Show main app UI
function showMainApp() {
    loginScreen.classList.add('d-none');
    mainApp.classList.remove('d-none');
}

// Show login screen
function showLoginScreen() {
    mainApp.classList.add('d-none');
    loginScreen.classList.remove('d-none');
    
    // Clear password field
    const passwordField = document.getElementById('password');
    if (passwordField) {
        passwordField.value = '';
    }
}

// Update bot status indicator
function updateBotStatus(isRunning) {
    const indicator = document.getElementById('bot-status-indicator');
    const text = document.getElementById('bot-status-text');
    
    if (isRunning) {
        indicator.className = 'status-indicator bg-success';
        text.textContent = 'Running';
    } else {
        indicator.className = 'status-indicator bg-danger';
        text.textContent = 'Stopped';
    }
}

// Connect to Socket.IO
function connectToSocketIO() {
    const socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to socket server');
        socket.emit('authenticate', { authenticated: true });
    });
    
    socket.on('authenticated', (data) => {
        console.log('Socket authenticated:', data);
    });
    
    socket.on('botStarted', (data) => {
        updateBotStatus(true);
        showNotification('Bot started successfully');
    });
    
    socket.on('botStopped', (data) => {
        updateBotStatus(false);
        showNotification('Bot stopped');
    });
    
    // Other socket event handlers...
    
    // Store socket in window for global access
    window.socket = socket;
}

// Show notification
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
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', () => {
        toastContainer.removeChild(toast);
    });
}

// Load initial dashboard data
function loadDashboardData() {
    // Implement data loading for dashboard
    // For example:
    fetchStats();
    fetchBalances();
    fetchTrades();
}

// Event listeners
if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const passwordField = document.getElementById('password');
        const password = passwordField.value.trim();
        
        if (!password) {
            showLoginError('Password cannot be empty');
            return;
        }
        
        try {
            const loginSuccess = await login(password);
            if (loginSuccess) {
                // Check auth status to update UI
                await checkAuthStatus();
            } else {
                showLoginError('Login failed. Please try again.');
            }
        } catch (error) {
            showLoginError(error.message || 'Login failed. Please try again.');
        }
    });
}

if (logoutButton) {
    logoutButton.addEventListener('click', (event) => {
        event.preventDefault();
        logout();
    });
}

// Helper for displaying login errors
function showLoginError(message) {
    if (loginError) {
        loginError.textContent = message;
        loginError.classList.remove('d-none');
        
        // Hide after 5 seconds
        setTimeout(() => {
            loginError.classList.add('d-none');
        }, 5000);
    }
}

// Check authentication status when page loads
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
});