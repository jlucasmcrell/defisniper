/**
 * CryptoSniperBot Server
 */
const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const socketIo = require('socket.io');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const { TradingEngine } = require('./trading/engine');
const { SecurityManager } = require('./security/securityManager');
const { ConfigManager } = require('./config/configManager');
const { Logger } = require('./utils/logger');
const apiRoutes = require('./routes/api');
const { version } = require('../package.json');

// Initialize logger
const logger = new Logger('Server');

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

/**
 * Ensure required directories exist
 */
async function ensureDirectories() {
    const dirs = ['logs', 'data', 'secure-config'].map(dir => 
        path.join(process.cwd(), dir)
    );
    
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

/**
 * Initialize security components
 */
async function initializeSecurity() {
    const securityManager = new SecurityManager();
    await securityManager.initialize();
    return securityManager;
}

/**
 * Initialize configuration
 */
async function initializeConfig(securityManager) {
    const configManager = new ConfigManager(securityManager);
    await configManager.initialize();
    return configManager;
}

/**
 * Initialize trading engine
 */
async function initializeTradingEngine(configManager, securityManager) {
    try {
        if (!configManager.isConfigured()) {
            logger.info('Trading engine not initialized - configuration required');
            return null;
        }

        const engine = new TradingEngine(configManager, securityManager, io);
        await engine.initialize();
        logger.info('Trading engine initialized successfully');
        
        // Store engine instance globally
        global.tradingEngine = engine;
        
        // Auto-start if configured
        const config = configManager.getConfig();
        if (config.trading?.autoStart) {
            await engine.start();
            logger.info('Trading engine auto-started');
        }
        
        return engine;
    } catch (error) {
        logger.error('Failed to initialize trading engine', error);
        return null;
    }
}

/**
 * Main initialization function
 */
async function initialize() {
    try {
        // Ensure directories exist first
        await ensureDirectories();
        logger.info('Required directories created');

        // Initialize security manager
        const securityManager = await initializeSecurity();
        logger.info('Security manager initialized');

        // Initialize config manager
        const configManager = await initializeConfig(securityManager);
        logger.info('Configuration manager initialized');

        // Configure session middleware
        app.use(session({
            secret: securityManager.getSessionSecret(),
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: process.env.NODE_ENV === 'production',
                maxAge: 3600000,
                httpOnly: true
            },
            genid: () => uuidv4()
        }));

        // Configure other middleware
        app.use(cors());
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));

        // Authentication middleware
        const authenticate = (req, res, next) => {
            if (req.path === '/login' || req.path === '/auth/login' || req.path === '/auth/status') {
                return next();
            }
            
            if (req.session.authenticated) {
                next();
            } else {
                if (req.accepts('html')) {
                    res.redirect('/login');
                } else {
                    res.status(401).json({ success: false, message: 'Authentication required' });
                }
            }
        };

        // Auth routes
        app.post('/auth/login', (req, res) => {
            const { password } = req.body;
            
            if (securityManager.verifyPassword(password)) {
                req.session.authenticated = true;
                res.json({ success: true });
            } else {
                res.status(401).json({ success: false, message: 'Invalid password' });
            }
        });

        app.post('/auth/logout', (req, res) => {
            req.session.destroy();
            res.json({ success: true });
        });

        app.get('/auth/status', (req, res) => {
            res.json({
                authenticated: req.session.authenticated === true,
                configured: configManager.isConfigured()
            });
        });

        // Apply authentication middleware
        app.use(authenticate);

        // Serve static files
        app.use(express.static(path.join(__dirname, '../public')));

        // Mount API routes
        app.use('/api', apiRoutes(securityManager, configManager));

        // Initialize trading engine
        await initializeTradingEngine(configManager, securityManager);

        // Start server
        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            logger.info(`CryptoSniperBot server running on port ${PORT}`);
        });

        // Handle WebSocket connections
        io.on('connection', (socket) => {
            logger.info(`Client connected: ${socket.id}`);
            
            // Send initial bot status
            if (global.tradingEngine) {
                socket.emit('botStatus', {
                    running: global.tradingEngine.isRunning(),
                    activeTrades: global.tradingEngine.getActiveTrades(),
                    balances: global.tradingEngine.getBalances(),
                    stats: global.tradingEngine.getStats()
                });
            }
            
            socket.on('disconnect', () => {
                logger.info(`Client disconnected: ${socket.id}`);
            });
        });

    } catch (error) {
        logger.error('Server initialization failed', error);
        process.exit(1);
    }
}

// Handle shutdown
process.on('SIGINT', async () => {
    logger.info('Shutting down server...');
    
    if (global.tradingEngine?.isRunning()) {
        logger.info('Stopping trading engine...');
        await global.tradingEngine.stop();
    }
    
    server.close(() => {
        logger.info('Server stopped');
        process.exit(0);
    });
});

// Start the server
initialize().catch(error => {
    logger.error('Failed to start server', error);
    process.exit(1);
});

module.exports = { app, server, io };