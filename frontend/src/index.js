import express from 'express';
import { logger } from './logger.js';
import { loadConfig } from './configManager.js';
import settingsRouter from './routes/settings.js';
import { executeTrades } from './services/tradeLogic.js';
import { getBinancePrice, getCryptoComPrice } from './exchangeServices.js'; // Import exchange services

const app = express();
const config = loadConfig();
const port = config.backendPort || 5000;

app.use(express.json());
app.use('/settings', settingsRouter);

app.get('/', (req, res) => {
    res.send('DeFiSniper Trading Bot is running');
});

app.get('/status', (req, res) => {
    res.json({ status: 'Running', uptime: process.uptime() });
});

// New endpoint for live trading data
app.get('/live-data', async (req, res) => {
    try {
        // Fetch live prices from exchanges
        const binancePrice = await getBinancePrice('ETHUSDT'); // Replace 'ETHUSDT' with your trading pair
        const cryptoComPrice = await getCryptoComPrice('ETH_USDT'); // Replace 'ETH_USDT' with your trading pair

        const liveData = {
            binancePrice: binancePrice,
            cryptoComPrice: cryptoComPrice,
            portfolioBalance: 10 // Replace with actual portfolio balance fetching logic
        };
        res.json(liveData);
    } catch (error) {
        logger.error('Error fetching live data:', error);
        res.status(500).json({ error: 'Failed to fetch live data' });
    }
});

// Removed simulated original code loops
// Enhanced Trading Bot Initialization and Profitability Enhancements
function initTradingBot() {
    logger.info('Initializing Trading Bot with enhanced features');

    // Check API credentials for supported exchanges
    if (!config.binanceUS || !config.binanceUS.apiKey || !config.binanceUS.apiSecret) {
        logger.warn('Binance.US API keys not configured.');
    }
    if (!config.cryptoCom || !config.cryptoCom.apiKey || !config.cryptoCom.apiSecret) {
        logger.warn('Crypto.com API keys not configured.');
    }

    // Infura initialization using optional chaining for safety
    if (config.infura?.projectId && config.infura?.projectSecret) {
        logger.info('Infura configured, initializing connection...');
        // Place Infura connection logic here
    } else {
        logger.info('Infura credentials not provided, skipping Infura initialization.');
    }

    // Schedule trade execution every 60 seconds with enhanced profitability features
    setInterval(() => {
        logger.info('Scheduled trade execution triggered.');
        executeTrades();
    }, 60000);

    // Additional periodic market analysis every 30 seconds
    setInterval(() => {
        logger.info('Performing periodic market analysis...');
        // Insert any additional risk management or market analysis logic here
    }, 30000);
}

// Start the Express server and initialize the trading bot
app.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
    initTradingBot();
});

// Setup signal handling for graceful shutdown
process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});