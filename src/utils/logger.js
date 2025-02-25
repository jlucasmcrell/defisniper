/**
 * Logger Utility
 * 
 * Provides consistent logging functionality throughout the application.
 */

const winston = require('winston');
const fs = require('fs');
const path = require('path');

class Logger {
  constructor(module) {
    // Create logs directory if it doesn't exist
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Create Winston logger instance
    this.logger = winston.createLogger({
      level: 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { module },
      transports: [
        // Write logs to files
        new winston.transports.File({ 
          filename: path.join(logDir, 'error.log'), 
          level: 'error' 
        }),
        new winston.transports.File({ 
          filename: path.join(logDir, 'trading.log')
        }),
        
        // Console output during development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(info => {
              const { timestamp, level, message, module } = info;
              const ts = timestamp.slice(0, 19).replace('T', ' ');
              return `${ts} [${module}] ${level}: ${message}`;
            })
          )
        })
      ]
    });
  }
  
  /**
   * Log debug message
   */
  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }
  
  /**
   * Log info message
   */
  info(message, meta = {}) {
    this.logger.info(message, meta);
  }
  
  /**
   * Log warning message
   */
  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }
  
  /**
   * Log error message
   */
  error(message, meta = {}) {
    // Convert Error objects to string
    if (meta instanceof Error) {
      meta = { 
        message: meta.message, 
        stack: meta.stack, 
        name: meta.name 
      };
    }
    
    this.logger.error(message, meta);
  }
  
  /**
   * Get all logs
   */
  static async getLogs(level = null, limit = 100) {
    const logPath = path.join(process.cwd(), 'logs', 'trading.log');
    
    if (!fs.existsSync(logPath)) {
      return [];
    }
    
    // Read log file
    const logContent = fs.readFileSync(logPath, 'utf8');
    const logLines = logContent.split('\n').filter(line => line.trim() !== '');
    
    // Parse JSON logs
    const logs = logLines.map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return {
          level: 'info',
          message: line,
          timestamp: new Date().toISOString()
        };
      }
    });
    
    // Filter by level if provided
    const filteredLogs = level ? logs.filter(log => log.level === level) : logs;
    
    // Return the most recent logs
    return filteredLogs.slice(-limit);
  }
  
  /**
   * Clear logs
   */
  static clearLogs() {
    const logDir = path.join(process.cwd(), 'logs');
    const logFiles = ['trading.log', 'error.log'];
    
    logFiles.forEach(file => {
      const logPath = path.join(logDir, file);
      if (fs.existsSync(logPath)) {
        fs.writeFileSync(logPath, '');
      }
    });
    
    return true;
  }
}

module.exports = { Logger };
