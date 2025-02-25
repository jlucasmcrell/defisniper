/**
 * BNB Chain Connector
 * 
 * Handles interactions with the Binance Smart Chain network
 */

class BnbChainConnector {
    constructor(web3, privateKey, logger) {
        this.web3 = web3;
        this.privateKey = privateKey;
        this.logger = logger;
        this.account = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the BNB Chain connection
     */
    async init() {
        try {
            // Create account from private key
            this.account = this.web3.eth.accounts.privateKeyToAccount(this.privateKey);
            
            // Add account to wallet
            this.web3.eth.accounts.wallet.add(this.account);
            
            // Set default account
            this.web3.eth.defaultAccount = this.account.address;
            
            // Test connection
            await this.web3.eth.getBlockNumber();
            
            this.isInitialized = true;
            this.logger.info('BNB Chain connector initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize BNB Chain connector', error);
            throw error;
        }
    }

    /**
     * Get account address
     */
    getAddress() {
        return this.account ? this.account.address : null;
    }

    /**
     * Get account balance
     */
    async getBalance() {
        if (!this.isInitialized) {
            throw new Error('BNB Chain connector not initialized');
        }
        
        try {
            const balance = await this.web3.eth.getBalance(this.account.address);
            return this.web3.utils.fromWei(balance, 'ether');
        } catch (error) {
            this.logger.error('Failed to get balance', error);
            throw error;
        }
    }

    /**
     * Send transaction
     */
    async sendTransaction(to, value, data = '') {
        if (!this.isInitialized) {
            throw new Error('BNB Chain connector not initialized');
        }

        try {
            const tx = {
                from: this.account.address,
                to: to,
                value: value,
                data: data,
                gas: await this.web3.eth.estimateGas({
                    from: this.account.address,
                    to: to,
                    value: value,
                    data: data
                })
            };

            const signedTx = await this.web3.eth.accounts.signTransaction(
                tx,
                this.privateKey
            );

            return await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        } catch (error) {
            this.logger.error('Failed to send transaction', error);
            throw error;
        }
    }

    /**
     * Get token balance
     */
    async getTokenBalance(tokenAddress, walletAddress = null) {
        if (!this.isInitialized) {
            throw new Error('BNB Chain connector not initialized');
        }

        try {
            const address = walletAddress || this.account.address;
            
            // ERC20 Token ABI for balanceOf
            const minABI = [
                {
                    constant: true,
                    inputs: [{ name: "_owner", type: "address" }],
                    name: "balanceOf",
                    outputs: [{ name: "balance", type: "uint256" }],
                    type: "function",
                },
            ];

            const contract = new this.web3.eth.Contract(minABI, tokenAddress);
            const balance = await contract.methods.balanceOf(address).call();
            
            return balance;
        } catch (error) {
            this.logger.error('Failed to get token balance', error);
            throw error;
        }
    }

    /**
     * Get token decimals
     */
    async getTokenDecimals(tokenAddress) {
        if (!this.isInitialized) {
            throw new Error('BNB Chain connector not initialized');
        }

        try {
            const minABI = [
                {
                    constant: true,
                    inputs: [],
                    name: "decimals",
                    outputs: [{ name: "", type: "uint8" }],
                    type: "function",
                },
            ];

            const contract = new this.web3.eth.Contract(minABI, tokenAddress);
            const decimals = await contract.methods.decimals().call();
            
            return parseInt(decimals);
        } catch (error) {
            this.logger.error('Failed to get token decimals', error);
            throw error;
        }
    }

    /**
     * Get token symbol
     */
    async getTokenSymbol(tokenAddress) {
        if (!this.isInitialized) {
            throw new Error('BNB Chain connector not initialized');
        }

        try {
            const minABI = [
                {
                    constant: true,
                    inputs: [],
                    name: "symbol",
                    outputs: [{ name: "", type: "string" }],
                    type: "function",
                },
            ];

            const contract = new this.web3.eth.Contract(minABI, tokenAddress);
            return await contract.methods.symbol().call();
        } catch (error) {
            this.logger.error('Failed to get token symbol', error);
            throw error;
        }
    }

    /**
     * Check if connector is initialized
     */
    isConnected() {
        return this.isInitialized;
    }
}

module.exports = { BnbChainConnector };