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
   * Initialize blockchain connectors with improved error handling
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
        
        try {
          // Validate API key
          const apiKey = decryptedConfig.ethereum.infuraId || decryptedConfig.ethereum.alchemyKey;
          if (!apiKey || typeof apiKey !== 'string') {
            throw new Error('Missing or invalid API key for Ethereum provider');
          }

          // Validate private key
          const privateKey = decryptedConfig.ethereum.privateKey;
          if (!privateKey || typeof privateKey !== 'string') {
            throw new Error('Missing or invalid private key for Ethereum');
          }
          
          this.blockchain.ethereum = new EthereumConnector(
            decryptedConfig,
            this.logger
          );
          
          const success = await this.blockchain.ethereum.initialize();
          
          if (success) {
            this.logger.info('Ethereum connector initialized successfully');
            
            // Get and log the wallet address with null check
            const address = this.blockchain.ethereum.getAddress?.() || 'Unknown';
            if (typeof address === 'string') {
              this.logger.info(`Ethereum wallet address: ${address.substr(0, 10)}...`);
            } else {
              this.logger.info('Ethereum wallet address: Unknown');
            }
            
            // Test DEX connectivity
            const factory = this.blockchain.ethereum.getFactory?.();
            if (factory) {
              this.logger.info('Successfully connected to Uniswap factory');
              
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
          // Validate private key
          const privateKey = decryptedConfig.bnbChain.privateKey || decryptedConfig.ethereum.privateKey;
          if (!privateKey || typeof privateKey !== 'string') {
            throw new Error('Missing or invalid private key for BNB Chain');
          }
          
          this.blockchain.bnbChain = new BnbConnector(
            decryptedConfig,
            this.logger
          );
          
          const success = await this.blockchain.bnbChain.initialize();
          
          if (success) {
            this.logger.info('BNB Chain connector initialized successfully');
            
            // Get and log the wallet address with null check
            const address = this.blockchain.bnbChain.getAddress?.() || 'Unknown';
            if (typeof address === 'string') {
              this.logger.info(`BNB Chain wallet address: ${address.substr(0, 10)}...`);
            } else {
              this.logger.info('BNB Chain wallet address: Unknown');
            }
            
            // Test DEX connectivity
            const factory = this.blockchain.bnbChain.getFactory?.();
            if (factory) {
              this.logger.info('Successfully connected to PancakeSwap factory');
              
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
   * Initialize exchange connectors with improved error handling
   */
  async initializeExchangeConnectors(decryptedConfig) {
    try {
      this.logger.info('Initializing exchange connectors');
      
      // Initialize Binance.US connector
      if (decryptedConfig.exchanges?.binanceUS?.enabled) {
        this.logger.info('Setting up Binance.US connector');
        
        try {
          // Validate API credentials
          const apiKey = decryptedConfig.exchanges.binanceUS.apiKey;
          const apiSecret = decryptedConfig.exchanges.binanceUS.apiSecret;
          
          if (!apiKey || !apiSecret || typeof apiKey !== 'string' || typeof apiSecret !== 'string') {
            throw new Error('Missing or invalid API credentials for Binance.US');
          }
          
          this.exchanges.binanceUS = new BinanceExchange(
            apiKey,
            apiSecret,
            this.logger
          );
          
          const success = await this.exchanges.binanceUS.initialize();
          
          if (success) {
            this.logger.info('Binance.US connector initialized successfully');
            
            const balances = await this.exchanges.binanceUS.getBalances();
            const balanceCount = Object.keys(balances || {}).length;
            
            this.logger.info(`Connected to Binance.US with ${balanceCount} currencies available`);
            
            try {
              const symbols = await this.exchanges.binanceUS.getSymbols();
              if (Array.isArray(symbols)) {
                this.logger.info(`Binance.US has ${symbols.length} trading pairs available`);
                const exampleSymbols = symbols.slice(0, 5);
                this.logger.info(`Example pairs: ${exampleSymbols.join(', ')}`);
              }
            } catch (symbolError) {
              this.logger.warn('Could not get symbols from Binance.US', symbolError.message);
            }
          } else {
            throw new Error('Binance.US connector initialization failed');
          }
        } catch (binanceError) {
          this.logger.error('Failed to initialize Binance.US connector', binanceError);
        }
      }
      
      // Initialize Crypto.com connector
      if (decryptedConfig.exchanges?.cryptoCom?.enabled) {
        this.logger.info('Setting up Crypto.com connector');
        
        try {
          // Validate API credentials
          const apiKey = decryptedConfig.exchanges.cryptoCom.apiKey;
          const apiSecret = decryptedConfig.exchanges.cryptoCom.apiSecret;
          
          if (!apiKey || !apiSecret || typeof apiKey !== 'string' || typeof apiSecret !== 'string') {
            throw new Error('Missing or invalid API credentials for Crypto.com');
          }
          
          this.exchanges.cryptoCom = new CryptocomExchange(
            apiKey,
            apiSecret,
            this.logger
          );
          
          const success = await this.exchanges.cryptoCom.initialize();
          
          if (success) {
            this.logger.info('Crypto.com connector initialized successfully');
            
            const balances = await this.exchanges.cryptoCom.getBalances();
            const balanceCount = Object.keys(balances || {}).length;
            
            this.logger.info(`Connected to Crypto.com with ${balanceCount} currencies available`);
            
            try {
              const symbols = await this.exchanges.cryptoCom.getSymbols();
              if (Array.isArray(symbols)) {
                this.logger.info(`Crypto.com has ${symbols.length} trading pairs available`);
                const exampleSymbols = symbols.slice(0, 5);
                this.logger.info(`Example pairs: ${exampleSymbols.join(', ')}`);
              }
            } catch (symbolError) {
              this.logger.warn('Could not get symbols from Crypto.com', symbolError.message);
            }
          } else {
            throw new Error('Crypto.com connector initialization failed');
          }
        } catch (cryptoComError) {
          this.logger.error('Failed to initialize Crypto.com connector', cryptoComError);
        }
      }
      
      return true;
    } catch (error) {
      this.logger.error('Error initializing exchange connectors', error);
      return false;
    }
  }
    /**
   * Initialize trading strategies with enhanced token support
   */
  async initializeStrategies(decryptedConfig) {
    try {
      this.logger.info('Initializing trading strategies');
      
      // Initialize token sniping strategy if enabled
      if (decryptedConfig.strategies?.tokenSniper?.enabled) {
        this.logger.info('Setting up Token Sniper strategy');
        
        try {
          this.strategies.tokenSniper = new TokenSniperStrategy(
            this.blockchain,
            this.exchanges,
            decryptedConfig.strategies.tokenSniper,
            this.logger
          );
          
          if (typeof this.strategies.tokenSniper.initialize === 'function') {
            await this.strategies.tokenSniper.initialize();
          }
          
          this.logger.info('Token Sniper strategy initialized successfully');
        } catch (error) {
          this.logger.error('Failed to initialize Token Sniper strategy', error);
        }
      }
      
      // Initialize scalping strategy if enabled
      if (decryptedConfig.strategies?.scalping?.enabled) {
        this.logger.info('Setting up Scalping strategy');
        
        try {
          this.strategies.scalping = new ScalpingStrategy(
            this.blockchain,
            this.exchanges,
            decryptedConfig.strategies.scalping,
            this.logger
          );
          
          if (typeof this.strategies.scalping.initialize === 'function') {
            await this.strategies.scalping.initialize();
          }
          
          this.logger.info('Scalping strategy initialized successfully');
        } catch (error) {
          this.logger.error('Failed to initialize Scalping strategy', error);
        }
      }
      
      // Initialize enhanced trend trading strategy if enabled
      if (decryptedConfig.strategies?.trendTrading?.enabled) {
        this.logger.info('Setting up Enhanced Trend Trading strategy');
        
        try {
          this.strategies.trendTrading = new EnhancedTrendTradingStrategy(
            this.blockchain,
            this.exchanges,
            decryptedConfig.strategies.trendTrading,
            this.logger
          );
          
          if (typeof this.strategies.trendTrading.initialize === 'function') {
            await this.strategies.trendTrading.initialize();
          }
          
          this.logger.info('Enhanced Trend Trading strategy initialized successfully');
        } catch (error) {
          this.logger.error('Failed to initialize Enhanced Trend Trading strategy', error);
        }
      }
      
      return true;
    } catch (error) {
      this.logger.error('Error initializing trading strategies', error);
      return false;
    }
  }
  
  /**
   * Initialize token scanner with enhanced error handling
   */
  async initializeTokenScanner(decryptedConfig) {
    try {
      this.logger.info('Initializing token scanner for new token detection');
      
      if (!decryptedConfig) {
        throw new Error('Configuration is required for token scanner initialization');
      }
      
      try {
        this.tokenScanner = new EnhancedTokenScanner(
          this.blockchain,
          this.exchanges,
          decryptedConfig,
          this.logger
        );
        
        await this.tokenScanner.initialize();
        
        // Set up event listener for new tokens
        if (typeof this.tokenScanner.on === 'function') {
          this.tokenScanner.on('newToken', (data) => {
            this.handleNewToken(data);
          });
        } else {
          this.logger.warn('Token scanner does not support event emitting');
        }
        
        // Start scanner if bot is running
        if (this.running && typeof this.tokenScanner.start === 'function') {
          await this.tokenScanner.start();
        }
        
        this.logger.info('Token scanner initialized successfully');
        return true;
      } catch (scannerError) {
        this.logger.error('Failed to initialize token scanner', scannerError);
        return false;
      }
    } catch (error) {
      this.logger.error('Error in token scanner initialization', error);
      return false;
    }
  }
  
  /**
   * Update balances with enhanced error handling
   */
  async updateBalances() {
    try {
      this.logger.info('Updating wallet and exchange balances');
      const balances = {
        dex: {},
        exchanges: {}
      };
      
      // Get blockchain balances with improved error handling
      for (const [network, connector] of Object.entries(this.blockchain)) {
        try {
          if (!connector || typeof connector.getBalances !== 'function') {
            this.logger.warn(`Invalid connector for ${network}`);
            continue;
          }

          const blockchainBalance = await connector.getBalances();
          
          if (blockchainBalance) {
            const walletAddress = connector.getAddress?.() || 'Unknown';
            
            balances.dex[network] = {
              address: walletAddress,
              balances: blockchainBalance
            };
            
            if (typeof walletAddress === 'string') {
              this.logger.info(`Updated ${network} balances`, {
                address: `${walletAddress.substr(0, 10)}...`,
                tokens: Object.keys(blockchainBalance).length
              });
            } else {
              this.logger.info(`Updated ${network} balances`, {
                address: 'Unknown',
                tokens: Object.keys(blockchainBalance).length
              });
            }
          }
        } catch (blockchainError) {
          this.logger.error(`Error fetching ${network} balances`, blockchainError);
          balances.dex[network] = {
            address: 'Error',
            balances: {},
            error: blockchainError.message
          };
        }
      }
      
      // Get exchange balances with improved error handling
      for (const [exchange, connector] of Object.entries(this.exchanges)) {
        try {
          if (!connector || typeof connector.getBalances !== 'function') {
            this.logger.warn(`Invalid connector for ${exchange}`);
            continue;
          }

          const exchangeBalance = await connector.getBalances();
          
          if (exchangeBalance) {
            balances.exchanges[exchange] = exchangeBalance;
            
            this.logger.info(`Updated ${exchange} balances`, {
              tokens: Object.keys(exchangeBalance).length
            });
          }
        } catch (exchangeError) {
          this.logger.error(`Error fetching ${exchange} balances`, exchangeError);
          balances.exchanges[exchange] = {
            error: exchangeError.message
          };
        }
      }
      
      this.balances = balances;
      
      // Emit balance update
      this.socketIo.emit('walletBalances', balances);
      
      return balances;
    } catch (error) {
      this.logger.error('Error updating balances', error);
      return {
        dex: {},
        exchanges: {},
        error: error.message
      };
    }
  }
  
  // ... (rest of the methods remain unchanged)
}

module.exports = { TradingEngine };