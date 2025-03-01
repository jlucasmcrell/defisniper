import Binance from 'node-binance-api';
import ccxt from 'ccxt';
import { logger } from './logger.js';
import { loadConfig } from './configManager.js';

const config = loadConfig();

// Binance Price Fetching
export async function getBinancePrice(symbol) {
    try {
        const binance = new Binance().options({
            APIKEY: config.binanceUS.apiKey,
            APISECRET: config.binanceUS.apiSecret,
            useServerTime: true,
        });

        const ticker = await binance.prices(symbol);
        return ticker[symbol];
    } catch (error) {
        logger.error(`Error fetching Binance price for ${symbol}:`, error);
        return null;
    }
}

// Crypto.com Price Fetching
export async function getCryptoComPrice(symbol) {
    try {
        const cryptoCom = new ccxt.cryptoCom({
            apiKey: config.cryptoCom.apiKey,
            secret: config.cryptoCom.apiSecret,
        });

        const ticker = await cryptoCom.fetchTicker(symbol);
        return ticker.last;
    } catch (error) {
        logger.error(`Error fetching Crypto.com price for ${symbol}:`, error);
        return null;
    }
}

// Function to get historical data from Binance
export async function getHistoricalData(symbol, limit = 500) {
    try {
        const binance = new Binance().options({
            APIKEY: config.binanceUS.apiKey,
            APISECRET: config.binanceUS.apiSecret,
            useServerTime: true,
        });

        const candles = await binance.candlesticks(symbol, '1h', limit); // 1-hour candles

        // Convert candles to a more usable format
        const historicalData = candles.map(candle => ({
            time: candle[0],
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5])
        }));

        return historicalData;
    } catch (error) {
        logger.error(`Error fetching historical data for ${symbol}:`, error);
        return null;
    }
}