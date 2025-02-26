/**
 * Token Scanner for CryptoSniperBot
 * Scans for new tokens and monitors existing ones
 */
const { EventEmitter } = require('events');
const { ethers } = require('ethers');
const { Logger } = require('../utils/logger');
const { Token } = require('@uniswap/sdk');
const IERC20 = require('../contracts/IERC20.json');
const IUniswapV2Factory = require('../contracts/IUniswapV2Factory.json');
const IPancakeFactory = require('../contracts/IPancakeFactory.json');

class TokenScanner extends EventEmitter {
    constructor(configManager) {
        super();
        this.configManager = configManager;
        this.logger = new Logger('TokenScanner');
        this.isRunning = false;
        this.scanInterval = null;
        this.providers = new Map();
        this.factories = new Map();
        this.knownTokens = new Map();
        this.lastScanned = new Map();
    }

    async initialize() {
        try {
            const config = this.configManager.getConfig();

            // Initialize providers
            if (config.ethereum && config.ethereum.enabled) {
                const ethProvider = new ethers.providers.JsonRpcProvider(
                    `https://mainnet.infura.io/v3/${config.ethereum.infuraId}`
                );
                this.providers.set('ethereum', ethProvider);
                
                // Initialize Uniswap factory
                const uniswapFactory = new ethers.Contract(
                    config.ethereum.uniswapFactoryAddress,
                    IUniswapV2Factory.abi,
                    ethProvider
                );
                this.factories.set('uniswap', uniswapFactory);
            }

            if (config.bnbChain && config.bnbChain.enabled) {
                const bscProvider = new ethers.providers.JsonRpcProvider(
                    'https://bsc-dataseed.binance.org/'
                );
                this.providers.set('bsc', bscProvider);
                
                // Initialize PancakeSwap factory
                const pancakeFactory = new ethers.Contract(
                    config.bnbChain.pancakeFactoryAddress,
                    IPancakeFactory.abi,
                    bscProvider
                );
                this.factories.set('pancakeswap', pancakeFactory);
            }

            this.logger.info('Token scanner initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize token scanner', error);
            throw error;
        }
    }

    async start() {
        try {
            if (this.isRunning) {
                this.logger.warn('Token scanner is already running');
                return;
            }

            this.isRunning = true;
            const config = this.configManager.getConfig();
            this.scanInterval = setInterval(
                () => this.scan(),
                config.trading.scanInterval || 30000
            );

            this.logger.info('Token scanner started');
        } catch (error) {
            this.logger.error('Failed to start token scanner', error);
            throw error;
        }
    }

    async stop() {
        try {
            if (!this.isRunning) {
                this.logger.warn('Token scanner is not running');
                return;
            }

            this.isRunning = false;
            if (this.scanInterval) {
                clearInterval(this.scanInterval);
                this.scanInterval = null;
            }

            this.logger.info('Token scanner stopped');
        } catch (error) {
            this.logger.error('Failed to stop token scanner', error);
            throw error;
        }
    }

    async scan() {
        try {
            for (const [network, factory] of this.factories.entries()) {
                const lastPairIndex = this.lastScanned.get(network) || 0;
                const currentLength = await factory.allPairsLength();

                for (let i = lastPairIndex; i < currentLength; i++) {
                    if (!this.isRunning) break;

                    const pairAddress = await factory.allPairs(i);
                    await this.analyzePair(pairAddress, network);
                }

                this.lastScanned.set(network, currentLength.toNumber());
            }
        } catch (error) {
            this.logger.error('Error during token scan', error);
        }
    }

    async analyzePair(pairAddress, network) {
        try {
            const provider = this.providers.get(network);
            const pair = new ethers.Contract(pairAddress, IERC20.abi, provider);
            
            const [token0Address, token1Address] = await Promise.all([
                pair.token0(),
                pair.token1()
            ]);

            // Analyze both tokens in the pair
            await Promise.all([
                this.analyzeToken(token0Address, network),
                this.analyzeToken(token1Address, network)
            ]);
        } catch (error) {
            this.logger.error(`Error analyzing pair ${pairAddress}`, error);
        }
    }

    async analyzeToken(tokenAddress, network) {
        try {
            // Skip if already known
            if (this.knownTokens.has(tokenAddress)) {
                return;
            }

            const provider = this.providers.get(network);
            const token = new ethers.Contract(tokenAddress, IERC20.abi, provider);

            // Get basic token information
            const [name, symbol, decimals, totalSupply] = await Promise.all([
                token.name(),
                token.symbol(),
                token.decimals(),
                token.totalSupply()
            ]);

            // Create token object
            const tokenInfo = {
                address: tokenAddress,
                name,
                symbol,
                decimals: decimals.toNumber(),
                totalSupply: totalSupply.toString(),
                network,
                timestamp: Date.now()
            };

            // Add to known tokens
            this.knownTokens.set(tokenAddress, tokenInfo);

            // Emit new token event
            this.emit('newToken', tokenInfo);
            this.logger.info(`New token found: ${symbol} (${tokenAddress})`);

        } catch (error) {
            this.logger.error(`Error analyzing token ${tokenAddress}`, error);
        }
    }

    getKnownTokens() {
        return Array.from(this.knownTokens.values());
    }

    isTokenKnown(address) {
        return this.knownTokens.has(address);
    }

    async getTokenInfo(address, network) {
        try {
            if (this.knownTokens.has(address)) {
                return this.knownTokens.get(address);
            }

            const provider = this.providers.get(network);
            if (!provider) {
                throw new Error(`Provider not found for network: ${network}`);
            }

            return await this.analyzeToken(address, network);
        } catch (error) {
            this.logger.error(`Error getting token info for ${address}`, error);
            throw error;
        }
    }
}

module.exports = TokenScanner;