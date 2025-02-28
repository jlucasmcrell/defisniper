const fs = require('fs').promises;
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
        this.config = null;
    }
    
    async initialize() {
        try {
            this.config = await this.loadConfig();
            return true;
        } catch (error) {
            this.logger.error('Failed to initialize config manager', error);
            throw error;
        }
    }
    
    async loadConfig() {
        try {
            try {
                const configData = await fs.readFile(this.configPath, 'utf8');
                const parsedConfig = JSON.parse(configData);
                const decryptedConfig = this.securityManager.decryptConfig(parsedConfig);
                return this.validateConfig(decryptedConfig);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    return this.getDefaultConfig();
                }
                throw error;
            }
        } catch (error) {
            this.logger.error('Error loading config', error);
            return this.getDefaultConfig();
        }
    }
    
    validateConfig(config) {
        const defaultConfig = this.getDefaultConfig();
        const mergedConfig = this.deepMerge(defaultConfig, config);

        // Ensure contract addresses are strings
        if (mergedConfig.ethereum) {
            if (mergedConfig.ethereum.uniswapFactoryAddress) {
                mergedConfig.ethereum.uniswapFactoryAddress = String(mergedConfig.ethereum.uniswapFactoryAddress);
            }
            if (mergedConfig.ethereum.uniswapRouterAddress) {
                mergedConfig.ethereum.uniswapRouterAddress = String(mergedConfig.ethereum.uniswapRouterAddress);
            }
        }

        if (mergedConfig.bnbChain) {
            if (mergedConfig.bnbChain.pancakeFactoryAddress) {
                mergedConfig.bnbChain.pancakeFactoryAddress = String(mergedConfig.bnbChain.pancakeFactoryAddress);
            }
            if (mergedConfig.bnbChain.pancakeRouterAddress) {
                mergedConfig.bnbChain.pancakeRouterAddress = String(mergedConfig.bnbChain.pancakeRouterAddress);
            }
        }

        return mergedConfig;
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
            trading: {
                maxConcurrentTrades: 5,
                walletBuyPercentage: 10,
                takeProfit: 5,
                stopLoss: 2,
                autoTradeNewTokens: false,
                closeTradesOnStop: true,
                autoStart: false
            }
        };
    }

    async updateConfig(newConfig) {
        try {
            if (!newConfig || typeof newConfig !== 'object') {
                throw new Error('Invalid configuration object');
            }

            // Ensure contract addresses remain as strings
            if (newConfig.ethereum) {
                if (newConfig.ethereum.uniswapFactoryAddress) {
                    newConfig.ethereum.uniswapFactoryAddress = String(newConfig.ethereum.uniswapFactoryAddress);
                }
                if (newConfig.ethereum.uniswapRouterAddress) {
                    newConfig.ethereum.uniswapRouterAddress = String(newConfig.ethereum.uniswapRouterAddress);
                }
            }

            if (newConfig.bnbChain) {
                if (newConfig.bnbChain.pancakeFactoryAddress) {
                    newConfig.bnbChain.pancakeFactoryAddress = String(newConfig.bnbChain.pancakeFactoryAddress);
                }
                if (newConfig.bnbChain.pancakeRouterAddress) {
                    newConfig.bnbChain.pancakeRouterAddress = String(newConfig.bnbChain.pancakeRouterAddress);
                }
            }

            // Deep merge with current config
            const currentConfig = this.config || this.getDefaultConfig();
            const mergedConfig = this.deepMerge(currentConfig, newConfig);
            
            // Validate merged config
            this.config = this.validateConfig(mergedConfig);
            
            // Update configured status
            this.config.configured = this.checkConfigured(this.config);
            
            // Encrypt sensitive data
            const encryptedConfig = this.securityManager.encryptConfig(this.config);
            
            // Save to disk
            await fs.writeFile(
                this.configPath,
                JSON.stringify(encryptedConfig, null, 2),
                'utf8'
            );
            
            this.logger.info('Configuration updated successfully');
            return true;
        } catch (error) {
            this.logger.error('Error updating config', error);
            return false;
        }
    }
    
    getConfig() {
        return this.config;
    }

    isConfigured() {
        return this.config?.configured === true;
    }

    checkConfigured(config) {
        return !!(
            (config.ethereum?.enabled && config.ethereum?.privateKey) ||
            (config.bnbChain?.enabled && config.bnbChain?.privateKey) ||
            (config.exchanges?.binanceUS?.enabled && 
             config.exchanges?.binanceUS?.apiKey && 
             config.exchanges?.binanceUS?.apiSecret) ||
            (config.exchanges?.cryptoCom?.enabled && 
             config.exchanges?.cryptoCom?.apiKey && 
             config.exchanges?.cryptoCom?.apiSecret)
        );
    }
    
    deepMerge(target, source) {
        const output = { ...target };
        
        if (!source || typeof source !== 'object') {
            return output;
        }
        
        Object.keys(source).forEach(key => {
            if (source[key] instanceof Object && key in target) {
                output[key] = this.deepMerge(target[key], source[key]);
            } else if (source[key] !== undefined) {
                output[key] = source[key];
            }
        });
        
        return output;
    }

    getTradeHistoryPath() {
        return path.join(process.cwd(), 'data', 'trade_history.json');
    }
}

module.exports = { ConfigManager };