// Main application JavaScript
import { initAuth } from './auth.js';
import { initDashboard } from './dashboard.js';
import { initTrades } from './trades.js';
import { initSettings } from './settings.js';
import { SocketManager } from './socket.js';

class App {
    constructor() {
        this.socket = new SocketManager();
        this.currentTab = 'dashboard';
        this.isAuthenticated = false;
        this.botRunning = false;
    }

    async initialize() {
        // Initialize authentication
        await initAuth({
            onLogin: () => this.handleLogin(),
            onLogout: () => this.handleLogout()
        });

        // Initialize UI components
        this.initializeUI();
        
        // Check authentication status
        await this.checkAuthStatus();
        
        // Set up socket events
        this.setupSocketEvents();
    }

    initializeUI() {
        // Tab navigation
        document.querySelectorAll('[data-tab]').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Bot controls
        document.getElementById('start-bot').addEventListener('click', () => this.startBot());
        document.getElementById('stop-bot').addEventListener('click', () => this.stopBot());
        
        // Initialize components
        initDashboard();
        initTrades();
        initSettings();
    }

    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/status', {
                credentials: 'include'
            });
            const data = await response.json();
            
            if (data.authenticated) {
                this.handleLogin();
                if (data.running) {
                    this.updateBotStatus(true);
                }
            }
        } catch (error) {
            console.error('Failed to check auth status:', error);
        }
    }

    setupSocketEvents() {
        this.socket.on('botStatus', (status) => {
            this.updateBotStatus(status.running);
        });

        this.socket.on('error', (error) => {
            this.showNotification(error.message, 'error');
        });
    }

    switchTab(tabName) {
        // Hide all tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        
        // Show selected tab content
        const selectedTab = document.getElementById(tabName);
        if (selectedTab) {
            selectedTab.classList.remove('hidden');
        }
        
        // Update tab navigation styles
        document.querySelectorAll('[data-tab]').forEach(tab => {
            if (tab.dataset.tab === tabName) {
                tab.classList.add('border-brand-primary', 'text-dark-text');
                tab.classList.remove('border-transparent', 'text-dark-text-secondary');
            } else {
                tab.classList.remove('border-brand-primary', 'text-dark-text');
                tab.classList.add('border-transparent', 'text-dark-text-secondary');
            }
        });
        
        this.currentTab = tabName;
    }

    async startBot() {
        try {
            const response = await fetch('/api/bot/start', {
                method: 'POST',
                credentials: 'include'
            });
            const data = await response.json();
            
            if (data.success) {
                this.updateBotStatus(true);
                this.showNotification('Bot started successfully', 'success');
            } else {
                this.showNotification(data.message || 'Failed to start bot', 'error');
            }
        } catch (error) {
            console.error('Failed to start bot:', error);
            this.showNotification('Failed to start bot', 'error');
        }
    }

    async stopBot() {
        try {
            const response = await fetch('/api/bot/stop', {
                method: 'POST',
                credentials: 'include'
            });
            const data = await response.json();
            
            if (data.success) {
                this.updateBotStatus(false);
                this.showNotification('Bot stopped successfully', 'success');
            } else {
                this.showNotification(data.message || 'Failed to stop bot', 'error');
            }
        } catch (error) {
            console.error('Failed to stop bot:', error);
            this.showNotification('Failed to stop bot', 'error');
        }
    }

    updateBotStatus(running) {
        const indicator = document.getElementById('bot-status-indicator');
        const statusText = document.getElementById('bot-status-text');
        
        if (running) {
            indicator.classList.remove('bg-status-danger');
            indicator.classList.add('bg-status-success');
            statusText.textContent = 'Running';
        } else {
            indicator.classList.remove('bg-status-success');
            indicator.classList.add('bg-status-danger');
            statusText.textContent = 'Stopped';
        }
        
        this.botRunning = running;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded shadow-lg z-50 ${
            type === 'success' ? 'bg-status-success' :
            type === 'error' ? 'bg-status-danger' :
            'bg-status-info'
        } text-white`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('opacity-0', 'transition-opacity');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    handleLogin() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        this.isAuthenticated = true;
        this.switchTab(this.currentTab);
    }

    handleLogout() {
        document.getElementById('main-app').classList.add('hidden');
        document.getElementById('login-screen').classList.remove('hidden');
        this.isAuthenticated = false;
    }
}

// Initialize application
const app = new App();
app.initialize();