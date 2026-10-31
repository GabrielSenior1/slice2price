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
    toggleCompactMode,
    setActiveBreakdown,
    setActivePieceName,
    hasUnsavedWork,
    setHasUnsavedWork,
    pendingSlicerEvent,
    loadPendingSlicerEvent,
    dismissPendingSlicerEvent,
  } = useApp();

  const [calcError, setCalcError] = useState<string | null>(null);

  // Inputs de la pieza
  const [pieceName, setPieceName] = useState('Pieza 3D');
  const [timeHours, setTimeHours] = useState<number>(3);
  const [timeMinutes, setTimeMinutes] = useState<number>(45);
  const [filamentGrams, setFilamentGrams] = useState<number>(85);
  const [extraCosts, setExtraCosts] = useState<number>(5000);
  const [quantity, setQuantity] = useState<number>(1);

  // Costo real del filamento (editable en tiempo real, sobreescribe el perfil)
  const [materialPricePerKg, setMaterialPricePerKg] = useState<number>(selectedMaterial.pricePerKg);

  // Consumo eléctrico de la impresora (Watts) y tarifa de energía ($/kWh) en tiempo real
  const [printerWatts, setPrinterWatts] = useState<number>(selectedPrinter.powerConsumptionW);
  const [pricePerKwh, setPricePerKwh] = useState<number>(selectedGeneral.pricePerKwh);

  // Dificultad o forma de la pieza (0: Fácil/Plana, 15: Media, 30: Compleja, 50: Extrema)
  const [difficultyPercent, setDifficultyPercent] = useState<number>(0);

  // Sliders de anulación rápida (override del perfil)
  const [profitMargin, setProfitMargin] = useState<number>(selectedClient.profitMargin);
  const [discount, setDiscount] = useState<number>(selectedClient.discount);
  const [errorMargin, setErrorMargin] = useState<number>(selectedGeneral.errorMargin);
  const [failureRisk, setFailureRisk] = useState<number>(selectedGeneral.failureRisk);

  // Slicer detectado (si se arrastra un archivo)
  const [detectedSlicer, setDetectedSlicer] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Actualizar precio de material cuando cambia el perfil seleccionado
  useEffect(() => {
    setMaterialPricePerKg(selectedMaterial.pricePerKg);
  }, [selectedMaterial.id, selectedMaterial.pricePerKg]);

  // Actualizar consumo de máquina y energía cuando cambia el perfil seleccionado
  useEffect(() => {
    setPrinterWatts(selectedPrinter.powerConsumptionW);
  }, [selectedPrinter.id, selectedPrinter.powerConsumptionW]);

  useEffect(() => {
    setPricePerKwh(selectedGeneral.pricePerKwh);
  }, [selectedGeneral.id, selectedGeneral.pricePerKwh]);

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
      if (loadedQuote.breakdown?.difficultyPercent !== undefined) {
        setDifficultyPercent(loadedQuote.breakdown.difficultyPercent);
      } else {
        setDifficultyPercent(0);
      }

      showToast(`Cotización "${loadedQuote.pieceName}" cargada`);
      setLoadedQuote(null);
      setHasUnsavedWork(false);
    }
  }, [loadedQuote]);

  // Rastrear si el usuario ha modificado campos para proteger el trabajo activo (Falla E7)
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    setHasUnsavedWork(true);
  }, [
    pieceName,
    timeHours,
    timeMinutes,
    filamentGrams,
    extraCosts,
    quantity,
    difficultyPercent,
    materialPricePerKg,
    printerWatts,
    pricePerKwh,
    profitMargin,
    discount,
  ]);

  // Cálculo en tiempo real
  const totalPrintHours = useMemo(() => {
    return Math.max(0, timeHours + (timeMinutes || 0) / 60);
  }, [timeHours, timeMinutes]);

  const calcParams: CalcParams = useMemo(() => {
    return {
      pricePerKg: materialPricePerKg,
      powerConsumptionW: printerWatts,
      depreciationPerHour: selectedPrinter.depreciationPerHour,
      pricePerKwh: pricePerKwh,
      errorMargin: errorMargin,
      failureRisk: failureRisk,
      difficultyPercent: difficultyPercent,
      profitMargin: profitMargin,
      discount: discount,
    };
  }, [
    materialPricePerKg,
    printerWatts,
    selectedPrinter.depreciationPerHour,
    pricePerKwh,
    errorMargin,
    failureRisk,
    difficultyPercent,
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
      const computed = calculateCost(calcParams, pieceInput);
      setCalcError(null);
      return computed;
    } catch (err: any) {
      setCalcError(err?.message || 'Error en los parámetros de cálculo');
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
        difficultyPercent: 0,
        difficultyAmount: 0,
        subtotalWithRisk: 0,
        profitMarginPercent: 0,
        profitMultiplier: 1,
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

  // Sincronizar cálculo activo con el contexto global y MiniOverlay (Falla E4)
  useEffect(() => {
    setActiveBreakdown(breakdown);
    setActivePieceName(pieceName);
  }, [breakdown, pieceName, setActiveBreakdown, setActivePieceName]);

  // Parser interactivo para G-code y texto de slicers (Fase 3 y E5b con densidad de material)
  const processSlicerContent = (content: string, filename: string) => {
    const result = parseSlicerFile(content, filename, {
      density: selectedMaterial?.density ?? 1.24,
    });
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
      if (filename.toLowerCase().endsWith('.3mf')) {
        showToast('Los archivos .3MF son paquetes ZIP binarios de proyecto. Para cotización automática precisa, exporta como .GCODE desde tu laminador.', 'warning');
      } else {
        showToast('Archivo leído, pero no se hallaron etiquetas estándar de tiempo/peso.');
      }
    }
  };

  const readFileSmart = (file: File, callback: (text: string) => void) => {
    const totalSize = file.size;
    const headerBytes = 1024 * 1024;
    const footerBytes = 256 * 1024;

    if (totalSize <= headerBytes + footerBytes) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) callback(text);
      };
      reader.readAsText(file);
    } else {
      const headerBlob = file.slice(0, headerBytes);
      const footerBlob = file.slice(totalSize - footerBytes);

      const headerReader = new FileReader();
      headerReader.onload = (hEvent) => {
        const headerText = hEvent.target?.result as string;
        const footerReader = new FileReader();
        footerReader.onload = (fEvent) => {
          const footerText = fEvent.target?.result as string;
          callback((headerText || '') + '\n; ... [SLICE2PRICE_OMITTED_MIDDLE] ...\n' + (footerText || ''));
        };
        footerReader.readAsText(footerBlob);
      };
      headerReader.readAsText(headerBlob);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFileSmart(file, (text) => processSlicerContent(text, file.name));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    readFileSmart(file, (text) => processSlicerContent(text, file.name));
  };

  // Copiar resumen de cotización al portapapeles
  const handleCopyQuote = () => {
    const text = `COTIZACIÓN IMPRESIÓN 3D — SLICE2PRICE
Pieza: ${pieceName}
Cantidad: ${quantity} unidad(es)
---------------------------------------------
• Tiempo: ${timeHours}h ${timeMinutes}m (${totalPrintHours.toFixed(2)}h)
• Material: ${selectedMaterial.name} (~${filamentGrams}g @ $${materialPricePerKg.toLocaleString('es-CO')}/kg)
• Impresora: ${selectedPrinter.name} (${printerWatts}W • $${pricePerKwh}/kWh)
• Dificultad geométrica: ${difficultyPercent > 0 ? `+${difficultyPercent}% (Complejidad/soportes)` : 'Estándar (0%)'}
• Multiplicador comercial: x${breakdown.profitMultiplier} (+${breakdown.profitMarginPercent}%)
---------------------------------------------
Subtotal Producción: ${formatCOP(breakdown.subtotalWithRisk * quantity)}
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
🖨️ *Impresora:* ${selectedPrinter.name} (${printerWatts}W)
${difficultyPercent > 0 ? `⚙️ *Dificultad técnica:* +${difficultyPercent}%\n` : ''}📈 *Multiplicador:* x${breakdown.profitMultiplier} (+${breakdown.profitMarginPercent}%)
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
        printerName: `${selectedPrinter.name} (${printerWatts}W)`,
        materialName: `${selectedMaterial.name} ($${materialPricePerKg.toLocaleString('es-CO')}/kg)`,
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
    setHasUnsavedWork(false);
  };

  const handleReset = () => {
    setPieceName('Pieza 3D');
    setTimeHours(2);
    setTimeMinutes(30);
    setFilamentGrams(60);
    setExtraCosts(0);
    setQuantity(1);
    setDetectedSlicer(null);
    setMaterialPricePerKg(selectedMaterial.pricePerKg);
    setPrinterWatts(selectedPrinter.powerConsumptionW);
    setPricePerKwh(selectedGeneral.pricePerKwh);
    setDifficultyPercent(0);
    setProfitMargin(selectedClient.profitMargin);
    setDiscount(selectedClient.discount);
    setHasUnsavedWork(false);
    showToast('Valores reiniciados');
  };

  return (
    <div className="flex-col gap-md">
      {/* Banner de protección contra sobreescritura de trabajo en edición (Falla E7) */}
      {pendingSlicerEvent && (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(255, 181, 155, 0.12)',
            border: '1px solid var(--primary)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-outlined icon-md color-primary">sync_problem</span>
            <div>
              <div className="font-semibold" style={{ fontSize: '13px' }}>
                Nuevo archivo detectado: {pendingSlicerEvent.quote.pieceName} ({pendingSlicerEvent.quote.printTimeHours}h, {pendingSlicerEvent.quote.filamentGrams}g)
              </div>
              <div className="text-body-sm color-outline">
                Tienes una cotización en edición. ¿Deseas reemplazarla con esta nueva pieza del laminador?
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button className="btn btn--primary btn--sm" onClick={loadPendingSlicerEvent}>
              Cargar Pieza
            </button>
            <button className="btn btn--ghost btn--sm" onClick={dismissPendingSlicerEvent}>
              Descartar
            </button>
          </div>
        </div>
      )}

      {/* Banner de error de parámetros de cálculo (Falla N2) */}
      {calcError && (
        <div
          style={{
            padding: '10px 14px',
            background: 'rgba(255, 80, 80, 0.15)',
            border: '1px solid #ff5555',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#ff9999',
            fontSize: '13px',
          }}
        >
          <span className="material-symbols-outlined icon-sm">warning</span>
          <span><strong>Parámetros no válidos:</strong> {calcError}</span>
        </div>
      )}

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
                  'Arrastra aquí tu G-Code (Orca, Bambu, Cura, Prusa, Creality)'
                )}
              </div>
              <div className="text-body-sm color-outline">
                Lee automáticamente los gramos y el tiempo de impresión
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => toggleCompactMode(true)}
              title="Minimizar a widget flotante always-on-top sobre tu slicer (F10)"
            >
              <span className="material-symbols-outlined icon-xs">picture_in_picture_alt</span>
              Modo Flotante
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="material-symbols-outlined icon-xs">folder_open</span>
              Examinar
            </button>
          </div>
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

        {/* Tarjeta 2: Material y Costo Real del Filamento */}
        <div className="card">
          <div className="card__header">
            <div className="card__header-title">
              <span className="material-symbols-outlined icon-md color-primary">donut_large</span>
              <span className="text-title-sm">Material y Costo del Carrete</span>
            </div>
            {materialPricePerKg !== selectedMaterial.pricePerKg && (
              <span className="badge badge--secondary font-mono">Precio Personalizado</span>
            )}
          </div>

          <div className="grid-2">
            {/* Selector Material base */}
            <div className="input-group">
              <label className="input-group__label text-label-caption">Perfil de Material Base</label>
              <select
                className="select-field"
                value={selectedMaterial.id}
                onChange={(e) => setSelectedMaterialId(e.target.value)}
              >
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (${m.pricePerKg.toLocaleString('es-CO')} COP/kg perfil)
                  </option>
                ))}
              </select>
            </div>

            {/* Costo real editable del filamento */}
            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="input-group__label text-label-caption">Costo Real Bobina / Kg (COP)</label>
                {materialPricePerKg !== selectedMaterial.pricePerKg && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    style={{ padding: '0 4px', fontSize: '11px', height: 'auto' }}
                    onClick={() => setMaterialPricePerKg(selectedMaterial.pricePerKg)}
                    title="Restablecer al precio del perfil"
                  >
                    ↺ Perfil (${selectedMaterial.pricePerKg.toLocaleString('es-CO')})
                  </button>
                )}
              </div>
              <div className="input-wrap">
                <span className="input-wrap__prefix">$</span>
                <input
                  type="number"
                  min="10000"
                  step="5000"
                  value={materialPricePerKg}
                  onChange={(e) => setMaterialPricePerKg(Math.max(0, parseInt(e.target.value) || 0))}
                />
                <span className="input-wrap__suffix">COP / kg</span>
              </div>
            </div>
          </div>

          {/* Chips de precios habituales de filamento en Colombia */}
          <div style={{ marginTop: '8px' }}>
            <span className="text-label-caption color-outline" style={{ display: 'block', marginBottom: '4px', fontSize: '11px' }}>
              Precios rápidos según gama / marca de filamento en Colombia:
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { label: '$55k Genérico', price: 55000 },
                { label: '$65k PLA Estándar', price: 65000 },
                { label: '$75k PETG / PLA+', price: 75000 },
                { label: '$90k Premium / eSun', price: 90000 },
                { label: '$115k ABS / ASA', price: 115000 },
                { label: '$140k TPU / Técnico', price: 140000 },
              ].map((chip) => (
                <button
                  key={chip.price}
                  type="button"
                  className={`badge ${materialPricePerKg === chip.price ? 'badge--primary' : 'badge--surface'}`}
                  style={{ cursor: 'pointer', border: 'none', padding: '4px 8px' }}
                  onClick={() => setMaterialPricePerKg(chip.price)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tarjeta 3: Impresora 3D y Consumo Eléctrico Real (Watts & kWh) */}
        <div className="card">
          <div className="card__header">
            <div className="card__header-title">
              <span className="material-symbols-outlined icon-md color-primary">precision_manufacturing</span>
              <span className="text-title-sm">Impresora 3D y Consumo Eléctrico</span>
            </div>
            <span className="badge badge--surface font-mono">
              {((printerWatts / 1000) * totalPrintHours).toFixed(3)} kWh est.
            </span>
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

            {/* Consumo real en Watts */}
            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="input-group__label text-label-caption">Consumo Eléctrico Real (Watts)</label>
                {printerWatts !== selectedPrinter.powerConsumptionW && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    style={{ padding: '0 4px', fontSize: '11px', height: 'auto' }}
                    onClick={() => setPrinterWatts(selectedPrinter.powerConsumptionW)}
                    title="Restablecer a potencia del perfil"
                  >
                    ↺ Perfil ({selectedPrinter.powerConsumptionW}W)
                  </button>
                )}
              </div>
              <div className="input-wrap">
                <input
                  type="number"
                  min="50"
                  max="2000"
                  step="10"
                  value={printerWatts}
                  onChange={(e) => setPrinterWatts(Math.max(10, parseInt(e.target.value) || 0))}
                />
                <span className="input-wrap__suffix">Watts</span>
              </div>
            </div>

            {/* Selector Configuración General */}
            <div className="input-group">
              <label className="input-group__label text-label-caption">Perfil de Costos Generales</label>
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

            {/* Tarifa Eléctrica $/kWh */}
            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="input-group__label text-label-caption">Costo Electricidad ($/kWh en Colombia)</label>
                {pricePerKwh !== selectedGeneral.pricePerKwh && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    style={{ padding: '0 4px', fontSize: '11px', height: 'auto' }}
                    onClick={() => setPricePerKwh(selectedGeneral.pricePerKwh)}
                    title="Restablecer a tarifa del perfil"
                  >
                    ↺ Perfil (${selectedGeneral.pricePerKwh}/kWh)
                  </button>
                )}
              </div>
              <div className="input-wrap">
                <span className="input-wrap__prefix">$</span>
                <input
                  type="number"
                  min="100"
                  step="50"
                  value={pricePerKwh}
                  onChange={(e) => setPricePerKwh(Math.max(0, parseInt(e.target.value) || 0))}
                />
                <span className="input-wrap__suffix">COP / kWh</span>
              </div>
            </div>
          </div>

          {/* Chips de tarifas de electricidad en Colombia (CREG) */}
          <div style={{ marginTop: '8px' }}>
            <span className="text-label-caption color-outline" style={{ display: 'block', marginBottom: '4px', fontSize: '11px' }}>
              Tarifas reales de electricidad en Colombia (según estrato o tipo de taller):
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { label: '$350 Estrato 1', price: 350 },
                { label: '$440 Estrato 2', price: 440 },
                { label: '$750 Estrato 3', price: 750 },
                { label: '$880 Estrato 4 / Base', price: 880 },
                { label: '$1.056 Comercial (+20%)', price: 1056 },
                { label: '$1.080 Estrato 5-6', price: 1080 },
                { label: '$1.200 Costa Caribe', price: 1200 },
              ].map((chip) => (
                <button
                  key={chip.price}
                  type="button"
                  className={`badge ${pricePerKwh === chip.price ? 'badge--primary' : 'badge--surface'}`}
                  style={{ cursor: 'pointer', border: 'none', padding: '4px 8px' }}
                  onClick={() => setPricePerKwh(chip.price)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chips de potencias típicas */}
          <div style={{ marginTop: '10px' }}>
            <span className="text-label-caption color-outline" style={{ display: 'block', marginBottom: '4px', fontSize: '11px' }}>
              Potencia típica según máquina y calentamiento de cama:
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { label: '120W Eco / Sin cama', watts: 120 },
                { label: '150W Ender 3 / Std', watts: 150 },
                { label: '250W CoreXY Media', watts: 250 },
                { label: '350W Bambu / K1 Max', watts: 350 },
                { label: '500W Gran Formato', watts: 500 },
              ].map((chip) => (
                <button
                  key={chip.watts}
                  type="button"
                  className={`badge ${printerWatts === chip.watts ? 'badge--primary' : 'badge--surface'}`}
                  style={{ cursor: 'pointer', border: 'none', padding: '4px 8px' }}
                  onClick={() => setPrinterWatts(chip.watts)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tarjeta 4: Dificultad y Forma de Impresión (Geometría / Riesgo) */}
        <div className="card">
          <div className="card__header">
            <div className="card__header-title">
              <span className="material-symbols-outlined icon-md color-secondary">shapes</span>
              <span className="text-title-sm">Dificultad y Forma de Impresión</span>
            </div>
            <span className="badge badge--secondary font-mono">
              {difficultyPercent > 0 ? `+${difficultyPercent}% recargo` : 'Estándar (0%)'}
            </span>
          </div>

          <p className="text-body-sm color-outline" style={{ marginBottom: '10px' }}>
            Ajusta el costo por soportes abundantes, voladizos pronunciados, piezas altas o riesgo de desprendimiento de cama.
          </p>

          {/* 4 Niveles Rápidos de Dificultad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '12px' }}>
            {[
              {
                percent: 0,
                title: 'Estándar',
                subtitle: 'Plana, sin soportes',
                icon: 'check_circle',
              },
              {
                percent: 15,
                title: 'Media',
                subtitle: 'Soportes normales',
                icon: 'build_circle',
              },
              {
                percent: 30,
                title: 'Compleja',
                subtitle: 'Pieza alta/esbelta',
                icon: 'warning',
              },
              {
                percent: 50,
                title: 'Extrema',
                subtitle: 'Intrincada/alto riesgo',
                icon: 'emergency',
              },
            ].map((lvl) => (
              <button
                key={lvl.percent}
                type="button"
                className={`btn btn--secondary ${difficultyPercent === lvl.percent ? 'btn--primary' : ''}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '8px 4px',
                  borderRadius: 'var(--radius-xl)',
                  textAlign: 'center',
                  gap: '2px',
                }}
                onClick={() => setDifficultyPercent(lvl.percent)}
              >
                <span className="material-symbols-outlined icon-sm">{lvl.icon}</span>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>{lvl.title}</span>
                <span style={{ fontSize: '10px', opacity: 0.85 }}>+{lvl.percent}%</span>
              </button>
            ))}
          </div>

          {/* Control Adaptable de Dificultad */}
          <div className="slider-group">
            <div className="slider-group__header">
              <span className="text-body-sm font-semibold">Dificultad Geométrica Adaptable</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="text-metric-regular color-secondary font-bold">+{difficultyPercent}%</span>
                {breakdown.difficultyAmount > 0 && (
                  <span className="badge badge--surface font-mono">
                    +{formatCOP(breakdown.difficultyAmount)}
                  </span>
                )}
              </div>
            </div>
            <input
              type="range"
              className="slider--secondary"
              min="0"
              max="100"
              step="5"
              value={difficultyPercent}
              onChange={(e) => setDifficultyPercent(parseInt(e.target.value) || 0)}
            />
            <div className="slider-group__scale">
              <span>0% (Plana / Fácil)</span>
              <span>25% (Moderada)</span>
              <span>50% (Difícil)</span>
              <span>100% (Extrema)</span>
            </div>
          </div>
        </div>

        {/* Tarjeta 5: Margen Comercial y Multiplicador de Ganancia */}
        <div className="card">
          <div className="card__header">
            <div className="card__header-title">
              <span className="material-symbols-outlined icon-md color-primary">trending_up</span>
              <span className="text-title-sm">Margen y Multiplicador Comercial</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="badge badge--primary font-mono" style={{ fontSize: '12px', padding: '4px 8px' }}>
                x{((profitMargin / 100) + 1).toFixed(2)} (+{profitMargin}%)
              </span>
            </div>
          </div>

          <p className="text-body-sm color-outline" style={{ marginBottom: '10px' }}>
            Aplica un factor multiplicador sobre el costo de producción total (x2, x2.5, x3, x3.5) o personalízalo libremente.
          </p>

          {/* Botones de Multiplicadores Comerciales Clásicos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px', marginBottom: '12px' }}>
            {[
              { label: 'x1.5', margin: 50, note: '+50%' },
              { label: 'x2.0', margin: 100, note: 'Duplica' },
              { label: 'x2.5', margin: 150, note: 'Taller std' },
              { label: 'x3.0', margin: 200, note: 'Triplica' },
              { label: 'x3.5', margin: 250, note: 'Comercial' },
              { label: 'x4.0', margin: 300, note: 'Premium' },
            ].map((mult) => (
              <button
                key={mult.label}
                type="button"
                className={`btn btn--secondary ${profitMargin === mult.margin ? 'btn--primary' : ''}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '8px 4px',
                  borderRadius: 'var(--radius-xl)',
                  textAlign: 'center',
                  gap: '2px',
                }}
                onClick={() => setProfitMargin(mult.margin)}
              >
                <span style={{ fontSize: '13px', fontWeight: 700 }}>{mult.label}</span>
                <span style={{ fontSize: '10px', opacity: 0.85 }}>{mult.note}</span>
              </button>
            ))}
          </div>

          {/* Grid: Multiplicador Adaptable y Descuento */}
          <div className="grid-2">
            {/* Slider de Multiplicador Adaptable */}
            <div className="slider-group">
              <div className="slider-group__header">
                <span className="text-body-sm font-semibold">Multiplicador Adaptable</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    type="number"
                    min="1.0"
                    max="6.0"
                    step="0.1"
                    value={Math.round(((profitMargin / 100) + 1) * 100) / 100}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 1.0;
                      setProfitMargin(Math.max(0, Math.round((val - 1.0) * 100)));
                    }}
                    style={{
                      width: '65px',
                      background: 'var(--surface-container-lowest)',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-lg)',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      color: 'var(--primary)',
                    }}
                  />
                  <span className="color-primary font-bold">x</span>
                </div>
              </div>
              <input
                type="range"
                className="slider--secondary"
                min="1.0"
                max="5.0"
                step="0.05"
                value={(profitMargin / 100) + 1}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 1.0;
                  setProfitMargin(Math.max(0, Math.round((val - 1.0) * 100)));
                }}
              />
              <div className="slider-group__scale">
                <span>x1.0 (Al costo)</span>
                <span>x2.5 (Recomendado)</span>
                <span>x5.0 (Exclusivo)</span>
              </div>
            </div>

            {/* Slider Descuento Comercial */}
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
                <span>25% (Mayorista)</span>
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
            <div style={{ marginBottom: '10px' }}>
              <span className="text-body-sm color-on-surface-variant">
                Precio unitario: <strong>{formatCOP(breakdown.totalPerUnit)} COP</strong> por pieza
              </span>
            </div>
          )}

          {/* Badges de Multiplicador y Dificultad en Hero */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <span className="badge badge--secondary font-mono">
              Multiplicador x{breakdown.profitMultiplier} (+{breakdown.profitMarginPercent}%)
            </span>
            {breakdown.difficultyPercent > 0 && (
              <span className="badge badge--primary font-mono">
                Dificultad: +{breakdown.difficultyPercent}%
              </span>
            )}
            <span className="badge badge--surface font-mono">
              {selectedPrinter.name} ({printerWatts}W)
            </span>
          </div>

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
            {/* Costo filamento con precio real de carrete */}
            <div className="cost-line">
              <div className="cost-line__info">
                <span className="cost-line__label">
                  <span className="material-symbols-outlined icon-xs color-outline">donut_large</span>
                  Filamento ({selectedMaterial.name})
                </span>
                <span className="cost-line__formula">
                  ({filamentGrams}g ÷ 1.000) × {formatCOP(materialPricePerKg)}/kg
                </span>
              </div>
              <span className="cost-line__value">{formatCOP(breakdown.filamentCost)}</span>
            </div>

            {/* Costo energía con watts reales de máquina */}
            <div className="cost-line">
              <div className="cost-line__info">
                <span className="cost-line__label">
                  <span className="material-symbols-outlined icon-xs color-outline">bolt</span>
                  Consumo Eléctrico ({printerWatts}W)
                </span>
                <span className="cost-line__formula">
                  ({printerWatts}W ÷ 1.000) × {totalPrintHours.toFixed(2)}h × ${pricePerKwh}/kWh = {((printerWatts / 1000) * totalPrintHours).toFixed(3)} kWh
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

            {/* Sobrecosto por Dificultad / Forma de la Pieza */}
            {breakdown.difficultyPercent > 0 && (
              <div className="cost-line cost-line--error">
                <div className="cost-line__info">
                  <span className="cost-line__label font-semibold">
                    <span className="material-symbols-outlined icon-xs color-secondary">shapes</span>
                    Dificultad y Geometría (+{breakdown.difficultyPercent}%)
                  </span>
                  <span className="cost-line__formula">Complejidad, soportes, riesgo de desprendimiento</span>
                </div>
                <span className="cost-line__value color-secondary">+{formatCOP(breakdown.difficultyAmount)}</span>
              </div>
            )}

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
                <span className="cost-line__formula">Amortización de fallos de impresión</span>
              </div>
              <span className="cost-line__value">+{formatCOP(breakdown.failureRiskAmount)}</span>
            </div>

            {/* Ganancia y Multiplicador */}
            <div className="cost-line cost-line--profit">
              <div className="cost-line__info">
                <span className="cost-line__label font-bold">
                  <span className="material-symbols-outlined icon-xs">trending_up</span>
                  Margen Comercial (x{breakdown.profitMultiplier} • +{breakdown.profitMarginPercent}%)
                </span>
                <span className="cost-line__formula">Utilidad neta para el taller</span>
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
              <th style={{ padding: '10px', border: '1px solid #ccc' }}>Material e Impresora</th>
              <th style={{ padding: '10px', border: '1px solid #ccc' }}>Tiempo Est.</th>
              <th style={{ padding: '10px', border: '1px solid #ccc', textAlign: 'center' }}>Cantidad</th>
              <th style={{ padding: '10px', border: '1px solid #ccc', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '12px 10px', border: '1px solid #ccc' }}>
                <strong>{pieceName}</strong>
                {difficultyPercent > 0 && (
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                    Dificultad geométrica: +{difficultyPercent}%
                  </div>
                )}
              </td>
              <td style={{ padding: '12px 10px', border: '1px solid #ccc' }}>
                <div>{selectedMaterial.name} ({filamentGrams}g)</div>
                <div style={{ fontSize: '11px', color: '#666' }}>{selectedPrinter.name} ({printerWatts}W)</div>
              </td>
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
          <p style={{ margin: 0 }}>• Slice2Price • Moneda: Pesos Colombianos (COP).</p>
        </div>
      </div>
    </div>
    </div>
  );
};
