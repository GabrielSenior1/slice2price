import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import { formatCOP } from '@slice2price/core';

export const MiniOverlay: React.FC = () => {
  const {
    activeBreakdown,
    activePieceName,
    loadedQuote,
    selectedPrinter,
    selectedMaterial,
    toggleCompactMode,
    setActiveTab,
    showToast,
  } = useApp();

  const [lastEventPulse, setLastEventPulse] = useState(false);

  // Trigger brief visual pulse when a new quote or file is loaded
  useEffect(() => {
    if (loadedQuote) {
      setLastEventPulse(true);
      const timer = setTimeout(() => setLastEventPulse(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [loadedQuote?.id, loadedQuote?.timestamp]);

  const hasPiece = !!(activeBreakdown && (activeBreakdown.subtotal > 0 || loadedQuote));
  const pieceName = hasPiece ? (activePieceName || loadedQuote?.pieceName || 'Pieza 3D') : 'Sin pieza cargada';
  const slicerSource = loadedQuote ? 'Slicer Detectado' : (hasPiece ? 'Cotizador Activo' : 'Vigilante en Espera');

  const hours = loadedQuote ? loadedQuote.printTimeHours : 0;
  const grams = loadedQuote ? loadedQuote.filamentGrams : (activeBreakdown ? Math.round((activeBreakdown.filamentCost / (selectedMaterial?.pricePerKg || 65000)) * 1000) : 0);

  const hoursInt = Math.floor(hours);
  const minutesInt = Math.round((hours - hoursInt) * 60);

  const handleExpand = () => {
    toggleCompactMode(false);
    setActiveTab('cotizador');
  };

  const handleMinimize = () => {
    if (window.electronAPI?.minimize) {
      window.electronAPI.minimize();
    }
  };

  const handleClose = () => {
    if (window.electronAPI?.close) {
      window.electronAPI.close();
    }
  };

  const handleCopy = () => {
    if (!activeBreakdown || !hasPiece) {
      showToast('No hay una cotización activa para copiar', 'warning');
      return;
    }
    const text = `Slice2Price: ${pieceName} • ${activeBreakdown.quantity} ud(s) • Total: ${formatCOP(activeBreakdown.totalAllUnits)}`;
    navigator.clipboard.writeText(text);
    showToast('¡Cotización copiada al portapapeles!');
  };

  return (
    <div className={`mini-overlay-container ${lastEventPulse ? 'mini-overlay-container--pulse' : ''}`}>
      {/* ── Barra superior Draggable ────────────────────────────────────────── */}
      <div className="mini-overlay-header">
        <div className="mini-overlay-header__title">
          <img src="./logo.png" alt="Slice2Price Logo" className="mini-overlay-logo" />
          <span className="mini-overlay-brand">Slice2Price</span>
          <span className="badge badge--primary mini-overlay-badge">Flotante</span>
        </div>

        <div className="mini-overlay-header__actions">
          <button
            className="btn-icon mini-overlay-btn"
            onClick={handleExpand}
            title="Expandir a ventana completa (F10)"
          >
            <span className="material-symbols-outlined icon-sm">open_in_full</span>
          </button>
          <button
            className="btn-icon mini-overlay-btn"
            onClick={handleMinimize}
            title="Minimizar"
          >
            <span className="material-symbols-outlined icon-sm">remove</span>
          </button>
          <button
            className="btn-icon mini-overlay-btn mini-overlay-btn--close"
            onClick={handleClose}
            title="Cerrar"
          >
            <span className="material-symbols-outlined icon-sm">close</span>
          </button>
        </div>
      </div>

      {/* ── Cuerpo del Widget ──────────────────────────────────────────────── */}
      <div className="mini-overlay-body">
        {/* Nombre de la pieza y origen */}
        <div className="mini-overlay-piece">
          <span className="material-symbols-outlined icon-sm color-primary">deployed_code</span>
          <span className="mini-overlay-piece-name" title={pieceName}>
            {pieceName}
          </span>
          <span className="badge badge--surface mini-overlay-slicer-tag">{slicerSource}</span>
        </div>

        {/* Precio Destacado */}
        <div className="mini-overlay-price-box">
          <div className="mini-overlay-price-label">PRECIO ESTIMADO</div>
          <div className="mini-overlay-price-value">
            {hasPiece && activeBreakdown ? formatCOP(activeBreakdown.totalAllUnits) : '—'}
          </div>
          <div className="mini-overlay-price-sub">
            {hasPiece && activeBreakdown ? (
              <>
                Margen {activeBreakdown.profitMarginPercent}% • {activeBreakdown.quantity} {activeBreakdown.quantity === 1 ? 'unidad' : 'unidades'}
                {activeBreakdown.discountPercent > 0 && ` (-${activeBreakdown.discountPercent}%)`}
              </>
            ) : (
              'Esperando archivo de laminación'
            )}
          </div>
        </div>

        {/* Métricas clave */}
        <div className="mini-overlay-metrics">
          <div className="mini-overlay-metric-pill">
            <span className="material-symbols-outlined icon-xs color-secondary">timer</span>
            <span>{hoursInt > 0 || minutesInt > 0 ? `${hoursInt}h ${minutesInt}m` : '0h 0m'}</span>
          </div>
          <div className="mini-overlay-metric-pill">
            <span className="material-symbols-outlined icon-xs color-tertiary">scale</span>
            <span>{grams > 0 ? `${grams}g` : '0g'}</span>
          </div>
          <div className="mini-overlay-metric-pill mini-overlay-metric-pill--hardware" title={`${selectedPrinter?.name || 'Impresora'} - ${selectedMaterial?.name || 'Material'}`}>
            <span className="material-symbols-outlined icon-xs color-outline">precision_manufacturing</span>
            <span className="truncate">{selectedPrinter?.name?.split(' ')[0] || '3D'} • {selectedMaterial?.name?.split(' ')[0] || 'PLA'}</span>
          </div>
        </div>

        {/* Botones de acción rápida */}
        <div className="mini-overlay-footer">
          <button
            className="btn btn--secondary btn--sm mini-overlay-action-btn"
            onClick={handleCopy}
            disabled={!hasPiece}
            title={hasPiece ? "Copiar resumen al portapapeles" : "No hay cotización para copiar"}
          >
            <span className="material-symbols-outlined icon-xs">content_copy</span>
            Copiar
          </button>
          <button
            className="btn btn--primary btn--sm mini-overlay-action-btn"
            onClick={handleExpand}
            title="Abrir cotizador detallado"
          >
            <span className="material-symbols-outlined icon-xs">visibility</span>
            Ver Detalle
          </button>
        </div>
      </div>
    </div>
  );
};
