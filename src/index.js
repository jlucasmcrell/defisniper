import { secureConfig } from './js/secure-config/manager';
import { TradingBot } from './trading/TradingBot';
import { logger } from './utils/logger';

async function main() {
    try {
        // Initialize secure configuration
        await secureConfig.initialize();
        
        // Create and initialize bot instance
        const bot = new TradingBot();
        await bot.initialize();
        
        // Start the bot
        await bot.start();
        
        logger.info('Bot started successfully');
    } catch (error) {
        logger.error('Failed to start bot:', error);
        process.exit(1);
    }
}

main();