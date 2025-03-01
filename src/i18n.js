// Internationalization and localization manager
class I18nManager {
    constructor() {
        this.locale = 'en';
        this.fallbackLocale = 'en';
        this.messages = new Map();
        this.loadedLocales = new Set();
        this.pluralRules = new Intl.PluralRules();
        this.numberFormatter = new Intl.NumberFormat();
        this.dateFormatter = new Intl.DateTimeFormat();
    }

    async setLocale(locale) {
        if (!this.loadedLocales.has(locale)) {
            await this.loadLocale(locale);
        }

        this.locale = locale;
        this.pluralRules = new Intl.PluralRules(locale);
        this.numberFormatter = new Intl.NumberFormat(locale);
        this.dateFormatter = new Intl.DateTimeFormat(locale);

        document.documentElement.setAttribute('lang', locale);
        this.updatePageDirection();
    }

    setFallbackLocale(locale) {
        this.fallbackLocale = locale;
    }

    async loadLocale(locale) {
        try {
            const response = await fetch(`/locales/${locale}.json`);
            const messages = await response.json();
            this.messages.set(locale, messages);
            this.loadedLocales.add(locale);
        } catch (error) {
            console.error(`Failed to load locale: ${locale}`, error);
        }
    }

    translate(key, params = {}, locale = this.locale) {
        const messages = this.messages.get(locale) || this.messages.get(this.fallbackLocale);
        if (!messages) {
            console.warn(`No messages found for locale: ${locale}`);
            return key;
        }

        let message = this.getNestedValue(messages, key);
        if (!message) {
            if (locale !== this.fallbackLocale) {
                return this.translate(key, params, this.fallbackLocale);
            }
            console.warn(`Translation key not found: ${key}`);
            return key;
        }

        return this.interpolate(message, params);
    }

    getNestedValue(obj, key) {
        return key.split('.').reduce((o, i) => o?.[i], obj);
    }

    interpolate(message, params) {
        return message.replace(/{([^}]+)}/g, (_, key) => {
            const value = params[key];
            return value !== undefined ? value : `{${key}}`;
        });
    }

    pluralize(key, count, params = {}) {
        const rule = this.pluralRules.select(count);
        const pluralKey = `${key}.${rule}`;
        return this.translate(pluralKey, { ...params, count });
    }

    formatNumber(number, options = {}) {
        return this.numberFormatter.format(number, options);
    }

    formatCurrency(number, currency = 'USD', options = {}) {
        return new Intl.NumberFormat(this.locale, {
            style: 'currency',
            currency,
            ...options
        }).format(number);
    }

    formatDate(date, options = {}) {
        return this.dateFormatter.format(date, options);
    }

    formatRelativeTime(value, unit = 'second', options = {}) {
        const rtf = new Intl.RelativeTimeFormat(this.locale, options);
        return rtf.format(value, unit);
    }

    updatePageDirection() {
        const rtlLocales = ['ar', 'he', 'fa'];
        document.documentElement.dir = rtlLocales.includes(this.locale) ? 'rtl' : 'ltr';
    }

    hasTranslation(key, locale = this.locale) {
        const messages = this.messages.get(locale);
        return Boolean(messages && this.getNestedValue(messages, key));
    }

    availableLocales() {
        return Array.from(this.loadedLocales);
    }

    async loadNamespaces(namespaces, locale = this.locale) {
        const promises = namespaces.map(namespace =>
            fetch(`/locales/${locale}/${namespace}.json`)
                .then(response => response.json())
                .then(messages => {
                    const existing = this.messages.get(locale) || {};
                    this.messages.set(locale, {
                        ...existing,
                        [namespace]: messages
                    });
                })
        );

        await Promise.all(promises);
    }
}

// Create global i18n instance
export const i18n = new I18nManager();