const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { Logger } = require('../utils/logger');

class SecurityManager {
    constructor() {
        this.logger = new Logger('SecurityManager');
        this.algorithm = 'aes-256-gcm';
        this.key = null;
        this.sessionSecret = null;
    }

    async initialize() {
        try {
            await this.initKey();
            await this.initSessionSecret();
            await this.initializePassword();
            return true;
        } catch (error) {
            this.logger.error('Failed to initialize security manager', error);
            throw error;
        }
    }

    async initKey() {
        try {
            const keyPath = path.join(process.cwd(), 'secure-config', 'encryption.key');
            
            try {
                this.key = await fs.readFile(keyPath, 'utf8');
                this.key = this.key.trim();
            } catch (error) {
                if (error.code === 'ENOENT') {
                    // Generate new key if file doesn't exist
                    this.key = crypto.randomBytes(32).toString('hex');
                    await fs.writeFile(keyPath, this.key, 'utf8');
                } else {
                    throw error;
                }
            }

            // Validate key
            if (!this.key || this.key.length !== 64) {
                throw new Error('Invalid encryption key');
            }
        } catch (error) {
            this.logger.error('Failed to initialize encryption key', error);
            throw error;
        }
    }

    async initSessionSecret() {
        try {
            const secretPath = path.join(process.cwd(), 'secure-config', 'session.key');
            
            try {
                this.sessionSecret = await fs.readFile(secretPath, 'utf8');
                this.sessionSecret = this.sessionSecret.trim();
            } catch (error) {
                if (error.code === 'ENOENT') {
                    // Generate new session secret if file doesn't exist
                    this.sessionSecret = crypto.randomBytes(32).toString('base64');
                    await fs.writeFile(secretPath, this.sessionSecret, 'utf8');
                } else {
                    throw error;
                }
            }
        } catch (error) {
            this.logger.error('Failed to initialize session secret', error);
            throw error;
        }
    }

    async initializePassword() {
        try {
            const passwordPath = path.join(process.cwd(), 'secure-config', 'password.dat');
            
            try {
                await fs.access(passwordPath);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    // Set default password only if no password file exists
                    await this.setPassword('admin');
                    this.logger.warn('Default password set to "admin" - please change immediately!');
                } else {
                    throw error;
                }
            }
        } catch (error) {
            this.logger.error('Failed to initialize password', error);
            throw error;
        }
    }

    async setPassword(password) {
        try {
            const salt = crypto.randomBytes(16).toString('hex');
            const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
            const passwordData = `${salt}:${hash}`;
            
            const passwordPath = path.join(process.cwd(), 'secure-config', 'password.dat');
            await fs.writeFile(passwordPath, passwordData, 'utf8');
            return true;
        } catch (error) {
            this.logger.error('Failed to set password', error);
            throw error;
        }
    }

    verifyPassword(password) {
        try {
            const passwordPath = path.join(process.cwd(), 'secure-config', 'password.dat');
            const passwordData = require('fs').readFileSync(passwordPath, 'utf8');
            const [salt, storedHash] = passwordData.split(':');
            
            const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
            return storedHash === hash;
        } catch (error) {
            this.logger.error('Password verification failed', error);
            return false;
        }
    }

    getSessionSecret() {
        if (!this.sessionSecret) {
            throw new Error('Session secret not initialized');
        }
        return this.sessionSecret;
    }

    getEncryptionKey() {
        if (!this.key) {
            throw new Error('Encryption key not initialized');
        }
        return this.key;
    }

    encrypt(data) {
        try {
            if (!data) return '';
            
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
            if (!encryptedData || typeof encryptedData !== 'string') {
                return encryptedData;
            }

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
            
            // Encrypt Ethereum credentials
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

            // Encrypt BNB Chain credentials
            if (encryptedConfig.bnbChain) {
                if (encryptedConfig.bnbChain.privateKey) {
                    encryptedConfig.bnbChain.privateKey = this.encrypt(encryptedConfig.bnbChain.privateKey);
                }
            }

            // Encrypt exchange credentials
            if (encryptedConfig.exchanges) {
                if (encryptedConfig.exchanges.binanceUS) {
                    if (encryptedConfig.exchanges.binanceUS.apiKey) {
                        encryptedConfig.exchanges.binanceUS.apiKey = this.encrypt(
                            encryptedConfig.exchanges.binanceUS.apiKey
                        );
                    }
                    if (encryptedConfig.exchanges.binanceUS.apiSecret) {
                        encryptedConfig.exchanges.binanceUS.apiSecret = this.encrypt(
                            encryptedConfig.exchanges.binanceUS.apiSecret
                        );
                    }
                }

                if (encryptedConfig.exchanges.cryptoCom) {
                    if (encryptedConfig.exchanges.cryptoCom.apiKey) {
                        encryptedConfig.exchanges.cryptoCom.apiKey = this.encrypt(
                            encryptedConfig.exchanges.cryptoCom.apiKey
                        );
                    }
                    if (encryptedConfig.exchanges.cryptoCom.apiSecret) {
                        encryptedConfig.exchanges.cryptoCom.apiSecret = this.encrypt(
                            encryptedConfig.exchanges.cryptoCom.apiSecret
                        );
                    }
                }
            }

            return encryptedConfig;
        } catch (error) {
            this.logger.error('Failed to encrypt config', error);
            throw error;
        }
    }

    decryptConfig(config) {
        try {
            if (!config) return config;

            const decryptedConfig = { ...config };
            
            // Decrypt Ethereum credentials
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

            // Decrypt BNB Chain credentials
            if (decryptedConfig.bnbChain) {
                if (decryptedConfig.bnbChain.privateKey) {
                    decryptedConfig.bnbChain.privateKey = this.decrypt(decryptedConfig.bnbChain.privateKey);
                }
            }

            // Decrypt exchange credentials
            if (decryptedConfig.exchanges) {
                if (decryptedConfig.exchanges.binanceUS) {
                    if (decryptedConfig.exchanges.binanceUS.apiKey) {
                        decryptedConfig.exchanges.binanceUS.apiKey = this.decrypt(
                            decryptedConfig.exchanges.binanceUS.apiKey
                        );
                    }
                    if (decryptedConfig.exchanges.binanceUS.apiSecret) {
                        decryptedConfig.exchanges.binanceUS.apiSecret = this.decrypt(
                            decryptedConfig.exchanges.binanceUS.apiSecret
                        );
                    }
                }

                if (decryptedConfig.exchanges.cryptoCom) {
                    if (decryptedConfig.exchanges.cryptoCom.apiKey) {
                        decryptedConfig.exchanges.cryptoCom.apiKey = this.decrypt(
                            decryptedConfig.exchanges.cryptoCom.apiKey
                        );
                    }
                    if (decryptedConfig.exchanges.cryptoCom.apiSecret) {
                        decryptedConfig.exchanges.cryptoCom.apiSecret = this.decrypt(
                            decryptedConfig.exchanges.cryptoCom.apiSecret
                        );
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