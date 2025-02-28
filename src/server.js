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

// Ensure required directories exist first
async function ensureDirectories() {
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

// Basic middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files - Login related files without authentication
app.use('/css', express.static(path.join(__dirname, '../public/css')));
app.use('/js', express.static(path.join(__dirname, '../public/js')));

// Authentication middleware
const authenticate = (req, res, next) => {
    // Public paths that don't require authentication
    const publicPaths = [
        '/login',
        '/css/login.css',
        '/auth/login',
        '/auth/status'
    ];
    
    if (publicPaths.includes(req.path) || req.path.startsWith('/css/') || req.path.startsWith('/js/')) {
        return next();
    }
    
    if (req.session?.authenticated) {
        next();
    } else {
        if (req.accepts('html')) {
            res.redirect('/login');
        } else {
            res.status(401).json({ success: false, message: 'Authentication required' });
        }
    }
};

// Initialize the application
async function initialize() {
    try {
        // Ensure directories exist
        await ensureDirectories();
        logger.info('Required directories created');

        // Initialize security manager
        const securityManager = new SecurityManager();
        await securityManager.initialize();
        logger.info('Security manager initialized');

        // Initialize config manager
        const configManager = new ConfigManager(securityManager);
        await configManager.initialize();
        logger.info('Configuration manager initialized');

        // Session configuration
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

        // Login route - must be before authentication middleware
        app.get('/login', (req, res) => {
            if (req.session?.authenticated) {
                res.redirect('/');
            } else {
                res.sendFile(path.join(__dirname, '../public/login.html'));
            }
        });

        // Auth routes
        app.post('/auth/login', (req, res) => {
            const { password } = req.body;
            
            if (securityManager.verifyPassword(password)) {
                req.session.authenticated = true;
                res.json({ success: true });
            } else {
                res.status(401).json({ 
                    success: false, 
                    message: 'Invalid password' 
                });
            }
        });

        app.post('/auth/logout', (req, res) => {
            req.session.destroy();
            res.json({ success: true });
        });

        app.get('/auth/status', (req, res) => {
            res.json({
                authenticated: req.session?.authenticated === true,
                configured: configManager.isConfigured()
            });
        });

        // Apply authentication middleware
        app.use(authenticate);

        // Serve remaining static files (protected by authentication)
        app.use(express.static(path.join(__dirname, '../public')));

        // API routes
        app.use('/api', apiRoutes(securityManager, configManager));

        // Main route
        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../public/index.html'));
        });

        // Initialize trading engine if configured
        if (configManager.isConfigured()) {
            const config = configManager.getConfig();
            global.tradingEngine = new TradingEngine(configManager, securityManager, io);
            await global.tradingEngine.initialize();
            
            if (config.trading?.autoStart) {
                await global.tradingEngine.start();
                logger.info('Trading engine auto-started');
            }
        }

        // Start the server
        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            logger.info(`CryptoSniperBot server running on port ${PORT}`);
        });

        // WebSocket connection handling
        io.on('connection', (socket) => {
            logger.info(`Client connected: ${socket.id}`);
            
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

// Graceful shutdown
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