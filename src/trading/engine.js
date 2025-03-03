/**
 * Trading Engine
 * Core component for managing trading operations
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
        // Initialize core dependencies first
        this.configManager = configManager;
        this.securityManager = securityManager;
        this.socketIo = socketIo;
        
        // Create logger instance
        this.logger = new Logger('TradingEngine');
        
        // Get configuration
        if (this.configManager && typeof this.configManager.getConfig === 'function') {
            this.config = this.configManager.getConfig();
        } else {
            throw new Error('Invalid configuration manager provided');
        }

        // Initialize state variables
        this.running = false;
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

        // Define methods that need to be bound
        this.mainLoop = () => this._mainLoop();
        this.monitor = () => this._monitor();
        this.emitLog = (level, message, meta = {}) => {
            if (!this.socketIo) return;
            try {
                this.socketIo.emit('log', {
                    level,
                    message,
                    timestamp: new Date().toISOString(),
                    module: 'TradingEngine',
                    meta
                });
            } catch (error) {
                console.error('Error emitting log to UI:', error);
            }
        };
    }

    async initialize() {
        try {
            this.logger.info('Initializing trading engine');
            
            // Initialize with default config in case decryption fails
            let decryptedConfig = null;
            
            // Try to decrypt configuration if security manager is available
            if (this.securityManager && typeof this.securityManager.decryptConfig === 'function') {
                try {
                    decryptedConfig = await this.securityManager.decryptConfig(this.config);
                    if (!decryptedConfig || typeof decryptedConfig !== 'object') {
                        this.logger.warn('Decrypted config is invalid, using default configuration');
                        decryptedConfig = this.securityManager.getDefaultConfig();
                    }
                } catch (error) {
                    this.logger.error('Failed to decrypt configuration, using default configuration', error);
                    decryptedConfig = this.securityManager.getDefaultConfig();
                }
            } else {
                // If no security manager, use the config directly
                decryptedConfig = this.config;
                if (!decryptedConfig || typeof decryptedConfig !== 'object') {
                    decryptedConfig = {
                        ethereum: { enabled: false },
                        bnbChain: { enabled: false },
                        exchanges: { 
                            binanceUS: { enabled: false },
                            cryptoCom: { enabled: false } 
                        },
                        strategies: { 
                            tokenSniper: { enabled: false },
                            trendTrading: { enabled: false }
                        },
                        trading: {
                            autoStart: false,
                            maxConcurrentTrades: 3
                        }
                    };
                }
            }
            
            // Initialize blockchain connectors
            await this.initializeBlockchainConnectors(decryptedConfig);
            
            // Initialize exchange connectors
            await this.initializeExchangeConnectors(decryptedConfig);
            
            // Initialize strategies
            await this.initializeStrategies(decryptedConfig);
            
            // Initialize token scanner
            await this.initializeTokenScanner(decryptedConfig);
            
            // Load trade history
            await this.loadTradeHistory();
            
            // Update initial balances
            await this.updateBalances();
            
            this.logger.info('Trading engine initialized successfully');
            return true;
        } catch (error) {
            this.logger.error('Failed to initialize trading engine', error);
            return false; // Return false instead of throwing to allow server to continue
        }
    }

    async initializeBlockchainConnectors(decryptedConfig) {
        try {
            // Ensure decryptedConfig exists
            if (!decryptedConfig) {
                this.logger.warn('No configuration provided for blockchain connectors');
                return;
            }

            if (decryptedConfig.ethereum && decryptedConfig.ethereum.enabled) {
                const ethereumLogger = new Logger('EthereumConnector');
                
                this.blockchain.ethereum = new EthereumConnector(
                    decryptedConfig.ethereum,
                    ethereumLogger
                );
                try {
                    await this.blockchain.ethereum.initialize();
                    this.logger.info('Ethereum blockchain connector initialized');
                } catch (ethError) {
                    this.logger.error('Failed to initialize Ethereum connector:', ethError);
                    delete this.blockchain.ethereum;
                }
            }
            
            if (decryptedConfig.bnbChain && decryptedConfig.bnbChain.enabled) {
                const bnbLogger = new Logger('BnbConnector');
                
                this.blockchain.bnbChain = new BnbConnector(
                    decryptedConfig.bnbChain,
                    bnbLogger
                );
                try {
                    await this.blockchain.bnbChain.initialize();
                    this.logger.info('BNB Chain connector initialized');
                } catch (bnbError) {
                    this.logger.error('Failed to initialize BNB Chain connector:', bnbError);
                    delete this.blockchain.bnbChain;
                }
            }
        } catch (error) {
            if (this.logger && typeof this.logger.error === 'function') {
                this.logger.error('Failed to initialize blockchain connectors', error);
            } else {
                console.error('Failed to initialize blockchain connectors:', error);
            }
            // Don't throw to allow application to continue without blockchain support
            this.logger.warn('Continuing without blockchain connector support');
        }
    }
	    async initializeExchangeConnectors(decryptedConfig) {
        try {
            // Ensure decryptedConfig and its exchanges property exist
            if (!decryptedConfig || !decryptedConfig.exchanges) {
                this.logger.warn('No exchange configuration provided');
                return;
            }
            
            // Initialize Binance.US connector if enabled and properly configured
            if (decryptedConfig.exchanges.binanceUS && decryptedConfig.exchanges.binanceUS.enabled && 
                decryptedConfig.exchanges.binanceUS.apiKey && 
                decryptedConfig.exchanges.binanceUS.apiSecret) {
                const binanceLogger = new Logger('BinanceExchange');
                this.exchanges.binanceUS = new BinanceExchange(
                    decryptedConfig.exchanges.binanceUS.apiKey,
                    decryptedConfig.exchanges.binanceUS.apiSecret,
                    binanceLogger
                );
                try {
                    await this.exchanges.binanceUS.initialize();
                    this.logger.info('Binance.US exchange connector initialized');
                } catch (error) {
                    this.logger.warn('Failed to initialize Binance.US connector:', error.message);
                    delete this.exchanges.binanceUS;
                }
            } else if (decryptedConfig.exchanges.binanceUS && decryptedConfig.exchanges.binanceUS.enabled) {
                this.logger.warn('Binance.US is enabled but API credentials are missing');
            }
            
            // Initialize Crypto.com connector if enabled and properly configured
            if (decryptedConfig.exchanges.cryptoCom && decryptedConfig.exchanges.cryptoCom.enabled && 
                decryptedConfig.exchanges.cryptoCom.apiKey && 
                decryptedConfig.exchanges.cryptoCom.apiSecret) {
                const cryptoLogger = new Logger('CryptocomExchange');
                this.exchanges.cryptoCom = new CryptocomExchange(
                    decryptedConfig.exchanges.cryptoCom.apiKey,
                    decryptedConfig.exchanges.cryptoCom.apiSecret,
                    cryptoLogger
                );
                try {
                    await this.exchanges.cryptoCom.initialize();
                    this.logger.info('Crypto.com exchange connector initialized');
                } catch (error) {
                    this.logger.warn('Failed to initialize Crypto.com connector:', error.message);
                    delete this.exchanges.cryptoCom;
                }
            } else if (decryptedConfig.exchanges.cryptoCom && decryptedConfig.exchanges.cryptoCom.enabled) {
                this.logger.warn('Crypto.com is enabled but API credentials are missing');
            }

            // If no exchanges were initialized but some were enabled, log a warning
            if (Object.keys(this.exchanges).length === 0 && 
                ((decryptedConfig.exchanges.binanceUS && decryptedConfig.exchanges.binanceUS.enabled) || 
                (decryptedConfig.exchanges.cryptoCom && decryptedConfig.exchanges.cryptoCom.enabled))) {
                this.logger.warn('No exchange connectors were initialized despite having enabled exchanges');
            }

        } catch (error) {
            // Log the error but don't throw - allow the engine to continue without exchange support
            this.logger.error('Failed to initialize exchange connectors', error);
            this.logger.info('Continuing without exchange support');
        }
    }

    async initializeStrategies(decryptedConfig) {
        try {
            // Ensure decryptedConfig and its strategies property exist
            if (!decryptedConfig || !decryptedConfig.strategies) {
                this.logger.warn('No strategy configuration provided');
                return;
            }
            
            if (decryptedConfig.strategies.tokenSniper && decryptedConfig.strategies.tokenSniper.enabled) {
                const sniperLogger = new Logger('TokenSniperStrategy');
                this.strategies.tokenSniper = new TokenSniperStrategy(
                    this.blockchain,
                    this.exchanges,
                    decryptedConfig.strategies.tokenSniper,
                    sniperLogger
                );
                try {
                    await this.strategies.tokenSniper.initialize();
                    this.logger.info('Token Sniper strategy initialized');
                } catch (error) {
                    this.logger.error('Failed to initialize Token Sniper strategy:', error.message);
                    delete this.strategies.tokenSniper;
                }
            }

            if (decryptedConfig.strategies.trendTrading && decryptedConfig.strategies.trendTrading.enabled) {
                const trendLogger = new Logger('TrendTradingStrategy');
                this.strategies.trendTrading = new TrendTradingStrategy(
                    this.blockchain,
                    this.exchanges,
                    decryptedConfig.strategies.trendTrading,
                    trendLogger
                );
                try {
                    await this.strategies.trendTrading.initialize();
                    this.logger.info('Trend Trading strategy initialized');
                } catch (error) {
                    this.logger.error('Failed to initialize Trend Trading strategy:', error.message);
                    delete this.strategies.trendTrading;
                }
            }
        } catch (error) {
            this.logger.error('Failed to initialize strategies', error);
            this.logger.warn('Continuing without trading strategy support');
        }
    }

    async initializeTokenScanner(decryptedConfig) {
        try {
            if (!decryptedConfig) {
                this.logger.warn('No configuration provided for token scanner');
                return;
            }
            
            const scannerLogger = new Logger('TokenScanner');
            this.tokenScanner = new EnhancedTokenScanner(
                this.blockchain,
                this.exchanges,
                decryptedConfig,
                scannerLogger
            );
            
            try {
                await this.tokenScanner.initialize();
                this.logger.info('Token scanner initialized');
                
                if (this.tokenScanner.on) {
                    this.tokenScanner.on('newToken', (token) => {
                        try {
                            this.handleNewToken(token);
                        } catch (error) {
                            this.logger.error('Error handling new token', error);
                        }
                    });
                    
                    this.tokenScanner.on('error', (error) => {
                        this.logger.error('Token scanner error', error);
                    });
                }
            } catch (error) {
                this.logger.error('Failed to initialize token scanner:', error.message);
                delete this.tokenScanner;
            }
        } catch (error) {
            this.logger.error('Failed to initialize token scanner', error);
            this.logger.warn('Continuing without token scanner support');
        }
    }

    async loadTradeHistory() {
        try {
            const historyPath = this.configManager.getTradeHistoryPath();
            if (!historyPath) {
                this.logger.warn('No trade history path configured');
                return;
            }

            const fsSync = require('fs');
            try {
                if (fsSync.existsSync(historyPath)) {
                    const history = JSON.parse(
                        fsSync.readFileSync(historyPath, 'utf8')
                    );
                    this.tradeHistory = Array.isArray(history) ? history : [];
                    await this.updateStats();
                    this.logger.info(`Loaded ${this.tradeHistory.length} historical trades`);
                } else {
                    this.logger.info('No trade history file found, starting fresh');
                    // Create an empty trade history file
                    fsSync.writeFileSync(historyPath, JSON.stringify([], null, 2), 'utf8');
                    this.tradeHistory = [];
                }
            } catch (readError) {
                this.logger.error('Failed to read trade history', readError);
                this.tradeHistory = [];
            }
        } catch (error) {
            this.logger.error('Failed to load trade history', error);
            this.tradeHistory = [];
        }
    }
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
                try {
                                        await this.tokenScanner.start();
                    this.logger.info('Token scanner started');
                } catch (error) {
                    this.logger.error('Failed to start token scanner:', error);
                }
            }

            // Start main trading loop
            this.mainLoopInterval = setInterval(this.mainLoop, 1000);

            // Start monitoring loop
            this.monitoringInterval = setInterval(this.monitor, 5000);

            this.logger.info('Trading engine started successfully');
            
            // Emit started event
            if (this.socketIo) {
                this.socketIo.emit('botStarted', {
                    timestamp: new Date().toISOString(),
                    stats: this.stats
                });
            }

            return true;
        } catch (error) {
            this.running = false;
            this.logger.error('Failed to start trading engine', error);
            return false;
        }
    }

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
                try {
                    await this.tokenScanner.stop();
                    this.logger.info('Token scanner stopped');
                } catch (error) {
                    this.logger.error('Failed to stop token scanner:', error);
                }
            }

            this.running = false;
            
            // Emit stopped event
            if (this.socketIo) {
                this.socketIo.emit('botStopped', {
                    timestamp: new Date().toISOString(),
                    stats: this.stats
                });
            }

            this.logger.info('Trading engine stopped successfully');
            return true;
        } catch (error) {
            this.logger.error('Failed to stop trading engine', error);
            return false;
        }
    }

    async _mainLoop() {
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

    async _monitor() {
        if (!this.running) return;

        try {
            await this.updateBalances();
            await this.updateStats();
        } catch (error) {
            this.logger.error('Error in monitor loop', error);
        }
    }

    async monitorTrades() {
        try {
            for (const [tradeId, trade] of Object.entries(this.activeTrades)) {
                try {
                    const updatedTrade = await this.updateTradeStatus(trade);
                    
                    if (updatedTrade.status === 'completed' || updatedTrade.status === 'failed') {
                        delete this.activeTrades[tradeId];
                        this.tradeHistory.push(updatedTrade);
                        await this.updateStats();
                        
                        if (this.socketIo) {
                            this.socketIo.emit('tradeCompleted', {
                                tradeId,
                                status: updatedTrade.status,
                                profitLoss: updatedTrade.profitLoss,
                                timestamp: new Date().toISOString()
                            });
                        }
                    } else {
                        this.activeTrades[tradeId] = updatedTrade;
                        
                        if (this.socketIo) {
                            this.socketIo.emit('tradeUpdated', {
                                tradeId,
                                status: updatedTrade.status,
                                currentPrice: updatedTrade.currentPrice,
                                profitLoss: updatedTrade.unrealizedProfitLoss,
                                timestamp: new Date().toISOString()
                            });
                        }
                    }
                } catch (tradeError) {
                    this.logger.error(`Error monitoring trade ${tradeId}`, tradeError);
                }
            }
        } catch (error) {
            this.logger.error('Error monitoring trades', error);
        }
    }
    
    async updateTradeStatus(trade) {
        try {
            const updatedTrade = { ...trade };
            
            // Get current price for the trading pair
            const currentPrice = await this.getPriceForTrade(trade);
            updatedTrade.currentPrice = currentPrice;
            
            // Calculate unrealized profit/loss
            const unrealizedPL = this.calculateUnrealizedProfitLoss(trade, currentPrice);
            updatedTrade.unrealizedProfitLoss = unrealizedPL;
            
            // Check stop loss and take profit conditions
            if (this.shouldTriggerStopLoss(trade, currentPrice)) {
                await this.closeTrade(trade, 'stop_loss');
                updatedTrade.status = 'completed';
                updatedTrade.closeReason = 'stop_loss';
            } else if (this.shouldTriggerTakeProfit(trade, currentPrice)) {
                await this.closeTrade(trade, 'take_profit');
                updatedTrade.status = 'completed';
                updatedTrade.closeReason = 'take_profit';
            }
            
            // Update trade timestamps
            updatedTrade.lastUpdated = new Date().toISOString();
            
            return updatedTrade;
        } catch (error) {
            this.logger.error(`Error updating trade status for trade ${trade.id}`, error);
            return trade;
        }
    }

    async getPriceForTrade(trade) {
        try {
            if (trade.exchange === 'dex') {
                // Get price from blockchain
                const connector = this.blockchain[trade.network];
                if (connector && typeof connector.getTokenPrice === 'function') {
                    return await connector.getTokenPrice(trade.tokenAddress);
                }
            } else {
                // Get price from CEX
                const exchange = this.exchanges[trade.exchange];
                if (exchange && typeof exchange.getPrice === 'function') {
                    return await exchange.getPrice(trade.symbol);
                }
            }
            throw new Error('No valid price source found for trade');
        } catch (error) {
            this.logger.error(`Error getting price for trade ${trade.id}`, error);
            return null;
        }
    }

    calculateUnrealizedProfitLoss(trade, currentPrice) {
        try {
            if (!currentPrice || !trade.entryPrice || !trade.quantity) {
                return 0;
            }
            
            const difference = trade.side === 'buy' 
                ? currentPrice - trade.entryPrice 
                : trade.entryPrice - currentPrice;
                
            return difference * trade.quantity;
        } catch (error) {
            this.logger.error(`Error calculating unrealized P/L for trade ${trade.id}`, error);
            return 0;
        }
    }

    shouldTriggerStopLoss(trade, currentPrice) {
        try {
            if (!trade.stopLoss || !currentPrice) {
                return false;
            }
            
            if (trade.side === 'buy') {
                return currentPrice <= trade.stopLoss;
            } else {
                return currentPrice >= trade.stopLoss;
            }
        } catch (error) {
            this.logger.error(`Error checking stop loss for trade ${trade.id}`, error);
            return false;
        }
    }

    shouldTriggerTakeProfit(trade, currentPrice) {
        try {
            if (!trade.takeProfit || !currentPrice) {
                return false;
            }
            
            if (trade.side === 'buy') {
                return currentPrice >= trade.takeProfit;
            } else {
                return currentPrice <= trade.takeProfit;
            }
        } catch (error) {
            this.logger.error(`Error checking take profit for trade ${trade.id}`, error);
            return false;
        }
    }

    async closeTrade(trade, reason) {
        try {
            if (trade.exchange === 'dex') {
                const connector = this.blockchain[trade.network];
                if (connector && typeof connector.closePosition === 'function') {
                    await connector.closePosition(trade);
                }
            } else {
                const exchange = this.exchanges[trade.exchange];
                if (exchange && typeof exchange.closePosition === 'function') {
                    await exchange.closePosition(trade);
                }
            }
            
            trade.status = 'completed';
            trade.closeReason = reason;
            trade.closedAt = new Date().toISOString();
            
            trade.profitLoss = this.calculateUnrealizedProfitLoss(
                trade,
                trade.closePrice || trade.currentPrice
            );
            
            // Save trade history
            try {
                const fs = require('fs');
                const historyPath = this.configManager.getTradeHistoryPath();
                if (historyPath) {
                    this.tradeHistory.push(trade);
                    fs.writeFileSync(historyPath, JSON.stringify(this.tradeHistory, null, 2), 'utf8');
                }
            } catch (saveError) {
                this.logger.error('Failed to save trade history', saveError);
            }
            
            delete this.activeTrades[trade.id];
            
            await this.updateStats();
            
            if (this.socketIo) {
                this.socketIo.emit('tradeClosed', {
                    tradeId: trade.id,
                    reason,
                    profitLoss: trade.profitLoss,
                    timestamp: new Date().toISOString()
                });
            }
            
            return true;
        } catch (error) {
            this.logger.error(`Error closing trade ${trade.id}`, error);
            return false;
        }
    }

    async updateStats() {
        try {
            const stats = {
                totalTrades: this.tradeHistory.length,
                successfulTrades: this.tradeHistory.filter(t => t.status === 'completed' && t.profitLoss > 0).length,
                failedTrades: this.tradeHistory.filter(t => t.status === 'failed' || t.profitLoss <= 0).length,
                profitLoss: this.calculateTotalProfitLoss(),
                startTime: this.stats.startTime,
                lastTradeTime: this.tradeHistory.length > 0 ? 
                    this.tradeHistory[this.tradeHistory.length - 1].timestamp : null
            };
            
            stats.winRate = stats.totalTrades > 0 ? 
                (stats.successfulTrades / stats.totalTrades) * 100 : 0;
            
            this.stats = stats;
            
            if (this.socketIo) {
                this.socketIo.emit('statsUpdate', stats);
            }
            
            return stats;
        } catch (error) {
            this.logger.error('Error updating stats', error);
            return this.stats;
        }
    }

    calculateTotalProfitLoss() {
        try {
            return this.tradeHistory.reduce((total, trade) => {
                if (trade.profitLoss) {
                    return total + trade.profitLoss;
                }
                return total;
            }, 0);
        } catch (error) {
            this.logger.error('Error calculating total profit/loss', error);
            return 0;
        }
    }

    async updateBalances() {
        try {
            const balances = {
                ethereum: {},
                bnbChain: {},
                exchanges: {}
            };

            if (this.blockchain.ethereum && typeof this.blockchain.ethereum.getBalances === 'function') {
                try {
                    balances.ethereum = await this.blockchain.ethereum.getBalances();
                } catch (error) {
                    this.logger.warn('Failed to get Ethereum balances:', error.message);
                }
            }

            if (this.blockchain.bnbChain && typeof this.blockchain.bnbChain.getBalances === 'function') {
                try {
                    balances.bnbChain = await this.blockchain.bnbChain.getBalances();
                } catch (error) {
                    this.logger.warn('Failed to get BNB Chain balances:', error.message);
                }
            }

            for (const [exchange, connector] of Object.entries(this.exchanges)) {
                if (connector && typeof connector.getBalances === 'function') {
                    try {
                        balances.exchanges[exchange] = await connector.getBalances();
                    } catch (error) {
                        this.logger.warn(`Failed to get balances for ${exchange}:`, error.message);
                        balances.exchanges[exchange] = {};
                    }
                }
            }

            this.balances = balances;

            if (this.socketIo) {
                this.socketIo.emit('balanceUpdate', {
                    balances,
                    timestamp: new Date().toISOString()
                });
            }

            return balances;
        } catch (error) {
            this.logger.error('Error updating balances', error);
            return this.balances;
        }
    }

    async handleNewToken(token) {
        try {
            for (const [name, strategy] of Object.entries(this.strategies)) {
                if (strategy && typeof strategy.onNewToken === 'function') {
                    await strategy.onNewToken(token);
                }
            }
        } catch (error) {
            this.logger.error('Error handling new token', error);
        }
    }

    // Getter methods
    getActiveTrades() {
        return this.activeTrades;
    }

    getTradeHistory() {
        return this.tradeHistory;
    }

    getBalances() {
        return this.balances;
    }

    getStats() {
        return this.stats;
    }

    isRunning() {
        return this.running;
    }
}

module.exports = { TradingEngine };