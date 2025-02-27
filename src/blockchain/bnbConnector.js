const ethers = require('ethers');
const ERC20_ABI = require('./abis/erc20.json');
const PANCAKESWAP_FACTORY_ABI = require('./abis/pancakeswapFactory.json');
const PANCAKESWAP_PAIR_ABI = require('./abis/pancakeswapPair.json');

class BnbConnector {
    constructor(privateKey, logger) {
        this.privateKey = privateKey;
        this.logger = logger;
        this.provider = null;
        this.wallet = null;
        this.factory = null;
    }

    async initialize() {
        try {
            this.logger.info('Initializing BNB Chain connector');

            // BSC MainNet RPC
            this.provider = new ethers.providers.JsonRpcProvider('https://bsc-dataseed1.binance.org');

            // Set up wallet
            this.wallet = new ethers.Wallet(this.privateKey, this.provider);

            // Set up PancakeSwap factory
            const PANCAKESWAP_FACTORY_ADDRESS = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73';
            this.factory = new ethers.Contract(
                PANCAKESWAP_FACTORY_ADDRESS,
                PANCAKESWAP_FACTORY_ABI,
                this.wallet
            );

            // Verify connection
            await this.provider.getBlockNumber();
            const factoryPairCount = await this.factory.allPairsLength();
            
            this.logger.info('BNB Chain connector initialized successfully', {
                address: this.wallet.address,
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

module.exports = { BnbConnector };