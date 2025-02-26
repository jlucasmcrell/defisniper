/**
 * CryptoSniperBot Server
 * Main entry point for the trading bot application
 */
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { Logger } = require('./utils/logger');
const ConfigManager = require('./config/configManager');
const SecurityManager = require('./security/securityManager');
const TradingEngine = require('./trading/tradingEngine');

// Initialize components
const logger = new Logger('Server');
const configManager = new ConfigManager();
const securityManager = new SecurityManager();

// Clean up any legacy files
securityManager.cleanupLegacyFiles();
configManager.cleanupLegacyFiles();

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize trading engine with dependencies
const tradingEngine = new TradingEngine();
tradingEngine.setDependencies(configManager, securityManager);

// API Routes
app.get('/api/status', (req, res) => {
    try {
        const status = {
            configured: configManager.isConfigured(),
            running: tradingEngine ? tradingEngine.isRunning() : false,
            version: require('../package.json').version,
            uptime: process.uptime()
        };
        res.json(status);
    } catch (error) {
        logger.error('Error getting status', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Trading Engine Routes
app.post('/api/bot/start', async (req, res) => {
    try {
        if (!configManager.isConfigured()) {
            return res.status(400).json({ error: 'Bot is not configured' });
        }
        await tradingEngine.start();
        res.json({ success: true });
    } catch (error) {
        logger.error('Error starting bot', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/bot/stop', async (req, res) => {
    try {
        await tradingEngine.stop();
        res.json({ success: true });
    } catch (error) {
        logger.error('Error stopping bot', error);
        res.status(500).json({ error: error.message });
    }
});

// Frontend Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('*', (req, res) => {
    res.redirect('/');
});

// Socket.IO
io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    
    socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
    });
});

// Start server
async function startServer() {
    try {
        console.log('\n========================================================');
        console.log('            Starting CryptoSniperBot');
        console.log('========================================================\n');

        // Check if bot is configured
        if (!configManager.isConfigured()) {
            console.error('Error: Bot is not configured.');
            console.error('Please run setup.bat first to configure the bot.\n');
            process.exit(1);
        }

        // Check encryption key
        if (!securityManager.isEncryptionKeySet()) {
            console.error('Error: Encryption key not found.');
            console.error('Please run setup.bat to set up your encryption key.\n');
            process.exit(1);
        }

        // Initialize trading engine
        await tradingEngine.initialize();
        
        // Start server
        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            logger.info(`CryptoSniperBot server running on port ${PORT}`);
            console.log(`✅ Bot started successfully on port ${PORT}\n`);
        });

        // Auto-start trading if configured
        const config = configManager.getConfig();
        if (config.trading && config.trading.autoStart) {
            await tradingEngine.start();
            logger.info('Auto-started trading engine');
        }

        // Handle shutdown
        process.on('SIGINT', async () => {
            console.log('\nShutting down...');
            if (tradingEngine && tradingEngine.isRunning()) {
                await tradingEngine.stop();
            }
            server.close();
            process.exit(0);
        });

    } catch (error) {
        logger.error('Failed to start server', error);
        console.error('\nError:', error.message);
        console.error('Failed to start the bot. Please check the logs for more details.\n');
        process.exit(1);
    }
}

// Start the server
startServer();

module.exports = app;