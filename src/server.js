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
const SecurityManager = require('./security/securityManager');
const TradingEngine = require('./trading/tradingEngine');
const TokenScanner = require('./trading/tokenScanner');
const MarketAnalyzer = require('./trading/marketAnalyzer');

class Server {
    constructor() {
        this.logger = new Logger('Server');
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server);
        
        this.configManager = new ConfigManager();
        this.securityManager = new SecurityManager();
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
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, 'public')));
    }

    setupRoutes() {
        // API Routes
        this.app.post('/api/bot/start', async (req, res) => {
            try {
                await this.tradingEngine.start();
                res.json({ success: true });
            } catch (error) {
                this.logger.error('Failed to start bot', error);
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/bot/stop', async (req, res) => {
            try {
                await this.tradingEngine.stop();
                res.json({ success: true });
            } catch (error) {
                this.logger.error('Failed to stop bot', error);
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/status', (req, res) => {
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

        this.app.get('/api/settings', (req, res) => {
            try {
                const config = this.configManager.getConfig();
                res.json(config);
            } catch (error) {
                this.logger.error('Failed to get settings', error);
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/settings', (req, res) => {
            try {
                this.configManager.updateConfig(req.body);
                res.json({ success: true });
            } catch (error) {
                this.logger.error('Failed to update settings', error);
                res.status(500).json({ error: error.message });
            }
        });

        this.app.post('/api/trades/:id/close', async (req, res) => {
            try {
                await this.tradingEngine.closeTrade(req.params.id);
                res.json({ success: true });
            } catch (error) {
                this.logger.error('Failed to close trade', error);
                res.status(500).json({ error: error.message });
            }
        });

        // Serve frontend
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
                
                console.log('\nStarting dashboard application...');
                console.log('\n========================================================');
                console.log('        CryptoSniperBot Started Successfully');
                console.log('========================================================\n');
                console.log('The dashboard should open automatically in your browser.');
                console.log(`If it doesn't, please open http://localhost:${port} manually.\n`);
                console.log('To stop the bot, press Ctrl+C in this window, or use the');
                console.log('"Stop Bot" button in the dashboard.\n\n');
            });

            if (this.configManager.getConfig().trading.autoStart) {
                await this.tradingEngine.start();
            }

        } catch (error) {
            this.logger.error('Failed to start server', error);
            process.exit(1);
        }
    }
}

// Start the server
const server = new Server();
server.start();