import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  calculateCost,
  formatCOP,
  formatPercent,
  parseSlicerFile,
  type CalcParams,
  type PieceInput,
  type CostBreakdown,
} from '@slice2price/core';
import { useApp } from '../context/AppContext.js';

export const LiveQuoter: React.FC = () => {
  const {
    printers,
    materials,
    clients,
    generals,
    selectedPrinter,
    selectedMaterial,
    selectedClient,
    selectedGeneral,
    setSelectedPrinterId,
    setSelectedMaterialId,
    setSelectedClientId,
    setSelectedGeneralId,
    saveQuote,
    showToast,
    loadedQuote,
    setLoadedQuote,
  } = useApp();

  // Inputs de la pieza
  const [pieceName, setPieceName] = useState('Pieza 3D');
  const [timeHours, setTimeHours] = useState<number>(3);
  const [timeMinutes, setTimeMinutes] = useState<number>(45);
  const [filamentGrams, setFilamentGrams] = useState<number>(85);
  const [extraCosts, setExtraCosts] = useState<number>(5000);
  const [quantity, setQuantity] = useState<number>(1);

  // Sliders de anulación rápida (override del perfil)
  const [profitMargin, setProfitMargin] = useState<number>(selectedClient.profitMargin);
  const [discount, setDiscount] = useState<number>(selectedClient.discount);
  const [errorMargin, setErrorMargin] = useState<number>(selectedGeneral.errorMargin);
  const [failureRisk, setFailureRisk] = useState<number>(selectedGeneral.failureRisk);

  // Slicer detectado (si se arrastra un archivo)
  const [detectedSlicer, setDetectedSlicer] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Actualizar sliders cuando cambia el cliente o general seleccionado
  useEffect(() => {
    setProfitMargin(selectedClient.profitMargin);
    setDiscount(selectedClient.discount);
  }, [selectedClient.id, selectedClient.profitMargin, selectedClient.discount]);

  useEffect(() => {
    setErrorMargin(selectedGeneral.errorMargin);
    setFailureRisk(selectedGeneral.failureRisk);
  }, [selectedGeneral.id, selectedGeneral.errorMargin, selectedGeneral.failureRisk]);

  // Si se seleccionó una cotización desde el historial, cargarla
  useEffect(() => {
    if (loadedQuote) {
      setPieceName(loadedQuote.pieceName);
      const totalH = loadedQuote.printTimeHours;
      const h = Math.floor(totalH);
      const m = Math.round((totalH - h) * 60);
      setTimeHours(h);
      setTimeMinutes(m);
      setFilamentGrams(loadedQuote.filamentGrams);
      setExtraCosts(loadedQuote.extraCosts);
      setQuantity(loadedQuote.quantity);
      if (loadedQuote.profiles.printerId) setSelectedPrinterId(loadedQuote.profiles.printerId);
      if (loadedQuote.profiles.materialId) setSelectedMaterialId(loadedQuote.profiles.materialId);
      if (loadedQuote.profiles.clientId) setSelectedClientId(loadedQuote.profiles.clientId);
      if (loadedQuote.profiles.generalId) setSelectedGeneralId(loadedQuote.profiles.generalId);
      if (loadedQuote.customProfitMargin !== undefined) setProfitMargin(loadedQuote.customProfitMargin);
      if (loadedQuote.customDiscount !== undefined) setDiscount(loadedQuote.customDiscount);

      showToast(`Cotización "${loadedQuote.pieceName}" cargada`);
      setLoadedQuote(null);
    }
  }, [loadedQuote]);

  // Cálculo en tiempo real
  const totalPrintHours = useMemo(() => {
    return Math.max(0, timeHours + (timeMinutes || 0) / 60);
  }, [timeHours, timeMinutes]);

  const calcParams: CalcParams = useMemo(() => {
    return {
      pricePerKg: selectedMaterial.pricePerKg,
      powerConsumptionW: selectedPrinter.powerConsumptionW,
      depreciationPerHour: selectedPrinter.depreciationPerHour,
      pricePerKwh: selectedGeneral.pricePerKwh,
      errorMargin: errorMargin,
      failureRisk: failureRisk,
      profitMargin: profitMargin,
      discount: discount,
    };
  }, [
    selectedMaterial.pricePerKg,
    selectedPrinter.powerConsumptionW,
    selectedPrinter.depreciationPerHour,
    selectedGeneral.pricePerKwh,
    errorMargin,
    failureRisk,
    profitMargin,
    discount,
  ]);

  const pieceInput: PieceInput = useMemo(() => {
    return {
      printTimeHours: totalPrintHours,
      filamentGrams: Math.max(0, filamentGrams || 0),
      extraCosts: Math.max(0, extraCosts || 0),
      quantity: Math.max(1, quantity || 1),
    };
  }, [totalPrintHours, filamentGrams, extraCosts, quantity]);

  const breakdown: CostBreakdown = useMemo(() => {
    try {
      return calculateCost(calcParams, pieceInput);
    } catch {
      return {
        filamentCost: 0,
        energyCost: 0,
        depreciationCost: 0,
        extraCosts: 0,
        subtotal: 0,
        errorMarginPercent: 0,
        errorMarginAmount: 0,
        failureRiskPercent: 0,
        failureRiskAmount: 0,
        subtotalWithRisk: 0,
        profitMarginPercent: 0,
        profitAmount: 0,
        priceBeforeDiscount: 0,
        discountPercent: 0,
        discountAmount: 0,
        totalPerUnit: 0,
        quantity: 1,
        totalAllUnits: 0,
      };
    }
  }, [calcParams, pieceInput]);

  // Parser interactivo para G-code y texto de slicers (Fase 3)
  const processSlicerContent = (content: string, filename: string) => {
    const result = parseSlicerFile(content, filename);
    if (result && (result.printTimeHours > 0 || result.filamentGrams > 0)) {
      const h = Math.floor(result.printTimeHours);
      const m = Math.round((result.printTimeHours - h) * 60);
      setTimeHours(h);
      setTimeMinutes(m);
      if (result.filamentGrams > 0) setFilamentGrams(result.filamentGrams);
      setDetectedSlicer(`${result.slicerName} (${filename})`);
      setPieceName(filename.replace(/\.[^/.]+$/, ''));
      showToast(`¡Parámetros leídos de ${result.slicerName}!`);
    } else {
      showToast('Archivo leído, pero no se hallaron etiquetas estándar de tiempo/peso.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) processSlicerContent(text, file.name);
    };
    // Leer los primeros 1MB que es donde están los encabezados y resúmenes
    reader.readAsText(file.slice(0, 1024 * 1024));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) processSlicerContent(text, file.name);
    };
    reader.readAsText(file.slice(0, 1024 * 1024));
  };

  // Copiar resumen de cotización al portapapeles
  const handleCopyQuote = () => {
    const text = `COTIZACIÓN IMPRESIÓN 3D — SLICE2PRICE
Pieza: ${pieceName}
Cantidad: ${quantity} unidad(es)
---------------------------------------------
• Tiempo: ${timeHours}h ${timeMinutes}m
• Material: ${selectedMaterial.name} (~${filamentGrams}g)
• Impresora: ${selectedPrinter.name}
• Tarifa cliente: ${selectedClient.name}
---------------------------------------------
Subtotal Producción: ${formatCOP(breakdown.subtotal)}
Margen de Ganancia: ${breakdown.profitMarginPercent}%
${breakdown.discountPercent > 0 ? `Descuento aplicado: ${breakdown.discountPercent}%\n` : ''}
PRECIO TOTAL: ${formatCOP(breakdown.totalAllUnits)} COP
${quantity > 1 ? `(Precio unitario: ${formatCOP(breakdown.totalPerUnit)} COP)` : ''}
---------------------------------------------
Generado con Slice2Price • Moneda: Pesos Colombianos (COP)`;

    navigator.clipboard.writeText(text).then(() => {
      showToast('Cotización copiada al portapapeles', 'success');
    });
  };

  // Compartir cotización por WhatsApp con formato optimizado
  const handleShareWhatsApp = () => {
    const text = `*COTIZACIÓN IMPRESIÓN 3D — SLICE2PRICE*
📦 *Pieza:* ${pieceName}
🔢 *Cantidad:* ${quantity} unidad(es)
⏱️ *Tiempo estimado:* ${timeHours}h ${timeMinutes}m
🧵 *Material:* ${selectedMaterial.name} (~${filamentGrams}g)
━━━━━━━━━━━━━━━━━━━━
💰 *PRECIO TOTAL:* ${formatCOP(breakdown.totalAllUnits)} COP
${quantity > 1 ? `🏷️ *Precio unitario:* ${formatCOP(breakdown.totalPerUnit)} COP\n` : ''}━━━━━━━━━━━━━━━━━━━━
_Cotización generada con Slice2Price_`;

    const encoded = encodeURIComponent(text);
    const waUrl = `https://wa.me/?text=${encoded}`;
    if (window.electronAPI?.openExternalUrl) {
      window.electronAPI.openExternalUrl(waUrl);
    } else {
      window.open(waUrl, '_blank');
    }
    showToast('Abriendo WhatsApp para enviar cotización...', 'success');
  };

  // Imprimir o guardar como PDF comprobante oficial
  const handlePrintQuote = () => {
    window.print();
  };

  // Guardar en el historial
  const handleSaveQuote = () => {
    saveQuote({
      pieceName,
      printTimeHours: totalPrintHours,
      filamentGrams,
      extraCosts,
      quantity,
      profiles: {
        printerName: selectedPrinter.name,
        materialName: selectedMaterial.name,
        clientName: selectedClient.name,
        printerId: selectedPrinter.id,
        materialId: selectedMaterial.id,
        clientId: selectedClient.id,
        generalId: selectedGeneral.id,
      },
      breakdown,
      customProfitMargin: profitMargin,
      customDiscount: discount,
    });
  };

  const handleReset = () => {
    setPieceName('Pieza 3D');
    setTimeHours(2);
    setTimeMinutes(30);
    setFilamentGrams(60);
    setExtraCosts(0);
    setQuantity(1);
    setDetectedSlicer(null);
    setProfitMargin(selectedClient.profitMargin);
    setDiscount(selectedClient.discount);
    showToast('Valores reiniciados');
  };

  return (
    <div className="grid-main">
      {/* ── COLUMNA IZQUIERDA: INPUTS Y CONFIGURACIÓN ──────────────────────── */}
      <div className="flex-col gap-md">
        {/* Dropzone o selector de archivo del Slicer */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          style={{
            border: isDragging ? '2px dashed var(--primary)' : '1px dashed var(--outline-variant)',
            background: isDragging ? 'rgba(255, 181, 155, 0.08)' : 'var(--surface-container-low)',
            borderRadius: 'var(--radius-xl)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 150ms ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-outlined icon-md color-primary">upload_file</span>
            <div>
              <div className="font-semibold" style={{ fontSize: '13px' }}>
                {detectedSlicer ? (
                  <span className="color-secondary">Archivo procesado: {detectedSlicer}</span>
                ) : (
                  'Arrastra aquí tu G-Code o .3MF (Orca, Bambu, Cura, Prusa)'
                )}
              </div>
              <div className="text-body-sm color-outline">
                Lee automáticamente los gramos y el tiempo de impresión
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="material-symbols-outlined icon-xs">folder_open</span>
            Examinar
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".gcode,.gco,.3mf,.txt"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
        </div>

        {/* Tarjeta 1: Parámetros de la Pieza */}
        <div className="card">
          <div className="card__header">
            <div className="card__header-title">
              <span className="material-symbols-outlined icon-md color-primary">widgets</span>
              <span className="text-title-sm">Parámetros de la Pieza</span>
            </div>
            <button className="btn btn--ghost btn--sm" onClick={handleReset} title="Limpiar campos">
              <span className="material-symbols-outlined icon-xs">refresh</span>
              Restablecer
            </button>
          </div>

          <div className="flex-col gap-sm">
            {/* Nombre del proyecto / pieza */}
            <div className="input-group">
              <label className="input-group__label text-label-caption">Nombre del Modelo / Pieza</label>
              <input
                type="text"
                className="input-field"
                value={pieceName}
                onChange={(e) => setPieceName(e.target.value)}
                placeholder="Ej. Soporte para audífonos"
              />
            </div>

            {/* Grid: Tiempo de impresión y Filamento */}
            <div className="grid-2">
              {/* Tiempo */}
              <div className="input-group">
                <label className="input-group__label text-label-caption">Tiempo de Impresión</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <div className="input-wrap" style={{ flex: 1 }}>
                    <input
                      type="number"
                      min="0"
                      value={timeHours}
                      onChange={(e) => setTimeHours(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                    <span className="input-wrap__suffix">h</span>
                  </div>
                  <div className="input-wrap" style={{ flex: 1 }}>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={timeMinutes}
                      onChange={(e) => setTimeMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    />
                    <span className="input-wrap__suffix">min</span>
                  </div>
                </div>
                <span className="text-body-sm color-outline" style={{ fontSize: '11px', marginTop: '2px' }}>
                  Total: {totalPrintHours.toFixed(2)} horas
                </span>
              </div>

              {/* Filamento */}
              <div className="input-group">
                <label className="input-group__label text-label-caption">Filamento Consumido</label>
                <div className="input-wrap">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={filamentGrams}
                    onChange={(e) => setFilamentGrams(Math.max(0, parseFloat(e.target.value) || 0))}
                  />
                  <span className="input-wrap__suffix">gramos</span>
                </div>
                <span className="text-body-sm color-outline" style={{ fontSize: '11px', marginTop: '2px' }}>
                  {(filamentGrams / 1000).toFixed(3)} kg de material
                </span>
              </div>
            </div>

            {/* Grid: Insumos extra y Cantidad */}
            <div className="grid-2">
              {/* Insumos extra / Diseño */}
              <div className="input-group">
                <label className="input-group__label text-label-caption">Insumos Extra / Diseño (COP)</label>
                <div className="input-wrap">
                  <span className="input-wrap__prefix">$</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={extraCosts}
                    onChange={(e) => setExtraCosts(Math.max(0, parseInt(e.target.value) || 0))}
                  />
                  <span className="input-wrap__suffix">COP</span>
                </div>
                {/* Botones de sugerencias rápidas */}
                <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="badge badge--surface"
                    style={{ cursor: 'pointer', border: 'none' }}
                    onClick={() => setExtraCosts((v) => v + 5000)}
                  >
                    +$5.000
                  </button>
                  <button
                    type="button"
                    className="badge badge--surface"
                    style={{ cursor: 'pointer', border: 'none' }}
                    onClick={() => setExtraCosts((v) => v + 10000)}
                  >
                    +$10.000
                  </button>
                  <button
                    type="button"
                    className="badge badge--surface"
                    style={{ cursor: 'pointer', border: 'none' }}
                    onClick={() => setExtraCosts(0)}
                  >
                    $0
                  </button>
                </div>
              </div>

              {/* Cantidad */}
              <div className="input-group">
                <label className="input-group__label text-label-caption">Cantidad de Unidades</label>
                <div className="input-wrap">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                  <span className="input-wrap__suffix">piezas</span>
                </div>
                <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                  {[1, 2, 5, 10].map((q) => (
                    <button
                      key={q}
                      type="button"
                      className={`badge ${quantity === q ? 'badge--primary' : 'badge--surface'}`}
                      style={{ cursor: 'pointer', border: 'none' }}
                      onClick={() => setQuantity(q)}
                    >
                      {q} {q === 1 ? 'ud' : 'uds'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tarjeta 2: Perfiles del Taller */}
        <div className="card">
          <div className="card__header">
            <div className="card__header-title">
              <span className="material-symbols-outlined icon-md color-primary">tune</span>
              <span className="text-title-sm">Perfiles y Tarifas de Cálculo</span>
            </div>
            <span className="badge badge--surface font-mono">Pesos Colombianos</span>
          </div>

          <div className="grid-2">
            {/* Selector Impresora */}
            <div className="input-group">
              <label className="input-group__label text-label-caption">Impresora 3D</label>
              <select
                className="select-field"
                value={selectedPrinter.id}
                onChange={(e) => setSelectedPrinterId(e.target.value)}
              >
                {printers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.powerConsumptionW}W • ${p.depreciationPerHour}/h)
                  </option>
                ))}
              </select>
            </div>

            {/* Selector Material */}
            <div className="input-group">
              <label className="input-group__label text-label-caption">Material / Filamento</label>
              <select
                className="select-field"
                value={selectedMaterial.id}
                onChange={(e) => setSelectedMaterialId(e.target.value)}
              >
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (${m.pricePerKg.toLocaleString('es-CO')} COP/kg)
                  </option>
                ))}
              </select>
            </div>

            {/* Selector Tarifa Cliente */}
            <div className="input-group">
              <label className="input-group__label text-label-caption">Tipo de Tarifa / Cliente</label>
              <select
                className="select-field"
                value={selectedClient.id}
                onChange={(e) => setSelectedClientId(e.target.value)}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (+{c.profitMargin}% {c.discount > 0 ? `• desc ${c.discount}%` : ''})
                  </option>
                ))}
              </select>
            </div>

            {/* Selector Configuración General */}
            <div className="input-group">
              <label className="input-group__label text-label-caption">Costo Energía y Margen</label>
              <select
                className="select-field"
                value={selectedGeneral.id}
                onChange={(e) => setSelectedGeneralId(e.target.value)}
              >
                {generals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} (${g.pricePerKwh} COP/kWh)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tarjeta 3: Sliders de Ajuste Rápido */}
        <div className="card">
          <div className="card__header">
            <div className="card__header-title">
              <span className="material-symbols-outlined icon-md color-secondary">sliders</span>
              <span className="text-title-sm">Ajuste Rápido de Márgenes</span>
            </div>
            <span className="text-body-sm color-outline">Ajusta el margen sin modificar el perfil</span>
          </div>

          <div className="grid-2">
            {/* Slider Ganancia */}
            <div className="slider-group">
              <div className="slider-group__header">
                <span className="text-body-sm font-semibold">Margen de Ganancia</span>
                <span className="text-metric-regular color-secondary font-bold">+{profitMargin}%</span>
              </div>
              <input
                type="range"
                className="slider--secondary"
                min="0"
                max="150"
                step="5"
                value={profitMargin}
                onChange={(e) => setProfitMargin(parseInt(e.target.value) || 0)}
              />
              <div className="slider-group__scale">
                <span>0% (Costo puro)</span>
                <span>50%</span>
                <span>150% (Premium)</span>
              </div>
            </div>

            {/* Slider Descuento */}
            <div className="slider-group">
              <div className="slider-group__header">
                <span className="text-body-sm font-semibold">Descuento Comercial</span>
                <span className="text-metric-regular color-tertiary font-bold">-{discount}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={discount}
                onChange={(e) => setDiscount(parseInt(e.target.value) || 0)}
              />
              <div className="slider-group__scale">
                <span>0% (Sin desc)</span>
                <span>25%</span>
                <span>50% (Max)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── COLUMNA DERECHA: PRECIO FINAL HERO Y DESGLOSE ─────────────────── */}
      <div className="flex-col gap-md">
        {/* HERO CARD: GRAN PRECIO FINAL */}
        <div className="card card--hero">
          <div className="price-hero__label-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="dot dot--primary"></span>
              <span className="text-label-caption" style={{ color: 'var(--primary)' }}>
                Precio Sugerido de Venta
              </span>
            </div>
            <span className="badge badge--primary">COP</span>
          </div>

          <div className="price-hero__amount">
            <span className="price-hero__amount-value">{formatCOP(breakdown.totalAllUnits)}</span>
            <span className="price-hero__amount-currency">COP</span>
          </div>

          {quantity > 1 && (
            <div style={{ marginBottom: '12px' }}>
              <span className="text-body-sm color-on-surface-variant">
                Precio unitario: <strong>{formatCOP(breakdown.totalPerUnit)} COP</strong> por pieza
              </span>
            </div>
          )}

          <div className="price-hero__split">
            <div className="price-hero__split-box">
              <span className="text-label-caption color-outline">Costo Producción</span>
              <span className="price-hero__split-value color-on-surface">
                {formatCOP(breakdown.subtotalWithRisk * quantity)}
              </span>
            </div>
            <div className="price-hero__split-box">
              <span className="text-label-caption color-secondary">Ganancia Neta</span>
              <span className="price-hero__split-value color-secondary">
                +{formatCOP((breakdown.profitAmount - breakdown.discountAmount) * quantity)}
              </span>
            </div>
          </div>
        </div>

        {/* DESGLOSE DETALLADO LÍNEA POR LÍNEA */}
        <div className="card">
          <div className="card__header">
            <div className="card__header-title">
              <span className="material-symbols-outlined icon-md color-primary">receipt_long</span>
              <span className="text-title-sm">Desglose Detallado de Costos</span>
            </div>
            <span className="text-label-caption color-outline">Fórmula Transparente</span>
          </div>

          <div className="flex-col gap-xs">
            {/* Costo filamento */}
            <div className="cost-line">
              <div className="cost-line__info">
                <span className="cost-line__label">
                  <span className="material-symbols-outlined icon-xs color-outline">donut_large</span>
                  Filamento ({selectedMaterial.name})
                </span>
                <span className="cost-line__formula">
                  ({filamentGrams}g ÷ 1.000) × {formatCOP(selectedMaterial.pricePerKg)}/kg
                </span>
              </div>
              <span className="cost-line__value">{formatCOP(breakdown.filamentCost)}</span>
            </div>

            {/* Costo energía */}
            <div className="cost-line">
              <div className="cost-line__info">
                <span className="cost-line__label">
                  <span className="material-symbols-outlined icon-xs color-outline">bolt</span>
                  Consumo Eléctrico ({selectedPrinter.powerConsumptionW}W)
                </span>
                <span className="cost-line__formula">
                  ({selectedPrinter.powerConsumptionW}W ÷ 1.000) × {totalPrintHours.toFixed(2)}h × ${selectedGeneral.pricePerKwh}/kWh
                </span>
              </div>
              <span className="cost-line__value">{formatCOP(breakdown.energyCost)}</span>
            </div>

            {/* Costo depreciación */}
            <div className="cost-line">
              <div className="cost-line__info">
                <span className="cost-line__label">
                  <span className="material-symbols-outlined icon-xs color-outline">build</span>
                  Depreciación y Desgaste Máquina
                </span>
                <span className="cost-line__formula">
                  {totalPrintHours.toFixed(2)}h × {formatCOP(selectedPrinter.depreciationPerHour)}/h
                </span>
              </div>
              <span className="cost-line__value">{formatCOP(breakdown.depreciationCost)}</span>
            </div>

            {/* Insumos extra / Diseño */}
            {extraCosts > 0 && (
              <div className="cost-line">
                <div className="cost-line__info">
                  <span className="cost-line__label">
                    <span className="material-symbols-outlined icon-xs color-outline">draw</span>
                    Insumos Extra / Honorarios Diseño
                  </span>
                  <span className="cost-line__formula">Valor fijado por pieza</span>
                </div>
                <span className="cost-line__value">{formatCOP(breakdown.extraCosts)}</span>
              </div>
            )}

            {/* Línea Subtotal Base */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px',
                borderTop: '1px solid var(--surface-variant)',
                marginTop: '4px',
              }}
            >
              <span className="font-semibold text-body-sm">Subtotal Base</span>
              <span className="font-mono font-bold">{formatCOP(breakdown.subtotal)}</span>
            </div>

            {/* Margen de error */}
            <div className="cost-line cost-line--error">
              <div className="cost-line__info">
                <span className="cost-line__label">
                  <span className="material-symbols-outlined icon-xs">warning</span>
                  Margen de Error (+{breakdown.errorMarginPercent}%)
                </span>
                <span className="cost-line__formula">Pérdidas, purgas, soportes imprevistos</span>
              </div>
              <span className="cost-line__value">+{formatCOP(breakdown.errorMarginAmount)}</span>
            </div>

            {/* Riesgo de fallo */}
            <div className="cost-line cost-line--error">
              <div className="cost-line__info">
                <span className="cost-line__label">
                  <span className="material-symbols-outlined icon-xs">report_problem</span>
                  Riesgo de Fallo (+{breakdown.failureRiskPercent}%)
                </span>
                <span className="cost-line__formula">Impresiones fallidas amortizadas</span>
              </div>
              <span className="cost-line__value">+{formatCOP(breakdown.failureRiskAmount)}</span>
            </div>

            {/* Ganancia */}
            <div className="cost-line cost-line--profit">
              <div className="cost-line__info">
                <span className="cost-line__label font-bold">
                  <span className="material-symbols-outlined icon-xs">trending_up</span>
                  Margen de Ganancia (+{breakdown.profitMarginPercent}%)
                </span>
                <span className="cost-line__formula">Utilidad para el taller</span>
              </div>
              <span className="cost-line__value">+{formatCOP(breakdown.profitAmount)}</span>
            </div>

            {/* Descuento si aplica */}
            {breakdown.discountPercent > 0 && (
              <div className="cost-line cost-line--discount">
                <div className="cost-line__info">
                  <span className="cost-line__label font-bold">
                    <span className="material-symbols-outlined icon-xs">loyalty</span>
                    Descuento Comercial (-{breakdown.discountPercent}%)
                  </span>
                  <span className="cost-line__formula">Beneficio cliente / mayorista</span>
                </div>
                <span className="cost-line__value">-{formatCOP(breakdown.discountAmount)}</span>
              </div>
            )}
          </div>

          {/* Botones de acción principales */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn--primary btn--full"
              onClick={handleCopyQuote}
            >
              <span className="material-symbols-outlined icon-md">content_copy</span>
              Copiar Cotización para Cliente
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className="btn btn--secondary btn--full"
                onClick={handleShareWhatsApp}
                title="Compartir presupuesto directamente por WhatsApp"
              >
                <span className="material-symbols-outlined icon-sm" style={{ color: '#25D366' }}>chat</span>
                WhatsApp
              </button>

              <button
                type="button"
                className="btn btn--secondary btn--full"
                onClick={handlePrintQuote}
                title="Imprimir ticket o exportar a PDF"
              >
                <span className="material-symbols-outlined icon-sm">print</span>
                PDF / Imprimir
              </button>
            </div>

            <button
              type="button"
              className="btn btn--ghost btn--full"
              onClick={handleSaveQuote}
            >
              <span className="material-symbols-outlined icon-md">save</span>
              Guardar en Historial
            </button>
          </div>
        </div>
      </div>

      {/* ── SECCIÓN EXCLUSIVA PARA IMPRESIÓN / PDF DEL CLIENTE ────────────── */}
      <div className="print-only" style={{ padding: '24px', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #222', paddingBottom: '12px', marginBottom: '20px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', color: '#111' }}>COTIZACIÓN DE IMPRESIÓN 3D</h1>
            <p style={{ margin: '4px 0 0', color: '#555', fontSize: '14px' }}>Slice2Price • Taller de Fabricación Aditiva</p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '13px', color: '#555' }}>
            <p style={{ margin: 0 }}><strong>Fecha:</strong> {new Date().toLocaleDateString('es-CO')}</p>
            <p style={{ margin: '4px 0 0' }}><strong>Moneda:</strong> COP (Pesos Colombianos)</p>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f0f0f0', textAlign: 'left' }}>
              <th style={{ padding: '10px', border: '1px solid #ccc' }}>Descripción del Proyecto</th>
              <th style={{ padding: '10px', border: '1px solid #ccc' }}>Material</th>
              <th style={{ padding: '10px', border: '1px solid #ccc' }}>Tiempo Est.</th>
              <th style={{ padding: '10px', border: '1px solid #ccc', textAlign: 'center' }}>Cantidad</th>
              <th style={{ padding: '10px', border: '1px solid #ccc', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '12px 10px', border: '1px solid #ccc' }}><strong>{pieceName}</strong></td>
              <td style={{ padding: '12px 10px', border: '1px solid #ccc' }}>{selectedMaterial.name}</td>
              <td style={{ padding: '12px 10px', border: '1px solid #ccc' }}>{timeHours}h {timeMinutes}m</td>
              <td style={{ padding: '12px 10px', border: '1px solid #ccc', textAlign: 'center' }}>{quantity} ud(s)</td>
              <td style={{ padding: '12px 10px', border: '1px solid #ccc', textAlign: 'right', fontWeight: 'bold' }}>{formatCOP(breakdown.totalAllUnits)} COP</td>
            </tr>
          </tbody>
        </table>

        {quantity > 1 && (
          <p style={{ textAlign: 'right', fontSize: '14px', margin: '4px 0 16px' }}>
            Precio unitario sugerido: <strong>{formatCOP(breakdown.totalPerUnit)} COP</strong>
          </p>
        )}

        <div style={{ borderTop: '1px solid #ddd', paddingTop: '14px', fontSize: '12px', color: '#666' }}>
          <p style={{ margin: '0 0 4px' }}>• Cotización válida por 15 días calendario a partir de su emisión.</p>
          <p style={{ margin: '0 0 4px' }}>• El tiempo de entrega definitivo se confirmará al iniciar la producción.</p>
          <p style={{ margin: 0 }}>• Gracias por confiar en nuestros servicios de impresión 3D.</p>
        </div>
      </div>
    </div>
  );
};
