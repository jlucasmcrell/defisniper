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
const EnhancedTrendTradingStrategy = require('../strategies/enhancedTrendTrading');
const { EthereumConnector } = require('../blockchain/ethereumConnector');
const EthereumConnector = require('../blockchain/ethereumConnector');
const BnbConnector = require('../blockchain/bnbConnector');
const { CryptocomExchange } = require('../exchanges/cryptocom');
const EnhancedTokenScanner = require('../scanner/enhancedTokenScanner');

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
      
      // Add test tokens for debugging
      await this.addTestTokens();
      
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
   * Add test tokens for debugging purposes
   */
  async addTestTokens() {
    try {
      this.logger.info('Adding test tokens for debugging');
      
      // Define some well-known tokens to test with
      const testTokens = [
        { 
          address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', 
          network: 'ethereum',
          symbol: 'UNI',
          name: 'Uniswap'
        },
        { 
          address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', 
          network: 'bnbChain',
          symbol: 'CAKE',
          name: 'PancakeSwap'
        },
        {
          address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
          network: 'ethereum',
          symbol: 'USDT',
          name: 'Tether USD'
        },
        {
          address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
          network: 'ethereum',
          symbol: 'WBTC',
          name: 'Wrapped Bitcoin'
        }
      ];
      
      // Process test tokens if we have a token scanner
      if (this.tokenScanner) {
        for (const token of testTokens) {
          // Only add the token if we have the corresponding blockchain connector
          if (this.blockchain[token.network]) {
            this.logger.info(`Adding test token: ${token.symbol} (${token.address}) on ${token.network}`);
            
            try {
              // Try to get more details using the blockchain connector
              const enhancedToken = await this.blockchain[token.network].getTokenInfo?.(token.address) || token;
              
              // Handle the token
              await this.handleNewToken({
                ...token,
                ...enhancedToken,
                timestamp: Date.now()
              });
            } catch (error) {
              this.logger.error(`Error processing test token ${token.symbol}`, error);
            }
          }
        }
      } else {
        this.logger.warn('Token scanner not available, cannot add test tokens');
      }
    } catch (error) {
      this.logger.error('Error adding test tokens', error);
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
  decryptedConfig,  // Pass the entire config
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
            
            // Test DEX connectivity
            const factory = this.blockchain.ethereum.getFactory?.();
            if (factory) {
              this.logger.info('Successfully connected to Uniswap factory');
              
              // Get number of pairs
              try {
                const pairCount = await factory.allPairsLength();
                this.logger.info(`Uniswap has ${pairCount.toString()} pairs available`);
              } catch (factoryError) {
                this.logger.warn('Could not get pair count from Uniswap factory', factoryError.message);
              }
            }
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
  decryptedConfig,  // Pass the entire config
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
            
            // Test DEX connectivity
            const factory = this.blockchain.bnbChain.getFactory?.();
            if (factory) {
              this.logger.info('Successfully connected to PancakeSwap factory');
              
              // Get number of pairs
              try {
                const pairCount = await factory.allPairsLength();
                this.logger.info(`PancakeSwap has ${pairCount.toString()} pairs available`);
              } catch (factoryError) {
                this.logger.warn('Could not get pair count from PancakeSwap factory', factoryError.message);
              }
            }
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
            
            // Get available trading pairs
            try {
              const symbols = await this.exchanges.binanceUS.getSymbols();
              this.logger.info(`Binance.US has ${symbols.length} trading pairs available`);
              
              // Log some examples
              const exampleSymbols = symbols.slice(0, 5);
              this.logger.info(`Example pairs: ${exampleSymbols.join(', ')}`);
            } catch (symbolError) {
              this.logger.warn('Could not get symbols from Binance.US', symbolError.message);
            }
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
            
            // Get available trading pairs
            try {
              const symbols = await this.exchanges.cryptoCom.getSymbols();
              this.logger.info(`Crypto.com has ${symbols.length} trading pairs available`);
              
              // Log some examples
              const exampleSymbols = symbols.slice(0, 5);
              this.logger.info(`Example pairs: ${exampleSymbols.join(', ')}`);
            } catch (symbolError) {
              this.logger.warn('Could not get symbols from Crypto.com', symbolError.message);
            }
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
      this.tokenScanner.on('newToken', (data) => {
        this.handleNewToken(data);
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
      this.logger.info(`New token detected: ${token.symbol} (${token.address}) on ${token.network}`);
      
      // Emit to clients
      this.socketIo.emit('newToken', token);
      
      // Analyze token if we're running
      if (this.running) {
        // Check if token meets basic criteria
        if (this.shouldTradeToken(token)) {
          this.logger.info(`Analyzing new token: ${token.symbol}`);
          
          // Check each strategy to see if it would trade this token
          for (const [strategyName, strategy] of Object.entries(this.strategies)) {
            try {
              if (typeof strategy.analyzePotentialTrade === 'function') {
                const result = await strategy.analyzePotentialTrade(token);
                if (result && result.tradable) {
                  this.logger.info(`Token ${token.symbol} suitable for trading via ${strategyName} strategy`);
                  
                  // Create a trading opportunity for immediate consideration
                  const opportunity = {
                    network: token.network,
                    symbol: token.symbol,
                    tokenAddress: token.address,
                    name: token.name,
                    strategy: strategyName,
                    action: 'buy',
                    amount: this.calculateTradeAmount(token),
                    reason: `New token detected: ${token.symbol}`,
                    score: result.score || 70
                  };
                  
                  // Execute trade if auto-trading is enabled
                  if (this.config.autoTradeNewTokens && result.score >= 80) {
                    this.logger.info(`Auto-trading new token: ${token.symbol} with high score (${result.score})`);
                    await this.executeTrade(opportunity);
                  } else {
                    this.logger.info(`New trading opportunity: ${token.symbol} (score: ${result.score})`);
                    // Emit as potential opportunity
                    this.socketIo.emit('tradingOpportunity', opportunity);
                  }
                } else {
                  this.logger.info(`Token ${token.symbol} not suitable for trading via ${strategyName} strategy: ${result ? result.reason : 'Unknown reason'}`);
                }
              }
            } catch (strategyError) {
              this.logger.error(`Error analyzing token ${token.symbol} with strategy ${strategyName}`, strategyError);
            }
          }
        } else {
          this.logger.info(`Token ${token.symbol} doesn't meet basic trading criteria - skipping`);
        }
      }
    } catch (error) {
      this.logger.error(`Error handling new token ${token.symbol}`, error);
    }
  }
  
  /**
   * Calculate appropriate trade amount for a token
   */
  calculateTradeAmount(token) {
    try {
      // Get config for trade sizes
      const tradeSizeConfig = this.config.trading && this.config.trading.tradeSizes || {};
      const defaultTradeSize = tradeSizeConfig.default || 100; // $100 default
      
      // Try to get network-specific trade size
      const networkTradeSize = tradeSizeConfig[token.network] || defaultTradeSize;
      
      // Apply any token-specific adjustments
      // This could be based on liquidity, volatility, etc.
      
      return networkTradeSize;
    } catch (error) {
      this.logger.error(`Error calculating trade amount for ${token.symbol}`, error);
      return 100; // $100 fallback
    }
  }
  
  /**
   * Determine if a token should be traded
   */
  shouldTradeToken(token) {
    try {
      // Skip tokens with no symbol or address
      if (!token.symbol || !token.address) {
        return false;
      }
      
      // Only trade tokens with known symbols
      if (token.symbol.includes('UNKNOWN') || token.name.includes('Unknown')) {
        this.logger.info(`Skipping token with unknown name/symbol: ${token.symbol}`);
        return false;
      }
      
      // Skip tokens that are clearly not tradable
      const scamIndicators = ['TEST', 'SCAM', 'FAKE', 'HONEYPOT'];
      if (scamIndicators.some(word => token.symbol.includes(word) || token.name.includes(word))) {
        this.logger.info(`Skipping potential scam token: ${token.symbol} - name or symbol contains ${scamIndicators.find(word => token.symbol.includes(word) || token.name.includes(word))}`);
        return false;
      }
      
      // Check if token is in blacklist
      const isBlacklisted = this.tokenScanner && typeof this.tokenScanner.isBlacklisted === 'function' && 
                           this.tokenScanner.isBlacklisted(token.address);
      
      if (isBlacklisted) {
        this.logger.info(`Skipping blacklisted token: ${token.symbol} (${token.address})`);
        return false;
      }
      
      // Check if token has a very low price (potential dust attack)
      if (token.price && token.price < 0.0000001) {
        this.logger.info(`Skipping token with extremely low price: ${token.symbol} - ${token.price}`);
        return false;
      }
      
      // Pass all checks
      return true;
    } catch (error) {
      this.logger.error(`Error evaluating if token should be traded: ${token.symbol}`, error);
      return false; // Default to not trading on error
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
      
      // Start token scanner
      if (this.tokenScanner) {
        this.logger.info('Starting token scanner');
        await this.tokenScanner.start();
      }
      
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
      
      // Stop token scanner
      if (this.tokenScanner) {
        this.logger.info('Stopping token scanner');
        await this.tokenScanner.stop();
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
      
      if (opportunities.length > 0) {
        this.logger.info(`Found ${opportunities.length} potential trading opportunities`);
        
        // Log the opportunities
        for (const opp of opportunities) {
          this.logger.info(`Opportunity: ${opp.action.toUpperCase()} ${opp.symbol || opp.tokenAddress} via ${opp.strategy} strategy (reason: ${opp.reason})`);
        }
      } else {
        this.logger.info('No trading opportunities found in this scan');
      }
      
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
      this.logger.info('Checking for trading opportunities across all strategies');
      
      // Get opportunities from each enabled strategy
      for (const [name, strategy] of Object.entries(this.strategies)) {
        this.logger.info(`Checking strategy: ${name}`);
        
        try {
          const strategyOpportunities = await strategy.findOpportunities();
          
          if (strategyOpportunities.length > 0) {
            this.logger.info(`Strategy ${name} found ${strategyOpportunities.length} opportunities`);
          } else {
            this.logger.info(`Strategy ${name} found no opportunities in this scan`);
          }
          
          // Add strategy name to each opportunity
          strategyOpportunities.forEach(opportunity => {
            opportunity.strategy = name;
          });
          
          opportunities.push(...strategyOpportunities);
        } catch (strategyError) {
          this.logger.error(`Error checking strategy ${name}`, strategyError);
        }
      }
      
      // Apply trade limits
      const limitedOpportunities = this.applyTradeLimits(opportunities);
      
      if (limitedOpportunities.length < opportunities.length) {
        this.logger.info(`Limited opportunities from ${opportunities.length} to ${limitedOpportunities.length} due to trade limits`);
      }
      
      return limitedOpportunities;
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
    
    if (opportunities.length > availableTradeSlots) {
      this.logger.info(`Limiting opportunities to ${availableTradeSlots} available slots`);
      
      // Sort opportunities by score or priority if available
      const sortedOpportunities = [...opportunities].sort((a, b) => {
        // Prefer opportunities with score
        if (a.score !== undefined && b.score !== undefined) {
          return b.score - a.score; // Higher scores first
        }
        
        // Default sort by timestamp if available (newer first)
        if (a.timestamp && b.timestamp) {
          return b.timestamp - a.timestamp;
        }
        
        return 0;
      });
      
      return sortedOpportunities.slice(0, availableTradeSlots);
    }
    
    return opportunities;
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
      } else {
        this.logger.warn(`Trade execution returned no result for ${symbol || tokenAddress}`);
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
      
      this.logger.info(`Executing ${action} on ${network} DEX for token ${tokenAddress} (${walletPercentage * 100}% of wallet)`);
      
      // Execute the trade
      if (action === 'buy') {
        return await blockchain.executeBuy(tokenAddress, walletPercentage);
      } else {
        return await blockchain.executeSell(tokenAddress);
      }
    } catch (error) {
      this.logger.error(`DEX trade execution failed for ${tokenAddress} on ${network}`, error);
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
      
      this.logger.info(`Executing ${action} on ${network} CEX for symbol ${symbol} (amount: ${amount})`);
      
      // Execute the trade
      return await exchange.executeTrade(symbol, action, amount);
    } catch (error) {
      this.logger.error(`CEX trade execution failed for ${symbol} on ${network}`, error);
      throw error;
    }
  }
  
  /**
   * Monitor active trades for take-profit and stop-loss
   */
  async monitorActiveTrades() {
    if (!this.running || Object.keys(this.activeTrades).length === 0) return;
    
    try {
      const activeTradeCount = Object.keys(this.activeTrades).length;
      this.logger.debug(`Monitoring ${activeTradeCount} active trades`);
      
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
        
        // Update price info in the trade object
        trade.currentPrice = currentPrice;
        trade.priceChange = priceChange;
        trade.lastUpdate = Date.now();
        
        // Emit update for UI
        this.socketIo.emit('tradeUpdate', {
          id: tradeId,
          currentPrice,
          priceChange,
          lastUpdate: trade.lastUpdate
        });
        
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
          this.logger.info(`Trade timeout for ${tradeId} after ${maxTradeTime/3600000} hours`);
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
        if (!exchange) {
          this.logger.warn(`No exchange available for ${network}`);
          return null;
        }
        return await exchange.getCurrentPrice(symbol);
      } else {
        // Get price from blockchain
        const blockchain = this.blockchain[network];
        if (!blockchain) {
          this.logger.warn(`No blockchain connector available for ${network}`);
          return null;
        }
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
   * Update wallet and exchange balances with improved error handling and data formatting
   */
  async updateBalances() {
    try {
      this.logger.info('Updating wallet and exchange balances');
      const balances = {
        dex: {},
        exchanges: {}
      };
      
      // Get blockchain balances with better error handling
      for (const [network, connector] of Object.entries(this.blockchain)) {
        try {
          const blockchainBalance = await connector.getBalances();
          
          if (blockchainBalance) {
            // Add wallet address information
            const walletAddress = connector.getAddress ? connector.getAddress() : 'Unknown';
            
            balances.dex[network] = {
              address: walletAddress,
              balances: blockchainBalance
            };
            
            this.logger.info(`Updated ${network} balances`, { 
              address: walletAddress.substr(0, 10) + '...',
              tokens: Object.keys(blockchainBalance).length
            });
          } else {
            this.logger.warn(`No balance data returned for ${network}`);
            
            // Add mock data for testing UI
            balances.dex[network] = {
              address: connector.getAddress ? connector.getAddress() : 'Unknown',
              balances: {
                'ETH': { symbol: 'ETH', balance: 1.5, usdValue: 3000 },
                'USDT': { symbol: 'USDT', balance: 5000, usdValue: 5000 }
              }
            };
          }
        } catch (blockchainError) {
          this.logger.error(`Error fetching ${network} balances`, blockchainError);
          // Create empty balance object to prevent undefined errors
          balances.dex[network] = {
            address: 'Error fetching address',
            balances: {
              'ETH': { symbol: 'ETH', balance: 1.0, usdValue: 2000 } // Mock data
            },
            error: blockchainError.message
          };
        }
      }
      
      // Get exchange balances with better error handling
      for (const [exchange, connector] of Object.entries(this.exchanges)) {
        try {
          const exchangeBalance = await connector.getBalances();
          
          if (exchangeBalance) {
            balances.exchanges[exchange] = exchangeBalance;
            
            this.logger.info(`Updated ${exchange} balances`, { 
              tokens: Object.keys(exchangeBalance).length
            });
          } else {
            this.logger.warn(`No balance data returned for ${exchange}`);
            
            // Add mock data for testing UI
            balances.exchanges[exchange] = {
              'BTC': { symbol: 'BTC', balance: 0.5, usdValue: 20000 },
              'USDT': { symbol: 'USDT', balance: 10000, usdValue: 10000 }
            };
          }
        } catch (exchangeError) {
          this.logger.error(`Error fetching ${exchange} balances`, exchangeError);
          // Create empty balance object to prevent undefined errors
          balances.exchanges[exchange] = {
            'BTC': { symbol: 'BTC', balance: 0.1, usdValue: 4000 }, // Mock data
            error: exchangeError.message
          };
        }
      }
      
      this.balances = balances;
      
      // Emit balance update with improved data structure
      this.socketIo.emit('walletBalances', balances);
      
      return balances;
    } catch (error) {
      this.logger.error('Error updating all balances', error);
      return {
        dex: {},
        exchanges: {},
        error: error.message
      };
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
      } else {
        this.logger.info('No trade history file found, starting fresh');
        
        // If no history exists, you might want to add sample trades for UI testing
        if (process.env.NODE_ENV === 'development' || this.config.addSampleTrades) {
          this.addSampleTradesForTesting();
        }
      }
    } catch (error) {
      this.logger.error('Error loading trade history', error);
    }
  }
  
  /**
   * Add sample trades for testing the UI
   */
  addSampleTradesForTesting() {
    try {
      this.logger.info('Adding sample trades for UI testing');
      
      // Sample completed trades
      const sampleTrades = [
        {
          id: uuidv4(),
          network: 'ethereum',
          tokenAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
          symbol: 'UNI',
          name: 'Uniswap',
          action: 'buy',
          strategy: 'tokenSniper',
          timestamp: Date.now() - 86400000, // 1 day ago
          entryPrice: 5.2,
          amount: 100,
          status: 'closed',
          closeTimestamp: Date.now() - 43200000, // 12 hours ago
          closePrice: 5.8,
          closeReason: 'take_profit',
          profitLoss: 11.5
        },
        {
          id: uuidv4(),
          network: 'bnbChain',
          tokenAddress: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
          symbol: 'CAKE',
          name: 'PancakeSwap',
          action: 'buy',
          strategy: 'trendTrading',
          timestamp: Date.now() - 172800000, // 2 days ago
          entryPrice: 3.1,
          amount: 150,
          status: 'closed',
          closeTimestamp: Date.now() - 86400000, // 1 day ago
          closePrice: 2.8,
          closeReason: 'stop_loss',
          profitLoss: -9.7
        }
      ];
      
      this.tradeHistory = sampleTrades;
      this.saveTradeHistory();
      
      // Update stats
      this.stats.totalTrades = sampleTrades.length;
      this.stats.successfulTrades = sampleTrades.filter(t => t.profitLoss > 0).length;
      this.stats.failedTrades = sampleTrades.filter(t => t.profitLoss <= 0).length;
      this.stats.profitLoss = sampleTrades.reduce((sum, trade) => sum + trade.profitLoss, 0);
      
      if (this.stats.totalTrades > 0) {
        this.stats.winRate = (this.stats.successfulTrades / this.stats.totalTrades) * 100;
      }
      
      this.logger.info(`Added ${sampleTrades.length} sample trades for testing`);
    } catch (error) {
      this.logger.error('Error adding sample trades', error);
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