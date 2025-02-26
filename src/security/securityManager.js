const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Logger } = require('../utils/logger');

class SecurityManager {
    constructor() {
        this.logger = new Logger('SecurityManager');
        this.encryptionKey = null;
        this.securityConfig = {};
        
        // Create secure-config directory in the root of the project
        this.secureConfigDir = path.join(process.cwd(), 'secure-config');
        this.ensureSecureConfigDirectory();
        
        this.securityPath = path.join(this.secureConfigDir, 'security.json');
        this.keyPath = path.join(this.secureConfigDir, 'encryption.key');
        this.loadSecurity();
    }

    ensureSecureConfigDirectory() {
        if (!fs.existsSync(this.secureConfigDir)) {
            try {
                fs.mkdirSync(this.secureConfigDir, { recursive: true });
                this.logger.info('Created secure-config directory');
            } catch (error) {
                this.logger.error('Failed to create secure-config directory', error);
                throw error;
            }
        }
    }

    loadSecurity() {
        try {
            if (fs.existsSync(this.securityPath)) {
                const securityData = fs.readFileSync(this.securityPath, 'utf8');
                this.securityConfig = JSON.parse(securityData);
                this.logger.info('Security configuration loaded successfully');
            } else {
                this.logger.info('No existing security configuration found');
            }

            if (fs.existsSync(this.keyPath)) {
                this.encryptionKey = fs.readFileSync(this.keyPath, 'utf8').trim();
                this.logger.info('Encryption key loaded successfully');
            } else {
                this.logger.info('No existing encryption key found');
            }
        } catch (error) {
            this.logger.error('Failed to load security configuration', error);
            this.securityConfig = {};
        }
    }

    saveSecurity() {
        try {
            // Ensure directory exists before saving
            this.ensureSecureConfigDirectory();
            
            fs.writeFileSync(this.securityPath, JSON.stringify(this.securityConfig, null, 2));
            this.logger.info('Security configuration saved successfully');
        } catch (error) {
            this.logger.error('Failed to save security configuration', error);
            throw error;
        }
    }

    setPassword(password) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
        
        this.securityConfig.password = {
            hash,
            salt
        };
        
        this.saveSecurity();
    }

    isPasswordSet() {
        return !!(this.securityConfig.password && this.securityConfig.password.hash);
    }

    verifyPassword(password) {
        if (!this.isPasswordSet()) return false;
        
        const hash = crypto.pbkdf2Sync(
            password,
            this.securityConfig.password.salt,
            10000,
            64,
            'sha512'
        ).toString('hex');
        
        return hash === this.securityConfig.password.hash;
    }

    generateEncryptionKey() {
        // Ensure directory exists before generating key
        this.ensureSecureConfigDirectory();
        
        const key = crypto.randomBytes(32).toString('hex');
        fs.writeFileSync(this.keyPath, key);
        this.encryptionKey = key;
        return key;
    }

    setEncryptionKey(key) {
        // Ensure directory exists before setting key
        this.ensureSecureConfigDirectory();
        
        fs.writeFileSync(this.keyPath, key);
        this.encryptionKey = key;
    }

    isEncryptionKeySet() {
        return !!this.encryptionKey;
    }

    encrypt(data) {
        if (!this.encryptionKey) {
            throw new Error('Encryption key not set');
        }

        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(
            'aes-256-cbc',
            Buffer.from(this.encryptionKey, 'hex'),
            iv
        );

        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return `${iv.toString('hex')}:${encrypted}`;
    }

    decrypt(encryptedData) {
        if (!this.encryptionKey) {
            throw new Error('Encryption key not set');
        }

        const [ivHex, encrypted] = encryptedData.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv(
            'aes-256-cbc',
            Buffer.from(this.encryptionKey, 'hex'),
            iv
        );

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    // Clean up any files in root that should be in secure-config
    cleanupLegacyFiles() {
        const rootFiles = ['security.json', 'encryption.key', 'config.json'];
        rootFiles.forEach(file => {
            const rootPath = path.join(process.cwd(), file);
            if (fs.existsSync(rootPath)) {
                try {
                    // Read the file
                    const content = fs.readFileSync(rootPath);
                    // Ensure it's in secure-config
                    const securePath = path.join(this.secureConfigDir, file);
                    if (!fs.existsSync(securePath)) {
                        fs.writeFileSync(securePath, content);
                    }
                    // Delete the root file
                    fs.unlinkSync(rootPath);
                    this.logger.info(`Moved ${file} to secure-config directory`);
                } catch (error) {
                    this.logger.error(`Failed to move ${file} to secure-config`, error);
                }
            }
        });
    }
}

module.exports = SecurityManager;