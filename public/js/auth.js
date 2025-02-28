/**
 * Authentication functions for CryptoSniperBot UI
 */

// DOM elements
const loginForm = document.getElementById('login-form');
const loginScreen = document.getElementById('login-screen');
const mainApp = document.getElementById('main-app');
const logoutButton = document.getElementById('logout-btn');
const loginError = document.getElementById('login-error');
const passwordField = document.getElementById('password');

// Function to check authentication status
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/status', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include' // Important for cookies
        });

        if (!response.ok) {
            throw new Error('Failed to check authentication status');
        }

        const data = await response.json();
        console.log('Auth status:', data);
        
        // Update UI based on authentication status
        if (data.authenticated) {
            showMainApp();
            
            // Update bot status indicator
            if (typeof updateBotStatus === 'function') {
                updateBotStatus(data.running);
            }
            
            // Connect to socket.io if available
            if (window.io) {
                connectToSocketIO();
            }
            
            // Load initial data
            loadDashboardData();
            
            return true;
        } else {
            showLoginScreen();
            return false;
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        showLoginScreen();
        return false;
    }
}

// Function to handle login
async function login(password) {
    try {
        console.log('Attempting login...');
        
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password }),
            credentials: 'include' // Important for cookies
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        console.log('Login successful');
        return true;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

// Function to handle logout
async function logout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include' // Important for cookies
        });

        // Even if logout fails, we'll show the login screen
        showLoginScreen();
        
        console.log('Logout successful');
    } catch (error) {
        console.error('Logout error:', error);
        showLoginScreen();
    }
}

// Show main app UI
function showMainApp() {
    if (!loginScreen || !mainApp) return;
    
    loginScreen.classList.add('d-none');
    mainApp.classList.remove('d-none');
    
    // Initialize dashboard if function exists
    if (window.dashboard && typeof window.dashboard.initDashboard === 'function') {
        window.dashboard.initDashboard();
    }
    
    // Initialize logs if function exists
    if (window.logs && typeof window.logs.initLogs === 'function') {
        window.logs.initLogs();
    }
    
    // Initialize trades if function exists
    if (window.trades && typeof window.trades.initTrades === 'function') {
        window.trades.initTrades();
    }
    
    console.log('Main app UI shown');
}

// Show login screen
function showLoginScreen() {
    if (!loginScreen || !mainApp) return;
    
    mainApp.classList.add('d-none');
    loginScreen.classList.remove('d-none');
    
    // Clear password field
    if (passwordField) {
        passwordField.value = '';
    }
    
    console.log('Login screen shown');
}

// Connect to Socket.IO
function connectToSocketIO() {
    try {
        const socket = io();
        
        socket.on('connect', () => {
            console.log('Connected to socket server');
            socket.emit('authenticate', { authenticated: true });
        });
        
        socket.on('authenticated', (data) => {
            console.log('Socket authenticated:', data);
        });
        
        socket.on('disconnect', () => {
            console.log('Disconnected from socket server');
        });
        
        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });
        
        // Store socket in window for global access
        window.socket = socket;
    } catch (error) {
        console.error('Failed to connect to socket server:', error);
    }
}

// Load initial dashboard data
function loadDashboardData() {
    // Call dashboard data loading functions if they exist
    if (window.dashboard) {
        if (typeof window.dashboard.fetchStats === 'function') {
            window.dashboard.fetchStats();
        }
        
        if (typeof window.dashboard.fetchBalances === 'function') {
            window.dashboard.fetchBalances();
        }
        
        if (typeof window.dashboard.fetchTrades === 'function') {
            window.dashboard.fetchTrades();
        }
    }
}

// Show login error
function showLoginError(message) {
    if (!loginError) return;
    
    loginError.textContent = message;
    loginError.classList.remove('d-none');
    
    // Hide after 5 seconds
    setTimeout(() => {
        loginError.classList.add('d-none');
    }, 5000);
}

// Set up event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Set up login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            // Disable form during login attempt
            const submitButton = loginForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Logging in...';
            }
            
            if (!passwordField) {
                showLoginError('Password field not found');
                return;
            }
            
            const password = passwordField.value.trim();
            
            if (!password) {
                showLoginError('Password cannot be empty');
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Login';
                }
                return;
            }
            
            try {
                const loginSuccess = await login(password);
                if (loginSuccess) {
                    await checkAuthStatus();
                } else {
                    showLoginError('Login failed. Please try again.');
                }
            } catch (error) {
                showLoginError(error.message || 'Login failed. Please try again.');
            } finally {
                // Re-enable the submit button
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Login';
                }
            }
        });
    }
    
    // Set up logout button
    if (logoutButton) {
        logoutButton.addEventListener('click', (event) => {
            event.preventDefault();
            logout();
        });
    }
    
    // Check authentication status when page loads
    console.log('Checking auth status on page load');
    checkAuthStatus();
});

// Export functions for use in other modules
window.auth = {
    checkAuthStatus,
    login,
    logout,
    showMainApp,
    showLoginScreen,
    showLoginError
};