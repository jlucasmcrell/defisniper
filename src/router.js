// Client-side routing and navigation management
class RouterManager {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.params = {};
        this.query = {};
        this.middleware = [];
        this.beforeHooks = [];
        this.afterHooks = [];
        this.notFoundHandler = null;
        this.base = '';
        this.mode = 'history';

        this.initialize();
    }

    initialize() {
        window.addEventListener('popstate', this.handlePopState.bind(this));
        document.addEventListener('click', this.handleClick.bind(this));
    }

    setBase(base) {
        this.base = base.replace(/\/$/, '');
    }

    setMode(mode) {
        if (mode !== 'history' && mode !== 'hash') {
            throw new Error('Invalid router mode. Use "history" or "hash"');
        }
        this.mode = mode;
    }

    add(path, handler, options = {}) {
        const route = {
            path,
            handler,
            middleware: options.middleware || [],
            name: options.name,
            regex: this.pathToRegex(path)
        };

        this.routes.set(path, route);
        return this;
    }

    pathToRegex(path) {
        return new RegExp(
            '^' + path.replace(/\//g, '\\/')
                     .replace(/:\w+/g, '([^/]+)')
                     .replace(/\*\w+/g, '(.*)') + '$'
        );
    }

    extractParams(path, regex) {
        const matches = path.match(regex);
        const params = {};

        if (matches) {
            const paramNames = Array.from(
                this.routes.get(Array.from(this.routes.keys())
                    .find(route => this.routes.get(route).regex === regex)).path
                    .matchAll(/:(\w+)/g)
            ).map(match => match[1]);

            paramNames.forEach((name, index) => {
                params[name] = decodeURIComponent(matches[index + 1]);
            });
        }

        return params;
    }

    parseQuery(queryString) {
        const query = {};
        if (!queryString) return query;

        queryString.substring(1).split('&').forEach(param => {
            const [key, value] = param.split('=');
            query[decodeURIComponent(key)] = decodeURIComponent(value || '');
        });

        return query;
    }

    async navigate(path, options = {}) {
        const url = new URL(path, window.location.origin);
        const fullPath = this.mode === 'hash' 
            ? '#' + url.pathname + url.search
            : url.pathname + url.search;

        // Run before hooks
        for (const hook of this.beforeHooks) {
            const result = await hook(url.pathname);
            if (result === false) return;
        }

        const matchedRoute = this.findRoute(url.pathname);
        if (!matchedRoute) {
            if (this.notFoundHandler) {
                this.notFoundHandler();
            }
            return;
        }

        this.params = this.extractParams(url.pathname, matchedRoute.regex);
        this.query = this.parseQuery(url.search);
        this.currentRoute = matchedRoute;

        // Run middleware
        for (const middleware of [...this.middleware, ...matchedRoute.middleware]) {
            const result = await middleware(this.params, this.query);
            if (result === false) return;
        }

        // Update URL
        if (!options.replace) {
            history[options.replace ? 'replaceState' : 'pushState'](
                {},
                '',
                this.base + fullPath
            );
        }

        // Execute route handler
        await matchedRoute.handler(this.params, this.query);

        // Run after hooks
        for (const hook of this.afterHooks) {
            await hook(url.pathname);
        }
    }

    findRoute(path) {
        for (const route of this.routes.values()) {
            if (route.regex.test(path)) {
                return route;
            }
        }
        return null;
    }

    handlePopState() {
        const path = this.mode === 'hash'
            ? window.location.hash.slice(1) || '/'
            : window.location.pathname + window.location.search;
        this.navigate(path, { replace: true });
    }

    handleClick(event) {
        const link = event.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href || href.startsWith('http') || href.startsWith('//')) return;

        event.preventDefault();
        this.navigate(href);
    }

    use(middleware) {
        this.middleware.push(middleware);
        return this;
    }

    beforeEach(hook) {
        this.beforeHooks.push(hook);
        return this;
    }

    afterEach(hook) {
        this.afterHooks.push(hook);
        return this;
    }

    notFound(handler) {
        this.notFoundHandler = handler;
        return this;
    }

    getCurrentRoute() {
        return this.currentRoute;
    }

    getParams() {
        return { ...this.params };
    }

    getQuery() {
        return { ...this.query };
    }

    resolve(name, params = {}, query = {}) {
        const route = Array.from(this.routes.values())
            .find(r => r.name === name);

        if (!route) {
            throw new Error(`Route "${name}" not found`);
        }

        let path = route.path;
        Object.entries(params).forEach(([key, value]) => {
            path = path.replace(`:${key}`, encodeURIComponent(value));
        });

        const queryString = Object.entries(query)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');

        return queryString ? `${path}?${queryString}` : path;
    }
}

// Create global router instance
export const router = new RouterManager();