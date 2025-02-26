/**
 * Log Viewer Script
 * Displays and manages application logs
 */
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../logs');
const LOG_FILE = path.join(LOG_DIR, 'cryptosniperbot.log');

function tailLog(lines = 100) {
    try {
        if (!fs.existsSync(LOG_FILE)) {
            console.log('No log file found.');
            return;
        }

        const logs = fs.readFileSync(LOG_FILE, 'utf8')
            .split('\n')
            .filter(Boolean)
            .slice(-lines);

        logs.forEach(log => {
            try {
                const parsed = JSON.parse(log);
                const timestamp = new Date(parsed.timestamp).toISOString();
                const level = parsed.level.toUpperCase().padEnd(5);
                const module = parsed.module ? `[${parsed.module}]` : '';
                console.log(`${timestamp} ${level} ${module} ${parsed.message}`);
            } catch (e) {
                console.log(log);
            }
        });
    } catch (error) {
        console.error('Error reading log file:', error);
    }
}

function watchLogs() {
    if (!fs.existsSync(LOG_FILE)) {
        console.log('Waiting for log file...');
    }

    let lastSize = 0;
    setInterval(() => {
        try {
            if (!fs.existsSync(LOG_FILE)) return;

            const stats = fs.statSync(LOG_FILE);
            if (stats.size > lastSize) {
                const newLogs = fs.readFileSync(LOG_FILE, 'utf8')
                    .split('\n')
                    .filter(Boolean)
                    .slice(-1);

                newLogs.forEach(log => {
                    try {
                        const parsed = JSON.parse(log);
                        const timestamp = new Date(parsed.timestamp).toISOString();
                        const level = parsed.level.toUpperCase().padEnd(5);
                        const module = parsed.module ? `[${parsed.module}]` : '';
                        console.log(`${timestamp} ${level} ${module} ${parsed.message}`);
                    } catch (e) {
                        console.log(log);
                    }
                });

                lastSize = stats.size;
            }
        } catch (error) {
            console.error('Error watching log file:', error);
        }
    }, 1000);
}

const args = process.argv.slice(2);
if (args.includes('--watch')) {
    console.log('Watching logs...');
    watchLogs();
} else {
    const lines = args[0] ? parseInt(args[0]) : 100;
    tailLog(lines);
}