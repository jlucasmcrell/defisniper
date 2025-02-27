/**
 * Web3 Utilities for CryptoSniperBot
 * Handles blockchain interactions and web3 provider management
 */
const { ethers } = require('ethers');
const { Logger } = require('./logger');

class Web3Utils {
    constructor() {
        this.logger = new Logger('Web3Utils');
        this.providers = new Map();
        this.wallets = new Map();
    }

    async initializeProvider(network, rpcUrl) {
        try {
            const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
            await provider.ready;
            
            this.providers.set(network, provider);
            this.logger.info(`Initialized provider for ${network}`);
            
            return provider;
        } catch (error) {
            this.logger.error(`Failed to initialize provider for ${network}`, error);
            throw error;
        }
    }

    async initializeWallet(network, privateKey) {
        try {
            const provider = this.providers.get(network);
            if (!provider) {
                throw new Error(`Provider not found for network: ${network}`);
            }

            const wallet = new ethers.Wallet(privateKey, provider);
            this.wallets.set(network, wallet);
            
            this.logger.info(`Initialized wallet for ${network}`);
            return wallet;
        } catch (error) {
            this.logger.error(`Failed to initialize wallet for ${network}`, error);
            throw error;
        }
    }

    getProvider(network) {
        const provider = this.providers.get(network);
        if (!provider) {
            throw new Error(`Provider not found for network: ${network}`);
        }
        return provider;
    }

    getWallet(network) {
        const wallet = this.wallets.get(network);
        if (!wallet) {
            throw new Error(`Wallet not found for network: ${network}`);
        }
        return wallet;
    }

    async getGasPrice(network) {
        try {
            const provider = this.getProvider(network);
            const gasPrice = await provider.getGasPrice();
            return gasPrice;
        } catch (error) {
            this.logger.error(`Failed to get gas price for ${network}`, error);
            throw error;
        }
    }

    async estimateGas(network, transaction) {
        try {
            const provider = this.getProvider(network);
            const gasEstimate = await provider.estimateGas(transaction);
            return gasEstimate;
        } catch (error) {
            this.logger.error('Failed to estimate gas', error);
            throw error;
        }
    }

    async getBlock(network, blockHashOrBlockNumber = 'latest') {
        try {
            const provider = this.getProvider(