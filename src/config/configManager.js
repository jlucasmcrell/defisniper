const fs = require('fs');
const path = require('path');
const { Logger } = require('../utils/logger');

class ConfigManager {
    constructor() {
        this.logger = new Logger('ConfigManager');
        this.config = {};
        
        // Create secure-config directory in the root of the project
        this.secureConfigDir = path.join(process.cwd(), 'secure-config');
        this.ensureSecureConfigDirectory();
        
        this.configPath = path.join(this.secureConfigDir, 'config.json');
        this.loadConfig();
    }

    ensureSecureConfigDirectory() {
        if (!fs.existsSync(this.secureConfigDir)) {
            try {
                fs.mkdirSync(this.secureConfigDir, { recursive: true });
                this.logger.info('Created secure-config directory');
            } catch (error) {
                this.logger.error('Failed to create secure-config directory', error);
                throw error;
            }
        }
    }

    isConfigured() {
        try {
            if (!fs.existsSync(this.configPath)) {
                return false;
            }

            const config = this.getConfig();

            if (!config.general || !config.trading) {
                return false;
            }

            if (!config.trading.walletBuyPercentage || 
                !config.trading.stopLoss ||
                !config.trading.takeProfit ||
                !config.trading.maxConcurrentTrades ||
                !config.trading.maxTradesPerHour) {
                return false;
            }

            const hasEthereumConfig = config.ethereum && config.ethereum.enabled && config.ethereum.privateKey;
            const hasBnbChainConfig = config.bnbChain && config.bnbChain.enabled && config.bnbChain.privateKey;
            const hasBinanceUSConfig = config.exchanges && config.exchanges.binanceUS && config.exchanges.binanceUS.enabled;
            const hasCryptoComConfig = config.exchanges && config.exchanges.cryptoCom && config.exchanges.cryptoCom.enabled;

            return hasEthereumConfig || hasBnbChainConfig || hasBinanceUSConfig || hasCryptoComConfig;
        } catch (error) {
            this.logger.error('Error checking configuration', error);
            return false;
        }
    }

    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const configData = fs.readFileSync(this.configPath, 'utf8');
                this.config = JSON.parse(configData);
                this.logger.info('Configuration loaded successfully');
            } else {
                this.logger.info('No existing configuration found, using default settings');
                this.config = this.getDefaultConfig();
                this.saveConfig();
            }
        } catch (error) {
            this.logger.error('Failed to load config', error);
            this.config = this.getDefaultConfig();
            this.saveConfig();
        }
    }

    saveConfig() {
        try {
            // Ensure directory exists before saving
            this.ensureSecureConfigDirectory();
            
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
            this.logger.info('Configuration saved successfully');
        } catch (error) {
            this.logger.error('Failed to save config', error);
            throw error;
        }
    }

    getConfig() {
        return this.config;
    }

    updateConfig(newConfig) {
        this.config = {
            ...this.config,
            ...newConfig
        };
        this.saveConfig();
    }

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

    // Clean up any config files in root that should be in secure-config
    cleanupLegacyFiles() {
        const rootConfigPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(rootConfigPath)) {
            try {
                // Read the root config
                const content = fs.readFileSync(rootConfigPath);
                // Ensure it's in secure-config
                if (!fs.existsSync(this.configPath)) {
                    fs.writeFileSync(this.configPath, content);
                }
                // Delete the root file
                fs.unlinkSync(rootConfigPath);
                this.logger.info('Moved config.json to secure-config directory');
            } catch (error) {
                this.logger.error('Failed to move config.json to secure-config', error);
            }
        }
    }
}

module.exports = ConfigManager;