// Data formatting utilities
class Formatter {
    constructor() {
        this.locale = 'en-US';
        this.timezone = 'UTC';
    }

    setLocale(locale) {
        this.locale = locale;
    }

    setTimezone(timezone) {
        this.timezone = timezone;
    }

    number(value, options = {}) {
        const defaults = {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        };

        return new Intl.NumberFormat(this.locale, {
            ...defaults,
            ...options
        }).format(value);
    }

    currency(value, currency = 'USD', options = {}) {
        return new Intl.NumberFormat(this.locale, {
            style: 'currency',
            currency,
            ...options
        }).format(value);
    }

    percent(value, options = {}) {
        return new Intl.NumberFormat(this.locale, {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            ...options
        }).format(value / 100);
    }

    date(value, options = {}) {
        const date = new Date(value);
        return new Intl.DateTimeFormat(this.locale, {
            dateStyle: 'medium',
            ...options
        }).format(date);
    }

    time(value, options = {}) {
        const date = new Date(value);
        return new Intl.DateTimeFormat(this.locale, {
            timeStyle: 'medium',
            timeZone: this.timezone,
            ...options
        }).format(date);
    }

    datetime(value, options = {}) {
        const date = new Date(value);
        return new Intl.DateTimeFormat(this.locale, {
            dateStyle: 'medium',
            timeStyle: 'medium',
            timeZone: this.timezone,
            ...options
        }).format(date);
    }

    relativeTime(value, unit = 'second') {
        return new Intl.RelativeTimeFormat(this.locale, {
            numeric: 'auto'
        }).format(value, unit);
    }

    fileSize(bytes, options = {}) {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unit = 0;

        while (size >= 1024 && unit < units.length - 1) {
            size /= 1024;
            unit++;
        }

        return `${this.number(size, options)} ${units[unit]}`;
    }

    duration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days}d ${hours % 24}h`;
        }
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        }
        if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        }
        return `${seconds}s`;
    }

    truncate(str, length = 30, suffix = '...') {
        if (str.length <= length) return str;
        return str.substring(0, length - suffix.length) + suffix;
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    pluralize(count, singular, plural) {
        return count === 1 ? singular : (plural || `${singular}s`);
    }
}

// Create global formatter instance
export const formatter = new Formatter();