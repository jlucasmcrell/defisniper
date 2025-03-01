import { logger } from './logger.js';
import { getHistoricalData } from './exchangeServices.js';

// Function to calculate Relative Strength Index (RSI)
export async function calculateRSI(symbol, period = 14) {
    try {
        const historicalData = await getHistoricalData(symbol, 500);
        if (!historicalData || historicalData.length === 0) {
            logger.warn('No historical data available for RSI calculation.');
            return null;
        }

        const closes = historicalData.map(item => item.close);
        let avgGain = 0;
        let avgLoss = 0;

        for (let i = closes.length - period; i < closes.length; i++) {
            const change = closes[i] - closes[i - 1];
            if (change > 0) {
                avgGain += change;
            } else {
                avgLoss -= change;
            }
        }

        avgGain /= period;
        avgLoss /= period;

        if (avgLoss === 0) {
            return 100;
        }

        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));

        return rsi;
    } catch (error) {
        logger.error('Error calculating RSI:', error);
        return null;
    }
}

// Function to calculate Moving Average Convergence Divergence (MACD)
export async function calculateMACD(symbol) {
    try {
        const historicalData = await getHistoricalData(symbol, 500);
        if (!historicalData || historicalData.length < 26) {
            logger.warn('Not enough historical data available for MACD calculation.');
            return null;
        }

        const closes = historicalData.map(item => item.close);
        const ema12 = calculateEMA(closes, 12);
        const ema26 = calculateEMA(closes, 26);

        const macdLine = ema12[ema12.length - 1] - ema26[ema26.length - 1];
        const signalLine = calculateEMA(closes.slice(closes.length - 34), 9);
        const histogram = macdLine - signalLine[signalLine.length - 1];

        return {
            macd: macdLine,
            signal: signalLine[signalLine.length - 1],
            histogram: histogram
        };
    } catch (error) {
        logger.error('Error calculating MACD:', error);
        return null;
    }
}

// Function to calculate Exponential Moving Average (EMA)
function calculateEMA(data, period) {
    const k = 2 / (period + 1);
    let ema = data[0];
    const emaValues = [ema];

    for (let i = 1; i < data.length; i++) {
        ema = (data[i] * k) + (ema * (1 - k));
        emaValues.push(ema);
    }

    return emaValues;
}

// Function to get Fibonacci retracement levels
export async function getFibonacciLevels(symbol) {
    try {
        const historicalData = await getHistoricalData(symbol, 500);
        if (!historicalData || historicalData.length === 0) {
            logger.warn('No historical data available for Fibonacci levels calculation.');
            return null;
        }

        let highest = Number.MIN_VALUE;
        let lowest = Number.MAX_VALUE;

        for (const dataPoint of historicalData) {
            if (dataPoint.high > highest) {
                highest = dataPoint.high;
            }
            if (dataPoint.low < lowest) {
                lowest = dataPoint.low;
            }
        }

        const diff = highest - lowest;

        const levels = {
            0: highest,
            236: highest - (0.236 * diff),
            382: highest - (0.382 * diff),
            500: highest - (0.500 * diff),
            618: highest - (0.618 * diff),
            786: highest - (0.786 * diff),
            100: lowest
        };

        return levels;
    } catch (error) {
        logger.error('Error calculating Fibonacci levels:', error);
        return null;
    }
}