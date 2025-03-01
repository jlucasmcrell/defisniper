const { secureConfig } = require('../src/js/secure-config/manager');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function initializeBot() {
    try {
        await secureConfig.initialize();
        
        console.log('\nTrading Bot Initial Setup\n');
        
        // Get exchange configurations
        const binanceConfig = await promptBinanceConfig();
        if (binanceConfig) {
            await secureConfig.saveConfig('binance-us', binanceConfig);
        }
        
        const cryptoConfig = await promptCryptoConfig();
        if (cryptoConfig) {
            await secureConfig.saveConfig('crypto-com', cryptoConfig);
        }
        
        // Get Infura configuration
        const infuraConfig = await promptInfuraConfig();
        if (infuraConfig) {
            await secureConfig.saveConfig('infura', infuraConfig);
        }

        console.log('\nInitialization complete!');
        process.exit(0);
    } catch (error) {
        console.error('Initialization failed:', error);
        process.exit(1);
    }
}

initializeBot();