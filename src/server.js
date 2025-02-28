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

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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
            saveUninitialized: true,
            cookie: { secure: false } // Set to true if using HTTPS
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
        
        // Set up authentication check middleware
        app.use((req, res, next) => {
            // Skip auth check for the login endpoint
            if (req.path === '/api/auth/login' || req.path === '/api/status') {
                return next();
            }

            // Check session authentication
            if (req.session.authenticated) {
                return next();
            }

            // Reject unauthenticated API requests
            if (req.path.startsWith('/api/')) {
                return res.status(401).json({ success: false, message: 'Authentication required' });
            }

            // Redirect to login page for UI requests
            res.redirect('/');
        });
        
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

// Set up API and UI routes
function setupRoutes() {
    // Serve static files from 'public' directory
    app.use(express.static(path.join(__dirname, '..', 'public')));
    
    // API Routes - Auth
    app.post('/api/auth/login', (req, res) => {
        const { password } = req.body;
        
        if (!securityManager) {
            return res.status(500).json({ success: false, message: 'Security system not initialized' });
        }
        
        if (securityManager.verifyPasswor