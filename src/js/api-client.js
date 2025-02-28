// API client for making HTTP requests
class ApiClient {
    constructor() {
        this.baseUrl = '/api';
        this.headers = {
            'Content-Type': 'application/json'
        };
        this.timeout = 30000;
        this.retries = 3;
        this.retryDelay = 1000;
        this.pendingRequests = new Map();
    }

    setBaseUrl(url) {
        this.baseUrl = url;
    }

    setHeader(key, value) {
        this.headers[key] = value;
    }

    removeHeader(key) {
        delete this.headers[key];
    }

    setAuthToken(token) {
        if (token) {
            this.setHeader('Authorization', `Bearer ${token}`);
        } else {
            this.removeHeader('Authorization');
        }
    }

    async request(method, path, options = {}) {
        const requestId = Math.random().toString(36).substring(7);
        const config = {
            method,
            headers: { ...this.headers, ...options.headers },
            credentials: 'include',
            ...options
        };

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        const url = this.buildUrl(path, options.params);
        let attempt = 0;

        while (attempt < this.retries) {
            try {
                const abortController = new AbortController();
                config.signal = abortController.signal;

                // Store pending request
                this.pendingRequests.set(requestId, abortController);

                // Set timeout
                const timeoutId = setTimeout(() => {
                    abortController.abort();
                }, this.timeout);

                const response = await fetch(url, config);
                clearTimeout(timeoutId);

                // Remove from pending requests
                this.pendingRequests.delete(requestId);

                if (!response.ok) {
                    throw await this.handleErrorResponse(response);
                }

                const data = await response.json();
                return this.handleSuccessResponse(data);
            } catch (error) {
                attempt++;
                
                if (error.name === 'AbortError') {
                    throw new Error('Request timeout');
                }

                if (attempt === this.retries) {
                    throw error;
                }

                // Wait before retrying
                await new Promise(resolve => 
                    setTimeout(resolve, this.retryDelay * attempt)
                );
            }
        }
    }

    buildUrl(path, params = {}) {
        const url = new URL(path, this.baseUrl);
        
        Object.entries(params).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                value.forEach(v => url.searchParams.append(key, v));
            } else if (value !== undefined && value !== null) {
                url.searchParams.append(key, value);
            }
        });

        return url.toString();
    }

    async handleErrorResponse(response) {
        let error;
        try {
            const data = await response.json();
            error = new Error(data.message || 'API request failed');
            error.status = response.status;
            error.data = data;
        } catch {
            error = new Error('API request failed');
            error.status = response.status;
        }
        return error;
    }

    handleSuccessResponse(data) {
        if (data.success === false) {
            const error = new Error(data.message || 'API request failed');
            error.data = data;
            throw error;
        }
        return data;
    }

    get(path, options = {}) {
        return this.request('GET', path, options);
    }

    post(path, data = {}, options = {}) {
        return this.request('POST', path, {
            ...options,
            body: data
        });
    }

    put(path, data = {}, options = {}) {
        return this.request('PUT', path, {
            ...options,
            body: data
        });
    }

    patch(path, data = {}, options = {}) {
        return this.request('PATCH', path, {
            ...options,
            body: data
        });
    }

    delete(path, options = {}) {
        return this.request('DELETE', path, options);
    }

    uploadFile(path, file, options = {}) {
        const formData = new FormData();
        formData.append('file', file);

        return this.request('POST', path, {
            ...options,
            headers: {
                ...options.headers,
                'Content-Type': undefined // Let browser set correct content type
            },
            body: formData
        });
    }

    cancelRequest(requestId) {
        const controller = this.pendingRequests.get(requestId);
        if (controller) {
            controller.abort();
            this.pendingRequests.delete(requestId);
        }
    }

    cancelAllRequests() {
        this.pendingRequests.forEach(controller => controller.abort());
        this.pendingRequests.clear();
    }
}

// Create global API client instance
export const api = new ApiClient();