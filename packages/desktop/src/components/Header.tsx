import React from 'react';
import { useApp } from '../context/AppContext.js';

export const Header: React.FC = () => {
  const { setActiveTab, toggleCompactMode } = useApp();

  const handleMinimize = () => {
    (window as any).electronAPI?.minimize();
  };

  const handleMaximize = () => {
    (window as any).electronAPI?.maximize();
  };

  const handleClose = () => {
    (window as any).electronAPI?.close();
  };

  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI?.isElectron;

  return (
    <header className="app-header" onDoubleClick={handleMaximize}>
      <div className="app-header__left">
        <img src="./logo.png" alt="Slice2Price Logo" className="app-header__logo" />
        <span className="app-header__title">Slice2Price</span>
        <span className="app-header__version">v0.1.0 • Etapa 4</span>
        <div className="app-header__divider"></div>
        <div
          className="badge badge--secondary"
          style={{ cursor: 'pointer' }}
          onClick={() => setActiveTab('vigilante')}
          title="Ver estado de vigilancia de slicers"
        >
          <span className="dot dot--secondary dot--pulse"></span>
          <span>Vigilante Activo</span>
        </div>
      </div>

      <div className="app-header__right">
        {isElectron && (
          <button
            onClick={() => toggleCompactMode(true)}
            className="btn btn--secondary btn--sm"
            style={{ padding: '4px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}
            title="Activar Modo Mini Overlay Flotante (Siempre visible mientras laminas, F10)"
          >
            <span className="material-symbols-outlined icon-xs">picture_in_picture_alt</span>
            <span style={{ fontSize: '11px', fontWeight: 600 }}>Modo Flotante</span>
          </button>
        )}

        <div className="badge badge--surface">
          <span className="color-primary font-bold">$ COP</span>
          <span>Peso colombiano</span>
        </div>

        {isElectron && (
          <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
            <button
              onClick={() => (window as any).electronAPI?.toggleDevTools?.()}
              className="btn btn--ghost"
              style={{ padding: '4px 8px', borderRadius: '4px' }}
              title="Herramientas de depuración (F12)"
            >
              <span className="material-symbols-outlined icon-xs">bug_report</span>
            </button>
            <button
              onClick={handleMinimize}
              className="btn btn--ghost"
              style={{ padding: '4px 8px', borderRadius: '4px' }}
              title="Minimizar"
            >
              <span className="material-symbols-outlined icon-xs">remove</span>
            </button>
            <button
              onClick={handleMaximize}
              className="btn btn--ghost"
              style={{ padding: '4px 8px', borderRadius: '4px' }}
              title="Maximizar"
            >
              <span className="material-symbols-outlined icon-xs">crop_square</span>
            </button>
            <button
              onClick={handleClose}
              className="btn btn--ghost"
              style={{ padding: '4px 8px', borderRadius: '4px', color: 'var(--error)' }}
              title="Cerrar"
            >
              <span className="material-symbols-outlined icon-xs">close</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
