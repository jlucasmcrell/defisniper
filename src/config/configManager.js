/**
 * Configuration Manager
 * Handles loading and saving of bot configuration
 */
const fs = require('fs');
const path = require('path');
const { Logger } = require('../utils/logger');

class ConfigManager {
    constructor(securityManager) {
        if (!securityManager) {
            throw new Error('SecurityManager is required');
        }

        this.logger = new Logger('ConfigManager');
        this.securityManager = securityManager;
        this.configPath = path.join(__dirname, '../../secure-config/config.json');
        this.config = null;
    }

    loadConfig() {
        try {
            if (!fs.existsSync(this.configPath)) {
                throw new Error('Configuration file not found');
            }

            const encryptedConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
            this.config = this.securityManager.decrypt(encryptedConfig);
            
            this.logger.info('Configuration loaded successfully');
            return this.config;
        } catch (error) {
            this.logger.error('Failed to load configuration', error);
            throw error;
        }
    }

    getConfig() {
        if (!this.config) {
            return this.loadConfig();
        }
        return this.config;
    }

    saveConfig(config) {
        try {
            const encryptedConfig = this.securityManager.encrypt(config);
            fs.writeFileSync(this.configPath, JSON.stringify(encryptedConfig, null, 2));
            this.config = config;
            this.logger.info('Configuration saved successfully');
        } catch (error) {
            this.logger.error('Failed to save configuration', error);
            throw error;
        }
    }

    updateConfig(updates) {
        try {
            const currentConfig = this.getConfig();
            const newConfig = { ...currentConfig, ...updates };
            this.saveConfig(newConfig);
            return newConfig;
        } catch (error) {
            this.logger.error('Failed to update configuration', error);
            throw error;
        }
    }
}

module.exports = ConfigManager;