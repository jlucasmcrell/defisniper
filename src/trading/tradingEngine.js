/**
 * Trading Engine for CryptoSniperBot
 * Core component that manages all trading operations
 */
const { Logger } = require('../utils/logger');
const ExchangeFactory = require('./exchangeFactory');
const EventEmitter = require('events');

class TradingEngine extends EventEmitter {
    constructor() {
        super();
        this.logger = new Logger('TradingEngine');
        this.configManager = null;
        this.securityManager = null;
        this.initialized = false;
        this.running = false;
        this.activeOrders = new Map();
        this.activeTrades = new Map();
        this.exchanges = new Map();
        this.lastTick = Date.now();
        this.tradingInterval = null;
    }

    setDependencies(configManager, securityManager) {
        this.configManager = configManager;
        this.securityManager = securityManager;
    }

    /**
     * Initialize the trading engine
     */
    async initialize() {
        try {
            this.logger.info('Initializing trading engine');
            
            if (!this.configManager || !this.securityManager) {
                throw new Error('Trading engine dependencies not set');
            }

            // Get configuration
            const config = this.configManager.getConfig();
            if (!config || !this.configManager.isConfigured()) {
                throw new Error('Trading engine not configured');
            }
            
            // Initialize exchange connections
            if (config.exchanges) {
                await this.initializeExchanges(config.exchanges);
            }
            
            // Initialize blockchain connections
            await this.initializeBlockchains(config);
            
            this.initialized = true;
            this.logger.info('Trading engine initialized successfully');
            return true;
        } catch (error) {
            this.logger.error('Failed to initialize trading engine', error);
            this.initialized = false;
            throw error;
        }
    }

    /**
     * Initialize exchange connections
     */
    async initializeExchanges(exchangesConfig) {
        try {
            if (exchangesConfig.binanceUS && exchangesConfig.binanceUS.enabled) {
                const apiKey = this.securityManager.decrypt(exchangesConfig.binanceUS.apiKey);
                const apiSecret = this.securityManager.decrypt(exchangesConfig.binanceUS.apiSecret);
                const exchange = ExchangeFactory.createExchange('binanceUS', { apiKey, apiSecret });
                await exchange.initialize();
                this.exchanges.set('binanceUS', exchange);
                this.logger.info('Initialized Binance.US exchange');
            }

            if (exchangesConfig.cryptoCom && exchangesConfig.cryptoCom.enabled) {
                const apiKey = this.securityManager.decrypt(exchangesConfig.cryptoCom.apiKey);
                const apiSecret = this.securityManager.decrypt(exchangesConfig.cryptoCom.apiSecret);
                const exchange = ExchangeFactory.createExchange('cryptoCom', { apiKey, apiSecret });
                await exchange.initialize();
                this.exchanges.set('cryptoCom', exchange);
                this.logger.info('Initialized Crypto.com exchange');
            }
        } catch (error) {
            this.logger.error('Failed to initialize exchanges', error);
            throw error;
        }
    }

    /**
     * Initialize blockchain connections
     */
    async initializeBlockchains(config) {
        try {
            if (config.ethereum && config.ethereum.enabled) {
                const privateKey = this.securityManager.decrypt(config.ethereum.privateKey);
                const infuraId = this.securityManager.decrypt(config.ethereum.infuraId);
                // Initialize Ethereum connection here
                this.logger.info('Initialized Ethereum connection');
            }
            
            if (config.bnbChain && config.bnbChain.enabled) {
                const privateKey = this.securityManager.decrypt(config.bnbChain.privateKey);
                // Initialize BNB Chain connection here
                this.logger.info('Initialized BNB Chain connection');
            }
        } catch (error) {
            this.logger.error('Failed to initialize blockchains', error);
            throw error;
        }
    }

    /**
     * Start trading operations
     */
    async start() {
        if (!this.initialized) {
            this.logger.error('Cannot start - trading engine not initialized');
            return false;
        }
        
        if (this.running) {
            this.logger.warn('Trading engine is already running');
            return true;
        }
        
        try {
            this.running = true;
            this.tradingInterval = setInterval(() => this.tick(), 1000);
            this.logger.info('Trading engine started');
            this.emit('started');
            return true;
        } catch (error) {
            this.logger.error('Failed to start trading engine', error);
            this.running = false;
            return false;
        }
    }

    /**
     * Stop trading operations
     */
    async stop() {
        if (!this.running) {
            this.logger.warn('Trading engine is not running');
            return true;
        }
        
        try {
            this.running = false;
            if (this.tradingInterval) {
                clearInterval(this.tradingInterval);
                this.tradingInterval = null;
            }
            this.logger.info('Trading engine stopped');
            this.emit('stopped');
            return true;
        } catch (error) {
            this.logger.error('Failed to stop trading engine', error);
            return false;
        }
    }

    /**
     * Main trading loop tick
     */
    async tick() {
        if (!this.running) return;

        const now = Date.now();
        const elapsed = now - this.lastTick;
        this.lastTick = now;

        try {
            this.logger.debug('Running main trading loop');
            await this.updateMarketData();
            await this.checkOpenTrades();
            await this.findNewTrades();
        } catch (error) {
            this.logger.error('Error in trading loop', error);
        }
    }

    /**
     * Update market data
     */
    async updateMarketData() {
        try {
            for (const [name, exchange] of this.exchanges) {
                await exchange.updateMarketData();
            }
        } catch (error) {
            this.logger.error('Failed to update market data', error);
        }
    }

    /**
     * Check open trades
     */
    async checkOpenTrades() {
        try {
            for (const [id, trade] of this.activeTrades) {
                await this.checkTrade(trade);
            }
        } catch (error) {
            this.logger.error('Failed to check open trades', error);
        }
    }

    /**
     * Check individual trade
     */
    async checkTrade(trade) {
        try {
            const currentPrice = await this.getCurrentPrice(trade.symbol, trade.exchange);
            
            if (this.shouldCloseTrade(trade, currentPrice)) {
                await this.closeTrade(trade);
            }
        } catch (error) {
            this.logger.error(`Failed to check trade ${trade.id}`, error);
        }
    }

    /**
     * Find new trading opportunities
     */
    async findNewTrades() {
        try {
            if (this.activeTrades.size >= this.configManager.get('trading.maxConcurrentTrades')) {
                return;
            }

            // Trading logic implementation here
        } catch (error) {
            this.logger.error('Failed to find new trades', error);
        }
    }

    /**
     * Get current price for symbol
     */
    async getCurrentPrice(symbol, exchangeName) {
        const exchange = this.exchanges.get(exchangeName);
        if (!exchange) {
            throw new Error(`Exchange ${exchangeName} not found`);
        }
        return await exchange.getCurrentPrice(symbol);
    }

    /**
     * Check if trade should be closed
     */
    shouldCloseTrade(trade, currentPrice) {
        const stopLoss = this.configManager.get('trading.stopLoss');
        const takeProfit = this.configManager.get('trading.takeProfit');
        
        if (!stopLoss || !takeProfit) return false;

        const priceChange = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;
        
        return priceChange <= -stopLoss || priceChange >= takeProfit;
    }

    /**
     * Close a trade
     */
    async closeTrade(trade) {
        try {
            const exchange = this.exchanges.get(trade.exchange);
            if (!exchange) {
                throw new Error(`Exchange ${trade.exchange} not found`);
            }

            await exchange.closeTrade(trade);
            this.activeTrades.delete(trade.id);
            this.emit('tradeClosed', trade);
            this.logger.info(`Closed trade ${trade.id}`);
        } catch (error) {
            this.logger.error(`Failed to close trade ${trade.id}`, error);
        }
    }

    /**
     * Check if trading engine is running
     */
    isRunning() {
        return this.running;
    }

    /**
     * Get active trades
     */
    getActiveTrades() {
        return Array.from(this.activeTrades.values());
    }

    /**
     * Get active orders
     */
    getActiveOrders() {
        return Array.from(this.activeOrders.values());
    }
}

module.exports = TradingEngine;