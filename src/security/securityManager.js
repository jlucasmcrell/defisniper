/**
 * Security Manager for CryptoSniperBot
 * Handles encryption, decryption, and secure storage of sensitive data
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Logger } = require('../utils/logger');

class SecurityManager {
  constructor() {
    this.logger = new Logger('SecurityManager');
    this.encryptionKey = null;
    this.securityConfig = {};
    this.securityPath = path.join(process.cwd(), 'security.json');
    this.keyPath = path.join(process.cwd(), 'encryption.key');
    this.loadSecurity();
  }

  /**
   * Load security configuration from file
   */
  loadSecurity() {
    try {
      if (fs.existsSync(this.securityPath)) {
        const securityData = fs.readFileSync(this.securityPath, 'utf8');
        this.securityConfig = JSON.parse(securityData);
        this.logger.info('Security configuration loaded successfully');
      }

      if (fs.existsSync(this.keyPath)) {
        this.encryptionKey = fs.readFileSync(this.keyPath, 'utf8').trim();
        this.logger.info('Encryption key loaded successfully');
      }
    } catch (error) {
      this.logger.error('Failed to load security configuration', error);
      this.securityConfig = {};
    }
  }

  /**
   * Save security configuration to file
   */
  saveSecurity() {
    try {
      fs.writeFileSync(this.securityPath, JSON.stringify(this.securityConfig, null, 2));
      this.logger.info('Security configuration saved successfully');
    } catch (error) {
      this.logger.error('Failed to save security configuration', error);
    }
  }

  /**
   * Set dashboard password
   * @param {string} password - The password to set
   */
  setPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    
    this.securityConfig.password = {
      hash,
      salt
    };
    
    this.saveSecurity();
  }

  /**
   * Check if password is set
   * @returns {boolean} True if password is set
   */
  isPasswordSet() {
    return !!(this.securityConfig.password && this.securityConfig.password.hash);
  }

  /**
   * Verify password
   * @param {string} password - The password to verify
   * @returns {boolean} True if password matches
   */
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

  /**
   * Generate new encryption key
   * @returns {string} The generated encryption key
   */
  generateEncryptionKey() {
    const key = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(this.keyPath, key);
    this.encryptionKey = key;
    return key;
  }

  /**
   * Set encryption key
   * @param {string} key - The encryption key to set
   */
  setEncryptionKey(key) {
    fs.writeFileSync(this.keyPath, key);
    this.encryptionKey = key;
  }

  /**
   * Check if encryption key is set
   * @returns {boolean} True if encryption key is set
   */
  isEncryptionKeySet() {
    return !!this.encryptionKey;
  }

  /**
   * Encrypt data
   * @param {string} data - Data to encrypt
   * @returns {string} Encrypted data
   */
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

  /**
   * Decrypt data
   * @param {string} encryptedData - Data to decrypt
   * @returns {string} Decrypted data
   */
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
}

module.exports = SecurityManager;