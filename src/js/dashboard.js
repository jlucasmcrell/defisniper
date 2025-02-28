// Dashboard component
import { formatNumber, formatDate } from './utils.js';

class Dashboard {
    constructor() {
        this.statsContainer = document.getElementById('dashboard-stats');
        this.balancesContainer = document.getElementById('dashboard-balances');
        this.activeTradesContainer = document.getElementById('dashboard-active-trades');
        this.chartContainer = document.getElementById('dashboard-chart');
        this.updateInterval = null;
    }

    initialize() {
        // Initial data load
        this.loadDashboardData();
        
        // Set up auto-refresh
        this.updateInterval = setInterval(() => {
            this.loadDashboardData();
        }, 30000); // Refresh every 30 seconds
        
        // Initialize chart
        this.initializeChart();
    }

    async loadDashboardData() {
        try {
            // Fetch all required data in parallel
            const [statsResponse, balancesResponse, tradesResponse] = await Promise.all([
                fetch('/api/stats', { credentials: 'include' }),
                fetch('/api/balances', { credentials: 'include' }),
                fetch('/api/trades', { credentials: 'include' })
            ]);

            const [statsData, balancesData, tradesData] = await Promise.all([
                statsResponse.json(),
                balancesResponse.json(),
                tradesResponse.json()
            ]);

            if (statsData.success) {
                this.updateStats(statsData.stats);
            }
            
            if (balancesData.success) {
                this.updateBalances(balancesData.balances);
            }
            
            if (tradesData.success) {
                this.updateActiveTrades(tradesData.activeTrades);
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    updateStats(stats) {
        if (!this.statsContainer) return;

        this.statsContainer.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="bg-dark-surface p-4 rounded-xl shadow-lg">
                    <h3 class="text-dark-text-secondary text-sm font-medium">Total Trades</h3>
                    <p class="text-2xl font-bold mt-2">${stats.totalTrades}</p>
                </div>
                <div class="bg-dark-surface p-4 rounded-xl shadow-lg">
                    <h3 class="text-dark-text-secondary text-sm font-medium">Success Rate</h3>
                    <p class="text-2xl font-bold mt-2">${formatNumber(stats.winRate)}%</p>
                </div>
                <div class="bg-dark-surface p-4 rounded-xl shadow-lg">
                    <h3 class="text-dark-text-secondary text-sm font-medium">Total Profit/Loss</h3>
                    <p class="text-2xl font-bold mt-2 ${stats.profitLoss >= 0 ? 'text-status-success' : 'text-status-danger'}">
                        ${formatNumber(stats.profitLoss)}
                    </p>
                </div>
                <div class="bg-dark-surface p-4 rounded-xl shadow-lg">
                    <h3 class="text-dark-text-secondary text-sm font-medium">Active Trades</h3>
                    <p class="text-2xl font-bold mt-2">${stats.activeTrades || 0}</p>
                </div>
            </div>
        `;
    }

    updateBalances(balances) {
        if (!this.balancesContainer) return;

        let html = '<div class="mt-8">';
        html += '<h2 class="text-xl font-bold mb-4">Balances</h2>';
        html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';

        // Blockchain balances
        if (balances.ethereum && Object.keys(balances.ethereum).length > 0) {
            html += this.createBalanceCard('Ethereum', balances.ethereum);
        }
        
        if (balances.bnbChain && Object.keys(balances.bnbChain).length > 0) {
            html += this.createBalanceCard('BNB Chain', balances.bnbChain);
        }

        // Exchange balances
        if (balances.exchanges) {
            for (const [exchange, tokens] of Object.entries(balances.exchanges)) {
                if (Object.keys(tokens).length > 0) {
                    html += this.createBalanceCard(
                        exchange.charAt(0).toUpperCase() + exchange.slice(1),
                        tokens
                    );
                }
            }
        }

        html += '</div></div>';
        this.balancesContainer.innerHTML = html;
    }

    createBalanceCard(title, balances) {
        let html = `
            <div class="bg-dark-surface rounded-xl shadow-lg p-4">
                <h3 class="text-lg font-medium mb-3">${title}</h3>
                <div class="space-y-2">
        `;

        for (const [token, amount] of Object.entries(balances)) {
            html += `
                <div class="flex justify-between items-center">
                    <span class="text-dark-text-secondary">${token}</span>
                    <span class="font-medium">${formatNumber(amount)}</span>
                </div>
            `;
        }

        html += '</div></div>';
        return html;
    }

    updateActiveTrades(trades) {
        if (!this.activeTradesContainer) return;

        if (!trades || trades.length === 0) {
            this.activeTradesContainer.innerHTML = `
                <div class="mt-8">
                    <h2 class="text-xl font-bold mb-4">Active Trades</h2>
                    <div class="bg-dark-surface rounded-xl shadow-lg p-4">
                        <p class="text-dark-text-secondary">No active trades</p>
                    </div>
                </div>
            `;
            return;
        }

        let html = `
            <div class="mt-8">
                <h2 class="text-xl font-bold mb-4">Active Trades</h2>
                <div class="bg-dark-surface rounded-xl shadow-lg overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-dark-border">
                            <thead>
                                <tr class="bg-dark-bg">
                                    <th class="px-6 py-3 text-left text-xs font-medium text-dark-text-secondary uppercase tracking-wider">Token</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-dark-text-secondary uppercase tracking-wider">Entry Price</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-dark-text-secondary uppercase tracking-wider">Current Price</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-dark-text-secondary uppercase tracking-wider">Quantity</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-dark-text-secondary uppercase tracking-wider">P/L</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-dark-text-secondary uppercase tracking-wider">Time</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-dark-border">
        `;

        trades.forEach(trade => {
            const profitLoss = trade.currentPrice ? 
                ((trade.currentPrice - trade.entryPrice) / trade.entryPrice) * 100 : 0;

            html += `
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
                </tr>
            `;
        });

        html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        this.activeTradesContainer.innerHTML = html;
    }

    initializeChart() {
        if (!this.chartContainer) return;
        
        // Initialize Chart.js chart here
        // This will be implemented in the next part
    }

    dispose() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Initialize dashboard
let dashboard;

export function initDashboard() {
    if (dashboard) {
        dashboard.dispose();
    }
    dashboard = new Dashboard();
    dashboard.initialize();
}