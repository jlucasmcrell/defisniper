/**
 * Trading Engine
 * 
 * Core trading engine that handles:
 * - Market scanning
 * - Price updates
 * - Strategy execution
 * - Trade management
 */

const { Web3 } = require('web3');
const { Logger } = require('../utils/logger');
const { ConfigManager } = require('../config/configManager');
const { SecurityManager } = require('../security/securityManager');
const { EthereumConnector } = require('../blockchain/ethereumConnector');
const { BnbChainConnector } = require('../blockchain/bnbChainConnector');
const { TokenScanner } = require('./tokenScanner');
const { PriceManager } = require('./priceManager');
const { StrategyManager } = require('./strategyManager');
const { TradeManager } = require('./tradeManager');

class TradingEngine {
    constructor() {
        this.logger = new Logger('TradingEngine');
        this.configManager = new ConfigManager();
        this.securityManager = new SecurityManager();
        this.isInitialized = false;
        this.isRunning = false;
        this.mainLoopInterval = null;
        
        // Components will be initialized in init()
        this.ethereumConnector = null;
        this.bnbChainConnector = null;
        this.tokenScanner = null;
        this.priceManager = null;
        this.strategyManager = null;
        this.tradeManager = null;
    }

    /**
     * Initialize the trading engine and all its components
     */
    async init() {
        try {
            this.logger.info('Initializing trading engine...');

            // Get configuration
            const config = this.configManager.getConfig();
            if (!config || !this.configManager.isConfigured()) {
                throw new Error('Bot not configured');
            }

            // Decrypt sensitive configuration
            const decryptedConfig = this.securityManager.decryptConfig(config);

            // Initialize Ethereum if enabled
            if (decryptedConfig.ethereum && decryptedConfig.ethereum.enabled) {
                this.logger.info('Initializing Ethereum connector');
                try {
                    let web3Provider;
                    if (decryptedConfig.ethereum.provider === 'infura') {
                        web3Provider = `https://mainnet.infura.io/v3/${decryptedConfig.ethereum.infuraId}`;
                    } else {
                        throw new Error('Invalid Ethereum provider configuration');
                    }

                    const web3 = new Web3(web3Provider);
                    
                    // Ensure private key is properly formatted
                    let privateKey = decryptedConfig.ethereum.privateKey;
                    if (typeof privateKey !== 'string') {
                        throw new Error('Invalid private key format');
                    }
                    if (!privateKey.startsWith('0x')) {
                        privateKey = '0x' + privateKey;
                    }

                    this.ethereumConnector = new EthereumConnector(
                        web3,
                        privateKey,
                        this.logger
                    );
                    await this.ethereumConnector.init();
                } catch (error) {
                    this.logger.error('Failed to initialize Ethereum connector', error);
                    throw error;
                }
            }

            // Initialize BNB Chain if enabled
            if (decryptedConfig.bnbChain && decryptedConfig.bnbChain.enabled) {
                this.logger.info('Initializing BNB Chain connector');
                try {
                    const web3 = new Web3('https://bsc-dataseed1.binance.org:443');
                    
                    // Ensure private key is properly formatted
                    let privateKey = decryptedConfig.bnbChain.privateKey;
                    if (typeof privateKey !== 'string') {
                        throw new Error('Invalid private key format');
                    }
                    if (!privateKey.startsWith('0x')) {
                        privateKey = '0x' + privateKey;
                    }

                    this.bnbChainConnector = new BnbChainConnector(
                        web3,
                        privateKey,
                        this.logger
                    );
                    await this.bnbChainConnector.init();
                } catch (error) {
                    this.logger.error('Failed to initialize BNB Chain connector', error);
                    throw error;
                }
            }

            // Initialize supporting components
            this.tokenScanner = new TokenScanner(
                this.ethereumConnector,
                this.bnbChainConnector,
                this.logger
            );

            this.priceManager = new PriceManager(
                this.ethereumConnector,
                this.bnbChainConnector,
                this.logger
            );

            this.strategyManager = new StrategyManager(
                decryptedConfig.strategies,
                this.priceManager,
                this.logger
            );

            this.tradeManager = new TradeManager(
                decryptedConfig.trading,
                this.ethereumConnector,
                this.bnbChainConnector,
                this.priceManager,
                this.logger
            );

            this.isInitialized = true;
            this.logger.info('Trading engine initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize trading engine', error);
            throw error;
        }
    }

    /**
     * Start the trading engine
     */
    async start() {
        if (!this.isInitialized) {
            throw new Error('Trading engine not initialized');
        }

        if (this.isRunning) {
            this.logger.warn('Trading engine already running');
            return;
        }

        try {
            this.logger.info('Starting trading engine...');
            
            // Start price updates
            await this.priceManager.start();
            
            // Start trade management
            await this.tradeManager.start();
            
            // Start main trading loop
            this.isRunning = true;
            this.mainLoopInterval = setInterval(
                () => this.mainLoop(),
                10000 // Run every 10 seconds
            );

            this.logger.info('Trading engine started successfully');
        } catch (error) {
            this.logger.error('Failed to start trading engine', error);
            this.stop();
            throw error;
        }
    }

    /**
     * Stop the trading engine
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }

        try {
            this.logger.info('Stopping trading engine...');
            
            // Stop main loop
            this.isRunning = false;
            if (this.mainLoopInterval) {
                clearInterval(this.mainLoopInterval);
                this.mainLoopInterval = null;
            }

            // Stop components
            await this.priceManager.stop();
            await this.tradeManager.stop();

            this.logger.info('Trading engine stopped successfully');
        } catch (error) {
            this.logger.error('Error stopping trading engine', error);
            throw error;
        }
    }

    /**
     * Main trading loop
     */
    async mainLoop() {
        try {
            this.logger.debug('Running main trading loop');

            // Scan for new tokens
            if (this.ethereumConnector) {
                this.logger.debug('Scanning ethereum for new tokens');
                await this.tokenScanner.scanEthereum();
            }
            
            if (this.bnbChainConnector) {
                this.logger.debug('Scanning bnbChain for new tokens');
                await this.tokenScanner.scanBnbChain();
            }

            // Update price data
            try {
                await this.priceManager.updatePrices();
            } catch (error) {
                this.logger.error('Error updating price data', error);
            }

            // Execute strategies
            await this.strategyManager.executeStrategies();

            // Manage ongoing trades
            await this.tradeManager.manageTrades();

        } catch (error) {
            this.logger.error('Error in main trading loop', error);
        }
    }

    /**
     * Get engine status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            running: this.isRunning,
            ethereumEnabled: !!this.ethereumConnector,
            bnbChainEnabled: !!this.bnbChainConnector,
            activeTrades: this.tradeManager ? this.tradeManager.getActiveTradesCount() : 0
        };
    }
}

module.exports = { TradingEngine };