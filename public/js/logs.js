/**
 * Log management for CryptoSniperBot UI
 */

// DOM elements
const logsContainer = document.getElementById('logs-container');
const clearLogsBtn = document.getElementById('clear-logs-btn');

// Maximum number of logs to display
const MAX_LOGS = 1000;

// Stored logs
let logs = [];

// Add a log entry to the UI
function addLogEntry(logData) {
    if (!logsContainer) return;
    
    // Add to logs array
    logs.push(logData);
    
    // Trim logs if needed
    if (logs.length > MAX_LOGS) {
        logs = logs.slice(-MAX_LOGS);
    }
    
    // Create log element
    const logElement = document.createElement('div');
    logElement.className = `log-line log-level-${logData.level.toLowerCase()}`;
    
    const timestamp = new Date(logData.timestamp).toLocaleTimeString();
    const module = logData.module ? `[${logData.module}]` : '';
    
    logElement.textContent = `${timestamp} ${module} ${logData.level.toUpperCase()}: ${logData.message}`;
    
    // Add to container
    logsContainer.appendChild(logElement);
    
    // Scroll to bottom
    logsContainer.scrollTop = logsContainer.scrollHeight;
}

// Clear all logs
function clearLogs() {
    if (!logsContainer) return;
    
    logsContainer.innerHTML = '';
    logs = [];
}

// Set up event listeners
if (clearLogsBtn) {
    clearLogsBtn.addEventListener('click', clearLogs);
}

// Set up socket.io event listeners for logs
function setupLogListeners() {
    if (!window.socket) return;
    
    window.socket.on('log', (logData) => {
        addLogEntry(logData);
    });
}

// Initialize logs module
function initLogs() {
    setupLogListeners();
}

// Export functions for use in other modules
window.logs = {
    initLogs,
    addLogEntry,
    clearLogs
};