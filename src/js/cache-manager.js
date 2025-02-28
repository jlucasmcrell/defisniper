// Cache management for application data
class CacheManager {
    constructor() {
        this.cache = new Map();
        this.persistentCache = new Map();
        this.maxAge = 300000; // 5 minutes default
        this.persistentMaxAge = 3600000; // 1 hour default
    }

    async get(key, options = {}) {
        const {
            persistent = false,
            maxAge = persistent ? this.persistentMaxAge : this.maxAge
        } = options;

        const storage = persistent ? this.persistentCache : this.cache;
        const data = storage.get(key);

        if (!data) {
            return null;
        }

        if (Date.now() - data.timestamp > maxAge) {
            storage.delete(key);
            return null;
        }

        return data.value;
    }

    set(key, value, options = {}) {
        const {
            persistent = false,
            maxAge = persistent ? this.persistentMaxAge : this.maxAge
        } = options;

        const storage = persistent ? this.persistentCache : this.cache;
        storage.set(key, {
            value,
            timestamp: Date.now()
        });

        // Schedule cleanup
        if (!persistent) {
            setTimeout(() => {
                storage.delete(key);
            }, maxAge);
        }
    }

    delete(key, options = {}) {
        const { persistent = false } = options;
        const storage = persistent ? this.persistentCache : this.cache;
        storage.delete(key);
    }

    clear(options = {}) {
        const { persistent = false } = options;
        if (persistent) {
            this.persistentCache.clear();
        } else {
            this.cache.clear();
        }
    }

    async getOrSet(key, fetchFn, options = {}) {
        const cached = await this.get(key, options);
        if (cached !== null) {
            return cached;
        }

        try {
            const value = await fetchFn();
            this.set(key, value, options);
            return value;
        } catch (error) {
            console.error(`Cache fetch error for key ${key}:`, error);
            throw error;
        }
    }

    setMaxAge(maxAge, options = {}) {
        const { persistent = false } = options;
        if (persistent) {
            this.persistentMaxAge = maxAge;
        } else {
            this.maxAge = maxAge;
        }
    }

    keys(options = {}) {
        const { persistent = false } = options;
        const storage = persistent ? this.persistentCache : this.cache;
        return Array.from(storage.keys());
    }

    size(options = {}) {
        const { persistent = false } = options;
        const storage = persistent ? this.persistentCache : this.cache;
        return storage.size;
    }

    cleanup() {
        const now = Date.now();

        // Cleanup regular cache
        for (const [key, data] of this.cache.entries()) {
            if (now - data.timestamp > this.maxAge) {
                this.cache.delete(key);
            }
        }

        // Cleanup persistent cache
        for (const [key, data] of this.persistentCache.entries()) {
            if (now - data.timestamp > this.persistentMaxAge) {
                this.persistentCache.delete(key);
            }
        }
    }

    startCleanupInterval() {
        // Run cleanup every minute
        setInterval(() => {
            this.cleanup();
        }, 60000);
    }

    async warmup(keys, fetchFn, options = {}) {
        const promises = keys.map(key => 
            this.getOrSet(key, () => fetchFn(key), options)
        );
        return Promise.all(promises);
    }

    middleware() {
        return async (req, res, next) => {
            const cacheKey = `${req.method}:${req.url}`;
            try {
                const cachedResponse = await this.get(cacheKey);
                if (cachedResponse) {
                    return res.json(cachedResponse);
                }
                next();
            } catch (error) {
                next(error);
            }
        };
    }
}

// Create global cache instance
export const cache = new CacheManager();