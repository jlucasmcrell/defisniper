/**
 * Configuration Manager
 * 
 * Handles loading, saving, and managing bot configuration.
 */

const fs = require('fs');
const path = require('path');
const { Logger } = require('../utils/logger');

class ConfigManager {
    constructor(securityManager) {
        if (!securityManager) {
            throw new Error('SecurityManager is required');
        }
        
        this.securityManager = securityManager;
        this.logger = new Logger('ConfigManager');
        this.config = null; // Initialize as null
        this.loadConfig(); // Load config in constructor
    }
    
    /**
     * Load configuration from file
     */
    loadConfig() {
        try {
            const configPath = path.join(process.cwd(), 'secure-config', 'config.json');
            
            if (fs.existsSync(configPath)) {
                const configData = fs.readFileSync(configPath, 'utf8');
                const parsedConfig = JSON.parse(configData);
                
                // Decrypt sensitive information
                try {
                    this.config = this.securityManager.decryptConfig(parsedConfig);
                } catch (decryptError) {
                    this.logger.error('Error decrypting config', decryptError);
                    this.config = parsedConfig; // Return the encrypted config if decryption fails
                }
            } else {
                // Set default config if not found
                this.config = this.getDefaultConfig();
            }

            return this.config;
        } catch (error) {
            this.logger.error('Error loading config', error);
            this.config = this.getDefaultConfig();
            return this.config;
        }
    }

    /**
     * Get default configuration
     */
    getDefaultConfig() {
        return {
            version: '1.0.0',
            configured: false,
            ethereum: {
                enabled: false,
                network: 'mainnet',
                privateKey: '',
                infuraId: '',
                alchemyKey: '',
                uniswapFactoryAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
                uniswapRouterAddress: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
            },
            bnbChain: {
                enabled: false,
                privateKey: '',
                pancakeFactoryAddress: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
                pancakeRouterAddress: '0x10ED43C718714eb63d5aA57B78B54704E256024E'
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
     * Get the current configuration
     */
    getConfig() {
        if (!this.config) {
            this.loadConfig();
        }
        return this.config;
    }
    
    /**
     * Update configuration with new values
     */
    updateConfig(newConfig) {
        try {
            // Deep merge the new config with the existing one
            this.config = this.deepMerge(this.config || this.getDefaultConfig(), newConfig);
            
            // Save the updated config
            return this.saveConfig();
        } catch (error) {
            this.logger.error('Error updating config', error);
            return false;
        }
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
            
            // Encrypt sensitive data before saving
            const configToSave = this.securityManager.encryptConfig({ ...this.config });
            
            fs.writeFileSync(
                configPath,
                JSON.stringify(configToSave, null, 2)
            );
            
            return true;
        } catch (error) {
            this.logger.error('Error saving config', error);
            return false;
        }
    }
    
    /**
     * Deep merge two objects
     */
    deepMerge(target, source) {
        const output = { ...target };
        
        if (!source || typeof source !== 'object') {
            return output;
        }
        
        Object.keys(source).forEach(key => {
            if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
                output[key] = this.deepMerge(target[key], source[key]);
            } else if (source[key] !== undefined) {
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
            const keys = key.split('.');
            let value = this.getConfig();
            
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
            const keys = key.split('.');
            let target = this.config || this.getDefaultConfig();
            
            for (let i = 0; i < keys.length - 1; i++) {
                const k = keys[i];
                if (target[k] === undefined) {
                    target[k] = {};
                }
                target = target[k];
            }
            
            target[keys[keys.length - 1]] = value;
            this.config = target;
            
            return this.saveConfig();
        } catch (error) {
            this.logger.error(`Error setting value for ${key}`, error);
            return false;
        }
    }
}

module.exports = ConfigManager;