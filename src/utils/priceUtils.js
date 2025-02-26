/**
 * Price Utilities for CryptoSniperBot
 * Handles price calculations, conversions, and formatting
 */
const { BigNumber } = require('ethers');

class PriceUtils {
    static formatPrice(price, decimals = 8) {
        return Number(price).toFixed(decimals);
    }

    static calculatePriceImpact(inputAmount, outputAmount, inputDecimals = 18, outputDecimals = 18) {
        try {
            const inputBN = BigNumber.from(inputAmount);
            const outputBN = BigNumber.from(outputAmount);
            
            const scaledInput = inputBN.mul(BigNumber.from(10).pow(outputDecimals));
            const scaledOutput = outputBN.mul(BigNumber.from(10).pow(inputDecimals));
            
            const difference = scaledInput.sub(scaledOutput).abs();
            const percentageBN = difference.mul(10000).div(scaledInput);
            
            return Number(percentageBN.toString()) / 100;
        } catch (error) {
            console.error('Error calculating price impact:', error);
            return 0;
        }
    }

    static calculateSlippage(expectedPrice, actualPrice) {
        try {
            return ((actualPrice - expectedPrice) / expectedPrice) * 100;
        } catch (error) {
            console.error('Error calculating slippage:', error);
            return 0;
        }
    }

    static convertToWei(amount, decimals = 18) {
        try {
            return BigNumber.from(amount).mul(BigNumber.from(10).pow(decimals));
        } catch (error) {
            console.error('Error converting to wei:', error);
            return BigNumber.from(0);
        }
    }

    static convertFromWei(amount, decimals = 18) {
        try {
            return BigNumber.from(amount).div(BigNumber.from(10).pow(decimals));
        } catch (error) {
            console.error('Error converting from wei:', error);
            return BigNumber.from(0);
        }
    }

    static formatUSD(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    static calculatePriceChange(oldPrice, newPrice) {
        try {
            return ((newPrice - oldPrice) / oldPrice) * 100;
        } catch (error) {
            console.error('Error calculating price change:', error);
            return 0;
        }
    }

    static estimateGasPrice(baseGasPrice, priority = 'medium') {
        const multipliers = {
            low: 1,
            medium: 1.2,
            high: 1.5
        };
        
        try {
            return BigNumber.from(baseGasPrice)
                .mul(Math.floor(multipliers[priority] * 100))
                .div(100);
        } catch (error) {
            console.error('Error estimating gas price:', error);
            return BigNumber.from(baseGasPrice);
        }
    }

    static calculateAveragePrice(prices) {
        try {
            if (!prices || prices.length === 0) return 0;
            const sum = prices.reduce((acc, price) => acc + price, 0);
            return sum / prices.length;
        } catch (error) {
            console.error('Error calculating average price:', error);
            return 0;
        }
    }

    static calculateVolatility(prices) {
        try {
            if (!prices || prices.length < 2) return 0;
            
            const returns = [];
            for (let i = 1; i < prices.length; i++) {
                returns.push((prices[i] - prices[i-1]) / prices[i-1]);
            }
            
            const mean = returns.reduce((acc, val) => acc + val, 0) / returns.length;
            const squaredDiffs = returns.map(r => Math.pow(r - mean, 2));
            const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / returns.length;
            
            return Math.sqrt(variance);
        } catch (error) {
            console.error('Error calculating volatility:', error);
            return 0;
        }
    }

    static calculateMovingAverage(prices, period) {
        try {
            if (!prices || prices.length < period) return [];
            
            const mas = [];
            for (let i = period - 1; i < prices.length; i++) {
                const slice = prices.slice(i - period + 1, i + 1);
                const ma = slice.reduce((acc, price) => acc + price, 0) / period;
                mas.push(ma);
            }
            
            return mas;
        } catch (error) {
            console.error('Error calculating moving average:', error);
            return [];
        }
    }

    static calculateRSI(prices, period = 14) {
        try {
            if (!prices || prices.length <= period) return 50;

            const changes = [];
            for (let i = 1; i < prices.length; i++) {
                changes.push(prices[i] - prices[i-1]);
            }

            const gains = changes.map(change => change > 0 ? change : 0);
            const losses = changes.map(change => change < 0 ? Math.abs(change) : 0);

            const avgGain = gains.slice(-period).reduce((acc, gain) => acc + gain, 0) / period;
            const avgLoss = losses.slice(-period).reduce((acc, loss) => acc + loss, 0) / period;

            if (avgLoss === 0) return 100;
            const rs = avgGain / avgLoss;
            return 100 - (100 / (1 + rs));
        } catch (error) {
            console.error('Error calculating RSI:', error);
            return 50;
        }
    }
}

module.exports = PriceUtils;