/**
 * CryptoSniperBot Server
 * Main entry point for the trading bot application
 */
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const logger = require('./utils/logger');
const tradingEngine = require('./trading/tradingEngine');
const configManager = require('./config/configManager');

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    tradingEnabled: configManager.get('general.tradingEnabled', false),
    initialized: tradingEngine.initialized
  });
});

app.get('/api/config', (req, res) => {
  // Return a safe version of the config (no API secrets)
  const config = configManager.getConfig();
  const safeConfig = { ...config };
  
  if (safeConfig.exchange) {
    safeConfig.exchange = { ...safeConfig.exchange };
    delete safeConfig.exchange.apiSecret;
    if (safeConfig.exchange.apiKey) {
      safeConfig.exchange.apiKey = '********';
    }
  }
  
  res.json(safeConfig);
});

app.post('/api/config', (req, res) => {
  try {
    const newConfig = req.body;
    
    // Update configuration
    Object.keys(newConfig).forEach(key => {
      configManager.set(key, newConfig[key]);
    });
    
    res.json({ success: true, message: 'Configuration updated successfully' });
  } catch (error) {
    logger.error(`[Server] Error updating config: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Socket.IO
io.on('connection', (socket) => {
  logger.info(`[Server] Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    logger.info(`[Server] Client disconnected: ${socket.id}`);
  });
});

// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Initialize trading engine
    logger.info('[TradingEngine] Initializing trading engine');
    await tradingEngine.initialize();
    
    // Start server
    server.listen(PORT, () => {
      logger.info(`[Server] CryptoSniperBot server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error(`[Server] Failed to initialize trading engine ${error.message}`);
  }
}

startServer();

// Handle shutdown
process.on('SIGINT', async () => {
  logger.info('[Server] Shutting down server');
  tradingEngine.stopTrading();
  server.close();
  process.exit(0);
});