/**
 * CryptoSniperBot Main Entry Point
 * 
 * Initializes the trading bot with all components.
 * This is the main file loaded when launching in standalone mode.
 */

const { app } = require('electron');
const path = require('path');
const { Logger } = require('./utils/logger');
const { ConfigManager } = require('./config/configManager');
const { SecurityManager } = require('./security/securityManager');
const { TradingEngine } = require('./trading/engine');

// Initialize logger
const logger = new Logger('Main');

/**
 * Main application class
 */
class CryptoSniperBot {
  constructor() {
    this.configManager = new ConfigManager();
    this.securityManager = new SecurityManager();
    this.tradingEngine = null;
  }
  
  /**
   * Initialize the application
   */
  async initialize() {
    try {
      logger.info('Initializing CryptoSniperBot');
      
      // Check if configured
      if (!this.configManager.isConfigured()) {
        logger.warn('CryptoSniperBot is not configured. Please run setup.js first.');
        return false;
      }
      
      // Check for encryption key
      if (!this.securityManager.isEncryptionKeySet()) {
        logger.error('Encryption key not available. Cannot start trading engine.');
        return false;
      }
      
      // Initialize trading engine
      this.tradingEngine = new TradingEngine(this.configManager, this.securityManager);
      
      // Initialize trading engine
      await this.tradingEngine.initialize();
      
      // Set up global access to trading engine
      global.tradingEngine = this.tradingEngine;
      
      logger.info('CryptoSniperBot initialized successfully');
      
      // Auto-start if configured
      const config = this.configManager.getConfig();
      if (config.trading && config.trading.autoStart) {
        await this.start();
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize CryptoSniperBot', error);
      return false;
    }
  }
  
  /**
   * Start the trading engine
   */
  async start() {
    try {
      if (!this.tradingEngine) {
        logger.error('Trading engine not initialized.');
        return false;
      }
      
      if (this.tradingEngine.isRunning()) {
        logger.warn('Trading engine is already running.');
        return true;
      }
      
      logger.info('Starting trading engine');
      return await this.tradingEngine.start();
    } catch (error) {
      logger.error('Failed to start trading engine', error);
      return false;
    }
  }
  
  /**
   * Stop the trading engine
   */
  async stop() {
    try {
      if (!this.tradingEngine) {
        logger.error('Trading engine not initialized.');
        return false;
      }
      
      if (!this.tradingEngine.isRunning()) {
        logger.warn('Trading engine is not running.');
        return true;
      }
      
      logger.info('Stopping trading engine');
      return await this.tradingEngine.stop();
    } catch (error) {
      logger.error('Failed to stop trading engine', error);
      return false;
    }
  }
}

// If running directly (not through Electron)
if (require.main === module) {
  const bot = new CryptoSniperBot();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    
    if (bot.tradingEngine && bot.tradingEngine.isRunning()) {
      await bot.stop();
    }
    
    process.exit(0);
  });
  
  // Initialize
  bot.initialize()
    .then(success => {
      if (!success) {
        logger.error('Failed to initialize bot');
        process.exit(1);
      }
    })
    .catch(error => {
      logger.error('Unexpected error', error);
      process.exit(1);
    });
}

module.exports = CryptoSniperBot;
