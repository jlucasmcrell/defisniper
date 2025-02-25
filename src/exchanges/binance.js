/**
 * Binance.US Exchange Connector
 * 
 * Handles interactions with the Binance.US exchange API for:
 * - Account info and balances
 * - Market data
 * - Order placement and management
 */

const ccxt = require('ccxt');

class BinanceExchange {
  constructor(apiKey, apiSecret, logger) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.logger = logger;
    this.exchange = null;
    this.markets = null;
    this.tickers = {};
    this.lastTickerUpdate = 0;
  }
  
  /**
   * Initialize the exchange connector
   */
  async initialize() {
    try {
      this.logger.info('Initializing Binance.US exchange connector');
      
      // Create exchange instance
      this.exchange = new ccxt.binanceus({
        apiKey: this.apiKey,
        secret: this.apiSecret,
        timeout: 30000,
        enableRateLimit: true
      });
      
      // Test connection
      await this.updateMarkets();
      
      // Test API key permissions
      if (this.apiKey && this.apiSecret) {
        try {
          await this.exchange.fetchBalance();
          this.logger.info('Binance.US API key valid with trading permissions');
        } catch (error) {
          this.logger.error('Binance.US API key error:', error.message);
          throw new Error('Invalid API key or insufficient permissions');
        }
      }
      
      this.logger.info('Binance.US exchange connector initialized successfully');
      
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize Binance.US exchange connector', error);
      throw error;
    }
  }
  
  /**
   * Update available markets
   */
  async updateMarkets() {
    try {
      this.markets = await this.exchange.loadMarkets();
      this.logger.info(`Loaded ${Object.keys(this.markets).length} markets from Binance.US`);
      return this.markets;
    } catch (error) {
      this.logger.error('Error loading markets', error);
      throw error;
    }
  }
  
  /**
   * Get account balances
   */
  async getBalances() {
    try {
      // Skip if no API credentials
      if (!this.apiKey || !this.apiSecret) {
        return {};
      }
      
      const balanceData = await this.exchange.fetchBalance();
      
      // Format balances
      const balances = {};
      
      // Only include non-zero balances
      for (const currency in balanceData.total) {
        const amount = balanceData.total[currency];
        if (amount > 0) {
          balances[currency] = amount;
        }
      }
      
      return balances;
    } catch (error) {
      this.logger.error('Error getting balances', error);
      return {};
    }
  }
  
  /**
   * Get current price for a symbol
   */
  async getCurrentPrice(symbol) {
    try {
      // Check if we need to update tickers
      const now = Date.now();
      if (now - this.lastTickerUpdate > 10000) { // 10 seconds cache
        await this.updateTickers();
      }
      
      // Return from cache if available
      if (this.tickers[symbol]) {
        return this.tickers[symbol];
      }
      
      // Otherwise fetch individual ticker
      const ticker = await this.exchange.fetchTicker(symbol);
      return ticker.last;
    } catch (error) {
      this.logger.error(`Error getting current price for ${symbol}`, error);
      return null;
    }
  }
  
  /**
   * Update all tickers at once (more efficient)
   */
  async updateTickers() {
    try {
      const tickers = await this.exchange.fetchTickers();
      
      for (const symbol in tickers) {
        this.tickers[symbol] = tickers[symbol].last;
      }
      
      this.lastTickerUpdate = Date.now();
    } catch (error) {
      this.logger.error('Error updating tickers', error);
    }
  }
  
  /**
   * Execute a trade
   */
  async executeTrade(symbol, action, amount, price = null) {
    try {
      this.logger.info(`Executing ${action} for ${symbol} (${amount})`);
      
      // Validate symbol
      if (!this.markets || !this.markets[symbol]) {
        await this.updateMarkets();
        
        if (!this.markets[symbol]) {
          throw new Error(`Symbol ${symbol} not found on Binance.US`);
        }
      }
      
      // Determine order type
      const type = price ? 'limit' : 'market';
      
      // Place order
      const order = await this.exchange.createOrder(
        symbol,
        type,
        action,
        amount,
        price
      );
      
      this.logger.info(`Order placed: ${order.id}`);
      
      // For market orders, we're done
      if (type === 'market') {
        return {
          orderId: order.id,
          symbol,
          action,
          amount,
          price: order.price,
          status: 'completed',
          timestamp: Date.now()
        };
      }
      
      // For limit orders, wait for it to fill
      let filledOrder;
      let isFilled = false;
      let attempts = 0;
      
      while (!isFilled && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        
        filledOrder = await this.exchange.fetchOrder(order.id, symbol);
        isFilled = filledOrder.status === 'closed';
        
        attempts++;
      }
      
      if (isFilled) {
        this.logger.info(`Order ${order.id} filled`);
      } else {
        this.logger.warn(`Order ${order.id} not filled after ${attempts} attempts`);
      }
      
      return {
        orderId: order.id,
        symbol,
        action,
        amount,
        price: filledOrder.price || price,
        status: filledOrder.status,
        timestamp: Date.now()
      };
    } catch (error) {
      this.logger.error(`Error executing trade for ${symbol}`, error);
      throw error;
    }
  }
  
  /**
   * Get open orders
   */
  async getOpenOrders() {
    try {
      return await this.exchange.fetchOpenOrders();
    } catch (error) {
      this.logger.error('Error getting open orders', error);
      return [];
    }
  }
  
  /**
   * Cancel an order
   */
  async cancelOrder(orderId, symbol) {
    try {
      await this.exchange.cancelOrder(orderId, symbol);
      this.logger.info(`Order ${orderId} cancelled`);
      return true;
    } catch (error) {
      this.logger.error(`Error cancelling order ${orderId}`, error);
      return false;
    }
  }
  
  /**
   * Get order book for a symbol
   */
  async getOrderBook(symbol) {
    try {
      const orderBook = await this.exchange.fetchOrderBook(symbol);
      return orderBook;
    } catch (error) {
      this.logger.error(`Error getting order book for ${symbol}`, error);
      return null;
    }
  }
  
  /**
   * Check if a symbol is valid
   */
  isValidSymbol(symbol) {
    return !!this.markets && !!this.markets[symbol];
  }
}

module.exports = { BinanceExchange };
