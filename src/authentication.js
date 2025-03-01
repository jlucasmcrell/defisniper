// Authentication and user session management
class AuthenticationManager {
    constructor() {
        this.user = null;
        this.token = null;
        this.listeners = new Set();
        this.refreshTimer = null;
        this.initialized = false;
        
        // Default configuration
        this.config = {
            tokenRefreshInterval: 15 * 60 * 1000, // 15 minutes
            sessionTimeout: 60 * 60 * 1000, // 1 hour
            maxLoginAttempts: 5,
            lockoutDuration: 15 * 60 * 1000 // 15 minutes
        };
    }

    async initialize() {
        try {
            // Check for existing session
            await this.checkSession();
            
            // Start token refresh timer if logged in
            if (this.isAuthenticated()) {
                this.startTokenRefresh();
            }
            
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize authentication manager:', error);
            return false;
        }
    }

    async checkSession() {
        const token = localStorage.getItem('auth.token');
        if (token) {
            try {
                await this.validateToken(token);
                this.token = token;
                await this.fetchUserProfile();
            } catch (error) {
                this.clearSession();
            }
        }
    }

    async login(credentials) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            const { token, user } = await response.json();
            
            this.token = token;
            this.user = user;
            
            localStorage.setItem('auth.token', token);
            
            this.startTokenRefresh();
            this.notifyListeners('login', user);
            
            return user;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    async logout() {
        try {
            if (this.token) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearSession();
        }
    }

    clearSession() {
        this.user = null;
        this.token = null;
        localStorage.removeItem('auth.token');
        this.stopTokenRefresh();
        this.notifyListeners('logout');
    }

    async validateToken(token) {
        const response = await fetch('/api/auth/validate', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Invalid token');
        }
    }

    async refreshToken() {
        try {
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const { token } = await response.json();
            this.token = token;
            localStorage.setItem('auth.token', token);
            
            this.notifyListeners('tokenRefresh', token);
        } catch (error) {
            console.error('Token refresh error:', error);
            this.clearSession();
        }
    }

    startTokenRefresh() {
        this.stopTokenRefresh();
        this.refreshTimer = setInterval(() => {
            this.refreshToken();
        }, this.config.tokenRefreshInterval);
    }

    stopTokenRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    async fetchUserProfile() {
        if (!this.token) return null;

        try {
            const response = await fetch('/api/user/profile', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user profile');
            }

            const user = await response.json();
            this.user = user;
            this.notifyListeners('profileUpdate', user);
            return user;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            throw error;
        }
    }

    async updateProfile(updates) {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        try {
            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });

            if (!response.ok) {
                throw new Error('Failed to update profile');
            }

            const updatedUser = await response.json();
            this.user = updatedUser;
            this.notifyListeners('profileUpdate', updatedUser);
            return updatedUser;
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    }

    async changePassword(currentPassword, newPassword) {
        if (!this.isAuthenticated()) {
            throw new Error('Not authenticated');
        }

        try {
            const response = await fetch('/api/user/password', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            if (!response.ok) {
                throw new Error('Failed to change password');
            }

            this.notifyListeners('passwordChange');
            return true;
        } catch (error) {
            console.error('Error changing password:', error);
            throw error;
        }
    }

    isAuthenticated() {
        return !!this.token && !!this.user;
    }

    getUser() {
        return this.user;
    }

    getToken() {
        return this.token;
    }

    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners(event, data) {
        this.listeners.forEach(listener => {
            try {
                listener(event, data);
            } catch (error) {
                console.error('Error in authentication listener:', error);
            }
        });
    }

    isInitialized() {
        return this.initialized;
    }
}

// Create and export global authentication instance
export const auth = new AuthenticationManager();