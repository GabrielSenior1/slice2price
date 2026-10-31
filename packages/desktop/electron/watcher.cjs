const fs = require('fs');
const path = require('path');
const { Notification } = require('electron');

let coreModule = null;
async function getCore() {
  if (!coreModule) {
    coreModule = await import('@slice2price/core');
  }
  return coreModule;
}

/**
 * Rutas predeterminadas de los slicers más populares en Windows
 */
function getAvailableSlicers() {
  const appData = process.env.APPDATA || '';
  const userProfile = process.env.USERPROFILE || '';
  const tempDir = process.env.TEMP || process.env.TMP || '';
  const bridgeFolder = path.join(tempDir, 'Slice2Price');

  try {
    if (!fs.existsSync(bridgeFolder)) {
      fs.mkdirSync(bridgeFolder, { recursive: true });
    }
  } catch (e) {}

  const candidates = [
    {
      id: 'bridge',
      name: 'Puente Plugins Slice2Price',
      icon: 'sync_alt',
      path: bridgeFolder,
      description: 'Carpeta puente rápida para plugins y scripts post-procesado',
    },
    {
      id: 'orcaslicer',
      name: 'OrcaSlicer',
      icon: 'speed',
      path: path.join(appData, 'OrcaSlicer'),
      description: 'Perfiles y exportaciones de OrcaSlicer',
    },
    {
      id: 'bambustudio',
      name: 'Bambu Studio',
      icon: 'view_in_ar',
      path: path.join(appData, 'BambuStudio'),
      description: 'Exportaciones y caché de Bambu Lab',
    },
    {
      id: 'cura',
      name: 'UltiMaker Cura',
      icon: 'layers',
      path: path.join(appData, 'cura'),
      description: 'Laminaciones y salida de UltiMaker Cura',
    },
    {
      id: 'prusaslicer',
      name: 'PrusaSlicer',
      icon: 'precision_manufacturing',
      path: path.join(appData, 'PrusaSlicer'),
      description: 'G-Codes exportados por PrusaSlicer',
    },
    {
      id: 'creality',
      name: 'Creality Print',
      icon: 'print',
      path: path.join(appData, 'Creality'),
      description: 'Exportaciones de Creality Print / Ender',
    },
    {
      id: 'downloads',
      name: 'Descargas (Windows)',
      icon: 'download',
      path: path.join(userProfile, 'Downloads'),
      description: 'Archivos .gcode guardados en Descargas',
    },
    {
      id: 'desktop',
      name: 'Escritorio (Windows)',
      icon: 'desktop_windows',
      path: path.join(userProfile, 'Desktop'),
      description: 'Archivos .gcode guardados en el Escritorio',
    },
  ];

  return candidates.map((s) => ({
    ...s,
    detected: fs.existsSync(s.path),
  }));
}

class SlicerWatcher {
  constructor(options = {}) {
    this.watchers = new Map();
    this.watchedPaths = new Set();
    this.debounceTimers = new Map();
    this.processedFiles = new Map();
    this.onEventCallback = null;
    this.mainWindow = null;
    this.enabled = true;
  }

  setMainWindow(win) {
    this.mainWindow = win;
  }

  setCallback(cb) {
    this.onEventCallback = cb;
  }

  getWatchedPaths() {
    return Array.from(this.watchedPaths);
  }

  setEnabled(state) {
    this.enabled = !!state;
  }

  isEnabled() {
    return this.enabled;
  }

  /**
   * Espera a que el archivo termine de escribirse verificando que el tamaño
   * permanezca estable entre lecturas consecutivas (Falla E9).
   */
  async waitForFileStable(filePath, maxAttempts = 10, intervalMs = 250) {
    let lastSize = -1;
    let consecutiveSame = 0;
    let attempts = 0;

    while (attempts < maxAttempts) {
      if (!fs.existsSync(filePath)) return false;
      try {
        const stats = fs.statSync(filePath);
        if (stats.size > 0 && stats.size === lastSize) {
          consecutiveSame++;
          if (consecutiveSame >= 2) {
            return true; // Tamaño estable verificado en 2 lecturas consecutivas
          }
        } else {
          consecutiveSame = 0;
          lastSize = stats.size;
        }
      } catch (e) {
        consecutiveSame = 0;
      }
      await new Promise((r) => setTimeout(r, intervalMs));
      attempts++;
    }
    // Si tras maxAttempts sigue mutando o no estabilizó, no procesar archivo incompleto
    return false;
  }

  /**
   * Lee de forma segura la cabecera (1 MB) y el pie (256 KB) del archivo.
   * Esto garantiza capturar metadatos tanto de slicers que escriben al inicio (Cura, Orca, Bambu)
   * como de slicers que escriben al final (PrusaSlicer, SuperSlicer) en archivos grandes (>5MB).
   */
  readFileHeaderAndFooter(filePath, headerBytes = 1024 * 1024, footerBytes = 256 * 1024) {
    try {
      const stats = fs.statSync(filePath);
      if (stats.isDirectory() || stats.size === 0) return null;

      const totalSize = stats.size;
      const fd = fs.openSync(filePath, 'r');

      if (totalSize <= headerBytes + footerBytes) {
        const buffer = Buffer.alloc(totalSize);
        fs.readSync(fd, buffer, 0, totalSize, 0);
        fs.closeSync(fd);
        return buffer.toString('utf-8');
      }

      // Leer cabecera (inicio)
      const headerBuf = Buffer.alloc(headerBytes);
      fs.readSync(fd, headerBuf, 0, headerBytes, 0);

      // Leer pie (final)
      const footerBuf = Buffer.alloc(footerBytes);
      const footerOffset = totalSize - footerBytes;
      fs.readSync(fd, footerBuf, 0, footerBytes, footerOffset);
      fs.closeSync(fd);

      return headerBuf.toString('utf-8') + '\n; ... [SLICE2PRICE_OMITTED_MIDDLE] ...\n' + footerBuf.toString('utf-8');
    } catch (e) {
      return null;
    }
  }

  /**
   * Alias de compatibilidad
   */
  readFileHeader(filePath) {
    return this.readFileHeaderAndFooter(filePath);
  }

  async processFile(filePath) {
    if (!this.enabled) return;

    const ext = path.extname(filePath).toLowerCase();
    if (!['.gcode', '.3mf', '.txt'].includes(ext)) {
      return;
    }

    const fileName = path.basename(filePath);

    // Si es .txt, solo procesar si proviene del puente Slice2Price o termina en .gcode.txt para evitar ruido (Falla E9)
    if (ext === '.txt') {
      const isBridgeFile = filePath.toLowerCase().includes('slice2price') || fileName.toLowerCase().endsWith('.gcode.txt');
      if (!isBridgeFile) return;
    }

    // Ignorar temporales o descargas parciales
    if (fileName.startsWith('.') || fileName.startsWith('~$') || fileName.includes('.crdownload') || fileName.includes('.tmp')) {
      return;
    }

    // Esperar estabilidad de escritura
    const isStable = await this.waitForFileStable(filePath);
    if (!isStable) return;

    try {
      const stats = fs.statSync(filePath);
      const fileKey = `${filePath}:${stats.size}:${Math.floor(stats.mtimeMs)}`;

      // Deduplicar eventos consecutivos del mismo archivo sin cambios
      if (this.processedFiles.get(filePath) === fileKey) {
        return;
      }
      this.processedFiles.set(filePath, fileKey);

      // Limitar memoria de mapa de deduplicación
      if (this.processedFiles.size > 200) {
        const oldest = this.processedFiles.keys().next().value;
        this.processedFiles.delete(oldest);
      }

      const content = this.readFileHeaderAndFooter(filePath);
      if (!content) return;

      const { parseSlicerFile } = await getCore();
      const result = parseSlicerFile(content, fileName);

      if (result) {
        const payload = {
          sliceResult: result,
          filePath,
          fileName,
          timestamp: new Date().toISOString(),
        };

        // Notificar por IPC a la interfaz gráfica
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('slicer-event-detected', payload);
        }

        // Llamar callback interno si existe
        if (this.onEventCallback) {
          this.onEventCallback(payload);
        }

        // Mostrar notificación nativa de Windows
        try {
          if (Notification.isSupported()) {
            const h = Math.floor(result.printTimeHours);
            const m = Math.round((result.printTimeHours - h) * 60);
            const notif = new Notification({
              title: `Slice2Price — ${result.slicerName}`,
              body: `Pieza detectada: ${fileName}\nTiempo: ${h}h ${m}m • Filamento: ${result.filamentGrams}g`,
              silent: false,
            });
            notif.on('click', () => {
              if (this.mainWindow) {
                if (this.mainWindow.isMinimized()) this.mainWindow.restore();
                this.mainWindow.focus();
              }
            });
            notif.show();
          }
        } catch (notifErr) {
          console.warn('Error mostrando notificación nativa:', notifErr);
        }
      }
    } catch (err) {
      console.error(`Error procesando archivo laminado ${filePath}:`, err);
    }
  }

  startWatching(dirPaths) {
    // Detener watchers anteriores
    this.stopWatching();

    for (const dir of dirPaths) {
      if (!fs.existsSync(dir)) continue;

      try {
        const watcher = fs.watch(dir, { recursive: true }, (eventType, filename) => {
          if (!filename) return;
          const fullPath = path.join(dir, filename);

          // Debounce de 800ms para esperar que el slicer termine de escribir el archivo
          if (this.debounceTimers.has(fullPath)) {
            clearTimeout(this.debounceTimers.get(fullPath));
          }

          const timer = setTimeout(() => {
            this.debounceTimers.delete(fullPath);
            if (fs.existsSync(fullPath)) {
              this.processFile(fullPath);
            }
          }, 800);

          this.debounceTimers.set(fullPath, timer);
        });

        watcher.on('error', (err) => {
          console.warn(`Error en watcher para ${dir}:`, err);
        });

        this.watchers.set(dir, watcher);
        this.watchedPaths.add(dir);
        console.log(`[Slice2Price Watcher] Monitoreando carpeta: ${dir}`);
      } catch (err) {
        console.error(`No se pudo iniciar vigilancia en ${dir}:`, err);
      }
    }
  }

  stopWatching() {
    for (const [dir, watcher] of this.watchers.entries()) {
      try {
        watcher.close();
      } catch (e) {}
    }
    this.watchers.clear();
    this.watchedPaths.clear();
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }
}

module.exports = {
  SlicerWatcher,
  getAvailableSlicers,
};
