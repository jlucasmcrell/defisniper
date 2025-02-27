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
        this.scanStats = {
            totalScanned: 0,
            newTokensFound: 0,
            lastScanTime: null,
            networkStats: new Map()
        };
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
                this.scanStats.networkStats.set('ethereum', {
                    pairsScanned: 0,
                    newTokens: 0,
                    lastBlock: 0
                });
                this.logger.info('Initialized Ethereum/Uniswap scanning');
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
                this.scanStats.networkStats.set('bsc', {
                    pairsScanned: 0,
                    newTokens: 0,
                    lastBlock: 0
                });
                this.logger.info('Initialized BSC/PancakeSwap scanning');
            }

            this.logger.info('Token scanner initialized successfully');
            this.emit('scannerInitialized', {
                networks: Array.from(this.providers.keys()),
                exchanges: Array.from(this.factories.keys())
            });
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
            
            // Check if config.trading exists before accessing scanInterval
            // This is the fix - adding a fallback value if config.trading is undefined
            const scanIntervalMs = config.trading && config.trading.scanInterval ? 
                config.trading.scanInterval : 30000; // Default to 30 seconds if not specified
            
            this.scanInterval = setInterval(
                () => this.scan(),
                scanIntervalMs
            );

            this.logger.info('Token scanner started');
            this.emit('scannerStarted');
            await this.scan(); // Run initial scan immediately
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
            this.emit('scannerStopped');
        } catch (error) {
            this.logger.error('Failed to stop token scanner', error);
            throw error;
        }
    }

    async scan() {
        try {
            const scanStartTime = Date.now();
            this.logger.info('Starting new token scan...');

            for (const [network, factory] of this.factories.entries()) {
                const provider = this.providers.get(network === 'pancakeswap' ? 'bsc' : 'ethereum');
                const currentBlock = await provider.getBlockNumber();
                const lastPairIndex = this.lastScanned.get(network) || 0;
                const currentLength = await factory.allPairsLength();
                
                this.logger.info(`Scanning ${network}: ${lastPairIndex} to ${currentLength} pairs at block ${currentBlock}`);

                const networkStats = this.scanStats.networkStats.get(network === 'pancakeswap' ? 'bsc' : 'ethereum');
                networkStats.lastBlock = currentBlock;

                for (let i = lastPairIndex; i < currentLength; i++) {
                    if (!this.isRunning) break;

                    const pairAddress = await factory.allPairs(i);
                    await this.analyzePair(pairAddress, network);
                    
                    networkStats.pairsScanned++;
                    this.scanStats.totalScanned++;

                    // Log progress every 100 pairs
                    if (i % 100 === 0) {
                        this.logger.info(`${network}: Scanned ${i}/${currentLength} pairs`);
                        this.emit('scanProgress', {
                            network,
                            current: i,
                            total: currentLength,
                            newTokens: networkStats.newTokens
                        });
                    }
                }

                this.lastScanned.set(network, currentLength.toNumber());
            }

            this.scanStats.lastScanTime = Date.now();
            const scanDuration = (Date.now() - scanStartTime) / 1000;
            
            this.logger.info(`Scan completed in ${scanDuration}s. Found ${this.scanStats.newTokensFound} new tokens`);
            this.emit('scanCompleted', this.scanStats);
        } catch (error) {
            this.logger.error('Error during token scan', error);
            this.emit('scanError', error);
        }
    }

    async analyzePair(pairAddress, network) {
        try {
            const provider = this.providers.get(network === 'pancakeswap' ? 'bsc' : 'ethereum');
            const pair = new ethers.Contract(pairAddress, IERC20.abi, provider);
            
            const [token0Address, token1Address] = await Promise.all([
                pair.token0(),
                pair.token1()
            ]);

            this.logger.debug(`Analyzing pair ${pairAddress} (${token0Address} - ${token1Address})`);

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

            const provider = this.providers.get(network === 'pancakeswap' ? 'bsc' : 'ethereum');
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
            
            // Update statistics
            this.scanStats.newTokensFound++;
            const networkStats = this.scanStats.networkStats.get(network === 'pancakeswap' ? 'bsc' : 'ethereum');
            networkStats.newTokens++;

            // Emit new token event
            this.emit('newToken', tokenInfo);
            this.logger.info(`New token found: ${symbol} (${tokenAddress}) on ${network}`);

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

    getScanStats() {
        return {
            ...this.scanStats,
            networkStats: Object.fromEntries(this.scanStats.networkStats)
        };
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