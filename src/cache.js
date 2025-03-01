// Memory and persistent cache management
class CacheManager {
    constructor() {
        this.memoryCache = new Map();
        this.persistentCache = new Map();
        this.maxSize = 100;
        this.defaultTTL = 3600000; // 1 hour
        this.cleanupInterval = 300000; // 5 minutes
        this.persistentStorage = true;

        this.startCleanup();
    }

    startCleanup() {
        setInterval(() => {
            this.cleanup();
        }, this.cleanupInterval);
    }

    async set(key, value, options = {}) {
        const entry = {
            value,
            timestamp: Date.now(),
            ttl: options.ttl || this.defaultTTL,
            persistent: options.persistent || false
        };

        if (entry.persistent && this.persistentStorage) {
            await this.setPersistent(key, entry);
        }

        this.memoryCache.set(key, entry);
        this.ensureSize();
    }

    async get(key) {
        const memoryEntry = this.memoryCache.get(key);
        
        if (memoryEntry) {
            if (this.isExpired(memoryEntry)) {
                this.memoryCache.delete(key);
                return null;
            }
            return memoryEntry.value;
        }

        if (this.persistentStorage) {
            const persistentEntry = await this.getPersistent(key);
            if (persistentEntry) {
                if (this.isExpired(persistentEntry)) {
                    await this.removePersistent(key);
                    return null;
                }
                this.memoryCache.set(key, persistentEntry);
                return persistentEntry.value;
            }
        }

        return null;
    }

    async remove(key) {
        this.memoryCache.delete(key);
        if (this.persistentStorage) {
            await this.removePersistent(key);
        }
    }

    isExpired(entry) {
        return Date.now() - entry.timestamp > entry.ttl;
    }

    ensureSize() {
        if (this.memoryCache.size <= this.maxSize) {
            return;
        }

        const entries = Array.from(this.memoryCache.entries())
            .sort(([, a], [, b]) => a.timestamp - b.timestamp);

        while (this.memoryCache.size > this.maxSize) {
            const [key] = entries.shift();
            this.memoryCache.delete(key);
        }
    }

    async setPersistent(key, entry) {
        try {
            localStorage.setItem(
                this.getPersistentKey(key),
                JSON.stringify(entry)
            );
        } catch (error) {
            console.error('Error setting persistent cache:', error);
        }
    }

    async getPersistent(key) {
        try {
            const data = localStorage.getItem(this.getPersistentKey(key));
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error getting persistent cache:', error);
            return null;
        }
    }

    async removePersistent(key) {
        try {
            localStorage.removeItem(this.getPersistentKey(key));
        } catch (error) {
            console.error('Error removing persistent cache:', error);
        }
    }

    getPersistentKey(key) {
        return `cache_${key}`;
    }

    cleanup() {
        const now = Date.now();

        // Cleanup memory cache
        for (const [key, entry] of this.memoryCache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.memoryCache.delete(key);
            }
        }

        // Cleanup persistent cache
        if (this.persistentStorage) {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('cache_')) {
                    try {
                        const entry = JSON.parse(localStorage.getItem(key));
                        if (now - entry.timestamp > entry.ttl) {
                            localStorage.removeItem(key);
                        }
                    } catch (error) {
                        console.error('Error cleaning persistent cache:', error);
                    }
                }
            }
        }
    }

    clear() {
        this.memoryCache.clear();
        if (this.persistentStorage) {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key.startsWith('cache_')) {
                    localStorage.removeItem(key);
                }
            }
        }
    }

    async keys() {
        const memoryKeys = Array.from(this.memoryCache.keys());
        if (!this.persistentStorage) {
            return memoryKeys;
        }

        const persistentKeys = new Set();
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('cache_')) {
                persistentKeys.add(key.slice(6));
            }
        }

        return [...new Set([...memoryKeys, ...persistentKeys])];
    }

    async has(key) {
        if (this.memoryCache.has(key)) {
            return true;
        }
        if (this.persistentStorage) {
            return localStorage.getItem(this.getPersistentKey(key)) !== null;
        }
        return false;
    }

    setMaxSize(size) {
        this.maxSize = size;
        this.ensureSize();
    }

    setDefaultTTL(ttl) {
        this.defaultTTL = ttl;
    }

    setPersistentStorage(enabled) {
        this.persistentStorage = enabled;
        if (!enabled) {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key.startsWith('cache_')) {
                    localStorage.removeItem(key);
                }
            }
        }
    }
}

// Create global cache instance
export const cache = new CacheManager();