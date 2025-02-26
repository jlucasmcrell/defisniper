/**
 * Setup Script for CryptoSniperBot
 */
const readline = require('readline');
const ConfigManager = require('./config/configManager');
const SecurityManager = require('./security/securityManager');
const { Logger } = require('./utils/logger');

const logger = new Logger('Setup');
const configManager = new ConfigManager();
const securityManager = new SecurityManager();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function setupBot() {
    console.log('\n========================================================');
    console.log('            CryptoSniperBot Setup Wizard');
    console.log('========================================================\n');

    try {
        const config = configManager.getConfig() || {};

        // Ethereum Setup
        config.ethereum = config.ethereum || {};
        config.ethereum.infuraId = await question('Enter your Infura Project ID: ');
        config.ethereum.enabled = true;

        // Trading Settings
        config.trading = config.trading || {};
        config.trading.walletBuyPercentage = parseInt(await question('Enter wallet buy percentage (1-100): '));
        config.trading.stopLoss = parseFloat(await question('Enter stop loss percentage: '));
        config.trading.takeProfit = parseFloat(await question('Enter take profit percentage: '));

        // Exchange API Keys
        config.exchanges = config.exchanges || {};
        
        // Binance.US
        const setupBinanceUS = await question('Do you want to set up Binance.US? (y/n): ');
        if (setupBinanceUS.toLowerCase() === 'y') {
            config.exchanges.binanceUS = config.exchanges.binanceUS || {};
            config.exchanges.binanceUS.apiKey = await question('Enter Binance.US API Key: ');
            config.exchanges.binanceUS.apiSecret = await question('Enter Binance.US API Secret: ');
            config.exchanges.binanceUS.enabled = true;
        }

        // Crypto.com
        const setupCryptoCom = await question('Do you want to set up Crypto.com? (y/n): ');
        if (setupCryptoCom.toLowerCase() === 'y') {
            config.exchanges.cryptoCom = config.exchanges.cryptoCom || {};
            config.exchanges.cryptoCom.apiKey = await question('Enter Crypto.com API Key: ');
            config.exchanges.cryptoCom.apiSecret = await question('Enter Crypto.com API Secret: ');
            config.exchanges.cryptoCom.enabled = true;
        }

        // Save Configuration
        configManager.updateConfig(config);

        // Generate Encryption Key
        if (!securityManager.isEncryptionKeySet()) {
            await securityManager.generateEncryptionKey();
        }

        console.log('\nSetup completed successfully!');
        console.log('You can now start the bot using: npm start\n');

    } catch (error) {
        logger.error('Setup failed', error);
        console.error('\nSetup failed:', error.message);
    } finally {
        rl.close();
    }
}

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

setupBot();