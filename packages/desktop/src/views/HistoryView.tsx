import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { formatCOP } from '@slice2price/core';
import type { SavedQuote } from '../types/index.js';

export const HistoryView: React.FC = () => {
  const { savedQuotes, deleteQuote, clearHistory, setLoadedQuote, setActiveTab, showToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredQuotes = savedQuotes.filter((q) => {
    const term = searchTerm.toLowerCase();
    return (
      q.pieceName.toLowerCase().includes(term) ||
      q.profiles.clientName.toLowerCase().includes(term) ||
      q.profiles.materialName.toLowerCase().includes(term) ||
      q.profiles.printerName.toLowerCase().includes(term)
    );
  });

  const handleLoad = (quote: SavedQuote) => {
    setLoadedQuote(quote);
    setActiveTab('cotizador');
  };

  const handleCopy = (quote: SavedQuote) => {
    const h = Math.floor(quote.printTimeHours);
    const m = Math.round((quote.printTimeHours - h) * 60);

    const text = `COTIZACIÓN IMPRESIÓN 3D — SLICE2PRICE
Pieza: ${quote.pieceName}
Fecha: ${new Date(quote.timestamp).toLocaleDateString('es-CO')}
Cantidad: ${quote.quantity} unidad(es)
---------------------------------------------
• Tiempo: ${h}h ${m}m
• Material: ${quote.profiles.materialName} (~${quote.filamentGrams}g)
• Impresora: ${quote.profiles.printerName}
• Tarifa cliente: ${quote.profiles.clientName}
---------------------------------------------
Subtotal Producción: ${formatCOP(quote.breakdown.subtotal)}
Margen Ganancia: ${quote.breakdown.profitMarginPercent}%
PRECIO TOTAL: ${formatCOP(quote.breakdown.totalAllUnits)} COP
${quote.quantity > 1 ? `(Precio unitario: ${formatCOP(quote.breakdown.totalPerUnit)} COP)` : ''}
---------------------------------------------
Slice2Price • Moneda: COP`;

    navigator.clipboard.writeText(text).then(() => {
      showToast('Cotización copiada al portapapeles', 'success');
    });
  };

  const handleShareWhatsApp = (quote: SavedQuote) => {
    const h = Math.floor(quote.printTimeHours);
    const m = Math.round((quote.printTimeHours - h) * 60);

    const text = `*COTIZACIÓN IMPRESIÓN 3D — SLICE2PRICE*
📦 *Pieza:* ${quote.pieceName}
🔢 *Cantidad:* ${quote.quantity} unidad(es)
⏱️ *Tiempo estimado:* ${h}h ${m}m
🧵 *Material:* ${quote.profiles.materialName} (~${quote.filamentGrams}g)
━━━━━━━━━━━━━━━━━━━━
💰 *PRECIO TOTAL:* ${formatCOP(quote.breakdown.totalAllUnits)} COP
${quote.quantity > 1 ? `🏷️ *Precio unitario:* ${formatCOP(quote.breakdown.totalPerUnit)} COP\n` : ''}━━━━━━━━━━━━━━━━━━━━
_Cotización generada con Slice2Price_`;

    const encoded = encodeURIComponent(text);
    const waUrl = `https://wa.me/?text=${encoded}`;
    if (window.electronAPI?.openExternalUrl) {
      window.electronAPI.openExternalUrl(waUrl);
    } else {
      window.open(waUrl, '_blank');
    }
    showToast('Abriendo WhatsApp...', 'success');
  };

  return (
    <div className="flex-col gap-md">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 className="text-headline-md" style={{ color: 'var(--on-surface)' }}>
            Historial de Cotizaciones
          </h2>
          <p className="text-body-sm color-outline">
            Registro de cotizaciones calculadas y guardadas ({savedQuotes.length})
          </p>
        </div>

        {savedQuotes.length > 0 && (
          <button
            className="btn btn--danger btn--sm"
            onClick={() => {
              if (window.confirm('¿Deseas vaciar todo el historial de cotizaciones?')) {
                clearHistory();
              }
            }}
          >
            <span className="material-symbols-outlined icon-xs">delete_sweep</span>
            Vaciar Historial
          </button>
        )}
      </div>

      {/* Buscador */}
      {savedQuotes.length > 0 && (
        <div className="input-wrap" style={{ maxWidth: '400px' }}>
          <span className="material-symbols-outlined icon-xs color-outline">search</span>
          <input
            type="text"
            placeholder="Buscar por pieza, cliente o material..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="btn btn--ghost btn--sm"
              style={{ padding: '0 4px' }}
              onClick={() => setSearchTerm('')}
            >
              <span className="material-symbols-outlined icon-xs">close</span>
            </button>
          )}
        </div>
      )}

      {/* Lista de cotizaciones */}
      {filteredQuotes.length === 0 ? (
        <div
          className="surface-box"
          style={{
            textAlign: 'center',
            padding: '48px 16px',
            color: 'var(--outline)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--surface-variant)' }}>
            folder_off
          </span>
          <h3 className="text-title-sm" style={{ marginTop: '8px', color: 'var(--on-surface)' }}>
            {savedQuotes.length === 0 ? 'No hay cotizaciones guardadas aún' : 'No se hallaron coincidencias'}
          </h3>
          <p className="text-body-sm color-outline" style={{ marginTop: '4px' }}>
            {savedQuotes.length === 0
              ? 'Calcula un precio en el Cotizador y haz clic en "Guardar en Historial"'
              : 'Intenta con otro término de búsqueda'}
          </p>
          {savedQuotes.length === 0 && (
            <button
              className="btn btn--primary btn--sm"
              style={{ marginTop: '16px' }}
              onClick={() => setActiveTab('cotizador')}
            >
              <span className="material-symbols-outlined icon-xs">calculate</span>
              Ir al Cotizador en Vivo
            </button>
          )}
        </div>
      ) : (
        <div className="profile-list">
          {filteredQuotes.map((q) => {
            const h = Math.floor(q.printTimeHours);
            const m = Math.round((q.printTimeHours - h) * 60);
            const dateStr = new Date(q.timestamp).toLocaleString('es-CO', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div key={q.id} className="profile-card">
                <div className="profile-card__info" style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="profile-card__name">{q.pieceName}</span>
                    <span className="badge badge--surface" style={{ fontSize: '10px' }}>
                      {q.quantity} {q.quantity === 1 ? 'unidad' : 'unidades'}
                    </span>
                    <span className="text-body-sm color-outline" style={{ fontSize: '11px' }}>
                      {dateStr}
                    </span>
                  </div>

                  <div className="profile-card__details" style={{ marginTop: '4px', flexWrap: 'wrap' }}>
                    <span>Impresora: <strong>{q.profiles.printerName}</strong></span>
                    <span>•</span>
                    <span>Material: <strong>{q.profiles.materialName} ({q.filamentGrams}g)</strong></span>
                    <span>•</span>
                    <span>Tiempo: <strong>{h}h {m}m</strong></span>
                    <span>•</span>
                    <span>Cliente: <strong>{q.profiles.clientName}</strong></span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: '12px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div className="font-mono font-bold color-primary" style={{ fontSize: '16px' }}>
                      {formatCOP(q.breakdown.totalAllUnits)} COP
                    </div>
                    <div className="text-body-sm color-secondary" style={{ fontSize: '11px' }}>
                      Ganancia: +{formatCOP(q.breakdown.profitAmount * q.quantity)}
                    </div>
                  </div>

                  <div className="profile-card__actions">
                    <button
                      className="btn btn--secondary btn--sm"
                      onClick={() => handleLoad(q)}
                      title="Cargar y editar en el cotizador"
                    >
                      <span className="material-symbols-outlined icon-xs">open_in_new</span>
                      Cargar
                    </button>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => handleCopy(q)}
                      title="Copiar texto de cotización"
                    >
                      <span className="material-symbols-outlined icon-xs">content_copy</span>
                    </button>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => handleShareWhatsApp(q)}
                      title="Compartir por WhatsApp"
                    >
                      <span className="material-symbols-outlined icon-xs" style={{ color: '#25D366' }}>chat</span>
                    </button>
                    <button
                      className="btn btn--danger btn--sm"
                      onClick={() => deleteQuote(q.id)}
                      title="Eliminar de historial"
                    >
                      <span className="material-symbols-outlined icon-xs">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
