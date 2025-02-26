/**
 * Configuration Manager for CryptoSniperBot
 */
const fs = require('fs');
const path = require('path');
const { Logger } = require('../utils/logger');

class ConfigManager {
    constructor() {
        this.logger = new Logger('ConfigManager');
        this.configPath = path.join(__dirname, '../../config/config.json');
        this.config = null;
        this.loadConfig();
    }

    loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const configFile = fs.readFileSync(this.configPath, 'utf8');
                this.config = JSON.parse(configFile);
                this.logger.info('Configuration loaded successfully');
            } else {
                this.config = this.getDefaultConfig();
                this.saveConfig();
                this.logger.info('Created new configuration with default settings');
            }
        } catch (error) {
            this.logger.error('Failed to load configuration', error);
            this.config = this.getDefaultConfig();
        }
    }

    saveConfig() {
        try {
            const configDir = path.dirname(this.configPath);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
            this.logger.info('Configuration saved successfully');
        } catch (error) {
            this.logger.error('Failed to save configuration', error);
            throw error;
        }
    }

    getConfig() {
        return this.config;
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.saveConfig();
    }

    isConfigured() {
        return this.config !== null && 
               this.config.ethereum && 
               this.config.ethereum.infuraId &&
               this.config.trading &&
               this.config.trading.walletBuyPercentage;
    }

    getDefaultConfig() {
        return {
            trading: {
                walletBuyPercentage: 10,
                stopLoss: 5,
                takeProfit: 20,
                maxConcurrentTrades: 5,
                maxTradesPerHour: 10,
                autoStart: false,
                scanInterval: 30000,
                analysisInterval: 60000
            },
            ethereum: {
                enabled: false,
                infuraId: '',
                privateKey: ''
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
            },
            security: {
                encryptionKey: ''
            }
        };
    }

    cleanupLegacyFiles() {
        // Implement cleanup logic if needed
    }
}

module.exports = ConfigManager;