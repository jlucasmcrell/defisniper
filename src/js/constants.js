// Application constants and configuration values
export const constants = {
    // API endpoints
    API: {
        BASE_URL: '/api',
        VERSION: 'v1',
        TIMEOUT: 30000,
        RETRY_ATTEMPTS: 3,
        ENDPOINTS: {
            AUTH: '/auth',
            USERS: '/users',
            TRADES: '/trades',
            SETTINGS: '/settings',
            NOTIFICATIONS: '/notifications'
        }
    },

    // Authentication
    AUTH: {
        TOKEN_KEY: 'auth.token',
        REFRESH_INTERVAL: 15 * 60 * 1000, // 15 minutes
        SESSION_TIMEOUT: 60 * 60 * 1000, // 1 hour
        MAX_LOGIN_ATTEMPTS: 5,
        LOCKOUT_DURATION: 15 * 60 * 1000 // 15 minutes
    },

    // Application settings
    APP: {
        NAME: 'Trading Platform',
        VERSION: '1.0.0',
        ENV: process.env.NODE_ENV || 'development',
        DEBUG: process.env.DEBUG === 'true',
        DEFAULT_LANGUAGE: 'en',
        SUPPORTED_LANGUAGES: ['en', 'es', 'fr', 'de', 'ja'],
        DEFAULT_THEME: 'light',
        THEMES: ['light', 'dark', 'auto']
    },

    // Trading settings
    TRADING: {
        DEFAULT_LEVERAGE: 1,
        MAX_LEVERAGE: 100,
        MIN_TRADE_SIZE: 0.01,
        MAX_TRADE_SIZE: 100,
        DEFAULT_STOP_LOSS: 2, // percentage
        DEFAULT_TAKE_PROFIT: 6, // percentage
        ORDER_TYPES: ['market', 'limit', 'stop', 'stop_limit'],
        TIME_IN_FORCE: ['gtc', 'ioc', 'fok']
    },

    // Chart settings
    CHART: {
        DEFAULT_TIMEFRAME: '1h',
        TIMEFRAMES: ['1m', '5m', '15m', '30m', '1h', '4h', '1d'],
        DEFAULT_TYPE: 'candlestick',
        TYPES: ['candlestick', 'line', 'bar'],
        DEFAULT_INDICATORS: ['MA', 'RSI', 'MACD']
    },

    // Cache settings
    CACHE: {
        MAX_SIZE: 50 * 1024 * 1024, // 50MB
        DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
        CLEANUP_INTERVAL: 60 * 1000 // 1 minute
    },

    // Notification settings
    NOTIFICATIONS: {
        MAX_HISTORY: 100,
        DEFAULT_DURATION: 5000,
        TYPES: ['info', 'success', 'warning', 'error'],
        SOUNDS: {
            DEFAULT: 'notification.mp3',
            SUCCESS: 'success.mp3',
            WARNING: 'warning.mp3',
            ERROR: 'error.mp3'
        }
    },

    // Error categories
    ERRORS: {
        SYSTEM: 'system',
        NETWORK: 'network',
        VALIDATION: 'validation',
        BUSINESS: 'business',
        SECURITY: 'security'
    },

    // Validation rules
    VALIDATION: {
        PASSWORD: {
            MIN_LENGTH: 8,
            REQUIRE_UPPERCASE: true,
            REQUIRE_LOWERCASE: true,
            REQUIRE_NUMBER: true,
            REQUIRE_SPECIAL: true
        },
        USERNAME: {
            MIN_LENGTH: 3,
            MAX_LENGTH: 20,
            PATTERN: '^[a-zA-Z0-9_-]+$'
        },
        EMAIL: {
            PATTERN: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
        }
    },

    // Date formats
    DATE_FORMATS: {
        DISPLAY: 'YYYY-MM-DD',
        TIME: 'HH:mm:ss',
        DATETIME: 'YYYY-MM-DD HH:mm:ss',
        ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
    }
};