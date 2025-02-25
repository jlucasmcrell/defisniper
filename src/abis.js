/**
 * Ethereum and BNB Chain Smart Contract ABIs
 * 
 * This file contains the ABIs (Application Binary Interfaces) 
 * for the various smart contracts used by the trading bot.
 */

// ERC20 token standard ABI for interacting with tokens
const ERC20_ABI = [
  // Read-only functions
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  
  // Write functions
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  
  // Events
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

// Uniswap V2 Router ABI for trading on Ethereum
const UNISWAP_ROUTER_ABI = [
  // Read-only functions
  "function WETH() external pure returns (address)",
  "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
  "function getAmountsIn(uint amountOut, address[] memory path) public view returns (uint[] memory amounts)",
  
  // Write functions
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
  "function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function swapTokensForExactTokens(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)"
];

// Uniswap V2 Factory ABI for finding pairs
const UNISWAP_FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) external view returns (address pair)",
  "event PairCreated(address indexed token0, address indexed token1, address pair, uint)"
];

// Uniswap V2 Pair ABI for getting reserves
const UNISWAP_PAIR_ABI = [
  "function getReserves() public view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)"
];

// PancakeSwap Router ABI for trading on BNB Chain
const PANCAKESWAP_ROUTER_ABI = [
  // Read-only functions
  "function WETH() external pure returns (address)",
  "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
  "function getAmountsIn(uint amountOut, address[] memory path) public view returns (uint[] memory amounts)",
  
  // Write functions
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
  "function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function swapTokensForExactTokens(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)"
];

// PancakeSwap Factory ABI for finding pairs
const PANCAKESWAP_FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) external view returns (address pair)",
  "event PairCreated(address indexed token0, address indexed token1, address pair, uint)"
];

// PancakeSwap Pair ABI for getting reserves
const PANCAKESWAP_PAIR_ABI = [
  "function getReserves() public view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() external view returns (address)",
  "function token1() external view returns (address)"
];

module.exports = {
  ERC20_ABI,
  UNISWAP_ROUTER_ABI,
  UNISWAP_FACTORY_ABI,
  UNISWAP_PAIR_ABI,
  PANCAKESWAP_ROUTER_ABI,
  PANCAKESWAP_FACTORY_ABI,
  PANCAKESWAP_PAIR_ABI
};
