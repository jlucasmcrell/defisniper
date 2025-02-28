                    if (arrayMatch) {
                    const arrayName = arrayMatch[1];
                    const index = parseInt(arrayMatch[2]);
                    
                    if (!obj[arrayName]) {
                        obj[arrayName] = [];
                    }
                    
                    while (obj[arrayName].length <= index) {
                        obj[arrayName].push('');
                    }
                    
                    obj[arrayName][index] = value;
                    continue;
                }
                
                if (!obj[k]) {
                    obj[k] = {};
                }
                obj = obj[k];
            }
            
            const lastKey = keys[keys.length - 1];
            
            // Handle checkboxes (they're only included in FormData when checked)
            if (lastKey === 'enabled' || lastKey === 'autoStart') {
                obj[lastKey] = true;
            } else {
                // Convert numeric values
                if (!isNaN(value) && value !== '' && !key.includes('apiKey') && !key.includes('privateKey')) {
                    obj[lastKey] = parseFloat(value);
                } else {
                    obj[lastKey] = value;
                }
            }
        }
        
        // Set disabled checkboxes to false
        if (!config.ethereum) config.ethereum = {};
        if (formData.get('ethereum.enabled') === null) config.ethereum.enabled = false;
        
        if (!config.bnbChain) config.bnbChain = {};
        if (formData.get('bnbChain.enabled') === null) config.bnbChain.enabled = false;
        
        if (!config.exchanges) config.exchanges = {};
        if (!config.exchanges.binanceUS) config.exchanges.binanceUS = {};
        if (formData.get('exchanges.binanceUS.enabled') === null) config.exchanges.binanceUS.enabled = false;
        
        if (!config.exchanges.cryptoCom) config.exchanges.cryptoCom = {};
        if (formData.get('exchanges.cryptoCom.enabled') === null) config.exchanges.cryptoCom.enabled = false;
        
        if (!config.strategies) config.strategies = {};
        if (!config.strategies.tokenSniper) config.strategies.tokenSniper = {};
        if (formData.get('strategies.tokenSniper.enabled') === null) config.strategies.tokenSniper.enabled = false;
        
        if (!config.strategies.trendTrading) config.strategies.trendTrading = {};
        if (formData.get('strategies.trendTrading.enabled') === null) config.strategies.trendTrading.enabled = false;
        
        if (!config.trading) config.trading = {};
        if (formData.get('trading.autoStart') === null) config.trading.autoStart = false;
        
        // Make save button show loading state
        const saveButton = configForm.querySelector('button[type="submit"]');
        const originalText = saveButton.innerHTML;
        saveButton.disabled = true;
        saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
        
        // Send config to server
        const response = await fetch('/api/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ config }),
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to save configuration');
        }
        
        showNotification('Configuration saved successfully');
        currentConfig = config;
    } catch (error) {
        console.error('Error saving configuration:', error);
        showNotification('Failed to save configuration: ' + error.message, 'error');
    } finally {
        // Restore save button
        const saveButton = configForm.querySelector('button[type="submit"]');
        saveButton.disabled = false;
        saveButton.innerHTML = 'Save Configuration';
    }
}

// Initialize settings module
function initSettings() {
    // No initial setup needed besides what's already in the DOMContentLoaded event
}

// Export functions for use in other modules
window.settings = {
    initSettings,
    loadConfiguration
};