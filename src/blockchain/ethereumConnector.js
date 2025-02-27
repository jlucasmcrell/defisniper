const ethers = require('ethers');
const ERC20_ABI = require('./abis/erc20.json');
const UNISWAP_FACTORY_ABI = require('./abis/uniswapFactory.json');
const UNISWAP_PAIR_ABI = require('./abis/uniswapPair.json');

class EthereumConnector {
    constructor(privateKey, apiKey, logger) {
        this.privateKey = privateKey;
        this.apiKey = apiKey;
        this.logger = logger;
        this.provider = null;
        this.wallet = null;
        this.factory = null;
    }

    async initialize() {
        try {
            this.logger.info('Initializing Ethereum connector');

            // Set up provider
            if (this.apiKey.startsWith('https://')) {
                // Custom RPC URL
                this.provider = new ethers.providers.JsonRpcProvider(this.apiKey);
            } else if (this.apiKey.length > 32) {
                // Alchemy key
                this.provider = new ethers.providers.AlchemyProvider('mainnet', this.apiKey);
            } else {
                // Infura key
                this.provider = new ethers.providers.InfuraProvider('mainnet', this.apiKey);
            }

            // Set up wallet
            this.wallet = new ethers.Wallet(this.privateKey, this.provider);

            // Set up Uniswap factory
            const UNISWAP_FACTORY_ADDRESS = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
            this.factory = new ethers.Contract(
                UNISWAP_FACTORY_ADDRESS,
                UNISWAP_FACTORY_ABI,
                this.wallet
            );

            // Verify connection
            await this.provider.getBlockNumber();
            const factoryPairCount = await this.factory.allPairsLength();
            
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

    getFactory() {
        return this.factory;
    }

    async getTokenInfo(address) {
        try {
            const token = new ethers.Contract(address, ERC20_ABI, this.provider);
            const [name, symbol, decimals, totalSupply] = await Promise.all([
                token.name(),
                token.symbol(),
                token.decimals(),
                token.totalSupply()
            ]);

            return {
                address,
                name,
                symbol,
                decimals,
                totalSupply: totalSupply.toString()
            };
        } catch (error) {
            this.logger.error(`Error getting token info for ${address}`, error);
            return null;
        }
    }

    // Add other required methods...
}

module.exports = { EthereumConnector };