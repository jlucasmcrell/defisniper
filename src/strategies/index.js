/**
 * Strategy Index
 * 
 * Exports all strategies from a single file.
 */

// Import the TrendTrading strategy
const TrendTrading = require('./trendTrading');

// Define both strategy classes
const TrendTradingStrategy = TrendTrading;

// Export everything
module.exports = {
  TrendTrading,
  TrendTradingStrategy
};

// Also add to global scope for extreme cases
global.TrendTrading = TrendTrading;
global.TrendTradingStrategy = TrendTrading;

// Export the main strategy as default
module.exports.default = TrendTrading;
