async function startBot() {
    try {
        startBotBtn.disabled = true;
        
        const response = await fetch('/api/bot/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            updateBotStatus(true);
            showNotification('Bot started successfully');
        } else {
            showNotification(data.message || 'Failed to start bot', 'error');
        }
    } catch (error) {
        console.error('Error starting bot:', error);
        showNotification('Failed to start bot: ' + (error.message || 'Unknown error'), 'error');
    } finally {
        startBotBtn.disabled = false;
    }
}

// Stop bot
async function stopBot() {
    try {
        stopBotBtn.disabled = true;
        
        const response = await fetch('/api/bot/stop', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            updateBotStatus(false);
            showNotification('Bot stopped successfully');
        } else {
            showNotification(data.message || 'Failed to stop bot', 'error');
        }
    } catch (error) {
        console.error('Error stopping bot:', error);
        showNotification('Failed to stop bot: ' + (error.message || 'Unknown error'), 'error');
    } finally {
        stopBotBtn.disabled = false;
    }
}

// Fetch and display bot stats
async function fetchStats() {
    try {
        const response = await fetch('/api/stats', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch stats');
        }
        
        const data = await response.json();
        
        if (data.success && data.stats) {
            displayStats(data.stats);
        } else {
            statsContainer.innerHTML = '<div class="alert alert-info">No stats available</div>';
        }
    } catch (error) {
        console.error('Error fetching stats:', error);
        statsContainer.innerHTML = '<div class="alert alert-danger">Failed to load stats</div>';
    }
}

// Display bot stats
function displayStats(stats) {
    if (!statsContainer) return;
    
    const startTime = stats.startTime ? new Date(stats.startTime).toLocaleString() : 'N/A';
    const lastTradeTime = stats.lastTradeTime ? new Date(stats.lastTradeTime).toLocaleString() : 'N/A';
    
    statsContainer.innerHTML = `
        <div class="table-responsive">
            <table class="table table-sm">
                <tbody>
                    <tr>
                        <th>Total Trades:</th>
                        <td>${stats.totalTrades}</td>
                    </tr>
                    <tr>
                        <th>Successful Trades:</th>
                        <td>${stats.successfulTrades}</td>
                    </tr>
                    <tr>
                        <th>Failed Trades:</th>
                        <td>${stats.failedTrades}</td>
                    </tr>
                    <tr>
                        <th>Win Rate:</th>
                        <td>${stats.winRate.toFixed(2)}%</td>
                    </tr>
                    <tr>
                        <th>Profit/Loss:</th>
                        <td class="${stats.profitLoss >= 0 ? 'text-success' : 'text-danger'}">
                            ${stats.profitLoss.toFixed(8)}
                        </td>
                    </tr>
                    <tr>
                        <th>Bot Started:</th>
                        <td>${startTime}</td>
                    </tr>
                    <tr>
                        <th>Last Trade:</th>
                        <td>${lastTradeTime}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
}

// Fetch and display balances
async function fetchBalances() {
    try {
        const response = await fetch('/api/balances', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch balances');
        }
        
        const data = await response.json();
        
        if (data.success && data.balances) {
            displayBalances(data.balances);
        } else {
            balancesContainer.innerHTML = '<div class="alert alert-info">No balance data available</div>';
        }
    } catch (error) {
        console.error('Error fetching balances:', error);
        balancesContainer.innerHTML = '<div class="alert alert-danger">Failed to load balances</div>';
    }
}

// Display balances
function displayBalances(balances) {
    if (!balancesContainer) return;
    
    let html = '';
    
    // Display blockchain balances
    if (balances.ethereum && Object.keys(balances.ethereum).length > 0) {
        html += '<h6>Ethereum</h6>';
        html += '<div class="table-responsive mb-3">';
        html += '<table class="table table-sm table-striped">';
        html += '<thead><tr><th>Token</th><th>Balance</th></tr></thead><tbody>';
        
        for (const [token, amount] of Object.entries(balances.ethereum)) {
            html += `<tr><td>${token}</td><td>${parseFloat(amount).toFixed(8)}</td></tr>`;
        }
        
        html += '</tbody></table></div>';
    }
    
    if (balances.bnbChain && Object.keys(balances.bnbChain).length > 0) {
        html += '<h6>BNB Chain</h6>';
        html += '<div class="table-responsive mb-3">';
        html += '<table class="table table-sm table-striped">';
        html += '<thead><tr><th>Token</th><th>Balance</th></tr></thead><tbody>';
        
        for (const [token, amount] of Object.entries(balances.bnbChain)) {
            html += `<tr><td>${token}</td><td>${parseFloat(amount).toFixed(8)}</td></tr>`;
        }
        
        html += '</tbody></table></div>';
    }
    
    // Display exchange balances
    if (balances.exchanges) {
        for (const [exchange, tokens] of Object.entries(balances.exchanges)) {
            if (Object.keys(tokens).length > 0) {
                html += `<h6>${exchange.charAt(0).toUpperCase() + exchange.slice(1)}</h6>`;
                html += '<div class="table-responsive mb-3">';
                html += '<table class="table table-sm table-striped">';
                html += '<thead><tr><th>Token</th><th>Balance</th></tr></thead><tbody>';
                
                for (const [token, amount] of Object.entries(tokens)) {
                    html += `<tr><td>${token}</td><td>${parseFloat(amount).toFixed(8)}</td></tr>`;
                }
                
                html += '</tbody></table></div>';
            }
        }
    }
    
    if (html === '') {
        balancesContainer.innerHTML = '<div class="alert alert-info">No balances available</div>';
    } else {
        balancesContainer.innerHTML = html;
    }
}

// Fetch and display trades
async function fetchTrades() {
    try {
        const response = await fetch('/api/trades', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch trades');
        }
        
        const data = await response.json();
        
        if (data.success) {
            displayActiveTrades(data.activeTrades);
            // Also update trade history if on that tab
            const tradeHistoryContainer = document.getElementById('trade-history-container');
            if (tradeHistoryContainer) {
                displayTradeHistory(data.tradeHistory);
            }
        } else {
            activeTradesContainer.innerHTML = '<div class="alert alert-info">Failed to load trades</div>';
        }
    } catch (error) {
        console.error('Error fetching trades:', error);
        activeTradesContainer.innerHTML = '<div class="alert alert-danger">Failed to load trades</div>';
    }
}

// Display active trades
function displayActiveTrades(trades) {
    if (!activeTradesContainer) return;
    
    if (!trades || Object.keys(trades).length === 0) {
        activeTradesContainer.innerHTML = '<div class="alert alert-info">No active trades</div>';
        return;
    }
    
    let html = '<div class="list-group">';
    
    for (const [tradeId, trade] of Object.entries(trades)) {
        const profitLossClass = trade.unrealizedProfitLoss >= 0 ? 'text-success' : 'text-danger';
        
        html += `
            <div class="list-group-item">
                <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">${trade.symbol || trade.tokenAddress}</h6>
                    <small>${new Date(trade.timestamp).toLocaleString()}</small>
                </div>
                <div class="d-flex justify-content-between">
                    <div>
                        <small>Entry: ${trade.entryPrice}</small><br>
                        <small>Current: ${trade.currentPrice}</small>
                    </div>
                    <div>
                        <small>Quantity: ${trade.quantity}</small><br>
                        <small class="${profitLossClass}">P/L: ${trade.unrealizedProfitLoss.toFixed(8)}</small>
                    </div>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    activeTradesContainer.innerHTML = html;
}

// Update UI based on socket events
function setupSocketListeners() {
    if (!window.socket) return;
    
    // Listen for balance updates
    window.socket.on('balanceUpdate', (data) => {
        displayBalances(data.balances);
    });
    
    // Listen for stats updates
    window.socket.on('statsUpdate', (stats) => {
        displayStats(stats);
    });
    
    // Listen for trade updates
    window.socket.on('tradeUpdated', (data) => {
        fetchTrades(); // Refresh trade data
    });
    
    window.socket.on('tradeCompleted', (data) => {
        fetchTrades(); // Refresh trade data
        fetchStats();  // Refresh stats
        showNotification(`Trade ${data.tradeId} completed with ${data.profitLoss >= 0 ? 'profit' : 'loss'}`);
    });
}

// Set up tab switching event handlers
function setupTabHandlers() {
    document.querySelectorAll('a[data-bs-toggle="tab"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', (event) => {
            const targetId = event.target.getAttribute('href');
            
            // Load tab-specific data
            switch (targetId) {
                case '#dashboard':
                    fetchStats();
                    fetchBalances();
                    fetchTrades();
                    break;
                case '#trades':
                    fetchTrades();
                    break;
                case '#settings':
                    loadConfiguration();
                    break;
                case '#logs':
                    // Logs are handled via socket.io
                    break;
            }
        });
    });
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    setupTabHandlers();
});

// Function to be called when logged in
function initDashboard() {
    fetchStats();
    fetchBalances();
    fetchTrades();
    setupSocketListeners();
}

// Export functions for use in other modules
window.dashboard = {
    initDashboard,
    updateBotStatus,
    fetchStats,
    fetchBalances,
    fetchTrades
};