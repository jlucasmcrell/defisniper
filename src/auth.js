// Authentication management
class AuthManager {
    constructor() {
        this.authenticated = false;
        this.listeners = new Set();
        this.baseUrl = '/api/auth';
        this.sessionCheckInterval = null;
        this.sessionCheckDelay = 60000; // 1 minute
        this.initialized = false;
    }

    async initialize() {
        try {
            const status = await this.checkAuthStatus();
            this.authenticated = status.authenticated;
            this.startSessionCheck();
            this.initialized = true;
            this.notifyListeners('init', { authenticated: this.authenticated });
            return true;
        } catch (error) {
            console.error('Auth initialization failed:', error);
            return false;
        }
    }

    async login(password) {
        try {
            const response = await fetch(`${this.baseUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': this.getCsrfToken()
                },
                credentials: 'include',
                body: JSON.stringify({ password })
            });

            if (!response.ok) throw new Error('Login failed');
            const data = await response.json();
            
            if (data.success) {
                this.authenticated = true;
                this.startSessionCheck();
                this.notifyListeners('login');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async logout() {
        try {
            await fetch(`${this.baseUrl}/logout`, {
                method: 'POST',
                headers: {
                    'X-CSRF-Token': this.getCsrfToken()
                },
                credentials: 'include'
            });
            this.clearSession();
            return true;
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    }

    async checkAuthStatus() {
        try {
            const response = await fetch(`${this.baseUrl}/status`, {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to check auth status');
            return await response.json();
        } catch (error) {
            console.error('Auth status check failed:', error);
            return { authenticated: false };
        }
    }

    startSessionCheck() {
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
        }

        this.sessionCheckInterval = setInterval(async () => {
            const status = await this.checkAuthStatus();
            if (!status.authenticated && this.authenticated) {
                this.clearSession();
            }
        }, this.sessionCheckDelay);
    }

    stopSessionCheck() {
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
            this.sessionCheckInterval = null;
        }
    }

    clearSession() {
        this.authenticated = false;
        this.stopSessionCheck();
        this.notifyListeners('logout');
    }

    isAuthenticated() {
        return this.authenticated;
    }

    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners(event, data = null) {
        this.listeners.forEach(listener => {
            try {
                listener(event, data);
            } catch (error) {
                console.error('Error in auth listener:', error);
            }
        });
    }

    getCsrfToken() {
        return document.querySelector('meta[name="csrf-token"]')?.content || '';
    }

    isInitialized() {
        return this.initialized;
    }
}

// Create and export global auth instance
export const auth = new AuthManager();