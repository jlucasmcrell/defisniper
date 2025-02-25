/**
 * Show Logs Script
 * 
 * Displays trading bot logs in the console.
 * This is used by the batch file to monitor bot activity.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",
  
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  
  bgBlack: "\x1b[40m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
  bgWhite: "\x1b[47m"
};

// Get log file path
const logPath = path.join(process.cwd(), 'logs', 'trading.log');

// Check if log file exists
if (!fs.existsSync(logPath)) {
  console.error(`${colors.red}Log file not found: ${logPath}${colors.reset}`);
  process.exit(1);
}

/**
 * Format log message based on level
 */
function formatLogMessage(log) {
  try {
    // Parse JSON log
    const logData = typeof log === 'string' ? JSON.parse(log) : log;
    
    // Format timestamp
    const timestamp = logData.timestamp 
      ? new Date(logData.timestamp).toLocaleTimeString()
      : new Date().toLocaleTimeString();
    
    // Format level with color
    let levelColor = colors.reset;
    switch (logData.level) {
      case 'error':
        levelColor = colors.red;
        break;
      case 'warn':
        levelColor = colors.yellow;
        break;
      case 'info':
        levelColor = colors.green;
        break;
      case 'debug':
        levelColor = colors.cyan;
        break;
      default:
        levelColor = colors.reset;
    }
    
    // Format module name
    const module = logData.module ? `[${logData.module}]` : '';
    
    // Format message
    return `${colors.dim}${timestamp}${colors.reset} ${module} ${levelColor}${logData.level.toUpperCase()}${colors.reset}: ${logData.message}`;
  } catch (error) {
    // If JSON parsing fails, return raw log
    return log;
  }
}

/**
 * Display initial logs and watch for changes
 */
function showAndWatchLogs() {
  console.log(`${colors.cyan}${colors.bright}CryptoSniperBot Logs${colors.reset}`);
  console.log(`${colors.dim}Monitoring log file: ${logPath}${colors.reset}`);
  console.log('--------------------------------------------------------');
  
  // Read last 20 lines of logs
  const tailProcess = require('child_process').spawn(
    process.platform === 'win32' ? 'powershell.exe' : 'tail',
    process.platform === 'win32' 
      ? ['-Command', `Get-Content -Path "${logPath}" -Tail 20 -Wait`]
      : ['-f', '-n', '20', logPath]
  );
  
  // Handle output
  tailProcess.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          console.log(formatLogMessage(line));
        } catch (error) {
          console.log(line);
        }
      }
    }
  });
  
  // Handle error
  tailProcess.stderr.on('data', (data) => {
    console.error(`${colors.red}Error: ${data.toString()}${colors.reset}`);
  });
  
  // Handle process exit
  tailProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`${colors.red}Log monitor process exited with code ${code}${colors.reset}`);
    }
  });
  
  // Handle Ctrl+C
  process.on('SIGINT', () => {
    tailProcess.kill();
    process.exit(0);
  });
}

// Start showing logs
showAndWatchLogs();
