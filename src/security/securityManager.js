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
        this.algorithm = 'aes-128-gcm'; // Changed from aes-256-gcm
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
            try {
                await fs.access(this.keyPath);
                return false;
            } catch (error) {
                this.encryptionKey = crypto.randomBytes(16); // Changed from 32 to 16 bytes
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
            const iv = crypto.randomBytes(12);
            const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
            
            const jsonStr = JSON.stringify(config);
            let encrypted = cipher.update(jsonStr, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const authTag = cipher.getAuthTag();
            
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
            const iv = Buffer.from(encryptedConfig.iv, 'hex');
            const encrypted = Buffer.from(encryptedConfig.data, 'hex');
            const authTag = Buffer.from(encryptedConfig.authTag, 'hex');
            
            const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
            decipher.setAuthTag(authTag);
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
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