/**
 * TrendTradingStrategy
 * 
 * Minimal implementation that directly re-exports the TrendTrading class.
 */

// First, load the original TrendTrading class
const TrendTrading = require('./trendTrading');

// Export it directly as the default export
module.exports = TrendTrading;
