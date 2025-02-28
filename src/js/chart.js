// Chart handling and visualization
import Chart from 'chart.js/auto';
import { formatNumber, formatDate } from './utils.js';

export class ChartManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.chart = null;
        this.chartType = 'line';
        this.darkMode = true;
    }

    initialize() {
        this.setupDefaultOptions();
        this.createChart();
    }

    setupDefaultOptions() {
        Chart.defaults.color = '#E0E0E0';
        Chart.defaults.borderColor = '#333333';
        Chart.defaults.backgroundColor = '#1E1E1E';
        
        // Custom dark theme
        const darkTheme = {
            background: '#121212',
            surface: '#1E1E1E',
            primary: '#3B82F6',
            success: '#10B981',
            danger: '#EF4444',
            warning: '#F59E0B',
            text: '#E0E0E0',
            textSecondary: '#AAAAAA',
            grid: '#333333'
        };

        this.chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: darkTheme.text,
                        font: {
                            family: "'Inter', sans-serif"
                        }
                    }
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    backgroundColor: darkTheme.surface,
                    titleColor: darkTheme.text,
                    bodyColor: darkTheme.textSecondary,
                    borderColor: darkTheme.grid,
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    titleFont: {
                        family: "'Inter', sans-serif",
                        size: 14,
                        weight: 600
                    },
                    bodyFont: {
                        family: "'Inter', sans-serif",
                        size: 13
                    },
                    callbacks: {
                        label: (context) => {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += formatNumber(context.parsed.y);
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'hour',
                        displayFormats: {
                            hour: 'HH:mm',
                            day: 'MMM D'
                        }
                    },
                    grid: {
                        color: darkTheme.grid,
                        drawBorder: false
                    },
                    ticks: {
                        color: darkTheme.textSecondary,
                        font: {
                            family: "'Inter', sans-serif"
                        }
                    }
                },
                y: {
                    grid: {
                        color: darkTheme.grid,
                        drawBorder: false
                    },
                    ticks: {
                        color: darkTheme.textSecondary,
                        font: {
                            family: "'Inter', sans-serif"
                        },
                        callback: (value) => formatNumber(value)
                    }
                }
            }
        };
    }

    createChart(data = {}) {
        if (this.chart) {
            this.chart.destroy();
        }

        const ctx = this.container.getContext('2d');
        this.chart = new Chart(ctx, {
            type: this.chartType,
            data: data,
            options: this.chartOptions
        });
    }

    updateData(newData) {
        if (!this.chart) return;
        
        this.chart.data = newData;
        this.chart.update();
    }

    setType(type) {
        if (this.chartType === type) return;
        
        this.chartType = type;
        if (this.chart) {
            const currentData = this.chart.data;
            this.createChart(currentData);
        }
    }

    resize() {
        if (this.chart) {
            this.chart.resize();
        }
    }

    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}