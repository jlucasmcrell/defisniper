import fs from 'fs/promises';
import crypto from 'crypto';
import path from 'path';

class SecureConfigManager {
    constructor() {
        this.config = new Map();
        this.encryptionKey = null;
        this.configPath = './secure-config/';
        this.initialized = false;
        this.validationRules = this.initValidationRules();
    }

    initValidationRules() {
        return {
            'binance-us': {
                required: ['apiKey', 'apiSecret'],
                format: {
                    apiKey: /^[A-Za-z0-9]{64}$/,
                    apiSecret: /^[A-Za-z0-9]{64}$/
                }
            },
            'crypto-com': {
                required: ['apiKey', 'apiSecret'],
                format: {
                    apiKey: /^[A-Za-z0-9-]{32}$/,
                    apiSecret: /^[A-Za-z0-9-]{32}$/
                }
            },
            'metamask': {
                required: ['enabled', 'networkId'],
                format: {
                    networkId: /^[0-9]+$/
                }
            },
            'infura': {
                required: ['projectId', 'projectSecret'],
                format: {
                    projectId: /^[0-9a-f]{32}$/,
                    projectSecret: /^[0-9a-f]{64}$/
                }
            }
        };
    }

    async initialize() {
        try {
            await this.ensureConfigDirectory();
            await this.initializeEncryption();
            await this.loadConfigurations();
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize secure config manager:', error);
            return false;
        }
    }

    async ensureConfigDirectory() {
        try {
            await fs.mkdir(this.configPath, { recursive: true });
            await fs.chmod(this.configPath, 0o700);
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }

    async initializeEncryption() {
        try {
            const keyPath = path.join(this.configPath, 'master.key');
            if (await fs.access(keyPath).then(() => true).catch(() => false)) {
                this.encryptionKey = await fs.readFile(keyPath);
            } else {
                this.encryptionKey = await this.generateEncryptionKey();
                await fs.writeFile(keyPath, this.encryptionKey);
                await fs.chmod(keyPath, 0o600);
            }
        } catch (error) {
            console.error('Error initializing encryption:', error);
            throw error;
        }
    }

    async generateEncryptionKey() {
        return crypto.randomBytes(32);
    }

    encrypt(data) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
        const encrypted = Buffer.concat([
            cipher.update(data, 'utf8'),
            cipher.final()
        ]);
        const authTag = cipher.getAuthTag();
        return Buffer.concat([iv, authTag, encrypted]).toString('base64');
    }

    decrypt(data) {
        const buffer = Buffer.from(data, 'base64');
        const iv = buffer.slice(0, 16);
        const authTag = buffer.slice(16, 32);
        const encrypted = buffer.slice(32);
        const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
        decipher.setAuthTag(authTag);
        return decipher.update(encrypted) + decipher.final('utf8');
    }

    async loadConfigurations() {
        const providers = ['binance-us', 'crypto-com', 'metamask', 'infura'];
        for (const provider of providers) {
            try {
                const config = await this.loadConfig(provider);
                if (config) {
                    this.config.set(provider, config);
                }
            } catch (error) {
                console.error(`Error loading ${provider} config:`, error);
            }
        }
    }

    async saveConfig(provider, config) {
        try {
            await this.validateConfig(provider, config);
            const encrypted = this.encrypt(JSON.stringify(config));
            const filePath = path.join(this.configPath, `${provider}.config`);
            await fs.writeFile(filePath, encrypted, 'utf8');
            await fs.chmod(filePath, 0o600);
            this.config.set(provider, config);
            return true;
        } catch (error) {
            console.error(`Error saving ${provider} config:`, error);
            throw error;
        }
    }

    async loadConfig(provider) {
        try {
            const filePath = path.join(this.configPath, `${provider}.config`);
            const encrypted = await fs.readFile(filePath, 'utf8');
            const decrypted = this.decrypt(encrypted);
            return JSON.parse(decrypted);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            console.error(`Error loading ${provider} config:`, error);
            throw error;
        }
    }

    async validateConfig(provider, config) {
        const rules = this.validationRules[provider];
        if (!rules) {
            throw new Error(`No validation rules found for provider: ${provider}`);
        }

        for (const field of rules.required) {
            if (!(field in config)) {
                throw new Error(`Missing required field: ${field} for ${provider}`);
            }
        }

        for (const [field, pattern] of Object.entries(rules.format)) {
            if (field in config && !pattern.test(config[field])) {
                throw new Error(`Invalid format for ${field} in ${provider}`);
            }
        }

        return true;
    }

    getAllConfigs() {
        const configs = {};
        for (const [provider, config] of this.config.entries()) {
            configs[provider] = config;
        }
        return configs;
    }
}

export const secureConfig = new SecureConfigManager();