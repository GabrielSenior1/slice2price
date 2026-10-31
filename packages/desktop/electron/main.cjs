const { app, BrowserWindow, ipcMain, dialog, Menu, shell, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { SlicerWatcher, getAvailableSlicers } = require('./watcher.cjs');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow = null;
let isCompactMode = false;
let normalBounds = { width: 1280, height: 820 };
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
    frame: false,
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

  // Atajo de depuración: F12 o Ctrl+Shift+I para DevTools, F5 para recargar, F10 para alternar mini-overlay
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
    if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) {
      mainWindow.webContents.reload();
      event.preventDefault();
    }
    if (input.key === 'F10') {
      toggleCompactMode();
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    slicerWatcher.setMainWindow(null);
  });
}

function toggleCompactMode(forceState) {
  if (!mainWindow) return false;
  const nextState = forceState !== undefined ? !!forceState : !isCompactMode;

  if (nextState && !isCompactMode) {
    normalBounds = mainWindow.getBounds();
    mainWindow.setMinimumSize(320, 180);
    mainWindow.setSize(380, 260);
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    isCompactMode = true;
  } else if (!nextState && isCompactMode) {
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setMinimumSize(980, 650);
    mainWindow.setBounds(normalBounds);
    isCompactMode = false;
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('compact-mode-changed', isCompactMode);
  }
  return isCompactMode;
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

ipcMain.handle('toggle-compact-mode', (event, forceState) => {
  return toggleCompactMode(forceState);
});

ipcMain.handle('is-compact-mode', () => {
  return isCompactMode;
});

ipcMain.handle('toggle-devtools', () => {
  if (mainWindow) {
    mainWindow.webContents.toggleDevTools();
    return true;
  }
  return false;
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

  // Registrar atajo global F10 para alternar el mini-overlay desde cualquier aplicación (E6)
  try {
    const registered = globalShortcut.register('F10', () => {
      toggleCompactMode();
    });
    if (!registered) {
      console.warn('[Slice2Price] Advertencia: No se pudo registrar el atajo global F10');
    }
  } catch (err) {
    console.error('[Slice2Price] Error registrando globalShortcut F10:', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  try {
    globalShortcut.unregisterAll();
  } catch (e) {}
});

app.on('window-all-closed', () => {
  slicerWatcher.stopWatching();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
