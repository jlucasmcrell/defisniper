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
const { EnhancedTrendTradingStrategy } = require('../strategies/enhancedTrendTrading');
const { EthereumConnector } = require('../blockchain/ethereumConnector');
const { BnbConnector } = require('../blockchain/bnbConnector');
const { BinanceExchange } = require('../exchanges/binance');
const { CryptocomExchange } = require('../exchanges/cryptocom');
const { EnhancedTokenScanner } = require('../scanner/tokenScanner');

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
    this.lastBalanceUpdate = 0;
  }
  
  /**
   * Initialize the trading engine with improved error handling and logging
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
   * Enhanced blockchain connector initialization
   */
  async initializeBlockchainConnectors(decryptedConfig) {
    try {
      this.logger.info('Initializing blockchain connectors');
      
      // Initialize Ethereum connector
      if (decryptedConfig.ethereum && decryptedConfig.ethereum.enabled) {
        this.logger.info('Setting up Ethereum connector');
        
        // Log which provider is being used
        const providerType = decryptedConfig.ethereum.infuraId ? 'Infura' : 'Alchemy';
        this.logger.info(`Using ${providerType} as Ethereum provider`);
        
        // Create and initialize connector with better error handling
        try {
          const apiKey = decryptedConfig.ethereum.infuraId || decryptedConfig.ethereum.alchemyKey;
          
          if (!apiKey) {
            throw new Error('Missing API key for Ethereum provider');
          }
          
          this.blockchain.ethereum = new EthereumConnector(
            decryptedConfig.ethereum.privateKey,
            apiKey,
            this.logger
          );
          
          const success = await this.blockchain.ethereum.initialize();
          
          if (success) {
            this.logger.info('Ethereum connector initialized successfully');
            
            // Get and log the wallet address
            const address = this.blockchain.ethereum.getAddress ? 
                           this.blockchain.ethereum.getAddress() : 
                           'Unknown';
                           
            this.logger.info(`Ethereum wallet address: ${address.substr(0, 10)}...`);
          } else {
            throw new Error('Ethereum connector initialization returned false');
          }
        } catch (ethError) {
          this.logger.error('Failed to initialize Ethereum connector', ethError);
          // Don't throw, continue with other connectors
        }
      }
      
      // Initialize BNB Chain connector
      if (decryptedConfig.bnbChain && decryptedConfig.bnbChain.enabled) {
        this.logger.info('Setting up BNB Chain connector');
        
        try {
          // Get private key - might be the same as Ethereum key
          const privateKey = decryptedConfig.bnbChain.privateKey || decryptedConfig.ethereum.privateKey;
          
          if (!privateKey) {
            throw new Error('Missing private key for BNB Chain');
          }
          
          this.blockchain.bnbChain = new BnbConnector(
            privateKey,
            this.logger
          );
          
          const success = await this.blockchain.bnbChain.initialize();
          
          if (success) {
            this.logger.info('BNB Chain connector initialized successfully');
            
            // Get and log the wallet address
            const address = this.blockchain.bnbChain.getAddress ? 
                           this.blockchain.bnbChain.getAddress() : 
                           'Unknown';
                           
            this.logger.info(`BNB Chain wallet address: ${address.substr(0, 10)}...`);
          } else {
            throw new Error('BNB Chain connector initialization returned false');
          }
        } catch (bnbError) {
          this.logger.error('Failed to initialize BNB Chain connector', bnbError);
          // Don't throw, continue with other connectors
        }
      }
      
      return true;
    } catch (error) {
      this.logger.error('Error initializing blockchain connectors', error);
      return false;
    }
  }
  
  /**
   * Enhanced exchange connector initialization
   */
  async initializeExchangeConnectors(decryptedConfig) {
    try {
      this.logger.info('Initializing exchange connectors');
      
      // Initialize Binance.US connector
      if (decryptedConfig.exchanges && decryptedConfig.exchanges.binanceUS && 
          decryptedConfig.exchanges.binanceUS.enabled) {
        this.logger.info('Setting up Binance.US connector');
        
        try {
          const apiKey = decryptedConfig.exchanges.binanceUS.apiKey;
          const apiSecret = decryptedConfig.exchanges.binanceUS.apiSecret;
          
          if (!apiKey || !apiSecret) {
            throw new Error('Missing API credentials for Binance.US');
          }
          
          this.exchanges.binanceUS = new BinanceExchange(
            apiKey,
            apiSecret,
            this.logger
          );
          
          const success = await this.exchanges.binanceUS.initialize();
          
          if (success) {
            this.logger.info('Binance.US connector initialized successfully');
            
            // Test connection by getting basic account info
            const balances = await this.exchanges.binanceUS.getBalances();
            const balanceCount = Object.keys(balances).length;
            
            this.logger.info(`Connected to Binance.US with ${balanceCount} currencies available`);
          } else {
            throw new Error('Binance.US connector initialization failed');
          }
        } catch (binanceError) {
          this.logger.error('Failed to initialize Binance.US connector', binanceError);
          // Don't throw, continue with other connectors
        }
      }
      
      // Initialize Crypto.com connector
      if (decryptedConfig.exchanges && decryptedConfig.exchanges.cryptoCom && 
          decryptedConfig.exchanges.cryptoCom.enabled) {
        this.logger.info('Setting up Crypto.com connector');
        
        try {
          const apiKey = decryptedConfig.exchanges.cryptoCom.apiKey;
          const apiSecret = decryptedConfig.exchanges.cryptoCom.apiSecret;
          
          if (!apiKey || !apiSecret) {
            throw new Error('Missing API credentials for Crypto.com');
          }
          
          this.exchanges.cryptoCom = new CryptocomExchange(
            apiKey,
            apiSecret,
            this.logger
          );
          
          const success = await this.exchanges.cryptoCom.initialize();
          
          if (success) {
            this.logger.info('Crypto.com connector initialized successfully');
            
            // Test connection by getting basic account info
            const balances = await this.exchanges.cryptoCom.getBalances();
            const balanceCount = Object.keys(balances).length;
            
            this.logger.info(`Connected to Crypto.com with ${balanceCount} currencies available`);
          } else {
            throw new Error('Crypto.com connector initialization failed');
          }
        } catch (cryptoComError) {
          this.logger.error('Failed to initialize Crypto.com connector', cryptoComError);
          // Don't throw, continue with other connectors
        }
      }
      
      return true;
    } catch (error) {
      this.logger.error('Error initializing exchange connectors', error);
      return false;
    }
  }
  
  /**
   * Initialize trading strategies with expanded token support
   */
  async initializeStrategies(decryptedConfig) {
    try {
      this.logger.info('Initializing trading strategies');
      
      // Initialize token sniping strategy if enabled
      if (decryptedConfig.strategies && decryptedConfig.strategies.tokenSniper && 
          decryptedConfig.strategies.tokenSniper.enabled) {
        this.logger.info('Setting up Token Sniper strategy');
        
        this.strategies.tokenSniper = new TokenSniperStrategy(
          this.blockchain,
          this.exchanges,
          decryptedConfig.strategies.tokenSniper,
          this.logger
        );
        
        // Initialize the strategy
        if (typeof this.strategies.tokenSniper.initialize === 'function') {
          await this.strategies.tokenSniper.initialize();
        }
        
        this.logger.info('Token Sniper strategy initialized successfully');
      }
      
      // Initialize scalping strategy if enabled
      if (decryptedConfig.strategies && decryptedConfig.strategies.scalping && 
          decryptedConfig.strategies.scalping.enabled) {
        this.logger.info('Setting up Scalping strategy');
        
        this.strategies.scalping = new ScalpingStrategy(
          this.blockchain,
          this.exchanges,
          decryptedConfig.strategies.scalping,
          this.logger
        );
        
        // Initialize the strategy
        if (typeof this.strategies.scalping.initialize === 'function') {
          await this.strategies.scalping.initialize();
        }
        
        this.logger.info('Scalping strategy initialized successfully');
      }
      
      // Initialize trend trading strategy with enhanced token support
      if (decryptedConfig.strategies && decryptedConfig.strategies.trendTrading && 
          decryptedConfig.strategies.trendTrading.enabled) {
        this.logger.info('Setting up Trend Trading strategy with expanded token support');
        
        // Use enhanced trend trading strategy for more token support
        this.strategies.trendTrading = new EnhancedTrendTradingStrategy(
          this.blockchain,
          this.exchanges,
          decryptedConfig.strategies.trendTrading,
          this.logger
        );
        
        // Initialize the strategy
        if (typeof this.strategies.trendTrading.initialize === 'function') {
          await this.strategies.trendTrading.initialize();
        }
        
        this.logger.info('Enhanced Trend Trading strategy initialized successfully');
      }
      
      return true;
    } catch (error) {
      this.logger.error('Error initializing trading strategies', error);
      return false;
    }
  }
  
  /**
   * Initialize token scanner for monitoring new token listings
   */
  async initializeTokenScanner(decryptedConfig) {
    try {
      this.logger.info('Initializing token scanner for new token detection');
      
      // Create token scanner with enhanced capabilities
      this.tokenScanner = new EnhancedTokenScanner(
        this.blockchain,
        this.exchanges,
        decryptedConfig,
        this.logger
      );
      
      // Initialize the scanner
      await this.tokenScanner.initialize();
      
      // Set up event listener for new tokens
      this.tokenScanner.on((event, data) => {
        if (event === 'newToken') {
          this.handleNewToken(data);
        }
      });
      
      // Automatically start the scanner if the bot is running
      if (this.running) {
        await this.tokenScanner.start();
      }
      
      this.logger.info('Token scanner initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('Error initializing token scanner', error);
      return false;
    }
  }
  
  /**
   * Handle new token detected by the scanner
   */
  async handleNewToken(token) {
    try {
      this.logger.info(`New token detected: ${token.symbol} on ${token.network}`);
      
      // Emit to clients
      this.socketIo.emit('newToken', token);
      
      // Analyze token if we're running
      if (this.running) {
        // Check if token meets basic criteria
        if (this.shouldTradeToken(token)) {
          this.logger.info(`Analyzing new token: ${token.symbol}`);
          
          // In a real implementation, you would:
          // 1. Analyze token metrics
          // 2. Check safety (honeypot, liquidity, etc.)
          // 3. Execute trade if safe
          
          // For demo, just log that we're considering it
          this.logger.info(`Token ${token.symbol} meets trading criteria`);
        }
      }
    } catch (error) {
      this.logger.error(`Error handling new token ${token.symbol}`, error);
    }
  }
  
  /**
   * Determine if a token should be traded
   */
  shouldTradeToken(token) {
    // Basic checks
    if (!token.symbol || token.symbol === 'UNKNOWN') {
      return false;
    }
    
    // Only trade tokens with known symbols
    if (token.symbol.includes('UNKNOWN') || token.name.includes('Unknown')) {
      return false;
    }
    
    // Skip tokens that are clearly not tradable
    const scamIndicators = ['TEST', 'SCAM', 'FAKE', 'HONEYPOT'];
    if (scamIndicators.some(word => token.symbol.includes(word) || token.name.includes(word))) {
      return false;
    }
    
    return true;
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
   * Main trading loop with enhanced logging and functionality
   */
  async mainLoop() {
    if (!this.running) return;
    
    try {
      this.logger.debug('Running main trading loop');
      
      // Update balances periodically (not every loop)
      const now = Date.now();
      if (now - this.lastBalanceUpdate > 60000) { // Every minute
        await this.updateBalances();
        this.lastBalanceUpdate = now;
      }
      
      // Find trading opportunities with enhanced logging
      const opportunities = await this.findOpportunities();
      this.logger.info(`Found ${opportunities.length} potential trading opportunities`);
      
      // Execute trades for valid opportunities
      let executedTrades = 0;
      for (const opportunity of opportunities) {
        const trade = await this.executeTrade(opportunity);
        if (trade) {
          executedTrades++;
        }
      }
      
      if (executedTrades > 0) {
        this.logger.info(`Executed ${executedTrades} trades out of ${opportunities.length} opportunities`);
      }
      
      // Emit status update to clients
      this.emitStatus();
      
      // Log active trades count
      const activeTrades = Object.keys(this.activeTrades).length;
      if (activeTrades > 0) {
        this.logger.info(`Currently monitoring ${activeTrades} active trades`);
      }
      
    } catch (error) {
      this.logger.error('Error in main trading loop', error);
      
      // Emit error to clients
      this.socketIo.emit('tradingError', {
        message: error.message,
        timestamp: Date.now()
      });
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
      if (!trade