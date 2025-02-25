/**
 * CryptoSniperBot Setup Script
 * 
 * This script guides the user through the initial setup process:
 * - Setting up a password
 * - Configuring wallet and API credentials
 * - Setting up trading parameters
 */

const readline = require('readline');
const { SecurityManager } = require('../security/securityManager');
const { ConfigManager } = require('../config/configManager');
const { Logger } = require('../utils/logger');

// Initialize components
const logger = new Logger('Setup');
const securityManager = new SecurityManager();
const configManager = new ConfigManager();

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Prompt user for input with optional hidden input for sensitive data
 */
function prompt(question, isSecret = false) {
  return new Promise((resolve) => {
    // In a real implementation, we would use a package like 'prompt' that supports hidden input
    // For simplicity in this example, we're just warning the user
    if (isSecret) {
      console.log('\n⚠️  WARNING: You are about to enter sensitive information.');
      console.log('   Make sure no one is looking at your screen.');
      console.log('   Press Enter to continue...');
      rl.question('', () => {
        rl.question(`${question}: `, (answer) => {
          resolve(answer.trim());
          // Clear line in console (limited effectiveness)
          process.stdout.write('\r\x1b[K');
        });
      });
    } else {
      rl.question(`${question}: `, (answer) => {
        resolve(answer.trim());
      });
    }
  });
}

/**
 * Validate Ethereum/BNB private key format
 */
function isValidPrivateKey(key) {
  // Basic validation - should be hex string of correct length
  return /^(0x)?[0-9a-fA-F]{64}$/.test(key);
}

/**
 * Validate Infura Project ID format
 */
function isValidInfuraId(id) {
  // Basic validation - should be hex string
  return /^[0-9a-f]{32}$/i.test(id);
}

/**
 * Setup dashboard password
 */
async function setupPassword() {
  console.log('\n=== Dashboard Security Setup ===');
  
  if (securityManager.isPasswordSet()) {
    const changePassword = await prompt('A password is already set. Do you want to change it? (y/n)') === 'y';
    if (!changePassword) return;
  }
  
  let password;
  let confirmed = false;
  
  while (!confirmed) {
    password = await prompt('Enter a password for the dashboard', true);
    
    if (password.length < 8) {
      console.log('❌ Password must be at least 8 characters long.');
      continue;
    }
    
    const confirmPassword = await prompt('Confirm password', true);
    
    if (password !== confirmPassword) {
      console.log('❌ Passwords do not match. Please try again.');
      continue;
    }
    
    confirmed = true;
  }
  
  securityManager.setPassword(password);
  console.log('✅ Dashboard password set successfully.');
}

/**
 * Setup encryption key
 */
async function setupEncryptionKey() {
  console.log('\n=== Encryption Setup ===');
  
  if (securityManager.isEncryptionKeySet()) {
    console.log('Encryption key is already set.');
    return;
  }
  
  const generateNew = await prompt('Do you want to generate a new encryption key? (y/n)') === 'y';
  
  let encryptionKey;
  
  if (generateNew) {
    encryptionKey = securityManager.generateEncryptionKey();
    console.log('\n⚠️  IMPORTANT: Save this encryption key in a secure location.');
    console.log('   You will need it to start the bot.\n');
    console.log(`Encryption Key: ${encryptionKey}`);
    
    await prompt('Press Enter after saving your encryption key...');
  } else {
    encryptionKey = await prompt('Enter your encryption key', true);
    
    if (encryptionKey.length < 32) {
      console.log('❌ Invalid encryption key. Generating a new one...');
      encryptionKey = securityManager.generateEncryptionKey();
      console.log(`Encryption Key: ${encryptionKey}`);
      
      await prompt('Press Enter after saving your encryption key...');
    }
  }
  
  securityManager.setEncryptionKey(encryptionKey);
  console.log('✅ Encryption key set successfully.');
}

/**
 * Setup blockchain wallet
 */
async function setupWallet() {
  console.log('\n=== Wallet Setup ===');
  
  const config = configManager.getConfig();
  const decryptedConfig = securityManager.decryptConfig(config);
  
  // Check if wallet is already configured
  if (decryptedConfig.ethereum && decryptedConfig.ethereum.privateKey) {
    const reconfigureWallet = await prompt('Wallet is already configured. Do you want to reconfigure it? (y/n)') === 'y';
    if (!reconfigureWallet) return;
  }
  
  console.log('\nYou will need your Ethereum/BNB wallet private key.');
  console.log('This key will be encrypted and stored securely.');
  
  let privateKey;
  let isValidKey = false;
  
  while (!isValidKey) {
    privateKey = await prompt('Enter your wallet private key (64 hex characters)', true);
    
    // Remove '0x' prefix if present
    if (privateKey.startsWith('0x')) {
      privateKey = privateKey.slice(2);
    }
    
    isValidKey = isValidPrivateKey(`0x${privateKey}`);
    
    if (!isValidKey) {
      console.log('❌ Invalid private key format. Please enter a valid 64-character hex string.\n');
    }
  }
  
  // Encrypt private key
  const encryptedPrivateKey = securityManager.encrypt(privateKey);
  
  // Setup Ethereum
  const useEthereum = await prompt('Do you want to enable Ethereum trading? (y/n)') === 'y';
  
  if (useEthereum) {
    let infuraId;
    let isValidId = false;
    
    while (!isValidId) {
      infuraId = await prompt('Enter your Infura Project ID', true);
      isValidId = isValidInfuraId(infuraId);
      
      if (!isValidId) {
        console.log('❌ Invalid Infura Project ID. Please check and try again.\n');
      }
    }
    
    // Encrypt Infura ID
    const encryptedInfuraId = securityManager.encrypt(infuraId);
    
    // Update config
    configManager.updateConfig({
      ethereum: {
        enabled: true,
        privateKey: encryptedPrivateKey,
        infuraId: encryptedInfuraId,
        provider: 'infura'
      }
    });
    
    console.log('✅ Ethereum configuration saved.');
  }
  // Setup BNB Chain
  const useBnbChain = await prompt('Do you want to enable BNB Chain trading? (y/n)') === 'y';
  
  if (useBnbChain) {
    // BNB Chain uses the same private key as Ethereum
    configManager.updateConfig({
      bnbChain: {
        enabled: true,
        privateKey: encryptedPrivateKey
      }
    });
    
    console.log('✅ BNB Chain configuration saved.');
  }
}

/**
 * Setup exchange connections
 */
async function setupExchanges() {
  console.log('\n=== Exchange Setup ===');
  
  const useExchanges = await prompt('Do you want to configure centralized exchanges? (y/n)') === 'y';
  
  if (!useExchanges) {
    // Disable exchanges if previously configured
    configManager.updateConfig({
      exchanges: {
        binanceUS: { enabled: false },
        cryptoCom: { enabled: false }
      }
    });
    return;
  }
  
  // Setup Binance.US
  const useBinanceUS = await prompt('Do you want to use Binance.US? (y/n)') === 'y';
  
  if (useBinanceUS) {
    console.log('\nYou will need your Binance.US API Key and Secret.');
    console.log('These will be encrypted and stored securely.');
    
    const binanceApiKey = await prompt('Enter your Binance.US API Key', true);
    const binanceApiSecret = await prompt('Enter your Binance.US API Secret', true);
    
    // Encrypt API credentials
    const encryptedApiKey = securityManager.encrypt(binanceApiKey);
    const encryptedApiSecret = securityManager.encrypt(binanceApiSecret);
    
    // Update config
    configManager.updateConfig({
      exchanges: {
        binanceUS: {
          enabled: true,
          apiKey: encryptedApiKey,
          apiSecret: encryptedApiSecret
        }
      }
    });
    
    console.log('✅ Binance.US configuration saved.');
  } else {
    // Disable Binance.US if previously configured
    configManager.updateConfig({
      exchanges: {
        binanceUS: { enabled: false }
      }
    });
  }
  
  // Setup Crypto.com
  const useCryptoCom = await prompt('Do you want to use Crypto.com? (y/n)') === 'y';
  
  if (useCryptoCom) {
    console.log('\nYou will need your Crypto.com API Key and Secret.');
    console.log('These will be encrypted and stored securely.');
    
    const cryptoComApiKey = await prompt('Enter your Crypto.com API Key', true);
    const cryptoComApiSecret = await prompt('Enter your Crypto.com API Secret', true);
    
    // Encrypt API credentials
    const encryptedApiKey = securityManager.encrypt(cryptoComApiKey);
    const encryptedApiSecret = securityManager.encrypt(cryptoComApiSecret);
    
    // Update config
    configManager.updateConfig({
      exchanges: {
        cryptoCom: {
          enabled: true,
          apiKey: encryptedApiKey,
          apiSecret: encryptedApiSecret
        }
      }
    });
    
    console.log('✅ Crypto.com configuration saved.');
  } else {
    // Disable Crypto.com if previously configured
    configManager.updateConfig({
      exchanges: {
        cryptoCom: { enabled: false }
      }
    });
  }
}

/**
 * Setup trading strategies
 */
async function setupStrategies() {
  console.log('\n=== Trading Strategies Setup ===');
  
  // Token Sniping
  const useTokenSniping = await prompt('Do you want to enable token sniping strategy? (y/n)') === 'y';
  
  let tokenSniperConfig = {
    enabled: useTokenSniping,
    minLiquidity: 10000,  // Default $10k
    maxBuyTax: 10,        // Default 10%
    maxSellTax: 10,       // Default 10%
    requireAudit: false   // Default false
  };
  
  if (useTokenSniping) {
    tokenSniperConfig.minLiquidity = parseInt(await prompt('Minimum liquidity for token sniping ($)', false) || '10000');
    tokenSniperConfig.maxBuyTax = parseInt(await prompt('Maximum buy tax percentage', false) || '10');
    tokenSniperConfig.maxSellTax = parseInt(await prompt('Maximum sell tax percentage', false) || '10');
    tokenSniperConfig.requireAudit = await prompt('Require verified contract? (y/n)') === 'y';
  }
  
  // Scalping
  const useScalping = await prompt('Do you want to enable scalping strategy? (y/n)') === 'y';
  
  let scalpingConfig = {
    enabled: useScalping,
    minPriceChange: 0.5,  // Default 0.5%
    maxTradeTime: 300     // Default 5 minutes
  };
  
  if (useScalping) {
    scalpingConfig.minPriceChange = parseFloat(await prompt('Minimum price change percentage', false) || '0.5');
    scalpingConfig.maxTradeTime = parseInt(await prompt('Maximum trade time (seconds)', false) || '300');
  }
  
  // Trend Trading
  const useTrendTrading = await prompt('Do you want to enable trend trading strategy? (y/n)') === 'y';
  
  let trendTradingConfig = {
    enabled: useTrendTrading,
    rsiLow: 30,          // Default 30
    rsiHigh: 70,         // Default 70
    macdFast: 12,        // Default 12
    macdSlow: 26,        // Default 26
    macdSignal: 9        // Default 9
  };
  
  if (useTrendTrading) {
    trendTradingConfig.rsiLow = parseInt(await prompt('RSI oversold threshold (1-100)', false) || '30');
    trendTradingConfig.rsiHigh = parseInt(await prompt('RSI overbought threshold (1-100)', false) || '70');
  }
  
  // Update config
  configManager.updateConfig({
    strategies: {
      tokenSniper: tokenSniperConfig,
      scalping: scalpingConfig,
      trendTrading: trendTradingConfig
    }
  });
  
  console.log('✅ Trading strategies configured successfully.');
}

/**
 * Setup trading parameters
 */
async function setupTradingParams() {
  console.log('\n=== Trading Parameters Setup ===');
  
  const walletBuyPercentage = parseFloat(await prompt('Wallet percentage to use per trade (1-100)', false) || '5');
  const stopLoss = parseFloat(await prompt('Stop-loss percentage', false) || '2.5');
  const takeProfit = parseFloat(await prompt('Take-profit percentage', false) || '5');
  const maxConcurrentTrades = parseInt(await prompt('Maximum concurrent trades', false) || '5');
  const maxTradesPerHour = parseInt(await prompt('Maximum trades per hour', false) || '10');
  const autoStart = await prompt('Auto-start bot when server starts? (y/n)') === 'y';
  
  // Update config
  configManager.updateConfig({
    trading: {
      walletBuyPercentage,
      stopLoss,
      takeProfit,
      maxConcurrentTrades,
      maxTradesPerHour,
      autoStart
    }
  });
  
  console.log('✅ Trading parameters configured successfully.');
}

/**
 * Main setup function
 */
async function setup() {
  console.log('\n🔐 CryptoSniperBot Setup\n');
  console.log('This wizard will guide you through setting up your trading bot.\n');
  
  try {
    // Setup dashboard password
    await setupPassword();
    
    // Setup encryption key
    await setupEncryptionKey();
    
    // Only continue if encryption key is set
    if (securityManager.isEncryptionKeySet()) {
      // Setup wallet
      await setupWallet();
      
      // Setup exchanges
      await setupExchanges();
      
      // Setup trading strategies
      await setupStrategies();
      
      // Setup trading parameters
      await setupTradingParams();
      
      console.log('\n✅ Setup completed successfully!');
      console.log('\nYou can now start the bot using start-bot.bat\n');
    } else {
      console.log('\n❌ Setup incomplete: Encryption key not set');
    }
  } catch (error) {
    logger.error('Setup failed', error);
    console.log('\n❌ Setup failed:', error.message);
  } finally {
    rl.close();
  }
}

// Run setup
setup();