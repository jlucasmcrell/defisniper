const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { Logger } = require('../utils/logger');

class SecurityManager {
  constructor() {
    this.logger = new Logger('SecurityManager');
    this.encryptionKey = null;
    this.securityConfig = this.loadSecurityConfig();

    // Generate session secret if it doesn't exist
    if (!this.securityConfig.sessionSecret) {
      this.securityConfig.sessionSecret = crypto.randomBytes(32).toString('hex');
      this.saveSecurityConfig();
    }
  }

  normalizePrivateKey(key) {
    if (!key) return key;
    if (typeof key === 'string' && key.startsWith('0x')) {
      return key.substring(2);
    }
    return key;
  }

  loadSecurityConfig() {
    try {
      const configPath = path.join(process.cwd(), 'secure-config', 'security.json');
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configData);
      }
    } catch (error) {
      this.logger.error('Error loading security config', error);
    }
    return {
      passwordHash: null,
      sessionSecret: null,
      encryptionKeyHash: null,
      encryptionKeyFile: null
    };
  }

  saveSecurityConfig() {
    try {
      const configDir = path.join(process.cwd(), 'secure-config');
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      const configPath = path.join(configDir, 'security.json');
      fs.writeFileSync(configPath, JSON.stringify(this.securityConfig, null, 2));
    } catch (error) {
      this.logger.error('Error saving security config', error);
    }
  }

  tryLoadEncryptionKey() {
    try {
      const keyLocations = [
        path.join(process.cwd(), 'secure-config', 'encryption.key'),
        path.join(__dirname, '..', 'secure-config', 'encryption.key'),
        path.join(process.cwd(), 'encryption.key')
      ];
      for (const keyPath of keyLocations) {
        if (fs.existsSync(keyPath)) {
          const key = fs.readFileSync(keyPath, 'utf8').trim();
          if ((/^[0-9a-fA-F]{64}$/.test(key) || /^0x[0-9a-fA-F]{64}$/.test(key))) {
            this.encryptionKey = key;
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      this.logger.error('Error loading encryption key', error);
      return false;
    }
  }

  getEncryptionKey() {
    if (!this.encryptionKey) {
      this.tryLoadEncryptionKey();
    }
    if (!this.encryptionKey) {
      this.logger.error('No encryption key available');
    }
    return this.encryptionKey;
  }

  isEncryptionKeySet() {
    if (!this.encryptionKey) {
      this.tryLoadEncryptionKey();
    }
    return !!this.encryptionKey;
  }

  setEncryptionKey(key) {
    try {
      if (!(/^[0-9a-fA-F]{64}$/.test(key) || /^0x[0-9a-fA-F]{64}$/.test(key))) {
        throw new Error('Invalid encryption key format');
      }
      const keyDir = path.join(process.cwd(), 'secure-config');
      if (!fs.existsSync(keyDir)) {
        fs.mkdirSync(keyDir, { recursive: true });
      }
      const keyPath = path.join(keyDir, 'encryption.key');
      fs.writeFileSync(keyPath, key, { mode: 0o600 });
      const hash = crypto.createHash('sha256').update(key).digest('hex');
      this.securityConfig.encryptionKeyHash = hash;
      this.securityConfig.encryptionKeyFile = keyPath;
      this.encryptionKey = key;
      this.saveSecurityConfig();
      return true;
    } catch (error) {
      this.logger.error('Error setting encryption key', error);
      return false;
    }
  }

  encrypt(data) {
    try {
      if (!this.encryptionKey) {
        this.tryLoadEncryptionKey();
      }
      if (!this.encryptionKey) {
        throw new Error('Encryption key not set');
      }
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey, 'hex'), iv);
      let encrypted = cipher.update(typeof data === 'object' ? JSON.stringify(data) : data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return {
        iv: iv.toString('hex'),
        encryptedData: encrypted
      };
    } catch (error) {
      this.logger.error('Encryption error', error);
      throw error;
    }
  }

  decrypt(encryptedObj) {
    if (!encryptedObj || !encryptedObj.iv || !encryptedObj.encryptedData) {
      this.logger.error('Invalid encrypted data format', { encryptedObj });
      throw new Error('Invalid encrypted data format');
    }
    try {
      if (!this.encryptionKey) {
        this.tryLoadEncryptionKey();
      }
      if (!this.encryptionKey) {
        throw new Error('Encryption key not set');
      }
      const iv = Buffer.from(encryptedObj.iv, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey, 'hex'), iv);
      let decrypted = decipher.update(encryptedObj.encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      this.logger.error('Decryption error', error);
      throw error;
    }
  }

  decryptConfig(config) {
    if (!config) {
      this.logger.error('Config is null or undefined');
      return {};
    }
    const decryptedConfig = { ...config };
    const logAndDecrypt = (obj, path, field) => {
      if (!obj[field]) {
        return null;
      }
      try {
        return this.decrypt(obj[field]);
      } catch (error) {
        this.logger.error(`Error decrypting ${path}.${field}`, error);
        return null;
      }
    };
    try {
      if (decryptedConfig.ethereum && decryptedConfig.ethereum.privateKey) {
        decryptedConfig.ethereum.privateKey = logAndDecrypt(decryptedConfig.ethereum, 'ethereum', 'privateKey');
      }
      if (decryptedConfig.ethereum && decryptedConfig.ethereum.alchemyKey) {
        decryptedConfig.ethereum.alchemyKey = logAndDecrypt(decryptedConfig.ethereum, 'ethereum', 'alchemyKey');
      }
      if (decryptedConfig.exchanges) {
        if (decryptedConfig.exchanges.binanceUS) {
          if (decryptedConfig.exchanges.binanceUS.apiKey) {
            decryptedConfig.exchanges.binanceUS.apiKey = logAndDecrypt(decryptedConfig.exchanges.binanceUS, 'exchanges.binanceUS', 'apiKey');
          }
          if (decryptedConfig.exchanges.binanceUS.apiSecret) {
            decryptedConfig.exchanges.binanceUS.apiSecret = logAndDecrypt(decryptedConfig.exchanges.binanceUS, 'exchanges.binanceUS', 'apiSecret');
          }
        }
        if (decryptedConfig.exchanges.cryptoCom) {
          if (decryptedConfig.exchanges.cryptoCom.apiKey) {
            decryptedConfig.exchanges.cryptoCom.apiKey = logAndDecrypt(decryptedConfig.exchanges.cryptoCom, 'exchanges.cryptoCom', 'apiKey');
          }
          if (decryptedConfig.exchanges.cryptoCom.apiSecret) {
            decryptedConfig.exchanges.cryptoCom.apiSecret = logAndDecrypt(decryptedConfig.exchanges.cryptoCom, 'exchanges.cryptoCom', 'apiSecret');
          }
        }
      }
      return decryptedConfig;
    } catch (error) {
      this.logger.error('Error decrypting config', error);
      throw error;
    }
  }

  setPassword(password) {
    try {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password, salt);
      this.securityConfig.passwordHash = hash;
      this.saveSecurityConfig();
      return true;
    } catch (error) {
      this.logger.error('Error setting password', error);
      return false;
    }
  }

  verifyPassword(password) {
    try {
      if (!this.securityConfig.passwordHash) {
        return true;
      }
      return bcrypt.compareSync(password, this.securityConfig.passwordHash);
    } catch (error) {
      this.logger.error('Error verifying password', error);
      return false;
    }
  }

  isPasswordSet() {
    return !!this.securityConfig.passwordHash;
  }

  generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  getSessionSecret() {
    return this.securityConfig.sessionSecret || 'fallback-secret-' + uuidv4();
  }
}

module.exports = { SecurityManager };