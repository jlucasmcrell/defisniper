/**
 * Configuration Manager
 * 
 * Handles loading, saving, and managing bot configuration.
 */

const fs = require('fs');
const path = require('path');
const { Logger } = require('../utils/logger');

class ConfigManager {
  constructor() {
    this.logger = new Logger('ConfigManager');
    this.config = this.loadConfig();
  }
  
  /**
   * Load configuration from file
   */
  loadConfig() {
    try {
      const configPath = path.join(process.cwd(), 'secure-config', 'config.json');
      
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configData);
      }
    } catch (error) {
      this.logger.error('Error loading config', error);
    }
    
    // Return default config if not found or error
    return {
      version: '1.0.0',
      configured: false,
      ethereum: {
        enabled: false,
        network: 'mainnet'
      },
      bnbChain: {
        enabled: false
      },
      exchanges: {
        binanceUS: {
          enabled: false
        },
        cryptoCom: {
          enabled: false
        }
      },
      strategies: {
        tokenSniper: {
          enabled: false,
          minLiquidity: 10000,
          maxBuyTax: 10,
          maxSellTax: 10,
          requireAudit: false
        },
        scalping: {
          enabled: false,
          minPriceChange: 0.5,
          maxTradeTime: 300
        },
        trendTrading: {
          enabled: false,
          rsiLow: 30,
          rsiHigh: 70,
          macdFast: 12,
          macdSlow: 26,
          macdSignal: 9
        }
      },
      trading: {
        walletBuyPercentage: 5,
        stopLoss: 2.5,
        takeProfit: 5,
        maxConcurrentTrades: 5,
        maxTradesPerHour: 10,
        closeTradesOnStop: true,
        autoStart: false
      },
      riskManagement: {
        maxTradeSize: 0,
        dailyLossLimit: 0
      }
    };
  }
  
  /**
   * Save configuration to file
   */
  saveConfig() {
    try {
      const configDir = path.join(process.cwd(), 'secure-config');
      
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      const configPath = path.join(configDir, 'config.json');
      
      // Mark as configured
      this.config.configured = true;
      
      fs.writeFileSync(
        configPath,
        JSON.stringify(this.config, null, 2)
      );
      
      return true;
    } catch (error) {
      this.logger.error('Error saving config', error);
      return false;
    }
  }
  
  /**
   * Get the current configuration
   */
  getConfig() {
    return this.config;
  }
  
  /**
   * Update configuration with new values
   */
  updateConfig(newConfig) {
    try {
      // Deep merge the new config with the existing one
      this.config = this.deepMerge(this.config, newConfig);
      
      // Save the updated config
      return this.saveConfig();
    } catch (error) {
      this.logger.error('Error updating config', error);
      return false;
    }
  }
  
  /**
   * Deep merge two objects
   */
  deepMerge(target, source) {
    // Create a copy of the target
    const output = { ...target };
    
    // If source is not an object, return target
    if (!source || typeof source !== 'object') {
      return output;
    }
    
    // Go through each key in source
    Object.keys(source).forEach(key => {
      if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
        // If the key is an object in both source and target, merge them
        output[key] = this.deepMerge(target[key], source[key]);
      } else {
        // Otherwise just copy from source to output
        output[key] = source[key];
      }
    });
    
    return output;
  }
  
  /**
   * Check if the bot is configured
   */
  isConfigured() {
    return this.config && this.config.configured === true;
  }
  
  /**
   * Get a specific configuration value
   */
  getValue(key, defaultValue = null) {
    try {
      // Split the key by dots
      const keys = key.split('.');
      let value = this.config;
      
      // Traverse the object using the keys
      for (const k of keys) {
        if (value[k] === undefined) {
          return defaultValue;
        }
        value = value[k];
      }
      
      return value;
    } catch (error) {
      this.logger.error(`Error getting value for ${key}`, error);
      return defaultValue;
    }
  }
  
  /**
   * Set a specific configuration value
   */
  setValue(key, value) {
    try {
      // Split the key by dots
      const keys = key.split('.');
      let target = this.config;
      
      // Traverse the object using the keys
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (target[k] === undefined) {
          target[k] = {};
        }
        target = target[k];
      }
      
      // Set the value
      target[keys[keys.length - 1]] = value;
      
      // Save the updated config
      return this.saveConfig();
    } catch (error) {
      this.logger.error(`Error setting value for ${key}`, error);
      return false;
    }
  }
}

// Changed export to not use destructuring
module.exports = ConfigManager;