/**
 * Stop Bot Script
 * 
 * Sends a stop command to the running trading bot.
 * This is used by the batch file to gracefully shut down the bot.
 */

const axios = require('axios');

// The bot server URL
const SERVER_URL = 'http://localhost:3000';

/**
 * Send stop command to the bot
 */
async function stopBot() {
  try {
    console.log('Sending stop command to trading bot...');
    
    const response = await axios.post(`${SERVER_URL}/api/bot/stop`);
    
    if (response.data.success) {
      console.log('Bot stopped successfully.');
    } else {
      console.error('Failed to stop bot:', response.data.message);
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('Bot server is not running.');
    } else {
      console.error('Error stopping bot:', error.message);
    }
  }
}

// Run the function
stopBot();
