/**
 * CryptoSniperBot Dashboard Frontend Application
 * Main entry point for the dashboard interface
 */

class Dashboard {
    constructor() {
        this.socket = io();
        this.trades = {
            active: new Map(),
            history: []
        };
        this.stats = {
            activeTrades: 0,
            totalTrades: 0,
            successRate: 0,
            totalProfit: 0
        };
        this.botRunning = false;
        this.currentTab = 'dashboard';
        this.logBuffer = [];
        this.maxLogEntries = 1000;

        this.initializeSocketListeners();
        this.initializeEventListeners();
        this.fetchInitialData();
    }

    initializeSocketListeners() {
        this.socket.on('connect', () => {
            this.updateConnectionStatus(true);
        });

        this.socket.on('disconnect', () => {
            this.updateConnectionStatus(false);
        });

        this.socket.on('botStatus', (status) => {
            this.updateBotStatus(status.running);
        });

        this.socket.on('tradeUpdate', (trades) => {
            this.updateTrades(trades);
        });

        this.socket.on('statsUpdate', (stats) => {
            this.updateStatistics(stats);
        });

        this.socket.on('log', (logEntry) => {
            this.addLogEntry(logEntry);
        });
    }

    initializeEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = link.getAttribute('data-tab');
                this.switchTab(tabId);
            });
        });

        // Bot Controls
        document.getElementById('startBot').addEventListener('click', () => this.startBot());
        document.getElementById('stopBot').addEventListener('click', () => this.stopBot());

        // Settings Form
        document.getElementById('settingsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });

        // Log Controls
        document.getElementById('logLevel').addEventListener('change', () => this.filterLogs());
        document.getElementById('clearLogs').addEventListener('click', () => this.clearLogs());
        document.getElementById('exportLogs').addEventListener('click', () => this.exportLogs());
    }

    async fetchInitialData() {
        try {
            const [statusResponse, settingsResponse] = await Promise.all([
                fetch('/api/status'),
                fetch('/api/settings')
            ]);

            if (!statusResponse.ok || !settingsResponse.ok) {
                throw new Error('Failed to fetch initial data');
            }

            const status = await statusResponse.json();
            const settings = await settingsResponse.json();

            this.updateBotStatus(status.running);
            this.populateSettings(settings);

            if (status.stats) {
                this.updateStatistics(status.stats);
            }
            if (status.trades) {
                this.updateTrades(status.trades);
            }
        } catch (error) {
            console.error('Error fetching initial data:', error);
            this.showError('Failed to load initial data');
        }
    }

    async startBot() {
        try {
            const response = await fetch('/api/bot/start', {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error('Failed to start bot');
            }
        } catch (error) {
            console.error('Error starting bot:', error);
            this.showError('Failed to start bot');
        }
    }

    async stopBot() {
        try {
            const response = await fetch('/api/bot/stop', {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error('Failed to stop bot');
            }
        } catch (error) {
            console.error('Error stopping bot:', error);
            this.showError('Failed to stop bot');
        }
    }

    async saveSettings() {
        try {
            const form = document.getElementById('settingsForm');
            const formData = new FormData(form);
            const settings = {};

            formData.forEach((value, key) => {
                const keys = key.split('.');
                let current = settings;
                
                for (let i = 0; i < keys.length - 1; i++) {
                    current[keys[i]] = current[keys[i]] || {};
                    current = current[keys[i]];
                }
                
                current[keys[keys.length - 1]] = value;
            });

            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });

            if (!response.ok) {
                throw new Error('Failed to save settings');
            }

            this.showSuccess('Settings saved successfully');
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showError('Failed to save settings');
        }
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        const dot = statusElement.querySelector('.status-dot');
        const text = statusElement.querySelector('.status-text');

        if (connected) {
            dot.classList.add('connected');
            text.textContent = 'Connected';
        } else {
            dot.classList.remove('connected');
            text.textContent = 'Disconnected';
        }
    }

    updateBotStatus(running) {
        this.botRunning = running;
        const statusElement = document.getElementById('botStatus');
        const dot = statusElement.querySelector('.status-dot');
        const text = statusElement.querySelector('.status-text');
        
        if (running) {
            dot.classList.add('connected');
            text.textContent = 'Running';
            document.getElementById('startBot').disabled = true;
            document.getElementById('stopBot').disabled = false;
        } else {
            dot.classList.remove('connected');
            text.textContent = 'Stopped';
            document.getElementById('startBot').disabled = false;
            document.getElementById('stopBot').disabled = true;
        }
    }

    updateTrades(trades) {
        // Update active trades
        const activeTradesTable = document.getElementById('activeTradesBody');
        activeTradesTable.innerHTML = '';

        trades.active.forEach(trade => {
            const row = activeTradesTable.insertRow();
            const profitLoss = this.calculateProfitLoss(trade);
            const duration = this.calculateDuration(trade.timestamp);
            
            row.innerHTML = `
                <td>${trade.token.symbol}</td>
                <td>${trade.exchange || 'DEX'}</td>
                <td>$${trade.entryPrice.toFixed(2)}</td>
                <td>$${trade.currentPrice.toFixed(2)}</td>
                <td class="${profitLoss >= 0 ? 'profit' : 'loss'}">
                    ${profitLoss >= 0 ? '+' : ''}${profitLoss.toFixed(2)}%
                </td>
                <td>${duration}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="dashboard.closeTrade('${trade.id}')">
                        Close
                    </button>
                </td>
            `;
        });

        // Update trade history
        const historyTable = document.getElementById('historyBody');
        historyTable.innerHTML = '';

        trades.history.forEach(trade => {
            const row = historyTable.insertRow();
            const profitLoss = trade.finalProfitLoss;
            const duration = this.calculateDuration(trade.timestamp, trade.closedAt);
            
            row.innerHTML = `
                <td>${trade.token.symbol}</td>
                <td>${trade.exchange || 'DEX'}</td>
                <td>$${trade.entryPrice.toFixed(2)}</td>
                <td>$${trade.exitPrice.toFixed(2)}</td>
                <td class="${profitLoss >= 0 ? 'profit' : 'loss'}">
                    ${profitLoss >= 0 ? '+' : ''}${profitLoss.toFixed(2)}%
                </td>
                <td>${duration}</td>
                <td>${trade.status}</td>
            `;
        });
    }

    updateStatistics(stats) {
        document.getElementById('activeTrades').textContent = stats.activeTrades;
        document.getElementById('totalTrades').textContent = stats.totalTrades;
        document.getElementById('successRate').textContent = `${stats.successRate.toFixed(2)}%`;
        document.getElementById('totalProfit').textContent = `$${stats.totalProfit.toFixed(2)}`;
    }

    addLogEntry(entry) {
        this.logBuffer.push({
            timestamp: new Date().toISOString(),
            level: entry.level,
            message: entry.message
        });

        if (this.logBuffer.length > this.maxLogEntries) {
            this.logBuffer.shift();
        }

        this.updateLogDisplay();
    }

    updateLogDisplay() {
        const selectedLevel = document.getElementById('logLevel').value;
        const logOutput = document.getElementById('logOutput');
        
        const filteredLogs = this.logBuffer.filter(entry => 
            selectedLevel === 'all' || entry.level === selectedLevel
        );

        logOutput.innerHTML = filteredLogs
            .map(entry => `
                <div class="log-entry log-${entry.level}">
                    [${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}
                </div>
            `)
            .join('');

        logOutput.scrollTop = logOutput.scrollHeight;
    }

    switchTab(tabId) {
        this.currentTab = tabId;
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-tab') === tabId) {
                link.classList.add('active');
            }
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            if (content.id === tabId) {
                content.classList.add('active');
            }
        });
    }

    async closeTrade(tradeId) {
        try {
            const response = await fetch(`/api/trades/${tradeId}/close`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error('Failed to close trade');
            }
        } catch (error) {
            console.error('Error closing trade:', error);
            this.showError('Failed to close trade');
        }
    }

    populateSettings(settings) {
        const form = document.getElementById('settingsForm');
        
        const populateFormValues = (obj, prefix = '') => {
            for (const [key, value] of Object.entries(obj)) {
                const fullKey = prefix ? `${prefix}.${key}` : key;
                const element = form.querySelector(`[name="${fullKey}"]`);
                
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = value;
                    } else {
                        element.value = value;
                    }
                } else if (typeof value === 'object' && value !== null) {
                    populateFormValues(value, fullKey);
                }
            }
        };

        populateFormValues(settings);
    }

    calculateProfitLoss(trade) {
        return ((trade.currentPrice - trade.entryPrice) / trade.entryPrice) * 100;
    }

    calculateDuration(startTime, endTime = Date.now()) {
        const diff = new Date(endTime) - new Date(startTime);
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    }

    clearLogs() {
        this.logBuffer = [];
        this.updateLogDisplay();
    }

    exportLogs() {
        const logsText = this.logBuffer
            .map(entry => `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`)
            .join('\n');
        
        const blob = new Blob([logsText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cryptosniperbot-logs-${new Date().toISOString()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showError(message) {
        // Implement error notification
        console.error(message);
        // You can add a toast notification library here
    }

    showSuccess(message) {
        // Implement success notification
        console.log(message);
        // You can add a toast notification library here
    }
}

// Initialize dashboard
const dashboard = new Dashboard();