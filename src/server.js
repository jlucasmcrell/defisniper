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

    // ... (rest of the Server class implementation remains the same)
}

module.exports = Server;