/**
 * Security Manager
 * Handles encryption, key management, and secure storage
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Logger } = require('../utils/logger');

class SecurityManager {
    constructor() {
        this.logger = new Logger('SecurityManager');
        this.initialized = false;
        this.encryptionKey = null;
        this.secureConfigPath = path.join(__dirname, '../../secure-config');
        this.securityConfigFile = path.join(this.secureConfigPath, 'security.json');
        this.encryptionKeyFile = path.join(this.secureConfigPath, 'encryption.key');
        this.algorithm = 'aes-256-gcm';
    }

    async initialize() {
        try {
            // Check if secure-config directory exists
            if (!fs.existsSync(this.secureConfigPath)) {
                throw new Error('Secure config directory not found. Please run setup.bat first.');
            }

            // Load encryption key
            if (!fs.existsSync(this.encryptionKeyFile)) {
                throw new Error('Encryption key not found. Please run setup.bat first.');
            }

            // Load security config
            if (!fs.existsSync(this.securityConfigFile)) {
                throw new Error('Security config not found. Please run setup.bat first.');
            }

            // Read encryption key
            this.encryptionKey = await fs.promises.readFile(this.encryptionKeyFile, 'utf8');

            // Load security config
            const securityConfig = JSON.parse(
                await fs.promises.readFile(this.securityConfigFile, 'utf8')
            );

            // Validate security config
            if (!securityConfig.initialized) {
                throw new Error('Security config not initialized. Please run setup.bat first.');
            }

            this.initialized = true;
            this.logger.info('Security manager initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize security manager', error);
            throw error;
        }
    }

    encrypt(data) {
        try {
            if (!this.initialized) {
                throw new Error('Security manager not initialized');
            }

            if (!data) {
                return null;
            }

            // Convert data to string if it's not already
            const text = typeof data === 'string' ? data : JSON.stringify(data);

            // Generate IV
            const iv = crypto.randomBytes(16);

            // Create cipher
            const cipher = crypto.createCipheriv(
                this.algorithm,
                Buffer.from(this.encryptionKey, 'hex'),
                iv
            );

            // Encrypt the data
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            // Get auth tag
            const authTag = cipher.getAuthTag();

            // Return everything needed for decryption
            return {
                iv: iv.toString('hex'),
                authTag: authTag.toString('hex'),
                encrypted: encrypted
            };
        } catch (error) {
            this.logger.error('Encryption failed', error);
            throw error;
        }
    }

    decrypt(encryptedData) {
        try {
            if (!this.initialized) {
                throw new Error('Security manager not initialized');
            }

            if (!encryptedData || !encryptedData.iv || !encryptedData.authTag || !encryptedData.encrypted) {
                throw new Error('Invalid encrypted data format');
            }

            // Create decipher
            const decipher = crypto.createDecipheriv(
                this.algorithm,
                Buffer.from(this.encryptionKey, 'hex'),
                Buffer.from(encryptedData.iv, 'hex')
            );

            // Set auth tag
            decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

            // Decrypt the data
            let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            // Try to parse as JSON if possible
            try {
                return JSON.parse(decrypted);
            } catch {
                return decrypted;
            }
        } catch (error) {
            this.logger.error('Decryption failed', error);
            throw error;
        }
    }

    generateApiKeyHash(apiKey) {
        try {
            if (!this.initialized) {
                throw new Error('Security manager not initialized');
            }

            return crypto
                .createHash('sha256')
                .update(apiKey)
                .digest('hex');
        } catch (error) {
            this.logger.error('Failed to generate API key hash', error);
            throw error;
        }
    }

    validateApiKey(apiKey, storedHash) {
        try {
            if (!this.initialized) {
                throw new Error('Security manager not initialized');
            }

            const hash = this.generateApiKeyHash(apiKey);
            return hash === storedHash;
        } catch (error) {
            this.logger.error('Failed to validate API key', error);
            throw error;
        }
    }

    generateSecureToken(length = 32) {
        try {
            if (!this.initialized) {
                throw new Error('Security manager not initialized');
            }
            return crypto.randomBytes(length).toString('hex');
        } catch (error) {
            this.logger.error('Failed to generate secure token', error);
            throw error;
        }
    }

    hashPassword(password, salt = null) {
        try {
            if (!this.initialized) {
                throw new Error('Security manager not initialized');
            }

            salt = salt || crypto.randomBytes(16).toString('hex');
            const hash = crypto
                .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
                .toString('hex');
            return { hash, salt };
        } catch (error) {
            this.logger.error('Failed to hash password', error);
            throw error;
        }
    }

    verifyPassword(password, hash, salt) {
        try {
            if (!this.initialized) {
                throw new Error('Security manager not initialized');
            }

            const verifyHash = this.hashPassword(password, salt).hash;
            return verifyHash === hash;
        } catch (error) {
            this.logger.error('Failed to verify password', error);
            throw error;
        }
    }

    // Method to check if setup has been completed
    async isSetupComplete() {
        try {
            return (
                fs.existsSync(this.secureConfigPath) &&
                fs.existsSync(this.securityConfigFile) &&
                fs.existsSync(this.encryptionKeyFile) &&
                this.initialized
            );
        } catch (error) {
            this.logger.error('Failed to check setup status', error);
            return false;
        }
    }
}

module.exports = SecurityManager;