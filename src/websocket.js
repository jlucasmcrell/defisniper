// Enhanced WebSocket manager for real-time trading data
class WebSocketManager {
    constructor() {
        this.connections = new Map();
        this.listeners = new Map();
        this.reconnectAttempts = new Map();
        this.config = {
            maxReconnectAttempts: 5,
            reconnectDelay: 1000,
            maxDelay: 30000,
            pingInterval: 30000,
            pongTimeout: 5000
        };
        this.initialized = false;
    }

    async initialize() {
        try {
            // Set up default trading socket
            await this.createConnection('trading', {
                url: 'ws://localhost:3000/ws/trading',
                autoReconnect: true
            });

            // Set up market data socket
            await this.createConnection('market', {
                url: 'ws://localhost:3000/ws/market',
                autoReconnect: true
            });

            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize WebSocket manager:', error);
            return false;
        }
    }

    async createConnection(id, options) {
        if (this.connections.has(id)) {
            throw new Error(`Connection ${id} already exists`);
        }

        const connection = {
            id,
            options: {
                autoReconnect: true,
                ...options
            },
            socket: null,
            status: 'connecting',
            lastPing: null,
            pingTimeout: null,
            pongTimeout: null,
            reconnectTimeout: null
        };

        this.connections.set(id, connection);
        this.reconnectAttempts.set(id, 0);
        
        await this.connect(connection);
        return connection;
    }

    async connect(connection) {
        try {
            connection.socket = new WebSocket(connection.options.url);
            this.setupSocketHandlers(connection);
        } catch (error) {
            console.error(`WebSocket connection error for ${connection.id}:`, error);
            this.handleConnectionError(connection);
        }
    }

    setupSocketHandlers(connection) {
        const { socket } = connection;

        socket.onopen = () => {
            connection.status = 'connected';
            this.reconnectAttempts.set(connection.id, 0);
            this.startHeartbeat(connection);
            this.notifyListeners(connection.id, 'connect');
        };

        socket.onclose = (event) => {
            connection.status = 'disconnected';
            this.stopHeartbeat(connection);
            this.notifyListeners(connection.id, 'disconnect', event);
            
            if (connection.options.autoReconnect) {
                this.scheduleReconnect(connection);
            }
        };

        socket.onerror = (error) => {
            this.notifyListeners(connection.id, 'error', error);
        };

        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                
                if (message.type === 'pong') {
                    this.handlePong(connection);
                } else {
                    this.notifyListeners(connection.id, 'message', message);
                }
            } catch (error) {
                console.error(`Failed to parse WebSocket message for ${connection.id}:`, error);
            }
        };
    }

    startHeartbeat(connection) {
        this.stopHeartbeat(connection);
        
        connection.pingTimeout = setInterval(() => {
            if (connection.status === 'connected') {
                this.ping(connection);
            }
        }, this.config.pingInterval);
    }

    stopHeartbeat(connection) {
        if (connection.pingTimeout) {
            clearInterval(connection.pingTimeout);
            connection.pingTimeout = null;
        }
        if (connection.pongTimeout) {
            clearTimeout(connection.pongTimeout);
            connection.pongTimeout = null;
        }
    }

    ping(connection) {
        try {
            connection.lastPing = Date.now();
            connection.socket.send(JSON.stringify({ type: 'ping' }));
            
            connection.pongTimeout = setTimeout(() => {
                console.warn(`Pong timeout for ${connection.id}`);
                connection.socket.close();
            }, this.config.pongTimeout);
        } catch (error) {
            console.error(`Failed to send ping for ${connection.id}:`, error);
        }
    }

    handlePong(connection) {
        if (connection.pongTimeout) {
            clearTimeout(connection.pongTimeout);
            connection.pongTimeout = null;
        }
    }

    handleConnectionError(connection) {
        connection.status = 'error';
        this.stopHeartbeat(connection);
        
        if (connection.options.autoReconnect) {
            this.scheduleReconnect(connection);
        }
    }

    scheduleReconnect(connection) {
        const attempts = this.reconnectAttempts.get(connection.id);
        
        if (attempts >= this.config.maxReconnectAttempts) {
            this.notifyListeners(connection.id, 'maxReconnectAttemptsReached');
            return;
        }
        
        const delay = Math.min(
            this.config.reconnectDelay * Math.pow(2, attempts),
            this.config.maxDelay
        );
        
        this.reconnectAttempts.set(connection.id, attempts + 1);
        
        connection.reconnectTimeout = setTimeout(() => {
            this.connect(connection);
        }, delay);
    }

    send(connectionId, data) {
        const connection = this.connections.get(connectionId);
        if (!connection || connection.status !== 'connected') {
            throw new Error(`Cannot send message: connection ${connectionId} not ready`);
        }

        try {
            const message = typeof data === 'string' ? data : JSON.stringify(data);
            connection.socket.send(message);
            return true;
        } catch (error) {
            console.error(`Failed to send message on ${connectionId}:`, error);
            return false;
        }
    }

    subscribe(connectionId, event, callback) {
        if (!this.listeners.has(connectionId)) {
            this.listeners.set(connectionId, new Map());
        }
        
        const connectionListeners = this.listeners.get(connectionId);
        if (!connectionListeners.has(event)) {
            connectionListeners.set(event, new Set());
        }
        
        connectionListeners.get(event).add(callback);
        return () => connectionListeners.get(event).delete(callback);
    }

    notifyListeners(connectionId, event, data = null) {
        const connectionListeners = this.listeners.get(connectionId);
        if (!connectionListeners) return;
        
        const eventListeners = connectionListeners.get(event);
        if (!eventListeners) return;
        
        eventListeners.forEach(listener => {
            try {
                listener(data);
            } catch (error) {
                console.error(`Error in WebSocket listener for ${connectionId}:`, error);
            }
        });
    }

    close(connectionId) {
        const connection = this.connections.get(connectionId);
        if (connection) {
            connection.options.autoReconnect = false;
            this.stopHeartbeat(connection);
            if (connection.reconnectTimeout) {
                clearTimeout(connection.reconnectTimeout);
            }
            if (connection.socket) {
                connection.socket.close();
            }
            this.connections.delete(connectionId);
            this.listeners.delete(connectionId);
            this.reconnectAttempts.delete(connectionId);
        }
    }

    closeAll() {
        Array.from(this.connections.keys()).forEach(id => this.close(id));
    }

    getStatus(connectionId) {
        const connection = this.connections.get(connectionId);
        return connection ? connection.status : null;
    }

    isConnected(connectionId) {
        return this.getStatus(connectionId) === 'connected';
    }

    isInitialized() {
        return this.initialized;
    }
}

// Create and export global WebSocket instance
export const websocket = new WebSocketManager();