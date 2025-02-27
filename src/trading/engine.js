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

class TradingEngine {
  constructor(configManager, securityManager, socketIo) {
    this.configManager = configManager;
    this.securityManager = securityManager;
    this.socketIo = socketIo;
    this.logger = new Logger('TradingEngine');
    
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
  }
  
  /**
   * Initialize the trading engine
   */
  async initialize() {
    try {
      this.logger.info('Initializing trading engine');
      
      // Decrypt private keys and API credentials
      const decryptedConfig = this.securityManager.decryptConfig(this.config);
      
      // Initialize blockchain connectors
      if (decryptedConfig.ethereum && decryptedConfig.ethereum.enabled) {
        this.blockchain.ethereum = new EthereumConnector(
          decryptedConfig.ethereum.privateKey,
          decryptedConfig.ethereum.alchemyKey,
          this.logger
        );
        await this.blockchain.ethereum.initialize();
      }
      
      if (decryptedConfig.bnbChain && decryptedConfig.bnbChain.enabled) {
        this.blockchain.bnbChain = new BnbConnector(
          decryptedConfig.ethereum.privateKey, // Same private key for ETH and BNB
          this.logger
        );
        await this.blockchain.bnbChain.initialize();
      }
      
      // Initialize exchange connectors
      if (decryptedConfig.exchanges) {
        if (decryptedConfig.exchanges.binanceUS && decryptedConfig.exchanges.binanceUS.enabled) {
          this.exchanges.binanceUS = new BinanceExchange(
            decryptedConfig.exchanges.binanceUS.apiKey,
            decryptedConfig.exchanges.binanceUS.apiSecret,
            this.logger
          );
          await this.exchanges.binanceUS.initialize();
        }
        
        if (decryptedConfig.exchanges.cryptoCom && decryptedConfig.exchanges.cryptoCom.enabled) {
          this.exchanges.cryptoCom = new CryptocomExchange(
            decryptedConfig.exchanges.cryptoCom.apiKey,
            decryptedConfig.exchanges.cryptoCom.apiSecret,
            this.logger
          );
          await this.exchanges.cryptoCom.initialize();
        }
      }
      
      // Initialize trading strategies
      if (decryptedConfig.strategies && decryptedConfig.strategies.tokenSniper && decryptedConfig.strategies.tokenSniper.enabled) {
        this.strategies.tokenSniper = new TokenSniperStrategy(
          this.blockchain,
          this.exchanges,
          decryptedConfig.strategies.tokenSniper,
          this.logger
        );
      }
      
      if (decryptedConfig.strategies && decryptedConfig.strategies.scalping && decryptedConfig.strategies.scalping.enabled) {
        this.strategies.scalping = new ScalpingStrategy(
          this.blockchain,
          this.exchanges,
          decryptedConfig.strategies.scalping,
          this.logger
        );
      }
      
      if (decryptedConfig.strategies && decryptedConfig.strategies.trendTrading && decryptedConfig.strategies.trendTrading.enabled) {
        this.strategies.trendTrading = new TrendTradingStrategy(
          this.blockchain,
          this.exchanges,
          decryptedConfig.strategies.trendTrading,
          this.logger
        );
      }
      
      // Load trade history
      this.loadTradeHistory();
      
      // Update balances
      await this.updateBalances();
      
      this.logger.info('Trading engine initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize trading engine', error);
      throw error;
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
      this.stats.startTime = Date.now();
      
      // Emit status update
      this.emitStatus();
      
      // Start the main trading loop
      this.mainLoopInterval = setInterval(() => this.mainLoop(), 10000); // 10 seconds
      
      // Start the monitoring loop
      this.monitoringInterval = setInterval(() => this.monitorActiveTrades(), 5000); // 5 seconds
      
      this.logger.info('Trading engine started successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to start trading engine', error);
      this.running = false;
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
      
      // Close any open trades if configured
      if (this.config.closeTradesOnStop) {
        await this.closeAllActiveTrades('bot_stopped');
      }
      
      this.running = false;
      
      // Emit status update
      this.emitStatus();
      
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
      this.logger.debug('Running main trading loop');
      
      // Update balances
      await this.updateBalances();
      
      // Find trading opportunities
      const opportunities = await this.findOpportunities();
      
      // Execute trades for valid opportunities
      for (const opportunity of opportunities) {
        await this.executeTrade(opportunity);
      }
      
      // Emit status update
      this.emitStatus();
    } catch (error) {
      this.logger.error('Error in main trading loop', error);
    }
  }
  
  /**
   * Find trading opportunities across all strategies
   */
  async findOpportunities() {
    const opportunities = [];
    
    try {
      // Get opportunities from each enabled strategy
      for (const [name, strategy] of Object.entries(this.strategies)) {
        const strategyOpportunities = await strategy.findOpportunities();
        
        // Add strategy name to each opportunity
        strategyOpportunities.forEach(opportunity => {
          opportunity.strategy = name;
        });
        
        opportunities.push(...strategyOpportunities);
      }
      
      // Log if opportunities found
      if (opportunities.length > 0) {
        this.logger.info(`Found ${opportunities.length} trading opportunities`);
      }
      
      // Apply trade limits
      return this.applyTradeLimits(opportunities);
    } catch (error) {
      this.logger.error('Error finding opportunities', error);
      return [];
    }
  }
  
  /**
   * Apply configured trade limits to opportunities
   */
  applyTradeLimits(opportunities) {
    // Get trading config
    const tradingConfig = this.config.trading || {};
    
    // Check max concurrent trades
    const maxConcurrentTrades = tradingConfig.maxConcurrentTrades || 5;
    const activeTrades = Object.keys(this.activeTrades).length;
    
    if (activeTrades >= maxConcurrentTrades) {
      this.logger.info(`Maximum concurrent trades (${maxConcurrentTrades}) reached, skipping new opportunities`);
      return [];
    }
    
    // Check max trades per hour
    const maxTradesPerHour = tradingConfig.maxTradesPerHour || 10;
    const lastHourTrades = this.tradeHistory.filter(trade => 
      Date.now() - trade.timestamp < 60 * 60 * 1000
    ).length;
    
    if (lastHourTrades >= maxTradesPerHour) {
      this.logger.info(`Maximum trades per hour (${maxTradesPerHour}) reached, skipping new opportunities`);
      return [];
    }
    
    // Limit number of returned opportunities
    const availableTradeSlots = Math.min(
      maxConcurrentTrades - activeTrades,
      maxTradesPerHour - lastHourTrades
    );
    
    return opportunities.slice(0, availableTradeSlots);
  }
    /**
   * Execute a trade based on opportunity
   */
  async executeTrade(opportunity) {
    try {
      const { network, symbol, tokenAddress, action, strategy } = opportunity;
      
      this.logger.info(`Executing ${action} for ${symbol || tokenAddress} via ${strategy} strategy`, opportunity);
      
      // Check risk limits
      if (!this.checkRiskLimits(opportunity)) {
        this.logger.warn(`Trade rejected due to risk limits for ${symbol || tokenAddress}`);
        return null;
      }
      
      // Execute based on network type
      let tradeResult = null;
      
      if (network === 'ethereum' || network === 'bnbChain') {
        // DEX trade
        tradeResult = await this.executeDEXTrade(opportunity);
      } else if (network === 'binanceUS' || network === 'cryptoCom') {
        // CEX trade
        tradeResult = await this.executeCEXTrade(opportunity);
      } else {
        this.logger.warn(`Unsupported network: ${network}`);
        return null;
      }
      
      if (tradeResult) {
        // Add to active trades
        const tradeId = uuidv4();
        
        const trade = {
          id: tradeId,
          ...opportunity,
          ...tradeResult,
          timestamp: Date.now(),
          status: 'active'
        };
        
        this.activeTrades[tradeId] = trade;
        
        // Update stats
        this.stats.totalTrades++;
        this.stats.lastTradeTime = Date.now();
        
        // Emit trade event
        this.socketIo.emit('newTrade', trade);
        
        this.logger.info(`Trade executed successfully: ${tradeId}`);
        return trade;
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Trade execution failed`, error);
      
      // Update stats
      this.stats.failedTrades++;
      
      return null;
    }
  }
  
  /**
   * Check if trade passes risk management rules
   */
  checkRiskLimits(opportunity) {
    const riskConfig = this.config.riskManagement || {};
    
    // Check max trade size
    const maxTradeSize = riskConfig.maxTradeSize || 0;
    if (maxTradeSize > 0 && opportunity.amount > maxTradeSize) {
      this.logger.warn(`Trade exceeds maximum size: ${opportunity.amount} > ${maxTradeSize}`);
      return false;
    }
    
    // Check daily loss limit
    const dailyLossLimit = riskConfig.dailyLossLimit || 0;
    if (dailyLossLimit > 0) {
      const todayLosses = this.calculateTodayLosses();
      if (todayLosses >= dailyLossLimit) {
        this.logger.warn(`Daily loss limit reached: ${todayLosses} >= ${dailyLossLimit}`);
        return false;
      }
    }
    
    // All checks passed
    return true;
  }
  
  /**
   * Calculate total losses for today
   */
  calculateTodayLosses() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.tradeHistory
      .filter(trade => 
        trade.timestamp >= today.getTime() && 
        trade.status === 'closed' &&
        trade.profitLoss < 0
      )
      .reduce((total, trade) => total + Math.abs(trade.profitLoss), 0);
  }
  
  /**
   * Execute a trade on a DEX (Uniswap/PancakeSwap)
   */
  async executeDEXTrade(opportunity) {
    const { network, tokenAddress, action } = opportunity;
    
    try {
      // Get blockchain connector
      const blockchain = this.blockchain[network];
      if (!blockchain) {
        throw new Error(`No blockchain connector available for ${network}`);
      }
      
      // Calculate trade size based on wallet percentage
      const walletPercentage = this.config.trading && this.config.trading.walletBuyPercentage ? 
        this.config.trading.walletBuyPercentage / 100 : 0.1; // Default to 10% if not specified
      const wallet = await blockchain.getWallet();
      
      // Execute the trade
      if (action === 'buy') {
        return await blockchain.executeBuy(tokenAddress, walletPercentage);
      } else {
        return await blockchain.executeSell(tokenAddress);
      }
    } catch (error) {
      this.logger.error(`DEX trade execution failed`, error);
      throw error;
    }
  }
    /**
   * Execute a trade on a CEX (Binance.US/Crypto.com)
   */
  async executeCEXTrade(opportunity) {
    const { network, symbol, action, amount } = opportunity;
    
    try {
      // Get exchange connector
      const exchange = this.exchanges[network];
      if (!exchange) {
        throw new Error(`No exchange connector available for ${network}`);
      }
      
      // Execute the trade
      return await exchange.executeTrade(symbol, action, amount);
    } catch (error) {
      this.logger.error(`CEX trade execution failed`, error);
      throw error;
    }
  }
  
  /**
   * Monitor active trades for take-profit and stop-loss
   */
  async monitorActiveTrades() {
    if (!this.running || Object.keys(this.activeTrades).length === 0) return;
    
    try {
      this.logger.debug(`Monitoring ${Object.keys(this.activeTrades).length} active trades`);
      
      for (const [tradeId, trade] of Object.entries(this.activeTrades)) {
        if (trade.status !== 'active') continue;
        
        // Get current price
        const currentPrice = await this.getCurrentPrice(trade);
        
        if (!currentPrice) {
          this.logger.warn(`Could not get current price for ${trade.symbol || trade.tokenAddress}`);
          continue;
        }
        
        // Calculate profit/loss percentage
        const entryPrice = trade.entryPrice || 0;
        if (entryPrice === 0) continue;
        
        const priceChange = ((currentPrice - entryPrice) / entryPrice) * 100;
        
        // Default values if config is missing
        const takeProfitThreshold = 
          (this.config.trading && this.config.trading.takeProfit) ? 
          this.config.trading.takeProfit : 5; // Default 5%
          
        const stopLossThreshold = 
          (this.config.trading && this.config.trading.stopLoss) ? 
          this.config.trading.stopLoss : 2; // Default 2%
        
        // Check for take-profit
        if (trade.action === 'buy' && priceChange >= takeProfitThreshold) {
          this.logger.info(`Take profit triggered for ${tradeId}: ${priceChange.toFixed(2)}%`);
          await this.closeTrade(tradeId, 'take_profit', currentPrice);
          continue;
        }
        
        // Check for stop-loss
        if (trade.action === 'buy' && priceChange <= -stopLossThreshold) {
          this.logger.info(`Stop loss triggered for ${tradeId}: ${priceChange.toFixed(2)}%`);
          await this.closeTrade(tradeId, 'stop_loss', currentPrice);
          continue;
        }
        
        // Check for trade timeout
        const maxTradeTime = 
          (this.config.trading && this.config.trading.maxTradeTime) ? 
          this.config.trading.maxTradeTime : 24 * 60 * 60 * 1000; // 24 hours default
          
        if (Date.now() - trade.timestamp > maxTradeTime) {
          this.logger.info(`Trade timeout for ${tradeId}`);
          await this.closeTrade(tradeId, 'timeout', currentPrice);
          continue;
        }
      }
    } catch (error) {
      this.logger.error('Error monitoring active trades', error);
    }
  }
  
  /**
   * Get current price for a trade
   */
  async getCurrentPrice(trade) {
    try {
      const { network, symbol, tokenAddress } = trade;
      
      if (network === 'binanceUS' || network === 'cryptoCom') {
        // Get price from exchange
        const exchange = this.exchanges[network];
        return await exchange.getCurrentPrice(symbol);
      } else {
        // Get price from blockchain
        const blockchain = this.blockchain[network];
        return await blockchain.getTokenPrice(tokenAddress);
      }
    } catch (error) {
      this.logger.error(`Error getting current price`, error);
      return null;
    }
  }
  
  /**
   * Close a trade (sell position)
   */
  async closeTrade(tradeId, reason, currentPrice) {
    try {
      const trade = this.activeTrades[tradeId];
      if (!trade) {
        this.logger.warn(`Trade not found: ${tradeId}`);
        return false;
      }
      
      this.logger.info(`Closing trade ${tradeId}`, { reason, currentPrice });
      
      let closeResult = null;
      
      // Execute close trade
      if (trade.network === 'ethereum' || trade.network === 'bnbChain') {
        // DEX trade
        closeResult = await this.blockchain[trade.network].executeSell(trade.tokenAddress);
      } else {
        // CEX trade
        closeResult = await this.exchanges[trade.network].executeTrade(
          trade.symbol,
          trade.action === 'buy' ? 'sell' : 'buy',
          trade.amount
        );
      }
      
      if (closeResult) {
        // Update trade record
        trade.status = 'closed';
        trade.closeTimestamp = Date.now();
        trade.closePrice = currentPrice;
        trade.closeReason = reason;
        
        // Calculate profit/loss
        const entryPrice = trade.entryPrice || 0;
        if (entryPrice > 0) {
          const profitLoss = ((currentPrice - entryPrice) / entryPrice) * 100;
          trade.profitLoss = profitLoss;
          
          // Update stats
          if (profitLoss > 0) {
            this.stats.successfulTrades++;
          }
          this.stats.profitLoss += profitLoss;
          this.stats.winRate = (this.stats.successfulTrades / this.stats.totalTrades) * 100;
          
          this.logger.info(`Trade closed with ${profitLoss >= 0 ? 'profit' : 'loss'}: ${profitLoss.toFixed(2)}%`);
        }
        
        // Add to trade history
        this.tradeHistory.push({ ...trade });
        this.saveTradeHistory();
        
        // Remove from active trades
        delete this.activeTrades[tradeId];
        
        // Emit trade update
        this.socketIo.emit('tradeClosed', trade);
        
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Error closing trade ${tradeId}`, error);
      return false;
    }
  }
  
  /**
   * Close all active trades
   */
  async closeAllActiveTrades(reason) {
    this.logger.info(`Closing all active trades: ${Object.keys(this.activeTrades).length}`);
    
    const promises = [];
    
    for (const tradeId of Object.keys(this.activeTrades)) {
      const trade = this.activeTrades[tradeId];
      const currentPrice = await this.getCurrentPrice(trade).catch(() => 0);
      
      promises.push(this.closeTrade(tradeId, reason, currentPrice));
    }
    
    await Promise.allSettled(promises);
    
    this.logger.info('All trades closed');
  }
  
  /**
   * Update wallet and exchange balances
   */
  async updateBalances() {
    try {
      const balances = {};
      
      // Get blockchain balances
      for (const [network, connector] of Object.entries(this.blockchain)) {
        const blockchainBalance = await connector.getBalances();
        balances[network] = blockchainBalance;
      }
      
      // Get exchange balances
      for (const [exchange, connector] of Object.entries(this.exchanges)) {
        const exchangeBalance = await connector.getBalances();
        balances[exchange] = exchangeBalance;
      }
      
      this.balances = balances;
      
      // Emit balance update
      this.socketIo.emit('balances', balances);
      
      return balances;
    } catch (error) {
      this.logger.error('Error updating balances', error);
      return {};
    }
  }
  
  /**
   * Load trade history from storage
   */
  loadTradeHistory() {
    try {
      const fs = require('fs');
      const path = require('path');
      const historyFile = path.join(process.cwd(), 'data', 'trade-history.json');
      
      if (fs.existsSync(historyFile)) {
        const historyData = fs.readFileSync(historyFile, 'utf8');
        this.tradeHistory = JSON.parse(historyData);
        
        // Update stats based on history
        this.stats.totalTrades = this.tradeHistory.length;
        this.stats.successfulTrades = this.tradeHistory.filter(t => t.profitLoss > 0).length;
        this.stats.failedTrades = this.tradeHistory.filter(t => t.profitLoss <= 0).length;
        this.stats.profitLoss = this.tradeHistory.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0);
        
        if (this.stats.totalTrades > 0) {
          this.stats.winRate = (this.stats.successfulTrades / this.stats.totalTrades) * 100;
        }
        
        this.logger.info(`Loaded ${this.tradeHistory.length} historical trades`);
      }
    } catch (error) {
      this.logger.error('Error loading trade history', error);
    }
  }
  
  /**
   * Save trade history to storage
   */
  saveTradeHistory() {
    try {
      const fs = require('fs');
      const path = require('path');
      const dataDir = path.join(process.cwd(), 'data');
      
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      const historyFile = path.join(dataDir, 'trade-history.json');
      
      fs.writeFileSync(
        historyFile,
        JSON.stringify(this.tradeHistory, null, 2)
      );
    } catch (error) {
      this.logger.error('Error saving trade history', error);
    }
  }
  
  /**
   * Emit status update to connected clients
   */
  emitStatus() {
    this.socketIo.emit('botStatus', {
      running: this.running,
      activeTrades: this.activeTrades,
      balances: this.balances,
      stats: this.stats
    });
  }
  
  /**
   * Get active trades
   */
  getActiveTrades() {
    return this.activeTrades;
  }
  
  /**
   * Get wallet balances
   */
  getBalances() {
    return this.balances;
  }
  
  /**
   * Get trading stats
   */
  getStats() {
    return this.stats;
  }
  
  /**
   * Get trade history
   */
  getTradeHistory() {
    return this.tradeHistory;
  }
  
  /**
   * Check if the trading engine is running
   */
  isRunning() {
    return this.running;
  }
}

module.exports = { TradingEngine };