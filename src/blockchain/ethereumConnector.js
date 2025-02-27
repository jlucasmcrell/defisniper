/**
 * Ethereum Blockchain Connector
 * 
 * Handles interactions with the Ethereum blockchain including:
 * - Wallet connection and management
 * - Token trading via DEXes (Uniswap)
 * - Token price queries
 * - Gas price optimization
 */

const { ethers } = require('ethers');
const ERC20_ABI = require('./abis/erc20.json');
const UNISWAP_ROUTER_ABI = require('./abis/uniswapRouter.json');
const UNISWAP_FACTORY_ABI = require('./abis/uniswapFactory.json');
const UNISWAP_PAIR_ABI = require('./abis/uniswapPair.json');

class EthereumConnector {
    constructor(configManager, logger) {
        this.configManager = configManager;
        this.config = configManager.getConfig();
        this.logger = logger;
        
        // Contract addresses
        this.uniswapRouterAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'; // Uniswap V2 Router
        this.uniswapFactoryAddress = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'; // Uniswap V2 Factory
        this.wethAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; // WETH
        
        this.provider = null;
        this.wallet = null;
        this.signer = null;
        this.uniswapRouter = null;
        this.uniswapFactory = null;
    }

    /**
     * Initialize the connector
     */
    async initialize() {
        try {
            this.logger.info('Initializing Ethereum connector');
            
            // Get private key from config
            const privateKey = this.config.ethereum.privateKey;
            if (!privateKey) {
                throw new Error('No private key configured');
            }

            // Ensure private key has 0x prefix
            const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;

            // Create provider based on configuration
            let providerUrl;
            if (this.config.ethereum.provider === 'infura') {
                if (!this.config.ethereum.infuraKey) {
                    throw new Error('No Infura key configured');
                }
                providerUrl = `https://mainnet.infura.io/v3/${this.config.ethereum.infuraKey}`;
            } else {
                if (!this.config.ethereum.alchemyKey) {
                    throw new Error('No Alchemy key configured');
                }
                providerUrl = `https://eth-mainnet.g.alchemy.com/v2/${this.config.ethereum.alchemyKey}`;
            }
            
            this.provider = new ethers.providers.JsonRpcProvider(providerUrl);
            
            // Create wallet
            this.wallet = new ethers.Wallet(formattedPrivateKey, this.provider);
            this.signer = this.wallet;
            
            // Create contract instances
            this.uniswapRouter = new ethers.Contract(
                this.uniswapRouterAddress,
                UNISWAP_ROUTER_ABI,
                this.signer
            );
            
            this.uniswapFactory = new ethers.Contract(
                this.uniswapFactoryAddress,
                UNISWAP_FACTORY_ABI,
                this.signer
            );
            
            // Get wallet address
            this.address = await this.wallet.getAddress();
            
            this.logger.info('Ethereum connector initialized successfully');
            return true;
        } catch (error) {
            this.logger.error('Failed to initialize Ethereum connector', error);
            throw error;
        }
    }

    /**
     * Get provider instance
     */
    getProvider() {
        return this.provider;
    }

    /**
     * Get wallet address
     */
    getAddress() {
        return this.address;
    }

    /**
     * Get Uniswap factory contract
     */
    getFactory() {
        return this.uniswapFactory;
    }

    /**
     * Get Uniswap router contract
     */
    getRouter() {
        return this.uniswapRouter;
    }

    /**
     * Get token information
     */
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
                decimals: decimals.toString(),
                totalSupply: totalSupply.toString()
            };
        } catch (error) {
            this.logger.error(`Error getting token info for ${address}`, error);
            return null;
        }
    }

    /**
     * Get token price in ETH
     */
    async getTokenPrice(tokenAddress) {
        try {
            // Get pair address
            const pairAddress = await this.uniswapFactory.getPair(tokenAddress, this.wethAddress);
            if (pairAddress === '0x0000000000000000000000000000000000000000') {
                return 0;
            }

            // Get pair contract
            const pair = new ethers.Contract(pairAddress, UNISWAP_PAIR_ABI, this.provider);
            const [reserves, token0] = await Promise.all([
                pair.getReserves(),
                pair.token0()
            ]);

            // Calculate price based on reserves
            const [reserve0, reserve1] = [reserves[0], reserves[1]];
            return token0.toLowerCase() === tokenAddress.toLowerCase() ?
                reserve1.mul(ethers.utils.parseEther('1')).div(reserve0) :
                reserve0.mul(ethers.utils.parseEther('1')).div(reserve1);
        } catch (error) {
            this.logger.error(`Error getting token price for ${tokenAddress}`, error);
            return 0;
        }
    }

    /**
     * Execute a buy transaction
     */
    async executeBuy(tokenAddress, amountEth) {
        try {
            const path = [this.wethAddress, tokenAddress];
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

            // Get minimum output amount
            const amounts = await this.uniswapRouter.getAmountsOut(
                ethers.utils.parseEther(amountEth.toString()),
                path
            );

            const slippage = this.config.trading?.slippageTolerance || 0.05; // 5% default slippage
            const minAmountOut = amounts[1].mul(ethers.BigNumber.from(100 - (slippage * 100))).div(100);

            // Execute swap
            const tx = await this.uniswapRouter.swapExactETHForTokens(
                minAmountOut,
                path,
                this.address,
                deadline,
                { value: ethers.utils.parseEther(amountEth.toString()) }
            );

            this.logger.info(`Buy transaction submitted: ${tx.hash}`);
            const receipt = await tx.wait();
            
            return {
                success: true,
                hash: tx.hash,
                amount: amountEth,
                tokenAmount: amounts[1].toString()
            };
        } catch (error) {
            this.logger.error(`Error executing buy for ${tokenAddress}`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Execute a sell transaction
     */
    async executeSell(tokenAddress, amount) {
        try {
            const token = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
            const path = [tokenAddress, this.wethAddress];
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

            // Approve router if needed
            const allowance = await token.allowance(this.address, this.uniswapRouterAddress);
            if (allowance.lt(amount)) {
                const approveTx = await token.approve(this.uniswapRouterAddress, amount);
                await approveTx.wait();
            }

            // Get minimum output amount
            const amounts = await this.uniswapRouter.getAmountsOut(amount, path);
            const slippage = this.config.trading?.slippageTolerance || 0.05; // 5% default slippage
            const minAmountOut = amounts[1].mul(ethers.BigNumber.from(100 - (slippage * 100))).div(100);

            // Execute swap
            const tx = await this.uniswapRouter.swapExactTokensForETH(
                amount,
                minAmountOut,
                path,
                this.address,
                deadline
            );

            this.logger.info(`Sell transaction submitted: ${tx.hash}`);
            const receipt = await tx.wait();
            
            return {
                success: true,
                hash: tx.hash,
                amount: amount.toString(),
                ethAmount: amounts[1].toString()
            };
        } catch (error) {
            this.logger.error(`Error executing sell for ${tokenAddress}`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get wallet balances
     */
    async getBalances() {
        try {
            const ethBalance = await this.provider.getBalance(this.address);
            const balances = {
                ETH: {
                    symbol: 'ETH',
                    balance: ethers.utils.formatEther(ethBalance),
                    address: this.wethAddress
                }
            };

            // Get balances of known tokens
            if (this.config.knownTokens) {
                for (const token of this.config.knownTokens) {
                    const tokenContract = new ethers.Contract(token.address, ERC20_ABI, this.provider);
                    const balance = await tokenContract.balanceOf(this.address);
                    if (balance.gt(0)) {
                        balances[token.symbol] = {
                            symbol: token.symbol,
                            balance: ethers.utils.formatUnits(balance, token.decimals),
                            address: token.address
                        };
                    }
                }
            }

            return balances;
        } catch (error) {
            this.logger.error('Error getting balances', error);
            return {};
        }
    }
}

module.exports = { EthereumConnector };