const { ethers } = require('ethers');
const ERC20_ABI = require('./abis/erc20.json');
const PANCAKESWAP_FACTORY_ABI = require('./abis/pancakeswapFactory.json');
const PANCAKESWAP_ROUTER_ABI = require('./abis/pancakeswapRouter.json');

class BnbConnector {
    constructor(config, logger) {
        if (!logger || typeof logger.error !== 'function' || 
            typeof logger.info !== 'function' || 
            typeof logger.warn !== 'function') {
            throw new Error('Invalid logger provided to BnbConnector');
        }
        
        this.config = config;
        this.logger = logger;
        
        // Contract addresses
        this.pancakeRouterAddress = config?.pancakeRouterAddress || '0x10ED43C718714eb63d5aA57B78B54704E256024E';
        this.pancakeFactoryAddress = config?.pancakeFactoryAddress || '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73';
        this.wbnbAddress = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
        
        this.provider = null;
        this.wallet = null;
        this.pancakeRouter = null;
        this.pancakeFactory = null;
        
        // RPC endpoints for redundancy
        this.rpcUrls = [
            'https://bsc-dataseed1.binance.org',
            'https://bsc-dataseed2.binance.org',
            'https://bsc-dataseed3.binance.org',
            'https://bsc-dataseed4.binance.org'
        ];
    }

    async initialize() {
        try {
            this.logger.info('Initializing BNB Chain connector');

            // Validate private key
            const privateKey = this.config?.privateKey || this.config?.ethereum?.privateKey;
            if (!privateKey || typeof privateKey !== 'string') {
                throw new Error('Missing or invalid private key for BNB Chain');
            }

            // Try each RPC endpoint until one works
            let connected = false;
            for (const rpcUrl of this.rpcUrls) {
                try {
                    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
                    await this.provider.getBlockNumber();
                    connected = true;
                    this.logger.info(`Connected to BNB Chain RPC: ${rpcUrl}`);
                    break;
                } catch (error) {
                    this.logger.warn(`Failed to connect to RPC ${rpcUrl}, trying next...`);
                    continue;
                }
            }

            if (!connected) {
                throw new Error('Failed to connect to any BSC RPC endpoint');
            }

            // Ensure private key has 0x prefix
            const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;

            // Set up wallet with error handling
            try {
                this.wallet = new ethers.Wallet(formattedPrivateKey, this.provider);
            } catch (walletError) {
                throw new Error(`Failed to initialize BNB Chain wallet: ${walletError.message}`);
            }

            // Set up PancakeSwap contracts
            try {
                this.pancakeRouter = new ethers.Contract(
                    this.pancakeRouterAddress,
                    PANCAKESWAP_ROUTER_ABI,
                    this.wallet
                );

                this.pancakeFactory = new ethers.Contract(
                    this.pancakeFactoryAddress,
                    PANCAKESWAP_FACTORY_ABI,
                    this.wallet
                );
            } catch (contractError) {
                throw new Error(`Failed to initialize PancakeSwap contracts: ${contractError.message}`);
            }

            // Verify connection and contracts
            try {
                const [blockNumber, factoryPairCount] = await Promise.all([
                    this.provider.getBlockNumber(),
                    this.pancakeFactory.allPairsLength()
                ]);
                
                this.logger.info('BNB Chain connector initialized successfully', {
                    address: this.wallet.address,
                    blockNumber,
                    pairCount: factoryPairCount.toString()
                });

                return true;
            } catch (verificationError) {
                throw new Error(`Failed to verify BNB Chain connection: ${verificationError.message}`);
            }
        } catch (error) {
            this.logger.error('Failed to initialize BNB Chain connector', error);
            return false;
        }
    }

    getAddress() {
        return this.wallet?.address || null;
    }

    getProvider() {
        return this.provider;
    }

    getFactory() {
        return this.pancakeFactory;
    }

    getRouter() {
        return this.pancakeRouter;
    }

    async getBalances() {
        try {
            if (!this.provider || !this.wallet) {
                throw new Error('BNB Chain connector not properly initialized');
            }

            const bnbBalance = await this.provider.getBalance(this.wallet.address);
            const balances = {
                BNB: ethers.utils.formatEther(bnbBalance)
            };

            // Get token balances if configured
            if (Array.isArray(this.config.tokens)) {
                for (const token of this.config.tokens) {
                    try {
                        if (!token.address || typeof token.address !== 'string') {
                            this.logger.warn(`Invalid token address for ${token.symbol || 'unknown token'}`);
                            continue;
                        }

                        const tokenContract = new ethers.Contract(
                            token.address,
                            ERC20_ABI,
                            this.provider
                        );

                        const [balance, decimals] = await Promise.all([
                            tokenContract.balanceOf(this.wallet.address),
                            tokenContract.decimals()
                        ]);

                        balances[token.symbol] = ethers.utils.formatUnits(balance, decimals);
                    } catch (tokenError) {
                        this.logger.error(`Error getting balance for token ${token.symbol || token.address}`, tokenError);
                    }
                }
            }

            return balances;
        } catch (error) {
            this.logger.error('Error getting BNB Chain balances', error);
            return null;
        }
    }

    async getTokenPrice(tokenAddress) {
        try {
            if (!this.pancakeFactory || !this.wallet) {
                throw new Error('BNB Chain connector not properly initialized');
            }

            const pairAddress = await this.pancakeFactory.getPair(tokenAddress, this.wbnbAddress);
            if (pairAddress === '0x0000000000000000000000000000000000000000') {
                throw new Error('No liquidity pair found');
            }

            const pair = new ethers.Contract(
                pairAddress,
                ['function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'],
                this.provider
            );

            const [token0, reserves] = await Promise.all([
                pair.token0(),
                pair.getReserves()
            ]);

            const [reserve0, reserve1] = reserves;
            const bnbPrice = token0.toLowerCase() === tokenAddress.toLowerCase() ? 
                reserve1 / reserve0 :
                reserve0 / reserve1;

            return bnbPrice;
        } catch (error) {
            this.logger.error(`Error getting token price for ${tokenAddress}`, error);
            return null;
        }
    }
}

module.exports = { BnbConnector };