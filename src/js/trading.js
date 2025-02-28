// Trading utilities and helpers
class TradingUtils {
    constructor() {
        this.decimalPlaces = new Map();
        this.priceFormatters = new Map();
        this.volumeFormatters = new Map();
        this.timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];
        this.initialized = false;
    }

    async initialize() {
        try {
            // Initialize formatters
            this.initializeFormatters();
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize trading utils:', error);
            return false;
        }
    }

    initializeFormatters() {
        // Common price decimal places
        this.decimalPlaces.set('BTC', 8);
        this.decimalPlaces.set('ETH', 8);
        this.decimalPlaces.set('USD', 2);
        this.decimalPlaces.set('USDT', 2);

        // Initialize formatters
        this.timeframes.forEach(timeframe => {
            this.priceFormatters.set(timeframe, new Intl.NumberFormat('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 8
            }));
            
            this.volumeFormatters.set(timeframe, new Intl.NumberFormat('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 8
            }));
        });
    }

    formatPrice(price, symbol = 'USD') {
        const decimals = this.decimalPlaces.get(symbol) || 2;
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(price);
    }

    formatVolume(volume, symbol = 'USD') {
        const decimals = this.decimalPlaces.get(symbol) || 8;
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: decimals
        }).format(volume);
    }

    calculateProfitLoss(entry, current, size, isLong = true) {
        if (isLong) {
            return (current - entry) * size;
        }
        return (entry - current) * size;
    }

    calculateROI(entry, current, isLong = true) {
        if (isLong) {
            return ((current - entry) / entry) * 100;
        }
        return ((entry - current) / entry) * 100;
    }

    calculatePositionSize(balance, risk, entry, stop) {
        const stopDistance = Math.abs(entry - stop);
        const riskAmount = balance * (risk / 100);
        return riskAmount / stopDistance;
    }

    calculateLeverage(positionSize, balance, entry) {
        return (positionSize * entry) / balance;
    }

    validateStopLoss(entry, stop, isLong = true) {
        if (isLong) {
            return stop < entry;
        }
        return stop > entry;
    }

    validateTakeProfit(entry, target, isLong = true) {
        if (isLong) {
            return target > entry;
        }
        return target < entry;
    }

    calculateRiskReward(entry, stop, target) {
        const risk = Math.abs(entry - stop);
        const reward = Math.abs(target - entry);
        return reward / risk;
    }

    getOptimalPosition(balance, risk, entry, stop, minSize, maxSize) {
        let size = this.calculatePositionSize(balance, risk, entry, stop);
        
        // Ensure size is within bounds
        size = Math.max(minSize, Math.min(maxSize, size));
        
        return {
            size,
            risk: (Math.abs(entry - stop) * size / balance) * 100,
            leverage: this.calculateLeverage(size, balance, entry)
        };
    }

    getTimeframes() {
        return [...this.timeframes];
    }

    parseTimeframe(timeframe) {
        const match = timeframe.match(/(\d+)([mhdw])/);
        if (!match) return null;

        const [_, value, unit] = match;
        const multiplier = {
            m: 60,
            h: 3600,
            d: 86400,
            w: 604800
        }[unit];

        return parseInt(value) * multiplier;
    }

    getTimeframeMs(timeframe) {
        const seconds = this.parseTimeframe(timeframe);
        return seconds ? seconds * 1000 : null;
    }

    roundToTickSize(price, tickSize) {
        return Math.round(price / tickSize) * tickSize;
    }

    adjustForPrecision(number, precision) {
        const factor = Math.pow(10, precision);
        return Math.round(number * factor) / factor;
    }

    isInitialized() {
        return this.initialized;
    }
}

// Create and export global trading utils instance
export const trading = new TradingUtils();