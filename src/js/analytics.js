// Analytics and tracking
class Analytics {
    constructor() {
        this.enabled = false;
        this.userId = null;
        this.sessionId = null;
        this.events = [];
        this.maxEventsInMemory = 1000;
        this.batchSize = 50;
        this.flushInterval = 30000; // 30 seconds
        this.initialized = false;
    }

    initialize(options = {}) {
        if (this.initialized) return;

        this.enabled = options.enabled !== false;
        this.endpoint = options.endpoint || '/api/analytics';
        this.sessionId = this.generateSessionId();
        
        if (this.enabled) {
            this.startAutoFlush();
        }
        
        this.initialized = true;
    }

    setUser(userId) {
        this.userId = userId;
    }

    trackEvent(eventName, properties = {}) {
        if (!this.enabled) return;

        const event = {
            eventName,
            properties,
            userId: this.userId,
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        this.events.push(event);

        if (this.events.length >= this.maxEventsInMemory) {
            this.flush();
        }
    }

    trackPageView(properties = {}) {
        this.trackEvent('pageView', {
            path: window.location.pathname,
            title: document.title,
            referrer: document.referrer,
            ...properties
        });
    }

    trackError(error, properties = {}) {
        this.trackEvent('error', {
            message: error.message,
            stack: error.stack,
            ...properties
        });
    }

    trackTiming(category, variable, value, properties = {}) {
        this.trackEvent('timing', {
            category,
            variable,
            value,
            ...properties
        });
    }

    async flush() {
        if (!this.enabled || this.events.length === 0) return;

        const eventsToSend = this.events.splice(0, this.batchSize);

        try {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ events: eventsToSend }),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to send analytics events');
            }
        } catch (error) {
            console.error('Analytics error:', error);
            // Put events back in queue
            this.events.unshift(...eventsToSend);
        }
    }

    startAutoFlush() {
        setInterval(() => {
            this.flush();
        }, this.flushInterval);
    }

    generateSessionId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    disable() {
        this.enabled = false;
    }

    enable() {
        this.enabled = true;
    }

    clearEvents() {
        this.events = [];
    }
}

// Create global analytics instance
export const analytics = new Analytics();