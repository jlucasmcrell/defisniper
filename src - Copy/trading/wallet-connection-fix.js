// Enhanced wallet connection code for src/trading/engine.js

/**
 * Update wallet and exchange balances with improved error handling and data formatting
 */
async updateBalances() {
  try {
    this.logger.info('Updating wallet and exchange balances');
    const balances = {
      dex: {},
      exchanges: {}
    };
    
    // Get blockchain balances with better error handling
    for (const [network, connector] of Object.entries(this.blockchain)) {
      try {
        const blockchainBalance = await connector.getBalances();
        
        if (blockchainBalance) {
          // Add wallet address information
          const walletAddress = connector.getAddress ? connector.getAddress() : 'Unknown';
          
          balances.dex[network] = {
            address: walletAddress,
            balances: blockchainBalance
          };
          
          this.logger.info(`Updated ${network} balances`, { 
            address: walletAddress.substr(0, 10) + '...',
            tokens: Object.keys(blockchainBalance).length
          });
        }
      } catch (blockchainError) {
        this.logger.error(`Error fetching ${network} balances`, blockchainError);
        // Create empty balance object to prevent undefined errors
        balances.dex[network] = {
          address: 'Error fetching address',
          balances: {},
          error: blockchainError.message
        };
      }
    }
    
    // Get exchange balances with better error handling
    for (const [exchange, connector] of Object.entries(this.exchanges)) {
      try {
        const exchangeBalance = await connector.getBalances();
        
        if (exchangeBalance) {
          balances.exchanges[exchange] = exchangeBalance;
          
          this.logger.info(`Updated ${exchange} balances`, { 
            tokens: Object.keys(exchangeBalance).length
          });
        }
      } catch (exchangeError) {
        this.logger.error(`Error fetching ${exchange} balances`, exchangeError);
        // Create empty balance object to prevent undefined errors
        balances.exchanges[exchange] = {
          error: exchangeError.message
        };
      }
    }
    
    this.balances = balances;
    
    // Emit balance update with improved data structure
    this.socketIo.emit('walletBalances', balances);
    
    return balances;
  } catch (error) {
    this.logger.error('Error updating all balances', error);
    return {
      dex: {},
      exchanges: {},
      error: error.message
    };
  }
}

/**
 * Enhanced blockchain connector initialization
 */
async initializeBlockchainConnectors(decryptedConfig) {
  try {
    this.logger.info('Initializing blockchain connectors');
    
    // Initialize Ethereum connector
    if (decryptedConfig.ethereum && decryptedConfig.ethereum.enabled) {
      this.logger.info('Setting up Ethereum connector');
      
      // Log which provider is being used
      const providerType = decryptedConfig.ethereum.infuraId ? 'Infura' : 'Alchemy';
      this.logger.info(`Using ${providerType} as Ethereum provider`);
      
      // Create and initialize connector with better error handling
      try {
        const apiKey = decryptedConfig.ethereum.infuraId || decryptedConfig.ethereum.alchemyKey;
        
        if (!apiKey) {
          throw new Error('Missing API key for Ethereum provider');
        }
        
        this.blockchain.ethereum = new EthereumConnector(
          decryptedConfig.ethereum.privateKey,
          apiKey,
          this.logger
        );
        
        const success = await this.blockchain.ethereum.initialize();
        
        if (success) {
          this.logger.info('Ethereum connector initialized successfully');
          
          // Get and log the wallet address
          const address = this.blockchain.ethereum.getAddress ? 
                         this.blockchain.ethereum.getAddress() : 
                         'Unknown';
                         
          this.logger.info(`Ethereum wallet address: ${address.substr(0, 10)}...`);
        } else {
          throw new Error('Ethereum connector initialization returned false');
        }
      } catch (ethError) {
        this.logger.error('Failed to initialize Ethereum connector', ethError);
        // Don't throw, continue with other connectors
      }
    }
    
    // Initialize BNB Chain connector
    if (decryptedConfig.bnbChain && decryptedConfig.bnbChain.enabled) {
      this.logger.info('Setting up BNB Chain connector');
      
      try {
        // Get private key - might be the same as Ethereum key
        const privateKey = decryptedConfig.bnbChain.privateKey || decryptedConfig.ethereum.privateKey;
        
        if (!privateKey) {
          throw new Error('Missing private key for BNB Chain');
        }
        
        this.blockchain.bnbChain = new BnbConnector(
          privateKey,
          this.logger
        );
        
        const success = await this.blockchain.bnbChain.initialize();
        
        if (success) {
          this.logger.info('BNB Chain connector initialized successfully');
          
          // Get and log the wallet address
          const address = this.blockchain.bnbChain.getAddress ? 
                         this.blockchain.bnbChain.getAddress() : 
                         'Unknown';
                         
          this.logger.info(`BNB Chain wallet address: ${address.substr(0, 10)}...`);
        } else {
          throw new Error('BNB Chain connector initialization returned false');
        }
      } catch (bnbError) {
        this.logger.error('Failed to initialize BNB Chain connector', bnbError);
        // Don't throw, continue with other connectors
      }
    }
    
    return true;
  } catch (error) {
    this.logger.error('Error initializing blockchain connectors', error);
    return false;
  }
}

/**
 * Enhanced exchange connector initialization
 */
async initializeExchangeConnectors(decryptedConfig) {
  try {
    this.logger.info('Initializing exchange connectors');
    
    // Initialize Binance.US connector
    if (decryptedConfig.exchanges && decryptedConfig.exchanges.binanceUS && 
        decryptedConfig.exchanges.binanceUS.enabled) {
      this.logger.info('Setting up Binance.US connector');
      
      try {
        const apiKey = decryptedConfig.exchanges.binanceUS.apiKey;
        const apiSecret = decryptedConfig.exchanges.binanceUS.apiSecret;
        
        if (!apiKey || !apiSecret) {
          throw new Error('Missing API credentials for Binance.US');
        }
        
        this.exchanges.binanceUS = new BinanceExchange(
          apiKey,
          apiSecret,
          this.logger
        );
        
        const success = await this.exchanges.binanceUS.initialize();
        
        if (success) {
          this.logger.info('Binance.US connector initialized successfully');
          
          // Test connection by getting basic account info
          const balances = await this.exchanges.binanceUS.getBalances();
          const balanceCount = Object.keys(balances).length;
          
          this.logger.info(`Connected to Binance.US with ${balanceCount} currencies available`);
        } else {
          throw new Error('Binance.US connector initialization failed');
        }
      } catch (binanceError) {
        this.logger.error('Failed to initialize Binance.US connector', binanceError);
        // Don't throw, continue with other connectors
      }
    }
    
    // Initialize Crypto.com connector
    if (decryptedConfig.exchanges && decryptedConfig.exchanges.cryptoCom && 
        decryptedConfig.exchanges.cryptoCom.enabled) {
      this.logger.info('Setting up Crypto.com connector');
      
      try {
        const apiKey = decryptedConfig.exchanges.cryptoCom.apiKey;
        const apiSecret = decryptedConfig.exchanges.cryptoCom.apiSecret;
        
        if (!apiKey || !apiSecret) {
          throw new Error('Missing API credentials for Crypto.com');
        }
        
        this.exchanges.cryptoCom = new CryptocomExchange(
          apiKey,
          apiSecret,
          this.logger
        );
        
        const success = await this.exchanges.cryptoCom.initialize();
        
        if (success) {
          this.logger.info('Crypto.com connector initialized successfully');
          
          // Test connection by getting basic account info
          const balances = await this.exchanges.cryptoCom.getBalances();
          const balanceCount = Object.keys(balances).length;
          
          this.logger.info(`Connected to Crypto.com with ${balanceCount} currencies available`);
        } else {
          throw new Error('Crypto.com connector initialization failed');
        }
      } catch (cryptoComError) {
        this.logger.error('Failed to initialize Crypto.com connector', cryptoComError);
        // Don't throw, continue with other connectors
      }
    }
    
    return true;
  } catch (error) {
    this.logger.error('Error initializing exchange connectors', error);
    return false;
  }
}