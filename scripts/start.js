const { TradingBot } = require('../src/trading/TradingBot');
const { logger } = require('../src/utils/logger');

async function startBot() {
    let bot;
    try {
        bot = new TradingBot();
        await bot.initialize();
        await bot.start();

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            logger.info('Shutting down...');
            await bot.stop();
            process.exit(0);
        });

    } catch (error) {
        logger.error('Bot startup failed:', error);
        process.exit(1);
    }
}

startBot();