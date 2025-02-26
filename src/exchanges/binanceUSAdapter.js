/**
 * Binance US Exchange Adapter
 */
const ExchangeAdapter = require('./exchangeAdapter');
const Binance = require('binance-api-node').default;

class BinanceUSAdapter extends ExchangeAdapter {
    constructor(config, securityManager) {
        super(config, securityManager);
        this.exchangeName = 'Binance.US';
        this.client = null;
        this.exchangeInfo = null;
        this.symbolInfo = new Map();
    }

    async initialize() {
        try {
            this.validateConfig();

            const decryptedApiKey = this.securityManager.decrypt(this.config.apiKey);
            const decryptedApiSecret = this.securityManager.decrypt(this.config.apiSecret);

            this.client = Binance({
                apiKey: decryptedApiKey,
                apiSecret: decryptedApiSecret,
                urls: {
                    base: 'https://api.binance.us/api'
                }
            });

            // Load exchange information
            this.exchangeInfo = await this.client.exchangeInfo();
            this.processExchangeInfo();

            this.isInitialized = true;
            this.logger.info('Binance.US adapter initialized successfully');
        } catch (error) {
            this.handleError(error, 'Failed to initialize Binance.US adapter');
        }
    }

    processExchangeInfo() {
        for (const symbol of this.exchangeInfo.symbols) {
            this.symbolInfo.set(symbol.symbol, {
                baseAsset: symbol.baseAsset,
                quoteAsset: symbol.quoteAsset,
                filters: symbol.filters,
                status: symbol.status,
                minQty: this.getMinQuantity(symbol),
                maxQty: this.getMaxQuantity(symbol),
                stepSize: this.getStepSize(symbol),
                minNotional: this.getMinNotional(symbol)
            });
        }
    }

    getMinQuantity(symbolInfo) {
        const filter = symbolInfo.filters.find(f => f.filterType === 'LOT_SIZE');
        return filter ? parseFloat(filter.minQty) : 0;
    }

    getMaxQuantity(symbolInfo) {
        const filter = symbolInfo.filters.find(f => f.filterType === 'LOT_SIZE');
        return filter ? parseFloat(filter.maxQty) : 0;
    }

    getStepSize(symbolInfo) {
        const filter = symbolInfo.filters.find(f => f.filterType === 'LOT_SIZE');
        return filter ? parseFloat(filter.stepSize) : 0;
    }

    getMinNotional(symbolInfo) {
        const filter = symbolInfo.filters.find(f => f.filterType === 'MIN_NOTIONAL');
        return filter ? parseFloat(filter.minNotional) : 0;
    }

    async getPrice(symbol) {
        try {
            const ticker = await this.client.prices({ symbol });
            return parseFloat(ticker[symbol]);
        } catch (error) {
            this.handleError(error, `Failed to get price for ${symbol}`);
        }
    }

    async getBalance(asset) {
        try {
            const account = await this.client.accountInfo();
            const balance = account.balances.find(b => b.asset === asset);
            return balance ? {
                free: parseFloat(balance.free),
                locked: parseFloat(balance.locked),
                total: parseFloat(balance.free) + parseFloat(balance.locked)
            } : null;
        } catch (error) {
            this.handleError(error, `Failed to get balance for ${asset}`);
        }
    }

    async placeBuyOrder(symbol, quantity, price) {
        try {
            const order = await this.client.order({
                symbol: symbol,
                side: 'BUY',
                type: 'LIMIT',
                quantity: this.roundQuantity(quantity, symbol),
                price: this.roundPrice(price, symbol),
                timeInForce: 'GTC'
            });
            return {
                orderId: order.orderId,
                status: order.status,
                symbol: order.symbol,
                price: parseFloat(order.price),
                quantity: parseFloat(order.origQty)
            };
        } catch (error) {
            this.handleError(error, `Failed to place buy order for ${symbol}`);
        }
    }

    async placeSellOrder(symbol, quantity, price) {
        try {
            const order = await this.client.order({
                symbol: symbol,
                side: 'SELL',
                type: 'LIMIT',
                quantity: this.roundQuantity(quantity, symbol),
                price: this.roundPrice(price, symbol),
                timeInForce: 'GTC'
            });
            return {
                orderId: order.orderId,
                status: order.status,
                symbol: order.symbol,
                price: parseFloat(order.price),
                quantity: parseFloat(order.origQty)
            };
        } catch (error) {
            this.handleError(error, `Failed to place sell order for ${symbol}`);
        }
    }

    async cancelOrder(orderId, symbol) {
        try {
            const result = await this.client.cancelOrder({
                symbol: symbol,
                orderId: orderId
            });
            return {
                orderId: result.orderId,
                status: result.status
            };
        } catch (error) {
            this.handleError(error, `Failed to cancel order ${orderId}`);
        }
    }

    async getOrderStatus(orderId, symbol) {
        try {
            const order = await this.client.getOrder({
                symbol: symbol,
                orderId: orderId
            });
            return {
                orderId: order.orderId,
                status: order.status,
                price: parseFloat(order.price),
                quantity: parseFloat(order.origQty),
                executed: parseFloat(order.executedQty),
                remaining: parseFloat(order.origQty) - parseFloat(order.executedQty)
            };
        } catch (error) {
            this.handleError(error, `Failed to get order status for ${orderId}`);
        }
    }

    async getTradeHistory(symbol, limit = 50) {
        try {
            const trades = await this.client.myTrades({
                symbol: symbol,
                limit: limit
            });
            return trades.map(trade => ({
                id: trade.id,
                orderId: trade.orderId,
                price: parseFloat(trade.price),
                quantity: parseFloat(trade.qty),
                commission: parseFloat(trade.commission),
                commissionAsset: trade.commissionAsset,
                time: trade.time,
                isBuyer: trade.isBuyer,
                isMaker: trade.isMaker
            }));
        } catch (error) {
            this.handleError(error, `Failed to get trade history for ${symbol}`);
        }
    }

    formatSymbol(baseAsset, quoteAsset) {
        return `${baseAsset}${quoteAsset}`;
    }

    parseSymbol(symbol) {
        const info = this.symbolInfo.get(symbol);
        return info ? {
            baseAsset: info.baseAsset,
            quoteAsset: info.quoteAsset
        } : null;
    }

    roundQuantity(quantity, symbol) {
        const info = this.symbolInfo.get(symbol);
        if (!info) throw new Error(`Symbol ${symbol} not found`);
        
        const stepSize = info.stepSize;
        const precision = Math.log10(1 / stepSize);
        return Number(Math.floor(quantity * Math.pow(10, precision)) / Math.pow(10, precision));
    }

    roundPrice(price, symbol) {
        const info = this.symbolInfo.get(symbol);
        if (!info) throw new Error(`Symbol ${symbol} not found`);
        
        const filter = info.filters.find(f => f.filterType === 'PRICE_FILTER');
        if (!filter) return price;
        
        const tickSize = parseFloat(filter.tickSize);
        const precision = Math.log10(1 / tickSize);
        return Number(Math.floor(price * Math.pow(10, precision)) / Math.pow(10, precision));
    }
}

module.exports = BinanceUSAdapter;