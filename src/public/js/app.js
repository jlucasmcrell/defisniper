/**
 * CryptoSniperBot Dashboard Frontend
 */

// Initialize Socket.IO connection
const socket = io();
let botRunning = false;

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

// Event Listeners
startBot.addEventListener('click', async () => {
    try {
        const response = await fetch('/api/bot/start', {
            method: 'POST',
        });
        
        if (!response.ok) {
            throw new Error('Failed to start bot');
        }
        
        updateBotStatus(true);
    } catch (error) {
        console.error('Error starting bot:', error);
        showError('Failed to start bot');
    }
});

stopBot.addEventListener('click', async () => {
    try {
        const response = await fetch('/api/bot/stop', {
            method: 'POST',
        });
        
        if (!response.ok) {
            throw new Error('Failed to stop bot');
        }
        
        updateBotStatus(false);
    } catch (error) {
        console.error('Error stopping bot:', error);
        showError('Failed to stop bot');
    }
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
    // Clear existing trades
    tradesTable.innerHTML = '';
    
    trades.forEach(trade => {
        const row = tradesTable.insertRow();
        
        const profitLoss = calculateProfitLoss(trade);
        const duration = calculateDuration(trade.timestamp);
        
        row.innerHTML = `
            <td>${trade.symbol}</td>
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
}

function updateStatistics(stats) {
    activeTrades.textContent = stats.activeTrades;
    totalTrades.textContent = stats.totalTrades;
    successRate.textContent = `${stats.successRate.toFixed(2)}%`;
    totalProfit.textContent = `$${stats.totalProfit.toFixed(2)}`;
}

// Utility Functions
function calculateProfitLoss(trade) {
    return ((trade.currentPrice - trade.entryPrice) / trade.entryPrice) * 100;
}

function calculateDuration(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
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
        showError('Failed to close trade');
    }
}

function showError(message) {
    // Implement error notification
    console.error(message);
}

async function fetchInitialData() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        updateBotStatus(data.running);
        
        if (data.trades) {
            updateTrades(data.trades);
        }
        
        if (data.stats) {
            updateStatistics(data.stats);
        }
    } catch (error) {
        console.error('Error fetching initial data:', error);
        showError('Failed to fetch initial data');
    }
}