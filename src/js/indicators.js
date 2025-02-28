// Technical analysis indicators manager
class IndicatorManager {
    constructor() {
        this.indicators = new Map();
        this.activeIndicators = new Map();
        this.listeners = new Set();
        this.calculationWorker = null;
        this.initialized = false;

        // Default indicator configurations
        this.defaultConfigs = {
            MA: {
                period: 14,
                type: 'simple'
            },
            EMA: {
                period: 12
            },
            RSI: {
                period: 14,
                overbought: 70,
                oversold: 30
            },
            MACD: {
                fastPeriod: 12,
                slowPeriod: 26,
                signalPeriod: 9
            },
            BB: {
                period: 20,
                stdDev: 2
            }
        };
    }

    async initialize() {
        try {
            // Initialize Web Worker for calculations
            this.calculationWorker = new Worker('/js/workers/indicators.worker.js');
            this.setupWorkerHandlers();

            // Register built-in indicators
            this.registerBuiltInIndicators();

            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize indicator manager:', error);
            return false;
        }
    }

    registerBuiltInIndicators() {
        // Moving Averages
        this.registerIndicator('SMA', this.calculateSMA);
        this.registerIndicator('EMA', this.calculateEMA);
        this.registerIndicator('WMA', this.calculateWMA);

        // Momentum
        this.registerIndicator('RSI', this.calculateRSI);
        this.registerIndicator('MACD', this.calculateMACD);
        this.registerIndicator('Stochastic', this.calculateStochastic);

        // Volatility
        this.registerIndicator('BB', this.calculateBollingerBands);
        this.registerIndicator('ATR', this.calculateATR);

        // Volume
        this.registerIndicator('OBV', this.calculateOBV);
        this.registerIndicator('VWAP', this.calculateVWAP);
    }

    setupWorkerHandlers() {
        this.calculationWorker.onmessage = (event) => {
            const { id, result, error } = event.data;
            if (error) {
                console.error('Indicator calculation error:', error);
                return;
            }
            
            this.updateIndicatorResults(id, result);
        };
    }

    registerIndicator(name, calculator, config = {}) {
        this.indicators.set(name, {
            calculator,
            config: { ...this.defaultConfigs[name] || {}, ...config }
        });
    }

    async addIndicator(chartId, name, config = {}) {
        if (!this.indicators.has(name)) {
            throw new Error(`Indicator ${name} not registered`);
        }

        const indicator = this.indicators.get(name);
        const fullConfig = { ...indicator.config, ...config };

        const id = this.generateIndicatorId(chartId, name);
        this.activeIndicators.set(id, {
            chartId,
            name,
            config: fullConfig,
            results: null
        });

        return id;
    }

    removeIndicator(id) {
        if (this.activeIndicators.has(id)) {
            this.activeIndicators.delete(id);
            this.notifyListeners('remove', { id });
        }
    }

    updateData(chartId, data) {
        // Find all indicators for this chart
        const chartIndicators = Array.from(this.activeIndicators.entries())
            .filter(([_, indicator]) => indicator.chartId === chartId);

        // Calculate each indicator
        chartIndicators.forEach(([id, indicator]) => {
            this.calculationWorker.postMessage({
                id,
                name: indicator.name,
                data,
                config: indicator.config
            });
        });
    }

    updateIndicatorResults(id, results) {
        if (this.activeIndicators.has(id)) {
            const indicator = this.activeIndicators.get(id);
            indicator.results = results;
            this.notifyListeners('update', { id, results });
        }
    }

    getIndicatorResults(id) {
        return this.activeIndicators.get(id)?.results || null;
    }

    getAllIndicators() {
        return Array.from(this.indicators.keys());
    }

    getActiveIndicators(chartId) {
        return Array.from(this.activeIndicators.entries())
            .filter(([_, indicator]) => indicator.chartId === chartId)
            .map(([id, indicator]) => ({
                id,
                name: indicator.name,
                config: indicator.config
            }));
    }

    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners(event, data) {
        this.listeners.forEach(listener => {
            try {
                listener(event, data);
            } catch (error) {
                console.error('Error in indicator listener:', error);
            }
        });
    }

    // Indicator Calculations
    calculateSMA(data, period) {
        const results = [];
        let sum = 0;
        
        for (let i = 0; i < data.length; i++) {
            sum += data[i];
            if (i >= period) {
                sum -= data[i - period];
                results.push(sum / period);
            } else if (i === period - 1) {
                results.push(sum / period);
            } else {
                results.push(null);
            }
        }
        
        return results;
    }

    calculateEMA(data, period) {
        const multiplier = 2 / (period + 1);
        const results = [];
        let ema = data[0];
        
        results.push(ema);
        
        for (let i = 1; i < data.length; i++) {
            ema = (data[i] - ema) * multiplier + ema;
            results.push(ema);
        }
        
        return results;
    }

    calculateRSI(data, period) {
        const results = [];
        let gains = 0;
        let losses = 0;
        
        // First RSI calculation
        for (let i = 1; i < period; i++) {
            const difference = data[i] - data[i - 1];
            if (difference >= 0) {
                gains += difference;
            } else {
                losses -= difference;
            }
            results.push(null);
        }
        
        // Calculate first RSI
        const avgGain = gains / period;
        const avgLoss = losses / period;
        let rs = avgGain / avgLoss;
        let rsi = 100 - (100 / (1 + rs));
        results.push(rsi);
        
        // Rest of calculations
        for (let i = period; i < data.length; i++) {
            const difference = data[i] - data[i - 1];
            let currentGain = 0;
            let currentLoss = 0;
            
            if (difference >= 0) {
                currentGain = difference;
            } else {
                currentLoss = -difference;
            }
            
            const newAvgGain = (avgGain * (period - 1) + currentGain) / period;
            const newAvgLoss = (avgLoss * (period - 1) + currentLoss) / period;
            rs = newAvgGain / newAvgLoss;
            rsi = 100 - (100 / (1 + rs));
            
            results.push(rsi);
        }
        
        return results;
    }

    generateIndicatorId(chartId, name) {
        return `${chartId}_${name}_${Date.now()}`;
    }

    isInitialized() {
        return this.initialized;
    }
}

// Create and export global indicators instance
export const indicators = new IndicatorManager();