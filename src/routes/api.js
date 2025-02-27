/**
 * API Routes
 * 
 * Defines the API endpoints for the bot's web interface
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { Logger } = require('../utils/logger');

// Create logger
const logger = new Logger('API');

/**
 * API routes factory function
 */
module.exports = function(securityManager, configManager) {
    const router = express.Router();

    // Get settings
    router.get('/settings', async (req, res) => {
        try {
            const config = configManager.getConfig();
            
            // Create sanitized config
            const sanitizedConfig = { ...config };
            
            // Remove sensitive data
            if (sanitizedConfig.ethereum) {
                delete sanitizedConfig.ethereum.privateKey;
                delete sanitizedConfig.ethereum.alchemyKey;
                delete sanitizedConfig.ethereum.infuraId;
            }
            
            if (sanitizedConfig.bnbChain) {
                delete sanitizedConfig.bnbChain.privateKey;
            }
            
            if (sanitizedConfig.exchanges) {
                if (sanitizedConfig.exchanges.binanceUS) {
                    delete sanitizedConfig.exchanges.binanceUS.apiKey;
                    delete sanitizedConfig.exchanges.binanceUS.apiSecret;
                }
                
                if (sanitizedConfig.exchanges.cryptoCom) {
                    delete sanitizedConfig.exchanges.cryptoCom.apiKey;
                    delete sanitizedConfig.exchanges.cryptoCom.apiSecret;
                }
            }
            
            res.json(sanitizedConfig);
        } catch (error) {
            logger.error('Error getting settings', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    // Update settings
    router.post('/settings', async (req, res) => {
        try {
            const newSettings = req.body;
            const currentConfig = configManager.getConfig();

            // Preserve sensitive data if not provided in new settings
            if (newSettings.ethereum) {
                if (!newSettings.ethereum.privateKey) {
                    newSettings.ethereum.privateKey = currentConfig.ethereum?.privateKey;
                }
                if (!newSettings.ethereum.infuraId) {
                    newSettings.ethereum.infuraId = currentConfig.ethereum?.infuraId;
                }
                if (!newSettings.ethereum.alchemyKey) {
                    newSettings.ethereum.alchemyKey = currentConfig.ethereum?.alchemyKey;
                }
                
                // Set default DEX addresses if not provided
                if (!newSettings.ethereum.uniswapFactoryAddress) {
                    newSettings.ethereum.uniswapFactoryAddress = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
                }
                if (!newSettings.ethereum.uniswapRouterAddress) {
                    newSettings.ethereum.uniswapRouterAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
                }
            }

            if (newSettings.bnbChain) {
                if (!newSettings.bnbChain.privateKey) {
                    newSettings.bnbChain.privateKey = currentConfig.bnbChain?.privateKey;
                }
                
                // Set default DEX addresses if not provided
                if (!newSettings.bnbChain.pancakeFactoryAddress) {
                    newSettings.bnbChain.pancakeFactoryAddress = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73';
                }
                if (!newSettings.bnbChain.pancakeRouterAddress) {
                    newSettings.bnbChain.pancakeRouterAddress = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
                }
            }

            if (newSettings.exchanges) {
                if (newSettings.exchanges.binanceUS) {
                    if (!newSettings.exchanges.binanceUS.apiKey) {
                        newSettings.exchanges.binanceUS.apiKey = currentConfig.exchanges?.binanceUS?.apiKey;
                    }
                    if (!newSettings.exchanges.binanceUS.apiSecret) {
                        newSettings.exchanges.binanceUS.apiSecret = currentConfig.exchanges?.binanceUS?.apiSecret;
                    }
                }
                
                if (newSettings.exchanges.cryptoCom) {
                    if (!newSettings.exchanges.cryptoCom.apiKey) {
                        newSettings.exchanges.cryptoCom.apiKey = currentConfig.exchanges?.cryptoCom?.apiKey;
                    }
                    if (!newSettings.exchanges.cryptoCom.apiSecret) {
                        newSettings.exchanges.cryptoCom.apiSecret = currentConfig.exchanges?.cryptoCom?.apiSecret;
                    }
                }
            }

            // Validate settings
            if (newSettings.trading) {
                if (newSettings.trading.walletBuyPercentage) {
                    const percentage = parseFloat(newSettings.trading.walletBuyPercentage);
                    if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
                        return res.status(400).json({
                            success: false,
                            message: 'Wallet buy percentage must be between 1 and 100'
                        });
                    }
                }

                if (newSettings.trading.stopLoss) {
                    const stopLoss = parseFloat(newSettings.trading.stopLoss);
                    if (isNaN(stopLoss) || stopLoss <= 0) {
                        return res.status(400).json({
                            success: false,
                            message: 'Stop loss must be greater than 0'
                        });
                    }
                }

                if (newSettings.trading.takeProfit) {
                    const takeProfit = parseFloat(newSettings.trading.takeProfit);
                    if (isNaN(takeProfit) || takeProfit <= 0) {
                        return res.status(400).json({
                            success: false,
                            message: 'Take profit must be greater than 0'
                        });
                    }
                }
            }

            // Update config
            const success = configManager.updateConfig(newSettings);
            
            if (success) {
                logger.info('Settings updated via API');
                
                // If critical settings changed, reinitialize trading engine
                if (global.tradingEngine) {
                    const shouldReinitialize = 
                        newSettings.ethereum?.enabled !== currentConfig.ethereum?.enabled ||
                        newSettings.bnbChain?.enabled !== currentConfig.bnbChain?.enabled ||
                        newSettings.ethereum?.uniswapFactoryAddress !== currentConfig.ethereum?.uniswapFactoryAddress ||
                        newSettings.bnbChain?.pancakeFactoryAddress !== currentConfig.bnbChain?.pancakeFactoryAddress;

                    if (shouldReinitialize) {
                        await global.tradingEngine.initialize();
                        logger.info('Trading engine reinitialized after settings update');
                    }
                }
                
                res.json({ success: true, message: 'Settings updated successfully' });
            } else {
                res.status(500).json({ success: false, message: 'Failed to update settings' });
            }
        } catch (error) {
            logger.error('Error updating settings', error);
            res.status(500).json({ success: false, message: error.message });
        }
    });

    return router;
};