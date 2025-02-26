/**
 * Logger utility for CryptoSniperBot
 * Provides consistent logging throughout the application
 */
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, component }) => {
    return `${timestamp} [${level.toUpperCase()}]${component ? ` [${component}]` : ''}: ${message}`;
  })
);

class Logger {
  constructor(component) {
    this.component = component;
    this.logger = winston.createLogger({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      format: logFormat,
      defaultMeta: { component },
      transports: [
        // Console output
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            logFormat
          )
        }),
        // File output - general log
        new winston.transports.File({ 
          filename: path.join(logsDir, 'application.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        // File output - error log
        new winston.transports.File({ 
          level: 'error',
          filename: path.join(logsDir, 'error.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      ]
    });
  }

  info(message) {
    this.logger.info(message);
  }

  warn(message) {
    this.logger.warn(message);
  }

  error(message, error) {
    if (error && error.stack) {
      this.logger.error(`${message}: ${error.stack}`);
    } else {
      this.logger.error(`${message}: ${error || ''}`);
    }
  }

  debug(message) {
    this.logger.debug(message);
  }
}

// Create default logger instance
const defaultLogger = new Logger('System');

// Export both the Logger class and a default instance
module.exports = defaultLogger;
module.exports.Logger = Logger;