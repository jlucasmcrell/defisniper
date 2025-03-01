import express from 'express';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { RSI } from 'technicalindicators';
import { logger } from './utils/logger.js';

const configPath = path.join(process.cwd(), 'config.json');
let config = {};
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
} else {
  // Default configuration template with live trade parameters and RSI thresholds
  config = {
    binanceUS: { apiKey: "", secretKey: "", baseCurrency: "USDT" },
    cryptoCom: { apiKey: "", secretKey: "", baseCurrency: "USDT" },
    infura: { projectId: "", projectSecret: "" },
    phantom: { privateKey: "" },
    tradeParameters: {
      // Maximum percentage of available funds to use per trade (percentage, e.g. "2" for 2%)
      maxPercentage: "",
      // Stop loss threshold percentage for exiting a trade (percentage value)
      stopLoss: "",
      // Target profit percentage at which the trade is executed (percentage value)
      takeProfit: "",
      // Acceptable slippage tolerance during execution (percentage value)
      slippageTolerance: "",
      // Gas fees to be paid in ETH for Uniswap trades (e.g. "0.001" ETH)
      gasFees: "",
      // Trade size in USDT for Binance.US and Crypto.com trades (amount in USDT)
      tradeSize: "",
      // Percentage of your wallet's balance to use when buying (percentage value)
      walletBuyPercentage: "",
      // Optional execution delay in seconds before placing the order (in seconds)
      executionDelay: "",
      // RSI overbought threshold (e.g., 70)
      rsiOverboughtThreshold: "",
      // RSI oversold threshold (e.g., 30)
      rsiOversoldThreshold: ""
    },
    monitoring: {
      // Default popular pairs to scan for movements (these are traded on Binance.US)
      popularPairs: ["BTC/USDT", "ETH/USDT", "ADA/USDT", "DOGE/USDT"],
      // For Uniswap trades, using USDT/ETH (price data will be obtained via CoinGecko)
      uniswapPairs: ["USDT/ETH"]
    }
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

// Live API integration for popular pairs on Binance.US
const fetchBinancePrice = async (symbol) => {
  try {
    // Binance.US requires symbol without slash, e.g. BTCUSDT for BTC/USDT
    const url = `https://api.binance.us/api/v3/ticker/price?symbol=${symbol}`;
    const response = await axios.get(url);
    return parseFloat(response.data.price);
  } catch (error) {
    logger.error(`Error fetching price for ${symbol} from Binance.US: ${error.message}`);
    return null;
  }
};

// Fetch recent klines (candlestick data) to compute RSI from Binance.US
const fetchBinanceKlines = async (symbol, interval = '1m', limit = 14) => {
  try {
    const url = `https://api.binance.us/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const response = await axios.get(url);
    // Each kline: [ openTime, open, high, low, close, volume, ... ]
    const closingPrices = response.data.map(entry => parseFloat(entry[4]));
    return closingPrices;
  } catch (error) {
    logger.error(`Error fetching klines for ${symbol} from Binance.US: ${error.message}`);
    return [];
  }
};

// Live API integration for Uniswap via CoinGecko API
const fetchCoinGeckoPrice = async (coinId = 'ethereum', vsCurrency = 'usdt') => {
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${vsCurrency}`;
    const response = await axios.get(url);
    return response.data[coinId][vsCurrency];
  } catch (error) {
    logger.error(`Error fetching price for ${coinId} from CoinGecko: ${error.message}`);
    return null;
  }
};

const fetchCoinGeckoMarketChart = async (coinId = 'ethereum', vsCurrency = 'usdt', minutes = 14) => {
  try {
    // CoinGecko API accepts days as parameter; for minutes, we use a fraction
    const days = minutes / (60 * 24);
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=${vsCurrency}&days=${days}&interval=minute`;
    const response = await axios.get(url);
    // response.data.prices is an array of [timestamp, price]
    const closingPrices = response.data.prices.map(entry => entry[1]);
    return closingPrices;
  } catch (error) {
    logger.error(`Error fetching market chart for ${coinId} from CoinGecko: ${error.message}`);
    return [];
  }
};

// Function to compute RSI using provided closing prices and period (default 14)
const computeRSI = (closingPrices, period = 14) => {
  if (closingPrices.length < period) return null;
  const rsiValues = RSI.calculate({ values: closingPrices, period });
  return rsiValues[rsiValues.length - 1] || null;
};

// Function to scan popular pairs and uniswap pairs with live data
const scanPairs = async () => {
  // Process popular pairs traded on Binance.US
  for (const pair of config.monitoring.popularPairs) {
    const symbol = pair.replace('/', '');
    const price = await fetchBinancePrice(symbol);
    if (price !== null) {
      logger.info(`Live price for ${pair} (Binance.US): ${price}`);
    
      // Fetch data for RSI calculation
      const closingPrices = await fetchBinanceKlines(symbol);
      if (closingPrices.length >= 14) {
        const rsiValue = computeRSI(closingPrices, 14);
        logger.info(`Computed RSI for ${pair} (Binance.US): ${rsiValue}`);
        if (config.tradeParameters.rsiOverboughtThreshold && rsiValue > parseFloat(config.tradeParameters.rsiOverboughtThreshold)) {
          logger.info(`${pair} is overbought (RSI ${rsiValue})`);
          // TODO: Trigger sell logic if applicable
        } else if (config.tradeParameters.rsiOversoldThreshold && rsiValue < parseFloat(config.tradeParameters.rsiOversoldThreshold)) {
          logger.info(`${pair} is oversold (RSI ${rsiValue})`);
          // TODO: Trigger buy logic if applicable
        }
      } else {
        logger.warn(`Not enough historical data to compute RSI for ${pair}`);
      }
    }
  }
  
  // Process Uniswap pairs using CoinGecko (example for USDT/ETH)
  for (const pair of config.monitoring.uniswapPairs) {
    if (pair === "USDT/ETH") {
      // For USDT/ETH, we assume ETH price in USDT from CoinGecko
      const price = await fetchCoinGeckoPrice('ethereum', 'usdt');
      if (price !== null) {
        logger.info(`Live price for ${pair} (Uniswap via CoinGecko): ${price}`);
        const closingPrices = await fetchCoinGeckoMarketChart('ethereum', 'usdt', 14);
        if (closingPrices.length >= 14) {
          const rsiValue = computeRSI(closingPrices, 14);
          logger.info(`Computed RSI for ${pair} (CoinGecko): ${rsiValue}`);
          if (config.tradeParameters.rsiOverboughtThreshold && rsiValue > parseFloat(config.tradeParameters.rsiOverboughtThreshold)) {
            logger.info(`${pair} is overbought (RSI ${rsiValue})`);
            // TODO: Trigger sell logic if applicable
          } else if (config.tradeParameters.rsiOversoldThreshold && rsiValue < parseFloat(config.tradeParameters.rsiOversoldThreshold)) {
            logger.info(`${pair} is oversold (RSI ${rsiValue})`);
            // TODO: Trigger buy logic if applicable
          }
        } else {
          logger.warn(`Not enough market chart data to compute RSI for ${pair}`);
        }
      }
    }
  }
};

// Start periodic scanning using live data
const startPairScanning = () => {
  logger.info('Starting live periodic scanning for token pairs...');
  setInterval(() => {
    scanPairs().catch(error => logger.error(`Error in scanPairs: ${error.message}`));
  }, 30000); // every 30 seconds
};

// Initialize trading bot logic using live data
const initTradingBot = () => {
  logger.info('Trading bot initialized with the following configuration:', config);
  
  if (config.binanceUS && config.binanceUS.apiKey && config.binanceUS.secretKey) {
    logger.info('Initializing Binance.US connector with base currency:', config.binanceUS.baseCurrency);
    // TODO: Initialize connection to Binance.US using config.binanceUS (live trading API)
  } else {
    logger.warn('Binance.US API keys not configured.');
  }
  
  if (config.cryptoCom && config.cryptoCom.apiKey && config.cryptoCom.secretKey) {
    logger.info('Initializing Crypto.com connector with base currency:', config.cryptoCom.baseCurrency);
    // TODO: Initialize connection to Crypto.com using config.cryptoCom (live trading API)
  } else {
    logger.warn('Crypto.com API keys not configured.');
  }
  
  if (config.infura && config.infura.projectId && config.infura.projectSecret) {
    logger.info('Initializing Infura connection');
    // TODO: Initialize Infura using config.infura
  } else {
    logger.warn('Infura configuration not set.');
  }
  
  if (config.phantom && config.phantom.privateKey) {
    logger.info('Initializing Phantom wallet connector for live Uniswap trades (USDT/ETH)');
    // TODO: Initialize Phantom wallet connection using config.phantom (live trading)
  } else {
    logger.warn('Phantom wallet private key not configured.');
  }
  
  if (config.tradeParameters) {
    logger.info('Using live trade parameters:', config.tradeParameters);
    // TODO: Update live trading strategy logic with trade parameters
  } else {
    logger.warn('Trade parameters not configured.');
  }

  startPairScanning();
  logger.info('Live trading bot started successfully.');
};

initTradingBot();

const port = process.env.BOT_PORT || 5000;
app.listen(port, () => {
  logger.info(`Backend trading bot server running on port ${port}`);
});