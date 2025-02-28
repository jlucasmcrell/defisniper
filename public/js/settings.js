// Create new settings.js to handle form data properly
class SettingsManager {
    constructor() {
        this.stringFields = [
            'ethereum.uniswapFactoryAddress',
            'ethereum.uniswapRouterAddress',
            'bnbChain.pancakeFactoryAddress',
            'bnbChain.pancakeRouterAddress',
            'ethereum.privateKey',
            'ethereum.infuraId',
            'ethereum.alchemyKey',
            'bnbChain.privateKey',
            'exchanges.binanceUS.apiKey',
            'exchanges.binanceUS.apiSecret',
            'exchanges.cryptoCom.apiKey',
            'exchanges.cryptoCom.apiSecret'
        ];
    }

    processFormData(formData) {
        const settings = {};

        formData.forEach((value, key) => {
            const parts = key.split('.');
            let current = settings;
            
            // Build nested object structure
            for (let i = 0; i < parts.length - 1; i++) {
                current[parts[i]] = current[parts[i]] || {};
                current = current[parts[i]];
            }

            const lastPart = parts[parts.length - 1];
            
            // Determine field type and handle accordingly
            if (this.stringFields.includes(key)) {
                // Always keep as string
                current[lastPart] = value;
            } else if (key.endsWith('enabled')) {
                // Handle checkboxes
                current[lastPart] = value === 'on';
            } else if (this.isNumericField(key)) {
                // Convert numeric fields
                const numValue = Number(value);
                current[lastPart] = !isNaN(numValue) ? numValue : value;
            } else {
                // Default to string for unknown fields
                current[lastPart] = value;
            }
        });

        return settings;
    }

    isNumericField(key) {
        const numericFields = [
            'trading.maxConcurrentTrades',
            'trading.walletBuyPercentage',
            'trading.takeProfit',
            'trading.stopLoss',
            'trading.maxTradesPerHour',
            'riskManagement.maxTradeSize',
            'riskManagement.dailyLossLimit'
        ];
        return numericFields.includes(key);
    }

    validateContractAddress(address) {
        // Check if address is a valid Ethereum address
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SettingsManager };
}