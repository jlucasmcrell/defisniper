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
const { ERC20_ABI } = require('../abis');
const { ConfigManager } = require('../config/configManager');

// Uniswap Router ABI (simplified)
const UNISWAP_ROUTER_ABI = [
  "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)"
];

// Uniswap Factory ABI (simplified)
const UNISWAP_FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) external view returns (address pair)"
];

// Uniswap Pair ABI (simplified)
const UNISWAP_PAIR_ABI = [
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)"
];

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
        this.provider
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

  // ... [rest of the methods remain exactly the same as in your current implementation]
}

module.exports = { EthereumConnector };