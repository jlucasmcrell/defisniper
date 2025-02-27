class Dashboard {
    constructor() {
        this.socket = io();
        this.isAuthenticated = false;
        this.initialized = false;
        this.setupEventListeners();
        this.initializeSocketListeners();
        this.checkAuthStatus();
        
        // Set initial active tab
        this.currentTab = 'dashboard';
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetTab = e.target.getAttribute('data-tab');
                if (targetTab) {
                    this.switchTab(targetTab);
                }
            });
        });

        // Bot control buttons
        const startButton = document.getElementById('startBot');
        const stopButton = document.getElementById('stopBot');

        if (startButton) {
            startButton.addEventListener('click', () => this.controlBot('start'));
        }
        if (stopButton) {
            stopButton.addEventListener('click', () => this.controlBot('stop'));
        }

        // Settings form
        const settingsForm = document.getElementById('settingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => this.handleSettingsSubmit(e));
        }

        // Log controls
        const logLevel = document.getElementById('logLevel');
        const clearLogs = document.getElementById('clearLogs');
        const exportLogs = document.getElementById('exportLogs');

        if (logLevel) {
            logLevel.addEventListener('change', (e) => this.filterLogs(e.target.value));
        }
        if (clearLogs) {
            clearLogs.addEventListener('click', () => this.clearLogs());
        }
        if (exportLogs) {
            exportLogs.addEventListener('click', () => this.exportLogs());
        }
    }

    switchTab(tabId) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Remove active class from all nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Show selected tab content and set nav link as active
        const selectedTab = document.getElementById(tabId);
        const selectedLink = document.querySelector(`[data-tab="${tabId}"]`);

        if (selectedTab && selectedLink) {
            selectedTab.classList.add('active');
            selectedLink.classList.add('active');
            this.currentTab = tabId;

            // Special handling for different tabs
            if (tabId === 'logs') {
                this.refreshLogs();
            } else if (tabId === 'settings') {
                this.loadSettings();
            }
        }
    }

    async controlBot(action) {
        try {
            const response = await fetch(`/api/bot/${action}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error(`Failed to ${action} bot`);
            }

            const result = await response.json();
            if (result.success) {
                this.updateBotStatus(action === 'start');
            } else {
                this.showError(`Failed to ${action} bot: ${result.message}`);
            }
        } catch (error) {
            console.error(`Error ${action}ing bot:`, error);
            this.showError(`Failed to ${action} bot`);
        }
    }

    updateBotStatus(isRunning) {
        const startButton = document.getElementById('startBot');
        const stopButton = document.getElementById('stopBot');
        const statusDot = document.querySelector('#botStatus .status-dot');
        const statusText = document.querySelector('#botStatus .status-text');

        if (startButton) {
            startButton.disabled = isRunning;
        }
        if (stopButton) {
            stopButton.disabled = !isRunning;
        }
        if (statusDot) {
            statusDot.classList.toggle('active', isRunning);
        }
        if (statusText) {
            statusText.textContent = isRunning ? 'Running' : 'Stopped';
        }
    }

    async handleSettingsSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const settings = {};

        formData.forEach((value, key) => {
            // Handle nested object paths (e.g., "trading.walletBuyPercentage")
            const parts = key.split('.');
            let current = settings;
            
            for (let i = 0; i < parts.length - 1; i++) {
                current[parts[i]] = current[parts[i]] || {};
                current = current[parts[i]];
            }
            
            // Convert string numbers to actual numbers
            const numValue = Number(value);
            current[parts[parts.length - 1]] = isNaN(numValue) ? value : numValue;
        });

        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify(settings)
            });

            if (!response.ok) {
                throw new Error('Failed to save settings');
            }

            const result = await response.json();
            if (result.success) {
                this.showSuccess('Settings saved successfully');
            } else {
                this.showError(`Failed to save settings: ${result.message}`);
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showError('Failed to save settings');
        }
    }

    async loadSettings() {
        try {
            const response = await fetch('/api/settings', {
                method: 'GET',
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error('Failed to load settings');
            }

            const settings = await response.json();
            
            // Populate form fields
            const form = document.getElementById('settingsForm');
            if (form) {
                Object.entries(this.flattenObject(settings)).forEach(([key, value]) => {
                    const input = form.querySelector(`[name="${key}"]`);
                    if (input) {
                        if (input.type === 'checkbox') {
                            input.checked = value;
                        } else {
                            input.value = value;
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showError('Failed to load settings');
        }
    }

    flattenObject(obj, prefix = '') {
        return Object.keys(obj).reduce((acc, k) => {
            const pre = prefix.length ? prefix + '.' : '';
            if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
                Object.assign(acc, this.flattenObject(obj[k], pre + k));
            } else {
                acc[pre + k] = obj[k];
            }
            return acc;
        }, {});
    }

    initializeSocketListeners() {
        this.socket.on('connect', () => {
            this.updateConnectionStatus(true);
        });

        this.socket.on('disconnect', () => {
            this.updateConnectionStatus(false);
        });

        this.socket.on('botStatus', (data) => {
            this.updateBotStatus(data.running);
            if (data.activeTrades) {
                this.updateActiveTrades(data.activeTrades);
            }
            if (data.stats) {
                this.updateStats(data.stats);
            }
        });

        this.socket.on('log', (log) => {
            this.addLogEntry(log);
        });

        this.socket.on('walletBalances', (balances) => {
            this.displayWalletBalances(balances);
        });

        this.socket.on('newTrade', (trade) => {
            this.addActiveTrade(trade);
        });

        this.socket.on('tradeClosed', (trade) => {
            this.removeActiveTrade(trade.id);
            this.addTradeHistory(trade);
        });
    }

    updateConnectionStatus(connected) {
        const statusDot = document.querySelector('#connectionStatus .status-dot');
        const statusText = document.querySelector('#connectionStatus .status-text');

        if (statusDot) {
            statusDot.classList.toggle('active', connected);
        }
        if (statusText) {
            statusText.textContent = connected ? 'Connected' : 'Disconnected';
        }
    }

    showSuccess(message) {
        alert(message); // Replace with better UI notification
    }

    showError(message) {
        alert(message); // Replace with better UI notification
    }

    async checkAuthStatus() {
        try {
            const response = await fetch('/auth/status', {
                credentials: 'same-origin'
            });
            const data = await response.json();

            if (!data.authenticated) {
                window.location.href = '/login';
                return;
            }

            this.isAuthenticated = true;
            this.updateBotStatus(false);
            await this.updateWalletBalances();
        } catch (error) {
            console.error('Error checking auth status:', error);
            this.showError('Failed to check authentication status');
        }
    }

    async updateWalletBalances() {
        try {
            const response = await fetch('/api/wallets', {
                credentials: 'same-origin'
            });
            if (!response.ok) {
                throw new Error('Failed to fetch wallet balances');
            }
            const balances = await response.json();
            this.displayWalletBalances(balances);
        } catch (error) {
            console.error('Error updating wallet balances:', error);
            if (this.initialized) {
                this.showError('Failed to update wallet balances');
            }
        }
    }

    displayWalletBalances(balances) {
        const walletList = document.getElementById('walletBalances');
        if (!walletList) return;

        walletList.innerHTML = '';
        Object.entries(balances).forEach(([chain, balance]) => {
            const li = document.createElement('li');
            li.className = 'mb-2';
            li.innerHTML = `
                <span class="font-bold">${chain}:</span>
                <span class="ml-2">${balance}</span>
            `;
            walletList.appendChild(li);
        });
    }

    filterLogs(level) {
        const logContainer = document.getElementById('logOutput');
        if (!logContainer) return;

        const entries = logContainer.getElementsByClassName('log-entry');
        Array.from(entries).forEach(entry => {
            if (level === 'all' || entry.classList.contains(level)) {
                entry.style.display = '';
            } else {
                entry.style.display = 'none';
            }
        });
    }

    clearLogs() {
        const logContainer = document.getElementById('logOutput');
        if (logContainer) {
            logContainer.innerHTML = '';
        }
    }

    exportLogs() {
        const logContainer = document.getElementById('logOutput');
        if (!logContainer) return;

        const logs = Array.from(logContainer.getElementsByClassName('log-entry'))
            .map(entry => entry.textContent)
            .join('\n');

        const blob = new Blob([logs], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bot-logs-${new Date().toISOString()}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    refreshLogs() {
        // Implement log refresh logic here
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});