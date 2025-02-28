const fs = require('fs').promises;
const path = require('path');
const { Logger } = require('../utils/logger');
const { SecurityManager } = require('../security/securityManager');
const { ConfigManager } = require('../config/configManager');

class Setup {
    constructor() {
        this.logger = new Logger('Setup');
        this.securityManager = null;
        this.configManager = null;
    }

    async run() {
        try {
            // Create required directories
            await this.createDirectories();

            // Initialize security manager
            this.securityManager = new SecurityManager();
            await this.securityManager.initialize();

            // Generate new encryption key if it doesn't exist
            if (await this.securityManager.generateKey()) {
                this.logger.info('Generated new encryption key');
            }

            // Initialize config manager with security manager
            this.configManager = new ConfigManager(this.securityManager);
            await this.configManager.initialize();

            // Create default configuration
            const defaultConfig = this.configManager.getDefaultConfig();
            await this.configManager.updateConfig(defaultConfig);

            return true;
        } catch (error) {
            this.logger.error('Setup failed:', error);
            throw error;
        }
    }

    async createDirectories() {
        const dirs = [
            path.join(process.cwd(), 'logs'),
            path.join(process.cwd(), 'data'),
            path.join(process.cwd(), 'secure-config')
        ];

        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                if (error.code !== 'EEXIST') {
                    throw error;
                }
            }
        }
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    const setup = new Setup();
    setup.run()
        .then(() => {
            console.log('Configuration completed successfully.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Configuration failed. Please check the error messages above.');
            process.exit(1);
        });
}

module.exports = Setup;