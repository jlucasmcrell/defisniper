/**
 * CryptoSniperBot Starter
 *
 * This file initializes and starts the CryptoSniperBot.
 */

const { TradingEngine } = require('./src/trading/engine');
const { SecurityManager } = require('./src/security/securityManager');
const ConfigManager = require('./src/config/configManager'); // Updated import statement
const { Logger } = require('./src/utils/logger');

// Initialize logger
const logger = new Logger('BotStarter');

class BotStarter {
  constructor() {
    this.securityManager = new SecurityManager(); // Ensure SecurityManager is correctly imported
    this.configManager = new ConfigManager(this.securityManager); // Pass securityManager to ConfigManager
    this.tradingEngine = new TradingEngine(this.configManager, this.securityManager);

    this.logger = new Logger('BotStarter');
  }

  async start() {
    try {
      this.logger.info('Starting CryptoSniperBot...');

      // Initialize trading engine
      await this.tradingEngine.initialize();

      // Start trading engine
      await this.tradingEngine.start();

      this.logger.info('CryptoSniperBot started successfully');
    } catch (error) {
      this.logger.error('Failed to start CryptoSniperBot', error);
      throw error;
    }
  }
}

// Start the bot
(async () => {
  const botStarter = new BotStarter();
  await botStarter.start();
})();

module.exports = BotStarter;