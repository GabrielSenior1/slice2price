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

  // ── Ganancia ─────────────────────────────────────────────────────────────
  /** Porcentaje de margen de ganancia aplicado */
  profitMarginPercent: number;
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
  // Validaciones básicas
  if (piece.printTimeHours < 0) throw new Error('El tiempo de impresión no puede ser negativo');
  if (piece.filamentGrams < 0) throw new Error('Los gramos de filamento no pueden ser negativos');
  if (piece.quantity < 1) throw new Error('La cantidad debe ser al menos 1');

  // ── Costos base ──────────────────────────────────────────────────────────
  const filamentCost = (piece.filamentGrams / 1000) * params.pricePerKg;
  const energyCost = (params.powerConsumptionW / 1000) * piece.printTimeHours * params.pricePerKwh;
  const depreciationCost = piece.printTimeHours * params.depreciationPerHour;
  const extraCosts = piece.extraCosts;

  // ── Subtotal ─────────────────────────────────────────────────────────────
  const subtotal = filamentCost + energyCost + depreciationCost + extraCosts;

  // ── Margen de error ──────────────────────────────────────────────────────
  const afterError = subtotal * (1 + params.errorMargin / 100);
  const errorMarginAmount = afterError - subtotal;

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

  return {
    filamentCost,
    energyCost,
    depreciationCost,
    extraCosts,
    subtotal,
    errorMarginPercent: params.errorMargin,
    errorMarginAmount,
    failureRiskPercent: params.failureRisk,
    failureRiskAmount,
    subtotalWithRisk,
    profitMarginPercent: params.profitMargin,
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
