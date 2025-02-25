/**
 * Direct Strategy Replacement
 * 
 * A final attempt to create a working strategy by mimicking the token sniping strategy's format.
 */

// Module format matching standard Node.js style
module.exports = class SimpleMAStrategy {
  constructor(config, exchangeConnector) {
    this.name = 'SimpleMA';
    this.config = config || {};
    this.exchangeConnector = exchangeConnector;
    
    // Configuration
    this.fastPeriod = this.config.fastPeriod || 9;
    this.slowPeriod = this.config.slowPeriod || 21;
    this.symbols = this.config.symbols || ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'];
    
    // State
    this.priceData = {};
    this.signals = {};
    this.running = false;
    
    // Initialize data structures
    this.symbols.forEach(symbol => {
      this.priceData[symbol] = [];
      this.signals[symbol] = 'NEUTRAL';
    });
    
    console.log(`SimpleMAStrategy initialized with ${this.symbols.length} symbols`);
  }
  
  /**
   * Calculate Simple Moving Average (SMA)
   */
  calculateSMA(prices, period) {
    if (prices.length < period) {
      return null;
    }
    
    const sum = prices.slice(-period).reduce((total, price) => total + price, 0);
    return sum / period;
  }
  
  /**
   * Analyze price data and generate signals
   */
  async analyze(symbol, timeframe = '1h') {
    try {
      console.log(`Analyzing ${symbol} on ${timeframe} timeframe`);
      
      // Get candle data from exchange
      let candles;
      if (this.exchangeConnector && typeof this.exchangeConnector.getCandles === 'function') {
        candles = await this.exchangeConnector.getCandles(symbol, timeframe, this.slowPeriod + 10);
      } else {
        console.log('Exchange connector not available, using mock data');
        candles = this.generateMockCandles(symbol, this.slowPeriod + 10);
      }
      
      // Extract close prices
      const closePrices = candles.map(candle => 
        typeof candle.close === 'number' ? candle.close : 
        (candle[4] || candle.c || 0)
      );
      
      // Store price data
      this.priceData[symbol] = closePrices;
      
      // Calculate moving averages
      const fastMA = this.calculateSMA(closePrices, this.fastPeriod);
      const slowMA = this.calculateSMA(closePrices, this.slowPeriod);
      
      if (fastMA === null || slowMA === null) {
        console.log(`Not enough data for ${symbol}`);
        return { signal: 'NEUTRAL', confidence: 0 };
      }
      
      // Generate signal based on MA crossover
      let signal = 'NEUTRAL';
      let confidence = 0;
      
      if (fastMA > slowMA) {
        // Fast MA above slow MA = bullish
        signal = 'BUY';
        confidence = ((fastMA / slowMA) - 1) * 100; // % difference as confidence
      } else if (fastMA < slowMA) {
        // Fast MA below slow MA = bearish
        signal = 'SELL';
        confidence = ((slowMA / fastMA) - 1) * 100; // % difference as confidence
      }
      
      // Limit confidence to 0-100%
      confidence = Math.min(100, Math.max(0, confidence));
      
      // Update stored signal
      this.signals[symbol] = signal;
      
      console.log(`${symbol} signal: ${signal} (${confidence.toFixed(2)}% confidence)`);
      return { signal, confidence };
    } catch (error) {
      console.error(`Error analyzing ${symbol}:`, error);
      return { signal: 'ERROR', confidence: 0 };
    }
  }
  
  /**
   * Generate mock candles for testing
   */
  generateMockCandles(symbol, count) {
    const candles = [];
    let price = 100; // Starting price
    
    // Different starting price based on symbol
    if (symbol.includes('BTC')) price = 30000;
    if (symbol.includes('ETH')) price = 1800;
    if (symbol.includes('BNB')) price = 250;
    
    const now = Date.now();
    const interval = 3600 * 1000; // 1 hour in milliseconds
    
    for (let i = 0; i < count; i++) {
      // Random price change (-2% to +2%)
      const change = price * (Math.random() * 0.04 - 0.02);
      price += change;
      
      const timestamp = now - ((count - i) * interval);
      
      candles.push({
        timestamp,
        open: price - (change / 2),
        high: price + Math.abs(change / 2),
        low: price - Math.abs(change / 2),
        close: price,
        volume: 1000 + Math.random() * 9000
      });
    }
    
    return candles;
  }
  
  /**
   * Process new price updates
   */
  async onTick(data) {
    // Convert different possible data formats
    const symbol = data.symbol || data.pair || Object.keys(data)[0] || this.symbols[0];
    
    // Update with latest price if available
    let price = null;
    if (typeof data.price === 'number') {
      price = data.price;
    } else if (typeof data.close === 'number') {
      price = data.close;
    } else if (typeof data.last === 'number') {
      price = data.last;
    }
    
    if (price !== null && this.priceData[symbol]) {
      this.priceData[symbol].push(price);
      // Keep array at a reasonable size
      if (this.priceData[symbol].length > this.slowPeriod * 2) {
        this.priceData[symbol] = this.priceData[symbol].slice(-this.slowPeriod * 2);
      }
    }
    
    // Re-analyze with the updated data
    return await this.analyze(symbol);
  }
  
  /**
   * Find trading opportunities based on current signals
   */
  async findOpportunities() {
    const opportunities = [];
    
    // Analyze all symbols
    for (const symbol of this.symbols) {
      const result = await this.analyze(symbol);
      
      if (result.signal === 'BUY') {
        opportunities.push({
          symbol,
          action: 'buy',
          confidence: result.confidence,
          strategy: 'simpleMA',
          reason: `MA Crossover: Fast MA > Slow MA`
        });
      } else if (result.signal === 'SELL') {
        opportunities.push({
          symbol,
          action: 'sell',
          confidence: result.confidence,
          strategy: 'simpleMA',
          reason: `MA Crossover: Fast MA < Slow MA`
        });
      }
    }
    
    return opportunities;
  }
  
  /**
   * Start the strategy 
   */
  async start() {
    console.log('SimpleMAStrategy started');
    this.running = true;
    return true;
  }
  
  /**
   * Stop the strategy
   */
  async stop() {
    console.log('SimpleMAStrategy stopped');
    this.running = false;
    return true;
  }
};
