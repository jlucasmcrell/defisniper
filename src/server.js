/**
 * CryptoSniperBot Server
 * Main entry point for the application
 */
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const { Logger } = require('./utils/logger');
const ConfigManager = require('./config/configManager');
const TradingEngine = require('./trading/tradingEngine');
const TokenScanner = require('./trading/tokenScanner');
const MarketAnalyzer = require('./trading/marketAnalyzer');

class Server {
    constructor(securityManager) {
        if (!securityManager) {
            throw new Error('SecurityManager is required');
        }

        this.logger = new Logger('Server');
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        
        this.securityManager = securityManager;
        this.configManager = new ConfigManager(this.securityManager);
        this.marketAnalyzer = new MarketAnalyzer(this.configManager);
        this.tokenScanner = new TokenScanner(this.configManager);
        this.tradingEngine = new TradingEngine(
            this.configManager,
            this.securityManager,
            this.marketAnalyzer,
            this.tokenScanner
        );

        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
    }

    setupMiddleware() {
        // CORS configuration
        this.app.use(cors({
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));

        // JSON body parser
        this.app.use(express.json());

        // Serve static files from the public directory
        this.app.use(express.static(path.join(__dirname, 'public')));

        // Error handling middleware
        this.app.use((err, req, res, next) => {
            this.logger.error('Express error:', err);
            res.status(500).json({ error: err.message });
        });
    }

    setupRoutes() {
        // API Routes
        const apiRouter = express.Router();

        apiRouter.post('/bot/start', async (req, res) => {
            try {
                await this.tradingEngine.start();
                res.json({ success: true, message: 'Bot started successfully' });
            } catch (error) {
                this.logger.error('Failed to start bot', error);
                res.status(500).json({ error: error.message });
            }
        });

        apiRouter.post('/bot/stop', async (req, res) => {
            try {
                await this.tradingEngine.stop();
                res.json({ success: true, message: 'Bot stopped successfully' });
            } catch (error) {
                this.logger.error('Failed to stop bot', error);
                res.status(500).json({ error: error.message });
            }
        });

        apiRouter.get('/status', (req, res) => {
            try {
                const status = {
                    running: this.tradingEngine.isRunning,
                    stats: this.tradingEngine.getStats(),
                    trades: {
                        active: Array.from(this.tradingEngine.activeTrades.values()),
                        history: this.tradingEngine.tradeHistory
                    }
                };
                res.json(status);
            } catch (error) {
                this.logger.error('Failed to get status', error);
                res.status(500).json({ error: error.message });
            }
        });

        apiRouter.get('/settings', (req, res) => {
            try {
                const config = this.configManager.getConfig();
                res.json(config);
            } catch (error) {
                this.logger.error('Failed to get settings', error);
                res.status(500).json({ error: error.message });
            }
        });

        apiRouter.post('/settings', (req, res) => {
            try {
                this.configManager.updateConfig(req.body);
                res.json({ success: true, message: 'Settings updated successfully' });
            } catch (error) {
                this.logger.error('Failed to update settings', error);
                res.status(500).json({ error: error.message });
            }
        });

        apiRouter.post('/trades/:id/close', async (req, res) => {
            try {
                await this.tradingEngine.closeTrade(req.params.id);
                res.json({ success: true, message: 'Trade closed successfully' });
            } catch (error) {
                this.logger.error('Failed to close trade', error);
                res.status(500).json({ error: error.message });
            }
        });

        // Mount API routes
        this.app.use('/api', apiRouter);

        // Serve frontend for all other routes
        this.app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });
    }

    setupWebSocket() {
        this.io.on('connection', (socket) => {
            this.logger.info(`Client connected: ${socket.id}`);

            socket.on('disconnect', () => {
                this.logger.info(`Client disconnected: ${socket.id}`);
            });
        });

        // Trading Engine Events
        this.tradingEngine.on('status', (status) => {
            this.io.emit('botStatus', status);
        });

        this.tradingEngine.on('newTrade', (trade) => {
            this.io.emit('tradeUpdate', {
                active: Array.from(this.tradingEngine.activeTrades.values()),
                history: this.tradingEngine.tradeHistory
            });
        });

        this.tradingEngine.on('tradeClosed', (trade) => {
            this.io.emit('tradeUpdate', {
                active: Array.from(this.tradingEngine.activeTrades.values()),
                history: this.tradingEngine.tradeHistory
            });
            this.io.emit('statsUpdate', this.tradingEngine.getStats());
        });
    }

    async start() {
        try {
            const port = process.env.PORT || 3000;

            // Initialize components
            await this.tradingEngine.initialize();

            // Start server
            this.server.listen(port, () => {
                this.logger.info(`CryptoSniperBot server running on port ${port}`);
            });

            if (this.configManager.getConfig().trading.autoStart) {
                await this.tradingEngine.start();
            }

        } catch (error) {
            this.logger.error('Failed to start server', error);
            throw error;
        }
    }

    stop() {
        this.server.close(() => {
            this.logger.info('CryptoSniperBot server stopped');
        });
    }
}

// Start the server
if (require.main === module) {
    const securityManager = new (require('./security/securityManager'))();
    const server = new Server(securityManager);
    server.start().catch(error => {
        console.error('Failed to start server:', error);
        process.exit(1);
    });
}

module.exports = Server;