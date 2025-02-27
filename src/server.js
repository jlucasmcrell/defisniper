/**
 * CryptoSniperBot Server
 * 
 * This file contains the Express server that serves the UI and handles API requests.
 * It also initializes the trading engine and WebSocket connections.
 */

const express = require('express');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const socketIo = require('socket.io');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const { TradingEngine } = require('./trading/engine');
const SecurityManager = require('./security/securityManager');
const ConfigManager = require('./config/configManager');
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

// Create required directories if they don't exist
const ensureDirectoriesExist = () => {
  const dirs = ['logs', 'data', 'secure-config'];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

ensureDirectoriesExist();

// Initialize security manager
const securityManager = new SecurityManager();

// Load configuration
const configManager = new ConfigManager(securityManager);
const config = configManager.getConfig();

// Setup Express middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Session management
app.use(session({
  secret: securityManager.getSessionSecret(),
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 3600000 }, // 1 hour
  genid: () => uuidv4()
}));

// Authentication middleware
const authenticate = (req, res, next) => {
  if (req.session.authenticated) {
    next();
  } else {
    res.status(401).json({ success: false, message: 'Authentication required' });
  }
};

// API routes
app.use('/api', apiRoutes(securityManager, configManager));

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

// Add login route
app.get('/login', (req, res) => {
    if (req.session.authenticated) {
        res.redirect('/');
    } else {
        res.sendFile(path.join(__dirname, '../public/login.html'));
    }
});

// Check if the bot is configured
app.get('/api/status', (req, res) => {
  res.json({
    configured: configManager.isConfigured(),
    running: global.tradingEngine ? global.tradingEngine.isRunning() : false,
    version: version
  });
});

// Update main route to check authentication
app.get('/', (req, res) => {
    if (req.session.authenticated) {
        res.sendFile(path.join(__dirname, '../public/index.html'));
    } else {
        res.redirect('/login');
    }
});

// Socket.io connection
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  // Send initial data
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

// Initialize trading engine if configured
if (configManager.isConfigured()) {
  try {
    const encryptionKey = securityManager.getEncryptionKey();
    
    if (encryptionKey) {
      global.tradingEngine = new TradingEngine(configManager, securityManager, io);
      global.tradingEngine.initialize()
        .then(() => {
          logger.info('Trading engine initialized successfully');
          
          // Auto-start if configured
          if (config.autoStart) {
            global.tradingEngine.start()
              .then(() => logger.info('Trading engine auto-started'))
              .catch(err => logger.error('Failed to auto-start trading engine', err));
          }
        })
        .catch(err => {
          logger.error('Failed to initialize trading engine', err);
        });
    } else {
      logger.warn('Encryption key not available, trading engine not initialized');
    }
  } catch (err) {
    logger.error('Error initializing trading engine', err);
  }
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`CryptoSniperBot server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down server...');
  
  if (global.tradingEngine && global.tradingEngine.isRunning()) {
    logger.info('Stopping trading engine...');
    await global.tradingEngine.stop();
  }
  
  server.close(() => {
    logger.info('Server stopped');
    process.exit(0);
  });
});

module.exports = { app, server, io };