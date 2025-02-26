/**
 * Crypto.com Exchange Adapter
 */
const ExchangeAdapter = require('./exchangeAdapter');
const axios = require('axios');
const crypto = require('crypto');

class CryptoComAdapter extends ExchangeAdapter {
    constructor(config, securityManager) {
        super(config, securityManager);
        this.exchangeName = 'Crypto.com';
        this.baseUrl = 'https://api.crypto.com/v2';
        this.wsUrl = 'wss://stream.crypto.com/v2/market';
        this.symbolInfo = new Map();
    }

    async initialize() {
        try {
            this.validateConfig();

            this.apiKey = this.securityManager.decrypt(this.config.apiKey);
            this.apiSecret = this.securityManager.decrypt(this.config.apiSecret);

            // Load exchange information
            await this.loadExchangeInfo();
            
            this.isInitialized = true;
            this.logger.info('Crypto.com adapter initialized successfully');
        } catch (error) {
            this.handleError(error, 'Failed to initialize Crypto.com adapter');
        }
    }

    async loadExchangeInfo() {
        try {
            const response = await this.publicRequest('/public/get-instruments');
            
            for (const instrument of response.result.instruments) {
                this.symbolInfo.set(instrument.instrument_name, {
                    baseAsset: instrument.base_currency,
                    quoteAsset: instrument.quote_currency,
                    priceDecimals: instrument.price_decimals,
                    quantityDecimals: instrument.quantity_decimals,
                    minQuantity: parseFloat(instrument.min_quantity),
                    maxQuantity: parseFloat(instrument.max_quantity),
                    minPrice: parseFloat(instrument.min_price),
                    maxPrice: parseFloat(instrument.max_price)
                });
            }
        } catch (error) {
            this.handleError(error, 'Failed to load exchange information');
        }
    }

    async getPrice(symbol) {
        try {
            const response = await this.publicRequest('/public/get-ticker', {
                instrument_name: symbol
            });
            return parseFloat(response.result.data.a); // Using ask price
        } catch (error) {
            this.handleError(error, `Failed to get price for ${symbol}`);
        }
    }

    async getBalance(asset) {
        try {
            const response = await this.privateRequest('/private/get-account-summary', {
                currency: asset
            });
            const balance = response.result.accounts[0];
            return {
                free: parseFloat(balance.available),
                locked: parseFloat(balance.order),
                total: parseFloat(balance.balance)
            };
        } catch (error) {
            this.handleError(error, `Failed to get balance for ${asset}`);
        }
    }

    async placeBuyOrder(symbol, quantity, price) {
        return this.placeOrder(symbol, 'BUY', quantity, price);
    }

    async placeSellOrder(symbol, quantity, price) {
        return this.placeOrder(symbol, 'SELL', quantity, price);
    }

    async placeOrder(symbol, side, quantity, price) {
        try {
            const params = {
                instrument_name: symbol,
                side: side.toUpperCase(),
                type: 'LIMIT',
                price: this.roundPrice(price, symbol),
                quantity: this.roundQuantity(quantity, symbol)
            };

            const response = await this.privateRequest('/private/create-order', params);
            return {
                orderId: response.result.order_id,
                status: response.result.status,
                symbol: symbol,
                price: parseFloat(price),
                quantity: parseFloat(quantity)
            };
        } catch (error) {
            this.handleError(error, `Failed to place ${side} order for ${symbol}`);
        }
    }

    async cancelOrder(orderId) {
        try {
            const response = await this.privateRequest('/private/cancel-order', {
                order_id: orderId
            });
            return {
                orderId: orderId,
                status: response.result.status
            };
        } catch (error) {
            this.handleError(error, `Failed to cancel order ${orderId}`);
        }
    }

    async getOrderStatus(orderId) {
        try {
            const response = await this.privateRequest('/private/get-order-detail', {
                order_id: orderId
            });
            const order = response.result.order_info;
            return {
                orderId: order.order_id,
                status: order.status,
                price: parseFloat(order.price),
                quantity: parseFloat(order.quantity),
                executed: parseFloat(order.cumulative_quantity),
                remaining: parseFloat(order.quantity) - parseFloat(order.cumulative_quantity)
            };
        } catch (error) {
            this.handleError(error, `Failed to get order status for ${orderId}`);
        }
    }

    async getTradeHistory(symbol, limit = 50) {
        try {
            const response = await this.privateRequest('/private/get-trades', {
                instrument_name: symbol,
                page_size: limit
            });
            return response.result.trade_list.map(trade => ({
                id: trade.trade_id,
                orderId: trade.order_id,
                price: parseFloat(trade.traded_price),
                quantity: parseFloat(trade.traded_quantity),
                fee: parseFloat(trade.fee),
                feeCurrency: trade.fee_currency,
                time: trade.create_time,
                side: trade.side
            }));
        } catch (error) {
            this.handleError(error, `Failed to get trade history for ${symbol}`);
        }
    }

    async publicRequest(endpoint, params = {}) {
        try {
            const response = await axios.get(`${this.baseUrl}${endpoint}`, { params });
            return response.data;
        } catch (error) {
            throw new Error(`Public request failed: ${error.message}`);
        }
    }

    async privateRequest(endpoint, params = {}) {
        try {
            const timestamp = Math.floor(Date.now() / 1000);
            const paramsString = this.buildParamsString(params);
            const signString = `${timestamp}${this.apiKey}${paramsString}`;
            const signature = this.sign(signString);

            const headers = {
                'api-key': this.apiKey,
                'api-timestamp': timestamp.toString(),
                'api-signature': signature
            };

            const response = await axios.post(`${this.baseUrl}${endpoint}`, params, { headers });
            return response.data;
        } catch (error) {
            throw new Error(`Private request failed: ${error.message}`);
        }
    }

    buildParamsString(params) {
        return Object.keys(params)
            .sort()
            .reduce((str, key) => `${str}${key}${params[key]}`, '');
    }

    sign(message) {
        return crypto
            .createHmac('sha256', this.apiSecret)
            .update(message)
            .digest('hex');
    }

    formatSymbol(baseAsset, quoteAsset) {
        return `${baseAsset}_${quoteAsset}`;
    }

    parseSymbol(symbol) {
        const info = this.symbolInfo.get(symbol);
        return info ? {
            baseAsset: info.baseAsset,
            quoteAsset: info.quoteAsset
        } : null;
    }

    roundQuantity(quantity, symbol) {
        const info = this.symbolInfo.get(symbol);
        if (!info) throw new Error(`Symbol ${symbol} not found`);
        return Number(quantity.toFixed(info.quantityDecimals));
    }

    roundPrice(price, symbol) {
        const info = this.symbolInfo.get(symbol);
        if (!info) throw new Error(`Symbol ${symbol} not found`);
        return Number(price.toFixed(info.priceDecimals));
    }
}

module.exports = CryptoComAdapter;