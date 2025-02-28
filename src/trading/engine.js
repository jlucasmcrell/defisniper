/**
 * Trading Engine
 * 
 * Core component that orchestrates all trading activities including strategy
 * execution, trade management, position monitoring, and risk management.
 */

const ethers = require('ethers');
const { v4: uuidv4 } = require('uuid');
const { Logger } = require('../utils/logger');
const { TokenSniperStrategy } = require('../strategies/tokenSniper');
const { ScalpingStrategy } = require('../strategies/scalping');
const { TrendTradingStrategy } = require('../strategies/trendTrading');
const { EthereumConnector } = require('../blockchain/ethereumConnector');
const { BnbConnector } = require('../blockchain/bnbConnector');
const { BinanceExchange } = require('../exchanges/binance');
const { CryptocomExchange } = require('../exchanges/cryptocom');
const { EnhancedTrendTradingStrategy } = require('../strategies/enhancedTrendTrading');
const { EnhancedTokenScanner } = require('../scanner/enhancedTokenScanner');

class TradingEngine {
    constructor(configManager, securityManager, socketIo) {
        this.configManager = configManager;
        this.securityManager = securityManager;
        this.socketIo = socketIo;
        this.logger = new Logger('TradingEngine');
        
        // Set up logger to also emit logs to UI
        const originalInfo = this.logger.info;
        const originalError = this.logger.error;
        const originalWarn = this.logger.warn;
        const originalDebug = this.logger.debug;
        
        // Override logger methods to also emit to socket
        this.logger.info = (message, meta) => {
            originalInfo.call(this.logger, message, meta);
            this.emitLog('info', message, meta);
        };
        
        this.logger.error = (message, meta) => {
            originalError.call(this.logger, message, meta);
            this.emitLog('error', message, meta);
        };
        
        this.logger.warn = (message, meta) => {
            originalWarn.call(this.logger, message, meta);
            this.emitLog('warn', message, meta);
        };
        
        this.logger.debug = (message, meta) => {
            originalDebug.call(this.logger, message, meta);
            this.emitLog('debug', message, meta);
        };
        
        this.running = false;
        this.config = configManager.getConfig();
        this.strategies = {};
        this.blockchain = {};
        this.exchanges = {};
        this.activeTrades = {};
        this.tradeHistory = [];
        this.balances = {};
        this.stats = {
            totalTrades: 0,
            successfulTrades: 0,
            failedTrades: 0,
            profitLoss: 0,
            winRate: 0,
            startTime: null,
            lastTradeTime: null
        };
        
        this.mainLoopInterval = null;
        this.monitoringInterval = null;
        this.lastBalanceUpdate = 0;
    }

    /**
     * Emit log to UI
     */
    emitLog(level, message, meta) {
        try {
            this.socketIo.emit('log', {
                level,
                message,
                timestamp: new Date().toISOString(),
                module: 'TradingEngine',
                meta: meta || {}
            });
        } catch (error) {
            console.error('Error emitting log to UI', error);
        }
    }

    /**
     * Check if the trading engine is running
     * @returns {boolean} True if the engine is running, false otherwise
     */
    isRunning() {
        return this.running;
    }

    /**
     * Get active trades
     * @returns {Object} Dictionary of active trades
     */
    getActiveTrades() {
        return this.activeTrades;
    }

    /**
     * Get wallet balances
     * @returns {Object} Current balances for all connected wallets
     */
    getBalances() {
        return this.balances;
    }

    /**
     * Get trading stats
     * @returns {Object} Current trading statistics
     */
    getStats() {
        return this.stats;
    }

    /**
     * Get trade history
     * @returns {Array} List of historical trades
     */
    getTradeHistory() {
        return this.tradeHistory;
    }
	/**
     * Initialize the trading engine with improved error handling
     */
    async initialize() {
        try {
            this.logger.info('Initializing trading engine with enhanced capabilities');
            
            // Decrypt private keys and API credentials with better error handling
            let decryptedConfig;
            try {
                decryptedConfig = this.securityManager.decryptConfig(this.config);
                this.logger.info('Config decrypted successfully');
            } catch (decryptError) {
                this.logger.error('Failed to decrypt configuration', decryptError);
                throw new Error('Configuration decryption failed. Please check your encryption key.');
            }
            
            // Initialize blockchain connectors with improved error handling
            await this.initializeBlockchainConnectors(decryptedConfig);
            
            // Initialize exchange connectors with improved error handling
            await this.initializeExchangeConnectors(decryptedConfig);
            
            // Initialize trading strategies with expanded token support
            await this.initializeStrategies(decryptedConfig);
            
            // Set up token scanner for new token detection
            await this.initializeTokenScanner(decryptedConfig);
            
            // Load trade history and update stats
            await this.loadTradeHistory();
            
            // Update wallet balances
            await this.updateBalances();
            
            // Add test tokens for debugging if in development mode
            if (decryptedConfig.development) {
                await this.addTestTokens();
            }
            
            // Emit initialized event to clients
            this.socketIo.emit('engineInitialized', {
                blockchains: Object.keys(this.blockchain),
                exchanges: Object.keys(this.exchanges),
                strategies: Object.keys(this.strategies)
            });
            
            this.logger.info('Trading engine initialized successfully');
            return true;
        } catch (error) {
            this.logger.error('Failed to initialize trading engine', error);
            
            // Emit error to clients
            this.socketIo.emit('initializationError', {
                message: error.message,
                stack: error.stack
            });
            
            throw error;
        }
    }

    /**
     * Initialize blockchain connectors with improved error handling
     */
    async initializeBlockchainConnectors(decryptedConfig) {
        try {
            this.logger.info('Initializing blockchain connectors');
            
            // Initialize Ethereum connector
            if (decryptedConfig.ethereum && decryptedConfig.ethereum.enabled) {
                this.logger.info('Setting up Ethereum connector');
                
                try {
                    this.blockchain.ethereum = new EthereumConnector(
                        decryptedConfig,
                        this.logger
                    );
                    
                    const success = await this.blockchain.ethereum.initialize();
                    
                    if (success) {
                        const address = this.blockchain.ethereum.getAddress();
                        if (typeof address === 'string') {
                            this.logger.info(`Ethereum wallet address: ${address.substr(0, 10)}...`);
                        } else {
                            this.logger.info('Ethereum wallet address: Unknown');
                        }
                    }
                } catch (ethError) {
                    this.logger.error('Failed to initialize Ethereum connector', ethError);
                }
            }
            
            // Initialize BNB Chain connector
            if (decryptedConfig.bnbChain && decryptedConfig.bnbChain.enabled) {
                this.logger.info('Setting up BNB Chain connector');
                
                try {
                    this.blockchain.bnbChain = new BnbConnector(
                        decryptedConfig,
                        this.logger
                    );
                    
                    const success = await this.blockchain.bnbChain.initialize();
                    
                    if (success) {
                        const address = this.blockchain.bnbChain.getAddress();
                        if (typeof address === 'string') {
                            this.logger.info(`BNB Chain wallet address: ${address.substr(0, 10)}...`);
                        } else {
                            this.logger.info('BNB Chain wallet address: Unknown');
                        }
                    }
                } catch (bnbError) {
                    this.logger.error('Failed to initialize BNB Chain connector', bnbError);
                }
            }
            
            return true;
        } catch (error) {
            this.logger.error('Error initializing blockchain connectors', error);
            return false;
        }
    }

    /**
     * Initialize exchange connectors with improved error handling
     */
    async initializeExchangeConnectors(decryptedConfig) {
        try {
            this.logger.info('Initializing exchange connectors');
            
            // Initialize Binance.US connector
            if (decryptedConfig.exchanges?.binanceUS?.enabled) {
                this.logger.info('Setting up Binance.US connector');
                
                try {
                    const binanceConfig = decryptedConfig.exchanges.binanceUS;
                    if (!binanceConfig.apiKey || !binanceConfig.apiSecret) {
                        throw new Error('Missing Binance.US API credentials');
                    }

                    this.exchanges.binanceUS = new BinanceExchange(
                        binanceConfig.apiKey,
                        binanceConfig.apiSecret,
                        this.logger
                    );
                    
                    await this.exchanges.binanceUS.initialize();
                    this.logger.info('Binance.US connector initialized successfully');
                } catch (binanceError) {
                    this.logger.error('Failed to initialize Binance.US connector', binanceError);
                }
            }
            
            // Initialize Crypto.com connector
            if (decryptedConfig.exchanges?.cryptoCom?.enabled) {
                this.logger.info('Setting up Crypto.com connector');
                
                try {
                    const cryptoConfig = decryptedConfig.exchanges.cryptoCom;
                    if (!cryptoConfig.apiKey || !cryptoConfig.apiSecret) {
                        throw new Error('Missing Crypto.com API credentials');
                    }

                    this.exchanges.cryptoCom = new CryptocomExchange(
                        cryptoConfig.apiKey,
                        cryptoConfig.apiSecret,
                        this.logger
                    );
                    
                    await this.exchanges.cryptoCom.initialize();
                    this.logger.info('Crypto.com connector initialized successfully');
                } catch (cryptoError) {
                    this.logger.error('Failed to initialize Crypto.com connector', cryptoError);
                }
            }
            
            return true;
        } catch (error) {
            this.logger.error('Error initializing exchange connectors', error);
            return false;
        }
    }
	    /**
     * Initialize trading strategies
     */
    async initializeStrategies(decryptedConfig) {
        try {
            this.logger.info('Initializing trading strategies');
            
            // Initialize Token Sniper strategy if enabled
            if (decryptedConfig.strategies?.tokenSniper?.enabled) {
                try {
                    this.strategies.tokenSniper = new TokenSniperStrategy(
                        this.blockchain,
                        this.exchanges,
                        decryptedConfig.strategies.tokenSniper,
                        this.logger
                    );
                    await this.strategies.tokenSniper.initialize();
                    this.logger.info('Token Sniper strategy initialized successfully');
                } catch (error) {
                    this.logger.error('Failed to initialize Token Sniper strategy', error);
                }
            }

            // Initialize Scalping strategy if enabled
            if (decryptedConfig.strategies?.scalping?.enabled) {
                try {
                    this.strategies.scalping = new ScalpingStrategy(
                        this.blockchain,
                        this.exchanges,
                        decryptedConfig.strategies.scalping,
                        this.logger
                    );
                    await this.strategies.scalping.initialize();
                    this.logger.info('Scalping strategy initialized successfully');
                } catch (error) {
                    this.logger.error('Failed to initialize Scalping strategy', error);
                }
            }

            // Initialize Enhanced Trend Trading strategy if enabled
            if (decryptedConfig.strategies?.enhancedTrendTrading?.enabled) {
                try {
                    this.strategies.enhancedTrendTrading = new EnhancedTrendTradingStrategy(
                        this.blockchain,
                        this.exchanges,
                        decryptedConfig.strategies.enhancedTrendTrading,
                        this.logger
                    );
                    await this.strategies.enhancedTrendTrading.initialize();
                    this.logger.info('Enhanced Trend Trading strategy initialized successfully');
                } catch (error) {
                    this.logger.error('Failed to initialize Enhanced Trend Trading strategy', error);
                }
            }

            return true;
        } catch (error) {
            this.logger.error('Error initializing strategies', error);
            return false;
        }
    }

    /**
     * Start the trading engine
     */
    async start() {
        if (this.running) {
            this.logger.warn('Trading engine is already running');
            return false;
        }

        try {
            this.logger.info('Starting trading engine');
            this.running = true;
            this.stats.startTime = new Date();

            // Start token scanner if initialized
            if (this.tokenScanner && typeof this.tokenScanner.start === 'function') {
                await this.tokenScanner.start();
            }

            // Start main trading loop
            this.mainLoopInterval = setInterval(() => this.mainLoop(), 1000);

            // Start monitoring loop
            this.monitoringInterval = setInterval(() => this.monitor(), 5000);

            this.logger.info('Trading engine started successfully');
            
            // Emit started event
            this.socketIo.emit('botStarted', {
                timestamp: new Date().toISOString(),
                stats: this.stats
            });

            return true;
        } catch (error) {
            this.running = false;
            this.logger.error('Failed to start trading engine', error);
            return false;
        }
    }

    /**
     * Stop the trading engine
     */
    async stop() {
        if (!this.running) {
            this.logger.warn('Trading engine is not running');
            return false;
        }

        try {
            this.logger.info('Stopping trading engine');

            // Clear intervals
            if (this.mainLoopInterval) {
                clearInterval(this.mainLoopInterval);
                this.mainLoopInterval = null;
            }

            if (this.monitoringInterval) {
                clearInterval(this.monitoringInterval);
                this.monitoringInterval = null;
            }

            // Stop token scanner
            if (this.tokenScanner && typeof this.tokenScanner.stop === 'function') {
                await this.tokenScanner.stop();
            }

            this.running = false;
            
            // Emit stopped event
            this.socketIo.emit('botStopped', {
                timestamp: new Date().toISOString(),
                stats: this.stats
            });

            this.logger.info('Trading engine stopped successfully');
            return true;
        } catch (error) {
            this.logger.error('Failed to stop trading engine', error);
            return false;
        }
    }

    /**
     * Main trading loop
     */
    async mainLoop() {
        if (!this.running) return;

        try {
            // Update balances every 60 seconds
            const now = Date.now();
            if (now - this.lastBalanceUpdate > 60000) {
                await this.updateBalances();
                this.lastBalanceUpdate = now;
            }

            // Execute active strategies
            for (const [name, strategy] of Object.entries(this.strategies)) {
                try {
                    if (typeof strategy.execute === 'function') {
                        await strategy.execute();
                    }
                } catch (strategyError) {
                    this.logger.error(`Error executing strategy ${name}`, strategyError);
                }
            }

            // Monitor active trades
            await this.monitorTrades();
        } catch (error) {
            this.logger.error('Error in main trading loop', error);
        }
    }

    /**
     * Monitor active trades and update statuses
     */
    async monitorTrades() {
        try {
            for (const [tradeId, trade] of Object.entries(this.activeTrades)) {
                try {
                    const updatedTrade = await this.updateTradeStatus(trade);
                    
                    if (updatedTrade.status === 'completed' || updatedTrade.status === 'failed') {
                        delete this.activeTrades[tradeId];
                        this.tradeHistory.push(updatedTrade);
                        await this.updateStats();
                    } else {
                        this.activeTrades[tradeId] = updatedTrade;
                    }
                } catch (tradeError) {
                    this.logger.error(`Error monitoring trade ${tradeId}`, tradeError);
                }
            }
        } catch (error) {
            this.logger.error('Error monitoring trades', error);
        }
    }

    /**
     * Update trade status
     */
    async updateTradeStatus(trade) {
        // Implementation details depend on trade structure and blockchain/exchange specifics
        return trade;
    }

    /**
     * Update trading statistics
     */
    async updateStats() {
        try {
            const stats = {
                totalTrades: this.tradeHistory.length,
                successfulTrades: this.tradeHistory.filter(t => t.status === 'completed').length,
                failedTrades: this.tradeHistory.filter(t => t.status === 'failed').length,
                profitLoss: this.calculateTotalProfitLoss(),
                startTime: this.stats.startTime,
                lastTradeTime: this.tradeHistory.length > 0 ? 
                    this.tradeHistory[this.tradeHistory.length - 1].timestamp : null
            };

            stats.winRate = stats.totalTrades > 0 ? 
                (stats.successfulTrades / stats.totalTrades) * 100 : 0;

            this.stats = stats;

            // Emit updated stats
            this.socketIo.emit('statsUpdate', stats);

            return stats;
        } catch (error) {
            this.logger.error('Error updating stats', error);
            return this.stats;
        }
    }

    /**
     * Calculate total profit/loss
     */
    calculateTotalProfitLoss() {
        return this.tradeHistory.reduce((total, trade) => {
            return total + (trade.profitLoss || 0);
        }, 0);
    }
}

module.exports = { TradingEngine };