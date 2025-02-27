/**
 * DeFi Sniper Bot - Unified Start Script
 */
const { spawn } = require('child_process');
const path = require('path');
const open = require('open');
const fs = require('fs');

// Ensure required directories exist
const dirs = ['logs', 'data', 'secure-config'];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

console.log('\n========================================');
console.log('       Starting DeFi Sniper Bot');
console.log('========================================\n');

// Start the server
const serverProcess = spawn('node', [path.join(__dirname, 'src', 'server.js')], {
    stdio: 'inherit'
});

// Handle server process events
serverProcess.on('error', (err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

// Give the server a moment to start
setTimeout(async () => {
    try {
        // Open the default browser to the web interface
        await open('http://localhost:3000');
        console.log('\nWeb interface opened in your default browser');
        console.log('If the browser didn\'t open automatically, visit: http://localhost:3000\n');
    } catch (error) {
        console.log('\nPlease open your browser and visit: http://localhost:3000\n');
    }
}, 2000);

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    serverProcess.kill();
    process.exit();
});

process.on('SIGTERM', () => {
    console.log('\nShutting down...');
    serverProcess.kill();
    process.exit();
});