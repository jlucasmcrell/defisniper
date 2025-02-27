import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { spawn } from 'child_process';
import { Logger } from '../utils/logger';

let mainWindow: BrowserWindow | null = null;
let serverProcess: any = null;
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

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function startServer() {
    const serverPath = path.join(__dirname, '../server.js');
    serverProcess = spawn('node', [serverPath], {
        stdio: 'pipe'
    });

    serverProcess.stdout.on('data', (data: Buffer) => {
        logger.info(`Server: ${data.toString()}`);
    });

    serverProcess.stderr.on('data', (data: Buffer) => {
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