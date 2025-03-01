/**
 * Security Manager for CryptoSniperBot
 * Handles encryption/decryption of sensitive data
 */
const crypto = require('crypto');
const { Logger } = require('./logger');

class SecurityManager {
    constructor() {
        this.logger = new Logger('SecurityManager');
        this.algorithm = 'aes-256-gcm';
        this.initKey();
    }

    /**
     * Initialize encryption key
     */
    initKey() {
        try {
            // Use environment variable or generate a new key
            this.key = process.env.ENCRYPTION_KEY || 
                      crypto.randomBytes(32).toString('hex');
            
            if (!process.env.ENCRYPTION_KEY) {
                process.env.ENCRYPTION_KEY = this.key;
            }
        } catch (error) {
            this.logger.error('Failed to initialize encryption key', error);
            throw error;
        }
    }

    /**
     * Encrypt sensitive data
     * @param {string} data - Data to encrypt
     * @returns {string} - Encrypted data in format: iv:authTag:encryptedData
     */
    encrypt(data) {
        try {
            if (!data) return '';
            
            // Generate IV
            const iv = crypto.randomBytes(12);
            
            // Create cipher
            const cipher = crypto.createCipheriv(
                this.algorithm,
                Buffer.from(this.key, 'hex'),
                iv
            );
            
            // Encrypt the data
            let encrypted = cipher.update(data, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            // Get auth tag
            const authTag = cipher.getAuthTag();
            
            // Combine IV, authTag and encrypted data
            return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
        } catch (error) {
            this.logger.error('Encryption failed', { error: { encryptedObj: error.message } });
            throw error;
        }
    }

    /**
     * Decrypt sensitive data
     * @param {string} encryptedData - Data to decrypt in format: iv:authTag:encryptedData
     * @returns {string} - Decrypted data
     */
    decrypt(encryptedData) {
        try {
            if (!encryptedData) return '';
            
            // Split the encrypted data into components
            const [ivHex, authTagHex, encryptedHex] = encryptedData.split(':');
            
            if (!ivHex || !authTagHex || !encryptedHex) {
                throw new Error('Invalid encrypted data format');
            }
            
            // Convert hex strings back to buffers
            const iv = Buffer.from(ivHex, 'hex');
            const authTag = Buffer.from(authTagHex, 'hex');
            const encrypted = Buffer.from(encryptedHex, 'hex');
            
            // Create decipher
            const decipher = crypto.createDecipheriv(
                this.algorithm,
                Buffer.from(this.key, 'hex'),
                iv
            );
            
            // Set auth tag
            decipher.setAuthTag(authTag);
            
            // Decrypt the data
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            this.logger.error('Decryption failed', { error: { encryptedObj: encryptedData } });
            throw error;
        }
    }

    /**
     * Decrypt configuration object
     * @param {Object} config - Configuration object with encrypted values
     * @returns {Object} - Configuration with decrypted values
     */
    decryptConfig(config) {
        try {
            const decryptedConfig = { ...config };
            
            // Decrypt Ethereum private keys and API keys
            if (decryptedConfig.ethereum) {
                if (decryptedConfig.ethereum.privateKey) {
                    try {
                        decryptedConfig.ethereum.privateKey = this.decrypt(decryptedConfig.ethereum.privateKey);
                    } catch (error) {
                        this.logger.error('Error decrypting ethereum.privateKey');
                    }
                }
                if (decryptedConfig.ethereum.alchemyKey) {
                    try {
                        decryptedConfig.ethereum.alchemyKey = this.decrypt(decryptedConfig.ethereum.alchemyKey);
                    } catch (error) {
                        this.logger.error('Error decrypting ethereum.alchemyKey');
                    }
                }
                if (decryptedConfig.ethereum.infuraId) {
                    try {
                        decryptedConfig.ethereum.infuraId = this.decrypt(decryptedConfig.ethereum.infuraId);
                    } catch (error) {
                        this.logger.error('Error decrypting ethereum.infuraId');
                    }
                }
            }
            
            // Decrypt BNB Chain private key
            if (decryptedConfig.bnbChain && decryptedConfig.bnbChain.privateKey) {
                try {
                    decryptedConfig.bnbChain.privateKey = this.decrypt(decryptedConfig.bnbChain.privateKey);
                } catch (error) {
                    this.logger.error('Error decrypting bnbChain.privateKey');
                }
            }
            
            // Decrypt exchange API credentials
            if (decryptedConfig.exchanges) {
                if (decryptedConfig.exchanges.binanceUS) {
                    if (decryptedConfig.exchanges.binanceUS.apiKey) {
                        try {
                            decryptedConfig.exchanges.binanceUS.apiKey = this.decrypt(decryptedConfig.exchanges.binanceUS.apiKey);
                        } catch (error) {
                            this.logger.error('Error decrypting binanceUS.apiKey');
                        }
                    }
                    if (decryptedConfig.exchanges.binanceUS.apiSecret) {
                        try {
                            decryptedConfig.exchanges.binanceUS.apiSecret = this.decrypt(decryptedConfig.exchanges.binanceUS.apiSecret);
                        } catch (error) {
                            this.logger.error('Error decrypting binanceUS.apiSecret');
                        }
                    }
                }
                
                if (decryptedConfig.exchanges.cryptoCom) {
                    if (decryptedConfig.exchanges.cryptoCom.apiKey) {
                        try {
                            decryptedConfig.exchanges.cryptoCom.apiKey = this.decrypt(decryptedConfig.exchanges.cryptoCom.apiKey);
                        } catch (error) {
                            this.logger.error('Error decrypting cryptoCom.apiKey');
                        }
                    }
                    if (decryptedConfig.exchanges.cryptoCom.apiSecret) {
                        try {
                            decryptedConfig.exchanges.cryptoCom.apiSecret = this.decrypt(decryptedConfig.exchanges.cryptoCom.apiSecret);
                        } catch (error) {
                            this.logger.error('Error decrypting cryptoCom.apiSecret');
                        }
                    }
                }
            }
            
            return decryptedConfig;
        } catch (error) {
            this.logger.error('Failed to decrypt config', error);
            throw error;
        }
    }
}

module.exports = { SecurityManager };