/**
 * Trend Trading Strategy
 * 
 * This strategy uses technical indicators like RSI, MACD, etc.
 * to identify medium-term trends for trading.
 */

const axios = require('axios');

class TrendTradingStrategy {
  constructor(wallets, exchanges, config, logger) {
    this.wallets = wallets;
    this.exchanges = exchanges;
    this.config = config;
    this.logger = logger;
    
    // Trading pairs to monitor
    this.watchlist = [
      { symbol: 'BTC/USDT', exchange: 'binanceUS' },
      { symbol: 'ETH/USDT', exchange: 'binanceUS' },
      { symbol: 'BNB/USDT', exchange: 'binanceUS' }
    ];
    
    // Store historical price data
    this.priceHistory = {};
    
    // Store calculated indicators
    this.indicators = {};
    
    // Initialize data stores
    this.watchlist.forEach(pair => {
      this.priceHistory[pair.symbol] = [];
      this.indicators[pair.symbol] = {
        rsi: [],
        macd: {
          line: [],
          signal: [],
          histogram: []
        }
      };
    });
  }
  
  /**
   * Find trend trading opportunities
   */
  async findOpportunities() {
    const opportunities = [];
    
    try {
      // Only proceed if we have exchange connections
      if (!this.exchanges.binanceUS && !this.exchanges.cryptoCom) {
        return [];
      }
      
      // Update price data
      await this.updateHistoricalData();
      
      // Calculate indicators
      this.calculateAllIndicators();
      
      // Check for signals
      for (const pair of this.watchlist) {
        const { symbol, exchange } = pair;
        
        // Check if we have enough data
        if (!this.indicators[symbol] || !this.indicators[symbol].rsi.length) {
          continue;
        }
        
        // Get the latest indicator values
        const latestRSI = this.indicators[symbol].rsi[this.indicators[symbol].rsi.length - 1];
        
        // Check for MACD values
        let macdCrossover = false;
        let macdHistogram = 0;
        
        if (this.indicators[symbol].macd.histogram.length >= 2) {
          const currentHistogram = this.indicators[symbol].macd.histogram[this.indicators[symbol].macd.histogram.length - 1];
          const previousHistogram = this.indicators[symbol].macd.histogram[this.indicators[symbol].macd.histogram.length - 2];
          
          // Check for crossover (sign change in histogram)
          macdCrossover = (currentHistogram > 0 && previousHistogram < 0) || 
                         (currentHistogram < 0 && previousHistogram > 0);
          
          macdHistogram = currentHistogram;
        }
        
        // Check for RSI conditions
        if (latestRSI < this.config.rsiLow) {
          // Oversold condition - potential buy
          this.logger.info(`RSI Oversold signal for ${symbol}: ${latestRSI.toFixed(2)}`);
          
          opportunities.push({
            network: exchange,
            symbol,
            action: 'buy',
            strategy: 'trendTrading',
            reason: `RSI Oversold: ${latestRSI.toFixed(2)}`
          });
        } else if (latestRSI > this.config.rsiHigh) {
          // Overbought condition - potential sell
          this.logger.info(`RSI Overbought signal for ${symbol}: ${latestRSI.toFixed(2)}`);
          
          opportunities.push({
            network: exchange,
            symbol,
            action: 'sell',
            strategy: 'trendTrading',
            reason: `RSI Overbought: ${latestRSI.toFixed(2)}`
          });
        }
        
        // Check for MACD crossovers
        if (macdCrossover) {
          const action = macdHistogram > 0 ? 'buy' : 'sell';
          
          this.logger.info(`MACD Crossover signal for ${symbol}: ${action.toUpperCase()}`);
          
          opportunities.push({
            network: exchange,
            symbol,
            action,
            strategy: 'trendTrading',
            reason: `MACD Crossover: ${action === 'buy' ? 'Bullish' : 'Bearish'}`
          });
        }
      }
      
      return opportunities;
    } catch (error) {
      this.logger.error('Error finding trend trading opportunities', { error: error.message });
      return [];
    }
  }
  
  /**
   * Update historical price data for all watchlist pairs
   */
  async updateHistoricalData() {
    try {
      // In a real implementation, you would:
      // 1. Use exchange APIs to get OHLCV (candle) data
      // 2. Store data with timestamps
      
      // For this simplified implementation, use real exchange data if available
      // or generate mock data if exchanges aren't connected
      
      if (this.exchanges.binanceUS) {
        for (const pair of this.watchlist) {
          const { symbol } = pair;
          
          // Get OHLCV data (1h timeframe)
          const candles = await this.exchanges.binanceUS.fetchOHLCV(symbol, '1h', undefined, 100);
          
          // Transform into our format
          const formattedCandles = candles.map(candle => ({
            timestamp: candle[0],
            open: candle[1],
            high: candle[2],
            low: candle[3],
            close: candle[4],
            volume: candle[5]
          }));
          
          // Update price history
          this.priceHistory[symbol] = formattedCandles;
        }
      } else {
        // Generate mock data for demo
        this.generateMockHistoricalData();
      }
    } catch (error) {
      this.logger.error('Error updating historical data', { error: error.message });
    }
  }
  
  /**
   * Generate mock historical data for testing
   */
  generateMockHistoricalData() {
    for (const pair of this.watchlist) {
      const { symbol } = pair;
      
      // Start with a base price based on the symbol
      let basePrice = this.getDefaultPrice(symbol);
      
      // Generate 100 hourly candles
      const candles = [];
      const now = Date.now();
      
      for (let i = 0; i < 100; i++) {
        // Random price movement (-2% to +2%)
        const volatility = 0.02;
        const change = basePrice * volatility * (Math.random() - 0.5);
        
        // Create a trend component (trending up or down over time)
        const trendDirection = Math.random() > 0.5 ? 1 : -1;
        const trendStrength = 0.0001;
        const trend = trendDirection * trendStrength * i;
        
        // Calculate candle values
        const close = basePrice + change + (basePrice * trend);
        const open = basePrice;
        const high = Math.max(open, close) + (basePrice * 0.005 * Math.random());
        const low = Math.min(open, close) - (basePrice * 0.005 * Math.random());
        const volume = 1000000 + (Math.random() * 2000000);
        
        // Add candle
        candles.push({
          timestamp: now - (i * 60 * 60 * 1000), // 1 hour intervals
          open,
          high,
          low,
          close,
          volume
        });
        
        // Update base price for next candle
        basePrice = close;
      }
      
      // Sort by timestamp (oldest first)
      candles.sort((a, b) => a.timestamp - b.timestamp);
      
      // Update price history
      this.priceHistory[symbol] = candles;
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
   * Calculate technical indicators for all pairs
   */
  calculateAllIndicators() {
    for (const pair of this.watchlist) {
      const { symbol } = pair;
      
      if (!this.priceHistory[symbol] || this.priceHistory[symbol].length < 30) {
        continue;
      }
      
      // Extract close prices
      const closes = this.priceHistory[symbol].map(candle => candle.close);
      
      // Calculate RSI
      this.indicators[symbol].rsi = this.calculateRSI(closes, 14);
      
      // Calculate MACD
      const macd = this.calculateMACD(
        closes, 
        this.config.macdFast || 12, 
        this.config.macdSlow || 26, 
        this.config.macdSignal || 9
      );
      
      this.indicators[symbol].macd = macd;
    }
  }
  
  /**
   * Calculate Relative Strength Index (RSI)
   */
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) {
      return [];
    }
    
    const rsi = [];
    let avgGain = 0;
    let avgLoss = 0;
    
    // Calculate first average gain and loss
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change >= 0) {
        avgGain += change;
      } else {
        avgLoss += Math.abs(change);
      }
    }
    
    avgGain /= period;
    avgLoss /= period;
    
    // Calculate first RSI
    let rs = avgGain / avgLoss;
    rsi.push(100 - (100 / (1 + rs)));
    
    // Calculate remaining RSI values
    for (let i = period + 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      let gain = 0;
      let loss = 0;
      
      if (change >= 0) {
        gain = change;
      } else {
        loss = Math.abs(change);
      }
      
      avgGain = ((avgGain * (period - 1)) + gain) / period;
      avgLoss = ((avgLoss * (period - 1)) + loss) / period;
      
      rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
    
    return rsi;
  }
  
  /**
   * Calculate Moving Average Convergence Divergence (MACD)
   */
  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (prices.length < slowPeriod + signalPeriod) {
      return { line: [], signal: [], histogram: [] };
    }
    
    // Calculate EMA for fast period
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    
    // Calculate EMA for slow period
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    
    // Calculate MACD line
    const macdLine = [];
    
    // Adjust for different lengths of EMAs
    const diff = slowPeriod - fastPeriod;
    for (let i = 0; i < slowEMA.length; i++) {
      macdLine.push(fastEMA[i + diff] - slowEMA[i]);
    }
    
    // Calculate Signal line (EMA of MACD line)
    const signalLine = this.calculateEMA(macdLine, signalPeriod);
    
    // Calculate Histogram (MACD line - Signal line)
    const histogram = [];
    
    // Adjust for length of Signal line
    const offset = macdLine.length - signalLine.length;
    for (let i = 0; i < signalLine.length; i++) {
      histogram.push(macdLine[i + offset] - signalLine[i]);
    }
    
    return {
      line: macdLine,
      signal: signalLine,
      histogram
    };
  }
  
  /**
   * Calculate Exponential Moving Average (EMA)
   */
  calculateEMA(prices, period) {
    if (prices.length < period) {
      return [];
    }
    
    const ema = [];
    
    // Start with simple moving average
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += prices[i];
    }
    
    // First EMA value is SMA
    let currentEMA = sum / period;
    ema.push(currentEMA);
    
    // Calculate multiplier (2 / (period + 1))
    const multiplier = 2 / (period + 1);
    
    // Calculate EMAs
    for (let i = period; i < prices.length; i++) {
      currentEMA = (prices[i] - currentEMA) * multiplier + currentEMA;
      ema.push(currentEMA);
    }
    
    return ema;
  }
}

module.exports = TrendTradingStrategy;