/**
 * CryptoSniperBot Enhanced Starter
 * Completely rewrites the main entry point for better initialization and diagnostics
 */
const fs = require('fs');
const path = require('path');
const { TradingEngine } = require('./src/trading/engine');
const { SecurityManager } = require('./src/security/securityManager');
const ConfigManager = require('./src/config/configManager');
const { Logger } = require('./src/utils/logger');
const { EnhancedTrendTradingStrategy } = require('./src/strategies/enhancedTrendTrading');
const { EnhancedTokenScanner } = require('./src/scanner/enhancedTokenScanner');

// Initialize logger with more detailed output
const logger = new Logger('BotStarter');

// Ensure required directories exist
function ensureDirectoriesExist() {
  const dirs = ['logs', 'data', 'secure-config'];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Created directory: ${dir}`);
    }
  }
}

class BotStarter {
  constructor() {
    // Set up internal state
    this.initialized = false;
    this.components = {
      security: null,
      config: null,
      tradingEngine: null
    };
    this.diagnosticsData = {};
    
    // Create enhanced logger
    this.logger = new Logger('EnhancedBotStarter');
  }

  async initialize() {
    try {
      this.logger.info('Starting CryptoSniperBot initialization with enhanced diagnostics');
      
      // Ensure directories exist
      ensureDirectoriesExist();
      
      // Perform file system checks
      await this.performSystemChecks();
      
      // Initialize SecurityManager with better error handling
      this.logger.info('Initializing security manager...');
      this.components.security = new SecurityManager();
      
      const encryptionKeySet = this.components.security.isEncryptionKeySet();
      if (!encryptionKeySet) {
        this.logger.error('Encryption key not found. Cannot proceed with initialization.');
        this.diagnosticsData.securityStatus = 'FAILED - Encryption key missing';
        throw new Error('Encryption key not found. Please run the setup script first.');
      }
      
      this.logger.info('Security manager initialized successfully');
      this.diagnosticsData.securityStatus = 'OK';
      
      // Initialize ConfigManager with better error handling
      this.logger.info('Initializing configuration manager...');
      this.components.config = new ConfigManager(this.components.security);
      
      if (!this.components.config.isConfigured()) {
        this.logger.error('Bot is not configured. Cannot proceed with initialization.');
        this.diagnosticsData.configStatus = 'FAILED - Bot not configured';
        throw new Error('Bot is not configured. Please run the setup script first.');
      }
      
      this.logger.info('Configuration manager initialized successfully');
      this.diagnosticsData.configStatus = 'OK';
      
      // Initialize trading engine with comprehensive logging
      this.logger.info('Initializing trading engine with enhanced components...');
      
      const config = this.components.config.getConfig();
      
      // Log active configuration details (sanitized)
      this.logger.info('Active configuration:', {
        ethereum: config.ethereum ? { enabled: config.ethereum.enabled } : 'Not configured',
        bnbChain: config.bnbChain ? { enabled: config.bnbChain.enabled } : 'Not configured',
        exchanges: {
          binanceUS: config.exchanges?.binanceUS?.enabled ? 'Enabled' : 'Disabled',
          cryptoCom: config.exchanges?.cryptoCom?.enabled ? 'Enabled' : 'Disabled'
        },
        strategies: {
          tokenSniper: config.strategies?.tokenSniper?.enabled ? 'Enabled' : 'Disabled',
          scalping: config.strategies?.scalping?.enabled ? 'Enabled' : 'Disabled',
          trendTrading: config.strategies?.trendTrading?.enabled ? 'Enabled' : 'Disabled'
        }
      });
      
      // Initialize trading engine with enhanced components
      this.components.tradingEngine = new TradingEngine(
        this.components.config, 
        this.components.security
      );
      
      // Set up enhanced strategies
      this.components.tradingEngine.EnhancedTrendTradingStrategy = EnhancedTrendTradingStrategy;
      this.components.tradingEngine.EnhancedTokenScanner = EnhancedTokenScanner;
      
      // Initialize with detailed progress reporting
      this.logger.info('Initializing trading engine subsystems...');
      await this.components.tradingEngine.initialize();
      
      this.logger.info('Trading engine initialized successfully');
      this.diagnosticsData.tradingEngineStatus = 'OK';
      
      // Set global reference for access from other components
      global.tradingEngine = this.components.tradingEngine;
      
      this.initialized = true;
      this.logger.info('CryptoSniperBot initialization completed successfully');
      
      return true;
    } catch (error) {
      this.logger.error('CryptoSniperBot initialization failed', error);
      this.diagnosticsData.initializationError = error.message;
      this.diagnosticsData.fullError = error.stack;
      
      this.initialized = false;
      return false;
    }
  }

  async start() {
    try {
      if (!this.initialized) {
        // Try to initialize if not already done
        const initSuccess = await this.initialize();
        if (!initSuccess) {
          throw new Error('Cannot start: Initialization failed');
        }
      }
      
      this.logger.info('Starting CryptoSniperBot trading engine...');
      
      // Start trading engine
      const started = await this.components.tradingEngine.start();
      
      if (started) {
        this.logger.info('CryptoSniperBot started successfully!');
        this.diagnosticsData.runningStatus = 'RUNNING';
        return true;
      } else {
        this.logger.error('Failed to start CryptoSniperBot');
        this.diagnosticsData.runningStatus = 'FAILED TO START';
        return false;
      }
    } catch (error) {
      this.logger.error('Error starting CryptoSniperBot', error);
      this.diagnosticsData.startError = error.message;
      return false;
    }
  }

  async stop() {
    try {
      if (!this.initialized || !this.components.tradingEngine) {
        this.logger.warn('Cannot stop: Bot not initialized or running');
        return false;
      }
      
      this.logger.info('Stopping CryptoSniperBot...');
      
      // Stop trading engine
      const stopped = await this.components.tradingEngine.stop();
      
      if (stopped) {
        this.logger.info('CryptoSniperBot stopped successfully');
        this.diagnosticsData.runningStatus = 'STOPPED';
        return true;
      } else {
        this.logger.error('Failed to stop CryptoSniperBot');
        return false;
      }
    } catch (error) {
      this.logger.error('Error stopping CryptoSniperBot', error);
      return false;
    }
  }

  async performSystemChecks() {
    const checks = {
      fileSystem: true,
      configuration: true,
      securityKey: true
    };
    
    // Check file system
    const requiredDirs = ['logs', 'data', 'secure-config'];
    for (const dir of requiredDirs) {
      if (!fs.existsSync(dir)) {
        this.logger.warn(`Required directory missing: ${dir}`);
        checks.fileSystem = false;
      }
    }
    
    // Check configuration files
    const configPath = path.join('secure-config', 'config.json');
    if (!fs.existsSync(configPath)) {
      this.logger.warn('Configuration file missing');
      checks.configuration = false;
    }
    
    // Check security key
    const keyPath = path.join('secure-config', 'encryption.key');
    if (!fs.existsSync(keyPath)) {
      this.logger.warn('Encryption key file missing');
      checks.securityKey = false;
    }
    
    this.diagnosticsData.systemChecks = checks;
    
    if (!checks.fileSystem || !checks.configuration || !checks.securityKey) {
      this.logger.warn('System checks failed. Some components may not work correctly.');
    } else {
      this.logger.info('System checks passed');
    }
    
    return checks;
  }

  getDiagnostics() {
    return {
      ...this.diagnosticsData,
      timestamp: new Date().toISOString(),
      botVersion: require('./package.json').version,
      initialized: this.initialized,
      running: this.components.tradingEngine ? this.components.tradingEngine.isRunning() : false
    };
  }
}

// Start the bot
(async () => {
  try {
    logger.info('====================================');
    logger.info('   CryptoSniperBot Startup Script   ');
    logger.info('====================================');
    
    const botStarter = new BotStarter();
    
    // Initialize bot with enhanced diagnostics
    const initResult = await botStarter.initialize();
    
    if (initResult) {
      logger.info('Bot initialized successfully');
      
      // Start the bot
      const startResult = await botStarter.start();
      
      if (startResult) {
        logger.info('Bot started successfully');
        
        // Log diagnostics
        logger.info('Bot diagnostics:', botStarter.getDiagnostics());
        
        // Capture SIGINT for clean shutdown
        process.on('SIGINT', async () => {
          logger.info('\nReceived shutdown signal. Stopping bot...');
          await botStarter.stop();
          logger.info('Bot stopped successfully. Exiting...');
          process.exit(0);
        });
        
      } else {
        logger.error('Failed to start bot. See logs for details.');
        logger.error('Diagnostics:', botStarter.getDiagnostics());
        process.exit(1);
      }
    } else {
      logger.error('Bot initialization failed. See logs for details.');
      logger.error('Diagnostics:', botStarter.getDiagnostics());
      process.exit(1);
    }
  } catch (error) {
    logger.error('Unhandled error in startup script', error);
    process.exit(1);
  }
})();

// Export for potential reuse
module.exports = BotStarter;