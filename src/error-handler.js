// Global error handling and reporting
export class ErrorHandler {
    constructor() {
        this.initialized = false;
        this.errorCallback = null;
        this.previousOnError = null;
        this.previousOnUnhandledRejection = null;
    }

    initialize(errorCallback) {
        if (this.initialized) return;

        this.errorCallback = errorCallback;
        this.setupGlobalHandlers();
        this.initialized = true;
    }

    setupGlobalHandlers() {
        // Store previous handlers
        this.previousOnError = window.onerror;
        this.previousOnUnhandledRejection = window.onunhandledrejection;

        // Set up global error handler
        window.onerror = (message, source, lineno, colno, error) => {
            this.handleError(error || new Error(message), {
                source,
                lineno,
                colno,
                type: 'uncaught'
            });

            // Call previous handler if it exists
            if (this.previousOnError) {
                return this.previousOnError(message, source, lineno, colno, error);
            }
            return false;
        };

        // Set up unhandled promise rejection handler
        window.onunhandledrejection = (event) => {
            this.handleError(event.reason, {
                type: 'unhandledrejection'
            });

            // Call previous handler if it exists
            if (this.previousOnUnhandledRejection) {
                return this.previousOnUnhandledRejection(event);
            }
        };
    }

    handleError(error, context = {}) {
        const errorInfo = this.processError(error, context);
        
        console.error('Handled Error:', errorInfo);
        
        if (this.errorCallback) {
            try {
                this.errorCallback(errorInfo);
            } catch (callbackError) {
                console.error('Error in error callback:', callbackError);
            }
        }

        // Report error to backend
        this.reportError(errorInfo).catch(reportError => {
            console.error('Failed to report error:', reportError);
        });
    }

    processError(error, context) {
        return {
            message: error.message || 'Unknown error',
            stack: error.stack,
            type: error.name || 'Error',
            timestamp: new Date().toISOString(),
            context: {
                ...context,
                url: window.location.href,
                userAgent: navigator.userAgent
            }
        };
    }

    async reportError(errorInfo) {
        try {
            const response = await fetch('/api/system/error', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(errorInfo),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to report error');
            }
        } catch (error) {
            console.error('Error reporting failed:', error);
            throw error;
        }
    }

    dispose() {
        // Restore previous handlers
        window.onerror = this.previousOnError;
        window.onunhandledrejection = this.previousOnUnhandledRejection;
        
        this.initialized = false;
        this.errorCallback = null;
    }
}

// Create global error handler instance
export const errorHandler = new ErrorHandler();