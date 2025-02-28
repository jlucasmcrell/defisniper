// Event management and pub/sub system
class EventManager {
    constructor() {
        this.events = new Map();
        this.subscribers = new Map();
        this.history = new Map();
        this.maxHistorySize = 100;
        this.initialized = false;
    }

    initialize() {
        try {
            // Register core events
            this.registerCoreEvents();
            
            // Set up event history tracking
            this.setupHistoryTracking();
            
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize event manager:', error);
            return false;
        }
    }

    registerCoreEvents() {
        // System events
        this.register('system:startup');
        this.register('system:shutdown');
        this.register('system:error');

        // Authentication events
        this.register('auth:login');
        this.register('auth:logout');
        this.register('auth:expired');

        // Data events
        this.register('data:update');
        this.register('data:sync');
        this.register('data:error');

        // User interface events
        this.register('ui:update');
        this.register('ui:error');
        this.register('ui:ready');
    }

    setupHistoryTracking() {
        // Track all events in history
        this.subscribe('*', (event, data) => {
            this.trackEventHistory(event, data);
        });
    }

    register(eventName, options = {}) {
        if (this.events.has(eventName)) {
            throw new Error(`Event ${eventName} already registered`);
        }

        this.events.set(eventName, {
            name: eventName,
            description: options.description || '',
            metadata: options.metadata || {},
            subscribers: new Set()
        });
    }

    subscribe(eventName, callback, options = {}) {
        const subscriber = {
            callback,
            options: {
                once: options.once || false,
                priority: options.priority || 0,
                async: options.async || false
            }
        };

        if (eventName === '*') {
            // Global subscriber
            if (!this.subscribers.has('*')) {
                this.subscribers.set('*', new Set());
            }
            this.subscribers.get('*').add(subscriber);
        } else {
            // Event-specific subscriber
            const event = this.events.get(eventName);
            if (!event) {
                throw new Error(`Event ${eventName} not registered`);
            }
            event.subscribers.add(subscriber);
        }

        // Return unsubscribe function
        return () => this.unsubscribe(eventName, callback);
    }

    unsubscribe(eventName, callback) {
        if (eventName === '*') {
            const globalSubscribers = this.subscribers.get('*');
            if (globalSubscribers) {
                for (const subscriber of globalSubscribers) {
                    if (subscriber.callback === callback) {
                        globalSubscribers.delete(subscriber);
                        break;
                    }
                }
            }
        } else {
            const event = this.events.get(eventName);
            if (event) {
                for (const subscriber of event.subscribers) {
                    if (subscriber.callback === callback) {
                        event.subscribers.delete(subscriber);
                        break;
                    }
                }
            }
        }
    }

    async emit(eventName, data = null) {
        const event = this.events.get(eventName);
        if (!event) {
            throw new Error(`Event ${eventName} not registered`);
        }

        // Create event object
        const eventObject = {
            name: eventName,
            data,
            timestamp: Date.now(),
            metadata: event.metadata
        };

        // Notify global subscribers
        const globalSubscribers = this.subscribers.get('*');
        if (globalSubscribers) {
            await this.notifySubscribers(Array.from(globalSubscribers), eventObject);
        }

        // Notify event-specific subscribers
        await this.notifySubscribers(Array.from(event.subscribers), eventObject);

        return eventObject;
    }

    async notifySubscribers(subscribers, eventObject) {
        // Sort subscribers by priority
        subscribers.sort((a, b) => b.options.priority - a.options.priority);

        for (const subscriber of subscribers) {
            try {
                if (subscriber.options.async) {
                    // Async execution
                    setTimeout(() => {
                        subscriber.callback(eventObject.name, eventObject.data);
                    }, 0);
                } else {
                    // Synchronous execution
                    await subscriber.callback(eventObject.name, eventObject.data);
                }

                // Remove one-time subscribers
                if (subscriber.options.once) {
                    this.unsubscribe(eventObject.name, subscriber.callback);
                }
            } catch (error) {
                console.error('Error in event subscriber:', error);
                // Emit error event
                await this.emit('system:error', {
                    source: 'event_manager',
                    error,
                    event: eventObject
                });
            }
        }
    }

    trackEventHistory(eventName, data) {
        const entry = {
            timestamp: Date.now(),
            event: eventName,
            data
        };

        if (!this.history.has(eventName)) {
            this.history.set(eventName, []);
        }

        const eventHistory = this.history.get(eventName);
        eventHistory.push(entry);

        // Trim history if needed
        if (eventHistory.length > this.maxHistorySize) {
            eventHistory.shift();
        }
    }

    getEventHistory(eventName = null) {
        if (eventName) {
            return this.history.get(eventName) || [];
        }
        
        // Return all history
        const allHistory = [];
        for (const history of this.history.values()) {
            allHistory.push(...history);
        }
        
        return allHistory.sort((a, b) => b.timestamp - a.timestamp);
    }

    clearHistory(eventName = null) {
        if (eventName) {
            this.history.delete(eventName);
        } else {
            this.history.clear();
        }
    }

    getRegisteredEvents() {
        return Array.from(this.events.keys());
    }

    isInitialized() {
        return this.initialized;
    }
}

// Create and export global event instance
export const events = new EventManager();