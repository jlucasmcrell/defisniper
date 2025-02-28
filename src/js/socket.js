// WebSocket management for real-time updates
class SocketManager {
    constructor() {
        this.socket = null;
        this.listeners = new Map();
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.events = new Set([
            'trade',
            'botStatus',
            'balance',
            'alert',
            'notification',
            'error'
        ]);
        this.queuedMessages = [];
        this.connectionTimeout = 10000; // 10 seconds
        this.heartbeatInterval = null;
        this.heartbeatDelay = 30000; // 30 seconds
    }

    connect() {
        if (this.socket) {
            return;
        }

        this.socket = io({
            autoConnect: false,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: this.maxReconnectAttempts,
            timeout: this.connectionTimeout
        });

        this.setupListeners();
        this.socket.connect();

        // Start heartbeat once connected
        this.socket.on('connect', () => {
            this.startHeartbeat();
        });
    }

    setupListeners() {
        this.socket.on('connect', () => {
            this.connected = true;
            this.reconnectAttempts = 0;
            this.notifyListeners('connect');
            this.authenticate();
            this.processQueuedMessages();
        });

        this.socket.on('disconnect', (reason) => {
            this.connected = false;
            this.stopHeartbeat();
            this.notifyListeners('disconnect', reason);
        });

        this.socket.on('authenticated', (data) => {
            this.notifyListeners('authenticated', data);
        });

        // Trading related events
        this.socket.on('tradeUpdated', (data) => {
            this.notifyListeners('trade', data);
        });

        this.socket.on('botStarted', (data) => {
            this.notifyListeners('botStatus', { running: true, ...data });
        });

        this.socket.on('botStopped', (data) => {
            this.notifyListeners('botStatus', { running: false, ...data });
        });

        this.socket.on('balanceUpdate', (data) => {
            this.notifyListeners('balance', data);
        });

        this.socket.on('error', (error) => {
            this.notifyListeners('error', error);
        });
    }

    authenticate() {
        if (this.connected) {
            this.emit('authenticate', { authenticated: true });
        }
    }

    startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            if (this.connected) {
                this.emit('heartbeat', { timestamp: Date.now() });
            }
        }, this.heartbeatDelay);
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    emit(event, data) {
        if (!this.socket || !this.connected) {
            this.queueMessage(event, data);
            return;
        }

        this.socket.emit(event, data);
    }

    queueMessage(event, data) {
        this.queuedMessages.push({ event, data });
    }

    processQueuedMessages() {
        while (this.queuedMessages.length > 0) {
            const { event, data } = this.queuedMessages.shift();
            this.emit(event, data);
        }
    }

    on(event, callback) {
        if (!this.events.has(event)) {
            console.warn(`Unknown event type: ${event}`);
            return () => {};
        }

        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }

        this.listeners.get(event).add(callback);
        return () => this.listeners.get(event).delete(callback);
    }

    notifyListeners(event, data = null) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.forEach(listener => {
                try {
                    listener(data);
                } catch (error) {
                    console.error(`Error in socket listener for event ${event}:`, error);
                }
            });
        }
    }

    disconnect() {
        this.stopHeartbeat();
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.connected = false;
        this.queuedMessages = [];
    }

    reconnect() {
        this.disconnect();
        this.connect();
    }

    isConnected() {
        return this.connected;
    }

    clearListeners() {
        this.listeners.clear();
    }
}

// Create and export global socket instance
export const socket = new SocketManager();