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
        this.config = this.loadConfig();
    }
    
    loadConfig() {
        try {
            const configPath = path.join(process.cwd(), 'secure-config', 'config.json');
            
            if (fs.existsSync(configPath)) {
                const configData = fs.readFileSync(configPath, 'utf8');
                const parsedConfig = JSON.parse(configData);
                
                // Decrypt sensitive information
                try {
                    return this.securityManager.decryptConfig(parsedConfig);
                } catch (decryptError) {
                    this.logger.error('Error decrypting config', decryptError);
                    return parsedConfig;
                }
            }
            
            return this.getDefaultConfig();
        } catch (error) {
            this.logger.error('Error loading config', error);
            return this.getDefaultConfig();
        }
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
    
    updateConfig(newConfig) {
        try {
            this.config = this.deepMerge(this.config || this.getDefaultConfig(), newConfig);
            return this.saveConfig();
        } catch (error) {
            this.logger.error('Error updating config', error);
            return false;
        }
    }
    
    saveConfig() {
        try {
            const configDir = path.join(process.cwd(), 'secure-config');
            
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }
            
            const configPath = path.join(configDir, 'config.json');
            
            // Mark as configured
            this.config.configured = true;
            
            // Encrypt sensitive data
            const configToSave = this.securityManager.encryptConfig({ ...this.config });
            
            fs.writeFileSync(configPath, JSON.stringify(configToSave, null, 2));
            return true;
        } catch (error) {
            this.logger.error('Error saving config', error);
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
}

module.exports = ConfigManager;