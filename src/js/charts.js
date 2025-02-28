// Advanced charting and visualization manager
class ChartManager {
    constructor() {
        this.charts = new Map();
        this.themes = {
            light: {
                backgroundColor: '#ffffff',
                textColor: '#333333',
                gridColor: '#e6e6e6',
                borderColor: '#d9d9d9',
                crosshairColor: 'rgba(0, 0, 0, 0.3)',
                upColor: '#34C759',
                downColor: '#FF3B30'
            },
            dark: {
                backgroundColor: '#1C1C1E',
                textColor: '#ffffff',
                gridColor: '#2C2C2E',
                borderColor: '#38383A',
                crosshairColor: 'rgba(255, 255, 255, 0.3)',
                upColor: '#30D158',
                downColor: '#FF453A'
            }
        };
        this.defaultOptions = {
            timeframe: '1h',
            indicators: ['MA', 'RSI'],
            showVolume: true,
            showGrid: true,
            animations: true
        };
        this.initialized = false;
    }

    async initialize() {
        try {
            // Load chart.js library dynamically
            await this.loadChartLibrary();
            
            // Initialize default theme based on system preference
            this.currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 
                'dark' : 'light';
            
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize chart manager:', error);
            return false;
        }
    }

    async loadChartLibrary() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    createChart(containerId, type, data, options = {}) {
        if (!this.initialized) {
            throw new Error('Chart manager not initialized');
        }

        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container ${containerId} not found`);
        }

        const canvas = document.createElement('canvas');
        container.appendChild(canvas);

        const chartOptions = this.buildChartOptions(type, {
            ...this.defaultOptions,
            ...options
        });

        const chart = new Chart(canvas, {
            type,
            data: this.processData(data),
            options: chartOptions
        });

        this.charts.set(containerId, {
            instance: chart,
            type,
            lastUpdate: Date.now()
        });

        return chart;
    }

    buildChartOptions(type, options) {
        const theme = this.themes[this.currentTheme];
        
        const baseOptions = {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: options.animations ? 750 : 0
            },
            layout: {
                padding: {
                    left: 10,
                    right: 10,
                    top: 20,
                    bottom: 10
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: theme.textColor
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: theme.backgroundColor,
                    titleColor: theme.textColor,
                    bodyColor: theme.textColor,
                    borderColor: theme.borderColor,
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: {
                        display: options.showGrid,
                        color: theme.gridColor
                    },
                    ticks: {
                        color: theme.textColor
                    }
                },
                y: {
                    grid: {
                        display: options.showGrid,
                        color: theme.gridColor
                    },
                    ticks: {
                        color: theme.textColor
                    }
                }
            }
        };

        // Add type-specific options
        switch (type) {
            case 'candlestick':
                return {
                    ...baseOptions,
                    scales: {
                        ...baseOptions.scales,
                        y: {
                            ...baseOptions.scales.y,
                            position: 'right'
                        }
                    }
                };
            case 'line':
                return {
                    ...baseOptions,
                    elements: {
                        line: {
                            tension: 0.4
                        }
                    }
                };
            default:
                return baseOptions;
        }
    }

    processData(data) {
        // Add data processing logic based on chart type
        return data;
    }

    updateChart(containerId, newData, options = {}) {
        const chart = this.charts.get(containerId);
        if (!chart) {
            throw new Error(`Chart ${containerId} not found`);
        }

        const { instance } = chart;
        instance.data = this.processData(newData);
        
        if (options.animate === false) {
            instance.options.animation = false;
        }

        instance.update();
        chart.lastUpdate = Date.now();
    }

    addIndicator(containerId, indicator, options = {}) {
        const chart = this.charts.get(containerId);
        if (!chart) {
            throw new Error(`Chart ${containerId} not found`);
        }

        // Implementation for adding technical indicators
        // This would integrate with a technical analysis library
    }

    setTheme(theme) {
        if (!this.themes[theme]) {
            throw new Error(`Theme ${theme} not found`);
        }

        this.currentTheme = theme;
        
        // Update all existing charts
        this.charts.forEach((chart, containerId) => {
            const options = this.buildChartOptions(chart.type, chart.instance.options);
            chart.instance.options = options;
            chart.instance.update();
        });
    }

    destroyChart(containerId) {
        const chart = this.charts.get(containerId);
        if (chart) {
            chart.instance.destroy();
            this.charts.delete(containerId);
        }
    }

    destroyAll() {
        this.charts.forEach((chart, containerId) => {
            this.destroyChart(containerId);
        });
    }

    getChart(containerId) {
        return this.charts.get(containerId)?.instance || null;
    }

    isInitialized() {
        return this.initialized;
    }
}

// Create and export global chart instance
export const charts = new ChartManager();