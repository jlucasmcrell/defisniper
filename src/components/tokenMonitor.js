/**
 * Token Monitor Component
 * Displays currently monitored tokens and trading pairs
 */
const { EventEmitter } = require('events');
const { Logger } = require('../utils/logger');

class TokenMonitor extends EventEmitter {
    constructor(configManager, walletManager) {
        super();
        this.logger = new Logger('TokenMonitor');
        this.configManager = configManager;
        this.walletManager = walletManager;
        this.monitoredTokens = new Map();
        this.tradingPairs = new Map();
        this.baseAssets = new Map();
    }

    async initialize() {
        try {
            const config = this.configManager.getConfig();
            await this.setupBaseAssets(config);
            this.logger.info('Token Monitor initialized');
            this.emitStatus();
        } catch (error) {
            this.logger.error('Failed to initialize token monitor', error);
            throw error;
        }
    }

    async setupBaseAssets(config) {
        // Clear existing base assets
        this.baseAssets.clear();

        try {
            // Get wallet balances for trading
            const walletBalances = await this.walletManager.getAllBalances();

            // Setup base assets for each network
            if (config.ethereum && config.ethereum.enabled) {
                const ethBaseAssets = new Map();
                for (const asset of config.ethereum.baseAssets) {
                    const balance = walletBalances.dex?.ethereum?.[asset] || '0';
                    ethBaseAssets.set(asset, {
                        symbol: asset,
                        balance: balance,
                        minBalance: config.ethereum.minBalance[asset] || '0',
                        maxAllocation: config.ethereum.maxAllocation[asset] || '100'
                    });
                }
                this.baseAssets.set('ethereum', ethBaseAssets);
            }

            if (config.bnbChain && config.bnbChain.enabled) {
                const bscBaseAssets = new Map();
                for (const asset of config.bnbChain.baseAssets) {
                    const balance = walletBalances.dex?.bsc?.[asset] || '0';
                    bscBaseAssets.set(asset, {
                        symbol: asset,
                        balance: balance,
                        minBalance: config.bnbChain.minBalance[asset] || '0',
                        maxAllocation: config.bnbChain.maxAllocation[asset] || '100'
                    });
                }
                this.baseAssets.set('bsc', bscBaseAssets);
            }

            // Setup CEX base assets
            for (const [exchange, settings] of Object.entries(config.exchanges)) {
                if (settings.enabled) {
                    const exchangeAssets = new Map();
                    for (const asset of settings.baseAssets) {
                        const balance = walletBalances.exchanges?.[exchange]?.[asset] || '0';
                        exchangeAssets.set(asset, {
                            symbol: asset,
                            balance: balance,
                            minBalance: settings.minBalance[asset] || '0',
                            maxAllocation: settings.maxAllocation[asset] || '100'
                        });
                    }
                    this.baseAssets.set(exchange, exchangeAssets);
                }
            }

            this.logger.info('Base assets setup completed', {
                networks: Array.from(this.baseAssets.keys())
            });

        } catch (error) {
            this.logger.error('Failed to setup base assets', error);
            throw error;
        }
    }

    addMonitoredToken(token, network) {
        const key = `${network}:${token.address}`;
        if (!this.monitoredTokens.has(key)) {
            this.monitoredTokens.set(key, {
                ...token,
                network,
                timestamp: Date.now(),
                pairs: []
            });
            this.logger.info(`Now monitoring token: ${token.symbol} on ${network}`);
            this.setupTradingPairs(token, network);
            this.emitStatus();
        }
    }

    setupTradingPairs(token, network) {
        const networkAssets = this.baseAssets.get(network);
        if (!networkAssets) return;

        for (const [baseAsset, details] of networkAssets) {
            const pairKey = `${network}:${token.address}:${baseAsset}`;
            if (!this.tradingPairs.has(pairKey)) {
                this.tradingPairs.set(pairKey, {
                    token: token,
                    baseAsset: baseAsset,
                    network: network,
                    baseAssetBalance: details.balance,
                    minBaseBalance: details.minBalance,
                    maxAllocation: details.maxAllocation,
                    lastUpdated: Date.now()
                });

                // Add pair reference to monitored token
                const monitoredToken = this.monitoredTokens.get(`${network}:${token.address}`);
                if (monitoredToken) {
                    monitoredToken.pairs.push(pairKey);
                }

                this.logger.info(`Setup trading pair: ${token.symbol}/${baseAsset} on ${network}`);
            }
        }
    }

    removeMonitoredToken(tokenAddress, network) {
        const key = `${network}:${tokenAddress}`;
        const token = this.monitoredTokens.get(key);
        if (token) {
            // Remove all trading pairs for this token
            token.pairs.forEach(pairKey => {
                this.tradingPairs.delete(pairKey);
            });
            this.monitoredTokens.delete(key);
            this.logger.info(`Stopped monitoring token: ${token.symbol} on ${network}`);
            this.emitStatus();
        }
    }

    updateBaseAssetBalance(network, asset, newBalance) {
        const networkAssets = this.baseAssets.get(network);
        if (networkAssets && networkAssets.has(asset)) {
            networkAssets.get(asset).balance = newBalance;
            
            // Update all trading pairs using this base asset
            for (const [pairKey, pair] of this.tradingPairs) {
                if (pair.network === network && pair.baseAsset === asset) {
                    pair.baseAssetBalance = newBalance;
                    pair.lastUpdated = Date.now();
                }
            }

            this.emitStatus();
        }
    }

    getMonitoringSummary() {
        return {
            tokens: Array.from(this.monitoredTokens.values()),
            pairs: Array.from(this.tradingPairs.values()),
            baseAssets: Object.fromEntries(
                Array.from(this.baseAssets.entries()).map(([network, assets]) => [
                    network,
                    Object.fromEntries(assets)
                ])
            )
        };
    }

    emitStatus() {
        this.emit('monitoringUpdate', this.getMonitoringSummary());
    }
}

module.exports = TokenMonitor;