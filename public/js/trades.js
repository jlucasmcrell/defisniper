/**
 * Trade management functionality for CryptoSniperBot UI
 */

// DOM elements
const tradeHistoryContainer = document.getElementById('trade-history-container');

// Display trade history
function displayTradeHistory(trades) {
    if (!tradeHistoryContainer) return;
    
    if (!trades || trades.length === 0) {
        tradeHistoryContainer.innerHTML = '<div class="alert alert-info">No trade history available</div>';
        return;
    }
    
    let html = '<div class="table-responsive">';
    html += '<table class="table table-striped">';
    html += `
        <thead>
            <tr>
                <th>Symbol/Token</th>
                <th>Type</th>
                <th>Entry</th>
                <th>Exit</th>
                <th>Quantity</th>
                <th>P/L</th>
                <th>Date</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
    `;
    
    // Sort trades by timestamp, newest first
    const sortedTrades = [...trades].sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    sortedTrades.forEach(trade => {
        const symbol = trade.symbol || trade.tokenAddress || 'Unknown';
        const entryPrice = trade.entryPrice || 'N/A';
        const exitPrice = trade.closePrice || 'N/A';
        const quantity = trade.quantity || 'N/A';
        const profitLoss = trade.profitLoss || 0;
        const profitLossClass = profitLoss >= 0 ? 'text-success' : 'text-danger';
        const date = new Date(trade.timestamp).toLocaleString();
        const status = trade.status || 'Unknown';
        const statusClass = getStatusClass(trade.status);
        const tradeType = trade.side === 'buy' ? 'Long' : 'Short';
        
        html += `
            <tr>
                <td>${symbol}</td>
                <td>${tradeType}</td>
                <td>${entryPrice}</td>
                <td>${exitPrice}</td>
                <td>${quantity}</td>
                <td class="${profitLossClass}">${profitLoss.toFixed(8)}</td>
                <td>${date}</td>
                <td><span class="badge ${statusClass}">${status}</span></td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    tradeHistoryContainer.innerHTML = html;
}

// Get Bootstrap class for status badge
function getStatusClass(status) {
    switch (status) {
        case 'completed':
            return 'bg-success';
        case 'failed':
            return 'bg-danger';
        case 'pending':
            return 'bg-warning';
        case 'active':
            return 'bg-primary';
        default:
            return 'bg-secondary';
    }
}

// Fetch trade history
async function fetchTradeHistory() {
    try {
        const response = await fetch('/api/trades', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch trade history');
        }
        
        const data = await response.json();
        
        if (data.success && data.tradeHistory) {
            displayTradeHistory(data.tradeHistory);
        } else {
            tradeHistoryContainer.innerHTML = '<div class="alert alert-info">No trade history available</div>';
        }
    } catch (error) {
        console.error('Error fetching trade history:', error);
        tradeHistoryContainer.innerHTML = '<div class="alert alert-danger">Failed to load trade history</div>';
    }
}

// Initialize trades module
function initTrades() {
    // Set up socket listeners for real-time trade updates
    setupTradeSocketListeners();
}

// Set up socket listeners for trades
function setupTradeSocketListeners() {
    if (!window.socket) return;
    
    window.socket.on('tradeCompleted', (data) => {
        fetchTradeHistory();
    });
}

// Export functions for use in other modules
window.trades = {
    initTrades,
    fetchTradeHistory,
    displayTradeHistory
};