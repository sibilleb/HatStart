"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = require("path");
const isDev_1 = require("./utils/isDev");
// Keep a global reference of the window object
let mainWindow = null;
const createWindow = () => {
    // Create the browser window
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: (0, path_1.join)(__dirname, 'preload.js'),
        },
        titleBarStyle: 'hiddenInset',
        show: false, // Don't show until ready-to-show
    });
    // Load the app
    if (isDev_1.isDev) {
        mainWindow.loadURL('http://localhost:5173');
        // Open DevTools in development
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile((0, path_1.join)(__dirname, '../dist/index.html'));
    }
    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });
    // Emitted when the window is closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
};
// This method will be called when Electron has finished
// initialization and is ready to create browser windows
electron_1.app.whenReady().then(createWindow);
// Quit when all windows are closed, except on macOS
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    // On macOS it's common to re-create a window when the
    // dock icon is clicked and there are no other windows open
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
// IPC handlers for communication with renderer process
electron_1.ipcMain.handle('get-app-version', () => {
    return electron_1.app.getVersion();
});
electron_1.ipcMain.handle('get-platform', () => {
    return process.platform;
});
//# sourceMappingURL=main.js.map