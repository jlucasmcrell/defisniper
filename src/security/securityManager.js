const crypto = require('crypto');
const { Logger } = require('../utils/logger');
const path = require('path');
const fs = require('fs');

class SecurityManager {
    constructor() {
        this.logger = new Logger('SecurityManager');
        this.algorithm = 'aes-256-gcm';
        this.initKey();
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

    encrypt(data) {
        try {
            if (!data) return '';
            
            const iv = crypto.randomBytes(12);
            const cipher = crypto.createCipheriv(
                this.algorithm,
                Buffer.from(this.key, 'hex'),
                iv
            );
            
            let encrypted = cipher.update(data, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const authTag = cipher.getAuthTag();
            
            return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
        } catch (error) {
            this.logger.error('Encryption failed', { error: { data } });
            throw error;
        }
    }

    decrypt(encryptedData) {
        try {
            if (!encryptedData) return '';
            
            const [ivHex, authTagHex, encryptedHex] = encryptedData.split(':');
            
            if (!ivHex || !authTagHex || !encryptedHex) {
                throw new Error('Invalid encrypted data format');
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
            
            return decrypted;
        } catch (error) {
            this.logger.error('Decryption failed', { error: { encryptedData } });
            throw error;
        }
    }
}

module.exports = SecurityManager;