// ============================================================================
// Slice2Price — Motor de cálculo de costos
// ============================================================================
// Implementa las fórmulas de la sección 2 del brief.
// Este módulo es puro: sin efectos secundarios, sin dependencias de UI.
// ============================================================================

import type { ProfileCombination } from '../profiles/types.js';

// ----------------------------------------------------------------------------
// Tipos de entrada
// ----------------------------------------------------------------------------

/** Parámetros de cálculo extraídos de los perfiles */
export interface CalcParams {
  // Material
  pricePerKg: number;            // COP/kg

  // Impresora
  powerConsumptionW: number;     // Watts
  depreciationPerHour: number;   // COP/h

  // General
  pricePerKwh: number;           // COP/kWh
  errorMargin: number;           // %
  failureRisk: number;           // %

  // Dificultad y geometría de impresión (opcional, default: 0%)
  difficultyPercent?: number;    // % de recargo por dificultad/soportes/geometría

  // Cliente / Tarifa
  profitMargin: number;          // %
  discount: number;              // %
}

/** Datos de la pieza individual */
export interface PieceInput {
  /** Tiempo total de impresión en horas */
  printTimeHours: number;
  /** Filamento usado en gramos */
  filamentGrams: number;
  /** Insumos extra: diseño, otros materiales, etc. (COP) */
  extraCosts: number;
  /** Cantidad de unidades */
  quantity: number;
}

// ----------------------------------------------------------------------------
// Tipos de salida — desglose completo
// ----------------------------------------------------------------------------

/** Desglose detallado del cálculo de costos */
export interface CostBreakdown {
  // ── Costos base ──────────────────────────────────────────────────────────
  /** (gramos / 1000) × precio_kg */
  filamentCost: number;
  /** (consumo_W / 1000) × horas × precio_kwh */
  energyCost: number;
  /** horas × depreciación_por_hora */
  depreciationCost: number;
  /** Insumos extra (diseño, otros materiales) */
  extraCosts: number;

  // ── Subtotal ─────────────────────────────────────────────────────────────
  /** Suma de los 4 costos base */
  subtotal: number;

  // ── Ajustes ──────────────────────────────────────────────────────────────
  /** Porcentaje de margen de error aplicado */
  errorMarginPercent: number;
  /** Monto que agrega el margen de error */
  errorMarginAmount: number;

  /** Porcentaje de riesgo de fallo aplicado */
  failureRiskPercent: number;
  /** Monto que agrega el riesgo de fallo */
  failureRiskAmount: number;

  /** subtotal × (1 + error%) × (1 + riesgo%) */
  subtotalWithRisk: number;

  // ── Dificultad / Geometría ───────────────────────────────────────────────
  /** Porcentaje de recargo por dificultad geométrica/técnica */
  difficultyPercent: number;
  /** Monto que agrega la dificultad geométrica */
  difficultyAmount: number;

  // ── Ganancia y Multiplicador ─────────────────────────────────────────────
  /** Porcentaje de margen de ganancia aplicado */
  profitMarginPercent: number;
  /** Multiplicador comercial equivalente (ej. 2.0 = x2, 2.5 = x2.5) */
  profitMultiplier: number;
  /** Monto que agrega la ganancia */
  profitAmount: number;

  /** Precio antes de descuento por unidad */
  priceBeforeDiscount: number;

  // ── Descuento ────────────────────────────────────────────────────────────
  /** Porcentaje de descuento aplicado */
  discountPercent: number;
  /** Monto descontado (valor positivo) */
  discountAmount: number;

  // ── Totales ──────────────────────────────────────────────────────────────
  /** Precio final por unidad */
  totalPerUnit: number;
  /** Cantidad de unidades */
  quantity: number;
  /** Precio final × cantidad */
  totalAllUnits: number;
}

// ----------------------------------------------------------------------------
// Funciones auxiliares
// ----------------------------------------------------------------------------

/**
 * Extrae los parámetros de cálculo de una combinación de perfiles.
 */
export function paramsFromProfiles(profiles: ProfileCombination): CalcParams {
  return {
    pricePerKg: profiles.material.pricePerKg,
    powerConsumptionW: profiles.printer.powerConsumptionW,
    depreciationPerHour: profiles.printer.depreciationPerHour,
    pricePerKwh: profiles.general.pricePerKwh,
    errorMargin: profiles.general.errorMargin,
    failureRisk: profiles.general.failureRisk,
    profitMargin: profiles.client.profitMargin,
    discount: profiles.client.discount,
  };
}

// ----------------------------------------------------------------------------
// Motor de cálculo principal
// ----------------------------------------------------------------------------

/**
 * Calcula el costo completo de una pieza con desglose línea por línea.
 *
 * Fórmulas:
 * ```
 * costo_filamento = (gramos / 1000) × precio_kg
 * costo_energia   = (consumo_W / 1000) × horas × precio_kwh
 * costo_desgaste  = horas × depreciación_por_hora
 * subtotal        = costo_filamento + costo_energia + costo_desgaste + insumos_extra
 * con_error       = subtotal × (1 + margen_error/100) × (1 + riesgo_fallo/100)
 * total           = con_error × (1 + margen_ganancia/100)
 * ```
 */
export function calculateCost(params: CalcParams, piece: PieceInput): CostBreakdown {
  // ── Validaciones exhaustivas de robustez numérica ──────────────────────────
  const valuesToCheck = [
    { name: 'Tiempo de impresión', val: piece.printTimeHours },
    { name: 'Gramos de filamento', val: piece.filamentGrams },
    { name: 'Insumos extra', val: piece.extraCosts },
    { name: 'Cantidad', val: piece.quantity },
    { name: 'Precio por kg', val: params.pricePerKg },
    { name: 'Consumo de potencia', val: params.powerConsumptionW },
    { name: 'Depreciación por hora', val: params.depreciationPerHour },
    { name: 'Precio kWh', val: params.pricePerKwh },
    { name: 'Margen de error', val: params.errorMargin },
    { name: 'Riesgo de fallo', val: params.failureRisk },
    { name: 'Margen de ganancia', val: params.profitMargin },
    { name: 'Descuento', val: params.discount },
  ];

  if (params.difficultyPercent !== undefined && params.difficultyPercent !== null) {
    valuesToCheck.push({ name: 'Dificultad', val: params.difficultyPercent });
  }

  for (const item of valuesToCheck) {
    if (typeof item.val !== 'number' || !Number.isFinite(item.val)) {
      throw new Error(`${item.name} debe ser un número finito válido`);
    }
  }

  if (piece.printTimeHours < 0) throw new Error('El tiempo de impresión no puede ser negativo');
  if (piece.filamentGrams < 0) throw new Error('Los gramos de filamento no pueden ser negativos');
  if (piece.extraCosts < 0) throw new Error('Los insumos extra no pueden ser negativos');
  if (piece.quantity < 1) throw new Error('La cantidad debe ser al menos 1');
  if (!Number.isInteger(piece.quantity)) throw new Error('La cantidad debe ser un número entero');

  if (params.pricePerKg < 0) throw new Error('El precio por kg no puede ser negativo');
  if (params.powerConsumptionW < 0) throw new Error('El consumo en watts no puede ser negativo');
  if (params.depreciationPerHour < 0) throw new Error('La depreciación por hora no puede ser negativa');
  if (params.pricePerKwh < 0) throw new Error('El precio por kWh no puede ser negativo');
  if (params.errorMargin < 0) throw new Error('El margen de error no puede ser negativo');
  if (params.failureRisk < 0) throw new Error('El riesgo de fallo no puede ser negativo');
  if (params.profitMargin < 0) throw new Error('El margen de ganancia no puede ser negativo');
  if (params.discount < 0 || params.discount > 100) {
    throw new Error('El descuento debe estar entre 0 y 100');
  }
  if ((params.difficultyPercent ?? 0) < 0) {
    throw new Error('El porcentaje de dificultad no puede ser negativo');
  }

  // ── Costos base ──────────────────────────────────────────────────────────
  const filamentCost = (piece.filamentGrams / 1000) * params.pricePerKg;
  const energyCost = (params.powerConsumptionW / 1000) * piece.printTimeHours * params.pricePerKwh;
  const depreciationCost = piece.printTimeHours * params.depreciationPerHour;
  const extraCosts = piece.extraCosts;

  // ── Subtotal base ────────────────────────────────────────────────────────
  const subtotal = filamentCost + energyCost + depreciationCost + extraCosts;

  // ── Dificultad y geometría de la pieza ───────────────────────────────────
  const difficultyPercent = Math.max(0, params.difficultyPercent ?? 0);
  const difficultyAmount = subtotal * (difficultyPercent / 100);
  const subtotalWithDifficulty = subtotal + difficultyAmount;

  // ── Margen de error ──────────────────────────────────────────────────────
  const afterError = subtotalWithDifficulty * (1 + params.errorMargin / 100);
  const errorMarginAmount = afterError - subtotalWithDifficulty;

  // ── Riesgo de fallo ──────────────────────────────────────────────────────
  const afterRisk = afterError * (1 + params.failureRisk / 100);
  const failureRiskAmount = afterRisk - afterError;

  const subtotalWithRisk = afterRisk;

  // ── Ganancia ─────────────────────────────────────────────────────────────
  const afterProfit = subtotalWithRisk * (1 + params.profitMargin / 100);
  const profitAmount = afterProfit - subtotalWithRisk;

  const priceBeforeDiscount = afterProfit;

  // ── Descuento ────────────────────────────────────────────────────────────
  const discountAmount = priceBeforeDiscount * (params.discount / 100);
  const totalPerUnit = priceBeforeDiscount - discountAmount;

  // ── Total ────────────────────────────────────────────────────────────────
  const totalAllUnits = totalPerUnit * piece.quantity;

  // Multiplicador comercial equivalente (ej. x2, x2.5, x3)
  const profitMultiplier = Math.round((1 + params.profitMargin / 100) * 100) / 100;

  return {
    filamentCost,
    energyCost,
    depreciationCost,
    extraCosts,
    subtotal,
    difficultyPercent,
    difficultyAmount,
    errorMarginPercent: params.errorMargin,
    errorMarginAmount,
    failureRiskPercent: params.failureRisk,
    failureRiskAmount,
    subtotalWithRisk,
    profitMarginPercent: params.profitMargin,
    profitMultiplier,
    profitAmount,
    priceBeforeDiscount,
    discountPercent: params.discount,
    discountAmount,
    totalPerUnit,
    quantity: piece.quantity,
    totalAllUnits,
  };
}

/**
 * Calcula el costo directamente desde una combinación de perfiles.
 * Atajo que combina `paramsFromProfiles` + `calculateCost`.
 */
export function calculateFromProfiles(
  profiles: ProfileCombination,
  piece: PieceInput,
): CostBreakdown {
  return calculateCost(paramsFromProfiles(profiles), piece);
}
