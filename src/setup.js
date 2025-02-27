const fs = require('fs');
const path = require('path');
const readline = require('readline');
const SecurityManager = require('./security/securityManager');  // Fixed import path
const ConfigManager = require('./config/configManager');
const { Logger } = require('./utils/logger');

const logger = new Logger('Setup');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function question(query) {
    return new Promise((resolve) => {
        rl.question(query, resolve);
    });
}

async function setup() {
    try {
        console.log('\nDeFi Sniper Bot - Initial Setup\n');

        // Create security manager
        const securityManager = new SecurityManager();

        // Set up password
        const password = await question('Enter a password for the bot: ');
        
        // Add setPassword method to SecurityManager if it doesn't exist
        if (typeof securityManager.setPassword !== 'function') {
            securityManager.setPassword = async function(password) {
                // Store password hash
                const crypto = require('crypto');
                const salt = crypto.randomBytes(16).toString('hex');
                const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
                
                // Save to secure-config
                const passwordFile = path.join(process.cwd(), 'secure-config', 'password.dat');
                fs.writeFileSync(passwordFile, `${salt}:${hash}`);
                return true;
            };
        }
        
        await securityManager.setPassword(password);

        // Initialize configuration
        const configManager = new ConfigManager(securityManager);
        const config = {
            version: '1.0.0',
            configured: true,
            trading: {
                maxConcurrentTrades: 5,
                walletBuyPercentage: 10,
                takeProfit: 5,
                stopLoss: 2,
                autoTradeNewTokens: false
            },
            ethereum: {
                enabled: false,
                network: 'mainnet',
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
            strategies: {
                tokenSniper: {
                    enabled: false,
                    minLiquidity: 10000,
                    maxBuyTax: 10,
                    maxSellTax: 10
                },
                scalping: {
                    enabled: false,
                    minPriceChange: 0.5,
                    maxTradeTime: 300
                },
                trendTrading: {
                    enabled: false,
                    rsiLow: 30,
                    rsiHigh: 70
                }
            }
        };

        // Save initial configuration
        await configManager.saveConfig(config);

        console.log('\nInitial setup completed successfully!');
        console.log('You can now start the bot and configure additional settings through the web interface.');
        
        rl.close();
        return true;
    } catch (error) {
        logger.error('Setup failed', error);
        rl.close();
        return false;
    }
}

// Run setup if this file is run directly
if (require.main === module) {
    setup()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(() => {
            process.exit(1);
        });
}

module.exports = { setup };