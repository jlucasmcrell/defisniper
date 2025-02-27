/**
 * Enhanced Token Scanner
 * Extends the base TokenScanner with improved token detection and monitoring capabilities
 */
const TokenScanner = require('../trading/tokenScanner');
const { ethers } = require('ethers');
const { Logger } = require('../utils/logger');
const IERC20 = require('../contracts/IERC20.json');
const IUniswapV2Factory = require('../contracts/IUniswapV2Factory.json');
const IPancakeFactory = require('../contracts/IPancakeFactory.json');

class EnhancedTokenScanner extends TokenScanner {
    constructor(blockchain, exchanges, config, logger) {
        // Create a config-like object for the parent constructor
        super({ getConfig: () => config });
        
        this.blockchain = blockchain;
        this.exchanges = exchanges;
        this.directConfig = config;
        
        // Override the logger if provided
        if (logger) {
            this.logger = logger;
            
            // Set up logger to also emit logs to UI
            const originalInfo = this.logger.info;
            const originalError = this.logger.error;
            const originalWarn = this.logger.warn;
            const originalDebug = this.logger.debug;
            
            // Keep track of socketIo
            this.socketIo = logger.socketIo;
            
            // Override logger methods to also emit to socket if available
            this.logger.info = (message, meta) => {
                originalInfo.call(this.logger, message, meta);
                this.emitLog('info', message, meta);
            };
            
            this.logger.error = (message, meta) => {
                originalError.call(this.logger, message, meta);
                this.emitLog('error', message, meta);
            };
            
            this.logger.warn = (message, meta) => {
                originalWarn.call(this.logger, message, meta);
                this.emitLog('warn', message, meta);
            };
            
            this.logger.debug = (message, meta) => {
                originalDebug.call(this.logger, message, meta);
                this.emitLog('debug', message, meta);
            };
        } else {
            this.logger = new Logger('EnhancedTokenScanner');
        }
        
        // Additional token data storage
        this.tokenMetadata = new Map();
        this.blacklistedTokens = new Set();
        this.whitelistedTokens = new Set();
        this.tokenScores = new Map();
        
        // Scanning configuration
        this.scanDelay = 1000; // Delay between token analyses to prevent rate limiting
        this.concurrentScans = 5; // Number of concurrent scans
        this.minLiquidityUSD = 10000; // Minimum liquidity in USD to consider a token
    }
    
    /**
     * Emit log to UI if socketIo is available
     */
    emitLog(level, message, meta) {
        try {
            if (this.socketIo) {
                this.socketIo.emit('log', {
                    level,
                    message,
                    timestamp: new Date().toISOString(),
                    module: 'TokenScanner',
                    meta: meta || {}
                });
            }
        } catch (error) {
            console.error('Error emitting log to UI', error);
        }
    }
    
    /**
     * Initialize the enhanced token scanner with improved error handling
     */
    async initialize() {
        try {
            this.logger.info('Initializing enhanced token scanner');
            
            // Initialize our providers and factories maps if not already done
            if (!this.providers) this.providers = new Map();
            if (!this.factories) this.factories = new Map();
            if (!this.knownTokens) this.knownTokens = new Map();
            if (!this.scanStats) {
                this.scanStats = {
                    totalScanned: 0,
                    newTokensFound: 0,
                    lastScanTime: null,
                    networkStats: new Map()
                };
            }

            // Setup providers and factories based on blockchain connectors
            if (this.blockchain.ethereum) {
                this.logger.info('Setting up Ethereum provider and Uniswap factory');
                const ethProvider = this.blockchain.ethereum.getProvider();
                if (ethProvider) {
                    this.providers.set('ethereum', ethProvider);
                    
                    // Get Uniswap factory address from config
                    const uniswapFactoryAddress = this.directConfig.ethereum && 
                                              this.directConfig.ethereum.uniswapFactoryAddress;
                    
                    if (uniswapFactoryAddress) {
                        // Initialize Uniswap factory
                        const uniswapFactory = new ethers.Contract(
                            uniswapFactoryAddress,
                            IUniswapV2Factory.abi,
                            ethProvider
                        );
                        this.factories.set('uniswap', uniswapFactory);
                        
                        this.logger.info(`Initialized Uniswap factory at ${uniswapFactoryAddress}`);
                    } else {
                        this.logger.warn('Missing Uniswap factory address in config, cannot initialize factory');
                    }
                    
                    // Setup network stats
                    this.scanStats.networkStats.set('ethereum', {
                        pairsScanned: 0,
                        newTokens: 0,
                        lastBlock: 0
                    });
                } else {
                    this.logger.warn('Could not get Ethereum provider from blockchain connector');
                }
            }
            
            if (this.blockchain.bnbChain) {
                this.logger.info('Setting up BNB Chain provider and PancakeSwap factory');
                const bscProvider = this.blockchain.bnbChain.getProvider();
                if (bscProvider) {
                    this.providers.set('bsc', bscProvider);
                    
                    // Get PancakeSwap factory address from config
                    const pancakeFactoryAddress = this.directConfig.bnbChain && 
                                             this.directConfig.bnbChain.pancakeFactoryAddress;
                                             
                    if (pancakeFactoryAddress) {
                        // Initialize PancakeSwap factory
                        const pancakeFactory = new ethers.Contract(
                            pancakeFactoryAddress,
                            IPancakeFactory.abi,
                            bscProvider
                        );
                        this.factories.set('pancakeswap', pancakeFactory);
                        
                        this.logger.info(`Initialized PancakeSwap factory at ${pancakeFactoryAddress}`);
                    } else {
                        this.logger.warn('Missing PancakeSwap factory address in config, cannot initialize factory');
                    }
                    
                    // Setup network stats
                    this.scanStats.networkStats.set('bsc', {
                        pairsScanned: 0,
                        newTokens: 0,
                        lastBlock: 0
                    });
                } else {
                    this.logger.warn('Could not get BSC provider from blockchain connector');
                }
            }
            
            // Fallback to parent initialization if needed, but don't let it fail us
            try {
                // Check if we have any providers or factories from our initialization
                if (this.providers.size === 0 || this.factories.size === 0) {
                    this.logger.info('No providers or factories initialized, trying parent initialization');
                    await super.initialize();
                }
            } catch (parentInitError) {
                this.logger.error('Error in parent scanner initialization', parentInitError);
                // Continue with our own initialization even if parent fails
            }
            
            // Log provider and factory status
            this.logger.info(`Providers initialized: ${this.providers.size} (${Array.from(this.providers.keys()).join(', ')})`);
            this.logger.info(`Factories initialized: ${this.factories.size} (${Array.from(this.factories.keys()).join(', ')})`);
            
            // Load blacklisted tokens
            if (this.directConfig.trading && this.directConfig.trading.blacklistedTokens) {
                this.directConfig.trading.blacklistedTokens.forEach(token => {
                    this.blacklistedTokens.add(token.toLowerCase());
                });
                this.logger.info(`Loaded ${this.blacklistedTokens.size} blacklisted tokens`);
            }
            
            // Load whitelisted tokens
            if (this.directConfig.trading && this.directConfig.trading.whitelistedTokens) {
                this.directConfig.trading.whitelistedTokens.forEach(token => {
                    this.whitelistedTokens.add(token.toLowerCase());
                });
                this.logger.info(`Loaded ${this.whitelistedTokens.size} whitelisted tokens`);
            }
            
            // Set up enhanced event emitters
            this.on('newToken', (tokenInfo) => {
                this.analyzeTokenHealth(tokenInfo)
                    .then(healthScore => {
                        if (healthScore) {
                            this.tokenScores.set(tokenInfo.address.toLowerCase(), healthScore);
                        }
                    })
                    .catch(error => {
                        this.logger.error(`Error analyzing token health: ${tokenInfo.symbol}`, error);
                    });
            });
            
            this.logger.info('Enhanced token scanner initialized successfully');
            this.emit('scannerInitialized', {
                networks: Array.from(this.providers.keys()),
                exchanges: Object.keys(this.exchanges)
            });
            
            return true;
        } catch (error) {
            this.logger.error('Failed to initialize enhanced token scanner', error);
            return false;
        }
    }

    /**
     * Start scanning for new tokens
     * Overrides the parent class method to fix the scanInterval access issue
     */
    async start() {
        try {
            if (this.isRunning) {
                this.logger.warn('Token scanner is already running');
                return true;
            }

            this.isRunning = true;
            
            // Make sure we have a valid scanInterval config
            // Fix for "Cannot read properties of undefined (reading 'scanInterval')"
            const scanIntervalMs = this.directConfig && this.directConfig.trading && 
                                  this.directConfig.trading.scanInterval ? 
                                  this.directConfig.trading.scanInterval : 30000; // Default to 30 seconds
            
            this.logger.info(`Starting token scanner with scan interval: ${scanIntervalMs}ms`);
            
            this.scanInterval = setInterval(
                () => this.scan(),
                scanIntervalMs
            );

            this.logger.info('Token scanner started');
            this.emit('scannerStarted');
            
            // Run initial scan immediately
            setTimeout(() => this.scan(), 1000);
            
            return true;
        } catch (error) {
            this.logger.error('Failed to start token scanner', error);
            this.isRunning = false;
            return false;
        }
    }

    /**
     * Stop scanning for new tokens
     */
    async stop() {
        try {
            if (!this.isRunning) {
                this.logger.warn('Token scanner is not running');
                return true;
            }

            this.isRunning = false;
            if (this.scanInterval) {
                clearInterval(this.scanInterval);
                this.scanInterval = null;
            }

            this.logger.info('Token scanner stopped');
            this.emit('scannerStopped');
            return true;
        } catch (error) {
            this.logger.error('Failed to stop token scanner', error);
            return false;
        }
    }

    /**
     * Scan for new tokens
     */
    async scan() {
        if (!this.isRunning) return;
        
        try {
            const scanStartTime = Date.now();
            this.logger.info('Starting token scan...');
            
            // Check if we have providers and factories
            if (!this.providers || this.providers.size === 0 || !this.factories || this.factories.size === 0) {
                this.logger.warn('No providers or factories available for scanning');
                return;
            }
            
            // Use super.scan() if available, otherwise implement our own scan logic
            if (typeof super.scan === 'function') {
                await super.scan();
            } else {
                // Custom scan implementation
                await this.customScan();
            }
            
            const scanDuration = (Date.now() - scanStartTime) / 1000;
            this.logger.info(`Scan completed in ${scanDuration.toFixed(1)}s`);
        } catch (error) {
            this.logger.error('Error during token scan', error);
            this.emit('scanError', error);
        }
    }
    
    /**
     * Custom scan implementation if parent's scan is not available
     */
    async customScan() {
        this.logger.info('Running custom token scan');
        
        // Scan for well-known tokens as a fallback
        const wellKnownTokens = {
            ethereum: [
                {address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', symbol: 'UNI', name: 'Uniswap'},
                {address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', name: 'Dai Stablecoin'},
                {address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', name: 'Wrapped Ether'}
            ],
            bnbChain: [
                {address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', symbol: 'CAKE', name: 'PancakeSwap Token'},
                {address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', symbol: 'BUSD', name: 'Binance USD'},
                {address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', symbol: 'WBNB', name: 'Wrapped BNB'}
            ]
        };
        
        // Emit some tokens for testing
        for (const [network, tokens] of Object.entries(wellKnownTokens)) {
            for (const token of tokens) {
                if (!this.knownTokens.has(token.address)) {
                    const tokenInfo = {
                        ...token,
                        network,
                        timestamp: Date.now()
                    };
                    
                    this.knownTokens.set(token.address, tokenInfo);
                    this.emit('newToken', tokenInfo);
                    this.logger.info(`Found token: ${token.symbol} (${token.address})`);
                }
            }
        }
    }
    
    /**
     * Check if a token is blacklisted
     */
    isBlacklisted(address) {
        if (!address) return false;
        return this.blacklistedTokens.has(address.toLowerCase());
    }
    
    /**
     * Check if a token is whitelisted
     */
    isWhitelisted(address) {
        if (!address) return false;
        return this.whitelistedTokens.has(address.toLowerCase());
    }
    
    /**
     * Analyze token health and security
     */
    async analyzeTokenHealth(tokenInfo) {
    try {
        let healthScore = 50; // Initialize with base score

        // Check for whitelisted tokens first
        if (this.isWhitelisted(tokenInfo.address)) {
            this.logger.info(`Token ${tokenInfo.symbol} is whitelisted, higher health score`);
            healthScore += 40;
            return healthScore;
        }

        // Automatically lowest score for blacklisted tokens
        if (this.isBlacklisted(tokenInfo.address)) {
            this.logger.info(`Token ${tokenInfo.symbol} is blacklisted, lowest health score`);
            return 0;
        }

        // Higher score for known networks
        if (tokenInfo.network === 'ethereum') {
            healthScore += 10;
        } else if (tokenInfo.network === 'bnbChain') {
            healthScore += 5;
        }

        // Basic checks on token name and symbol
        if (!tokenInfo.symbol || !tokenInfo.name) {
            healthScore -= 10;
        }

        // Check for scam indicators in name
        const scamWords = ['test', 'scam', 'fake', 'honeypot', 'airdrop'];
        const nameAndSymbol = (tokenInfo.name + ' ' + tokenInfo.symbol).toLowerCase();

        for (const word of scamWords) {
            if (nameAndSymbol.includes(word)) {
                this.logger.warn(`Token ${tokenInfo.symbol} contains suspicious word: ${word}`);
                healthScore -= 20;
            }
        }

        this.logger.info(`Health analysis for ${tokenInfo.symbol}: ${healthScore}/100`);
        return healthScore;
    } catch (error) {
        this.logger.error(`Error analyzing token health: ${tokenInfo.symbol}`, error);
        return null;
    }
}}

    /**
     * Get token by address
     */
    getToken(address) {
        return this.knownTokens.get(address);
    }

    /**
     * Get all known tokens
     */
    getAllTokens() {
        return Array.from(this.knownTokens.values());
    }

    /**
     * Get tokens filtered by criteria
     */
    getFilteredTokens(options = {}) {
        const { network, minScore, maxCount } = options;

        let tokens = Array.from(this.knownTokens.values());

        if (network) {
            tokens = tokens.filter(t => t.network === network);
        }

        if (minScore !== undefined) {
            tokens = tokens.filter(t => {
                const score = this.tokenScores.get(t.address.toLowerCase());
                return score !== undefined && score >= minScore;
            });
        }

        // Sort by timestamp (newest first)
        tokens.sort((a, b) => b.timestamp - a.timestamp);

        if (maxCount) {
            tokens = tokens.slice(0, maxCount);
        }

        return tokens;
    }
}

module.exports = { EnhancedTokenScanner };