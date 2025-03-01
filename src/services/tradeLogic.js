import { logger } from '../utils/logger.js';
import { fetchGasFees } from './realtimeGasFees.js';
import { getNewsSentiment } from './newsSentiment.js';
import { getBinancePrice, getCryptoComPrice, getHistoricalData } from '../exchangeServices.js'; // Import exchange services
import { calculateRSI, calculateMACD, getFibonacciLevels } from '../technicalIndicators.js'; // Import technical indicators
import { loadConfig } from '../configManager.js';
import Binance from 'node-binance-api';
import ccxt from 'ccxt';

const config = loadConfig();

// Function to execute trades
async function executeTrade(exchange, symbol, side, amount, price) {
    try {
        if (exchange === 'Binance') {
            const binance = new Binance().options({
                APIKEY: config.binanceUS.apiKey,
                APISECRET: config.binanceUS.apiSecret,
                useServerTime: true,
                recvWindow: 60000 // Increase recvWindow to 60 seconds
            });

            // Ensure the amount is a string
            const amountStr = String(amount);

            // Execute the trade
            const order = await binance.marketOrder(symbol, side, amountStr);
            logger.info(`Binance ${side} order executed for ${amount} ${symbol} at ${price}`);
            logger.info('Order details:', order);

        } else if (exchange === 'Crypto.com') {
            const cryptoCom = new ccxt.cryptoCom({
                apiKey: config.cryptoCom.apiKey,
                secret: config.cryptoCom.apiSecret,
            });

            // Execute the trade
            const order = await cryptoCom.createMarketOrder(symbol, side, amount);
            logger.info(`Crypto.com ${side} order executed for ${amount} ${symbol} at ${price}`);
            logger.info('Order details:', order);

        } else {
            logger.error(`Unsupported exchange: ${exchange}`);
        }
    } catch (error) {
        logger.error(`Error executing trade on ${exchange}:`, error);
    }
}

export async function executeTrades() {
    try {
        const gasFees = await fetchGasFees();
        logger.info(`Gas Fees - Fast: ${gasFees.fast} Gwei, Average: ${gasFees.average} Gwei, SafeLow: ${gasFees.safeLow} Gwei`);

        const sentiment = await getNewsSentiment();
        logger.info(`Current news sentiment score: ${sentiment}`);

        // Dynamic trade size adjustment based on sentiment
        let tradeModifier = 1;
        if (sentiment < -5) {
            logger.info('Extremely negative sentiment detected, reducing trade size significantly.');
            tradeModifier = 0.1;
        } else if (sentiment < -2) {
            logger.info('Negative sentiment detected, reducing trade size.');
            tradeModifier = 0.5;
        } else if (sentiment > 5) {
            logger.info('Extremely positive sentiment detected, increasing trade size.');
            tradeModifier = 1.5;
        } else if (sentiment > 2) {
            logger.info('Positive sentiment detected, increasing trade size slightly.');
            tradeModifier = 1.2;
        }

        // Fetch current prices from exchanges
        const binancePrice = await getBinancePrice('ETHUSDT'); // Replace 'ETHUSDT' with your trading pair
        const cryptoComPrice = await getCryptoComPrice('ETH_USDT'); // Replace 'ETH_USDT' with your trading pair

        // Determine which exchange to use based on price and fees (example logic)
        let selectedExchange = 'Binance';
        let currentPrice = binancePrice;

        if (cryptoComPrice !== null && cryptoComPrice < binancePrice) {
            selectedExchange = 'Crypto.com';
            currentPrice = cryptoComPrice;
        }

        // Define trade parameters
        const symbol = 'ETHUSDT'; // Replace with your trading pair

        // Calculate RSI
        const rsi = await calculateRSI(symbol, 14);
        logger.info(`Current RSI: ${rsi}`);

        // Calculate MACD
        const macd = await calculateMACD(symbol);
        logger.info(`Current MACD: ${JSON.stringify(macd)}`);

        // Get Fibonacci retracement levels
        const fibLevels = await getFibonacciLevels(symbol);
        logger.info(`Fibonacci Retracement Levels: ${JSON.stringify(fibLevels)}`);

        // Basic trend detection using moving averages
        let trend = 'neutral';

        // Advanced trend detection using moving averages (replace 'ETH/USD' with your trading pair)
        const shortPeriod = 10;
        const longPeriod = 50;
        const historicalData = await getHistoricalData(symbol, longPeriod);

        if (historicalData && historicalData.length >= longPeriod) {
            const shortSMA = historicalData.slice(-shortPeriod).reduce((sum, dataPoint) => sum + dataPoint.close, 0) / shortPeriod;
            const longSMA = historicalData.reduce((sum, dataPoint) => sum + dataPoint.close, 0) / longPeriod;

            if (shortSMA > longSMA) {
                trend = 'uptrend';
                logger.info('Short-term SMA is above long-term SMA: Uptrend detected.');
            } else if (shortSMA < longSMA) {
                trend = 'downtrend';
                logger.info('Short-term SMA is below long-term SMA: Downtrend detected.');
            } else {
                logger.info('No clear trend detected based on moving averages.');
            }
        } else {
            logger.warn('Not enough historical data to calculate moving averages.');
        }

        // Fetch Average True Range (ATR)
        const atr = await calculateATR(symbol, 14); // 14-period ATR
        logger.info(`Current ATR: ${atr}`);

        // Volatility-based position sizing
        let volatilityModifier = 1;
        if (atr > 0.05) {
            logger.info('High volatility detected, reducing trade size.');
            volatilityModifier = 0.7; // Reduce trade size by 30%
        } else if (atr < 0.02) {
            logger.info('Low volatility detected, increasing trade size.');
            volatilityModifier = 1.3; // Increase trade size by 30%
        }

        // Combine all modifiers
        const finalTradeModifier = tradeModifier * volatilityModifier;

        // Trading signals based on technical indicators
        let side = 'neutral';
        if (rsi < 30 && trend === 'uptrend') {
            side = 'buy';
            logger.info('Oversold RSI and Uptrend: BUY signal');
        } else if (rsi > 70 && trend === 'downtrend') {
            side = 'sell';
            logger.info('Overbought RSI and Downtrend: SELL signal');
        } else {
            logger.info('No clear trading signal based on technical indicators.');
        }

        // Dynamic Stop-Loss and Take-Profit Orders (Example)
        let stopLossPrice = currentPrice * (1 - 0.02); // 2% below current price
        let takeProfitPrice = currentPrice * (1 + 0.05); // 5% above current price

        logger.info(`Stop-Loss Price: ${stopLossPrice}, Take-Profit Price: ${takeProfitPrice}`);

        logger.info(`Executing trade with final modifier: ${finalTradeModifier}, Gas Price: ${gasPriceToUse}, Trend: ${trend}`);

        const amount = 0.01 * finalTradeModifier; // Example trade size

        if (side !== 'neutral') {
            // Execute the trade
            await executeTrade(selectedExchange, symbol, side, amount, currentPrice);
        } else {
            logger.info('No trade executed due to neutral signal.');
        }

    } catch (error) {
        logger.error('Error executing trades:', error);
    }
}

// Function to calculate Average True Range (ATR)
async function calculateATR(symbol, period = 14) {
    try {
        const historicalData = await getHistoricalData(symbol, period);
        if (!historicalData || historicalData.length === 0) {
            logger.warn('No historical data available for ATR calculation.');
            return null;
        }

        let trSum = 0;
        for (let i = 1; i < historicalData.length; i++) {
            const high = historicalData[i].high;
            const low = historicalData[i].low;
            const closePrev = historicalData[i - 1].close;

            const tr = Math.max(
                (high - low),
                Math.abs(high - closePrev),
                Math.abs(low - closePrev)
            );
            trSum += tr;
        }

        const atr = trSum / period;
        return atr;

    } catch (error) {
        logger.error('Error calculating ATR:', error);
        return null;
    }
}