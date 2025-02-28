/**
 * Setup Script
 * Sets up the initial configuration for the CryptoSniperBot
 */
const readline = require('readline');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { Logger } = require('../utils/logger');
const { SecurityManager } = require('../security/securityManager');
const { ConfigManager } = require('../config/configManager');

class Setup {
    constructor() {
        this.logger = new Logger('Setup');
        this.securityManager = new SecurityManager();
        this.configManager = null;
    }

    async run() {
        try {
            await this.securityManager.initialize();
            
            // Initialize the admin password
            await this.setupPassword();
            
            // Initialize config manager after security manager is initialized
            this.configManager = new ConfigManager(this.securityManager);
            await this.configManager.initialize();
            
            // Set up default configuration
            await this.setupDefaultConfig();
            
            this.logger.info('Setup completed successfully');
            return true;
        } catch (error) {
            this.logger.error('Setup failed:', { error: error.message, stack: error.stack });
            return false;
        }
    }

    async setupPassword() {
        const password = await this.promptPassword('Enter admin password: ');
        if (!password) {
            throw new Error('Password is required');
        }
        
        await this.securityManager.setPassword(password);
        this.logger.info('Admin password set successfully');
    }

    async setupDefaultConfig() {
        try {
            const defaultConfig = this.securityManager.getDefaultConfig();
            
            // Create encrypted config
            const encryptedConfig = await this.securityManager.encryptConfig(defaultConfig);
            
            // Save the config
            await this.configManager.saveConfig(encryptedConfig);
            
            this.logger.info('Default configuration created successfully');
        } catch (error) {
            this.logger.error('Failed to set up default configuration:', error);
            throw error;
        }
    }

    promptPassword(question) {
        return new Promise((resolve) => {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            
            rl.question(question, (answer) => {
                rl.close();
                resolve(answer);
            });
        });
    }
}

// Run the setup if executed directly
if (require.main === module) {
    const setup = new Setup();
    setup.run()
        .then((success) => {
            if (success) {
                console.log('Configuration completed successfully.');
                process.exit(0);
            } else {
                console.error('Configuration failed. Please check the error messages above.');
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('Configuration failed with error:', error);
            process.exit(1);
        });
}

module.exports = { Setup };