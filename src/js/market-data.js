// Market data handling and processing
class MarketDataManager {
    constructor() {
        this.data = new Map();
        this.subscriptions = new Map();
        this.socket = null;
        this.updateCallbacks = new Set();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000;
    }

    initialize() {
        this.connectWebSocket();
        this.startUpdateInterval();
    }

    connectWebSocket() {
        this.socket = new WebSocket(`ws://${window.location.host}/market`);
        
        this.socket.onopen = () => {
            console.log('Market data WebSocket connected');
            this.reconnectAttempts = 0;
            this.resubscribeAll();
        };
        
        this.socket.onclose = () => {
            console.log('Market data WebSocket disconnected');
            this.handleDisconnect();
        };
        
        this.socket.onerror = (error) => {
            console.error('Market data WebSocket error:', error);
        };
        
        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleUpdate(data);
            } catch (error) {
                console.error('Failed to parse market data:', error);
            }
        };
    }

    handleDisconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            
            setTimeout(() => {
                this.connectWebSocket();
            }, this.reconnectDelay);
        } else {
            console.error('Max reconnection attempts reached');
        }
    }

    handleUpdate(data) {
        const { symbol, price, volume, timestamp } = data;
        
        if (!this.data.has(symbol)) {
            this.data.set(symbol, {
                price: null,
                volume: null,
                high24h: null,
                low24h: null,
                volume24h: null,
                priceChange24h: null,
                priceChangePercent24h: null,
                lastUpdate: null,
                history: []
            });
        }

        const symbolData = this.data.get(symbol);
        const oldPrice = symbolData.price;
        
        // Update current data
        symbolData.price = price;
        symbolData.volume = volume;
        symbolData.lastUpdate = timestamp;
        
        // Update price history
        symbolData.history.push({ price, timestamp });
        if (symbolData.history.length > 1440) { // Keep 24 hours of minute data
            symbolData.history.shift();
        }
        
        // Calculate 24h statistics
        this.update24hStats(symbol);
        
        // Notify subscribers
        if (this.subscriptions.has(symbol)) {
            this.subscriptions.get(symbol).forEach(callback => {
                try {
                    callback({
                        symbol,
                        price,
                        oldPrice,
                        volume,
                        timestamp,
                        ...symbolData
                    });
                } catch (error) {
                    console.error(`Error in market data callback for ${symbol}:`, error);
                }
            });
        }
        
        // Notify global update listeners
        this.updateCallbacks.forEach(callback => {
            try {
                callback(symbol, data);
            } catch (error) {
                console.error('Error in market data update callback:', error);
            }
        });
    }

    update24hStats(symbol) {
        const data = this.data.get(symbol);
        if (!data || data.history.length < 2) return;

        const now = Date.now();
        const history24h = data.history.filter(h => (now - h.timestamp) <= 86400000);
        
        if (history24h.length > 0) {
            const prices = history24h.map(h => h.price);
            data.high24h = Math.max(...prices);
            data.low24h = Math.min(...prices);
            data.volume24h = history24h.reduce((sum, h) => sum + (h.volume || 0), 0);
            
            const firstPrice = history24h[0].price;
            const lastPrice = history24h[history24h.length - 1].price;
            data.priceChange24h = lastPrice - firstPrice;
            data.priceChangePercent24h = ((lastPrice - firstPrice) / firstPrice) * 100;
        }
    }

    subscribe(symbol, callback) {
        if (!this.subscriptions.has(symbol)) {
            this.subscriptions.set(symbol, new Set());
            this.subscribeToSymbol(symbol);
        }
        this.subscriptions.get(symbol).add(callback);
        
        // Return current data if available
        if (this.data.has(symbol)) {
            callback({
                symbol,
                ...this.data.get(symbol)
            });
        }
        
        // Return unsubscribe function
        return () => this.unsubscribe(symbol, callback);
    }

    unsubscribe(symbol, callback) {
        if (this.subscriptions.has(symbol)) {
            const subscribers = this.subscriptions.get(symbol);
            subscribers.delete(callback);
            
            if (subscribers.size === 0) {
                this.subscriptions.delete(symbol);
                this.unsubscribeFromSymbol(symbol);
            }
        }
    }

    subscribeToSymbol(symbol) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'subscribe',
                symbol
            }));
        }
    }

    unsubscribeFromSymbol(symbol) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'unsubscribe',
                symbol
            }));
        }
    }

    resubscribeAll() {
        this.subscriptions.forEach((_, symbol) => {
            this.subscribeToSymbol(symbol);
        });
    }

    onUpdate(callback) {
        this.updateCallbacks.add(callback);
        return () => this.updateCallbacks.delete(callback);
    }

    startUpdateInterval() {
        // Update 24h stats every minute
        setInterval(() => {
            this.data.forEach((_, symbol) => {
                this.update24hStats(symbol);
            });
        }, 60000);
    }

    getData(symbol) {
        return this.data.get(symbol);
    }

    getAllData() {
        return Object.fromEntries(this.data);
    }

    dispose() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.data.clear();
        this.subscriptions.clear();
        this.updateCallbacks.clear();
    }
}

// Create global market data instance
export const marketData = new MarketDataManager();