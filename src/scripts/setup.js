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
          resolve(answer.trim());
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
  return /^(0x)?[0-9a-fA-F]{64}$/.test(key);
}

/**
 * Validate Infura Project ID format
 */
function isValidInfuraId(id) {
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
    
    if (privateKey.startsWith('0x')) {
      privateKey = privateKey.slice(2);
    }
    
    isValidKey = isValidPrivateKey(`0x${privateKey}`);
    
    if (!isValidKey) {
      console.log('❌ Invalid private key format. Please enter a valid 64-character hex string.\n');
    }
  }
  
  const encryptedPrivateKey = securityManager.encrypt(privateKey);
  
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
    
    const encryptedInfuraId = securityManager.encrypt(infuraId);
    
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

  const useBnbChain = await prompt('Do you want to enable BNB Chain trading? (y/n)') === 'y';
  
  if (useBnbChain) {
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
  
  const useExchanges = await prompt('Do you want to configure centralized exchanges ▋