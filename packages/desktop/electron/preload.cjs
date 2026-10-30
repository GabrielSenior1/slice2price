const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),
  toggleDevTools: () => ipcRenderer.invoke('toggle-devtools'),

  // Vigilante de Slicers (Fase 3)
  getDetectedSlicers: () => ipcRenderer.invoke('get-detected-slicers'),
  getWatcherStatus: () => ipcRenderer.invoke('get-watcher-status'),
  setWatcherEnabled: (enabled) => ipcRenderer.invoke('set-watcher-enabled', enabled),
  startWatcher: (dirPaths) => ipcRenderer.invoke('start-watcher', dirPaths),
  stopWatcher: () => ipcRenderer.invoke('stop-watcher'),

  // Diálogos nativos del sistema
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectFile: () => ipcRenderer.invoke('select-file'),
  parseFilePath: (filePath) => ipcRenderer.invoke('parse-file-path', filePath),

  // Modo Mini Overlay Flotante (Etapa 4)
  toggleCompactMode: (forceState) => ipcRenderer.invoke('toggle-compact-mode', forceState),
  isCompactMode: () => ipcRenderer.invoke('is-compact-mode'),
  onCompactModeChanged: (callback) => {
    const handler = (_event, state) => callback(state);
    ipcRenderer.on('compact-mode-changed', handler);
    return () => ipcRenderer.removeListener('compact-mode-changed', handler);
  },

  // Suscripción al evento de laminado en tiempo real
  onSlicerEvent: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('slicer-event-detected', handler);
    return () => ipcRenderer.removeListener('slicer-event-detected', handler);
  },
});
