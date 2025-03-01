// UI Components and State Management
class UIManager {
    constructor() {
        this.components = new Map();
        this.state = new Map();
        this.listeners = new Map();
        this.themes = ['light', 'dark', 'auto'];
        this.currentTheme = 'light';
        this.layouts = ['default', 'compact', 'expanded'];
        this.currentLayout = 'default';
        this.initialized = false;
        this.modals = new Map();
        this.toasts = new Map();
        this.activeModals = new Set();
    }

    async initialize() {
        try {
            // Load saved preferences
            this.loadPreferences();
            
            // Initialize theme
            this.initializeTheme();
            
            // Initialize layout
            this.initializeLayout();
            
            // Register base components
            this.registerBaseComponents();
            
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize UI:', error);
            return false;
        }
    }

    loadPreferences() {
        try {
            const preferences = JSON.parse(localStorage.getItem('ui.preferences') || '{}');
            this.currentTheme = preferences.theme || 'light';
            this.currentLayout = preferences.layout || 'default';
        } catch (error) {
            console.error('Error loading preferences:', error);
        }
    }

    savePreferences() {
        try {
            const preferences = {
                theme: this.currentTheme,
                layout: this.currentLayout
            };
            localStorage.setItem('ui.preferences', JSON.stringify(preferences));
        } catch (error) {
            console.error('Error saving preferences:', error);
        }
    }

    registerBaseComponents() {
        // Register modal component
        this.registerComponent('modal', {
            show: (id, options) => this.showModal(id, options),
            hide: (id) => this.hideModal(id)
        });

        // Register toast component
        this.registerComponent('toast', {
            show: (message, options) => this.showToast(message, options),
            hide: (id) => this.hideToast(id)
        });

        // Register loader component
        this.registerComponent('loader', {
            show: (id, options) => this.showLoader(id, options),
            hide: (id) => this.hideLoader(id)
        });
    }

    registerComponent(name, component) {
        this.components.set(name, component);
    }

    getComponent(name) {
        return this.components.get(name);
    }

    setState(key, value) {
        this.state.set(key, value);
        this.notifyListeners(key, value);
    }

    getState(key, defaultValue = null) {
        return this.state.has(key) ? this.state.get(key) : defaultValue;
    }

    addListener(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);
        return () => this.listeners.get(key).delete(callback);
    }

    notifyListeners(key, value) {
        const keyListeners = this.listeners.get(key);
        if (keyListeners) {
            keyListeners.forEach(listener => {
                try {
                    listener(value);
                } catch (error) {
                    console.error(`Error in UI listener for ${key}:`, error);
                }
            });
        }
    }

    // Theme Management
    setTheme(theme) {
        if (this.themes.includes(theme)) {
            this.currentTheme = theme;
            document.documentElement.setAttribute('data-theme', theme);
            this.savePreferences();
            this.notifyListeners('theme', theme);
        }
    }

    getTheme() {
        return this.currentTheme;
    }

    // Layout Management
    setLayout(layout) {
        if (this.layouts.includes(layout)) {
            this.currentLayout = layout;
            document.body.setAttribute('data-layout', layout);
            this.savePreferences();
            this.notifyListeners('layout', layout);
        }
    }

    getLayout() {
        return this.currentLayout;
    }

    // Modal Management
    showModal(id, options = {}) {
        const modal = {
            id,
            content: options.content,
            title: options.title,
            buttons: options.buttons || [],
            closeOnEscape: options.closeOnEscape !== false,
            closeOnOverlayClick: options.closeOnOverlayClick !== false,
            onClose: options.onClose
        };

        this.modals.set(id, modal);
        this.activeModals.add(id);
        this.notifyListeners('modal', { type: 'show', modal });
        return id;
    }

    hideModal(id) {
        if (this.modals.has(id)) {
            const modal = this.modals.get(id);
            this.activeModals.delete(id);
            if (modal.onClose) {
                modal.onClose();
            }
            this.notifyListeners('modal', { type: 'hide', id });
        }
    }

    // Toast Management
    showToast(message, options = {}) {
        const id = options.id || `toast_${Date.now()}`;
        const toast = {
            id,
            message,
            type: options.type || 'info',
            duration: options.duration || 3000,
            position: options.position || 'bottom-right'
        };

        this.toasts.set(id, toast);
        this.notifyListeners('toast', { type: 'show', toast });

        if (toast.duration > 0) {
            setTimeout(() => this.hideToast(id), toast.duration);
        }

        return id;
    }

    hideToast(id) {
        if (this.toasts.has(id)) {
            this.toasts.delete(id);
            this.notifyListeners('toast', { type: 'hide', id });
        }
    }

    // Loader Management
    showLoader(id, options = {}) {
        const loader = {
            id,
            message: options.message || 'Loading...',
            overlay: options.overlay !== false
        };

        this.setState(`loader.${id}`, loader);
        return id;
    }

    hideLoader(id) {
        this.setState(`loader.${id}`, null);
    }

    isInitialized() {
        return this.initialized;
    }

    reset() {
        this.state.clear();
        this.modals.clear();
        this.toasts.clear();
        this.activeModals.clear();
        this.loadPreferences();
    }
}

// Create and export global UI instance
export const ui = new UIManager();