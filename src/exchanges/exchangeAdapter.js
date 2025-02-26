/**
 * Base Exchange Adapter Class
 * Provides common interface for all exchange integrations
 */
const { Logger } = require('../utils/logger');

class ExchangeAdapter {
    constructor(config, securityManager) {
        if (new.target === ExchangeAdapter) {
            throw new Error('ExchangeAdapter is an abstract class and cannot be instantiated directly');
        }
        
        this.config = config;
        this.securityManager = securityManager;
        this.logger = new Logger(this.constructor.name);
        this.isInitialized = false;
        this.exchangeName = '';
    }

    async initialize() {
        throw new Error('initialize() must be implemented by subclass');
    }

    async getPrice(symbol) {
        throw new Error('getPrice() must be implemented by subclass');
    }

    async getBalance(asset) {
        throw new Error('getBalance() must be implemented by subclass');
    }

    async placeBuyOrder(symbol, quantity, price) {
        throw new Error('placeBuyOrder() must be implemented by subclass');
    }

    async placeSellOrder(symbol, quantity, price) {
        throw new Error('placeSellOrder() must be implemented by subclass');
    }

    async cancelOrder(orderId) {
        throw new Error('cancelOrder() must be implemented by subclass');
    }

    async getOrderStatus(orderId) {
        throw new Error('getOrderStatus() must be implemented by subclass');
    }

    async getTradeHistory(symbol, limit = 50) {
        throw new Error('getTradeHistory() must be implemented by subclass');
    }

    validateConfig() {
        if (!this.config) {
            throw new Error('Exchange configuration is required');
        }
        if (!this.config.apiKey || !this.config.apiSecret) {
            throw new Error('API key and secret are required');
        }
    }

    handleError(error, context = '') {
        const errorMessage = error.message || 'Unknown error';
        this.logger.error(`${context}: ${errorMessage}`, error);
        throw error;
    }

    formatSymbol(baseAsset, quoteAsset) {
        throw new Error('formatSymbol() must be implemented by subclass');
    }

    parseSymbol(symbol) {
        throw new Error('parseSymbol() must be implemented by subclass');
    }

    calculateQuantity(price, amount, precision = 8) {
        return Number((amount / price).toFixed(precision));
    }

    roundPrice(price, precision = 8) {
        return Number(price.toFixed(precision));
    }
}

module.exports = ExchangeAdapter;