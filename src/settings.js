// Application settings and configuration manager
class SettingsManager {
    constructor() {
        this.settings = new Map();
        this.defaults = new Map();
        this.validators = new Map();
        this.listeners = new Set();
        this.categories = new Set(['general', 'trading', 'display', 'notifications', 'security']);
        this.initialized = false;
    }

    async initialize() {
        try {
            // Register default settings
            this.registerDefaults();
            
            // Load saved settings
            await this.loadSettings();
            
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize settings manager:', error);
            return false;
        }
    }

    registerDefaults() {
        // General settings
        this.setDefault('general.theme', 'light', {
            type: 'string',
            enum: ['light', 'dark', 'auto']
        });

        this.setDefault('general.language', 'en', {
            type: 'string',
            enum: ['en', 'es', 'fr', 'de', 'ja']
        });

        // Trading settings
        this.setDefault('trading.defaultLeverage', 1, {
            type: 'number',
            min: 1,
            max: 100
        });

        this.setDefault('trading.riskPerTrade', 1, {
            type: 'number',
            min: 0.1,
            max: 10
        });

        this.setDefault('trading.stopLossPercent', 2, {
            type: 'number',
            min: 0.1,
            max: 20
        });

        // Display settings
        this.setDefault('display.chartType', 'candlestick', {
            type: 'string',
            enum: ['candlestick', 'line', 'bar']
        });

        this.setDefault('display.timeframe', '1h', {
            type: 'string',
            enum: ['1m', '5m', '15m', '30m', '1h', '4h', '1d']
        });

        // Notification settings
        this.setDefault('notifications.sound', true, {
            type: 'boolean'
        });

        this.setDefault('notifications.desktop', true, {
            type: 'boolean'
        });

        // Security settings
        this.setDefault('security.autoLockTimeout', 15, {
            type: 'number',
            min: 1,
            max: 60
        });
    }

    async loadSettings() {
        try {
            const savedSettings = localStorage.getItem('app.settings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                Object.entries(parsed).forEach(([key, value]) => {
                    this.set(key, value);
                });
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    saveSettings() {
        try {
            const settings = Object.fromEntries(this.settings);
            localStorage.setItem('app.settings', JSON.stringify(settings));
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    setDefault(key, value, validator = null) {
        this.defaults.set(key, value);
        if (validator) {
            this.validators.set(key, validator);
        }
    }

    set(key, value) {
        // Validate setting
        this.validate(key, value);

        // Update setting
        this.settings.set(key, value);
        
        // Save to storage
        this.saveSettings();
        
        // Notify listeners
        this.notifyListeners(key, value);
    }

    get(key, defaultValue = undefined) {
        if (this.settings.has(key)) {
            return this.settings.get(key);
        }
        return defaultValue !== undefined ? defaultValue : this.defaults.get(key);
    }

    validate(key, value) {
        const validator = this.validators.get(key);
        if (!validator) return true;

        if (validator.type && typeof value !== validator.type) {
            throw new Error(`Invalid type for ${key}. Expected ${validator.type}`);
        }

        if (validator.enum && !validator.enum.includes(value)) {
            throw new Error(`Invalid value for ${key}. Must be one of: ${validator.enum.join(', ')}`);
        }

        if (validator.min !== undefined && value < validator.min) {
            throw new Error(`Value for ${key} must be >= ${validator.min}`);
        }

        if (validator.max !== undefined && value > validator.max) {
            throw new Error(`Value for ${key} must be <= ${validator.max}`);
        }

        return true;
    }

    reset(key) {
        if (key) {
            if (this.defaults.has(key)) {
                this.set(key, this.defaults.get(key));
            }
        } else {
            this.defaults.forEach((value, key) => {
                this.set(key, value);
            });
        }
    }

    getCategory(category) {
        const settings = {};
        this.settings.forEach((value, key) => {
            if (key.startsWith(`${category}.`)) {
                settings[key] = value;
            }
        });
        return settings;
    }

    getCategories() {
        return Array.from(this.categories);
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
                console.error('Error in settings listener:', error);
            }
        });
    }

    export() {
        return {
            settings: Object.fromEntries(this.settings),
            defaults: Object.fromEntries(this.defaults)
        };
    }

    import(data) {
        try {
            Object.entries(data.settings || {}).forEach(([key, value]) => {
                this.set(key, value);
            });
            return true;
        } catch (error) {
            console.error('Error importing settings:', error);
            return false;
        }
    }

    isInitialized() {
        return this.initialized;
    }
}

// Create and export global settings instance
export const settings = new SettingsManager();