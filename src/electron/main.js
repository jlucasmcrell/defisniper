const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const { Logger } = require('../utils/logger');

let mainWindow = null;
let serverProcess = null;
const logger = new Logger('Electron');

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // Load the local server URL once it's running
    mainWindow.loadURL('http://localhost:3000');

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function startServer() {
    // Create required directories
    ['logs', 'data', 'secure-config'].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });

    const serverPath = path.join(__dirname, '../server.js');
    serverProcess = spawn('node', [serverPath], {
        stdio: 'pipe'
    });

    serverProcess.stdout.on('data', (data) => {
        logger.info(`Server: ${data.toString()}`);
    });

    serverProcess.stderr.on('data', (data) => {
        logger.error(`Server error: ${data.toString()}`);
    });

    // Wait for server to start
    return new Promise((resolve) => {
        const checkServer = () => {
            fetch('http://localhost:3000/api/status')
                .then(() => resolve(true))
                .catch(() => setTimeout(checkServer, 100));
        };
        checkServer();
    });
}

app.whenReady().then(async () => {
    try {
        await startServer();
        createWindow();
    } catch (error) {
        logger.error('Failed to start application', error);
        app.quit();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

app.on('before-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});