/**
 * Expanded Trading Strategy Implementation
 * 
 * This updated TrendTradingStrategy expands the supported tokens and improves detection logic
 */

class EnhancedTrendTradingStrategy {
  constructor(blockchain, exchanges, config, logger) {
    this.blockchain = blockchain;
    this.exchanges = exchanges;
    this.config = config || {};
    this.logger = logger;
    
    // Expanded watchlist with more trading pairs
    this.watchlist = [
      // Major cryptocurrencies
      { symbol: 'BTC/USDT', exchange: 'binanceUS', name: 'Bitcoin' },
      { symbol: 'ETH/USDT', exchange: 'binanceUS', name: 'Ethereum' },
      { symbol: 'BNB/USDT', exchange: 'binanceUS', name: 'Binance Coin' },
      { symbol: 'SOL/USDT', exchange: 'binanceUS', name: 'Solana' },
      { symbol: 'ADA/USDT', exchange: 'binanceUS', name: 'Cardano' },
      { symbol: 'XRP/USDT', exchange: 'binanceUS', name: 'Ripple' },
      { symbol: 'DOT/USDT', exchange: 'binanceUS', name: 'Polkadot' },
      { symbol: 'AVAX/USDT', exchange: 'binanceUS', name: 'Avalanche' },
      
      // Memecoins
      { symbol: 'DOGE/USDT', exchange: 'binanceUS', name: 'Dogecoin' },
      { symbol: 'SHIB/USDT', exchange: 'binanceUS', name: 'Shiba Inu' },
      { symbol: 'PEPE/USDT', exchange: 'binanceUS', name: 'Pepe' },
      { symbol: 'FLOKI/USDT', exchange: 'binanceUS', name: 'Floki Inu' },
      
      // DeFi Tokens
      { symbol: 'UNI/USDT', exchange: 'binanceUS', name: 'Uniswap' },
      { symbol: 'AAVE/USDT', exchange: 'binanceUS', name: 'Aave' },
      { symbol: 'LINK/USDT', exchange: 'binanceUS', name: 'Chainlink' },
      { symbol: 'CAKE/USDT', exchange: 'binanceUS', name: 'PancakeSwap' },
      
      // Exchange Tokens
      { symbol: 'CRO/USDT', exchange: 'cryptoCom', name: 'Crypto.com Coin' },
      
      // Gaming & Metaverse
      { symbol: 'AXS/USDT', exchange: 'binanceUS', name: 'Axie Infinity' },
      { symbol: 'SAND/USDT', exchange: 'binanceUS', name: 'The Sandbox' },
      { symbol: 'MANA/USDT', exchange: 'binanceUS', name: 'Decentraland' },
    ];
    
    // Store historical price data
    this.priceHistory = {};
    
    // Store calculated indicators
    this.indicators = {};
    
    // Initialize data stores for all pairs
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

    this.lastUpdate = 0;
    this.updateInterval = 30000; // 30 seconds
  }
  
  /**
   * Find trend trading opportunities - optimized implementation
   */
  async findOpportunities() {
    const opportunities = [];
    
    try {
      // Only update data periodically to prevent API rate limits
      const now = Date.now();
      if (now - this.lastUpdate < this.updateInterval) {
        this.logger.debug('Using cached data for trading opportunities');
        // We can still use the latest indicators without refetching
      } else {
        // Update price data
        await this.updateHistoricalData();
        
        // Calculate indicators
        this.calculateAllIndicators();
        
        this.lastUpdate = now;
      }
      
      this.logger.info('Scanning for trend trading opportunities');
      
      // Check for signals with detailed logging
      let opportunityCount = 0;
      
      for (const pair of this.watchlist) {
        const { symbol, exchange, name } = pair;
        
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
        
        // Get RSI configuration values (use defaults if not specified)
        const rsiLow = this.config.rsiLow || 30;
        const rsiHigh = this.config.rsiHigh || 70;
        
        // Check for RSI conditions
        if (latestRSI < rsiLow) {
          // Oversold condition - potential buy
          this.logger.info(`RSI Oversold signal for ${symbol} (${name}): ${latestRSI.toFixed(2)}`);
          
          opportunities.push({
            network: exchange,
            symbol,
            name,
            action: 'buy',
            strategy: 'trendTrading',
            reason: `RSI Oversold: ${latestRSI.toFixed(2)}`,
            strength: mapRange(latestRSI, rsiLow, 0, 0, 100)
          });
          
          opportunityCount++;
        } else if (latestRSI > rsiHigh) {
          // Overbought condition - potential sell
          this.logger.info(`RSI Overbought signal for ${symbol} (${name}): ${latestRSI.toFixed(2)}`);
          
          opportunities.push({
            network: exchange,
            symbol,
            name,
            action: 'sell',
            strategy: 'trendTrading',
            reason: `RSI Overbought: ${latestRSI.toFixed(2)}`,
            strength: mapRange(latestRSI, rsiHigh, 100, 0, 100)
          });
          
          opportunityCount++;
        }
        
        // Check for MACD crossovers
        if (macdCrossover) {
          const action = macdHistogram > 0 ? 'buy' : 'sell';
          
          this.logger.info(`MACD Crossover signal for ${symbol} (${name}): ${action.toUpperCase()}`);
          
          opportunities.push({
            network: exchange,
            symbol,
            name,
            action,
            strategy: 'trendTrading',
            reason: `MACD Crossover: ${action === 'buy' ? 'Bullish' : 'Bearish'}`,
            strength: 70 // Fixed strength for MACD crossovers
          });
          
          opportunityCount++;
        }
      }
      
      this.logger.info(`Found ${opportunityCount} trend trading opportunities`);
      return opportunities;
    } catch (error) {
      this.logger.error('Error finding trend trading opportunities', error);
      return [];
    }
  }
  
  /**
   * Enhanced update of historical price data
   */
  async updateHistoricalData() {
    let updatedPairs = 0;
    
    this.logger.info('Updating market data for trend analysis');
    
    // Create a map of available exchanges
    const availableExchanges = new Map();
    for (const [name, exchange] of Object.entries(this.exchanges)) {
      availableExchanges.set(name, exchange);
    }
    
    // Process each trading pair
    for (const pair of this.watchlist) {
      try {
        const { symbol, exchange } = pair;
        
        // Get the exchange connector
        const exchangeConnector = availableExchanges.get(exchange);
        
        if (!exchangeConnector) {
          this.logger.debug(`Exchange ${exchange} not available, using mock data for ${symbol}`);
          this.generateMockDataForPair(pair);
          updatedPairs++;
          continue;
        }
        
        // Try to get real market data
        try {
          // Get OHLCV data (1h timeframe)
          const candles = await exchangeConnector.fetchOHLCV(symbol, '1h', undefined, 100);
          
          if (!candles || candles.length === 0) {
            throw new Error('No candles returned');
          }
          
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
          this.logger.debug(`Updated market data for ${symbol} with ${formattedCandles.length} candles`);
          
          updatedPairs++;
        } catch (error) {
          this.logger.warn(`Could not get real data for ${symbol}, using mock data`, error.message);
          this.generateMockDataForPair(pair);
          updatedPairs++;
        }
      } catch (error) {
        this.logger.error(`Error updating data for ${pair.symbol}`, error.message);
      }
    }
    
    this.logger.info(`Successfully updated market data for ${updatedPairs}/${this.watchlist.length} trading pairs`);
  }
  
  /**
   * Generate mock historical data for a specific pair
   */
  generateMockDataForPair(pair) {
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
  
  /**
   * Get default price for a symbol (expanded for more tokens)
   */
  getDefaultPrice(symbol) {
    if (symbol.startsWith('BTC')) return 30000 + (Math.random() * 2000);
    if (symbol.startsWith('ETH')) return 2000 + (Math.random() * 200);
    if (symbol.startsWith('BNB')) return 300 + (Math.random() * 20);
    if (symbol.startsWith('SOL')) return 100 + (Math.random() * 10);
    if (symbol.startsWith('ADA')) return 0.5 + (Math.random() * 0.1);
    if (symbol.startsWith('XRP')) return 0.7 + (Math.random() * 0.1);
    if (symbol.startsWith('DOT')) return 8 + (Math.random() * 1);
    if (symbol.startsWith('AVAX')) return 35 + (Math.random() * 5);
    if (symbol.startsWith('DOGE')) return 0.08 + (Math.random() * 0.01);
    if (symbol.startsWith('SHIB')) return 0.00001 + (Math.random() * 0.000001);
    if (symbol.startsWith('PEPE')) return 0.000002 + (Math.random() * 0.0000005);
    if (symbol.startsWith('FLOKI')) return 0.0001 + (Math.random() * 0.00001);
    if (symbol.startsWith('UNI')) return 8 + (Math.random() * 1);
    if (symbol.startsWith('AAVE')) return 100 + (Math.random() * 10);
    if (symbol.startsWith('LINK')) return 15 + (Math.random() * 2);
    if (symbol.startsWith('CAKE')) return 3 + (Math.random() * 0.5);
    if (symbol.startsWith('CRO')) return 0.1 + (Math.random() * 0.02);
    if (symbol.startsWith('AXS')) return 7 + (Math.random() * 1);
    if (symbol.startsWith('SAND')) return 0.5 + (Math.random() * 0.1);
    if (symbol.startsWith('MANA')) return 0.6 + (Math.random() * 0.1);
    return 1 + (Math.random() * 0.2); // Default for any other token
  }
  
  /**
   * Calculate technical indicators for all pairs
   */
  calculateAllIndicators() {
    let calculatedPairs = 0;
    this.logger.debug('Calculating technical indicators for all pairs');
    
    for (const pair of this.watchlist) {
      const { symbol } = pair;
      
      if (!this.priceHistory[symbol] || this.priceHistory[symbol].length < 30) {
        continue;
      }
      
      try {
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
        calculatedPairs++;
      } catch (error) {
        this.logger.error(`Error calculating indicators for ${symbol}`, error.message);
      }
    }
    
    this.logger.debug(`Calculated indicators for ${calculatedPairs}/${this.watchlist.length} trading pairs`);
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

// Utility function to map a value from one range to another
function mapRange(value, fromLow, fromHigh, toLow, toHigh) {
  return toLow + (((value - fromLow) / (fromHigh - fromLow)) * (toHigh - toLow));
}

module.exports = { EnhancedTrendTradingStrategy };