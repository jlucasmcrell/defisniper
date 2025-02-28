// Order management and execution system
class OrderManager {
    constructor() {
        this.orders = new Map();
        this.positions = new Map();
        this.listeners = new Set();
        this.executionQueue = [];
        this.initialized = false;
        
        // Order status constants
        this.STATUS = {
            PENDING: 'pending',
            OPEN: 'open',
            FILLED: 'filled',
            CANCELLED: 'cancelled',
            REJECTED: 'rejected'
        };

        // Order types
        this.TYPES = {
            MARKET: 'market',
            LIMIT: 'limit',
            STOP: 'stop',
            STOP_LIMIT: 'stop_limit',
            TAKE_PROFIT: 'take_profit',
            TRAILING_STOP: 'trailing_stop'
        };
    }

    async initialize() {
        try {
            // Load existing orders
            await this.loadOrders();
            
            // Start order processing
            this.startOrderProcessing();
            
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize order manager:', error);
            return false;
        }
    }

    async loadOrders() {
        try {
            const response = await fetch('/api/orders');
            if (!response.ok) throw new Error('Failed to load orders');
            
            const orders = await response.json();
            orders.forEach(order => {
                this.orders.set(order.id, order);
            });
        } catch (error) {
            console.error('Error loading orders:', error);
            throw error;
        }
    }

    startOrderProcessing() {
        setInterval(() => {
            this.processExecutionQueue();
        }, 100);
    }

    async createOrder(params) {
        const order = {
            id: this.generateOrderId(),
            timestamp: Date.now(),
            status: this.STATUS.PENDING,
            filled: 0,
            ...params
        };

        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(order)
            });

            if (!response.ok) throw new Error('Failed to create order');
            
            const confirmedOrder = await response.json();
            this.orders.set(confirmedOrder.id, confirmedOrder);
            this.notifyListeners('create', confirmedOrder);
            
            this.addToExecutionQueue(confirmedOrder);
            return confirmedOrder;
        } catch (error) {
            console.error('Error creating order:', error);
            throw error;
        }
    }

    async cancelOrder(orderId) {
        const order = this.orders.get(orderId);
        if (!order) throw new Error('Order not found');

        if (order.status === this.STATUS.FILLED) {
            throw new Error('Cannot cancel filled order');
        }

        try {
            const response = await fetch(`/api/orders/${orderId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to cancel order');
            
            order.status = this.STATUS.CANCELLED;
            this.notifyListeners('cancel', order);
            return order;
        } catch (error) {
            console.error('Error cancelling order:', error);
            throw error;
        }
    }

    async updateOrder(orderId, updates) {
        const order = this.orders.get(orderId);
        if (!order) throw new Error('Order not found');

        try {
            const response = await fetch(`/api/orders/${orderId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });

            if (!response.ok) throw new Error('Failed to update order');
            
            const updatedOrder = await response.json();
            this.orders.set(orderId, updatedOrder);
            this.notifyListeners('update', updatedOrder);
            return updatedOrder;
        } catch (error) {
            console.error('Error updating order:', error);
            throw error;
        }
    }

    addToExecutionQueue(order) {
        this.executionQueue.push(order);
    }

    async processExecutionQueue() {
        if (this.executionQueue.length === 0) return;

        const order = this.executionQueue.shift();
        try {
            await this.executeOrder(order);
        } catch (error) {
            console.error('Error executing order:', error);
            order.status = this.STATUS.REJECTED;
            this.notifyListeners('reject', order);
        }
    }

    async executeOrder(order) {
        switch (order.type) {
            case this.TYPES.MARKET:
                await this.executeMarketOrder(order);
                break;
            case this.TYPES.LIMIT:
                await this.executeLimitOrder(order);
                break;
            case this.TYPES.STOP:
                await this.executeStopOrder(order);
                break;
            case this.TYPES.STOP_LIMIT:
                await this.executeStopLimitOrder(order);
                break;
            default:
                throw new Error(`Unsupported order type: ${order.type}`);
        }
    }

    async executeMarketOrder(order) {
        try {
            const response = await fetch('/api/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(order)
            });

            if (!response.ok) throw new Error('Failed to execute market order');
            
            const execution = await response.json();
            order.status = this.STATUS.FILLED;
            order.filled = order.quantity;
            order.fillPrice = execution.price;
            
            this.updatePosition(order);
            this.notifyListeners('fill', order);
        } catch (error) {
            console.error('Error executing market order:', error);
            throw error;
        }
    }

    updatePosition(order) {
        const { symbol, quantity, fillPrice } = order;
        const position = this.positions.get(symbol) || {
            symbol,
            quantity: 0,
            averagePrice: 0
        };

        if (order.side === 'buy') {
            const totalCost = position.quantity * position.averagePrice + quantity * fillPrice;
            position.quantity += quantity;
            position.averagePrice = totalCost / position.quantity;
        } else {
            position.quantity -= quantity;
            if (position.quantity === 0) {
                position.averagePrice = 0;
            }
        }

        this.positions.set(symbol, position);
        this.notifyListeners('position', position);
    }

    getOrder(orderId) {
        return this.orders.get(orderId);
    }

    getOrders(filter = {}) {
        return Array.from(this.orders.values()).filter(order => {
            return Object.entries(filter).every(([key, value]) => order[key] === value);
        });
    }

    getPosition(symbol) {
        return this.positions.get(symbol);
    }

    getAllPositions() {
        return Array.from(this.positions.values());
    }

    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners(event, data) {
        this.listeners.forEach(listener => {
            try {
                listener(event, data);
            } catch (error) {
                console.error('Error in order listener:', error);
            }
        });
    }

    generateOrderId() {
        return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    isInitialized() {
        return this.initialized;
    }
}

// Create and export global order instance
export const orders = new OrderManager();