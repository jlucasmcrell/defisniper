// Trades component
import { formatNumber, formatDate } from './utils.js';

class TradesManager {
    constructor() {
        this.tradesContainer = document.getElementById('trades');
        this.activeTradesTable = document.getElementById('active-trades-table');
        this.tradeHistoryTable = document.getElementById('trade-history-table');
        this.updateInterval = null;
    }

    initialize() {
        this.setupTables();
        this.loadTradeData();
        
        // Set up auto-refresh
        this.updateInterval = setInterval(() => {
            this.loadTradeData();
        }, 30000);
    }

    setupTables() {
        this.tradesContainer.innerHTML = `
            <div class="space-y-8">
                <div>
                    <h2 class="text-xl font-bold mb-4">Active Trades</h2>
                    <div class="bg-dark-surface rounded-xl shadow-lg overflow-hidden">
                        <div class="overflow-x-auto">
                            <table id="active-trades-table" class="min-w-full divide-y divide-dark-border">
                                <thead>
                                    <tr class="bg-dark-bg">
                                        <th class="px-6 py-3 text-left text-xs font-medium text-dark-text-secondary uppercase tracking-wider">Token</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-dark-text-secondary uppercase tracking-wider">Entry Price</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-dark-text-secondary uppercase tracking-wider">Current Price</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-dark-text-secondary uppercase tracking-wider">Quantity</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-dark-text-secondary uppercase tracking-wider">P/L</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-dark-text-secondary uppercase tracking-wider">Time</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-dark-text-secondary uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-dark-border">
                                    <tr>
                                        <td colspan="7" class="px-6 py-4 text-center text-dark-text-secondary">
                                            Loading...
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div>
                    <h2 class="text-xl font-bold mb-4">Trade History</h2>
                    <div class="bg-dark-surface rounded-xl shadow-lg overflow-hidden">
                        <div class="overflow-x-auto">
                            <table id="trade-history-table" class="min-w-full divide-y divide-dark-border">
                                <thead>
                                    <tr class="bg-dark-bg">
                                        <th class="px-6 py-3 text-left text-xs font-medium text-dark-text-secondary uppercase tracking-wider">Token</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-dark-text-secondary uppercase tracking-wider">Type</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-dark-text-secondary uppercase tracking-wider">Entry</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-dark-text-secondary uppercase tracking-wider">Exit</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-dark-text-secondary uppercase tracking-wider">Quantity</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-dark-text-secondary uppercase tracking-wider">P/L</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-dark-text-secondary uppercase tracking-wider">Date</th>
                                        <th class="px-6 py-3 text-left text-xs font-medium text-dark-text-secondary uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-dark-border">
                                    <tr>
                                        <td colspan="8" class="px-6 py-4 text-center text-dark-text-secondary">
                                            Loading...
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadTradeData() {
        try {
            const response = await fetch('/api/trades', {
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.updateActiveTrades(data.activeTrades);
                this.updateTradeHistory(data.tradeHistory);
            }
        } catch (error) {
            console.error('Failed to load trade data:', error);
        }
    }

    updateActiveTrades(trades) {
        if (!this.activeTradesTable) return;

        const tbody = this.activeTradesTable.querySelector('tbody');
        
        if (!trades || trades.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-4 text-center text-dark-text-secondary">
                        No active trades
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = trades.map(trade => {
            const profitLoss = trade.currentPrice ? 
                ((trade.currentPrice - trade.entryPrice) / trade.entryPrice) * 100 : 0;

            return `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${trade.symbol}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${formatNumber(trade.entryPrice)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${formatNumber(trade.currentPrice)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${formatNumber(trade.quantity)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm ${profitLoss >= 0 ? 'text-status-success' : 'text-status-danger'}">
                        ${formatNumber(profitLoss)}%
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-dark-text-secondary">
                        ${formatDate(trade.timestamp)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <button class="text-status-danger hover:text-status-danger/80" 
                                onclick="closeTrade('${trade.id}')">
                            Close
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateTradeHistory(trades) {
        if (!this.tradeHistoryTable) return;

        const tbody = this.tradeHistoryTable.querySelector('tbody');
        
        if (!trades || trades.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-6 py-4 text-center text-dark-text-secondary">
                        No trade history
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = trades.map(trade => {
            const profitLoss = trade.exitPrice ? 
                ((trade.exitPrice - trade.entryPrice) / trade.entryPrice) * 100 : 0;

            return `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${trade.symbol}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${trade.type}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${formatNumber(trade.entryPrice)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${formatNumber(trade.exitPrice)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${formatNumber(trade.quantity)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm ${profitLoss >= 0 ? 'text-status-success' : 'text-status-danger'}">
                        ${formatNumber(profitLoss)}%
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-dark-text-secondary">
                        ${formatDate(trade.timestamp)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <span class="px-2 py-1 text-xs font-medium rounded-full ${
                            trade.status === 'completed' ? 'bg-status-success/20 text-status-success' :
                            trade.status === 'failed' ? 'bg-status-danger/20 text-status-danger' :
                            'bg-status-warning/20 text-status-warning'
                        }">
                            ${trade.status}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async closeTrade(tradeId) {
        try {
            const response = await fetch(`/api/trades/${tradeId}/close`, {
                method: 'POST',
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.loadTradeData();
            }
        } catch (error) {
            console.error('Failed to close trade:', error);
        }
    }

    dispose() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Initialize trades
let tradesManager;

export function initTrades() {
    if (tradesManager) {
        tradesManager.dispose();
    }
    tradesManager = new TradesManager();
    tradesManager.initialize();
}