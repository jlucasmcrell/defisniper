/**
 * Scalping Strategy
 * 
 * This strategy looks for short-term price movements to capitalize
 * on quick market inefficiencies.
 */

const axios = require('axios');

class ScalpingStrategy {
  constructor(wallets, exchanges, config, logger) {
    this.wallets = wallets;
    this.exchanges = exchanges;
    this.config = config;
    this.logger = logger;
    
    // Trading pairs to monitor
    this.watchlist = [
      { symbol: 'BTC/USDT', exchange: 'binanceUS' },
      { symbol: 'ETH/USDT', exchange: 'binanceUS' },
      { symbol: 'BNB/USDT', exchange: 'binanceUS' },
      { symbol: 'SOL/USDT', exchange: 'binanceUS' }
    ];
    
    // Store historical price data
    this.priceHistory = {};
    
    // Initialize price history for each pair
    this.watchlist.forEach(pair => {
      this.priceHistory[pair.symbol] = [];
    });
  }
  
  /**
   * Find scalping opportunities
   */
  async findOpportunities() {
    const opportunities = [];
    
    try {
      // Only proceed if we have exchange connections
      if (!this.exchanges.binanceUS && !this.exchanges.cryptoCom) {
        return [];
      }
      
      // Update price data
      await this.updatePriceData();
      
      // Analyze each pair for scalping opportunities
      for (const pair of this.watchlist) {
        const { symbol, exchange } = pair;
        
        // Check if we have enough price history
        if (this.priceHistory[symbol].length < 10) {
          continue;
        }
        
        // Analyze for scalping opportunity
        const signal = this.analyzeForScalp(symbol);
        
        if (signal) {
          this.logger.info(`Scalping opportunity found: ${symbol} ${signal.action.toUpperCase()}`, {
            signal
          });
          
          opportunities.push({
            network: exchange,
            symbol,
            action: signal.action,
            strategy: 'scalping',
            reason: signal.reason
          });
        }
      }
      
      return opportunities;
    } catch (error) {
      this.logger.error('Error finding scalping opportunities', { error: error.message });
      return [];
    }
  }
  
  /**
   * Update price data for watchlist
   */
  async updatePriceData() {
    try {
      // In a real implementation, you would:
      // 1. Use exchange APIs or WebSockets to get real-time price data
      // 2. Store data with timestamps in a rolling window
      
      // For this simplified implementation, use CoinGecko API for demo
      // or generate mock data if exchanges aren't available
      
      if (this.exchanges.binanceUS) {
        for (const pair of this.watchlist) {
          const { symbol } = pair;
          
          // Get latest ticker data
          const ticker = await this.exchanges.binanceUS.fetchTicker(symbol);
          
          // Add to price history with timestamp
          this.priceHistory[symbol].push({
            timestamp: Date.now(),
            price: ticker.last,
            volume: ticker.quoteVolume
          });
          
          // Keep only the last 100 data points
          if (this.priceHistory[symbol].length > 100) {
            this.priceHistory[symbol] = this.priceHistory[symbol].slice(-100);
          }
        }
      } else {
        // Generate mock data for demo
        this.generateMockPriceData();
      }
    } catch (error) {
      this.logger.error('Error updating price data', { error: error.message });
    }
  }
  
  /**
   * Generate mock price data for testing
   */
  generateMockPriceData() {
    for (const pair of this.watchlist) {
      const { symbol } = pair;
      
      // Get the last price or use a default
      const lastPrice = this.priceHistory[symbol].length > 0
        ? this.priceHistory[symbol][this.priceHistory[symbol].length - 1].price
        : this.getDefaultPrice(symbol);
      
      // Generate a new price with small random change
      const changePercent = (Math.random() * 0.6) - 0.3; // -0.3% to +0.3%
      const newPrice = lastPrice * (1 + (changePercent / 100));
      
      // Add to price history
      this.priceHistory[symbol].push({
        timestamp: Date.now(),
        price: newPrice,
        volume: Math.random() * 1000000
      });
      
      // Keep only the last 100 data points
      if (this.priceHistory[symbol].length > 100) {
        this.priceHistory[symbol] = this.priceHistory[symbol].slice(-100);
      }
    }
  }
  
  /**
   * Get default price for a symbol
   */
  getDefaultPrice(symbol) {
    if (symbol.startsWith('BTC')) return 30000;
    if (symbol.startsWith('ETH')) return 2000;
    if (symbol.startsWith('BNB')) return 300;
    if (symbol.startsWith('SOL')) return 100;
    return 1;
  }
  
  /**
   * Analyze price data for scalping opportunities
   */
  analyzeForScalp(symbol) {
    const prices = this.priceHistory[symbol];
    
    if (prices.length < 10) {
      return null;
    }
    
    // Get the most recent prices
    const recentPrices = prices.slice(-10);
    
    // Calculate short-term momentum
    const currentPrice = recentPrices[recentPrices.length - 1].price;
    const previousPrice = recentPrices[recentPrices.length - 5].price;
    
    // Calculate percentage change
    const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;
    
    // Define the minimum price change to trigger a signal
    const minPriceChange = this.config.minPriceChange || 0.5;
    
    // Check for rapid price movements
    if (priceChange > minPriceChange) {
      // Upward movement - potential buy
      return {
        action: 'buy',
        price: currentPrice,
        change: priceChange.toFixed(2),
        reason: `Rapid price increase: +${priceChange.toFixed(2)}%`
      };
    } else if (priceChange < -minPriceChange) {
      // Downward movement with potential reversal
      // Check for oversold condition or reversal pattern
      
      // For this simple demo, just look at very recent price to detect a potential bounce
      const lastTwoPrices = recentPrices.slice(-2);
      const veryRecentChange = ((lastTwoPrices[1].price - lastTwoPrices[0].price) / lastTwoPrices[0].price) * 100;
      
      if (veryRecentChange > 0.1) {
        // Slight uptick after a downward movement - potential reversal
        return {
          action: 'buy',
          price: currentPrice,
          change: priceChange.toFixed(2),
          reason: `Potential reversal after drop of ${priceChange.toFixed(2)}%`
        };
      }
    }
    
    return null;
  }
}

module.exports = { ScalpingStrategy };