import express from 'express';
import fs from 'fs';
import path from 'path';
import { logger } from './utils/logger.js';

// Load or initialize configuration
const configPath = path.join(process.cwd(), 'config.json');
let config = {};
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
} else {
  // Default configuration template
  config = {
    binanceUS: { apiKey: "", secretKey: "" },
    cryptoCom: { apiKey: "", secretKey: "" },
    infura: { projectId: "", projectSecret: "" },
    metamask: { privateKey: "" }
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

const app = express();
app.use(express.json());

// API endpoint to get current configuration
app.get('/api/config', (req, res) => {
  res.json(config);
});

// API endpoint to update configuration
app.post('/api/config', (req, res) => {
  config = { ...config, ...req.body };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  res.json({ success: true, config });
});

// Example API endpoint to verify the backend is running
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok' });
});

// Initialize trading bot logic using configuration
const initTradingBot = () => {
  logger.info('Trading bot initialized with existing exchange connectors', { config });
  // Initialize Binance.US connector if configured
  if (config.binanceUS && config.binanceUS.apiKey && config.binanceUS.secretKey) {
    logger.info('Initializing Binance.US connector');
    // TODO: Initialize connection to Binance.US using config.binanceUS
  } else {
    logger.warn('Binance.US API keys not configured.');
  }
  
  // Initialize Crypto.com connector if configured
  if (config.cryptoCom && config.cryptoCom.apiKey && config.cryptoCom.secretKey) {
    logger.info('Initializing Crypto.com connector');
    // TODO: Initialize connection to Crypto.com using config.cryptoCom
  } else {
    logger.warn('Crypto.com API keys not configured.');
  }
  
  // Initialize Infura connection if configured
  if (config.infura && config.infura.projectId && config.infura.projectSecret) {
    logger.info('Initializing Infura connection');
    // TODO: Initialize Infura using config.infura
  } else {
    logger.warn('Infura configuration not set.');
  }
  
  // Initialize MetaMask wallet if configured
  if (config.metamask && config.metamask.privateKey) {
    logger.info('Initializing MetaMask wallet');
    // TODO: Initialize wallet connection using config.metamask
  } else {
    logger.warn('MetaMask private key not configured.');
  }
  
  logger.info('Trading bot started successfully.');
};

// Start the trading bot
initTradingBot();

// Start the backend server to keep the process alive and serve API endpoints
const port = process.env.BOT_PORT || 5000;
app.listen(port, () =>
  logger.info(`Backend trading bot server running on port ${port}`)
);