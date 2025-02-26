/**
 * CryptoSniperBot Setup Script
 * 
 * This script guides the user through the initial setup process:
 * - Setting up a password
 * - Configuring wallet and API credentials
 * - Setting up trading parameters
 */

const readline = require('readline');
const path = require('path');
const SecurityManager = require('../security/securityManager');
const ConfigManager = require('../config/configManager');
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
    if (isSecret) {
      console.log('\n⚠️  WARNING: You are about to enter sensitive information.');
      console.log('   Make sure no one is looking at your screen.');
      console.log('   Press Enter to continue...');
      rl.question('', () => {
        rl.question(`${question}: `, (answer) => {
          process.stdout.write('\r\x1b[K');
          resolve(answer.trim());
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
  logger.info('Dashboard password set successfully');
  console.log('✅ Dashboard password set successfully.');
}

/**
 * Setup encryption key
 */
async function setupEncryptionKey() {
  console.log('\n=== Encryption Setup ===');
  
  if (securityManager.isEncryptionKeySet()) {
    const changeKey = await prompt('Encryption key is already set. Do you want to change it? (y/n)') === 'y';
    if (!changeKey) return;
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
  logger.info('Encryption key set successfully');
  console.log('✅ Encryption key set successfully.');
}

/**
 * Setup wallet credentials
 */
async function setupWallet() {
  console.log('\n=== Wallet Setup ===');
  
  const config = configManager.getConfig();
  
  if (config.ethereum.privateKey || config.bnbChain.privateKey) {
    const reconfigureWallet = await prompt('Wallet is already configured. Do you want to reconfigure it? (y/n)') === 'y';
    if (!reconfigureWallet) return;
  }
  
  console.log('\nYou will need your Ethereum/BNB wallet private key.');
  console.log('This key will be encrypted and stored securely.');
  
  const privateKey = await prompt('Enter your wallet private key (64 hex characters)', true);
  const encryptedPrivateKey = securityManager.encrypt(privateKey);
  
  const useEthereum = await prompt('Do you want to enable Ethereum trading? (y/n)') === 'y';
  
  if (useEthereum) {
    const infuraId = await prompt('Enter your Infura Project ID', true);
    const encryptedInfuraId = securityManager.encrypt(infuraId);
    
    configManager.updateConfig({
      ethereum: {
        enabled: true,
        privateKey: encryptedPrivateKey,
        infuraId: encryptedInfuraId,
        provider: 'infura'
      }
    });
    
    logger.info('Ethereum configuration saved');
    console.log('✅ Ethereum configuration saved.');
  }
  
  const useBnbChain = await prompt('Do you want to enable BNB Chain trading? (y/n)') === 'y';
  
  if (useBnbChain) {
    configManager.updateConfig({
      bnbChain: {
        enabled: true,
        privateKey: encryptedPrivateKey
      }
    });
    
    logger.info('BNB Chain configuration saved');
    console.log('✅ BNB Chain configuration saved.');
  }
}

/**
 * Setup exchange API credentials
 */
async function setupExchanges() {
  console.log('\n=== Exchange Setup ===');
  
  const useExchanges = await prompt('Do you want to configure centralized exchanges? (y/n)') === 'y';
  
  if (!useExchanges) {
    configManager.updateConfig({
      exchanges: {
        binanceUS: { enabled: false },
        cryptoCom: { enabled: false }
      }
    });
    return;
  }
  
  const useBinanceUS = await prompt('Do you want to use Binance.US? (y/n)') === 'y';
  
  if (useBinanceUS) {
    console.log('\nYou will need your Binance.US API Key and Secret.');
    console.log('These will be encrypted and stored securely.');
    
    const apiKey = await prompt('Enter your Binance.US API Key', true);
    const apiSecret = await prompt('Enter your Binance.US API Secret', true);
    
    const encryptedApiKey = securityManager.encrypt(apiKey);
    const encryptedApiSecret = securityManager.encrypt(apiSecret);
    
    configManager.updateConfig({
      exchanges: {
        binanceUS: {
          enabled: true,
          apiKey: encryptedApiKey,
          apiSecret: encryptedApiSecret
        }
      }
    });
    
    logger.info('Binance.US configuration saved');
    console.log('✅ Binance.US configuration saved.');
  }
  
  const useCryptoCom = await prompt('Do you want to use Crypto.com? (y/n)') === 'y';
  
  if (useCryptoCom) {
    console.log('\nYou will need your Crypto.com API Key and Secret.');
    console.log('These will be encrypted and stored securely.');
    
    const apiKey = await prompt('Enter your Crypto.com API Key', true);
    const apiSecret = await prompt('Enter your Crypto.com API Secret', true);
    
    const encryptedApiKey = securityManager.encrypt(apiKey);
    const encryptedApiSecret = securityManager.encrypt(apiSecret);
    
    configManager.updateConfig({
      exchanges: {
        cryptoCom: {
          enabled: true,
          apiKey: encryptedApiKey,
          apiSecret: encryptedApiSecret
        }
      }
    });
    
    logger.info('Crypto.com configuration saved');
    console.log('✅ Crypto.com configuration saved.');
  }
}

/**
 * Setup trading parameters
 */
async function setupTradingParams() {
  console.log('\n=== Trading Parameters Setup ===');
  
  const walletBuyPercentage = parseFloat(await prompt('Wallet percentage to use per trade (1-100)', false) || '5');
  const stopLoss = parseFloat(await prompt('Stop-loss percentage', false) || '2.5');
  const takeProfit = parseFloat(await prompt('Take-profit percentage', false) || '5');
  const maxConcurrentTrades = parseInt(await prompt('Maximum concurrent trades', false) || '3');
  const maxTradesPerHour = parseInt(await prompt('Maximum trades per hour', false) || '10');
  const autoStart = await prompt('Auto-start bot when server starts? (y/n)') === 'y';
  
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
  
  logger.info('Trading parameters configured');
  console.log('✅ Trading parameters configured successfully.');
}

/**
 * Main setup function
 */
async function setup() {
  console.log('\n========================================================');
  console.log('            Starting CryptoSniperBot Setup');
  console.log('========================================================\n');
  
  try {
    // Setup dashboard password
    await setupPassword();
    
    // Setup encryption key
    await setupEncryptionKey();
    
    // Setup wallet
    await setupWallet();
    
    // Setup exchanges
    await setupExchanges();
    
    // Setup trading parameters
    await setupTradingParams();
    
    console.log('\n✅ Setup completed successfully!');
    console.log('\nYou can now start the bot using start_bot.bat\n');
    
  } catch (error) {
    logger.error('Setup failed', error);
    console.error('\n❌ Setup failed:', error.message);
    console.error('Please check the error messages above.\n');
  } finally {
    rl.close();
  }
}

// Run setup
setup();