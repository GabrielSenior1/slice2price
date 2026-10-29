const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { SlicerWatcher, getAvailableSlicers } = require('./watcher.cjs');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow = null;
const slicerWatcher = new SlicerWatcher();

function createWindow() {
  const iconPath = process.platform === 'win32'
    ? path.join(__dirname, '../public/icon.ico')
    : path.join(__dirname, '../public/icon.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 650,
    frame: true,
    titleBarStyle: 'default',
    title: 'Slice2Price — Calculadora de Costos 3D',
    backgroundColor: '#111317',
    icon: fs.existsSync(iconPath) ? iconPath : path.join(__dirname, '../public/logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // Ocultar menú nativo estándar para apariencia limpia de app moderna
  mainWindow.setMenuBarVisibility(false);
  Menu.setApplicationMenu(null);

  slicerWatcher.setMainWindow(mainWindow);

  const indexPath = path.join(__dirname, '../dist/index.html');
  if (isDev) {
    const devUrl = 'http://localhost:5173';
    mainWindow.loadURL(devUrl).catch(() => {
      console.log('[Slice2Price] Servidor Vite no detectado en 5173, cargando interfaz compilada...');
      if (fs.existsSync(indexPath)) {
        mainWindow.loadFile(indexPath);
      }
    });
  } else {
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    slicerWatcher.setMainWindow(null);
  });
}

// IPC Handlers — Control de ventana
ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('open-external-url', async (event, url) => {
  if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

// IPC Handlers — Vigilante de Slicers (Fase 3)
ipcMain.handle('get-detected-slicers', () => {
  return getAvailableSlicers();
});

ipcMain.handle('get-watcher-status', () => {
  return {
    enabled: slicerWatcher.isEnabled(),
    watchedPaths: slicerWatcher.getWatchedPaths(),
  };
});

ipcMain.handle('set-watcher-enabled', (event, enabled) => {
  slicerWatcher.setEnabled(enabled);
  return slicerWatcher.isEnabled();
});

ipcMain.handle('start-watcher', (event, dirPaths) => {
  slicerWatcher.startWatching(dirPaths);
  return {
    enabled: slicerWatcher.isEnabled(),
    watchedPaths: slicerWatcher.getWatchedPaths(),
  };
});

ipcMain.handle('stop-watcher', () => {
  slicerWatcher.stopWatching();
  return {
    enabled: false,
    watchedPaths: [],
  };
});

// IPC Handlers — Diálogos de Archivos y Carpetas del Sistema
ipcMain.handle('select-folder', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Seleccionar carpeta para vigilar',
    properties: ['openDirectory'],
  });
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('select-file', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Seleccionar archivo de laminador (G-code o 3MF)',
    properties: ['openFile'],
    filters: [
      { name: 'Archivos 3D Laminados', extensions: ['gcode', '3mf', 'txt'] },
      { name: 'Todos los archivos', extensions: ['*'] },
    ],
  });
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('parse-file-path', async (event, filePath) => {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const content = slicerWatcher.readFileHeader(filePath);
  if (!content) return null;

  try {
    const { parseSlicerFile } = await import('@slice2price/core');
    const result = parseSlicerFile(content, path.basename(filePath));
    return result;
  } catch (e) {
    console.error('Error parseando archivo:', e);
    return null;
  }
});

// Inicialización de la aplicación
app.whenReady().then(() => {
  createWindow();

  // Iniciar el vigilante en las carpetas detectadas por defecto
  const detected = getAvailableSlicers()
    .filter((s) => s.detected)
    .map((s) => s.path);

  if (detected.length > 0) {
    slicerWatcher.startWatching(detected);
    console.log('[Slice2Price] Vigilante automático iniciado en:', detected);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  slicerWatcher.stopWatching();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
