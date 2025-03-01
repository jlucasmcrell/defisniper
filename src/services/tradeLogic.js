import logger from '../utils/logger.js';
import { fetchGasFees } from './realtimeGasFees.js';
import { getNewsSentiment } from './newsSentiment.js';

export async function executeTrades() {
  try {
    const gasFees = await fetchGasFees();
    logger.info(`Gas Fees - Fast: ${gasFees.fast} Gwei, Average: ${gasFees.average} Gwei, SafeLow: ${gasFees.safeLow} Gwei`);
    
    const sentiment = await getNewsSentiment();
    logger.info(`Current news sentiment score: ${sentiment}`);
    
    let tradeModifier = 1;
    if (sentiment < -2) {
      logger.info('Negative sentiment detected, reducing trade size.');
      tradeModifier = 0.5;
    }
    
    if (gasFees.fast > 100) {
      logger.info('Gas fees are too high, postponing trade execution.');
      return;
    }
    
    logger.info(`Executing trade with modifier: ${tradeModifier}`);
    // Insert trade execution code here using exchange APIs.
  } catch (error) {
    logger.error('Error executing trades:', error);
  }
}