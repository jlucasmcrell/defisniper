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

            // Get private key from config
            const privateKey = this.config.ethereum?.privateKey;
            if (!privateKey) {
                throw new Error('No private key configured for Ethereum');
            }

            // Get provider API key
            const apiKey = this.config.ethereum?.infuraId || this.config.ethereum?.alchemyKey;
            if (!apiKey) {
                throw new Error('No API key configured for Ethereum provider');
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

            // Set up wallet
            this.wallet = new ethers.Wallet(formattedPrivateKey, this.provider);

            // Set up Uniswap contracts
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

            // Verify connection
            await this.provider.getBlockNumber();
            const factoryPairCount = await this.uniswapFactory.allPairsLength();
            
            this.logger.info('Ethereum connector initialized successfully', {
                address: this.wallet.address,
                pairCount: factoryPairCount.toString()
            });

            return true;
        } catch (error) {
            this.logger.error('Failed to initialize Ethereum connector', error);
            return false;
        }
    }

    getAddress() {
        return this.wallet ? this.wallet.address : null;
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
            const ethBalance = await this.provider.getBalance(this.wallet.address);
            const balances = {
                ETH: ethers.utils.formatEther(ethBalance)
            };

            // Get token balances if configured
            if (this.config.tokens) {
                for (const token of this.config.tokens) {
                    try {
                        const tokenContract = new ethers.Contract(
                            token.address,
                            ERC20_ABI,
                            this.provider
                        );
                        const balance = await tokenContract.balanceOf(this.wallet.address);
                        const decimals = await tokenContract.decimals();
                        balances[token.symbol] = ethers.utils.formatUnits(balance, decimals);
                    } catch (tokenError) {
                        this.logger.error(`Error getting balance for token ${token.symbol}`, tokenError);
                    }
                }
            }

            return balances;
        } catch (error) {
            this.logger.error('Error getting Ethereum balances', error);
            return {};
        }
    }
}

module.exports = EthereumConnector;