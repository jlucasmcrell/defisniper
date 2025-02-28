// HTTP request utilities and interceptors
class HttpClient {
    constructor() {
        this.baseUrl = '';
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
        this.interceptors = {
            request: [],
            response: []
        };
        this.timeout = 30000;
    }

    setBaseUrl(url) {
        this.baseUrl = url;
    }

    setDefaultHeader(key, value) {
        this.defaultHeaders[key] = value;
    }

    setDefaultHeaders(headers) {
        this.defaultHeaders = { ...this.defaultHeaders, ...headers };
    }

    setTimeout(timeout) {
        this.timeout = timeout;
    }

    addRequestInterceptor(interceptor) {
        this.interceptors.request.push(interceptor);
        return () => {
            const index = this.interceptors.request.indexOf(interceptor);
            if (index !== -1) {
                this.interceptors.request.splice(index, 1);
            }
        };
    }

    addResponseInterceptor(interceptor) {
        this.interceptors.response.push(interceptor);
        return () => {
            const index = this.interceptors.response.indexOf(interceptor);
            if (index !== -1) {
                this.interceptors.response.splice(index, 1);
            }
        };
    }

    async request(method, url, options = {}) {
        const fullUrl = this.buildUrl(url);
        let config = {
            method,
            headers: { ...this.defaultHeaders, ...options.headers },
            ...options
        };

        // Apply request interceptors
        for (const interceptor of this.interceptors.request) {
            config = await interceptor(config);
        }

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(fullUrl, {
                ...config,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            let result = { response, data: null };

            if (response.headers.get('Content-Type')?.includes('application/json')) {
                result.data = await response.json();
            } else {
                result.data = await response.text();
            }

            // Apply response interceptors
            for (const interceptor of this.interceptors.response) {
                result = await interceptor(result);
            }

            if (!response.ok) {
                throw this.createError(response, result.data);
            }

            return result.data;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    }

    buildUrl(url) {
        if (url.startsWith('http')) {
            return url;
        }
        return `${this.baseUrl}${url}`;
    }

    createError(response, data) {
        const error = new Error(data?.message || 'HTTP request failed');
        error.status = response.status;
        error.statusText = response.statusText;
        error.data = data;
        return error;
    }

    get(url, options = {}) {
        return this.request('GET', url, options);
    }

    post(url, data = null, options = {}) {
        return this.request('POST', url, {
            ...options,
            body: JSON.stringify(data)
        });
    }

    put(url, data = null, options = {}) {
        return this.request('PUT', url, {
            ...options,
            body: JSON.stringify(data)
        });
    }

    patch(url, data = null, options = {}) {
        return this.request('PATCH', url, {
            ...options,
            body: JSON.stringify(data)
        });
    }

    delete(url, options = {}) {
        return this.request('DELETE', url, options);
    }
}

// Create global HTTP client instance
export const http = new HttpClient();