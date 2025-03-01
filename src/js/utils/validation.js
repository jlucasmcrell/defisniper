// Validation utilities for settings forms
export const validateApiKey = (value) => {
    if (!value) {
        return 'API Key is required';
    }
    
    // Binance.US API key format
    if (value.length === 64 && /^[A-Za-z0-9]+$/.test(value)) {
        return null;
    }
    
    // Crypto.com API key format
    if (value.length === 32 && /^[A-Za-z0-9-]+$/.test(value)) {
        return null;
    }
    
    return 'Invalid API key format';
};

export const validateAddress = (value) => {
    if (!value) {
        return null; // Address is optional
    }

    // Ethereum address format
    if (/^0x[a-fA-F0-9]{40}$/.test(value)) {
        return null;
    }

    return 'Invalid Ethereum address format';
};

export const validateInfuraProjectId = (value) => {
    if (!value) {
        return 'Project ID is required';
    }

    if (!/^[0-9a-f]{32}$/.test(value)) {
        return 'Invalid Infura Project ID format';
    }

    return null;
};

export const validateInfuraProjectSecret = (value) => {
    if (!value) {
        return 'Project Secret is required';
    }

    if (!/^[0-9a-f]{64}$/.test(value)) {
        return 'Invalid Infura Project Secret format';
    }

    return null;
};