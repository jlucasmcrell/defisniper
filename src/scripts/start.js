/**
 * Start Bot Script
 * 
 * Starts the CryptoSniperBot trading engine.
 */

const { Logger } = require('../utils/logger');
const ConfigManager = require('../config/configManager');
const { SecurityManager } = require('../security/securityManager');
const CryptoSniperBot = require('../main').CryptoSniperBot;

// Initialize components
const logger = new Logger('StartScript');
const configManager = new ConfigManager();
const securityManager = new SecurityManager();

/**
 * Start the bot
 */
async function startBot() {
  console.log('\n========================================================');
  console.log('            Starting CryptoSniperBot');
  console.log('========================================================\n');

  try {
    // Check if bot is configured
    if (!configManager.isConfigured()) {
      console.error('Error: Bot is not configured.');
      console.error('Please run setup.bat first to configure the bot.\n');
      process.exit(1);
    }

    // Check for encryption key
    if (!securityManager.isEncryptionKeySet()) {
      console.error('Error: Encryption key not found.');
      console.error('Please run setup.bat to set up your encryption key.\n');
      process.exit(1);
    }

    // Initialize the bot
    const bot = new CryptoSniperBot();
    const success = await bot.initialize();

    if (!success) {
      console.error('Error: Failed to initialize the bot.');
      console.error('Please check the logs for more details.\n');
      process.exit(1);
    }

    // Start the bot
    const started = await bot.start();
    
    if (!started) {
      console.error('Error: Failed to start the bot.');
      console.error('Please check the logs for more details.\n');
      process.exit(1);
    }

    console.log('✅ Bot started successfully!\n');
    console.log('Press Ctrl+C to stop the bot.\n');

    // Handle shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down...');
      await bot.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Failed to start the bot. Please check the logs for more details.\n');
    process.exit(1);
  }
}

// Start the bot
startBot();