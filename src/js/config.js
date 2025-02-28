// Configuration management for the application
class ConfigManager {
    constructor() {
        this.config = new Map();
        this.schema = new Map();
        this.environments = new Set(['development', 'staging', 'production']);
        this.currentEnv = process.env.NODE_ENV || 'development';
        this.watchers = new Map();
        this.baseUrl = '/api';
        this.loaded = false;
        this.defaults = {
            trading: {
                autoStart: false,
                walletBuyPercentage: 50,
                stopLoss: 10,
                takeProfit: 20
            },
            ethereum: {
                enabled: false,
                network: 'mainnet',
                uniswapFactoryAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
                uniswapRouterAddress: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
            },
            bnbChain: {
                enabled: false,
                network: 'mainnet',
                pancakeFactoryAddress: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
                pancakeRouterAddress: '0x10ED43C718714eb63d5aA57B78B54704E256024E'
            },
            ui: {
                theme: 'light',
                notifications: true,
                refreshInterval: 5000
            }
        };
    }

    async initialize() {
        try {
            const response = await fetch(`${this.baseUrl}/settings`);
            if (!response.ok) throw new Error('Failed to load configuration');
            const config = await response.json();
            await this.load(config);
            return true;
        } catch (error) {
            console.error('Configuration initialization failed:', error);
            this.load(this.defaults); // Load defaults if server config fails
            return false;
        }
    }

    async load(config) {
        // Clear existing config
        this.config.clear();

        // Load new config with defaults for missing values
        this.mergeConfig(this.defaults, config);
        this.loaded = true;

        // Notify watchers
        this.notifyWatchers();
    }

    mergeConfig(defaults, userConfig) {
        for (const [key, defaultValue] of Object.entries(defaults)) {
            if (typeof defaultValue === 'object' && !Array.isArray(defaultValue)) {
                this.config.set(key, {});
                this.mergeConfig(defaultValue, userConfig[key] || {});
            } else {
                const value = userConfig[key] !== undefined ? userConfig[key] : defaultValue;
                this.config.set(key, value);
            }
        }
    }

    async save() {
        try {
            const config = this.toJSON();
            const response = await fetch(`${this.baseUrl}/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': this.getCsrfToken()
                },
                credentials: 'include',
                body: JSON.stringify({ config })
            });
            
            if (!response.ok) throw new Error('Failed to save configuration');
            return true;
        } catch (error) {
            console.error('Failed to save configuration:', error);
            return false;
        }
    }

    getCsrfToken() {
        return document.querySelector('meta[name="csrf-token"]')?.content || '';
    }

    get(key, defaultValue = null) {
        return this.config.has(key) ? this.config.get(key) : defaultValue;
    }

    set(key, value) {
        this.config.set(key, value);
        this.notifyWatchers(key);
        return this;
    }

    watch(key, callback) {
        if (!this.watchers.has(key)) {
            this.watchers.set(key, new Set());
        }
        this.watchers.get(key).add(callback);
        return () => this.watchers.get(key).delete(callback);
    }

    notifyWatchers(changedKey = null) {
        if (changedKey) {
            const keyWatchers = this.watchers.get(changedKey);
            if (keyWatchers) {
                const value = this.get(changedKey);
                keyWatchers.forEach(callback => callback(value, changedKey));
            }
        } else {
            // Notify all watchers on full config load
            this.watchers.forEach((watchers, key) => {
                const value = this.get(key);
                watchers.forEach(callback => callback(value, key));
            });
        }
    }

    validate(schema) {
        this.schema = new Map(Object.entries(schema));
        return this;
    }

    isValid(key, value) {
        const schema = this.schema.get(key);
        if (!schema) return true;

        if (typeof schema === 'function') {
            return schema(value);
        }

        if (schema instanceof RegExp) {
            return schema.test(value);
        }

        return true;
    }

    toJSON() {
        const json = {};
        for (const [key, value] of this.config.entries()) {
            json[key] = value;
        }
        return json;
    }

    getEnvironment() {
        return this.currentEnv;
    }

    setEnvironment(env) {
        if (this.environments.has(env)) {
            this.currentEnv = env;
            return true;
        }
        return false;
    }

    reset() {
        this.load(this.defaults);
    }

    isLoaded() {
        return this.loaded;
    }
}

// Create and export global config instance
export const config = new ConfigManager();