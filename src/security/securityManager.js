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
  

  /**
   * Normalize Ethereum private key (remove 0x prefix if present)
   */
  normalizePrivateKey(key) {
    if (!key) return key;
    
    // If key starts with 0x, remove it
    if (typeof key === 'string' && key.startsWith('0x')) {
      return key.substring(2);
    }
    
    return key;
  }
  
  /**
   * Load security configuration
   */
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
    
    // Return default config if not found or error
    return {
      passwordHash: null,
      sessionSecret: null,
      encryptionKeyHash: null,
      encryptionKeyFile: null
    };
  }
  
  /**
   * Save security configuration
   */
  saveSecurityConfig() {
    try {
      const configDir = path.join(process.cwd(), 'secure-config');
      
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      const configPath = path.join(configDir, 'security.json');
      
      fs.writeFileSync(
        configPath,
        JSON.stringify(this.securityConfig, null, 2)
      );
    } catch (error) {
      this.logger.error('Error saving security config', error);
    }
  }
  
  /**
   * Attempt to load encryption key from multiple possible locations
   */
  tryLoadEncryptionKey() {
    console.log('===== TRYING TO LOAD ENCRYPTION KEY =====');
  
    try {
      // Possible key locations
      const keyLocations = [
        path.join(process.cwd(), 'secure-config', 'encryption.key'),
        path.join(__dirname, '..', 'secure-config', 'encryption.key'),
        path.join(process.cwd(), 'encryption.key')
      ];

      for (const keyPath of keyLocations) {
        if (fs.existsSync(keyPath)) {
          const key = fs.readFileSync(keyPath, 'utf8').trim();
          
          // Validate key format
          if ((/^[0-9a-fA-F]{64}$/.test(key) || /^0x[0-9a-fA-F]{64}$/.test(key))) {
            this.encryptionKey = key;
            console.log(`Encryption key loaded from ${keyPath}`);
            return true;
          }
        }
      }

      console.log('No valid encryption key found');
      return false;
    } catch (error) {
      console.error('Error loading encryption key:', error);
      this.logger.error('Error loading encryption key', error);
      return false;
    }
  }
  
  /**
   * Get encryption key with enhanced error handling
   */
  getEncryptionKey() {
    // If key is not set, try to load it
    if (!this.encryptionKey) {
      this.tryLoadEncryptionKey();
    }

    if (!this.encryptionKey) {
      console.error('Critical: No encryption key available');
      this.logger.error('No encryption key available');
    }

    return this.encryptionKey;
  }
  
  /**
   * Check if encryption key is set with enhanced checking
   */
  isEncryptionKeySet() {
    // First, try to load the key if not already set
    if (!this.encryptionKey) {
      this.tryLoadEncryptionKey();
    }

    // Return true only if a valid key is found
    return !!this.encryptionKey;
  }
  
  /**
   * Set the encryption key with improved validation
   */
  setEncryptionKey(key) {
    try {
      // Validate key format
      if (!(/^[0-9a-fA-F]{64}$/.test(key) || /^0x[0-9a-fA-F]{64}$/.test(key))) {
        throw new Error('Invalid encryption key format');
      }

      // Save key to a secure file
      const keyDir = path.join(process.cwd(), 'secure-config');
      if (!fs.existsSync(keyDir)) {
        fs.mkdirSync(keyDir, { recursive: true });
      }
      
      const keyPath = path.join(keyDir, 'encryption.key');
      fs.writeFileSync(keyPath, key, { mode: 0o600 });

      // Hash the key for verification
      const hash = crypto.createHash('sha256').update(key).digest('hex');
      
      this.securityConfig.encryptionKeyHash = hash;
      this.securityConfig.encryptionKeyFile = keyPath;
      this.encryptionKey = key;
      
      this.saveSecurityConfig();
      
      console.log('Encryption key set and saved successfully');
      return true;
    } catch (error) {
      console.error('Error setting encryption key:', error);
      this.logger.error('Error setting encryption key', error);
      return false;
    }
  }
  
  /**
   * Encrypt sensitive data
   */
  encrypt(data) {
    try {
      if (!this.encryptionKey) {
        this.tryLoadEncryptionKey();
      }
      
      if (!this.encryptionKey) {
        throw new Error('Encryption key not set');
      }
      
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        Buffer.from(this.encryptionKey, 'hex'),
        iv
      );
      
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
  
  /**
   * Decrypt sensitive data with improved handling
   */
  decrypt(encryptedObj) {
    console.log('===== DECRYPT CALLED =====');
    console.log('Type of encryptedObj:', typeof encryptedObj);
    console.log('Value of encryptedObj:', JSON.stringify(encryptedObj, null, 2));
    
    // If the input is a string, assume it's unencrypted data
    if (typeof encryptedObj === 'string') {
      console.log('Input is a plain string, returning as-is');
      return encryptedObj;
    }

    // Safety check - if encryptedObj is undefined or not an object with required properties, return null
    if (!encryptedObj || typeof encryptedObj !== 'object' || !encryptedObj.iv || !encryptedObj.encryptedData) {
      console.log('Input is not a valid encrypted object, returning null');
      return null;
    }
  
    try {
      if (!this.encryptionKey) {
        this.tryLoadEncryptionKey();
      }
      
      if (!this.encryptionKey) {
        throw new Error('Encryption key not set');
      }
      
      const iv = Buffer.from(encryptedObj.iv, 'hex');
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(this.encryptionKey, 'hex'),
        iv
      );
      
      let decrypted = decipher.update(encryptedObj.encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      // Try to parse as JSON if possible
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
  
  /**
   * Decrypt configuration with improved handling
   */
  decryptConfig(config) {
    console.log('===== DECRYPT CONFIG CALLED =====');
    console.log('Type of config:', typeof config);
    if (!config) {
      console.error('Config is null or undefined');
      return {};
    }
    
    // Deep copy the config to avoid modifications during logging
    const configCopy = JSON.parse(JSON.stringify(config));
    
    // Add field-by-field logging and improved error handling
    const logAndDecrypt = (obj, path, field) => {
      console.log(`Decrypting ${path}.${field}`);
      if (!obj[field]) {
        console.log(`${path}.${field} is undefined or null`);
        return null;
      }
      
      console.log(`${path}.${field} has type ${typeof obj[field]}`);
      console.log(`${path}.${field} value: ${JSON.stringify(obj[field])}`);
      
      try {
        // If the value is already a string and doesn't look like an encrypted object,
        // return it as-is
        if (typeof obj[field] === 'string') {
          console.log(`${path}.${field} appears to be unencrypted, returning as-is`);
          return obj[field];
        }
        
        const decrypted = this.decrypt(obj[field]);
        console.log(`Successfully decrypted ${path}.${field}`);
        return decrypted;
      } catch (error) {
        console.error(`Error decrypting ${path}.${field}: ${error.message}`);
        // Return the original value if decryption fails
        return obj[field];
      }
    };
  
    try {
      if (!config) return {};
      
      const decryptedConfig = { ...config };
      
      // Decrypt ethereum privateKey
      if (decryptedConfig.ethereum && decryptedConfig.ethereum.privateKey) {
        decryptedConfig.ethereum.privateKey = logAndDecrypt(decryptedConfig.ethereum, 'ethereum', 'privateKey');
      }
      
      // Decrypt ethereum infuraId (changed from alchemyKey)
      if (decryptedConfig.ethereum && decryptedConfig.ethereum.infuraId) {
        decryptedConfig.ethereum.infuraId = logAndDecrypt(decryptedConfig.ethereum, 'ethereum', 'infuraId');
      }
      
      // Decrypt exchange credentials
      if (decryptedConfig.exchanges) {
        if (decryptedConfig.exchanges.binanceUS) {
          if (decryptedConfig.exchanges?.binanceUS?.apiKey) {
            decryptedConfig.exchanges.binanceUS.apiKey = logAndDecrypt(decryptedConfig.exchanges.binanceUS, 'exchanges.binanceUS', 'apiKey');
          }
          if (decryptedConfig.exchanges?.binanceUS?.apiSecret) {
            decryptedConfig.exchanges.binanceUS.apiSecret = logAndDecrypt(decryptedConfig.exchanges.binanceUS, 'exchanges.binanceUS', 'apiSecret');
          }
        }
        
        if (decryptedConfig.exchanges.cryptoCom) {
          if (decryptedConfig.exchanges?.cryptoCom?.apiKey) {
            decryptedConfig.exchanges.cryptoCom.apiKey = logAndDecrypt(decryptedConfig.exchanges.cryptoCom, 'exchanges.cryptoCom', 'apiKey');
          }
          if (decryptedConfig.exchanges?.cryptoCom?.apiSecret) {
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
  
  /**
   * Set the bot password
   */
  setPassword(password) {
    try {
      // Hash the password with bcrypt
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
  
  /**
   * Verify the bot password
   */
  verifyPassword(password) {
    try {
      if (!this.securityConfig.passwordHash) {
        // If no password set, any password is valid (first-time setup)
        return true;
      }
      
      return bcrypt.compareSync(password, this.securityConfig.passwordHash);
    } catch (error) {
      this.logger.error('Error verifying password', error);
      return false;
    }
  }
  
  /**
   * Check if password is set
   */
  isPasswordSet() {
    return !!this.securityConfig.passwordHash;
  }
  
  /**
   * Generate a new encryption key
   */
  generateEncryptionKey() {
    // Generate 32 bytes (256 bits) and convert to hex
    return crypto.randomBytes(32).toString('hex');
  }
  
  /**
   * Get session secret
   */
  getSessionSecret() {
    return this.securityConfig.sessionSecret || 'fallback-secret-' + uuidv4();
  }
}

module.exports = { SecurityManager };