import { secureConfig } from './js/secure-config/manager.js';
import { TradingBot } from './trading/TradingBot.js';
import { logger } from './utils/logger.js';

async function main() {
    try {
        // Initialize secure configuration
        await secureConfig.initialize();
        
        // Create and initialize bot instance
        const bot = new TradingBot();
        await bot.initialize();
        
        // Start the bot
        await bot.start();
        
        // Handle shutdown
        process.on('SIGINT', async () => {
            logger.info('Shutting down bot...');
            await bot.stop();
            process.exit(0);
        });

        logger.info('Bot started successfully');
    } catch (error) {
        logger.error('Failed to start bot:', error);
        process.exit(1);
    }
}

main();