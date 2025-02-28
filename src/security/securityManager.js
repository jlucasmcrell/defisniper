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
                // Generate a 32-byte (256-bit) key
                const key = crypto.randomBytes(32);
                await fs.writeFile(this.keyPath, key);
                this.encryptionKey = key;
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
            // Use key derivation to get a proper length key
            const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
            
            const jsonStr = JSON.stringify(config);
            let encrypted = cipher.update(jsonStr, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            return {
                iv: iv.toString('hex'),
                data: encrypted
            };
        } catch (error) {
            this.logger.error('Failed to encrypt config', error);
            throw error;
        }
    }

    decryptConfig(encryptedConfig) {
        try {
            const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
            const iv = Buffer.from(encryptedConfig.iv, 'hex');
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
            
            let decrypted = decipher.update(encryptedConfig.data, 'hex', 'utf8');
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