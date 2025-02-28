// Main entry point that exports all modules
export { state } from './state';
export { http } from './http';
export { queue } from './queue';
export { metrics } from './metrics';
export { cache } from './cache';
export { validation } from './validation';
export { auth } from './auth';
export { theme } from './theme';
export { notifications } from './notifications';
export { utils } from './utils';
export { uploader } from './uploader';

// Initialize modules that require it
auth.initialize();
theme.initialize();
metrics.initialize();

// Export version information
export const version = '1.0.0';

// Export a function to initialize all modules with custom configuration
export function initialize(config = {}) {
    // Configure modules based on provided configuration
    if (config.state) {
        Object.entries(config.state).forEach(([key, value]) => {
            state.set(key, value);
        });
    }

    if (config.http) {
        http.setBaseUrl(config.http.baseUrl);
        http.setDefaultHeaders(config.http.headers);
        if (config.http.timeout) {
            http.setTimeout(config.http.timeout);
        }
    }

    if (config.cache) {
        cache.setMaxSize(config.cache.maxSize);
        cache.setDefaultTTL(config.cache.defaultTTL);
        cache.setPersistentStorage(config.cache.persistent);
    }

    if (config.theme) {
        if (config.theme.default) {
            theme.setTheme(config.theme.default);
        }
    }

    if (config.metrics) {
        metrics.reportingInterval = config.metrics.reportingInterval;
        if (config.metrics.reporters) {
            config.metrics.reporters.forEach(reporter => {
                metrics.addReporter(reporter);
            });
        }
    }

    if (config.notifications) {
        notifications.maxNotifications = config.notifications.maxCount;
        notifications.defaultDuration = config.notifications.duration;
    }

    if (config.uploader) {
        uploader.setMaxConcurrent(config.uploader.maxConcurrent);
        uploader.setChunkSize(config.uploader.chunkSize);
        uploader.setRetryOptions(
            config.uploader.retryAttempts,
            config.uploader.retryDelay
        );
    }

    // Return the configured modules
    return {
        state,
        http,
        queue,
        metrics,
        cache,
        validation,
        auth,
        theme,
        notifications,
        utils,
        uploader
    };
}