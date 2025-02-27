/**
 * API Routes
 * 
 * Defines the API endpoints for the bot's web interface
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { Logger } = require('../utils/logger');

// Create logger
const logger = new Logger('API');

/**
 * API routes factory function
 */
module.exports = function(securityManager, configManager) {
  const router = express.Router();
  
  // Authentication middleware
  const authenticate = (req, res, next) => {
    if (req.session.authenticated) {
      next();
    } else {
      res.status(401).json({ success: false, message: 'Authentication required' });
    }
  };
  
  /**
   * Get bot status
   */
  router.get('/status', (req, res) => {
    try {
      res.json({
        configured: configManager.isConfigured(),
        running: global.tradingEngine ? global.tradingEngine.isRunning() : false,
        version: require('../../package.json').version
      });
    } catch (error) {
      logger.error('Error in /status', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });
  
  /**
   * Start the bot
   */
  router.post('/bot/start', authenticate, async (req, res) => {
    try {
      if (!global.tradingEngine) {
        return res.status(400).json({ success: false, message: 'Trading engine not initialized' });
      }
      
      if (global.tradingEngine.isRunning()) {
        return res.json({ success: true, message: 'Bot is already running' });
      }
      
      const success = await global.tradingEngine.start();
      
      if (success) {
        logger.info('Bot started via API request');
        res.json({ success: true, message: 'Bot started successfully' });
      } else {
        res.status(500).json({ success: false, message: 'Failed to start bot' });
      }
    } catch (error) {
      logger.error('Error starting bot', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });
  
  /**
   * Stop the bot
   */
  router.post('/bot/stop', authenticate, async (req, res) => {
    try {
      if (!global.tradingEngine) {
        return res.status(400).json({ success: false, message: 'Trading engine not initialized' });
      }
      
      if (!global.tradingEngine.isRunning()) {
        return res.json({ success: true, message: 'Bot is already stopped' });
      }
      
      const success = await global.tradingEngine.stop();
      
      if (success) {
        logger.info('Bot stopped via API request');
        res.json({ success: true, message: 'Bot stopped successfully' });
      } else {
        res.status(500).json({ success: false, message: 'Failed to stop bot' });
      }
    } catch (error) {
      logger.error('Error stopping bot', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });
  
  /**
   * Get active trades
   */
  router.get('/trades/active', authenticate, (req, res) => {
    try {
      if (!global.tradingEngine) {
        return res.json({});
      }
      
      const activeTrades = global.tradingEngine.getActiveTrades();
      res.json(activeTrades);
    } catch (error) {
      logger.error('Error getting active trades', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });
  
  /**
   * Get trade history
   */
  router.get('/trades/history', authenticate, (req, res) => {
    try {
      if (!global.tradingEngine) {
        return res.json([]);
      }
      
      const tradeHistory = global.tradingEngine.getTradeHistory();
      res.json(tradeHistory);
    } catch (error) {
      logger.error('Error getting trade history', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });
  
  /**
   * Get wallet balances
   */
  router.get('/balances', authenticate, (req, res) => {
    try {
      if (!global.tradingEngine) {
        return res.json({});
      }
      
      const balances = global.tradingEngine.getBalances();
      res.json(balances);
    } catch (error) {
      logger.error('Error getting balances', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });
  
  /**
   * Get trading stats
   */
  router.get('/stats', authenticate, (req, res) => {
    try {
      if (!global.tradingEngine) {
        return res.json({
          totalTrades: 0,
          successfulTrades: 0,
          failedTrades: 0,
          profitLoss: 0,
          winRate: 0
        });
      }
      
      const stats = global.tradingEngine.getStats();
      res.json(stats);
    } catch (error) {
      logger.error('Error getting stats', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });
  
  /**
   * Get logs
   */
  router.get('/logs', authenticate, (req, res) => {
    try {
      const logPath = path.join(process.cwd(), 'logs', 'trading.log');
      
      if (!fs.existsSync(logPath)) {
        return res.json([]);
      }
      
      const logContent = fs.readFileSync(logPath, 'utf8');
      const logLines = logContent.split('\n').filter(line => line.trim() !== '');
      
      // Parse JSON logs
      const logs = logLines.map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return { level: 'info', message: line, timestamp: new Date().toISOString() };
        }
      });
      
      // Apply level filter if specified
      const level = req.query.level;
      if (level && level !== 'all') {
        return res.json(logs.filter(log => log.level === level));
      }
      
      // Apply limit if specified
      const limit = parseInt(req.query.limit) || 100;
      res.json(logs.slice(-limit));
    } catch (error) {
      logger.error('Error getting logs', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });
  
  /**
   * Get settings
   */
  router.get('/settings', authenticate, (req, res) => {
    try {
      const config = configManager.getConfig();
      
      // Remove sensitive data
      const sanitizedConfig = { ...config };
      
      if (sanitizedConfig.ethereum) {
        delete sanitizedConfig.ethereum.privateKey;
        delete sanitizedConfig.ethereum.alchemyKey;
      }
      
      if (sanitizedConfig.exchanges) {
        if (sanitizedConfig.exchanges.binanceUS) {
          delete sanitizedConfig.exchanges.binanceUS.apiKey;
          delete sanitizedConfig.exchanges.binanceUS.apiSecret;
        }
        
        if (sanitizedConfig.exchanges.cryptoCom) {
          delete sanitizedConfig.exchanges.cryptoCom.apiKey;
          delete sanitizedConfig.exchanges.cryptoCom.apiSecret;
        }
      }
      
      res.json(sanitizedConfig);
    } catch (error) {
      logger.error('Error getting settings', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });
  
  /**
   * Update settings
   */
  router.post('/settings', authenticate, (req, res) => {
    try {
      const settings = req.body;
      
      // Validate settings
      if (settings.trading) {
        // Ensure wallet percentage is valid
        if (settings.trading.walletBuyPercentage) {
          const percentage = parseFloat(settings.trading.walletBuyPercentage);
          if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
            return res.status(400).json({
              success: false,
              message: 'Wallet buy percentage must be between 1 and 100'
            });
          }
        }
        
        // Ensure stop loss and take profit are valid
        if (settings.trading.stopLoss) {
          const stopLoss = parseFloat(settings.trading.stopLoss);
          if (isNaN(stopLoss) || stopLoss <= 0) {
            return res.status(400).json({
              success: false,
              message: 'Stop loss must be greater than 0'
            });
          }
        }
        
        if (settings.trading.takeProfit) {
          const takeProfit = parseFloat(settings.trading.takeProfit);
          if (isNaN(takeProfit) || takeProfit <= 0) {
            return res.status(400).json({
              success: false,
              message: 'Take profit must be greater than 0'
            });
          }
        }
      }
      
      // Update config
      const success = configManager.updateConfig(settings);
      
      if (success) {
        logger.info('Settings updated via API');
        res.json({ success: true, message: 'Settings updated successfully' });
      } else {
        res.status(500).json({ success: false, message: 'Failed to update settings' });
      }
    } catch (error) {
      logger.error('Error updating settings', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });
  
  /**
   * Close a trade
   */
  router.post('/trades/:id/close', authenticate, async (req, res) => {
    try {
      if (!global.tradingEngine) {
        return res.status(400).json({ success: false, message: 'Trading engine not initialized' });
      }
      
      const tradeId = req.params.id;
      const activeTrades = global.tradingEngine.getActiveTrades();
      
      if (!activeTrades[tradeId]) {
        return res.status(404).json({ success: false, message: 'Trade not found' });
      }
      
      const success = await global.tradingEngine.closeTrade(tradeId, 'manual', 0);
      
      if (success) {
        logger.info(`Trade ${tradeId} closed manually via API`);
        res.json({ success: true, message: 'Trade closed successfully' });
      } else {
        res.status(500).json({ success: false, message: 'Failed to close trade' });
      }
    } catch (error) {
      logger.error(`Error closing trade ${req.params.id}`, error);
      res.status(500).json({ success: false, message: error.message });
    }
  });
  
  return router;
};
