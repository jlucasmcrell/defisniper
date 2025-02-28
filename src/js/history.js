// Trade history and analytics manager
class HistoryManager {
    constructor() {
        this.trades = new Map();
        this.analytics = new Map();
        this.listeners = new Set();
        this.filters = new Map();
        this.initialized = false;
        
        // Default analytics metrics
        this.defaultMetrics = {
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            winRate: 0,
            averageWin: 0,
            averageLoss: 0,
            largestWin: 0,
            largestLoss: 0,
            profitFactor: 0,
            totalProfit: 0,
            sharpeRatio: 0
        };
    }

    async initialize() {
        try {
            // Load historical trades
            await this.loadTrades();
            
            // Calculate initial analytics
            this.calculateAnalytics();
            
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize history manager:', error);
            return false;
        }
    }

    async loadTrades() {
        try {
            const response = await fetch('/api/trades/history');
            if (!response.ok) throw new Error('Failed to load trade history');
            
            const trades = await response.json();
            trades.forEach(trade => {
                this.trades.set(trade.id, trade);
            });
            
            this.notifyListeners('load', trades);
        } catch (error) {
            console.error('Error loading trades:', error);
            throw error;
        }
    }

    addTrade(trade) {
        this.trades.set(trade.id, {
            ...trade,
            timestamp: Date.now()
        });
        
        this.calculateAnalytics();
        this.notifyListeners('add', trade);
    }

    updateTrade(tradeId, updates) {
        const trade = this.trades.get(tradeId);
        if (!trade) throw new Error('Trade not found');

        const updatedTrade = {
            ...trade,
            ...updates,
            lastUpdated: Date.now()
        };

        this.trades.set(tradeId, updatedTrade);
        this.calculateAnalytics();
        this.notifyListeners('update', updatedTrade);
    }

    removeTrade(tradeId) {
        if (this.trades.delete(tradeId)) {
            this.calculateAnalytics();
            this.notifyListeners('remove', tradeId);
        }
    }

    calculateAnalytics() {
        const trades = Array.from(this.trades.values());
        const analytics = { ...this.defaultMetrics };

        analytics.totalTrades = trades.length;
        
        let totalProfit = 0;
        let winningProfit = 0;
        let losingProfit = 0;
        let returns = [];

        trades.forEach(trade => {
            const profit = trade.exitPrice - trade.entryPrice;
            totalProfit += profit;

            if (profit > 0) {
                analytics.winningTrades++;
                winningProfit += profit;
                analytics.largestWin = Math.max(analytics.largestWin, profit);
            } else if (profit < 0) {
                analytics.losingTrades++;
                losingProfit += Math.abs(profit);
                analytics.largestLoss = Math.min(analytics.largestLoss, profit);
            }

            returns.push(profit);
        });

        // Calculate derived metrics
        analytics.winRate = analytics.winningTrades / analytics.totalTrades || 0;
        analytics.averageWin = winningProfit / analytics.winningTrades || 0;
        analytics.averageLoss = losingProfit / analytics.losingTrades || 0;
        analytics.profitFactor = winningProfit / losingProfit || 0;
        analytics.totalProfit = totalProfit;

        // Calculate Sharpe Ratio
        if (returns.length > 0) {
            const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
            const stdDev = Math.sqrt(
                returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length
            );
            analytics.sharpeRatio = meanReturn / stdDev || 0;
        }

        this.analytics = analytics;
        this.notifyListeners('analytics', analytics);
    }

    getTrades(filter = {}) {
        return Array.from(this.trades.values()).filter(trade => {
            return Object.entries(filter).every(([key, value]) => {
                if (key === 'from' && value) {
                    return trade.timestamp >= value;
                }
                if (key === 'to' && value) {
                    return trade.timestamp <= value;
                }
                if (key === 'symbol' && value) {
                    return trade.symbol === value;
                }
                if (key === 'type' && value) {
                    return trade.type === value;
                }
                return true;
            });
        });
    }

    getAnalytics(period = 'all') {
        const now = Date.now();
        let filter = {};

        switch (period) {
            case 'day':
                filter.from = now - 24 * 60 * 60 * 1000;
                break;
            case 'week':
                filter.from = now - 7 * 24 * 60 * 60 * 1000;
                break;
            case 'month':
                filter.from = now - 30 * 24 * 60 * 60 * 1000;
                break;
            case 'year':
                filter.from = now - 365 * 24 * 60 * 60 * 1000;
                break;
        }

        const filteredTrades = this.getTrades(filter);
        return this.calculateMetrics(filteredTrades);
    }

    calculateMetrics(trades) {
        // Similar to calculateAnalytics but for a specific set of trades
        const metrics = { ...this.defaultMetrics };
        // Implementation similar to calculateAnalytics
        return metrics;
    }

    addFilter(name, filterFn) {
        this.filters.set(name, filterFn);
    }

    removeFilter(name) {
        this.filters.delete(name);
    }

    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners(event, data) {
        this.listeners.forEach(listener => {
            try {
                listener(event, data);
            } catch (error) {
                console.error('Error in history listener:', error);
            }
        });
    }

    export(format = 'json') {
        const trades = Array.from(this.trades.values());
        
        switch (format) {
            case 'json':
                return JSON.stringify(trades, null, 2);
            case 'csv':
                return this.exportToCsv(trades);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    exportToCsv(trades) {
        const headers = ['id', 'timestamp', 'symbol', 'type', 'side', 'entryPrice', 'exitPrice', 'quantity', 'profit'];
        const rows = trades.map(trade => 
            headers.map(header => trade[header]).join(',')
        );
        return [headers.join(','), ...rows].join('\n');
    }

    clear() {
        this.trades.clear();
        this.calculateAnalytics();
        this.notifyListeners('clear');
    }

    isInitialized() {
        return this.initialized;
    }
}

// Create and export global history instance
export const history = new HistoryManager();