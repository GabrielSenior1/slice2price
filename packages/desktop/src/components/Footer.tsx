import React from 'react';
import { useApp } from '../context/AppContext.js';

export const Footer: React.FC = () => {
  const { selectedPrinter, selectedGeneral } = useApp();

  return (
    <footer className="app-footer">
      <div className="app-footer__left">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="dot dot--success dot--sm"></span>
          <span>Motor de cálculo listo</span>
        </div>
        <span>•</span>
        <span>Impresora: <strong>{selectedPrinter.name}</strong> ({selectedPrinter.powerConsumptionW}W)</span>
        <span>•</span>
        <span>Energía: <strong>${selectedGeneral.pricePerKwh} COP/kWh</strong></span>
      </div>

      <div className="app-footer__right">
        <span>Moneda: <strong>COP</strong></span>
        <span>•</span>
        <span>Slice2Price Desktop © 2026</span>
      </div>
    </footer>
  );
};
