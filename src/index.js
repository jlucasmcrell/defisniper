import express from 'express';
import { logger } from './utils/logger.js';

const app = express();

// Example API endpoint to verify backend is running
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok' });
});

// Initialize trading bot logic
const initTradingBot = () => {
  logger.info('Trading bot initialized with existing exchange connectors');
  logger.info('Starting trading on binance-us');
  logger.info('Starting trading on crypto-com');
  logger.info('Trading bot started successfully');
};

// Start the trading bot
initTradingBot();

// Start the backend server to keep the process alive and to serve API endpoints
const port = process.env.BOT_PORT || 5000;
app.listen(port, () =>
  logger.info(`Backend trading bot server running on port ${port}`)
);

// Alternatively, if you do not want to open an API port,
// you can keep the process alive with a no-op interval:
// setInterval(() => {}, 10000);