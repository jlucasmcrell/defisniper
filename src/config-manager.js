// Configuration management and validation
class ConfigManager {
    constructor() {
        this.config = null;
        this.defaultConfig = {
            trading: {
                walletBuyPercentage: 5,
                stopLoss: 2.5,
                takeProfit: 5,
                maxConcurrentTrades: 3,
                maxTradesPerHour: 10,
                autoStart: false
            },
            ethereum: {
                enabled: false,
                network: 'mainnet',
                infuraId: '',
                alchemyKey: '',
                privateKey: ''
            },
            bnbChain: {
                enabled: false,
                privateKey: ''
            },
            exchanges: {
                binanceUS: {
                    enabled: false,
                    apiKey: '',
                    apiSecret: ''
                }
            }
        };

        this.validationRules = {
            trading: {
                walletBuyPercentage: {
                    type: 'number',
                    min: 1,
                    max: 100,
                    required: true
                },
                stopLoss: {
                    type: 'number',
                    min: 0.1,
                    max: 100,
                    required: true
                },
                takeProfit: {
                    type: 'number',
                    min: 0.1,
                    max: 1000,
                    required: true
                },
                maxConcurrentTrades: {
                    type: 'number',
                    min: 1,
                    max: 10,
                    required: true
                },
                maxTradesPerHour: {
                    type: 'number',
                    min: 1,
                    max: 100,
                    required: true
                },
                autoStart: {
                    type: 'boolean',
                    required: true
                }
            },
            ethereum: {
                enabled: {
                    type: 'boolean',
                    required: true
                },
                network: {
                    type: 'string',
                    enum: ['mainnet', 'testnet'],
                    required: true
                },
                infuraId: {
                    type: 'string',
                    required: false
                },
                alchemyKey: {
                    type: 'string',
                    required: false
                },
                privateKey: {
                    type: 'string',
                    pattern: /^(0x)?[0-9a-fA-F]{64}$/,
                    required: false
                }
            },
            bnbChain: {
                enabled: {
                    type: 'boolean',
                    required: true
                },
                privateKey: {
                    type: 'string',
                    pattern: /^(0x)?[0-9a-fA-F]{64}$/,
                    required: false
                }
            },
            exchanges: {
                binanceUS: {
                    enabled: {
                        type: 'boolean',
                        required: true
                    },
                    apiKey: {
                        type: 'string',
                        minLength: 16,
                        required: false
                    },
                    apiSecret: {
                        type: 'string',
                        minLength: 32,
                        required: false
                    }
                }
            }
        };
    }

    async load() {
        try {
            const response = await fetch('/api/config', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to load configuration');
            }

            const data = await response.json();
            
            if (data.success) {
                this.config = this.mergeWithDefaults(data.config);
            } else {
                throw new Error(data.message || 'Invalid configuration data');
            }
        } catch (error) {
            console.error('Configuration load error:', error);
            this.config = this.defaultConfig;
            throw error;
        }
    }

    async save() {
        try {
            const validation = this.validate();
            if (!validation.isValid) {
                throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
            }

            const response = await fetch('/api/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ config: this.config }),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to save configuration');
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to save configuration');
            }
        } catch (error) {
            console.error('Configuration save error:', error);
            throw error;
        }
    }

    validate() {
        const errors = [];
        
        const validateObject = (obj, rules, path = '') => {
            for (const [key, rule] of Object.entries(rules)) {
                const value = obj[key];
                const currentPath = path ? `${path}.${key}` : key;

                if (rule.required && (value === undefined || value === null || value === '')) {
                    errors.push(`${currentPath} is required`);
                    continue;
                }

                if (value !== undefined && value !== null) {
                    if (rule.type === 'number') {
                        if (typeof value !== 'number') {
                            errors.push(`${currentPath} must be a number`);
                        } else {
                            if (rule.min !== undefined && value < rule.min) {
                                errors.push(`${currentPath} must be at least ${rule.min}`);
                            }
                            if (rule.max !== undefined && value > rule.max) {
                                errors.push(`${currentPath} must be at most ${rule.max}`);
                            }
                        }
                    } else if (rule.type === 'string') {
                        if (typeof value !== 'string') {
                            errors.push(`${currentPath} must be a string`);
                        } else {
                            if (rule.minLength && value.length < rule.minLength) {
                                errors.push(`${currentPath} must be at least ${rule.minLength} characters`);
                            }
                            if (rule.pattern && !rule.pattern.test(value)) {
                                errors.push(`${currentPath} has invalid format`);
                            }
                            if (rule.enum && !rule.enum.includes(value)) {
                                errors.push(`${currentPath} must be one of: ${rule.enum.join(', ')}`);
                            }
                        }
                    } else if (rule.type === 'boolean') {
                        if (typeof value !== 'boolean') {
                            errors.push(`${currentPath} must be a boolean`);
                        }
                    } else if (typeof rule === 'object') {
                        validateObject(value, rule, currentPath);
                    }
                }
            }
        };

        validateObject(this.config, this.validationRules);

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    mergeWithDefaults(config) {
        const merged = JSON.parse(JSON.stringify(this.defaultConfig));
        
        const mergeObjects = (target, source) => {
            for (const key in source) {
                if (source[key] !== null && typeof source[key] === 'object') {
                    target[key] = target[key] || {};
                    mergeObjects(target[key], source[key]);
                } else if (source[key] !== undefined) {
                    target[key] = source[key];
                }
            }
        };

        mergeObjects(merged, config);
        return merged;
    }

    get() {
        return this.config || this.defaultConfig;
    }

    set(config) {
        this.config = this.mergeWithDefaults(config);
    }

    reset() {
        this.config = JSON.parse(JSON.stringify(this.defaultConfig));
    }
}

// Create global config instance
export const config = new ConfigManager();