/**
 * Logger Utility for CryptoSniperBot
 */
const winston = require('winston');
const path = require('path');
const fs = require('fs');

class Logger {
    constructor(module) {
        this.module = module;
        this.logDir = path.join(__dirname, '../../logs');
        this.logPath = path.join(this.logDir, 'cryptosniperbot.log');
        
        // Create logs directory if it doesn't exist
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }

        const winstonLogger = winston.createLogger({
            level: 'debug',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            defaultMeta: { module },
            transports: [
                new winston.transports.File({ 
                    filename: path.join(this.logDir, 'error.log'), 
                    level: 'error' 
                }),
                new winston.transports.File({ 
                    filename: this.logPath 
                })
            ]
        });

        if (process.env.NODE_ENV !== 'production') {
            winstonLogger.add(new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                )
            }));
        }

        // Bind the logging methods to this instance
        this.info = (message, meta = {}) => {
            winstonLogger.info(message, { ...meta });
        };

        this.error = (message, error = null) => {
            if (error instanceof Error) {
                winstonLogger.error(message, { 
                    error: error.message,
                    stack: error.stack
                });
            } else {
                winstonLogger.error(message, { error });
            }
        };

        this.warn = (message, meta = {}) => {
            winstonLogger.warn(message, { ...meta });
        };

        this.debug = (message, meta = {}) => {
            winstonLogger.debug(message, { ...meta });
        };

        // Store winston logger instance
        this.winstonLogger = winstonLogger;
    }

    getLogs(options = {}) {
        try {
            const logs = [];
            const logFile = fs.readFileSync(this.logPath, 'utf8');
            const lines = logFile.split('\n').filter(line => line.trim());

            for (const line of lines) {
                try {
                    const log = JSON.parse(line);
                    if (options.level && log.level !== options.level) continue;
                    if (options.module && log.module !== options.module) continue;
                    logs.push(log);
                } catch (e) {
                    continue;
                }
            }

            return logs;
        } catch (error) {
            this.error('Failed to get logs', error);
            return [];
        }
    }
}

module.exports = { Logger };