// Application state management
class StateManager {
    constructor() {
        this.state = {
            auth: {
                isAuthenticated: false,
                user: null
            },
            bot: {
                isRunning: false,
                status: 'stopped',
                lastUpdate: null
            },
            trades: {
                active: [],
                history: [],
                lastUpdate: null
            },
            balances: {
                ethereum: {},
                bnbChain: {},
                exchanges: {},
                lastUpdate: null
            },
            stats: {
                totalTrades: 0,
                successfulTrades: 0,
                failedTrades: 0,
                totalProfit: 0,
                winRate: 0,
                lastUpdate: null
            },
            ui: {
                currentTab: 'dashboard',
                theme: 'dark',
                notifications: []
            }
        };
        
        this.listeners = new Map();
    }

    getState() {
        return this.state;
    }

    setState(path, value) {
        const pathArray = path.split('.');
        let current = this.state;
        
        for (let i = 0; i < pathArray.length - 1; i++) {
            if (!(pathArray[i] in current)) {
                current[pathArray[i]] = {};
            }
            current = current[pathArray[i]];
        }
        
        const lastKey = pathArray[pathArray.length - 1];
        const oldValue = current[lastKey];
        current[lastKey] = value;

        // Notify listeners
        this.notifyListeners(path, value, oldValue);
    }

    subscribe(path, callback) {
        if (!this.listeners.has(path)) {
            this.listeners.set(path, new Set());
        }
        this.listeners.get(path).add(callback);
        
        // Return unsubscribe function
        return () => {
            const listeners = this.listeners.get(path);
            if (listeners) {
                listeners.delete(callback);
                if (listeners.size === 0) {
                    this.listeners.delete(path);
                }
            }
        };
    }

    notifyListeners(path, newValue, oldValue) {
        // Notify exact path matches
        if (this.listeners.has(path)) {
            this.listeners.get(path).forEach(callback => {
                try {
                    callback(newValue, oldValue);
                } catch (error) {
                    console.error(`Error in state listener for ${path}:`, error);
                }
            });
        }

        // Notify parent path listeners
        const pathParts = path.split('.');
        while (pathParts.length > 1) {
            pathParts.pop();
            const parentPath = pathParts.join('.');
            if (this.listeners.has(parentPath)) {
                const parentValue = this.getValueByPath(parentPath);
                this.listeners.get(parentPath).forEach(callback => {
                    try {
                        callback(parentValue, null);
                    } catch (error) {
                        console.error(`Error in state listener for ${parentPath}:`, error);
                    }
                });
            }
        }
    }

    getValueByPath(path) {
        const pathArray = path.split('.');
        let current = this.state;
        
        for (const key of pathArray) {
            if (current === undefined || current === null) {
                return undefined;
            }
            current = current[key];
        }
        
        return current;
    }

    reset() {
        this.state = {
            auth: {
                isAuthenticated: false,
                user: null
            },
            bot: {
                isRunning: false,
                status: 'stopped',
                lastUpdate: null
            },
            trades: {
                active: [],
                history: [],
                lastUpdate: null
            },
            balances: {
                ethereum: {},
                bnbChain: {},
                exchanges: {},
                lastUpdate: null
            },
            stats: {
                totalTrades: 0,
                successfulTrades: 0,
                failedTrades: 0,
                totalProfit: 0,
                winRate: 0,
                lastUpdate: null
            },
            ui: {
                currentTab: 'dashboard',
                theme: 'dark',
                notifications: []
            }
        };
        
        // Notify all listeners of reset
        this.listeners.forEach((listeners, path) => {
            const value = this.getValueByPath(path);
            listeners.forEach(callback => {
                try {
                    callback(value, null);
                } catch (error) {
                    console.error(`Error in state listener for ${path}:`, error);
                }
            });
        });
    }
}

// Create global state instance
export const state = new StateManager();