/**
 * Trading Engine for CryptoSniperBot
 * Core component that manages all trading operations
 */
const { Logger } = require('../utils/logger');
const ExchangeFactory = require('./exchangeFactory');

class TradingEngine {
  constructor(configManager, securityManager) {
    this.logger = new Logger('TradingEngine');
    this.configManager = configManager;
    this.securityManager = securityManager;
    this.initialized = false;
    this.running = false;
    this.activeOrders = new Map();
    this.activeTrades = new Map();
    this.exchange = null;
  }

  /**
   * Initialize the trading engine
   */
  async initialize() {
    try {
      this.logger.info('Initializing trading engine');
      
      // Get configuration
      const config = this.configManager.getConfig();
      if (!config || !this.configManager.isConfigured()) {
        throw new Error('Trading engine not configured');
      }
      
      // Initialize exchange connections
      if (config.exchanges) {
        if (config.exchanges.binanceUS && config.exchanges.binanceUS.enabled) {
          const apiKey = this.securityManager.decrypt(config.exchanges.binanceUS.apiKey);
          const apiSecret = this.securityManager.decrypt(config.exchanges.binanceUS.apiSecret);
          this.exchange = ExchangeFactory.createExchange('binanceUS', { apiKey, apiSecret });
        } else if (config.exchanges.cryptoCom && config.exchanges.cryptoCom.enabled) {
          const apiKey = this.securityManager.decrypt(config.exchanges.cryptoCom.apiKey);
          const apiSecret = this.securityManager.decrypt(config.exchanges.cryptoCom.apiSecret);
          this.exchange = ExchangeFactory.createExchange('cryptoCom', { apiKey, apiSecret });
        }
      }
      
      // Initialize blockchain connections
      if (config.ethereum && config.ethereum.enabled) {
        const privateKey = this.securityManager.decrypt(config.ethereum.privateKey);
        const infuraId = this.securityManager.decrypt(config.ethereum.infuraId);
        // Initialize Ethereum connection here
      }
      
      if (config.bnbChain && config.bnbChain.enabled) {
        const privateKey = this.securityManager.decrypt(config.bnbChain.privateKey);
        // Initialize BNB Chain connection here
      }
      
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
      this.logger.info('Trading engine started');
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
      this.logger.info('Trading engine stopped');
      return true;
    } catch (error) {
      this.logger.error('Failed to stop trading engine', error);
      return false;
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