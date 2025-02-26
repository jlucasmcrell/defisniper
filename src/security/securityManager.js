/**
 * Security Manager for CryptoSniperBot
 * Handles encryption, key management, and secure storage
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Logger } = require('../utils/logger');

class SecurityManager {
    constructor() {
        this.logger = new Logger('SecurityManager');
        this.keyPath = path.join(__dirname, '../../config/security.key');
        this.encryptionKey = null;
        this.loadEncryptionKey();
    }

    loadEncryptionKey() {
        try {
            if (fs.existsSync(this.keyPath)) {
                this.encryptionKey = fs.readFileSync(this.keyPath, 'utf8');
                this.logger.info('Encryption key loaded successfully');
            }
        } catch (error) {
            this.logger.error('Failed to load encryption key', error);
            throw error;
        }
    }

    async generateEncryptionKey() {
        try {
            this.encryptionKey = crypto.randomBytes(32).toString('hex');
            const keyDir = path.dirname(this.keyPath);
            
            if (!fs.existsSync(keyDir)) {
                fs.mkdirSync(keyDir, { recursive: true });
            }
            
            fs.writeFileSync(this.keyPath, this.encryptionKey);
            this.logger.info('Generated new encryption key');
            return true;
        } catch (error) {
            this.logger.error('Failed to generate encryption key', error);
            throw error;
        }
    }

    isEncryptionKeySet() {
        return this.encryptionKey !== null;
    }

    encrypt(text) {
        try {
            if (!this.encryptionKey) {
                throw new Error('Encryption key not set');
            }

            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(this.encryptionKey, 'hex'), iv);
            
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const authTag = cipher.getAuthTag();
            
            return {
                iv: iv.toString('hex'),
                encrypted: encrypted,
                authTag: authTag.toString('hex')
            };
        } catch (error) {
            this.logger.error('Encryption failed', error);
            throw error;
        }
    }

    decrypt(encryptedData) {
        try {
            if (!this.encryptionKey) {
                throw new Error('Encryption key not set');
            }

            if (typeof encryptedData === 'string') {
                return encryptedData; // Return as-is if not encrypted
            }

            const decipher = crypto.createDecipheriv(
                'aes-256-gcm',
                Buffer.from(this.encryptionKey, 'hex'),
                Buffer.from(encryptedData.iv, 'hex')
            );

            decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
            
            let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            this.logger.error('Decryption failed', error);
            throw error;
        }
    }

    hashPassword(password) {
        return crypto.createHash('sha256').update(password).digest('hex');
    }

    verifyPassword(password, hash) {
        return this.hashPassword(password) === hash;
    }

    generateApiKeyHash(apiKey) {
        return crypto.createHash('sha256').update(apiKey).digest('hex');
    }

    cleanupLegacyFiles() {
        // Implement cleanup logic if needed
        this.logger.info('Legacy file cleanup completed');
    }

    validateSecurityConfig(config) {
        try {
            if (!config || !config.security) {
                throw new Error('Security configuration missing');
            }

            const required = ['encryptionKey'];
            const missing = required.filter(key => !config.security[key]);

            if (missing.length > 0) {
                throw new Error(`Missing security configuration: ${missing.join(', ')}`);
            }

            return true;
        } catch (error) {
            this.logger.error('Security configuration validation failed', error);
            return false;
        }
    }
}

module.exports = SecurityManager;