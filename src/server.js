/**
 * Web Server for CryptoSniperBot
 * Provides a web interface and REST API for the trading bot
 */
const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Logger } = require('./utils/logger');
const { ConfigManager } = require('./config/configManager');
const { SecurityManager } = require('./security/securityManager');
const { TradingEngine } = require('./trading/engine');

// Initialize logger
const logger = new Logger('Server');

// Express App Setup
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Global state
let securityManager = null;
let configManager = null;
let tradingEngine = null;
let authenticated = false;

// Initialize application components
async function initialize() {
    try {
        // Initialize security manager
        securityManager = new SecurityManager();
        const securityInitialized = await securityManager.initialize();
        if (!securityInitialized) {
            logger.error('Failed to initialize security manager');
            return false;
        }
        
        // Set up session middleware with the generated secret
        app.use(session({
            secret: securityManager.getSessionSecret(),
            resave: false,
            saveUninitialized: false, // Changed to false to prevent empty sessions
            cookie: { 
                secure: false, // Set to true if using HTTPS
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            }
        }));

        // Initialize config manager
        configManager = new ConfigManager(securityManager);
        const configInitialized = await configManager.initialize();
        if (!configInitialized) {
            logger.error('Failed to initialize configuration manager');
            return false;
        }
        
        // Initialize trading engine with socket.io for real-time updates
        tradingEngine = new TradingEngine(configManager, securityManager, io);
        const engineInitialized = await tradingEngine.initialize();
        if (!engineInitialized) {
            logger.error('Failed to initialize trading engine');
            // Continue anyway, with limited functionality
        }
        
        // Set up middleware
        setupMiddleware();
        
        // Set up routes
        setupRoutes();
        
        // Set up Socket.IO events
        setupSocketIO();
        
        return true;
    } catch (error) {
        logger.error('Initialization error', error);
        return false;
    }
}

// Set up middleware
function setupMiddleware() {
    // CORS middleware
    app.use(cors({
        origin: true,
        credentials: true
    }));
    
    // Body parser middleware
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    
    // Logging middleware
    app.use((req, res, next) => {
        logger.info(`${req.method} ${req.path}`);
        next();
    });
}

// Set up API and UI routes
function setupRoutes() {
    // API Routes - Auth
    app.post('/api/auth/login', (req, res) => {
        const { password } = req.body;
        
        if (!securityManager) {
            return res.status(500).json({ success: false, message: 'Security system not initialized' });
        }
        
        if (securityManager.verifyPassword(password)) {
            req.session.authenticated = true;
            authenticated = true;
            logger.info('User authenticated successfully');
            return res.json({ success: true, message: 'Login successful' });
        } else {
            logger.warn('Authentication failed - incorrect password');
            return res.status(401).json({ success: false, message: 'Invalid password' });
        }
    });
    
    app.post('/api/auth/logout', (req, res) => {
        req.session.authenticated = false;
        authenticated = false;
        req.session.destroy(err => {
            if (err) {
                logger.error('Error destroying session', err);
                return res.status(500).json({ success: false, message: 'Failed to logout' });
            }
            logger.info('User logged out');
            res.json({ success: true, message: 'Logout successful' });
        });
    });
    
    app.get('/api/auth/status', (req, res) => {
        res.json({ 
            authenticated: !!req.session.authenticated,
            initialized: !!tradingEngine,
            running: tradingEngine ? tradingEngine.isRunning() : false
        });
    });
    
    // Authentication middleware for protected API routes
    app.use('/api', (req, res, next) => {
        // Skip auth check for these specific endpoints
        if (req.path === '/auth/login' || req.path === '/auth/status') {
            return next();
        }

        // Check session authentication for API routes
        if (req.session.authenticated) {
            return next();
        } else {
            logger.warn('Unauthorized API access attempt');
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
    });
    
    // API Routes - Configuration
    app.get('/api/config', (req, res) => {
        if (!configManager) {
            return res.status(500).json({ success: false, message: 'Config manager not initialized' });
        }
        
        // Get masked configuration (no sensitive data)
        const maskedConfig = getMaskedConfig(configManager.getConfig());
        res.json({ success: true, config: maskedConfig });
    });
    
    app.post('/api/config', async (req, res) => {
        if (!configManager || !securityManager) {
            return res.status(500).json({ success: false, message: 'Config/Security manager not initialized' });
        }
        
        try {
            const newConfig = req.body.config;
            
            // Encrypt and save the new configuration
            const encryptedConfig = await securityManager.encryptConfig(newConfig);
            await configManager.saveConfig(encryptedConfig);
            
            res.json({ success: true, message: 'Configuration saved successfully' });
        } catch (error) {
            logger.error('Failed to save configuration', error);
            res.status(500).json({ success: false, message: 'Failed to save configuration' });
        }
    });
    
    // API Routes - Trading Engine Control
    app.post('/api/bot/start', async (req, res) => {
        if (!tradingEngine) {
            return res.status(500).json({ success: false, message: 'Trading engine not initialized' });
        }
        
        try {
            if (tradingEngine.isRunning()) {
                return res.json({ success: true, message: 'Bot is already running' });
            }
            
            const started = await tradingEngine.start();
            if (started) {
                res.json({ success: true, message: 'Bot started successfully' });
            } else {
                res.status(500).json({ success: false, message: 'Failed to start bot' });
            }
        } catch (error) {
            logger.error('Failed to start bot', error);
            res.status(500).json({ success: false, message: `Failed to start bot: ${error.message}` });
        }
    });
    
    app.post('/api/bot/stop', async (req, res) => {
        if (!tradingEngine) {
            return res.status(500).json({ success: false, message: 'Trading engine not initialized' });
        }
        
        try {
            if (!tradingEngine.isRunning()) {
                return res.json({ success: true, message: 'Bot is not running' });
            }
            
            const stopped = await tradingEngine.stop();
            if (stopped) {
                res.json({ success: true, message: 'Bot stopped successfully' });
            } else {
                res.status(500).json({ success: false, message: 'Failed to stop bot' });
            }
        } catch (error) {
            logger.error('Failed to stop bot', error);
            res.status(500).json({ success: false, message: `Failed to stop bot: ${error.message}` });
        }
    });
    
    // API Routes - Data
    app.get('/api/trades', (req, res) => {
        if (!tradingEngine) {
            return res.status(500).json({ success: false, message: 'Trading engine not initialized' });
        }
        
        const activeTrades = tradingEngine.getActiveTrades();
        const tradeHistory = tradingEngine.getTradeHistory();
        
        res.json({ 
            success: true, 
            activeTrades, 
            tradeHistory 
        });
    });
    
    app.get('/api/balances', (req, res) => {
        if (!tradingEngine) {
            return res.status(500).json({ success: false, message: 'Trading engine not initialized' });
        }
        
        const balances = tradingEngine.getBalances();
        
        res.json({ 
            success: true, 
            balances 
        });
    });
    
    app.get('/api/stats', (req, res) => {
        if (!tradingEngine) {
            return res.status(500).json({ success: false, message: 'Trading engine not initialized' });
        }
        
        const stats = tradingEngine.getStats();
        
        res.json({ 
            success: true, 
            stats 
        });
    });

    // Serve static files from 'public' directory - AFTER API routes
    app.use(express.static(path.join(__dirname, '..', 'public')));
    
    // Catch-all route to serve React app for any path not matched
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    });
}

// Set up Socket.IO events
function setupSocketIO() {
    io.on('connection', (socket) => {
        logger.info('User connected to websocket');
        
        socket.on('authenticate', (data) => {
            if (data && data.authenticated === true) {
                socket.join('authenticated');
                socket.emit('authenticated', { success: true });
            }
        });
        
        socket.on('disconnect', () => {
            logger.info('User disconnected from websocket');
        });
    });
}

// Helper function to mask sensitive data in the configuration
function getMaskedConfig(config) {
    if (!config) return {};
    
    const maskedConfig = JSON.parse(JSON.stringify(config));
    
    // Mask API keys and private keys
    if (maskedConfig.ethereum && maskedConfig.ethereum.privateKey) {
        maskedConfig.ethereum.privateKey = maskedConfig.ethereum.privateKey.replace(/./g, '*');
    }
    
    if (maskedConfig.bnbChain && maskedConfig.bnbChain.privateKey) {
        maskedConfig.bnbChain.privateKey = maskedConfig.bnbChain.privateKey.replace(/./g, '*');
    }
    
    if (maskedConfig.exchanges) {
        if (maskedConfig.exchanges.binanceUS && maskedConfig.exchanges.binanceUS.apiSecret) {
            maskedConfig.exchanges.binanceUS.apiSecret = maskedConfig.exchanges.binanceUS.apiSecret.replace(/./g, '*');
        }
        
        if (maskedConfig.exchanges.cryptoCom && maskedConfig.exchanges.cryptoCom.apiSecret) {
            maskedConfig.exchanges.cryptoCom.apiSecret = maskedConfig.exchanges.cryptoCom.apiSecret.replace(/./g, '*');
        }
    }
    
    return maskedConfig;
}

// Start the server
const PORT = process.env.PORT || 3000;

// Initialize and start the server
initialize()
    .then(success => {
        if (!success) {
            logger.error('Failed to initialize app');
        }
        
        server.listen(PORT, () => {
            logger.info(`CryptoSniperBot server running on port ${PORT}`);
        });
    })
    .catch(error => {
        logger.error('Fatal error during initialization', error);
    });