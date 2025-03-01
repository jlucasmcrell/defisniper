// Theme management and customization
class ThemeManager {
    constructor() {
        this.themes = new Map();
        this.currentTheme = null;
        this.listeners = new Set();
        this.variables = new Map();
        this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.initialized = false;
        
        // Default themes
        this.defaultThemes = {
            light: {
                name: 'Light',
                colors: {
                    primary: '#007AFF',
                    secondary: '#5856D6',
                    success: '#34C759',
                    danger: '#FF3B30',
                    warning: '#FF9500',
                    info: '#5AC8FA',
                    background: '#FFFFFF',
                    surface: '#F2F2F7',
                    text: '#000000',
                    textSecondary: '#8E8E93',
                    border: '#C6C6C8',
                    divider: '#E5E5EA'
                },
                typography: {
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: '16px',
                    fontWeight: '400',
                    lineHeight: '1.5'
                },
                spacing: {
                    unit: '8px',
                    small: '4px',
                    medium: '8px',
                    large: '16px',
                    xlarge: '32px'
                },
                animation: {
                    duration: '0.2s',
                    timing: 'ease-in-out'
                }
            },
            dark: {
                name: 'Dark',
                colors: {
                    primary: '#0A84FF',
                    secondary: '#5E5CE6',
                    success: '#30D158',
                    danger: '#FF453A',
                    warning: '#FF9F0A',
                    info: '#64D2FF',
                    background: '#000000',
                    surface: '#1C1C1E',
                    text: '#FFFFFF',
                    textSecondary: '#8E8E93',
                    border: '#38383A',
                    divider: '#2C2C2E'
                },
                typography: {
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: '16px',
                    fontWeight: '400',
                    lineHeight: '1.5'
                },
                spacing: {
                    unit: '8px',
                    small: '4px',
                    medium: '8px',
                    large: '16px',
                    xlarge: '32px'
                },
                animation: {
                    duration: '0.2s',
                    timing: 'ease-in-out'
                }
            }
        };
    }

    async initialize() {
        try {
            // Load saved theme preference
            const savedTheme = localStorage.getItem('theme.current');
            
            // Register default themes
            Object.entries(this.defaultThemes).forEach(([name, theme]) => {
                this.registerTheme(name, theme);
            });
            
            // Set initial theme
            if (savedTheme && this.themes.has(savedTheme)) {
                this.setTheme(savedTheme);
            } else {
                this.setTheme(this.mediaQuery.matches ? 'dark' : 'light');
            }
            
            // Listen for system theme changes
            this.mediaQuery.addListener(e => {
                if (this.currentTheme === 'system') {
                    this.setTheme(e.matches ? 'dark' : 'light');
                }
            });
            
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize theme manager:', error);
            return false;
        }
    }

    registerTheme(name, theme) {
        this.themes.set(name, {
            ...theme,
            variables: this.generateThemeVariables(theme)
        });
    }

    generateThemeVariables(theme) {
        const variables = new Map();
        
        // Process colors
        Object.entries(theme.colors).forEach(([key, value]) => {
            variables.set(`--color-${key}`, value);
        });
        
        // Process typography
        Object.entries(theme.typography).forEach(([key, value]) => {
            variables.set(`--typography-${key}`, value);
        });
        
        // Process spacing
        Object.entries(theme.spacing).forEach(([key, value]) => {
            variables.set(`--spacing-${key}`, value);
        });
        
        // Process animation
        Object.entries(theme.animation).forEach(([key, value]) => {
            variables.set(`--animation-${key}`, value);
        });
        
        return variables;
    }

    setTheme(name) {
        if (!this.themes.has(name)) {
            console.error(`Theme "${name}" not found`);
            return false;
        }

        const theme = this.themes.get(name);
        this.currentTheme = name;
        
        // Apply CSS variables
        theme.variables.forEach((value, key) => {
            document.documentElement.style.setProperty(key, value);
        });
        
        // Save preference
        localStorage.setItem('theme.current', name);
        
        // Notify listeners
        this.notifyListeners();
        
        return true;
    }

    getCurrentTheme() {
        return {
            name: this.currentTheme,
            ...this.themes.get(this.currentTheme)
        };
    }

    getThemes() {
        return Array.from(this.themes.keys());
    }

    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners() {
        const theme = this.getCurrentTheme();
        this.listeners.forEach(listener => {
            try {
                listener(theme);
            } catch (error) {
                console.error('Error in theme listener:', error);
            }
        });
    }

    setVariable(name, value) {
        this.variables.set(name, value);
        document.documentElement.style.setProperty(name, value);
    }

    getVariable(name) {
        return this.variables.get(name);
    }

    isInitialized() {
        return this.initialized;
    }
}

// Create and export global theme instance
export const theme = new ThemeManager();