import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { SettingsManager } from '../settings/settings';
import { SecurityManager } from '../security/securityManager';
import { ConnectionTester } from '../utils/connectionTester';

let mainWindow: BrowserWindow | null = null;
let settingsManager: SettingsManager;
let connectionTester: ConnectionTester;

app.whenReady().then(() => {
    const securityManager = new SecurityManager();
    settingsManager = new SettingsManager(securityManager);
    connectionTester = new ConnectionTester();

    createMainWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });

    // Handle test connection request
    ipcMain.handle('test-connection', async (event, settings) => {
        try {
            const results = await connectionTester.testConnections(settings);
            return results;
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    });
});

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});