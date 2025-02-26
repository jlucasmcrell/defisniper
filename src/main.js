// ... (rest of the file remains the same) ...

// If running directly (not through Electron)
if (require.main === module) {
  const bot = new CryptoSniperBot();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    
    if (bot.tradingEngine && bot.tradingEngine.isRunning()) {
      await bot.stop();
    }
    
    process.exit(0);
  });
  
  // Initialize
  bot.initialize()
    .then(success => {
      if (!success) {
        logger.error('Failed to initialize bot');
        process.exit(1);
      }
    })
    .catch(error => {
      logger.error('Unexpected error', error);
      process.exit(1);
    });
}

// Export the CryptoSniperBot class
module.exports = {
  CryptoSniperBot
};