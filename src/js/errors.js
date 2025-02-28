// Error handling and reporting system
class ErrorManager {
    constructor() {
        this.errors = new Map();
        this.handlers = new Map();
        this.history = new Map();
        this.maxHistorySize = 100;
        this.initialized = false;

        // Default error categories
        this.categories = {
            SYSTEM: 'system',
            NETWORK: 'network',
            VALIDATION: 'validation',
            BUSINESS: 'business',
            SECURITY: 'security'
        };
    }

    initialize() {
        try {
            // Register default error handlers
            this.registerDefaultHandlers();
            
            // Set up global error catching
            this.setupGlobalHandlers();
            
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize error manager:', error);
            return false;
        }
    }

    registerDefaultHandlers() {
        // System errors
        this.registerHandler(this.categories.SYSTEM, error => {
            console.error('System Error:', error);
            this.logError(error);
        });

        // Network errors
        this.registerHandler(this.categories.NETWORK, error => {
            console.error('Network Error:', error);
            this.logError(error);
        });

        // Validation errors
        this.registerHandler(this.categories.VALIDATION, error => {
            console.warn('Validation Error:', error);
            this.logError(error);
        });

        // Business logic errors
        this.registerHandler(this.categories.BUSINESS, error => {
            console.warn('Business Error:', error);
            this.logError(error);
        });

        // Security errors
        this.registerHandler(this.categories.SECURITY, error => {
            console.error('Security Error:', error);
            this.logError(error);
            // Additional security measures could be implemented here
        });
    }

    setupGlobalHandlers() {
        // Handle uncaught exceptions
        window.onerror = (message, source, lineno, colno, error) => {
            this.handleError(error || new Error(message), this.categories.SYSTEM);
        };

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', event => {
            this.handleError(event.reason, this.categories.SYSTEM);
        });
    }

    registerHandler(category, handler) {
        if (!this.handlers.has(category)) {
            this.handlers.set(category, new Set());
        }
        this.handlers.get(category).add(handler);
    }

    removeHandler(category, handler) {
        const handlers = this.handlers.get(category);
        if (handlers) {
            handlers.delete(handler);
        }
    }

    handleError(error, category = this.categories.SYSTEM) {
        // Create error object
        const errorObject = this.createErrorObject(error, category);

        // Store error in history
        this.storeError(errorObject);

        // Notify handlers
        this.notifyHandlers(errorObject);

        return errorObject;
    }

    createErrorObject(error, category) {
        return {
            id: this.generateErrorId(),
            timestamp: Date.now(),
            category,
            message: error.message,
            stack: error.stack,
            metadata: {
                url: window.location.href,
                userAgent: navigator.userAgent
            }
        };
    }

    storeError(errorObject) {
        // Store in errors map
        this.errors.set(errorObject.id, errorObject);

        // Add to history
        if (!this.history.has(errorObject.category)) {
            this.history.set(errorObject.category, []);
        }

        const categoryHistory = this.history.get(errorObject.category);
        categoryHistory.push(errorObject);

        // Trim history if needed
        if (categoryHistory.length > this.maxHistorySize) {
            categoryHistory.shift();
        }
    }

    notifyHandlers(errorObject) {
        const handlers = this.handlers.get(errorObject.category);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(errorObject);
                } catch (error) {
                    console.error('Error in error handler:', error);
                }
            });
        }
    }

    getError(errorId) {
        return this.errors.get(errorId);
    }

    getErrors(category = null) {
        if (category) {
            return Array.from(this.errors.values())
                .filter(error => error.category === category);
        }
        return Array.from(this.errors.values());
    }

    getErrorHistory(category = null) {
        if (category) {
            return this.history.get(category) || [];
        }
        
        const allHistory = [];
        for (const history of this.history.values()) {
            allHistory.push(...history);
        }
        return allHistory.sort((a, b) => b.timestamp - a.timestamp);
    }

    clearErrors(category = null) {
        if (category) {
            // Clear specific category
            this.errors = new Map(
                Array.from(this.errors.entries())
                    .filter(([_, error]) => error.category !== category)
            );
            this.history.delete(category);
        } else {
            // Clear all errors
            this.errors.clear();
            this.history.clear();
        }
    }

    generateErrorId() {
        return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    logError(error) {
        // Here you could implement logging to a service
        // For now, just console.log
        console.log('Error logged:', error);
    }

    isInitialized() {
        return this.initialized;
    }
}

// Create and export global error instance
export const errors = new ErrorManager();