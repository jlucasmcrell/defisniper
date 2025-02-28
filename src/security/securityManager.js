/**
 * Security Manager
 * Handles encryption, decryption, and security-related operations
 */
const crypto = require('crypto');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { Logger } = require('../utils/logger');

class SecurityManager {
    constructor() {
        this.encryptionKey = null;
        this.sessionSecret = null;
        this.logger = new Logger('SecurityManager');
        this.configPath = path.join(process.cwd(), 'secure-config');
        this.algorithm = 'aes-256-gcm';
    }

    async initialize() {
        try {
            this.logger.info('Initializing security manager');
            
            // Ensure secure-config directory exists
            try {
                await fs.mkdir(this.configPath, { recursive: true });
            } catch (error) {
                if (error.code !== 'EEXIST') {
                    this.logger.error('Failed to create secure-config directory', error);
                }
            }

            // Try to load encryption key
            const keyPath = path.join(this.configPath, 'encryption.key');
            try {
                const keyExists = await this.fileExists(keyPath);
                if (keyExists) {
                    this.encryptionKey = await fs.readFile(keyPath, 'utf8');
                    this.logger.info('Loaded existing encryption key');
                } else {
                    // Generate new key if not exists
                    this.encryptionKey = crypto.randomBytes(32).toString('hex');
                    await fs.writeFile(keyPath, this.encryptionKey, 'utf8');
                    this.logger.info('Generated new encryption key');
                }
            } catch (error) {
                this.logger.error('Error loading/generating encryption key', error);
                // Generate a temporary key that will be lost on restart
                this.encryptionKey = crypto.randomBytes(32).toString('hex');
                this.logger.warn('Using temporary encryption key');
            }

            // Generate session secret
            this.sessionSecret = crypto.randomBytes(32).toString('hex');
            this.logger.info('Security manager initialized');
            
            return true;
        } catch (error) {
            this.logger.error('Failed to initialize security manager', error);
            return false;
        }
    }

    async fileExists(filePath) {
        try {
            await fs.access(filePath, fs.constants.F_OK);
            return true;
        } catch {
            return false;
        }
    }

    isEncryptionKeySet() {
        return !!this.encryptionKey;
    }

    getSessionSecret() {
        if (!this.sessionSecret) {
            // Generate a temporary session secret if not already set
            this.sessionSecret = crypto.randomBytes(32).toString('hex');
        }
        return this.sessionSecret;
    }

    async setPassword(password) {
        try {
            const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
            await fs.writeFile(path.join(this.configPath, 'password.hash'), hashedPassword, 'utf8');
            return true;
        } catch (error) {
            this.logger.error('Failed to set password', error);
            throw error;
        }
    }

    verifyPassword(password) {
        try {
            const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
            const storedHash = fsSync.readFileSync(path.join(this.configPath, 'password.hash'), 'utf8');
            return hashedPassword === storedHash;
        } catch (error) {
            this.logger.error('Password verification error', error);
            // If no password file exists, any password is valid (initial setup)
            if (error.code === 'ENOENT') {
                return true;
            }
            return false;
        }
    }

    async encryptConfig(config) {
        try {
            if (!this.encryptionKey) {
                this.logger.error('Cannot encrypt config - encryption key not set');
                throw new Error('Encryption key not set');
            }
            
            const configString = JSON.stringify(config);
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(this.algorithm, Buffer.from(this.encryptionKey, 'hex'), iv);
            
            let encrypted = cipher.update(configString, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const authTag = cipher.getAuthTag().toString('hex');
            
            const result = {
                iv: iv.toString('hex'),
                encryptedData: encrypted,
                authTag,
                algorithm: this.algorithm
            };
            
            return result;
        } catch (error) {
            this.logger.error('Failed to encrypt config', error);
            throw error;
        }
    }

    async decryptConfig(encryptedConfig) {
        try {
            if (!this.encryptionKey) {
                this.logger.error('Cannot decrypt config - encryption key not set');
                return this.getDefaultConfig();
            }

            // If the config is not encrypted or doesn't have the expected format
            if (!encryptedConfig || !encryptedConfig.iv || !encryptedConfig.encryptedData || !encryptedConfig.authTag) {
                this.logger.error('Invalid encrypted config format');
                return this.getDefaultConfig();
            }
            
            try {
                const decipher = crypto.createDecipheriv(
                    encryptedConfig.algorithm || this.algorithm,
                    Buffer.from(this.encryptionKey, 'hex'),
                    Buffer.from(encryptedConfig.iv, 'hex')
                );
                
                decipher.setAuthTag(Buffer.from(encryptedConfig.authTag, 'hex'));
                
                let decrypted = decipher.update(encryptedConfig.encryptedData, 'hex', 'utf8');
                decrypted += decipher.final('utf8');
                
                return JSON.parse(decrypted);
            } catch (decryptError) {
                this.logger.error('Decryption error - possibly corrupted data or wrong key', decryptError);
                return this.getDefaultConfig();
            }
        } catch (error) {
            this.logger.error('Failed to decrypt config', error);
            return this.getDefaultConfig();
        }
    }

    getDefaultConfig() {
        return {
            ethereum: { 
                enabled: false,
                nodeUrl: '',
                privateKey: '',
                gasLimit: 250000,
                gasPriceMultiplier: 1.1
            },
            bnbChain: { 
                enabled: false,
                nodeUrl: '',
                privateKey: '',
                gasLimit: 250000,
                gasPriceMultiplier: 1.1
            },
            exchanges: { 
                binanceUS: { 
                    enabled: false,
                    apiKey: '',
                    apiSecret: ''
                },
                cryptoCom: { 
                    enabled: false,
                    apiKey: '',
                    apiSecret: '' 
                }
            },
            strategies: { 
                tokenSniper: { 
                    enabled: false,
                    maxTransactionAmount: 0.1,
                    slippageTolerance: 3,
                    autoSellTimeoutMinutes: 30,
                    stopLossPercentage: 10,
                    takeProfitPercentage: 50
                },
                trendTrading: { 
                    enabled: false,
                    tradingPairs: ["BTC/USDT", "ETH/USDT"],
                    timeframes: ["1h", "4h"]
                }
            },
            trading: {
                autoStart: false,
                maxConcurrentTrades: 3,
                defaultRiskPercentage: 2
            }
        };
    }
}

module.exports = { SecurityManager };