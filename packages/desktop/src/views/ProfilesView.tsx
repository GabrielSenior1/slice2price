import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { formatCOP } from '@slice2price/core';
import type { PrinterProfile, MaterialProfile, ClientProfile, GeneralProfile } from '@slice2price/core';

type ProfileSubTab = 'printers' | 'materials' | 'clients' | 'general';

export const ProfilesView: React.FC = () => {
  const {
    printers,
    materials,
    clients,
    generals,
    addPrinter,
    updatePrinter,
    deletePrinter,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    addClient,
    updateClient,
    deleteClient,
    updateGeneral,
    resetToDefaults,
    showToast,
  } = useApp();

  const [subTab, setSubTab] = useState<ProfileSubTab>('printers');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states for modals
  // Printer
  const [pName, setPName] = useState('');
  const [pModel, setPModel] = useState('');
  const [pPower, setPPower] = useState(250);
  const [pDep, setPDep] = useState(400);

  // Material
  const [mName, setMName] = useState('');
  const [mPrice, setMPrice] = useState(65000);
  const [mDensity, setMDensity] = useState(1.24);

  // Client
  const [cName, setCName] = useState('');
  const [cProfit, setCProfit] = useState(40);
  const [cDiscount, setCDiscount] = useState(0);
  const [cDesign, setCDesign] = useState(5000);

  // General
  const [gPriceKwh, setGPriceKwh] = useState(generals[0]?.pricePerKwh || 800);
  const [gError, setGError] = useState(generals[0]?.errorMargin || 5);
  const [gFailure, setGFailure] = useState(generals[0]?.failureRisk || 3);

  // Open modal for new item
  const openNewModal = () => {
    setEditingId(null);
    if (subTab === 'printers') {
      setPName('');
      setPModel('');
      setPPower(250);
      setPDep(400);
    } else if (subTab === 'materials') {
      setMName('');
      setMPrice(70000);
      setMDensity(1.24);
    } else if (subTab === 'clients') {
      setCName('');
      setCProfit(35);
      setCDiscount(0);
      setCDesign(0);
    }
    setIsModalOpen(true);
  };

  // Open modal for editing
  const openEditPrinter = (p: PrinterProfile) => {
    setEditingId(p.id);
    setPName(p.name);
    setPModel(p.model);
    setPPower(p.powerConsumptionW);
    setPDep(p.depreciationPerHour);
    setIsModalOpen(true);
  };

  const openEditMaterial = (m: MaterialProfile) => {
    setEditingId(m.id);
    setMName(m.name);
    setMPrice(m.pricePerKg);
    setMDensity(m.density);
    setIsModalOpen(true);
  };

  const openEditClient = (c: ClientProfile) => {
    setEditingId(c.id);
    setCName(c.name);
    setCProfit(c.profitMargin);
    setCDiscount(c.discount);
    setCDesign(c.defaultDesignCost);
    setIsModalOpen(true);
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (subTab === 'printers') {
      if (!pName.trim()) return;
      if (editingId) {
        updatePrinter(editingId, {
          name: pName,
          model: pModel || pName,
          powerConsumptionW: pPower,
          depreciationPerHour: pDep,
        });
        showToast('Impresora actualizada');
      } else {
        addPrinter({
          name: pName,
          model: pModel || pName,
          powerConsumptionW: pPower,
          depreciationPerHour: pDep,
        });
        showToast('Impresora agregada');
      }
    } else if (subTab === 'materials') {
      if (!mName.trim()) return;
      if (editingId) {
        updateMaterial(editingId, {
          name: mName,
          pricePerKg: mPrice,
          density: mDensity,
        });
        showToast('Material actualizado');
      } else {
        addMaterial({
          name: mName,
          pricePerKg: mPrice,
          density: mDensity,
        });
        showToast('Material agregado');
      }
    } else if (subTab === 'clients') {
      if (!cName.trim()) return;
      if (editingId) {
        updateClient(editingId, {
          name: cName,
          profitMargin: cProfit,
          discount: cDiscount,
          defaultDesignCost: cDesign,
        });
        showToast('Tarifa de cliente actualizada');
      } else {
        addClient({
          name: cName,
          profitMargin: cProfit,
          discount: cDiscount,
          defaultDesignCost: cDesign,
        });
        showToast('Tarifa agregada');
      }
    }
    setIsModalOpen(false);
  };

  const handleSaveGeneral = () => {
    if (generals[0]) {
      updateGeneral(generals[0].id, {
        pricePerKwh: gPriceKwh,
        errorMargin: gError,
        failureRisk: gFailure,
      });
      showToast('Configuración de energía y riesgos guardada');
    }
  };

  return (
    <div className="flex-col gap-md">
      {/* Encabezado y sub-tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 className="text-headline-md" style={{ color: 'var(--on-surface)' }}>
            Perfiles y Tarifas del Taller
          </h2>
          <p className="text-body-sm color-outline">
            Personaliza el consumo de tus impresoras, precio de filamentos y tarifas por cliente
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn--secondary btn--sm" onClick={resetToDefaults}>
            <span className="material-symbols-outlined icon-xs">restart_alt</span>
            Restaurar Valores por Defecto
          </button>
          {subTab !== 'general' && (
            <button className="btn btn--primary btn--sm" onClick={openNewModal}>
              <span className="material-symbols-outlined icon-xs">add</span>
              Agregar {subTab === 'printers' ? 'Impresora' : subTab === 'materials' ? 'Material' : 'Tarifa'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs de categorías */}
      <div className="tabs">
        <button
          className={`tab ${subTab === 'printers' ? 'tab--active' : ''}`}
          onClick={() => setSubTab('printers')}
        >
          <span className="material-symbols-outlined icon-xs" style={{ marginRight: '6px' }}>print</span>
          Impresoras ({printers.length})
        </button>
        <button
          className={`tab ${subTab === 'materials' ? 'tab--active' : ''}`}
          onClick={() => setSubTab('materials')}
        >
          <span className="material-symbols-outlined icon-xs" style={{ marginRight: '6px' }}>inventory_2</span>
          Materiales ({materials.length})
        </button>
        <button
          className={`tab ${subTab === 'clients' ? 'tab--active' : ''}`}
          onClick={() => setSubTab('clients')}
        >
          <span className="material-symbols-outlined icon-xs" style={{ marginRight: '6px' }}>groups</span>
          Tarifas / Clientes ({clients.length})
        </button>
        <button
          className={`tab ${subTab === 'general' ? 'tab--active' : ''}`}
          onClick={() => setSubTab('general')}
        >
          <span className="material-symbols-outlined icon-xs" style={{ marginRight: '6px' }}>bolt</span>
          Energía y Riesgo
        </button>
      </div>

      {/* ── SUBTAB 1: IMPRESORAS ────────────────────────────────────────────── */}
      {subTab === 'printers' && (
        <div className="profile-list">
          {printers.map((p) => (
            <div key={p.id} className="profile-card">
              <div className="profile-card__info">
                <span className="profile-card__name">{p.name}</span>
                <div className="profile-card__details">
                  <span>Consumo: <strong>{p.powerConsumptionW} Watts</strong></span>
                  <span>•</span>
                  <span>Desgaste: <strong>{formatCOP(p.depreciationPerHour)} COP/hora</strong></span>
                  {p.model && (
                    <>
                      <span>•</span>
                      <span>Modelo: {p.model}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="profile-card__actions">
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => openEditPrinter(p)}
                  title="Editar impresora"
                >
                  <span className="material-symbols-outlined icon-xs">edit</span>
                </button>
                {printers.length > 1 && (
                  <button
                    className="btn btn--danger btn--sm"
                    onClick={() => deletePrinter(p.id)}
                    title="Eliminar impresora"
                  >
                    <span className="material-symbols-outlined icon-xs">delete</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── SUBTAB 2: MATERIALES ───────────────────────────────────────────── */}
      {subTab === 'materials' && (
        <div className="profile-list">
          {materials.map((m) => (
            <div key={m.id} className="profile-card">
              <div className="profile-card__info">
                <span className="profile-card__name">{m.name}</span>
                <div className="profile-card__details">
                  <span>Precio: <strong>{formatCOP(m.pricePerKg)} COP/kg</strong></span>
                  <span>•</span>
                  <span>Densidad: <strong>{m.density} g/cm³</strong></span>
                  <span>•</span>
                  <span>Costo por gramo: <strong>${Math.round(m.pricePerKg / 1000)} COP/g</strong></span>
                </div>
              </div>
              <div className="profile-card__actions">
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => openEditMaterial(m)}
                  title="Editar material"
                >
                  <span className="material-symbols-outlined icon-xs">edit</span>
                </button>
                {materials.length > 1 && (
                  <button
                    className="btn btn--danger btn--sm"
                    onClick={() => deleteMaterial(m.id)}
                    title="Eliminar material"
                  >
                    <span className="material-symbols-outlined icon-xs">delete</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── SUBTAB 3: CLIENTES Y TARIFAS ───────────────────────────────────── */}
      {subTab === 'clients' && (
        <div className="profile-list">
          {clients.map((c) => (
            <div key={c.id} className="profile-card">
              <div className="profile-card__info">
                <span className="profile-card__name">{c.name}</span>
                <div className="profile-card__details">
                  <span>Ganancia: <strong>+{c.profitMargin}%</strong></span>
                  <span>•</span>
                  <span>Descuento: <strong>{c.discount}%</strong></span>
                  <span>•</span>
                  <span>Costo diseño sugerido: <strong>{formatCOP(c.defaultDesignCost)} COP</strong></span>
                </div>
              </div>
              <div className="profile-card__actions">
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => openEditClient(c)}
                  title="Editar tarifa"
                >
                  <span className="material-symbols-outlined icon-xs">edit</span>
                </button>
                {clients.length > 1 && (
                  <button
                    className="btn btn--danger btn--sm"
                    onClick={() => deleteClient(c.id)}
                    title="Eliminar tarifa"
                  >
                    <span className="material-symbols-outlined icon-xs">delete</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── SUBTAB 4: CONFIGURACIÓN GENERAL / ENERGÍA ──────────────────────── */}
      {subTab === 'general' && (
        <div className="card" style={{ maxWidth: '640px' }}>
          <div className="card__header">
            <span className="text-title-sm">Parámetros Globales de Taller</span>
            <span className="badge badge--primary">COP / Colombia</span>
          </div>

          <div className="flex-col gap-md">
            <div className="input-group">
              <label className="input-group__label text-label-caption">Precio del kWh (COP)</label>
              <div className="input-wrap">
                <span className="input-wrap__prefix">$</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={gPriceKwh}
                  onChange={(e) => setGPriceKwh(parseInt(e.target.value) || 0)}
                />
                <span className="input-wrap__suffix">COP/kWh</span>
              </div>
              <span className="text-body-sm color-outline" style={{ fontSize: '11px' }}>
                Promedio Colombia: Bogotá ~800, Medellín ~780, Cali ~850 COP/kWh
              </span>
            </div>

            <div className="input-group">
              <label className="input-group__label text-label-caption">Margen de Error Predeterminado (%)</label>
              <div className="input-wrap">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={gError}
                  onChange={(e) => setGError(parseInt(e.target.value) || 0)}
                />
                <span className="input-wrap__suffix">%</span>
              </div>
              <span className="text-body-sm color-outline" style={{ fontSize: '11px' }}>
                Cubre calibración, pérdidas de filamento en purgas y soportes inesperados
              </span>
            </div>

            <div className="input-group">
              <label className="input-group__label text-label-caption">Riesgo de Fallo Predeterminado (%)</label>
              <div className="input-wrap">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={gFailure}
                  onChange={(e) => setGFailure(parseInt(e.target.value) || 0)}
                />
                <span className="input-wrap__suffix">%</span>
              </div>
              <span className="text-body-sm color-outline" style={{ fontSize: '11px' }}>
                Amortiza impresiones que se despegan o fallan por corte de luz
              </span>
            </div>

            <button type="button" className="btn btn--primary" onClick={handleSaveGeneral}>
              <span className="material-symbols-outlined icon-xs">save</span>
              Guardar Configuración General
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL DE CREACIÓN / EDICIÓN ────────────────────────────────────── */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal__title">
              {editingId ? 'Editar' : 'Agregar'}{' '}
              {subTab === 'printers' ? 'Impresora 3D' : subTab === 'materials' ? 'Material' : 'Tarifa de Cliente'}
            </h3>

            <form onSubmit={handleSaveModal} className="flex-col gap-md">
              {subTab === 'printers' && (
                <>
                  <div className="input-group">
                    <label className="input-group__label text-label-caption">Nombre</label>
                    <input
                      type="text"
                      className="input-field"
                      value={pName}
                      onChange={(e) => setPName(e.target.value)}
                      placeholder="Ej. Creality K1 Max"
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-group__label text-label-caption">Modelo</label>
                    <input
                      type="text"
                      className="input-field"
                      value={pModel}
                      onChange={(e) => setPModel(e.target.value)}
                      placeholder="Ej. K1 Max"
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-group__label text-label-caption">Consumo Promedio (Watts)</label>
                    <div className="input-wrap">
                      <input
                        type="number"
                        min="1"
                        value={pPower}
                        onChange={(e) => setPPower(parseInt(e.target.value) || 0)}
                        required
                      />
                      <span className="input-wrap__suffix">W</span>
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="input-group__label text-label-caption">Desgaste / Depreciación por Hora (COP)</label>
                    <div className="input-wrap">
                      <span className="input-wrap__prefix">$</span>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        value={pDep}
                        onChange={(e) => setPDep(parseInt(e.target.value) || 0)}
                        required
                      />
                      <span className="input-wrap__suffix">COP/h</span>
                    </div>
                  </div>
                </>
              )}

              {subTab === 'materials' && (
                <>
                  <div className="input-group">
                    <label className="input-group__label text-label-caption">Nombre del Material</label>
                    <input
                      type="text"
                      className="input-field"
                      value={mName}
                      onChange={(e) => setMName(e.target.value)}
                      placeholder="Ej. PLA Silk Dorado"
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-group__label text-label-caption">Precio por Kg (COP)</label>
                    <div className="input-wrap">
                      <span className="input-wrap__prefix">$</span>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={mPrice}
                        onChange={(e) => setMPrice(parseInt(e.target.value) || 0)}
                        required
                      />
                      <span className="input-wrap__suffix">COP/kg</span>
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="input-group__label text-label-caption">Densidad (g/cm³)</label>
                    <div className="input-wrap">
                      <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        value={mDensity}
                        onChange={(e) => setMDensity(parseFloat(e.target.value) || 1.24)}
                        required
                      />
                      <span className="input-wrap__suffix">g/cm³</span>
                    </div>
                  </div>
                </>
              )}

              {subTab === 'clients' && (
                <>
                  <div className="input-group">
                    <label className="input-group__label text-label-caption">Nombre de la Tarifa</label>
                    <input
                      type="text"
                      className="input-field"
                      value={cName}
                      onChange={(e) => setCName(e.target.value)}
                      placeholder="Ej. Revendedor Local"
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-group__label text-label-caption">Margen de Ganancia (%)</label>
                    <div className="input-wrap">
                      <input
                        type="number"
                        min="0"
                        max="300"
                        value={cProfit}
                        onChange={(e) => setCProfit(parseInt(e.target.value) || 0)}
                        required
                      />
                      <span className="input-wrap__suffix">%</span>
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="input-group__label text-label-caption">Descuento (%)</label>
                    <div className="input-wrap">
                      <input
                        type="number"
                        min="0"
                        max="90"
                        value={cDiscount}
                        onChange={(e) => setCDiscount(parseInt(e.target.value) || 0)}
                      />
                      <span className="input-wrap__suffix">%</span>
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="input-group__label text-label-caption">Costo Diseño Sugerido (COP)</label>
                    <div className="input-wrap">
                      <span className="input-wrap__prefix">$</span>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={cDesign}
                        onChange={(e) => setCDesign(parseInt(e.target.value) || 0)}
                      />
                      <span className="input-wrap__suffix">COP</span>
                    </div>
                  </div>
                </>
              )}

              <div className="modal__actions">
                <button type="button" className="btn btn--secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn--primary">
                  {editingId ? 'Guardar Cambios' : 'Crear Perfil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
