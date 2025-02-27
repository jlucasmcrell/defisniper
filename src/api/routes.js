const express = require('express');
const router = express.Router();

module.exports = function(securityManager, configManager) {
    // Initial setup endpoint
    router.post('/setup', async (req, res) => {
        try {
            const {
                ethereum,
                bnbChain,
                trading,
                exchanges
            } = req.body;

            const config = {
                configured: true,
                ethereum: {
                    ...ethereum,
                    enabled: !!ethereum?.privateKey,
                    uniswapFactoryAddress: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'
                },
                bnbChain: {
                    ...bnbChain,
                    enabled: !!bnbChain?.privateKey,
                    pancakeFactoryAddress: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73'
                },
                trading: {
                    ...trading,
                    scanInterval: parseInt(trading?.scanInterval || 30000),
                    maxConcurrentTrades: parseInt(trading?.maxConcurrentTrades || 3)
                },
                exchanges: exchanges || {}
            };

            // Save configuration
            const saved = await configManager.saveConfig(config);
            if (!saved) {
                throw new Error('Failed to save configuration');
            }

            res.json({
                success: true,
                message: 'Configuration saved successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    });

    // Get current settings
    router.get('/settings', (req, res) => {
        const config = configManager.getConfig();
        res.json({
            success: true,
            data: config
        });
    });

    // Update settings
    router.post('/settings', (req, res) => {
        try {
            const success = configManager.updateConfig(req.body);
            if (!success) {
                throw new Error('Failed to update settings');
            }
            res.json({
                success: true,
                message: 'Settings updated successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    });

    return router;
};