import express from 'express';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import crypto from 'crypto';
import { ethers } from 'ethers';
import { RSI } from 'technicalindicators';
import { logger } from './utils/logger.js';

// Load or initialize configuration
const configPath = path.join(process.cwd(), 'config.json');
let config = {};
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
} else {
  // Default configuration template with live trade parameters, RSI thresholds, and additional settings
  config = {
    binanceUS: { apiKey: "", secretKey: "", baseCurrency: "USDT" },
    cryptoCom: { apiKey: "", secretKey: "", baseCurrency: "USDT" },
    infura: { projectId: "", projectSecret: "" },
    phantom: { privateKey: "" },
    tradeParameters: {
      // Maximum percentage of your wallet funds to use per trade (e.g., "2" for 2%)
      maxPercentage: "2",
      // Stop loss threshold percentage to exit a trade (e.g., "1.5" for 1.5%)
      stopLoss: "1.5",
      // Target profit percentage at which the trade is closed (e.g., "3")
      takeProfit: "3",
      // Acceptable slippage tolerance during execution (e.g., "0.5" for 0.5%)
      slippageTolerance: "0.5",
      // Gas fees to be paid in ETH for Uniswap trades (e.g., "0.001")
      gasFees: "0.001",
      // Trade size in USDT for Binance.US and Crypto.com trades (e.g., "100")
      tradeSize: "100",
      // Percentage of your wallet's balance used when buying (e.g., "5" for 5%)
      walletBuyPercentage: "5",
      // Optional execution delay in seconds before placing the order (e.g., "1")
      executionDelay: "1",
      // RSI overbought threshold (e.g., 70)
      rsiOverboughtThreshold: "70",
      // RSI oversold threshold (e.g., 30)
      rsiOversoldThreshold: "30"
    },
    monitoring: {
      // Default popular pairs to scan for movements (traded on Binance.US)
      popularPairs: ["BTC/USDT", "ETH/USDT", "ADA/USDT", "DOGE/USDT"],
      // For Uniswap trades, using USDT/ETH; live price data obtained via CoinGecko and executed via Uniswap using Phantom wallet
      uniswapPairs: ["USDT/ETH"]
    }
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

const app = express();
app.use(express.json());

// Global trade history log for performance metrics
let tradeHistory = [];

/*
  API Endpoints
*/

// Fetch current configuration
app.get('/api/config', (req, res) => {
  res.json(config);
});

// Update configuration
app.post('/api/config', (req, res) => {
  config = { ...config, ...req.body };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  res.json({ success: true, config });
});

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok' });
});

// Fetch wallet balances for Binance.US (extend as needed)
app.get('/api/wallet', async (req, res) => {
  try {
    const binanceAccount = await fetchBinanceAccount();
    // Extend with additional exchange wallet calls as needed.
    res.json({
      binanceUS: binanceAccount ? binanceAccount.balances : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Return performance metrics based on tradeHistory
app.get('/api/performance', (req, res) => {
  const metrics = computePerformanceMetrics();
  res.json(metrics);
});

/*
  Helper Functions for Binance.US API Authentication and Requests
*/

// Generate HMAC signature for Binance.US API requests
const signQuery = (queryString, secretKey) => {
  return crypto.createHmac('sha256', secretKey).update(queryString).digest('hex');
};

// Fetch full Binance.US account details including balances
const fetchBinanceAccount = async () => {
  if (!config.binanceUS.apiKey || !config.binanceUS.secretKey) {
    logger.warn('Binance.US API keys are not configured.');
    return null;
  }
  try {
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = signQuery(queryString, config.binanceUS.secretKey);
    const url = `https://api.binance.us/api/v3/account?${queryString}&signature=${signature}`;
    const response = await axios.get(url, {
      headers: { 'X-MBX-APIKEY': config.binanceUS.apiKey }
    });
    return response.data;
  } catch (error) {
    logger.error(`Error fetching Binance.US account: ${error.message}`);
    return null;
  }
};

// Place an order on Binance.US (market order)
const placeBinanceOrder = async (symbol, side, quantity) => {
  if (!config.binanceUS.apiKey || !config.binanceUS.secretKey) {
    logger.warn('Binance.US API keys are not configured.');
    return null;
  }
  try {
    const timestamp = Date.now();
    const params = {
      symbol,
      side,
      type: 'MARKET',
      quantity,
      timestamp
    };
    const queryString = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    const signature = signQuery(queryString, config.binanceUS.secretKey);
    const url = `https://api.binance.us/api/v3/order?${queryString}&signature=${signature}`;
    const response = await axios.post(url, null, {
      headers: { 'X-MBX-APIKEY': config.binanceUS.apiKey }
    });
    logger.info(`Order response from Binance.US: ${JSON.stringify(response.data)}`);
    return response.data;
  } catch (error) {
    logger.error(`Error placing order on Binance.US: ${error.message}`);
    return null;
  }
};

/*
  Live Market Data Functions
*/

// Fetch live price for a symbol from Binance.US (symbol without slash, e.g., BTCUSDT)
const fetchBinancePrice = async (symbol) => {
  try {
    const url = `https://api.binance.us/api/v3/ticker/price?symbol=${symbol}`;
    const response = await axios.get(url);
    return parseFloat(response.data.price);
  } catch (error) {
    logger.error(`Error fetching price for ${symbol} from Binance.US: ${error.message}`);
    return null;
  }
};

// Fetch recent candlestick data (klines) from Binance.US for RSI calculation
const fetchBinanceKlines = async (symbol, interval = '1m', limit = 14) => {
  try {
    const url = `https://api.binance.us/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const response = await axios.get(url);
    const closingPrices = response.data.map(entry => parseFloat(entry[4]));
    return closingPrices;
  } catch (error) {
    logger.error(`Error fetching klines for ${symbol} from Binance.US: ${error.message}`);
    return [];
  }
};

// Fetch live price from CoinGecko for Uniswap trades (example: Ethereum price in USDT)
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

// Fetch market chart data from CoinGecko for RSI calculation (returns closing prices)
const fetchCoinGeckoMarketChart = async (coinId = 'ethereum', vsCurrency = 'usdt', minutes = 14) => {
  try {
    const days = minutes / (60 * 24);
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=${vsCurrency}&days=${days}&interval=minute`;
    const response = await axios.get(url);
    const closingPrices = response.data.prices.map(entry => entry[1]);
    return closingPrices;
  } catch (error) {
    logger.error(`Error fetching market chart for ${coinId} from CoinGecko: ${error.message}`);
    return [];
  }
};

// Compute RSI using closing prices (default period: 14)
const computeRSI = (closingPrices, period = 14) => {
  if (closingPrices.length < period) return null;
  const rsiValues = RSI.calculate({ values: closingPrices, period });
  return rsiValues[rsiValues.length - 1] || null;
};

/*
  Trade Execution Functions
*/

// Execute trade based on pair, side, and live price.
const executeTrade = async (pair, side, price) => {
  logger.info(`Preparing to execute ${side.toUpperCase()} trade for ${pair} at price ${price}`);
  // For Binance.US popularPairs trades, execute via Binance API
  if (config.monitoring.popularPairs.includes(pair)) {
    const symbol = pair.replace('/', '');
    if (side === 'buy') {
      // Calculate BUY quantity: tradeSize (in USDT) divided by current price
      const tradeSize = parseFloat(config.tradeParameters.tradeSize);
      const quantity = (tradeSize / price).toFixed(6);
      logger.info(`Calculated BUY quantity for ${pair}: ${quantity}`);
      const orderResult = await placeBinanceOrder(symbol, 'BUY', quantity);
      if (orderResult) {
        tradeHistory.push({
          pair,
          side: 'buy',
          price,
          quantity: parseFloat(quantity),
          timestamp: Date.now(),
          orderId: orderResult.orderId
        });
      }
    } else if (side === 'sell') {
      // Retrieve asset balance from Binance.US account to sell
      const asset = symbol.replace(config.binanceUS.baseCurrency, '');
      const account = await fetchBinanceAccount();
      if (account) {
        const assetBalanceObj = account.balances.find(b => b.asset === asset);
        if (!assetBalanceObj || parseFloat(assetBalanceObj.free) <= 0) {
          logger.warn(`Insufficient ${asset} balance for SELL order on ${pair}.`);
          return;
        }
        const quantity = parseFloat(assetBalanceObj.free).toFixed(6);
        logger.info(`Selling available ${asset} quantity for ${pair}: ${quantity}`);
        const orderResult = await placeBinanceOrder(symbol, 'SELL', quantity);
        if (orderResult) {
          tradeHistory.push({
            pair,
            side: 'sell',
            price,
            quantity: parseFloat(quantity),
            timestamp: Date.now(),
            orderId: orderResult.orderId
          });
        }
      }
    }
  }
  // For Uniswap trades (USDT/ETH), use Phantom wallet with ethers.js and Uniswap v2 router
  else if (config.monitoring.uniswapPairs.includes(pair)) {
    // Initialize ethers provider using Infura and Phantom wallet
    if (!config.infura.projectId || !config.phantom || !config.phantom.privateKey) {
      logger.error('Infura project ID or Phantom wallet private key not configured.');
      return;
    }
    const provider = new ethers.providers.InfuraProvider("mainnet", config.infura.projectId);
    const wallet = new ethers.Wallet(config.phantom.privateKey, provider);
    // Uniswap V2 router address and minimal ABI
    const uniswapRouterAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const uniswapABI = [
      "function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external returns (uint[] memory amounts)",
      "function swapExactETHForTokens(uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) external payable returns (uint[] memory amounts)",
      "function approve(address spender, uint256 amount) external returns (bool)"
    ];
    const router = new ethers.Contract(uniswapRouterAddress, uniswapABI, wallet);
    if (pair === "USDT/ETH") {
      if (side === 'buy') {
        // Swap USDT for ETH on Uniswap
        const usdtAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // USDT token address on Ethereum
        const WETH_address = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // WETH address
        const erc20ABI = [
          "function approve(address spender, uint256 amount) public returns (bool)",
          "function allowance(address owner, address spender) public view returns (uint256)",
          "function balanceOf(address owner) public view returns (uint256)"
        ];
        const usdtContract = new ethers.Contract(usdtAddress, erc20ABI, wallet);
        const tradeSizeUSDT = ethers.utils.parseUnits(config.tradeParameters.tradeSize, 6); // USDT has 6 decimals
        const allowance = await usdtContract.allowance(wallet.address, uniswapRouterAddress);
        if (allowance.lt(tradeSizeUSDT)) {
          const approveTx = await usdtContract.approve(uniswapRouterAddress, tradeSizeUSDT);
          await approveTx.wait();
          logger.info('Approved Uniswap router to spend USDT.');
        }
        const amountOutMin = 0; // In production, calculate based on slippage tolerance
        const path = [usdtAddress, WETH_address];
        const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes from now
        const tx = await router.swapExactTokensForETH(tradeSizeUSDT, amountOutMin, path, wallet.address, deadline);
        await tx.wait();
        logger.info(`Uniswap BUY trade executed: swapped ${config.tradeParameters.tradeSize} USDT for ETH.`);
        tradeHistory.push({
          pair,
          side: 'buy',
          price,
          quantity: config.tradeParameters.tradeSize,
          timestamp: Date.now(),
          transaction: tx.hash
        });
      } else if (side === 'sell') {
        // Swap ETH for USDT on Uniswap
        const WETH_address = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
        const usdtAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
        // Sell entire ETH balance available in wallet, or adjust based on trade size
        const ethBalance = await wallet.getBalance();
        if (ethBalance.lte(0)) {
          logger.warn('No ETH balance to sell.');
          return;
        }
        const amountOutMin = 0; // In production, calculate based on slippage tolerance
        const path = [WETH_address, usdtAddress];
        const deadline = Math.floor(Date.now() / 1000) + 600;
        const tx = await router.swapExactETHForTokens(amountOutMin, path, wallet.address, deadline, { value: ethBalance });
        await tx.wait();
        logger.info(`Uniswap SELL trade executed: swapped ETH for USDT.`);
        tradeHistory.push({
          pair,
          side: 'sell',
          price,
          quantity: ethers.utils.formatUnits(ethBalance, 18),
          timestamp: Date.now(),
          transaction: tx.hash
        });
      }
    }
  }
};

/*
  Performance Metrics Computation
*/

// Compute overall performance from tradeHistory (assumes paired buy/sell trades)
const computePerformanceMetrics = () => {
  let totalProfitLoss = 0;
  let tradeCount = 0;
  for (let i = 0; i < tradeHistory.length - 1; i += 2) {
    const buy = tradeHistory[i];
    const sell = tradeHistory[i + 1];
    if (buy.side === 'buy' && sell.side === 'sell') {
      const profitLoss = ((sell.price - buy.price) / buy.price) * 100;
      totalProfitLoss += profitLoss;
      tradeCount++;
    }
  }
  return {
    totalTrades: tradeCount,
    totalProfitLoss: totalProfitLoss.toFixed(2) + '%',
    averageProfitLoss: tradeCount > 0 ? (totalProfitLoss / tradeCount).toFixed(2) + '%' : '0%'
  };
};

/*
  Scanning and Trading Logic
*/

// Scan popular pairs (Binance.US) and Uniswap pairs (via CoinGecko) using live data; compute RSI and trigger trades.
const scanPairs = async () => {
  // Process popular pairs on Binance.US
  for (const pair of config.monitoring.popularPairs) {
    const symbol = pair.replace('/', '');
    const price = await fetchBinancePrice(symbol);
    if (price !== null) {
      logger.info(`Live price for ${pair} (Binance.US): ${price}`);
      const closingPrices = await fetchBinanceKlines(symbol);
      if (closingPrices.length >= 14) {
        const rsiValue = computeRSI(closingPrices, 14);
        logger.info(`Computed RSI for ${pair} (Binance.US): ${rsiValue}`);
        if (rsiValue !== null) {
          if (parseFloat(rsiValue) > parseFloat(config.tradeParameters.rsiOverboughtThreshold)) {
            logger.info(`${pair} is overbought (RSI ${rsiValue}). Triggering SELL signal.`);
            await executeTrade(pair, 'sell', price);
          } else if (parseFloat(rsiValue) < parseFloat(config.tradeParameters.rsiOversoldThreshold)) {
            logger.info(`${pair} is oversold (RSI ${rsiValue}). Triggering BUY signal.`);
            await executeTrade(pair, 'buy', price);
          }
        }
      } else {
        logger.warn(`Not enough historical data to compute RSI for ${pair}`);
      }
    }
  }
  
  // Process Uniswap pairs using CoinGecko data (example for USDT/ETH)
  for (const pair of config.monitoring.uniswapPairs) {
    if (pair === "USDT/ETH") {
      const price = await fetchCoinGeckoPrice('ethereum', 'usdt');
      if (price !== null) {
        logger.info(`Live price for ${pair} (CoinGecko): ${price}`);
        const closingPrices = await fetchCoinGeckoMarketChart('ethereum', 'usdt', 14);
        if (closingPrices.length >= 14) {
          const rsiValue = computeRSI(closingPrices, 14);
          logger.info(`Computed RSI for ${pair} (CoinGecko): ${rsiValue}`);
          if (rsiValue !== null) {
            if (parseFloat(rsiValue) > parseFloat(config.tradeParameters.rsiOverboughtThreshold)) {
              logger.info(`${pair} is overbought (RSI ${rsiValue}). Triggering SELL signal.`);
              await executeTrade(pair, 'sell', price);
            } else if (parseFloat(rsiValue) < parseFloat(config.tradeParameters.rsiOversoldThreshold)) {
              logger.info(`${pair} is oversold (RSI ${rsiValue}). Triggering BUY signal.`);
              await executeTrade(pair, 'buy', price);
            }
          }
        } else {
          logger.warn(`Not enough market chart data to compute RSI for ${pair}`);
        }
      }
    }
  }
};

// Start periodic live scanning for token pairs every 30 seconds
const startPairScanning = () => {
  logger.info('Starting live periodic scanning for token pairs...');
  setInterval(() => {
    scanPairs().catch(error => logger.error(`Error in scanPairs: ${error.message}`));
  }, 30000);
};

/*
  Trading Bot Initialization and Wallet Balance Updates
*/

// Initialize live trading bot logic and periodically update wallet balances
const initTradingBot = () => {
  logger.info('Trading bot initialized with the following configuration:', config);

  if (config.binanceUS.apiKey && config.binanceUS.secretKey) {
    logger.info('Initializing Binance.US connector with base currency:', config.binanceUS.baseCurrency);
    // Live connection initialization for Binance.US can be handled here.
  } else {
    logger.warn('Binance.US API keys not configured.');
  }

  if (config.cryptoCom.apiKey && config.cryptoCom.secretKey) {
    logger.info('Initializing Crypto.com connector with base currency:', config.cryptoCom.baseCurrency);
    // Live connection initialization for Crypto.com can be handled here.
  } else {
    logger.warn('Crypto.com API keys not configured.');
  }

  if (config.infura.projectId && config.infura.projectSecret) {
    logger.info('Initializing Infura connection');
    // Live connection initialization for Infura can be handled here.
  } else {
    logger.warn('Infura configuration not set.');
  }

  if (config.phantom && config.phantom.privateKey) {
    logger.info('Initializing Phantom wallet connector for live Uniswap trades (USDT/ETH)');
    // Live integration with Phantom wallet is handled in Uniswap branch of executeTrade.
  } else {
    logger.warn('Phantom wallet private key not configured.');
  }

  if (config.tradeParameters) {
    logger.info('Using live trade parameters:', config.tradeParameters);
    // Update live trading strategy logic here as necessary.
  } else {
    logger.warn('Trade parameters not configured.');
  }

  // Update wallet balances periodically (every 60 seconds)
  setInterval(async () => {
    const binanceAccount = await fetchBinanceAccount();
    logger.info(`Live Binance.US wallet balances: ${JSON.stringify(binanceAccount ? binanceAccount.balances : {})}`);
    // Extend with additional wallet balance updates as needed.
  }, 60000);

  startPairScanning();
  logger.info('Live trading bot started successfully.');
};

initTradingBot();

const port = process.env.BOT_PORT || 5000;
app.listen(port, () => {
  logger.info(`Backend trading bot server running on port ${port}`);
});