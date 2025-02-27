/**
 * Trend Trading Strategy
 * 
 * Implements trend following using technical indicators:
 * - RSI (Relative Strength Index)
 * - MACD (Moving Average Convergence Divergence)
 */

const { Logger } = require('../utils/logger');

class TrendTradingStrategy {
    constructor(connectors, exchanges, config, logger) {
        this.connectors = connectors;
        this.exchanges = exchanges;
        this.config = config;
        this.logger = logger || new Logger('TrendTradingStrategy');
        
        this.isRunning = false;
        this.watchlist = new Map();
        this.positions = new Map();
        
        // Trading pairs to monitor
        this.tradingPairs = [
            'BTC/USDT',
            'ETH/USDT',
            'BNB/USDT'
        ];
        
        // Initialize technical indicators
        this.indicators = {
            rsi: {
                period: 14,
                overbought: this.config.rsiHigh || 70,
                oversold: this.config.rsiLow || 30
            },
            macd: {
                fastPeriod: this.config.macdFast || 12,
                slowPeriod: this.config.macdSlow || 26,
                signalPeriod: this.config.macdSignal || 9
            }
        };
    }
    
    /**
     * Start the strategy
     */
    async start() {
        try {
            if (this.isRunning) {
                this.logger.warn('Strategy already running');
                return;
            }
            
            this.logger.info('Starting Trend Trading strategy...');
            
            // Initialize watchlist
            for (const pair of this.tradingPairs) {
                this.watchlist.set(pair, {
                    lastPrice: 0,
                    rsi: [],
                    macd: {
                        fast: [],
                        slow: [],
                        signal: []
                    }
                });
            }
            
            // Start monitoring
            this.startMonitoring();
            
            this.isRunning = true;
            this.logger.info('Trend Trading strategy started successfully');
        } catch (error) {
            this.logger.error('Failed to start strategy', error);
            throw error;
        }
    }
    
    /**
     * Stop the strategy
     */
    async stop() {
        try {
            if (!this.isRunning) {
                this.logger.warn('Strategy not running');
                return;
            }
            
            this.logger.info('Stopping Trend Trading strategy...');
            
            // Close all positions if configured
            if (this.config.closePositionsOnStop) {
                await this.closeAllPositions();
            }
            
            this.isRunning = false;
            this.logger.info('Trend Trading strategy stopped successfully');
        } catch (error) {
            this.logger.error('Failed to stop strategy', error);
            throw error;
        }
    }
    
    /**
     * Start monitoring trading pairs
     */
    startMonitoring() {
        setInterval(async () => {
            if (!this.isRunning) return;
            
            try {
                for (const pair of this.tradingPairs) {
                    try {
                        await this.updateIndicators(pair);
                        await this.checkSignals(pair);
                    } catch (error) {
                        this.logger.error(`Error processing ${pair}`, error);
                    }
                }
            } catch (error) {
                this.logger.error('Error in monitoring loop', error);
            }
        }, 60000); // Check every minute
    }
    
    /**
     * Update technical indicators for a trading pair
     */
    async updateIndicators(pair) {
        try {
            const data = this.watchlist.get(pair);
            if (!data) return;
            
            // Get latest price
            const price = await this.getPrice(pair);
            data.lastPrice = price;
            
            // Update RSI
            data.rsi.push(price);
            if (data.rsi.length > this.indicators.rsi.period) {
                data.rsi.shift();
            }
            
            // Update MACD
            data.macd.fast.push(price);
            data.macd.slow.push(price);
            
            if (data.macd.fast.length > this.indicators.macd.fastPeriod) {
                data.macd.fast.shift();
            }
            if (data.macd.slow.length > this.indicators.macd.slowPeriod) {
                data.macd.slow.shift();
            }
            
            this.watchlist.set(pair, data);
        } catch (error) {
            this.logger.error(`Failed to update indicators for ${pair}`, error);
            throw error;
        }
    }
    
    /**
     * Check for trading signals
     */
    async checkSignals(pair) {
        try {
            const data = this.watchlist.get(pair);
            if (!data) return;
            
            // Calculate RSI
            const rsi = this.calculateRSI(data.rsi);
            
            // Calculate MACD
            const macd = this.calculateMACD(data.macd);
            
            // Check for buy signals
            if (rsi < this.indicators.rsi.oversold && macd.histogram > 0) {
                await this.enterPosition(pair, 'buy');
            }
            
            // Check for sell signals
            if (rsi > this.indicators.rsi.overbought && macd.histogram < 0) {
                await this.enterPosition(pair, 'sell');
            }
            
            // Update stop loss and take profit
            await this.updatePositions(pair, data.lastPrice);
        } catch (error) {
            this.logger.error(`Failed to check signals for ${pair}`, error);
            throw error;
        }
    }
    
    /**
     * Calculate Relative Strength Index (RSI)
     */
    calculateRSI(prices) {
        try {
            if (prices.length < this.indicators.rsi.period) {
                return 50; // Default to neutral if not enough data
            }
            
            let gains = 0;
            let losses = 0;
            
            for (let i = 1; i < prices.length; i++) {
                const difference = prices[i] - prices[i-1];
                if (difference >= 0) {
                    gains += difference;
                } else {
                    losses -= difference;
                }
            }
            
            const avgGain = gains / this.indicators.rsi.period;
            const avgLoss = losses / this.indicators.rsi.period;
            
            if (avgLoss === 0) {
                return 100;
            }
            
            const rs = avgGain / avgLoss;
            return 100 - (100 / (1 + rs));
        } catch (error) {
            this.logger.error('Failed to calculate RSI', error);
            return 50; // Return neutral RSI on error
        }
    }
    
    /**
     * Calculate Moving Average Convergence Divergence (MACD)
     */
    calculateMACD(data) {
        try {
            if (data.slow.length < this.indicators.macd.slowPeriod) {
                return {
                    macd: 0,
                    signal: 0,
                    histogram: 0
                };
            }
            
            const fastEMA = this.calculateEMA(data.fast, this.indicators.macd.fastPeriod);
            const slowEMA = this.calculateEMA(data.slow, this.indicators.macd.slowPeriod);
            
            const macd = fastEMA - slowEMA;
            const signal = this.calculateEMA([macd], this.indicators.macd.signalPeriod);
            
            return {
                macd,
                signal,
                histogram: macd - signal
            };
        } catch (error) {
            this.logger.error('Failed to calculate MACD', error);
            return {
                macd: 0,
                signal: 0,
                histogram: 0
            };
        }
    }
    
    /**
     * Calculate Exponential Moving Average (EMA)
     */
    calculateEMA(prices, period) {
        try {
            if (prices.length < period) {
                return prices[prices.length - 1];
            }
            
            const multiplier = 2 / (period + 1);
            let ema = prices[0];
            
            for (let i = 1; i < prices.length; i++) {
                ema = (prices[i] - ema) * multiplier + ema;
            }
            
            return ema;
        } catch (error) {
            this.logger.error('Failed to calculate EMA', error);
            return prices[prices.length - 1];
        }
    }
    
    /**
     * Enter a new position
     */
    async enterPosition(pair, direction) {
        try {
            // Check if already in position
            if (this.positions.has(pair)) {
                return;
            }
            
            this.logger.info(`Entering ${direction} position for ${pair}`);
            
            const price = await this.getPrice(pair);
            const position = {
                pair,
                direction,
                entryPrice: price,
                stopLoss: direction === 'buy' ? 
                    price * (1 - this.config.stopLoss / 100) : 
                    price * (1 + this.config.stopLoss / 100),
                takeProfit: direction === 'buy' ? 
                    price * (1 + this.config.takeProfit / 100) : 
                    price * (1 - this.config.takeProfit / 100)
            };
            
            // Execute trade
            await this.executeTrade(position);
            
            this.positions.set(pair, position);
        } catch (error) {
            this.logger.error(`Failed to enter position for ${pair}`, error);
            throw error;
        }
    }
    
    /**
     * Update existing positions
     */
    async updatePositions(pair, currentPrice) {
        try {
            const position = this.positions.get(pair);
            if (!position) return;
            
            // Check stop loss
            if (position.direction === 'buy' && currentPrice <= position.stopLoss) {
                await this.closePosition(pair, 'Stop Loss');
            } else if (position.direction === 'sell' && currentPrice >= position.stopLoss) {
                await this.closePosition(pair, 'Stop Loss');
            }
            
            // Check take profit
            if (position.direction === 'buy' && currentPrice >= position.takeProfit) {
                await this.closePosition(pair, 'Take Profit');
            } else if (position.direction === 'sell' && currentPrice <= position.takeProfit) {
                await this.closePosition(pair, 'Take Profit');
            }
        } catch (error) {
            this.logger.error(`Failed to update position for ${pair}`, error);
            throw error;
        }
    }
    
    /**
     * Close a position
     */
    async closePosition(pair, reason) {
        try {
            const position = this.positions.get(pair);
            if (!position) return;
            
            this.logger.info(`Closing ${position.direction} position for ${pair} - ${reason}`);
            
            // Execute closing trade
            await this.executeTrade({
                ...position,
                direction: position.direction === 'buy' ? 'sell' : 'buy'
            });
            
            this.positions.delete(pair);
        } catch (error) {
            this.logger.error(`Failed to close position for ${pair}`, error);
            throw error;
        }
    }
    
    /**
     * Close all positions
     */
    async closeAllPositions() {
        try {
            for (const [pair] of this.positions) {
                await this.closePosition(pair, 'Strategy Stop');
            }
        } catch (error) {
            this.logger.error('Failed to close all positions', error);
            throw error;
        }
    }
    
    /**
     * Execute trade through appropriate exchange
     */
    async executeTrade(position) {
        try {
            // Find appropriate exchange
            const exchange = this.findExchangeForPair(position.pair);
            if (!exchange) {
                throw new Error(`No exchange available for ${position.pair}`);
            }
            
            // Execute trade
            await exchange.createOrder(
                position.pair,
                position.direction,
                'market',
                this.calculatePositionSize(position.pair)
            );
        } catch (error) {
            this.logger.error('Failed to execute trade', error);
            throw error;
        }
    }
    
    /**
     * Calculate position size based on risk management rules
     */
    calculatePositionSize(pair) {
        // Implement position sizing logic
        return 0.1; // Default to small position size
    }
    
    /**
     * Find appropriate exchange for trading pair
     */
    findExchangeForPair(pair) {
        for (const [, exchange] of this.exchanges) {
            if (exchange.supportsPair(pair)) {
                return exchange;
            }
        }
        return null;
    }
    
    /**
     * Get current price for trading pair
     */
    async getPrice(pair) {
        try {
            const exchange = this.findExchangeForPair(pair);
            if (!exchange) {
                throw new Error(`No exchange available for ${pair}`);
            }
            
            return await exchange.getPrice(pair);
        } catch (error) {
            this.logger.error(`Failed to get price for ${pair}`, error);
            throw error;
        }
    }
}

// Direct export (not named export)
module.exports = TrendTradingStrategy;