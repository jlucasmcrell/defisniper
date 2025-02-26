/**
 * Exchange Factory for CryptoSniperBot
 * Creates and configures exchange connectors
 */
const logger = require('../utils/logger');

class ExchangeFactory {
  /**
   * Create an exchange connector based on name and configuration
   * @param {string} exchangeName - Name of the exchange (e.g., 'binance')
   * @param {object} config - Exchange configuration
   * @returns {object} Exchange connector
   */
  static createExchange(exchangeName, config) {
    logger.info(`[ExchangeFactory] Creating exchange connector for ${exchangeName}`);
    
    try {
      // Normalize exchange name to lowercase for consistency
      exchangeName = exchangeName.toLowerCase();
      
      switch (exchangeName) {
        case 'binance':
          return this.createBinanceConnector(config);
        case 'kucoin':
          return this.createKucoinConnector(config);
        case 'coinbase':
          return this.createCoinbaseConnector(config);
        default:
          throw new Error(`Unsupported exchange: ${exchangeName}`);
      }
    } catch (error) {
      logger.error(`[ExchangeFactory] Failed to create exchange: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Create Binance exchange connector
   * @param {object} config - Exchange configuration
   * @returns {object} Binance connector
   */
  static createBinanceConnector(config) {
    // This would typically use the ccxt library or a custom binance connector
    const BinanceConnector = require('./exchanges/binanceConnector');
    return new BinanceConnector(config);
  }
  
  /**
   * Create KuCoin exchange connector
   * @param {object} config - Exchange configuration
   * @returns {object} KuCoin connector
   */
  static createKucoinConnector(config) {
    // This would typically use the ccxt library or a custom kucoin connector
    const KucoinConnector = require('./exchanges/kucoinConnector');
    return new KucoinConnector(config);
  }
  
  /**
   * Create Coinbase exchange connector
   * @param {object} config - Exchange configuration
   * @returns {object} Coinbase connector
   */
  static createCoinbaseConnector(config) {
    // This would typically use the ccxt library or a custom coinbase connector
    const CoinbaseConnector = require('./exchanges/coinbaseConnector');
    return new CoinbaseConnector(config);
  }
}

module.exports = ExchangeFactory;