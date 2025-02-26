/**
 * Configuration Manager for CryptoSniperBot
 * Responsible for loading, validating and providing access to configuration
 */
const fs = require('fs');
const path = require('path');
const defaultLogger = require('../utils/logger');
const { Logger } = require('../utils/logger');

class ConfigManager {
  constructor() {
    this.logger = new Logger('ConfigManager');
    this.config = {};
    this.configPath = path.join(process.cwd(), 'config.json');
    this.loadConfig();
  }

  /**
   * Load configuration from file
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        this.config = JSON.parse(configData);
        this.logger.info('Configuration loaded successfully');
      } else {
        this.logger.warn('Config file not found, using default settings');
        this.config = this.getDefaultConfig();
        this.saveConfig();
      }
    } catch (error) {
      this.logger.error('Failed to load config', error);
      this.config = this.getDefaultConfig();
    }
  }

  /**
   * Save current configuration to file
   */
  saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      this.logger.info('Configuration saved successfully');
    } catch (error) {
      this.logger.error('Failed to save config', error);
    }
  }

  /**
   * Get the entire configuration object
   * @returns {Object} The configuration object
   */
  getConfig() {
    return this.config;
  }

  /**
   * Get a specific configuration value
   * @param {string} key - The configuration key
   * @param {any} defaultValue - Default value if key doesn't exist
   * @returns {any} The configuration value
   */
  get(key, defaultValue = null) {
    const keys = key.split('.');
    let value = this.config;
    
    for (const k of keys) {
      if (value === undefined || value === null || !Object.prototype.hasOwnProperty.call(value, k)) {
        return defaultValue;
      }
      value = value[k];
    }
    
    return value;
  }

  /**
   * Update configuration with new values
   * @param {Object} newConfig - New configuration values to merge
   */
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };
    this.saveConfig();
  }

  /**
   * Update a specific configuration value
   * @param {string} key - The configuration key
   * @param {any} value - The new value
   */
  set(key, value) {
    const keys = key.split('.');
    let current = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!Object.prototype.hasOwnProperty.call(current, k)) {
        current[k] = {};
      }
      current = current[k];
    }
    
    current[keys[keys.length - 1]] = value;
    this.saveConfig();
  }

  /**
   * Get default configuration
   * @returns {Object} Default configuration
   */
  getDefaultConfig() {
    return {
      general: {
        tradingEnabled: false,
        debugMode: true
      },
      exchange: {
        name: 'binance',
        apiKey: '',
        apiSecret: '',
        testMode: true
      },
      trading: {
        baseCurrency: 'USDT',
        tradingPairs: ['BTC', 'ETH', 'BNB'],
        orderSize: 100, // in base currency
        maxOpenTrades: 3,
        stopLossPercentage: 2.5,
        takeProfitPercentage: 5.0
      }
    };
  }
}

// Export as a class (not singleton)
module.exports = ConfigManager;