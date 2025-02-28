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
        
        // Initialize logger first
        this.logger = new Logger('TradingEngine');
        
        // Verify logger methods exist before setting up socket emissions
        if (this.logger && typeof this.logger.info === 'function') {
            const originalInfo = this.logger.info.bind(this.logger);
            this.logger.info = (message, meta) => {
                originalInfo(message, meta);
                this.emitLog('info', message, meta);
            };
        }
        
        if (this.logger && typeof this.logger.error === 'function') {
            const originalError = this.logger.error.bind(this.logger);
            this.logger.error = (message, meta) => {
                originalError(message, meta);
                this.emitLog('error', message, meta);
            };
        }
        
        if (this.logger && typeof this.logger.warn === 'function') {
            const originalWarn = this.logger.warn.bind(this.logger);
            this.logger.warn = (message, meta) => {
                originalWarn(message, meta);
                this.emitLog('warn', message, meta);
            };
        }
        
        if (this.logger && typeof this.logger.debug === 'function') {
            const originalDebug = this.logger.debug.bind(this.logger);
            this.logger.debug = (message, meta) => {
                originalDebug(message, meta);
                this.emitLog('debug', message, meta);
            };
        }
        
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

    // ... previous emitLog method remains the same ...

    async initialize() {
        try {
            this.logger.info('Initializing trading engine');
            
            // Create a new logger instance for blockchain connectors
            const blockchainLogger = new Logger('BlockchainConnector');
            
            // Decrypt private keys and API credentials
            const decryptedConfig = this.securityManager.decryptConfig(this.config);
            
            // Initialize blockchain connectors with proper logger
            if (decryptedConfig.ethereum && decryptedConfig.ethereum.enabled) {
                this.blockchain.ethereum = new EthereumConnector(
                    decryptedConfig.ethereum.privateKey,
                    decryptedConfig.ethereum.alchemyKey,
                    blockchainLogger // Pass the dedicated blockchain logger
                );
                await this.blockchain.ethereum.initialize();
            }
            
            if (decryptedConfig.bnbChain && decryptedConfig.bnbChain.enabled) {
                this.blockchain.bnbChain = new BnbConnector(
                    decryptedConfig.ethereum.privateKey,
                    blockchainLogger // Pass the dedicated blockchain logger
                );
                await this.blockchain.bnbChain.initialize();
            }
            
            // Create a new logger instance for exchanges
            const exchangeLogger = new Logger('ExchangeConnector');
            
            // Initialize exchange connectors with proper logger
            if (decryptedConfig.exchanges) {
                if (decryptedConfig.exchanges.binanceUS && decryptedConfig.exchanges.binanceUS.enabled) {
                    this.exchanges.binanceUS = new BinanceExchange(
                        decryptedConfig.exchanges.binanceUS.apiKey,
                        decryptedConfig.exchanges.binanceUS.apiSecret,
                        exchangeLogger
                    );
                    await this.exchanges.binanceUS.initialize();
                }
                
                if (decryptedConfig.exchanges.cryptoCom && decryptedConfig.exchanges.cryptoCom.enabled) {
                    this.exchanges.cryptoCom = new CryptocomExchange(
                        decryptedConfig.exchanges.cryptoCom.apiKey,
                        decryptedConfig.exchanges.cryptoCom.apiSecret,
                        exchangeLogger
                    );
                    await this.exchanges.cryptoCom.initialize();
                }
            }

            // Create a new logger instance for strategies
            const strategyLogger = new Logger('Strategy');
            
            // Initialize trading strategies with proper logger
            if (decryptedConfig.strategies.tokenSniper.enabled) {
                this.strategies.tokenSniper = new TokenSniperStrategy(
                    this.blockchain,
                    this.exchanges,
                    decryptedConfig.strategies.tokenSniper,
                    strategyLogger
                );
            }

            // Initialize token scanner with its own logger
            const scannerLogger = new Logger('TokenScanner');
            await this.initializeTokenScanner(decryptedConfig, scannerLogger);
            
            // Load trade history and update stats
            await this.loadTradeHistory();
            
            // Update wallet balances
            await this.updateBalances();
            
            this.logger.info('Trading engine initialized successfully');
            return true;
        } catch (error) {
            this.logger.error('Failed to initialize trading engine', error);
            throw error;
        }
    }
    /**
     * Initialize token scanner with error handling
     */
    async initializeTokenScanner(decryptedConfig) {
        try {
            this.logger.info('Initializing token scanner');
            
            // Create token scanner instance with blockchain connectors and exchanges
            this.tokenScanner = new EnhancedTokenScanner(
                this.blockchain,
                this.exchanges,
                decryptedConfig,
                this.logger
            );
            
            // Initialize the scanner
            await this.tokenScanner.initialize();
            
            // Set up event listeners for new token detection
            this.tokenScanner.on('newToken', async (tokenData) => {
                try {
                    this.logger.info('New token detected', tokenData);
                    
                    // Emit token detection to UI
                    this.socketIo.emit('newTokenDetected', {
                        ...tokenData,
                        timestamp: new Date().toISOString()
                    });
                    
                    // If token sniper strategy is enabled, analyze the token
                    if (this.strategies.tokenSniper) {
                        await this.strategies.tokenSniper.analyzeToken(tokenData);
                    }
                } catch (error) {
                    this.logger.error('Error processing new token', error);
                }
            });
            
            // Set up error handling for scanner
            this.tokenScanner.on('error', (error) => {
                this.logger.error('Token scanner error', error);
                this.socketIo.emit('scannerError', {
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            });

            this.logger.info('Token scanner initialized successfully');
            return true;
        } catch (error) {
            this.logger.error('Failed to initialize token scanner', error);
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
                        
                        // Emit trade completion event
                        this.socketIo.emit('tradeCompleted', {
                            tradeId,
                            status: updatedTrade.status,
                            profitLoss: updatedTrade.profitLoss,
                            timestamp: new Date().toISOString()
                        });
                    } else {
                        this.activeTrades[tradeId] = updatedTrade;
                        
                        // Emit trade update event
                        this.socketIo.emit('tradeUpdated', {
                            tradeId,
                            status: updatedTrade.status,
                            currentPrice: updatedTrade.currentPrice,
                            profitLoss: updatedTrade.unrealizedProfitLoss,
                            timestamp: new Date().toISOString()
                        });
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
     * Update trade status and calculate current positions
     */
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

    /**
     * Get current price for a trade
     */
    async getPriceForTrade(trade) {
        try {
            if (trade.exchange === 'dex') {
                // Get price from blockchain
                const connector = this.blockchain[trade.network];
                if (connector) {
                    return await connector.getTokenPrice(trade.tokenAddress);
                }
            } else {
                // Get price from CEX
                const exchange = this.exchanges[trade.exchange];
                if (exchange) {
                    return await exchange.getPrice(trade.symbol);
                }
            }
            throw new Error('No valid price source found for trade');
        } catch (error) {
            this.logger.error(`Error getting price for trade ${trade.id}`, error);
            return null;
        }
    }

    /**
     * Calculate unrealized profit/loss for a trade
     */
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

    /**
     * Check if stop loss should be triggered
     */
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

    /**
     * Check if take profit should be triggered
     */
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

    /**
     * Close a trade with the specified reason
     */
    async closeTrade(trade, reason) {
        try {
            if (trade.exchange === 'dex') {
                // Close position on DEX
                const connector = this.blockchain[trade.network];
                if (connector) {
                    await connector.closePosition(trade);
                }
            } else {
                // Close position on CEX
                const exchange = this.exchanges[trade.exchange];
                if (exchange) {
                    await exchange.closePosition(trade);
                }
            }
            
            trade.status = 'completed';
            trade.closeReason = reason;
            trade.closedAt = new Date().toISOString();
            
            // Calculate final profit/loss
            trade.profitLoss = this.calculateUnrealizedProfitLoss(
                trade,
                trade.closePrice || trade.currentPrice
            );
            
            // Update trade history
            this.tradeHistory.push(trade);
            delete this.activeTrades[trade.id];
            
            // Update stats
            await this.updateStats();
            
            // Emit trade closed event
            this.socketIo.emit('tradeClosed', {
                tradeId: trade.id,
                reason,
                profitLoss: trade.profitLoss,
                timestamp: new Date().toISOString()
            });
            
            return true;
        } catch (error) {
            this.logger.error(`Error closing trade ${trade.id}`, error);
            return false;
        }
    }

    /**
     * Update trading statistics
     */
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

    /**
     * Update wallet balances
     */
    async updateBalances() {
        try {
            const balances = {
                ethereum: {},
                bnbChain: {},
                exchanges: {}
            };

            // Update blockchain wallet balances
            if (this.blockchain.ethereum) {
                balances.ethereum = await this.blockchain.ethereum.getBalances();
            }

            if (this.blockchain.bnbChain) {
                balances.bnbChain = await this.blockchain.bnbChain.getBalances();
            }

            // Update exchange balances
            for (const [exchange, connector] of Object.entries(this.exchanges)) {
                if (connector && typeof connector.getBalances === 'function') {
                    balances.exchanges[exchange] = await connector.getBalances();
                }
            }

            this.balances = balances;

            // Emit balance update
            this.socketIo.emit('balanceUpdate', {
                balances,
                timestamp: new Date().toISOString()
            });

            return balances;
        } catch (error) {
            this.logger.error('Error updating balances', error);
            return this.balances;
        }
    }

    /**
     * Get active trades
     */
    getActiveTrades() {
        return this.activeTrades;
    }

    /**
     * Get trade history
     */
    getTradeHistory() {
        return this.tradeHistory;
    }

    /**
     * Get current balances
     */
    getBalances() {
        return this.balances;
    }

    /**
     * Get trading statistics
     */
    getStats() {
        return this.stats;
    }

    /**
     * Check if the trading engine is running
     */
    isRunning() {
        return this.running;
    }
}

module.exports = { TradingEngine };