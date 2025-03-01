// Logging and debugging system
class LogManager {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000;
        this.listeners = new Set();
        this.levels = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3
        };
        this.currentLevel = this.levels.INFO;
        this.initialized = false;
    }

    initialize() {
        try {
            // Load logging preferences
            this.loadPreferences();
            
            // Set up error handling
            this.setupErrorHandling();
            
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize log manager:', error);
            return false;
        }
    }

    loadPreferences() {
        try {
            const level = localStorage.getItem('logger.level');
            if (level && this.levels[level] !== undefined) {
                this.currentLevel = this.levels[level];
            }
        } catch (error) {
            console.error('Error loading logger preferences:', error);
        }
    }

    setupErrorHandling() {
        window.onerror = (message, source, lineno, colno, error) => {
            this.error('Uncaught error', {
                message,
                source,
                lineno,
                colno,
                error: error?.stack
            });
        };

        window.addEventListener('unhandledrejection', (event) => {
            this.error('Unhandled promise rejection', {
                reason: event.reason
            });
        });
    }

    log(level, message, data = null) {
        if (this.levels[level] < this.currentLevel) return;

        const entry = {
            timestamp: Date.now(),
            level,
            message,
            data
        };

        this.logs.push(entry);
        
        // Trim logs if exceeding max size
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        // Console output
        this.consoleOutput(entry);

        // Notify listeners
        this.notifyListeners(entry);
    }

    debug(message, data = null) {
        this.log('DEBUG', message, data);
    }

    info(message, data = null) {
        this.log('INFO', message, data);
    }

    warn(message, data = null) {
        this.log('WARN', message, data);
    }

    error(message, data = null) {
        this.log('ERROR', message, data);
    }

    consoleOutput(entry) {
        const timestamp = new Date(entry.timestamp).toISOString();
        const prefix = `[${timestamp}] ${entry.level}:`;

        switch (entry.level) {
            case 'DEBUG':
                console.debug(prefix, entry.message, entry.data || '');
                break;
            case 'INFO':
                console.info(prefix, entry.message, entry.data || '');
                break;
            case 'WARN':
                console.warn(prefix, entry.message, entry.data || '');
                break;
            case 'ERROR':
                console.error(prefix, entry.message, entry.data || '');
                break;
        }
    }

    setLevel(level) {
        if (this.levels[level] !== undefined) {
            this.currentLevel = this.levels[level];
            localStorage.setItem('logger.level', level);
        }
    }

    getLevel() {
        return Object.keys(this.levels).find(key => 
            this.levels[key] === this.currentLevel
        );
    }

    getLogs(filter = {}) {
        return this.logs.filter(log => {
            return Object.entries(filter).every(([key, value]) => {
                if (key === 'level' && value !== undefined) {
                    return log.level === value;
                }
                if (key === 'search' && value) {
                    return log.message.toLowerCase().includes(value.toLowerCase());
                }
                if (key === 'from' && value) {
                    return log.timestamp >= value;
                }
                if (key === 'to' && value) {
                    return log.timestamp <= value;
                }
                return true;
            });
        });
    }

    clear() {
        this.logs = [];
        this.notifyListeners({ type: 'clear' });
    }

    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners(entry) {
        this.listeners.forEach(listener => {
            try {
                listener(entry);
            } catch (error) {
                console.error('Error in log listener:', error);
            }
        });
    }

    export(format = 'json') {
        switch (format) {
            case 'json':
                return JSON.stringify(this.logs, null, 2);
            case 'csv':
                return this.exportToCsv();
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    exportToCs