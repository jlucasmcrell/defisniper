const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { Logger } = require('../utils/logger');

class SecurityManager {
    constructor() {
        this.logger = new Logger('SecurityManager');
        this.keyPath = path.join(process.cwd(), 'secure-config', 'encryption.key');
        this.passwordPath = path.join(process.cwd(), 'secure-config', 'password.hash');
        this.encryptionKey = null;
        this.passwordHash = null;
        this.algorithm = 'aes-256-gcm';
        this.keyLength = 32; // 256 bits
        this.ivLength = 16;  // 128 bits
    }

    async initialize() {
        try {
            await this.loadEncryptionKey();
            await this.loadPasswordHash();
            return true;
        } catch (error) {
            this.logger.error('Failed to initialize security manager', error);
            throw error;
        }
    }

    async generateKey() {
        try {
            // Check if key already exists
            try {
                await fs.access(this.keyPath);
                return false; // Key already exists
            } catch (error) {
                // Key doesn't exist, generate new one
                this.encryptionKey = crypto.randomBytes(this.keyLength);
                await fs.writeFile(this.keyPath, this.encryptionKey);
                return true;
            }
        } catch (error) {
            this.logger.error('Failed to generate encryption key', error);
            throw error;
        }
    }

    async loadEncryptionKey() {
        try {
            this.encryptionKey = await fs.readFile(this.keyPath);
            // Ensure key is the correct length
            if (this.encryptionKey.length !== this.keyLength) {
                this.logger.warn('Invalid key length detected, generating new key');
                await this.generateKey();
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                await this.generateKey();
            } else {
                throw error;
            }
        }
    }

    async loadPasswordHash() {
        try {
            this.passwordHash = await fs.readFile(this.passwordPath, 'utf8');
        } catch (error) {
            if (error.code === 'ENOENT') {
                // Set default password if none exists
                const defaultPassword = 'admin';
                await this.setPassword(defaultPassword);
                this.logger.warn('Default password set to "admin" - please change immediately!');
            } else {
                throw error;
            }
        }
    }

    async setPassword(password) {
        try {
            const salt = crypto.randomBytes(16).toString('hex');
            const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
            const hashData = `${salt}:${hash}`;
            
            await fs.writeFile(this.passwordPath, hashData);
            this.passwordHash = hashData;
            
            return true;
        } catch (error) {
            this.logger.error('Failed to set password', error);
            return false;
        }
    }

    verifyPassword(password) {
        try {
            const [salt, storedHash] = this.passwordHash.split(':');
            const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
            return storedHash === hash;
        } catch (error) {
            this.logger.error('Failed to verify password', error);
            return false;
        }
    }

    encryptConfig(config) {
        try {
            // Generate a random IV
            const iv = crypto.randomBytes(this.ivLength);
            
            // Create cipher with key and IV
            const cipher = crypto.createCipheriv(this.algorithm, Buffer.from(this.encryptionKey), iv);
            
            // Convert config to JSON string
            const jsonStr = JSON.stringify(config);
            
            // Encrypt the data
            let encrypted = cipher.update(jsonStr, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            // Get the auth tag
            const authTag = cipher.getAuthTag();
            
            // Return the encrypted data with IV and auth tag
            return {
                iv: iv.toString('hex'),
                data: encrypted,
                authTag: authTag.toString('hex')
            };
        } catch (error) {
            this.logger.error('Failed to encrypt config', error);
            throw error;
        }
    }

    decryptConfig(encryptedConfig) {
        try {
            // Convert hex strings back to buffers
            const iv = Buffer.from(encryptedConfig.iv, 'hex');
            const authTag = Buffer.from(encryptedConfig.authTag, 'hex');
            const encryptedData = Buffer.from(encryptedConfig.data, 'hex');
            
            // Create decipher
            const decipher = crypto.createDecipheriv(
                this.algorithm,
                Buffer.from(this.encryptionKey),
                iv
            );
            
            // Set auth tag
            decipher.setAuthTag(authTag);
            
            // Decrypt the data
            let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            // Parse and return the decrypted config
            return JSON.parse(decrypted);
        } catch (error) {
            this.logger.error('Failed to decrypt config', error);
            throw error;
        }
    }

    getSessionSecret() {
        return crypto.randomBytes(32).toString('hex');
    }
}

module.exports = { SecurityManager };