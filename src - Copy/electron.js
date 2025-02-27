/**
 * CryptoSniperBot Electron App
 * 
 * This file creates the Electron desktop application wrapper for the trading bot.
 * It provides a native desktop experience for the web-based dashboard.
 */

const { app, BrowserWindow, Menu, Tray, ipcMain, shell } = require('electron');
const path = require('path');
const url = require('url');
const axios = require('axios');
const log = require('electron-log');
const { version } = require('../package.json');

// Configure logging
log.transports.file.level = 'info';
log.info('Starting CryptoSniperBot desktop application');

// Global references
let mainWindow;
let tray;
let serverProcess;

// Set app name
app.setName('CryptoSniperBot');

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  log.info('Another instance is already running, exiting...');
  app.quit();
  return;
}

// Handle second instance attempt
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// Create the main window
const createWindow = async () => {
  log.info('Creating main window');
  
  // Create browser window
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: `CryptoSniperBot v${version}`,
    icon: path.join(__dirname, '../public/assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false // Hide until ready
  });
  
  // Load the app
  const serverUrl = 'http://localhost:3000';
  
  // Wait for the server to be ready
  try {
    await waitForServer(serverUrl);
    mainWindow.loadURL(serverUrl);
  } catch (error) {
    log.error('Failed to connect to server', error);
    mainWindow.loadFile(path.join(__dirname, '../public/error.html'));
  }
  
  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });
  
  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  
  // Handle window close
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });
  
  // Create tray icon
  createTray();
  
  // Create application menu
  createMenu();
};

// Create system tray icon
const createTray = () => {
  tray = new Tray(path.join(__dirname, '../public/assets/icon.png'));
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Dashboard', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: 'Start Bot', click: () => startBot() },
    { label: 'Stop Bot', click: () => stopBot() },
    { type: 'separator' },
    { label: 'Exit', click: () => quitApp() }
  ]);
  
  tray.setToolTip('CryptoSniperBot');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
};

// Create application menu
const createMenu = () => {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Settings', click: () => mainWindow.webContents.send('navigate', '/settings') },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Bot',
      submenu: [
        { label: 'Start', click: () => startBot() },
        { label: 'Stop', click: () => stopBot() },
        { type: 'separator' },
        { label: 'Dashboard', click: () => mainWindow.webContents.send('navigate', '/') },
        { label: 'Trading History', click: () => mainWindow.webContents.send('navigate', '/trades') }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => shell.openExternal('file://' + path.join(app.getAppPath(), 'docs/index.html'))
        },
        {
          label: 'About CryptoSniperBot',
          click: () => showAboutDialog()
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

// Show about dialog
const showAboutDialog = () => {
  mainWindow.webContents.send('showAbout');
};

// Start the trading bot
const startBot = async () => {
  try {
    const response = await axios.post('http://localhost:3000/api/bot/start');
    if (response.data.success) {
      log.info('Bot started successfully');
    }
  } catch (error) {
    log.error('Failed to start bot', error);
  }
};

// Stop the trading bot
const stopBot = async () => {
  try {
    const response = await axios.post('http://localhost:3000/api/bot/stop');
    if (response.data.success) {
      log.info('Bot stopped successfully');
    }
  } catch (error) {
    log.error('Failed to stop bot', error);
  }
};

// Wait for server to be available
const waitForServer = async (serverUrl, maxAttempts = 30, interval = 1000) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await axios.get(`${serverUrl}/api/status`);
      log.info(`Server is ready after ${attempt} attempts`);
      return true;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error('Server not available after maximum attempts');
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
};

// Quit the application
const quitApp = () => {
  app.isQuitting = true;
  app.quit();
};

// App ready event
app.on('ready', () => {
  createWindow();
});

// Activate event (macOS)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

// Before quit event
app.on('before-quit', async (event) => {
  if (serverProcess) {
    event.preventDefault();
    try {
      log.info('Stopping bot before quit');
      await axios.post('http://localhost:3000/api/bot/stop');
    } catch (error) {
      log.error('Error stopping bot', error);
    }
    app.quit();
  }
});

// IPC handlers
ipcMain.handle('app-version', () => version);
ipcMain.handle('app-name', () => app.getName());
ipcMain.handle('app-path', () => app.getAppPath());

// Export for potential reuse
module.exports = { app, mainWindow };
