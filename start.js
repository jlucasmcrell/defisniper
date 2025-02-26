/**
 * CryptoSniperBot Startup Script
 * Handles application initialization
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const Server = require('./src/server');
const SecurityManager = require('./src/security/securityManager');
const { Logger } = require('./src/utils/logger');

class BotStarter {
    constructor() {
        this.server = null;
        this.isWindows = process.platform === 'win32';
        this.logger = new Logger('BotStarter');
        this.securityManager = new SecurityManager();
    }

    async start() {
        console.log('\n========================================================');
        console.log('            Starting CryptoSniperBot');
        console.log('========================================================\n');

        try {
            // Check if setup is complete
            const setupComplete = await this.checkSetup();
            if (!setupComplete) {
                throw new Error('Please run setup.bat first to configure the bot');
            }

            // Create necessary directories
            this.ensureDirectories();

            // Initialize security manager first
            await this.securityManager.initialize();

            // Initialize and start the server with the initialized security manager
            this.server = new Server(this.securityManager);
            await this.server.start();

            // Open the browser
            this.openBrowser();

            // Handle process termination
            this.handleProcessTermination();

        } catch (error) {
            this.logger.error('Failed to start CryptoSniperBot:', error);
            console.error('\nError: Bot crashed or failed to start');
            console.error('Check the logs for more information\n');
            process.exit(1);
        }
    }

    async checkSetup() {
        const secureConfigPath = path.join(__dirname, 'secure-config');
        const requiredFiles = [
            'config.json',
            'security.json',
            'encryption.key'
        ];

        try {
            // Check if secure-config directory exists
            if (!fs.existsSync(secureConfigPath)) {
                this.logger.error('secure-config directory not found');
                return false;
            }

            // Check for required files
            for (const file of requiredFiles) {
                const filePath = path.join(secureConfigPath, file);
                if (!fs.existsSync(filePath)) {
                    this.logger.error(`Required file not found: ${file}`);
                    return false;
                }
            }

            // Read security.json to check initialization status
            const securityConfig = JSON.parse(
                fs.readFileSync(path.join(secureConfigPath, 'security.json'), 'utf8')
            );

            if (!securityConfig.initialized) {
                this.logger.error('Security configuration not initialized');
                return false;
            }

            return true;
        } catch (error) {
            this.logger.error('Failed to check setup:', error);
            return false;
        }
    }

    ensureDirectories() {
        const dirs = [
            path.join(__dirname, 'logs'),
            path.join(__dirname, 'data')
        ];

        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                this.logger.info(`Created directory: ${dir}`);
            }
        });
    }

    openBrowser() {
        const url = 'http://localhost:3000';
        const start = this.isWindows ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';

        spawn(start, [url], {
            shell: true,
            stdio: 'ignore'
        });

        console.log('\n========================================================');
        console.log('        CryptoSniperBot Started Successfully');
        console.log('========================================================\n');
        console.log(`Dashboard: ${url}`);
        console.log('\nTo stop the bot, press Ctrl+C\n');
    }

    handleProcessTermination() {
        const cleanup = () => {
            console.log('\nShutting down CryptoSniperBot...');
            if (this.server) {
                this.server.stop();
            }
            process.exit(0);
        };

        process.on('SIGTERM', cleanup);
        process.on('SIGINT', cleanup);
        process.on('SIGHUP', cleanup);

        if (this.isWindows) {
            process.on('SIGBREAK', cleanup);
        }

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            this.logger.error('Uncaught Exception:', error);
            cleanup();
        });

        process.on('unhandledRejection', (error) => {
            this.logger.error('Unhandled Rejection:', error);
            cleanup();
        });
    }
}

// Start the bot
const starter = new BotStarter();
starter.start();