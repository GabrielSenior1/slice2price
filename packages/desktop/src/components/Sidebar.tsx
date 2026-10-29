import React from 'react';
import { useApp } from '../context/AppContext.js';
import type { ActiveTab } from '../types/index.js';

interface NavItemDef {
  id: ActiveTab;
  label: string;
  icon: string;
  badge?: string;
}

const NAV_ITEMS: NavItemDef[] = [
  { id: 'cotizador', label: 'Cotizador en Vivo', icon: 'calculate' },
  { id: 'perfiles', label: 'Perfiles y Tarifas', icon: 'tune' },
  { id: 'historial', label: 'Historial Cotizaciones', icon: 'history' },
  { id: 'vigilante', label: 'Vigilante & Slicers', icon: 'folder_managed', badge: 'Etapa 3' },
  { id: 'ajustes', label: 'Ajustes Taller', icon: 'settings' },
];

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    selectedPrinter,
    selectedMaterial,
    selectedClient,
    savedQuotes,
  } = useApp();

  return (
    <aside className="app-sidebar">
      <div>
        <div style={{ padding: '12px 12px 6px' }}>
          <span className="text-label-caption">Menú Principal</span>
        </div>
        <nav className="app-sidebar__nav">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <div
                key={item.id}
                className={`nav-item ${isActive ? 'nav-item--active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <span className="material-symbols-outlined icon-md">{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.id === 'historial' && savedQuotes.length > 0 && (
                  <span className="badge badge--surface" style={{ fontSize: '10px', padding: '1px 6px' }}>
                    {savedQuotes.length}
                  </span>
                )}
                {item.badge && item.id !== 'historial' && (
                  <span className="badge badge--tertiary" style={{ fontSize: '9px', padding: '1px 4px' }}>
                    {item.badge}
                  </span>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="app-sidebar__bottom">
        <div className="surface-box surface-box--sunken" style={{ padding: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span className="text-label-caption" style={{ color: 'var(--primary)' }}>Taller Activo</span>
            <span className="dot dot--success dot--sm"></span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined icon-xs color-outline">print</span>
              <span className="text-body-sm font-semibold truncate" title={selectedPrinter.name}>
                {selectedPrinter.name}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined icon-xs color-outline">inventory_2</span>
              <span className="text-body-sm truncate" style={{ color: 'var(--on-surface-variant)' }}>
                {selectedMaterial.name} ({selectedMaterial.pricePerKg.toLocaleString('es-CO')} $/kg)
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="material-symbols-outlined icon-xs color-outline">person</span>
              <span className="text-body-sm truncate" style={{ color: 'var(--secondary)' }}>
                {selectedClient.name} (+{selectedClient.profitMargin}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
