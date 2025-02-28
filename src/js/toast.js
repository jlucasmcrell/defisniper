// Toast notification system
class ToastManager {
    constructor() {
        this.container = null;
        this.toasts = new Map();
        this.counter = 0;
        this.defaultOptions = {
            duration: 5000,
            position: 'top-right',
            closeable: true,
            animate: true
        };

        this.initialize();
    }

    initialize() {
        this.createContainer();
        this.setupStyles();
    }

    createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'toast-container fixed z-50 p-4 space-y-4';
        document.body.appendChild(this.container);
    }

    setupStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .toast-container {
                pointer-events: none;
            }
            .toast-container > * {
                pointer-events: auto;
            }
            .toast-enter {
                transform: translateX(100%);
                opacity: 0;
            }
            .toast-enter-active {
                transform: translateX(0);
                opacity: 1;
                transition: all 300ms ease-out;
            }
            .toast-exit {
                transform: translateX(0);
                opacity: 1;
            }
            .toast-exit-active {
                transform: translateX(100%);
                opacity: 0;
                transition: all 300ms ease-in;
            }
        `;
        document.head.appendChild(style);
    }

    show(message, options = {}) {
        const settings = { ...this.defaultOptions, ...options };
        const id = ++this.counter;

        const toast = this.createToast(id, message, settings);
        this.toasts.set(id, toast);
        this.container.appendChild(toast);

        if (settings.animate) {
            toast.classList.add('toast-enter');
            requestAnimationFrame(() => {
                toast.classList.add('toast-enter-active');
                toast.classList.remove('toast-enter');
            });
        }

        if (settings.duration > 0) {
            setTimeout(() => this.dismiss(id), settings.duration);
        }

        return id;
    }

    createToast(id, message, settings) {
        const toast = document.createElement('div');
        toast.className = `
            flex items-center justify-between
            p-4 rounded-lg shadow-lg
            ${this.getTypeStyles(settings.type)}
            ${settings.animate ? 'transform transition-all duration-300 ease-in-out' : ''}
        `;

        const content = document.createElement('div');
        content.className = 'flex items-center space-x-3';

        if (settings.type) {
            const icon = this.createIcon(settings.type);
            if (icon) {
                content.appendChild(icon);
            }
        }

        const text = document.createElement('p');
        text.className = 'text-white';
        text.textContent = message;
        content.appendChild(text);

        toast.appendChild(content);

        if (settings.closeable) {
            const closeButton = this.createCloseButton(id);
            toast.appendChild(closeButton);
        }

        return toast;
    }

    getTypeStyles(type) {
        switch (type) {
            case 'success':
                return 'bg-status-success text-white';
            case 'error':
                return 'bg-status-danger text-white';
            case 'warning':
                return 'bg-status-warning text-white';
            default:
                return 'bg-status-info text-white';
        }
    }

    createIcon(type) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'w-5 h-5');
        svg.setAttribute('viewBox', '0 0 20 20');
        svg.setAttribute('fill', 'currentColor');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        switch (type) {
            case 'success':
                path.setAttribute('d', 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z');
                break;
            case 'error':
                path.setAttribute('d', 'M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z');
                break;
            case 'warning':
                path.setAttribute('d', 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z');
                break;
            default:
                path.setAttribute('d', 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z');
        }

        svg.appendChild(path);
        return svg;
    }

    createCloseButton(id) {
        const button = document.createElement('button');
        button.className = 'ml-4 text-white hover:text-gray-200 focus:outline-none';
        button.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
        `;
        button.addEventListener('click', () => this.dismiss(id));
        return button;
    }

    dismiss(id) {
        const toast = this.toasts.get(id);
        if (!toast) return;

        const handleTransitionEnd = () => {
            toast.remove();
            this.toasts.delete(id);
        };

        if (toast.classList.contains('toast-enter-active')) {
            toast.classList.add('toast-exit');
            requestAnimationFrame(() => {
                toast.classList.add('toast-exit-active');
                toast.addEventListener('transitionend', handleTransitionEnd, { once: true });
            });
        } else {
            handleTransitionEnd();
        }
    }

    dismissAll() {
        this.toasts.forEach((_, id) => this.dismiss(id));
    }

    success(message, options = {}) {
        return this.show(message, { ...options, type: 'success' });
    }

    error(message, options = {}) {
        return this.show(message, { ...options, type: 'error' });
    }

    warning(message, options = {}) {
        return this.show(message, { ...options, type: 'warning' });
    }

    info(message, options = {}) {
        return this.show(message, { ...options, type: 'info' });
    }
}

// Create global toast instance
export const toast = new ToastManager();