/**
 * Configuration Manager
 * Manages loading, saving, and validating application configuration
 */
const path = require('path');
const fs = require('fs').promises;
const { Logger } = require('../utils/logger');

class ConfigManager {
    constructor(securityManager = null) {
        this.config = null;
        this.securityManager = securityManager;
        this.logger = new Logger('ConfigManager');
        this.configFile = path.join(process.cwd(), 'secure-config', 'config.json');
        this.tradeHistoryFile = path.join(process.cwd(), 'data', 'trade_history.json');
    }

    async initialize() {
        try {
            this.logger.info('Initializing configuration manager');
            await this.ensureDirectories();
            await this.loadConfig();
            return true;
        } catch (error) {
            this.logger.error('Failed to initialize configuration manager', error);
            return false;
        }
    }

    async ensureDirectories() {
        const dirs = [
            path.dirname(this.configFile),
            path.dirname(this.tradeHistoryFile)
        ];
        
        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                // Ignore if directory already exists
                if (error.code !== 'EEXIST') {
                    this.logger.error(`Failed to create directory: ${dir}`, error);
                    throw error;
                }
            }
        }
    }

    async loadConfig() {
        try {
            // Check if config file exists
            try {
                await fs.access(this.configFile);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    this.logger.info('Config file not found, using default configuration');
                    this.config = this.getDefaultConfig();
                    return;
                }
                throw error;
            }

            // Read and parse config
            const fileData = await fs.readFile(this.configFile, 'utf8');
            const configData = JSON.parse(fileData);

            // Store parsed config
            this.config = configData;
            this.logger.info('Configuration loaded successfully');
        } catch (error) {
            this.logger.error('Error loading configuration', error);
            this.config = this.getDefaultConfig();
        }
    }

    async saveConfig(config) {
        try {
            // If security manager is available, encrypt the config
            let dataToSave = config;
            
            if (this.securityManager && typeof this.securityManager.encryptConfig === 'function') {
                try {
                    dataToSave = await this.securityManager.encryptConfig(config);
                } catch (encryptError) {
                    this.logger.error('Failed to encrypt config', encryptError);
                    throw encryptError;
                }
            }
            
            // Make sure directory exists
            await this.ensureDirectories();
            
            // Write to file
            await fs.writeFile(this.configFile, JSON.stringify(dataToSave, null, 2), 'utf8');
            
            // Update in-memory config
            this.config = dataToSave;
            
            this.logger.info('Configuration saved successfully');
            return true;
        } catch (error) {
            this.logger.error('Failed to save configuration', error);
            throw error;
        }
    }

    getConfig() {
        return this.config || this.getDefaultConfig();
    }

    isConfigured() {
        return !!this.config;
    }

    getTradeHistoryPath() {
        return this.tradeHistoryFile;
    }

    // Default configuration
    getDefaultConfig() {
        return {
            ethereum: {
                enabled: false,
                nodeUrl: '',
                privateKey: '',
                gasLimit: 250000,
                gasPriceMultiplier: 1.1
            },
            bnbChain: {
                enabled: false,
                nodeUrl: '',
                privateKey: '',
                gasLimit: 250000,
                gasPriceMultiplier: 1.1
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
                    maxTransactionAmount: 0.1,
                    slippageTolerance: 3,
                    autoSellTimeoutMinutes: 30,
                    stopLossPercentage: 10,
                    takeProfitPercentage: 50
                },
                trendTrading: {
                    enabled: false,
                    tradingPairs: ["BTC/USDT", "ETH/USDT"],
                    timeframes: ["1h", "4h"],
                    indicators: {
                        rsi: {
                            enabled: true,
                            period: 14,
                            overbought: 70,
                            oversold: 30
                        },
                        macd: {
                            enabled: true,
                            fastPeriod: 12,
                            slowPeriod: 26,
                            signalPeriod: 9
                        }
                    }
                }
            },
            trading: {
                autoStart: false,
                maxConcurrentTrades: 3,
                defaultRiskPercentage: 2
            }
        };
    }
}

module.exports = { ConfigManager };