// Application state management
class StateManager {
    constructor() {
        this.state = new Map();
        this.subscribers = new Map();
        this.computedDependencies = new Map();
        this.computedValues = new Map();
        this.batchUpdates = false;
        this.pendingUpdates = new Set();
    }

    get(key, defaultValue = null) {
        if (this.computedValues.has(key)) {
            return this.computedValues.get(key);
        }
        return this.state.has(key) ? this.state.get(key) : defaultValue;
    }

    set(key, value) {
        const oldValue = this.state.get(key);
        if (this.isEqual(oldValue, value)) return;

        this.state.set(key, value);
        this.invalidateComputed(key);

        if (this.batchUpdates) {
            this.pendingUpdates.add(key);
        } else {
            this.notifySubscribers(key, value, oldValue);
        }
    }

    delete(key) {
        if (!this.state.has(key)) return;
        
        const oldValue = this.state.get(key);
        this.state.delete(key);
        this.invalidateComputed(key);
        this.notifySubscribers(key, undefined, oldValue);
    }

    subscribe(key, callback) {
        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, new Set());
        }
        this.subscribers.get(key).add(callback);
        
        return () => this.unsubscribe(key, callback);
    }

    unsubscribe(key, callback) {
        if (this.subscribers.has(key)) {
            this.subscribers.get(key).delete(callback);
            if (this.subscribers.get(key).size === 0) {
                this.subscribers.delete(key);
            }
        }
    }

    computed(key, dependencies, computeFn) {
        this.computedDependencies.set(key, dependencies);
        
        const compute = () => {
            const values = dependencies.map(dep => this.get(dep));
            const result = computeFn(...values);
            this.computedValues.set(key, result);
            return result;
        };

        // Initial computation
        compute();

        // Subscribe to dependencies
        dependencies.forEach(dep => {
            this.subscribe(dep, () => {
                compute();
                this.notifySubscribers(key, this.computedValues.get(key));
            });
        });
    }

    batch(callback) {
        this.batchUpdates = true;
        try {
            callback();
        } finally {
            this.batchUpdates = false;
            this.flushPendingUpdates();
        }
    }

    flushPendingUpdates() {
        this.pendingUpdates.forEach(key => {
            const value = this.state.get(key);
            this.notifySubscribers(key, value);
        });
        this.pendingUpdates.clear();
    }

    notifySubscribers(key, value, oldValue) {
        if (this.subscribers.has(key)) {
            this.subscribers.get(key).forEach(callback => {
                try {
                    callback(value, oldValue);
                } catch (error) {
                    console.error(`Error in state subscriber for key ${key}:`, error);
                }
            });
        }
    }

    invalidateComputed(key) {
        this.computedDependencies.forEach((deps, computedKey) => {
            if (deps.includes(key)) {
                this.computedValues.delete(computedKey);
            }
        });
    }

    isEqual(a, b) {
        if (a === b) return true;
        if (a && b && typeof a === 'object' && typeof b === 'object') {
            if (Array.isArray(a) && Array.isArray(b)) {
                return a.length === b.length && 
                       a.every((item, index) => this.isEqual(item, b[index]));
            }
            const keysA = Object.keys(a);
            const keysB = Object.keys(b);
            return keysA.length === keysB.length && 
                   keysA.every(key => this.isEqual(a[key], b[key]));
        }
        return false;
    }

    reset() {
        this.state.clear();
        this.computedValues.clear();
        this.pendingUpdates.clear();
    }

    getAll() {
        const result = {};
        this.state.forEach((value, key) => {
            result[key] = value;
        });
        this.computedValues.forEach((value, key) => {
            result[key] = value;
        });
        return result;
    }

    has(key) {
        return this.state.has(key) || this.computedValues.has(key);
    }

    size() {
        return this.state.size + this.computedValues.size;
    }
}

// Create global state instance
export const state = new StateManager();