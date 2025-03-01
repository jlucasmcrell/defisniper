// API communication and request management
class APIManager {
    constructor() {
        this.baseURL = '/api';
        this.requests = new Map();
        this.cache = new Map();
        this.listeners = new Set();
        this.initialized = false;
        
        // Default configuration
        this.config = {
            timeout: 30000,
            retries: 3,
            cacheTimeout: 5 * 60 * 1000, // 5 minutes
            rateLimitDelay: 1000
        };
    }

    async initialize() {
        try {
            // Set up request interceptors
            this.setupInterceptors();
            
            // Initialize rate limiting
            this.initializeRateLimiting();
            
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize API manager:', error);
            return false;
        }
    }

    setupInterceptors() {
        this.requestInterceptors = [];
        this.responseInterceptors = [];

        // Add default interceptors
        this.addRequestInterceptor(config => {
            // Add authentication token if available
            const token = localStorage.getItem('auth.token');
            if (token) {
                config.headers = {
                    ...config.headers,
                    'Authorization': `Bearer ${token}`
                };
            }
            return config;
        });

        this.addResponseInterceptor(
            response => response,
            error => {
                if (error.response?.status === 401) {
                    // Handle unauthorized access
                    this.handleUnauthorized();
                }
                return Promise.reject(error);
            }
        );
    }

    initializeRateLimiting() {
        this.rateLimit = {
            requests: new Map(),
            lastReset: Date.now()
        };
    }

    addRequestInterceptor(onFulfilled, onRejected) {
        this.requestInterceptors.push({ onFulfilled, onRejected });
    }

    addResponseInterceptor(onFulfilled, onRejected) {
        this.responseInterceptors.push({ onFulfilled, onRejected });
    }

    async request(config) {
        // Apply request interceptors
        let requestConfig = { ...config };
        for (const interceptor of this.requestInterceptors) {
            try {
                requestConfig = await interceptor.onFulfilled(requestConfig);
            } catch (error) {
                if (interceptor.onRejected) {
                    requestConfig = await interceptor.onRejected(error);
                } else {
                    throw error;
                }
            }
        }

        // Check cache
        const cacheKey = this.getCacheKey(requestConfig);
        if (requestConfig.method === 'GET' && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.config.cacheTimeout) {
                return cached.data;
            }
            this.cache.delete(cacheKey);
        }

        // Handle rate limiting
        await this.handleRateLimit(requestConfig);

        // Make request
        try {
            const response = await this.makeRequest(requestConfig);
            
            // Apply response interceptors
            let result = response;
            for (const interceptor of this.responseInterceptors) {
                try {
                    result = await interceptor.onFulfilled(result);
                } catch (error) {
                    if (interceptor.onRejected) {
                        result = await interceptor.onRejected(error);
                    } else {
                        throw error;
                    }
                }
            }

            // Cache successful GET requests
            if (requestConfig.method === 'GET') {
                this.cache.set(cacheKey, {
                    data: result,
                    timestamp: Date.now()
                });
            }

            return result;
        } catch (error) {
            // Handle retries
            if (requestConfig.retries > 0) {
                requestConfig.retries--;
                return this.request(requestConfig);
            }
            throw error;
        }
    }

    async makeRequest(config) {
        const { url, method = 'GET', data, headers = {} } = config;
        const fullURL = this.getFullURL(url);

        const requestId = this.generateRequestId();
        const request = {
            id: requestId,
            url: fullURL,
            method,
            timestamp: Date.now()
        };

        this.requests.set(requestId, request);
        this.notifyListeners('request', request);

        try {
            const response = await fetch(fullURL, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                body: data ? JSON.stringify(data) : undefined
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            this.requests.delete(requestId);
            this.notifyListeners('success', {
                ...request,
                response: result
            });

            return result;
        } catch (error) {
            this.requests.delete(requestId);
            this.notifyListeners('error', {
                ...request,
                error
            });
            throw error;
        }
    }

    async handleRateLimit(config) {
        const now = Date.now();
        const key = config.url;

        // Reset rate limit if necessary
        if (now - this.rateLimit.lastReset > 60000) {
            this.rateLimit.requests.clear();
            this.rateLimit.lastReset = now;
        }

        // Check rate limit
        const requests = this.rateLimit.requests.get(key) || 0;
        if (requests >= 60) { // 60 requests per minute
            const delay = this.config.rateLimitDelay;
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Update request count
        this.rateLimit.requests.set(key, requests + 1);
    }

    handleUnauthorized() {
        // Clear auth token
        localStorage.removeItem('auth.token');
        
        // Notify listeners
        this.notifyListeners('unauthorized');
        
        // Redirect to login
        window.location.href = '/login';
    }

    getFullURL(url) {
        if (url.startsWith('http')) return url;
        return `${this.baseURL}${url.startsWith('/') ? '' : '/'}${url}`;
    }

    getCacheKey(config) {
        return `${config.method}:${config.url}:${JSON.stringify(config.data || {})}`;
    }

    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    clearCache(url = null) {
        if (url) {
            const pattern = new RegExp(`^GET:${url}`);
            Array.from(this.cache.keys())
                .filter(key => pattern.test(key))
                .forEach(key => this.cache.delete(key));
        } else {
            this.cache.clear();
        }
    }

    getActiveRequests() {
        return Array.from(this.requests.values());
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
                console.error('Error in API listener:', error);
            }
        });
    }

    isInitialized() {
        return this.initialized;
    }
}

// Create and export global API instance
export const api = new APIManager();