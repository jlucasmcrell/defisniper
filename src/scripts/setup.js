/**
 * CryptoSniperBot Setup Script
 * Handles initial configuration and encryption key generation
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');
const { Logger } = require('../utils/logger');
const { SecurityManager } = require('../security/securityManager');
const ConfigManager = require('../config/configManager');

class Setup {
    constructor() {
        this.logger = new Logger('Setup');
        this.secureConfigPath = path.join(__dirname, '../../secure-config');
        this.securityManager = new SecurityManager();
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    async run() {
        try {
            console.log('\nStarting configuration process...');

            // Create secure-config directory if it doesn't exist
            if (!fs.existsSync(this.secureConfigPath)) {
                fs.mkdirSync(this.secureConfigPath);
            }

            // Generate and save encryption key
            await this.setupEncryption();

            // Create and save security configuration
            await this.setupSecurityConfig();

            // Initialize security manager
            if (typeof this.securityManager.initialize === 'function') {
                await this.securityManager.initialize();
            }

            // Create config manager with initialized security manager
            const configManager = new ConfigManager(this.securityManager);

            // Get configuration from user
            const config = await this.getConfiguration();

            // Encrypt and save configuration
            configManager.saveConfig(config);

            console.log('\nConfiguration completed successfully!');
            console.log('You can now start the bot using start.bat\n');

        } catch (error) {
            this.logger.error('Setup failed:', error);
            console.error('\nConfiguration failed. Please check the error messages above.');
        } finally {
            this.rl.close();
        }
    }

    async setupEncryption() {
        const keyFile = path.join(this.secureConfigPath, 'encryption.key');
        if (!fs.existsSync(keyFile)) {
            const key = crypto.randomBytes(32).toString('hex');
            await fs.promises.writeFile(keyFile, key, 'utf8');
            this.logger.info('Generated new encryption key');
        }
    }

    async setupSecurityConfig() {
        const securityConfig = {
            initialized: true,
            setupDate: new Date().toISOString(),
            version: '1.0.0'
        };

        const securityFile = path.join(this.secureConfigPath, 'security.json');
        await fs.promises.writeFile(
            securityFile,
            JSON.stringify(securityConfig, null, 2),
            'utf8'
        );
    }

    question(query) {
        return new Promise((resolve) => {
            this.rl.question(query, resolve);
        });
    }

    async getConfiguration() {
        const config = {
            trading: {
                scanInterval: 30000,
                maxConcurrentTrades: 3,
                walletBuyPercentage: 10,
                stopLoss: 5,
                takeProfit: 10,
                autoStart: false
            },
            ethereum: {
                enabled: false,
                infuraId: '',
                walletAddress: '',
                privateKey: '',
                uniswapFactoryAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
                baseAssets: ['ETH', 'USDT', 'USDC'],
                minBalance: {
                    ETH: '0.1',
                    USDT: '100',
                    USDC: '100'
                },
                maxAllocation: {
                    ETH: '50',
                    USDT: '50',
                    USDC: '50'
                }
            },
            bnbChain: {
                enabled: false,
                walletAddress: '',
                privateKey: '',
                pancakeFactoryAddress: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
                baseAssets: ['BNB', 'BUSD', 'USDT'],
                minBalance: {
                    BNB: '0.5',
                    BUSD: '100',
                    USDT: '100'
                },
                maxAllocation: {
                    BNB: '50',
                    BUSD: '50',
                    USDT: '50'
                }
            },
            exchanges: {
                binanceUS: {
                    enabled: false,
                    apiKey: '',
                    apiSecret: '',
                    baseAssets: ['USDT', 'BUSD', 'USD'],
                    minBalance: {
                        USDT: '100',
                        BUSD: '100',
                        USD: '100'
                    },
                    maxAllocation: {
                        USDT: '33',
                        BUSD: '33',
                        USD: '34'
                    }
                },
                cryptoCom: {
                    enabled: false,
                    apiKey: '',
                    apiSecret: '',
                    baseAssets: ['USDT', 'CRO', 'USD'],
                    minBalance: {
                        USDT: '100',
                        CRO: '100',
                        USD: '100'
                    },
                    maxAllocation: {
                        USDT: '33',
                        CRO: '33',
                        USD: '34'
                    }
                }
            }
        };

        console.log('\nPlease configure your trading settings:');

        // Ethereum and BNB Chain Configuration
        const enableEthereumAndBNB = (await this.question('\nEnable Ethereum and BNB Chain trading? (y/n): ')).toLowerCase() === 'y';
        if (enableEthereumAndBNB) {
            config.ethereum.enabled = true;
            config.bnbChain.enabled = true;
            config.ethereum.infuraId = await this.question('Enter your Infura Project ID: ');
            const walletAddress = await this.question('Enter your wallet address (used for both ETH and BNB): ');
            const privateKey = await this.question('Enter your private key (used for both ETH and BNB): ');
            config.ethereum.walletAddress = walletAddress;
            config.ethereum.privateKey = privateKey;
            config.bnbChain.walletAddress = walletAddress;
            config.bnbChain.privateKey = privateKey;
        }

        // Exchange Configuration
        const enableBinanceUS = (await this.question('\nEnable Binance.US trading? (y/n): ')).toLowerCase() === 'y';
        if (enableBinanceUS) {
            config.exchanges.binanceUS.enabled = true;
            config.exchanges.binanceUS.apiKey = await this.question('Enter your Binance.US API Key: ');
            config.exchanges.binanceUS.apiSecret = await this.question('Enter your Binance.US API Secret: ');
        }

        const enableCryptoCom = (await this.question('\nEnable Crypto.com trading? (y/n): ')).toLowerCase() === 'y';
        if (enableCryptoCom) {
            config.exchanges.cryptoCom.enabled = true;
            config.exchanges.cryptoCom.apiKey = await this.question('Enter your Crypto.com API Key: ');
            config.exchanges.cryptoCom.apiSecret = await this.question('Enter your Crypto.com API Secret: ');
        }

        // Trading Parameters
        console.log('\nConfigure trading parameters:');
        config.trading.walletBuyPercentage = parseInt(
            await this.question('Enter wallet buy percentage (1-100): '), 10
        );
        config.trading.stopLoss = parseFloat(
            await this.question('Enter stop loss percentage: ')
        );
        config.trading.takeProfit = parseFloat(
            await this.question('Enter take profit percentage: ')
        );
        config.trading.maxConcurrentTrades = parseInt(
            await this.question('Enter maximum concurrent trades: '), 10
        );
        
        const autoStart = (await this.question('\nEnable auto-start? (y/n): ')).toLowerCase() === 'y';
        config.trading.autoStart = autoStart;

        return config;
    }
}

// Run setup if this script is executed directly
if (require.main === module) {
    const setup = new Setup();
    setup.run();
}

module.exports = Setup;