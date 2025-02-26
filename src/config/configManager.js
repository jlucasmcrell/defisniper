/**
 * Configuration Manager for CryptoSniperBot
 * Responsible for loading, validating and providing access to configuration
 */
const fs = require('fs');
const path = require('path');
const { Logger } = require('../utils/logger');

class ConfigManager {
  constructor() {
    this.logger = new Logger('ConfigManager');
    this.config = {};
    this.configPath = path.join(process.cwd(), 'config.json');
    this.loadConfig();
  }

  /**
   * Check if the bot is properly configured
   * @returns {boolean} True if configured, false otherwise
   */
  isConfigured() {
    try {
      // Check if config file exists
      if (!fs.existsSync(this.configPath)) {
        return false;
      }

      // Basic configuration checks
      const config = this.getConfig();

      // Check if essential sections exist
      if (!config.general || !config.trading) {
        return false;
      }

      // Check for essential trading parameters
      if (!config.trading.walletBuyPercentage || 
          !config.trading.stopLoss ||
          !config.trading.takeProfit ||
          !config.trading.maxConcurrentTrades ||
          !config.trading.maxTradesPerHour) {
        return false;
      }

      // Check if at least one trading method is configured
      const hasEthereumConfig = config.ethereum && config.ethereum.enabled && config.ethereum.privateKey;
      const hasBnbChainConfig = config.bnbChain && config.bnbChain.enabled && config.bnbChain.privateKey;
      const hasBinanceUSConfig = config.exchanges && config.exchanges.binanceUS && config.exchanges.binanceUS.enabled;
      const hasCryptoComConfig = config.exchanges && config.exchanges.cryptoCom && config.exchanges.cryptoCom.enabled;

      if (!hasEthereumConfig && !hasBnbChainConfig && !hasBinanceUSConfig && !hasCryptoComConfig) {
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Error checking configuration', error);
      return false;
    }
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
      this.saveConfig();
    }
  }

  /**
   * Save current configuration to file
   */
  saveConfig() {
    try {
      // Create config directory if it doesn't exist
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // Save configuration
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      this.logger.info('Configuration saved successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to save config', error);
      return false;
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
   * Set a specific configuration value
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
      trading: {
        walletBuyPercentage: 5,
        stopLoss: 2.5,
        takeProfit: 5.0,
        maxConcurrentTrades: 3,
        maxTradesPerHour: 10,
        autoStart: false
      },
      ethereum: {
        enabled: false,
        privateKey: '',
        infuraId: '',
        provider: 'infura'
      },
      bnbChain: {
        enabled: false,
        privateKey: ''
      },
      exchanges: {
        binanceUS: {
          enabled: false,
          apiKey: '',
          apiSecret: ''
        },
        cryptoCom: {
          enabled: false,
          apiKey: '',
          apiSecret: ''
        }
      }
    };
  }
}

module.exports = ConfigManager;