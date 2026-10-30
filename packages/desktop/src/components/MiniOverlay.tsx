import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext.js';
import { calculateCost, formatCOP } from '@slice2price/core';

export const MiniOverlay: React.FC = () => {
  const {
    loadedQuote,
    selectedPrinter,
    selectedMaterial,
    selectedClient,
    selectedGeneral,
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

  // Parameters for calculation
  const hours = loadedQuote ? loadedQuote.printTimeHours : 3.5;
  const grams = loadedQuote ? loadedQuote.filamentGrams : 45;
  const pieceName = loadedQuote?.pieceName || 'Pieza 3D en Espera';
  const slicerSource = loadedQuote?.profiles?.printerName ? 'Slicer Detectado' : 'Modo Vigilante Activo';

  const breakdown = useMemo(() => {
    if (!selectedPrinter || !selectedMaterial || !selectedClient || !selectedGeneral) {
      return null;
    }

    try {
      return calculateCost(
        {
          pricePerKg: selectedMaterial.pricePerKg,
          powerConsumptionW: selectedPrinter.powerConsumptionW,
          depreciationPerHour: selectedPrinter.depreciationPerHour,
          pricePerKwh: selectedGeneral.pricePerKwh,
          errorMargin: selectedGeneral.errorMargin,
          failureRisk: selectedGeneral.failureRisk,
          profitMargin: selectedClient.profitMargin,
          discount: selectedClient.discount,
        },
        {
          printTimeHours: hours,
          filamentGrams: grams,
          extraCosts: loadedQuote?.extraCosts || 0,
          quantity: loadedQuote?.quantity || 1,
        }
      );
    } catch {
      return null;
    }
  }, [hours, grams, selectedPrinter, selectedMaterial, selectedClient, selectedGeneral, loadedQuote]);

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
    if (!breakdown) return;
    const text = `Slice2Price: ${pieceName} • ${hours}h • ${grams}g • Total: ${formatCOP(breakdown.totalAllUnits)}`;
    navigator.clipboard.writeText(text);
    showToast('¡Cotización copiada al portapapeles!');
  };

  const hoursInt = Math.floor(hours);
  const minutesInt = Math.round((hours - hoursInt) * 60);

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
            {breakdown ? formatCOP(breakdown.totalAllUnits) : 'Calculando...'}
          </div>
          <div className="mini-overlay-price-sub">
            Margen {selectedClient?.profitMargin || 40}% • 1 unidad
          </div>
        </div>

        {/* Métricas clave */}
        <div className="mini-overlay-metrics">
          <div className="mini-overlay-metric-pill">
            <span className="material-symbols-outlined icon-xs color-secondary">timer</span>
            <span>{hoursInt}h {minutesInt}m</span>
          </div>
          <div className="mini-overlay-metric-pill">
            <span className="material-symbols-outlined icon-xs color-tertiary">scale</span>
            <span>{grams}g</span>
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
            title="Copiar resumen al portapapeles"
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
