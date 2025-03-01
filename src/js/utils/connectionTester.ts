import { Logger } from './logger';
import { ethers } from 'ethers';
import { BinanceClient } from '../exchanges/binance';
import { CryptoComClient } from '../exchanges/cryptocom';

export class ConnectionTester {
    private logger: Logger;

    constructor() {
        this.logger = new Logger('ConnectionTester');
    }

    async testConnections(settings: any): Promise<{success: boolean, results: any}> {
        const results = {
            ethereum: false,
            bnbChain: false,
            binanceUS: false,
            cryptoCom: false
        };

        try {
            // Test Ethereum connection
            if (settings.ethereum?.enabled) {
                results.ethereum = await this.testEthereumConnection(settings.ethereum);
            }

            // Test BNB Chain connection
            if (settings.bnbChain?.enabled) {
                results.bnbChain = await this.testBNBChainConnection(settings.bnbChain);
            }

            // Test Binance.US connection
            if (settings.exchanges?.binanceUS?.enabled) {
                results.binanceUS = await this.testBinanceConnection(settings.exchanges.binanceUS);
            }

            // Test Crypto.com connection
            if (settings.exchanges?.cryptoCom?.enabled) {
                results.cryptoCom = await this.testCryptoComConnection(settings.exchanges.cryptoCom);
            }

            return {
                success: true,
                results
            };
        } catch (error) {
            this.logger.error('Connection test failed', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    private async testEthereumConnection(settings: any): Promise<boolean> {
        try {
            const provider = settings.infuraId ? 
                new ethers.providers.InfuraProvider('mainnet', settings.infuraId) :
                new ethers.providers.AlchemyProvider('mainnet', settings.alchemyKey);

            const network = await provider.getNetwork();
            return network.chainId === 1;
        } catch (error) {
            this.logger.error('Ethereum connection test failed', error);
            return false;
        }
    }

    private async testBNBChainConnection(settings: any): Promise<boolean> {
        try {
            const provider = new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
            const network = await provider.getNetwork();
            return network.chainId === 56;
        } catch (error) {
            this.logger.error('BNB Chain connection test failed', error);
            return false;
        }
    }

    private async testBinanceConnection(settings: any): Promise<boolean> {
        try {
            const client = new BinanceClient(settings.apiKey, settings.apiSecret);
            const accountInfo = await client.getAccountInfo();
            return Boolean(accountInfo);
        } catch (error) {
            this.logger.error('Binance.US connection test failed', error);
            return false;
        }
    }

    private async testCryptoComConnection(settings: any): Promise<boolean> {
        try {
            const client = new CryptoComClient(settings.apiKey, settings.apiSecret);
            const accountInfo = await client.getAccountInfo();
            return Boolean(accountInfo);
        } catch (error) {
            this.logger.error('Crypto.com connection test failed', error);
            return false;
        }
    }
}