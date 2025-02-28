// Notification and alert management system
class NotificationManager {
    constructor() {
        this.notifications = new Map();
        this.listeners = new Set();
        this.permission = false;
        this.soundEnabled = true;
        this.defaultSound = 'notification.mp3';
        this.maxNotifications = 100;
        this.initialized = false;
        this.notificationSounds = {
            default: 'notification.mp3',
            success: 'success.mp3',
            warning: 'warning.mp3',
            error: 'error.mp3',
            trade: 'trade.mp3'
        };
    }

    async initialize() {
        try {
            // Request notification permission
            await this.requestPermission();
            
            // Load notification preferences
            this.loadPreferences();
            
            // Preload audio files
            await this.preloadSounds();
            
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize notification manager:', error);
            return false;
        }
    }

    async requestPermission() {
        if (!('Notification' in window)) {
            console.warn('This browser does not support notifications');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            this.permission = permission === 'granted';
            return this.permission;
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    }

    loadPreferences() {
        try {
            const preferences = JSON.parse(localStorage.getItem('notification.preferences') || '{}');
            this.soundEnabled = preferences.sound !== false;
        } catch (error) {
            console.error('Error loading notification preferences:', error);
        }
    }

    savePreferences() {
        try {
            const preferences = {
                sound: this.soundEnabled
            };
            localStorage.setItem('notification.preferences', JSON.stringify(preferences));
        } catch (error) {
            console.error('Error saving notification preferences:', error);
        }
    }

    async preloadSounds() {
        for (const [key, file] of Object.entries(this.notificationSounds)) {
            try {
                const audio = new Audio(`/sounds/${file}`);
                await audio.load();
                this.notificationSounds[key] = audio;
            } catch (error) {
                console.error(`Error preloading sound ${key}:`, error);
            }
        }
    }

    show(options) {
        const notification = {
            id: this.generateId(),
            timestamp: Date.now(),
            title: options.title || 'Notification',
            message: options.message,
            type: options.type || 'info',
            duration: options.duration || 5000,
            sound: options.sound || 'default',
            onClick: options.onClick,
            read: false
        };

        // Show browser notification if permitted
        if (this.permission) {
            this.showBrowserNotification(notification);
        }

        // Play sound if enabled
        if (this.soundEnabled && notification.sound) {
            this.playSound(notification.sound);
        }

        // Store notification
        this.notifications.set(notification.id, notification);
        this.trimNotifications();

        // Notify listeners
        this.notifyListeners('show', notification);

        // Auto-dismiss if duration is set
        if (notification.duration > 0) {
            setTimeout(() => {
                this.dismiss(notification.id);
            }, notification.duration);
        }

        return notification.id;
    }

    showBrowserNotification(notification) {
        try {
            const browserNotification = new Notification(notification.title, {
                body: notification.message,
                icon: `/icons/${notification.type}.png`
            });

            browserNotification.onclick = () => {
                window.focus();
                if (notification.onClick) {
                    notification.onClick();
                }
            };
        } catch (error) {
            console.error('Error showing browser notification:', error);
        }
    }

    playSound(soundKey) {
        const sound = this.notificationSounds[soundKey];
        if (sound) {
            try {
                sound.currentTime = 0;
                sound.play();
            } catch (error) {
                console.error('Error playing notification sound:', error);
            }
        }
    }

    dismiss(id) {
        const notification = this.notifications.get(id);
        if (notification) {
            notification.dismissed = true;
            this.notifyListeners('dismiss', notification);
            this.notifications.delete(id);
        }
    }

    markAsRead(id) {
        const notification = this.notifications.get(id);
        if (notification && !notification.read) {
            notification.read = true;
            this.notifyListeners('read', notification);
        }
    }

    getNotifications(filter = {}) {
        return Array.from(this.notifications.values())
            .filter(notification => {
                if (filter.type && notification.type !== filter.type) return false;
                if (filter.read !== undefined && notification.read !== filter.read) return false;
                if (filter.from && notification.timestamp < filter.from) return false;
                if (filter.to && notification.timestamp > filter.to) return false;
                return true;
            })
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    clear() {
        this.notifications.clear();
        this.notifyListeners('clear');
    }

    trimNotifications() {
        const notifications = Array.from(this.notifications.entries())
            .sort(([, a], [, b]) => b.timestamp - a.timestamp);

        while (notifications.length > this.maxNotifications) {
            const [id] = notifications.pop();
            this.notifications.delete(id);
        }
    }

    setSound(enabled) {
        this.soundEnabled = enabled;
        this.savePreferences();
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
                console.error('Error in notification listener:', error);
            }
        });
    }

    generateId() {
        return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    isInitialized() {
        return this.initialized;
    }
}

// Create and export global notification instance
export const notifications = new NotificationManager();