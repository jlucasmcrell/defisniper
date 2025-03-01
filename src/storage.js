// Local storage and cache management
class StorageManager {
    constructor() {
        this.cache = new Map();
        this.persistent = new Map();
        this.expirations = new Map();
        this.maxCacheSize = 50 * 1024 * 1024; // 50MB
        this.currentSize = 0;
        this.initialized = false;
    }

    async initialize() {
        try {
            // Load persistent data from localStorage
            this.loadPersistentData();
            
            // Start cache cleanup interval
            this.startCleanupInterval();
            
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize storage manager:', error);
            return false;
        }
    }

    loadPersistentData() {
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('persist_')) {
                    const value = JSON.parse(localStorage.getItem(key));
                    this.persistent.set(key.slice(8), value);
                }
            });
        } catch (error) {
            console.error('Error loading persistent data:', error);
        }
    }

    startCleanupInterval() {
        setInterval(() => {
            this.cleanup();
        }, 60000); // Clean up every minute
    }

    set(key, value, options = {}) {
        const size = this.getSize(value);
        
        if (size > this.maxCacheSize) {
            throw new Error('Value exceeds maximum cache size');
        }

        // Handle persistent storage
        if (options.persistent) {
            this.setPersistent(key, value);
            return;
        }

        // Handle cached storage
        if (this.currentSize + size > this.maxCacheSize) {
            this.makeRoom(size);
        }

        this.cache.set(key, value);
        this.currentSize += size;

        if (options.expiration) {
            this.expirations.set(key, Date.now() + options.expiration);
        }
    }

    get(key, defaultValue = null) {
        // Check persistent storage first
        if (this.persistent.has(key)) {
            return this.persistent.get(key);
        }

        // Check cache
        if (this.cache.has(key)) {
            const expiration = this.expirations.get(key);
            if (!expiration || expiration > Date.now()) {
                return this.cache.get(key);
            }
            // Remove expired item
            this.remove(key);
        }

        return defaultValue;
    }

    setPersistent(key, value) {
        try {
            localStorage.setItem(`persist_${key}`, JSON.stringify(value));
            this.persistent.set(key, value);
        } catch (error) {
            console.error('Error setting persistent data:', error);
            throw error;
        }
    }

    remove(key) {
        // Remove from persistent storage
        if (this.persistent.has(key)) {
            localStorage.removeItem(`persist_${key}`);
            this.persistent.delete(key);
        }

        // Remove from cache
        if (this.cache.has(key)) {
            const value = this.cache.get(key);
            this.currentSize -= this.getSize(value);
            this.cache.delete(key);
            this.expirations.delete(key);
        }
    }

    clear(persistent = false) {
        if (persistent) {
            localStorage.clear();
            this.persistent.clear();
        }

        this.cache.clear();
        this.expirations.clear();
        this.currentSize = 0;
    }

    cleanup() {
        const now = Date.now();
        
        // Clean up expired items
        this.expirations.forEach((expiration, key) => {
            if (expiration <= now) {
                this.remove(key);
            }
        });

        // Clean up if cache is too large
        if (this.currentSize > this.maxCacheSize) {
            this.makeRoom(0);
        }
    }

    makeRoom(neededSize) {
        const entries = Array.from(this.cache.entries())
            .sort(([keyA, valueA], [keyB, valueB]) => {
                const expirationA = this.expirations.get(keyA) || Infinity;
                const expirationB = this.expirations.get(keyB) || Infinity;
                return expirationA - expirationB;
            });

        while (this.currentSize + neededSize > this.maxCacheSize && entries.length > 0) {
            const [key, value] = entries.shift();
            this.remove(key);
        }
    }

    getSize(value) {
        try {
            const str = JSON.stringify(value);
            return new Blob([str]).size;
        } catch (error) {
            console.warn('Error calculating size:', error);
            return 0;
        }
    }

    has(key) {
        return this.cache.has(key) || this.persistent.has(key);
    }

    keys() {
        return new Set([
            ...this.cache.keys(),
            ...this.persistent.keys()
        ]);
    }

    values() {
        return Array.from(this.keys()).map(key => this.get(key));
    }

    entries() {
        return Array.from(this.keys()).map(key => [key, this.get(key)]);
    }

    size() {
        return this.keys().size;
    }

    getCacheSize() {
        return this.currentSize;
    }

    setMaxCacheSize(size) {
        this.maxCacheSize = size;
        this.cleanup();
    }

    isInitialized() {
        return this.initialized;
    }
}

// Create and export global storage instance
export const storage = new StorageManager();