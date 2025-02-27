const { ethers } = require('ethers');
const ERC20_ABI = require('./abis/erc20.json');
const PANCAKESWAP_FACTORY_ABI = require('./abis/pancakeswapFactory.json');
const PANCAKESWAP_ROUTER_ABI = require('./abis/pancakeswapRouter.json');

class BnbConnector {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        
        // Contract addresses
        this.pancakeRouterAddress = config.bnbChain?.pancakeRouterAddress || '0x10ED43C718714eb63d5aA57B78B54704E256024E';
        this.pancakeFactoryAddress = config.bnbChain?.pancakeFactoryAddress || '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73';
        this.wbnbAddress = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
        
        this.provider = null;
        this.wallet = null;
        this.pancakeRouter = null;
        this.pancakeFactory = null;
    }

    async initialize() {
        try {
            this.logger.info('Initializing BNB Chain connector');

            // Get private key from config
            const privateKey = this.config.bnbChain?.privateKey || this.config.ethereum?.privateKey;
            if (!privateKey) {
                throw new Error('No private key configured for BNB Chain');
            }

            // Ensure private key has 0x prefix
            const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;

            // Set up provider with multiple RPC endpoints for redundancy
            const rpcUrls = [
                'https://bsc-dataseed1.binance.org',
                'https://bsc-dataseed2.binance.org',
                'https://bsc-dataseed3.binance.org',
                'https://bsc-dataseed4.binance.org'
            ];

            // Try each RPC endpoint until one works
            let connected = false;
            for (const rpcUrl of rpcUrls) {
                try {
                    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
                    await this.provider.getBlockNumber();
                    connected = true;
                    break;
                } catch (error) {
                    this.logger.warn(`Failed to connect to RPC ${rpcUrl}, trying next...`);
                    continue;
                }
            }

            if (!connected) {
                throw new Error('Failed to connect to any BSC RPC endpoint');
            }

            // Set up wallet
            this.wallet = new ethers.Wallet(formattedPrivateKey, this.provider);

            // Set up PancakeSwap contracts
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

            // Verify connection and contracts
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
        } catch (error) {
            this.logger.error('Failed to initialize BNB Chain connector', error);
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
        return this.pancakeFactory;
    }

    getRouter() {
        return this.pancakeRouter;
    }

    async getBalances() {
        try {
            const bnbBalance = await this.provider.getBalance(this.wallet.address);
            const balances = {
                BNB: ethers.utils.formatEther(bnbBalance)
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
            this.logger.error('Error getting BNB Chain balances', error);
            return {};
        }
    }
}

module.exports = { BnbConnector };