/**
 * CryptoSniperBot Dashboard Frontend JavaScript
 */

// Initialize Socket.IO connection
const socket = io();

// Global State
let botRunning = false;
let currentSettings = null;
let logBuffer = [];
const MAX_LOG_ENTRIES = 1000;

// DOM Elements
const connectionStatus = document.getElementById('connectionStatus');
const botStatus = document.getElementById('botStatus');
const startBot = document.getElementById('startBot');
const stopBot = document.getElementById('stopBot');
const activeTrades = document.getElementById('activeTrades');
const totalTrades = document.getElementById('totalTrades');
const successRate = document.getElementById('successRate');
const totalProfit = document.getElementById('totalProfit');
const tradesTable = document.getElementById('tradesTable').getElementsByTagName('tbody')[0];
const historyTable = document.getElementById('historyTable').getElementsByTagName('tbody')[0];
const settingsForm = document.getElementById('settingsForm');
const logOutput = document.getElementById('logOutput');
const logLevel = document.getElementById('logLevel');
const clearLogs = document.getElementById('clearLogs');
const exportLogs = document.getElementById('exportLogs');
const navLinks = document.querySelectorAll('.nav-link');
const tabContents = document.querySelectorAll('.tab-content');

// Socket Event Handlers
socket.on('connect', () => {
    updateConnectionStatus(true);
    fetchInitialData();
});

socket.on('disconnect', () => {
    updateConnectionStatus(false);
});

socket.on('botStatus', (status) => {
    updateBotStatus(status.running);
});

socket.on('tradeUpdate', (trades) => {
    updateTrades(trades);
});

socket.on('statsUpdate', (stats) => {
    updateStatistics(stats);
});

socket.on('log', (logEntry) => {
    addLogEntry(logEntry);
});

// Navigation Event Listeners
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const tabId = link.getAttribute('data-tab');
        switchTab(tabId);
    });
});

// Event Listeners
startBot.addEventListener('click', async () => {
    try {
        const response = await fetch('/api/bot/start', {
            method: 'POST',
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to start bot');
        }
        
        updateBotStatus(true);
    } catch (error) {
        console.error('Error starting bot:', error);
        showError('Failed to start bot: ' + error.message);
    }
});

stopBot.addEventListener('click', async () => {
    try {
        const response = await fetch('/api/bot/stop', {
            method: 'POST',
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to stop bot');
        }
        
        updateBotStatus(false);
    } catch (error) {
        console.error('Error stopping bot:', error);
        showError('Failed to stop bot: ' + error.message);
    }
});

settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(settingsForm);
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

    try {
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

        showSuccess('Settings saved successfully');
        currentSettings = settings;
    } catch (error) {
        console.error('Error saving settings:', error);
        showError('Failed to save settings: ' + error.message);
    }
});

logLevel.addEventListener('change', () => {
    filterLogs();
});

clearLogs.addEventListener('click', () => {
    logBuffer = [];
    updateLogDisplay();
});

exportLogs.addEventListener('click', () => {
    const logsText = logBuffer
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
});

// Update Functions
function updateConnectionStatus(connected) {
    const dot = connectionStatus.querySelector('.status-dot');
    const text = connectionStatus.querySelector('.status-text');
    
    if (connected) {
        dot.classList.add('connected');
        text.textContent = 'Connected';
    } else {
        dot.classList.remove('connected');
        text.textContent = 'Disconnected';
    }
}

function updateBotStatus(running) {
    botRunning = running;
    const dot = botStatus.querySelector('.status-dot');
    const text = botStatus.querySelector('.status-text');
    
    if (running) {
        dot.classList.add('connected');
        text.textContent = 'Running';
        startBot.disabled = true;
        stopBot.disabled = false;
    } else {
        dot.classList.remove('connected');
        text.textContent = 'Stopped';
        startBot.disabled = false;
        stopBot.disabled = true;
    }
}

function updateTrades(trades) {
    // Update active trades
    tradesTable.innerHTML = '';
    trades.active.forEach(trade => {
        const row = tradesTable.insertRow();
        const profitLoss = calculateProfitLoss(trade);
        const duration = calculateDuration(trade.timestamp);
        
        row.innerHTML = `
            <td>${trade.symbol}</td>
            <td>${trade.exchange}</td>
            <td>$${trade.entryPrice.toFixed(2)}</td>
            <td>$${trade.currentPrice.toFixed(2)}</td>
            <td class="${profitLoss >= 0 ? 'profit' : 'loss'}">
                ${profitLoss >= 0 ? '+' : ''}${profitLoss.toFixed(2)}%
            </td>
            <td>${duration}</td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="closeTrade('${trade.id}')">
                    Close
                </button>
            </td>
        `;
    });

    // Update trade history
    historyTable.innerHTML = '';
    trades.history.forEach(trade => {
        const row = historyTable.insertRow();
        const profitLoss = calculateProfitLoss(trade);
        const duration = calculateDuration(trade.timestamp, trade.closedAt);
        
        row.innerHTML = `
            <td>${trade.symbol}</td>
            <td>${trade.exchange}</td>
            <td>$${trade.entryPrice.toFixed(2)}</td>
            <td>$${trade.exitPrice.toFixed(2)}</td>
            <td class="${profitLoss >= 0 ? 'profit' : 'loss'}">
                ${profitLoss >= 0 ? '+' : ''}${profitLoss.toFixed(2)}%
            </td>
            <td>${duration}</td>
            <td><span class="badge ${trade.status.toLowerCase()}">${trade.status}</span></td>
        `;
    });
}

function updateStatistics(stats) {
    activeTrades.textContent = stats.activeTrades;
    totalTrades.textContent = stats.totalTrades;
    successRate.textContent = `${stats.successRate.toFixed(2)}%`;
    totalProfit.textContent = `$${stats.totalProfit.toFixed(2)}`;
}

function addLogEntry(entry) {
    logBuffer.push({
        timestamp: new Date().toISOString(),
        level: entry.level,
        message: entry.message
    });

    if (logBuffer.length > MAX_LOG_ENTRIES) {
        logBuffer.shift();
    }

    updateLogDisplay();
}

function updateLogDisplay() {
    const selectedLevel = logLevel.value;
    const filteredLogs = logBuffer.filter(entry => 
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

// Utility Functions
function calculateProfitLoss(trade) {
    if (trade.exitPrice) {
        return ((trade.exitPrice - trade.entryPrice) / trade.entryPrice) * 100;
    }
    return ((trade.currentPrice - trade.entryPrice) / trade.entryPrice) * 100;
}

function calculateDuration(startTime, endTime = Date.now()) {
    const diff = new Date(endTime) - new Date(startTime);
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
}

async function closeTrade(tradeId) {
    try {
        const response = await fetch(`/api/trades/${tradeId}/close`, {
            method: 'POST',
        });
        
        if (!response.ok) {
            throw new Error('Failed to close trade');
        }
    } catch (error) {
        console.error('Error closing trade:', error);
        showError('Failed to close trade: ' + error.message);
    }
}

function switchTab(tabId) {
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-tab') === tabId) {
            link.classList.add('active');
        }
    });

    tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === tabId) {
            content.classList.add('active');
        }
    });
}

async function fetchInitialData() {
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

        updateBotStatus(status.running);
        if (status.stats) {
            updateStatistics(status.stats);
        }
        if (status.trades) {
            updateTrades(status.trades);
        }

        // Populate settings form
        populateSettingsForm(settings);
        currentSettings = settings;

    } catch (error) {
        console.error('Error fetching initial data:', error);
        showError('Failed to fetch initial data: ' + error.message);
    }
}

function populateSettingsForm(settings) {
    const populateFormValues = (obj, prefix = '') => {
        for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            const element = document.querySelector(`[name="${fullKey}"]`);
            
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

function showError(message) {
    // Implement error notification
    console.error(message);
    // You can add a toast notification library here
}

function showSuccess(message) {
    // Implement success notification
    console.log(message);
    // You can add a toast notification library here
}

// Initialize tabs
switchTab('dashboard');