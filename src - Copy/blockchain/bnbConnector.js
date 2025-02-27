/**
 * BNB Chain (Binance Smart Chain) Connector
 * 
 * Handles interactions with the BNB Chain blockchain including:
 * - Wallet connection and management
 * - Token trading via DEXes (PancakeSwap)
 * - Token price queries
 * - Gas price optimization
 */

const { ethers } = require('ethers');
const { ERC20_ABI } = require('../abis');

// PancakeSwap Router ABI (simplified)
const PANCAKESWAP_ROUTER_ABI = [
  "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)"
];

// PancakeSwap Factory ABI (simplified)
const PANCAKESWAP_FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) external view returns (address pair)"
];

// PancakeSwap Pair ABI (simplified)
const PANCAKESWAP_PAIR_ABI = [
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)"
];

class BnbConnector {
  constructor(privateKey, logger) {
    this.privateKey = privateKey;
    this.logger = logger;
    
    // Contract addresses
    this.pancakeswapRouterAddress = '0x10ED43C718714eb63d5aA57B78B54704E256024E'; // PancakeSwap Router
    this.pancakeswapFactoryAddress = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73'; // PancakeSwap Factory
    this.wbnbAddress = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'; // WBNB
    
    this.provider = null;
    this.wallet = null;
    this.signer = null;
    this.pancakeswapRouter = null;
    this.pancakeswapFactory = null;
  }
  
  /**
   * Initialize the connector
   */
  async initialize() {
    try {
      this.logger.info('Initializing BNB Chain connector');
      
      // Create provider
      const providerUrl = 'https://bsc-dataseed.binance.org/';
      this.provider = new ethers.providers.JsonRpcProvider(providerUrl);
      
      // Create wallet
      this.wallet = new ethers.Wallet(this.privateKey, this.provider);
      this.signer = this.wallet;
      
      // Create contract instances
      this.pancakeswapRouter = new ethers.Contract(
        this.pancakeswapRouterAddress,
        PANCAKESWAP_ROUTER_ABI,
        this.signer
      );
      
      this.pancakeswapFactory = new ethers.Contract(
        this.pancakeswapFactoryAddress,
        PANCAKESWAP_FACTORY_ABI,
        this.provider
      );
      
      // Get wallet address
      this.address = await this.wallet.getAddress();
      
      this.logger.info('BNB Chain connector initialized successfully');
      
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize BNB Chain connector', error);
      throw error;
    }
  }
  
  /**
   * Get the connected wallet
   */
  async getWallet() {
    return this.wallet;
  }
  
  /**
   * Get balances for the connected wallet
   */
  async getBalances() {
    try {
      // Get BNB balance
      const bnbBalance = await this.provider.getBalance(this.address);
      const bnbBalanceFormatted = parseFloat(ethers.utils.formatEther(bnbBalance));
      
      // Initialize balances object
      const balances = {
        'BNB': bnbBalanceFormatted
      };
      
      // Get USDT balance if available
      try {
        const usdtAddress = '0x55d398326f99059fF775485246999027B3197955'; // BUSD-T
        const usdtContract = new ethers.Contract(usdtAddress, ERC20_ABI, this.provider);
        const usdtBalance = await usdtContract.balanceOf(this.address);
        const usdtDecimals = await usdtContract.decimals();
        balances['USDT'] = parseFloat(ethers.utils.formatUnits(usdtBalance, usdtDecimals));
      } catch (e) {
        // Ignore USDT errors
      }
      
      return balances;
    } catch (error) {
      this.logger.error('Error getting BNB Chain balances', error);
      return { 'BNB': 0 };
    }
  }
  
  /**
   * Get token price in BNB
   */
  async getTokenPrice(tokenAddress) {
    try {
      // Get pair address from factory
      const pairAddress = await this.pancakeswapFactory.getPair(tokenAddress, this.wbnbAddress);
      
      if (pairAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('No liquidity pair found');
      }
      
      // Get pair contract
      const pairContract = new ethers.Contract(pairAddress, PANCAKESWAP_PAIR_ABI, this.provider);
      
      // Get reserves
      const reserves = await pairContract.getReserves();
      
      // Get token order
      const token0 = await pairContract.token0();
      
      // Calculate price based on token order
      let price;
      if (token0.toLowerCase() === tokenAddress.toLowerCase()) {
        // Token is token0, WBNB is token1
        price = parseFloat(ethers.utils.formatEther(reserves[1])) / 
                parseFloat(ethers.utils.formatUnits(reserves[0], 18));
      } else {
        // Token is token1, WBNB is token0
        price = parseFloat(ethers.utils.formatEther(reserves[0])) / 
                parseFloat(ethers.utils.formatUnits(reserves[1], 18));
      }
      
      // Convert BNB price to USD (estimate)
      const bnbUsdPrice = 300; // This should be fetched from an API in a real implementation
      return price * bnbUsdPrice;
    } catch (error) {
      this.logger.error(`Error getting price for token ${tokenAddress}`, error);
      return null;
    }
  }
  
  /**
   * Execute a buy (BNB to Token)
   */
  async executeBuy(tokenAddress, walletPercentage) {
    try {
      this.logger.info(`Executing buy for token ${tokenAddress}`);
      
      // Get BNB balance
      const bnbBalance = await this.provider.getBalance(this.address);
      
      // Calculate amount to spend (leave some for gas)
      const gasReserve = ethers.utils.parseEther('0.01'); // 0.01 BNB for gas (much cheaper than ETH)
      
      if (bnbBalance.lte(gasReserve)) {
        throw new Error('Insufficient BNB balance for gas reserve');
      }
      
      const availableBalance = bnbBalance.sub(gasReserve);
      const amountToSpend = availableBalance.mul(ethers.BigNumber.from(Math.floor(walletPercentage * 100)))
                                          .div(ethers.BigNumber.from(100));
      
      // Get current gas price
      const gasPrice = await this.provider.getGasPrice();
      
      // Apply multiplier for faster confirmation
      const gasMultiplier = 1.1; // 10% extra
      const adjustedGasPrice = gasPrice.mul(ethers.BigNumber.from(Math.floor(gasMultiplier * 100)))
                                     .div(ethers.BigNumber.from(100));
      
      // Prepare swap parameters
      const path = [this.wbnbAddress, tokenAddress];
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes
      
      // Get expected output
      const amountsOut = await this.pancakeswapRouter.getAmountsOut(amountToSpend, path);
      
      // Apply slippage tolerance
      const slippageTolerance = 0.05; // 5%
      const minAmountOut = amountsOut[1].mul(ethers.BigNumber.from(Math.floor((1 - slippageTolerance) * 1000)))
                                     .div(ethers.BigNumber.from(1000));
      
      // Execute swap
      const tx = await this.pancakeswapRouter.swapExactETHForTokens(
        minAmountOut,
        path,
        this.address,
        deadline,
        {
          value: amountToSpend,
          gasPrice: adjustedGasPrice,
          gasLimit: 300000 // Adjusted based on token complexity
        }
      );
      
      this.logger.info(`Buy transaction sent: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      this.logger.info(`Buy transaction confirmed: ${receipt.transactionHash}`);
      
      // Get token contract to check balance
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
      const tokenBalance = await tokenContract.balanceOf(this.address);
      const tokenDecimals = await tokenContract.decimals();
      
      // Get token symbol
      let tokenSymbol;
      try {
        tokenSymbol = await tokenContract.symbol();
      } catch (e) {
        tokenSymbol = 'UNKNOWN';
      }
      
      // Format balance
      const formattedBalance = ethers.utils.formatUnits(tokenBalance, tokenDecimals);
      
      // Return trade details
      return {
        symbol: `${tokenSymbol}/BNB`,
        amount: parseFloat(ethers.utils.formatEther(amountToSpend)),
        entryPrice: parseFloat(ethers.utils.formatEther(amountToSpend)) / parseFloat(formattedBalance),
        tokenAmount: parseFloat(formattedBalance),
        transactionHash: receipt.transactionHash
      };
    } catch (error) {
      this.logger.error(`Error executing buy for token ${tokenAddress}`, error);
      throw error;
    }
  }
  
  /**
   * Execute a sell (Token to BNB)
   */
  async executeSell(tokenAddress) {
    try {
      this.logger.info(`Executing sell for token ${tokenAddress}`);
      
      // Get token contract
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
      
      // Get token balance
      const tokenBalance = await tokenContract.balanceOf(this.address);
      
      if (tokenBalance.isZero()) {
        throw new Error('No tokens to sell');
      }
      
      // Get token details
      const tokenDecimals = await tokenContract.decimals();
      let tokenSymbol;
      try {
        tokenSymbol = await tokenContract.symbol();
      } catch (e) {
        tokenSymbol = 'UNKNOWN';
      }
      
      // Approve router to spend tokens
      const approveTx = await tokenContract.approve(this.pancakeswapRouterAddress, tokenBalance);
      await approveTx.wait();
      
      this.logger.info(`Token approval confirmed: ${approveTx.hash}`);
      
      // Get current gas price
      const gasPrice = await this.provider.getGasPrice();
      
      // Apply multiplier for faster confirmation
      const gasMultiplier = 1.1; // 10% extra
      const adjustedGasPrice = gasPrice.mul(ethers.BigNumber.from(Math.floor(gasMultiplier * 100)))
                                     .div(ethers.BigNumber.from(100));
      
      // Prepare swap parameters
      const path = [tokenAddress, this.wbnbAddress];
      const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes
      
      // Get expected output
      const amountsOut = await this.pancakeswapRouter.getAmountsOut(tokenBalance, path);
      
      // Apply slippage tolerance
      const slippageTolerance = 0.05; // 5%
      const minAmountOut = amountsOut[1].mul(ethers.BigNumber.from(Math.floor((1 - slippageTolerance) * 1000)))
                                     .div(ethers.BigNumber.from(1000));
      
      // Execute swap
      const tx = await this.pancakeswapRouter.swapExactTokensForETH(
        tokenBalance,
        minAmountOut,
        path,
        this.address,
        deadline,
        {
          gasPrice: adjustedGasPrice,
          gasLimit: 300000 // Adjusted based on token complexity
        }
      );
      
      this.logger.info(`Sell transaction sent: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      this.logger.info(`Sell transaction confirmed: ${receipt.transactionHash}`);
      
      // Return trade details
      return {
        symbol: `${tokenSymbol}/BNB`,
        amount: parseFloat(ethers.utils.formatUnits(tokenBalance, tokenDecimals)),
        exitPrice: parseFloat(ethers.utils.formatEther(minAmountOut)),
        transactionHash: receipt.transactionHash
      };
    } catch (error) {
      this.logger.error(`Error executing sell for token ${tokenAddress}`, error);
      throw error;
    }
  }
}

module.exports = { BnbConnector };
