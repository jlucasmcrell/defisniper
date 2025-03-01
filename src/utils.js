// Utility functions and helper methods
class UtilsManager {
    constructor() {
        this.formatters = new Map();
        this.initialized = false;
    }

    initialize() {
        try {
            this.registerDefaultFormatters();
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize utils manager:', error);
            return false;
        }
    }

    registerDefaultFormatters() {
        // Date formatters
        this.registerFormatter('date', (value, format = 'YYYY-MM-DD') => {
            return this.formatDate(value, format);
        });

        // Number formatters
        this.registerFormatter('number', (value, options = {}) => {
            return this.formatNumber(value, options);
        });

        // Currency formatters
        this.registerFormatter('currency', (value, currency = 'USD') => {
            return this.formatCurrency(value, currency);
        });

        // Percentage formatter
        this.registerFormatter('percentage', (value, decimals = 2) => {
            return this.formatPercentage(value, decimals);
        });
    }

    registerFormatter(name, formatter) {
        this.formatters.set(name, formatter);
    }

    format(value, type, options) {
        const formatter = this.formatters.get(type);
        if (!formatter) {
            throw new Error(`Formatter '${type}' not found`);
        }
        return formatter(value, options);
    }

    formatDate(date, format = 'YYYY-MM-DD') {
        const d = new Date(date);
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        const hours = String(d.getUTCHours()).padStart(2, '0');
        const minutes = String(d.getUTCMinutes()).padStart(2, '0');
        const seconds = String(d.getUTCSeconds()).padStart(2, '0');

        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }

    formatNumber(value, options = {}) {
        const {
            decimals = 2,
            thousandsSeparator = ',',
            decimalSeparator = '.'
        } = options;

        const parts = Number(value).toFixed(decimals).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
        return parts.join(decimalSeparator);
    }

    formatCurrency(value, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency
        }).format(value);
    }

    formatPercentage(value, decimals = 2) {
        return `${this.formatNumber(value * 100, { decimals })}%`;
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    generateId(prefix = '') {
        return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.deepClone(item));
        }

        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [key, this.deepClone(value)])
        );
    }

    deepMerge(target, ...sources) {
        if (!sources.length) return target;
        const source = sources.shift();

        if (this.isObject(target) && this.isObject(source)) {
            for (const key in source) {
                if (this.isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    this.deepMerge(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }

        return this.deepMerge(target, ...sources);
    }

    isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }

    parseQueryString(queryString) {
        const params = new URLSearchParams(queryString);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    }

    buildQueryString(params) {
        return new URLSearchParams(params).toString();
    }

    capitalize(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    truncate(string, length, suffix = '...') {
        if (string.length <= length) return string;
        return string.slice(0, length - suffix.length) + suffix;
    }

    isInitialized() {
        return this.initialized;
    }
}

// Create and export global utils instance
export const utils = new UtilsManager();