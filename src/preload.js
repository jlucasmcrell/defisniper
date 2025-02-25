/**
 * Electron Preload Script
 * 
 * This script runs in the context of the renderer process
 * and provides a secure bridge between the renderer and main processes.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // App info
    getAppVersion: () => ipcRenderer.invoke('app-version'),
    getAppName: () => ipcRenderer.invoke('app-name'),
    getAppPath: () => ipcRenderer.invoke('app-path'),
    
    // IPC communication
    send: (channel, data) => {
      // Whitelist channels for security
      const validChannels = ['toMain', 'navigate', 'showAbout'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    
    // Receive from main process
    receive: (channel, callback) => {
      // Whitelist channels for security
      const validChannels = ['fromMain', 'navigate', 'showAbout'];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender` 
        ipcRenderer.on(channel, (event, ...args) => callback(...args));
      }
    },
    
    // Open external links
    openExternal: (url) => {
      ipcRenderer.send('open-external', url);
    }
  }
);

// Add additional info about the app environment
contextBridge.exposeInMainWorld(
  'env', {
    isElectron: true,
    platform: process.platform
  }
);

// Log when preload script is executed
console.log('Preload script executed');
