const { ethers } = require('ethers');
const ERC20_ABI = require('./abis/erc20.json');
const UNISWAP_FACTORY_ABI = require('./abis/uniswapFactory.json');
const UNISWAP_ROUTER_ABI = require('./abis/uniswapRouter.json');

class EthereumConnector {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        
        // Contract addresses
        this.uniswapRouterAddress = config.ethereum?.uniswapRouterAddress || '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
        this.uniswapFactoryAddress = config.ethereum?.uniswapFactoryAddress || '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
        this.wethAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
        
        this.provider = null;
        this.wallet = null;
        this.uniswapRouter = null;
        this.uniswapFactory = null;
    }

    async initialize() {
        try {
            this.logger.info('Initializing Ethereum connector');

            // Validate private key
            const privateKey = this.config.ethereum?.privateKey;
            if (!privateKey || typeof privateKey !== 'string') {
                throw new Error('Missing or invalid private key for Ethereum');
            }

            // Validate API key
            const apiKey = this.config.ethereum?.infuraId || this.config.ethereum?.alchemyKey;
            if (!apiKey || typeof apiKey !== 'string') {
                throw new Error('Missing or invalid API key for Ethereum provider');
            }

            // Set up provider
            if (this.config.ethereum?.infuraId) {
                this.provider = new ethers.providers.InfuraProvider('mainnet', this.config.ethereum.infuraId);
            } else if (this.config.ethereum?.alchemyKey) {
                this.provider = new ethers.providers.AlchemyProvider('mainnet', this.config.ethereum.alchemyKey);
            } else {
                throw new Error('No valid provider configuration found');
            }

            // Ensure private key has 0x prefix
            const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;

            // Set up wallet with error handling
            try {
                this.wallet = new ethers.Wallet(formattedPrivateKey, this.provider);
            } catch (walletError) {
                throw new Error(`Failed to initialize Ethereum wallet: ${walletError.message}`);
            }

            // Set up Uniswap contracts
            try {
                this.uniswapRouter = new ethers.Contract(
                    this.uniswapRouterAddress,
                    UNISWAP_ROUTER_ABI,
                    this.wallet
                );

                this.uniswapFactory = new ethers.Contract(
                    this.uniswapFactoryAddress,
                    UNISWAP_FACTORY_ABI,
                    this.wallet
                );
            } catch (contractError) {
                throw new Error(`Failed to initialize Uniswap contracts: ${contractError.message}`);
            }

            // Verify connection and contracts
            try {
                await this.provider.getBlockNumber();
                const factoryPairCount = await this.uniswapFactory.allPairsLength();
                
                this.logger.info('Ethereum connector initialized successfully', {
                    address: this.wallet.address,
                    pairCount: factoryPairCount.toString()
                });

                return true;
            } catch (verificationError) {
                throw new Error(`Failed to verify Ethereum connection: ${verificationError.message}`);
            }
        } catch (error) {
            this.logger.error('Failed to initialize Ethereum connector', error);
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
        return this.uniswapFactory;
    }

    getRouter() {
        return this.uniswapRouter;
    }

    async getBalances() {
        try {
            if (!this.provider || !this.wallet) {
                throw new Error('Ethereum connector not properly initialized');
            }

            const ethBalance = await this.provider.getBalance(this.wallet.address);
            const balances = {
                ETH: ethers.utils.formatEther(ethBalance)
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
            this.logger.error('Error getting Ethereum balances', error);
            return null;
        }
    }

    async getTokenPrice(tokenAddress) {
        try {
            if (!this.uniswapFactory || !this.wallet) {
                throw new Error('Ethereum connector not properly initialized');
            }

            const pairAddress = await this.uniswapFactory.getPair(tokenAddress, this.wethAddress);
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
            const ethPrice = token0.toLowerCase() === tokenAddress.toLowerCase() ? 
                reserve1 / reserve0 :
                reserve0 / reserve1;

            return ethPrice;
        } catch (error) {
            this.logger.error(`Error getting token price for ${tokenAddress}`, error);
            return null;
        }
    }
}

module.exports = { EthereumConnector };