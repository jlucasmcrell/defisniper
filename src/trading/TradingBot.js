import { BinanceConnector } from './exchanges/BinanceConnector';
import { CryptoComConnector } from './exchanges/CryptoComConnector';
import { Web3Connector } from './web3/Web3Connector';
import { logger } from '../utils/logger';
import { secureConfig } from '../js/secure-config/manager';

export class TradingBot {
    constructor() {
        this.exchanges = new Map();
        this.web3 = null;
        this.strategies = new Map();
        this.isRunning = false;
    }

    async initialize() {
        try {
            // Load configurations
            const configs = secureConfig.getAllConfigs();

            // Initialize exchanges
            if (configs['binance-us']) {
                const binance = new BinanceConnector(configs['binance-us']);
                await binance.initialize();
                this.exchanges.set('binance-us', binance);
            }

            if (configs['crypto-com']) {
                const cryptoCom = new CryptoComConnector(configs['crypto-com']);
                await cryptoCom.initialize();
                this.exchanges.set('crypto-com', cryptoCom);
            }

            // Initialize Web3 if configured
            if (configs['infura']) {
                this.web3 = new Web3Connector(configs['infura']);
                await this.web3.initialize();
            }

            logger.info('Trading bot initialized successfully');
            return true;
        } catch (error) {
            logger.error('Failed to initialize trading bot:', error);
            throw error;
        }
    }

    async start() {
        if (this.isRunning) {
            logger.warn('Bot is already running');
            return;
        }

        try {
            // Start exchange connections
            for (const [name, exchange] of this.exchanges) {
                await exchange.connect();
                logger.info(`Connected to ${name}`);
            }

            // Start trading strategies
            for (const strategy of this.strategies.values()) {
                await strategy.start();
            }

            this.isRunning = true;
            logger.info('Trading bot started successfully');
        } catch (error) {
            logger.error('Failed to start trading bot:', error);
            throw error;
        }
    }

    async stop() {
        if (!this.isRunning) {
            logger.warn('Bot is not running');
            return;
        }

        try {
            // Stop all strategies
            for (const strategy of this.strategies.values()) {
                await strategy.stop();
            }

            // Disconnect exchanges
            for (const exchange of this.exchanges.values()) {
                await exchange.disconnect();
            }

            this.isRunning = false;
            logger.info('Trading bot stopped successfully');
        } catch (error) {
            logger.error('Failed to stop trading bot:', error);
            throw error;
        }
    }
}