// Trading metrics and statistics management
class MetricsManager {
    constructor() {
        this.metrics = new Map();
        this.listeners = new Set();
        this.reportingInterval = null;
        this.reportingDelay = 5000; // 5 seconds
        this.historicalData = new Map();
        this.maxHistoryLength = 100;
        this.reporters = new Set();
        this.initialized = false;
    }

    async initialize() {
        try {
            await this.loadInitialMetrics();
            this.startReporting();
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize metrics:', error);
            return false;
        }
    }

    async loadInitialMetrics() {
        try {
            const response = await fetch('/api/stats');
            if (!response.ok) throw new Error('Failed to load metrics');
            const data = await response.json();
            
            if (data.success) {
                this.updateMetrics(data.stats);
            }
        } catch (error) {
            console.error('Error loading initial metrics:', error);
            throw error;
        }
    }

    startReporting() {
        if (this.reportingInterval) {
            clearInterval(this.reportingInterval);
        }

        this.reportingInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/stats');
                if (!response.ok) throw new Error('Failed to fetch metrics');
                const data = await response.json();
                
                if (data.success) {
                    this.updateMetrics(data.stats);
                }
            } catch (error) {
                console.error('Error fetching metrics:', error);
            }
        }, this.reportingDelay);
    }

    stopReporting() {
        if (this.reportingInterval) {
            clearInterval(this.reportingInterval);
            this.reportingInterval = null;
        }
    }

    updateMetrics(newMetrics) {
        Object.entries(newMetrics).forEach(([key, value]) => {
            this.setMetric(key, value);
        });
    }

    setMetric(key, value) {
        this.metrics.set(key, value);
        this.updateHistory(key, value);
        this.notifyListeners(key, value);
        this.notifyReporters(key, value);
    }

    getMetric(key, defaultValue = null) {
        return this.metrics.has(key) ? this.metrics.get(key) : defaultValue;
    }

    getAllMetrics() {
        const metrics = {};
        this.metrics.forEach((value, key) => {
            metrics[key] = value;
        });
        return metrics;
    }

    updateHistory(key, value) {
        if (!this.historicalData.has(key)) {
            this.historicalData.set(key, []);
        }

        const history = this.historicalData.get(key);
        history.push({
            timestamp: Date.now(),
            value
        });

        // Maintain max history length
        if (history.length > this.maxHistoryLength) {
            history.shift();
        }
    }

    getHistory(key) {
        return this.historicalData.get(key) || [];
    }

    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners(key, value) {
        this.listeners.forEach(listener => {
            try {
                listener(key, value);
            } catch (error) {
                console.error('Error in metrics listener:', error);
            }
        });
    }

    addReporter(reporter) {
        if (typeof reporter.report === 'function') {
            this.reporters.add(reporter);
            return true;
        }
        return false;
    }

    removeReporter(reporter) {
        return this.reporters.delete(reporter);
    }

    notifyReporters(key, value) {
        this.reporters.forEach(reporter => {
            try {
                reporter.report(key, value);
            } catch (error) {
                console.error('Error in metrics reporter:', error);
            }
        });
    }

    reset() {
        this.metrics.clear();
        this.historicalData.clear();
        this.notifyListeners('reset');
    }

    isInitialized() {
        return this.initialized;
    }

    setReportingInterval(interval) {
        this.reportingDelay = interval;
        if (this.reportingInterval) {
            this.stopReporting();
            this.startReporting();
        }
    }
}

// Create and export global metrics instance
export const metrics = new MetricsManager();