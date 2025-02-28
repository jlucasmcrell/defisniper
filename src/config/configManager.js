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
        this.configPath = path.join(process.cwd(), 'secure-config', 'config.json');
        this.config = this.loadConfig();
    }
    
    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const configData = fs.readFileSync(this.configPath, 'utf8');
                let parsedConfig;
                
                try {
                    parsedConfig = JSON.parse(configData);
                } catch (parseError) {
                    this.logger.error('Invalid JSON in config file', parseError);
                    return this.getDefaultConfig();
                }
                
                // Decrypt sensitive information
                try {
                    const decryptedConfig = this.securityManager.decryptConfig(parsedConfig);
                    return this.validateConfig(decryptedConfig);
                } catch (decryptError) {
                    this.logger.error('Error decrypting config', decryptError);
                    return this.getDefaultConfig();
                }
            }
            
            return this.getDefaultConfig();
        } catch (error) {
            this.logger.error('Error loading config', error);
            return this.getDefaultConfig();
        }
    }

    validateConfig(config) {
        const defaultConfig = this.getDefaultConfig();
        
        // Ensure all required fields exist by deep merging with default config
        return this.deepMerge(defaultConfig, config);
    }

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
            tokens: [],
            trading: {
                walletBuyPercentage: 5,
                stopLoss: 2.5,
                takeProfit: 5,
                maxConcurrentTrades: 5,
                maxTradesPerHour: 10,
                closeTradesOnStop: true,
                autoStart: false,
                slippageTolerance: 0.05
            }
        };
    }
    
    getConfig() {
        return this.config;
    }
    
    async updateConfig(newConfig) {
        try {
            if (!newConfig || typeof newConfig !== 'object') {
                throw new Error('Invalid configuration object');
            }

            // Create a deep copy of the current config
            const currentConfig = this.config || this.getDefaultConfig();
            
            // Merge the new config with the current config
            const mergedConfig = this.deepMerge(currentConfig, newConfig);
            
            // Validate the merged config
            this.config = this.validateConfig(mergedConfig);
            
            // Save to disk
            const saved = await this.saveConfig();
            if (!saved) {
                throw new Error('Failed to save configuration');
            }
            
            return true;
        } catch (error) {
            this.logger.error('Error updating config', {
                error: error.message,
                module: 'ConfigManager',
                stack: error.stack
            });
            return false;
        }
    }
    
    async saveConfig() {
        try {
            const configDir = path.dirname(this.configPath);
            
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }
            
            // Update configured status based on enabled features
            this.config.configured = !!(
                (this.config.ethereum && this.config.ethereum.enabled) ||
                (this.config.bnbChain && this.config.bnbChain.enabled) ||
                (this.config.exchanges.binanceUS && this.config.exchanges.binanceUS.enabled) ||
                (this.config.exchanges.cryptoCom && this.config.exchanges.cryptoCom.enabled)
            );
            
            // Create a copy of the config for saving
            const configToSave = { ...this.config };
            
            // Encrypt sensitive data
            const encryptedConfig = await this.securityManager.encryptConfig(configToSave);
            
            // Write to file with proper formatting
            fs.writeFileSync(
                this.configPath,
                JSON.stringify(encryptedConfig, null, 2),
                'utf8'
            );
            
            return true;
        } catch (error) {
            this.logger.error('Error saving config', {
                error: error.message,
                module: 'ConfigManager',
                stack: error.stack
            });
            return false;
        }
    }
    
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
    
    isConfigured() {
        return this.config && this.config.configured === true;
    }

    /**
     * Get raw encrypted config for backup purposes
     * @returns {Object} Raw encrypted configuration
     */
    getRawConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const configData = fs.readFileSync(this.configPath, 'utf8');
                return JSON.parse(configData);
            }
            return null;
        } catch (error) {
            this.logger.error('Error getting raw config', error);
            return null;
        }
    }

    /**
     * Restore config from raw encrypted backup
     * @param {Object} rawConfig - Raw encrypted configuration
     * @returns {boolean} Success status
     */
    async restoreFromRaw(rawConfig) {
        try {
            if (!rawConfig || typeof rawConfig !== 'object') {
                throw new Error('Invalid raw configuration');
            }

            // Try to decrypt the raw config to validate it
            const decryptedConfig = this.securityManager.decryptConfig(rawConfig);
            if (!decryptedConfig) {
                throw new Error('Failed to decrypt raw configuration');
            }

            // Write the raw config directly to file
            fs.writeFileSync(this.configPath, JSON.stringify(rawConfig, null, 2), 'utf8');
            
            // Reload the configuration
            this.config = this.loadConfig();
            
            return true;
        } catch (error) {
            this.logger.error('Error restoring raw config', error);
            return false;
        }
    }
}

module.exports = ConfigManager;