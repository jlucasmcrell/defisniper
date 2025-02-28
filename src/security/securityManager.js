const crypto = require('crypto');
const { Logger } = require('../utils/logger');
const path = require('path');
const fs = require('fs');

class SecurityManager {
    constructor() {
        this.logger = new Logger('SecurityManager');
        this.algorithm = 'aes-256-gcm';
        this.initKey();
        this.initSessionSecret();
        this.setDefaultPassword();
    }

    // Add the initialize method right after constructor
    async initialize() {
        try {
            // Verify the encryption key exists and is valid
            if (!this.key || this.key.length !== 64) {
                this.initKey();
            }

            // Verify the session secret exists
            if (!this.sessionSecret) {
                this.initSessionSecret();
            }

            // Ensure password file exists
            await this.setDefaultPassword();

            return true;
        } catch (error) {
            this.logger.error('Failed to initialize security manager', error);
            throw error;
        }
    }

    async setPassword(password) {
        try {
            const salt = crypto.randomBytes(16).toString('hex');
            const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
            const passwordData = `${salt}:${hash}`;
            
            const passwordPath = path.join(process.cwd(), 'secure-config', 'password.dat');
            fs.writeFileSync(passwordPath, passwordData);
            return true;
        } catch (error) {
            this.logger.error('Failed to set password', error);
            return false;
        }
    }

    verifyPassword(password) {
        try {
            const passwordPath = path.join(process.cwd(), 'secure-config', 'password.dat');
            
            if (!fs.existsSync(passwordPath)) {
                // For development, if no password file exists, accept any non-empty password
                return Boolean(password && password.length > 0);
            }

            const passwordData = fs.readFileSync(passwordPath, 'utf8');
            const [salt, storedHash] = passwordData.split(':');
            
            const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
            return storedHash === hash;
        } catch (error) {
            this.logger.error('Password verification failed', error);
            return false;
        }
    }

    async setDefaultPassword() {
        try {
            const passwordPath = path.join(process.cwd(), 'secure-config', 'password.dat');
            if (!fs.existsSync(passwordPath)) {
                await this.setPassword('admin');
                this.logger.warn('Using default password: "admin" - please change this immediately!');
            }
        } catch (error) {
            this.logger.error('Failed to set default password', error);
        }
    }

    initKey() {
        try {
            const keyPath = path.join(process.cwd(), 'secure-config', 'encryption.key');
            
            if (fs.existsSync(keyPath)) {
                this.key = fs.readFileSync(keyPath, 'utf8').trim();
            } else {
                this.key = crypto.randomBytes(32).toString('hex');
                const keyDir = path.dirname(keyPath);
                if (!fs.existsSync(keyDir)) {
                    fs.mkdirSync(keyDir, { recursive: true });
                }
                fs.writeFileSync(keyPath, this.key);
            }
        } catch (error) {
            this.logger.error('Failed to initialize encryption key', error);
            throw error;
        }
    }

    initSessionSecret() {
        try {
            const secretPath = path.join(process.cwd(), 'secure-config', 'session.key');
            
            if (fs.existsSync(secretPath)) {
                this.sessionSecret = fs.readFileSync(secretPath, 'utf8').trim();
            } else {
                this.sessionSecret = crypto.randomBytes(32).toString('base64');
                fs.writeFileSync(secretPath, this.sessionSecret);
            }
        } catch (error) {
            this.logger.error('Failed to initialize session secret', error);
            throw error;
        }
    }

    getSessionSecret() {
        return this.sessionSecret;
    }

    getEncryptionKey() {
        return this.key;
    }

    encrypt(data) {
        try {
            if (!data) return '';
            
            // If data is not a string, convert it to one
            const stringData = typeof data === 'string' ? data : JSON.stringify(data);
            
            const iv = crypto.randomBytes(12);
            const cipher = crypto.createCipheriv(
                this.algorithm,
                Buffer.from(this.key, 'hex'),
                iv
            );
            
            let encrypted = cipher.update(stringData, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const authTag = cipher.getAuthTag();
            
            return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
        } catch (error) {
            this.logger.error('Encryption failed', error);
            throw error;
        }
    }

    decrypt(encryptedData) {
        try {
            // Return original data if not encrypted
            if (!encryptedData || typeof encryptedData !== 'string') {
                return encryptedData;
            }

            // Check if the data is in the encrypted format
            if (!encryptedData.includes(':')) {
                return encryptedData;
            }
            
            const [ivHex, authTagHex, encryptedHex] = encryptedData.split(':');
            
            if (!ivHex || !authTagHex || !encryptedHex) {
                return encryptedData;
            }
            
            const iv = Buffer.from(ivHex, 'hex');
            const authTag = Buffer.from(authTagHex, 'hex');
            const encrypted = Buffer.from(encryptedHex, 'hex');
            
            const decipher = crypto.createDecipheriv(
                this.algorithm,
                Buffer.from(this.key, 'hex'),
                iv
            );
            
            decipher.setAuthTag(authTag);
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            // Try to parse JSON if the decrypted data is in JSON format
            try {
                return JSON.parse(decrypted);
            } catch {
                return decrypted;
            }
        } catch (error) {
            this.logger.error('Decryption failed, returning original data', error);
            return encryptedData;
        }
    }

    encryptConfig(config) {
        try {
            if (!config) return config;

            const encryptedConfig = { ...config };

            // Encrypt sensitive fields only if they exist and aren't already encrypted
            if (encryptedConfig.ethereum) {
                if (encryptedConfig.ethereum.privateKey) {
                    encryptedConfig.ethereum.privateKey = this.encrypt(encryptedConfig.ethereum.privateKey);
                }
                if (encryptedConfig.ethereum.alchemyKey) {
                    encryptedConfig.ethereum.alchemyKey = this.encrypt(encryptedConfig.ethereum.alchemyKey);
                }
                if (encryptedConfig.ethereum.infuraId) {
                    encryptedConfig.ethereum.infuraId = this.encrypt(encryptedConfig.ethereum.infuraId);
                }
            }

            if (encryptedConfig.bnbChain && encryptedConfig.bnbChain.privateKey) {
                encryptedConfig.bnbChain.privateKey = this.encrypt(encryptedConfig.bnbChain.privateKey);
            }

            if (encryptedConfig.exchanges) {
                if (encryptedConfig.exchanges.binanceUS) {
                    if (encryptedConfig.exchanges.binanceUS.apiKey) {
                        encryptedConfig.exchanges.binanceUS.apiKey = this.encrypt(encryptedConfig.exchanges.binanceUS.apiKey);
                    }
                    if (encryptedConfig.exchanges.binanceUS.apiSecret) {
                        encryptedConfig.exchanges.binanceUS.apiSecret = this.encrypt(encryptedConfig.exchanges.binanceUS.apiSecret);
                    }
                }

                if (encryptedConfig.exchanges.cryptoCom) {
                    if (encryptedConfig.exchanges.cryptoCom.apiKey) {
                        encryptedConfig.exchanges.cryptoCom.apiKey = this.encrypt(encryptedConfig.exchanges.cryptoCom.apiKey);
                    }
                    if (encryptedConfig.exchanges.cryptoCom.apiSecret) {
                        encryptedConfig.exchanges.cryptoCom.apiSecret = this.encrypt(encryptedConfig.exchanges.cryptoCom.apiSecret);
                    }
                }
            }

            return encryptedConfig;
        } catch (error) {
            this.logger.error('Failed to encrypt config', error);
            return config;
        }
    }

    decryptConfig(config) {
        try {
            if (!config) return config;

            const decryptedConfig = { ...config };

            // Decrypt sensitive fields only if they exist
            if (decryptedConfig.ethereum) {
                if (decryptedConfig.ethereum.privateKey) {
                    decryptedConfig.ethereum.privateKey = this.decrypt(decryptedConfig.ethereum.privateKey);
                }
                if (decryptedConfig.ethereum.alchemyKey) {
                    decryptedConfig.ethereum.alchemyKey = this.decrypt(decryptedConfig.ethereum.alchemyKey);
                }
                if (decryptedConfig.ethereum.infuraId) {
                    decryptedConfig.ethereum.infuraId = this.decrypt(decryptedConfig.ethereum.infuraId);
                }
            }

            if (decryptedConfig.bnbChain && decryptedConfig.bnbChain.privateKey) {
                decryptedConfig.bnbChain.privateKey = this.decrypt(decryptedConfig.bnbChain.privateKey);
            }

            if (decryptedConfig.exchanges) {
                if (decryptedConfig.exchanges.binanceUS) {
                    if (decryptedConfig.exchanges.binanceUS.apiKey) {
                        decryptedConfig.exchanges.binanceUS.apiKey = this.decrypt(decryptedConfig.exchanges.binanceUS.apiKey);
                    }
                    if (decryptedConfig.exchanges.binanceUS.apiSecret) {
                        decryptedConfig.exchanges.binanceUS.apiSecret = this.decrypt(decryptedConfig.exchanges.binanceUS.apiSecret);
                    }
                }

                if (decryptedConfig.exchanges.cryptoCom) {
                    if (decryptedConfig.exchanges.cryptoCom.apiKey) {
                        decryptedConfig.exchanges.cryptoCom.apiKey = this.decrypt(decryptedConfig.exchanges.cryptoCom.apiKey);
                    }
                    if (decryptedConfig.exchanges.cryptoCom.apiSecret) {
                        decryptedConfig.exchanges.cryptoCom.apiSecret = this.decrypt(decryptedConfig.exchanges.cryptoCom.apiSecret);
                    }
                }
            }

            return decryptedConfig;
        } catch (error) {
            this.logger.error('Failed to decrypt config', error);
            return config;
        }
    }
}

module.exports = { SecurityManager };