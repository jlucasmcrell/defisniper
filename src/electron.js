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

// Create the main window
const createWindow = async () => {
  log.info('Creating main window');
  
  // Create browser window with updated configuration
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: `CryptoSniperBot v${version}`,
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    backgroundColor: '#121212',
    show: false
  });
  
  // Load the app
  const serverUrl = 'http://localhost:3000';
  
  try {
    await waitForServer(serverUrl);
    await mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
    
    // Inject Tailwind CSS
    await mainWindow.webContents.executeJavaScript(`
      if (!document.getElementById('tailwind-css')) {
        const link = document.createElement('link');
        link.id = 'tailwind-css';
        link.rel = 'stylesheet';
        link.href = '/styles/output.css';
        document.head.appendChild(link);
      }
    `);
  } catch (error) {
    log.error('Failed to load application', error);
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'error.html'));
  }
  
  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });
  
  // Handle window close
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });
  
  // Create tray icon and menu
  createTray();
  createMenu();
};

// Wait for server to be available
const waitForServer = async (serverUrl, maxAttempts = 30, interval = 1000) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await axios.get(`${serverUrl}/api/status`);
      log.info(`Server is ready after ${attempt} attempts`);
      return true;
    } catch (error) {
      if (attempt === maxAttempts) throw new Error('Server not available');
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
};

// Create system tray icon
const createTray = () => {
  tray = new Tray(path.join(__dirname, '../assets/icon.png'));
  
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

// App ready event
app.whenReady().then(createWindow);

// Activate event (macOS)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

// Before quit event
app.on('before-quit', () => {
  app.isQuitting = true;
});

module.exports = { app, mainWindow };