import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import type { SlicerDetectedInfo } from '../types/index.js';

export const WatcherView: React.FC = () => {
  const { setActiveTab, showToast, setLoadedQuote, toggleCompactMode } = useApp();
  const [watcherEnabled, setWatcherEnabled] = useState(true);
  const [slicers, setSlicers] = useState<SlicerDetectedInfo[]>([]);
  const [customPaths, setCustomPaths] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Cargar estado inicial desde Electron si está disponible
  useEffect(() => {
    async function loadStatus() {
      if (!window.electronAPI) return;
      try {
        const detected = await window.electronAPI.getDetectedSlicers();
        setSlicers(detected);

        const status = await window.electronAPI.getWatcherStatus();
        setWatcherEnabled(status.enabled);
        setCustomPaths(status.watchedPaths || []);
      } catch (err) {
        console.warn('Error leyendo estado de slicers:', err);
      }
    }
    loadStatus();
  }, []);

  const handleToggleWatcher = async () => {
    if (window.electronAPI?.setWatcherEnabled) {
      const newState = !watcherEnabled;
      const res = await window.electronAPI.setWatcherEnabled(newState);
      setWatcherEnabled(res);
      showToast(res ? 'Vigilante en segundo plano ACTIVO' : 'Vigilante PAUSADO');
    } else {
      setWatcherEnabled(!watcherEnabled);
      showToast(!watcherEnabled ? 'Vigilante simulado ACTIVO' : 'Vigilante PAUSADO');
    }
  };

  const handleAddFolder = async () => {
    if (!window.electronAPI?.selectFolder) {
      showToast('Función de selección de carpeta disponible en la versión de escritorio nativa');
      return;
    }

    try {
      setLoading(true);
      const folderPath = await window.electronAPI.selectFolder();
      if (folderPath) {
        const updated = Array.from(new Set([...customPaths, folderPath]));
        setCustomPaths(updated);
        await window.electronAPI.startWatcher(updated);
        showToast(`Carpeta añadida a vigilancia: ${folderPath}`);
      }
    } catch (e) {
      showToast('Error al seleccionar carpeta');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFile = async () => {
    if (!window.electronAPI?.selectFile || !window.electronAPI?.parseFilePath) {
      showToast('Disponible en la aplicación de escritorio');
      return;
    }

    try {
      setLoading(true);
      const filePath = await window.electronAPI.selectFile();
      if (filePath) {
        const result = await window.electronAPI.parseFilePath(filePath);
        if (result) {
          const fileName = filePath.split(/[/\\]/).pop() || 'Pieza';
          setLoadedQuote({
            id: 'file_' + Date.now(),
            pieceName: fileName.replace(/\.[^/.]+$/, ''),
            timestamp: new Date().toISOString(),
            printTimeHours: result.printTimeHours,
            filamentGrams: result.filamentGrams,
            extraCosts: 0,
            quantity: 1,
            profiles: {
              printerName: '',
              materialName: '',
              clientName: '',
              printerId: '',
              materialId: '',
              clientId: '',
              generalId: '',
            },
            breakdown: {} as any,
          });
          showToast(`¡Archivo parseado de ${result.slicerName}! Parámetros cargados.`);
          setActiveTab('cotizador');
        } else {
          showToast('No se encontraron etiquetas reconocibles de tiempo/filamento');
        }
      }
    } catch (e) {
      showToast('Error al analizar archivo');
    } finally {
      setLoading(false);
    }
  };

  // Simular evento automático de laminado para probar
  const simulateSlicerEvent = (slicer: string, filename: string, hours: number, grams: number) => {
    setLoadedQuote({
      id: 'sim_' + Date.now(),
      pieceName: filename,
      timestamp: new Date().toISOString(),
      printTimeHours: hours,
      filamentGrams: grams,
      extraCosts: 0,
      quantity: 1,
      profiles: {
        printerName: '',
        materialName: '',
        clientName: '',
        printerId: '',
        materialId: '',
        clientId: '',
        generalId: '',
      },
      breakdown: {} as any,
    });
    showToast(`¡Evento simulado de ${slicer}! Parámetros enviados al Cotizador.`);
    setActiveTab('cotizador');
  };

  return (
    <div className="flex-col gap-md">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="text-headline-md" style={{ color: 'var(--on-surface)' }}>
              Vigilante de Slicers en Tiempo Real
            </h2>
            <span className="badge badge--primary">Fase 3 Integrada</span>
          </div>
          <p className="text-body-sm color-outline">
            Detecta automáticamente archivos .gcode o .3mf generados por tus laminadores y cotiza al instante
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className="btn btn--secondary btn--sm"
            onClick={() => toggleCompactMode(true)}
            title="Activar Mini Overlay Flotante Always-on-top mientras laminas (F10)"
          >
            <span className="material-symbols-outlined icon-sm">picture_in_picture_alt</span>
            Modo Flotante
          </button>

          <button
            className="btn btn--secondary btn--sm"
            onClick={handleSelectFile}
            disabled={loading}
          >
            <span className="material-symbols-outlined icon-sm">file_open</span>
            Abrir G-code
          </button>

          <button
            className="btn btn--secondary btn--sm"
            onClick={handleAddFolder}
            disabled={loading}
          >
            <span className="material-symbols-outlined icon-sm">create_new_folder</span>
            Añadir Carpeta
          </button>

          <button
            className={`btn ${watcherEnabled ? 'btn--primary' : 'btn--secondary'} btn--sm`}
            onClick={handleToggleWatcher}
          >
            <span className="dot dot--sm" style={{ background: watcherEnabled ? 'var(--on-primary-container)' : 'var(--outline)' }}></span>
            {watcherEnabled ? 'Vigilante: ACTIVO' : 'Vigilante: PAUSADO'}
          </button>
        </div>
      </div>

      {/* Slicers detectados en el sistema */}
      <div className="card">
        <div className="card__header">
          <div className="card__header-title">
            <span className="material-symbols-outlined icon-md color-primary">folder_eye</span>
            <span className="text-title-sm">Slicers y Carpetas del Sistema</span>
          </div>
          <span className="badge badge--secondary">
            <span className="dot dot--secondary dot--pulse"></span>
            Monitoreo en segundo plano
          </span>
        </div>

        <div className="profile-list">
          {slicers.length > 0 ? (
            slicers.map((s) => (
              <div key={s.id} className="profile-card">
                <div className="profile-card__info" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="material-symbols-outlined icon-sm color-primary">{s.icon}</span>
                      <span className="profile-card__name">{s.name}</span>
                    </div>
                    {s.detected ? (
                      <span className="badge badge--primary" style={{ fontSize: '11px' }}>
                        ✓ Instalado / Detectado
                      </span>
                    ) : (
                      <span className="badge badge--surface" style={{ fontSize: '11px' }}>
                        No encontrado
                      </span>
                    )}
                  </div>
                  <div className="profile-card__details" style={{ marginTop: '6px' }}>
                    <span className="font-mono text-body-xs color-outline">
                      {s.path}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="surface-box text-center" style={{ padding: '16px' }}>
              <span className="color-outline text-body-sm">
                OrcaSlicer, UltiMaker Cura, Bambu Studio, PrusaSlicer y Creality Print son detectados automáticamente en Windows.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Simulador de eventos para probar */}
      <div className="card">
        <div className="card__header">
          <div className="card__header-title">
            <span className="material-symbols-outlined icon-md color-secondary">play_circle</span>
            <span className="text-title-sm">Simulador de Eventos de Laminado</span>
          </div>
          <span className="text-body-sm color-outline">Prueba la reacción inmediata de la app</span>
        </div>

        <p className="text-body-sm" style={{ color: 'var(--on-surface-variant)', marginBottom: '12px' }}>
          Haz clic en cualquiera de las simulaciones para verificar cómo el cotizador recibe el archivo y calcula el precio en COP en tiempo real:
        </p>

        <div className="grid-3">
          <div className="surface-box" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span className="font-bold text-body-sm color-primary">OrcaSlicer / Bambu</span>
            <span className="text-body-sm color-outline">Pieza: Engranaje_Helicoidal.gcode</span>
            <span className="text-label-code">4h 20m • 95.5g PLA</span>
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => simulateSlicerEvent('OrcaSlicer', 'Engranaje_Helicoidal', 4.33, 95.5)}
            >
              Simular Laminado
            </button>
          </div>

          <div className="surface-box" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span className="font-bold text-body-sm color-secondary">UltiMaker Cura</span>
            <span className="text-body-sm color-outline">Pieza: Mascara_Samurai.gcode</span>
            <span className="text-label-code">8h 15m • 180.0g PETG</span>
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => simulateSlicerEvent('Cura', 'Mascara_Samurai', 8.25, 180)}
            >
              Simular Laminado
            </button>
          </div>

          <div className="surface-box" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span className="font-bold text-body-sm color-tertiary">PrusaSlicer</span>
            <span className="text-body-sm color-outline">Pieza: Caja_Electronica.3mf</span>
            <span className="text-label-code">1h 45m • 38.2g ABS</span>
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => simulateSlicerEvent('PrusaSlicer', 'Caja_Electronica', 1.75, 38.2)}
            >
              Simular Laminado
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
