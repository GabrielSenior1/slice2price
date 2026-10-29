// ============================================================================
// Slice2Price — Pruebas unitarias del motor de cálculo
// ============================================================================

import { describe, it, expect } from 'vitest';
import { calculateCost, calculateFromProfiles, paramsFromProfiles } from './engine.js';
import type { CalcParams, PieceInput, CostBreakdown } from './engine.js';
import type { ProfileCombination } from '../profiles/types.js';

// ============================================================================
// Ejemplo numérico verificable a mano
// ============================================================================
//
// DATOS DE ENTRADA:
//   Material:   PLA a $65.000 COP/kg
//   Impresora:  Ender 3 Pro — 270W — Depreciación $500/h
//   General:    kWh a $800 — Error 5% — Riesgo fallo 3%
//   Cliente:    Margen ganancia 40% — Descuento 0%
//   Pieza:      4 horas — 50 gramos — Insumos extra $5.000 — 1 unidad
//
// CÁLCULO PASO A PASO:
//   costo_filamento  = (50 / 1000) × 65.000        = $3.250
//   costo_energia    = (270 / 1000) × 4 × 800      = $864
//   costo_desgaste   = 4 × 500                     = $2.000
//   subtotal         = 3.250 + 864 + 2.000 + 5.000 = $11.114
//
//   + error 5%:      11.114 × 1,05                 = $11.669,70
//     (monto error   = $555,70)
//   + riesgo 3%:     11.669,70 × 1,03              = $12.019,791
//     (monto riesgo  = $350,091)
//
//   + ganancia 40%:  12.019,791 × 1,40             = $16.827,7074
//     (monto ganancia = $4.807,9164)
//
//   Descuento 0%:    $0
//   TOTAL POR UNIDAD: $16.827,7074
//   TOTAL 1 UNIDAD:   $16.827,7074
// ============================================================================

const baseParams: CalcParams = {
  pricePerKg: 65000,
  powerConsumptionW: 270,
  depreciationPerHour: 500,
  pricePerKwh: 800,
  errorMargin: 5,
  failureRisk: 3,
  profitMargin: 40,
  discount: 0,
};

const basePiece: PieceInput = {
  printTimeHours: 4,
  filamentGrams: 50,
  extraCosts: 5000,
  quantity: 1,
};

describe('calculateCost', () => {
  // --------------------------------------------------------------------------
  // Ejemplo principal — verificable a mano
  // --------------------------------------------------------------------------
  describe('ejemplo numérico completo (Ender 3 Pro + PLA + Regular)', () => {
    let result: CostBreakdown;

    it('calcula sin errores', () => {
      result = calculateCost(baseParams, basePiece);
      expect(result).toBeDefined();
    });

    it('costo de filamento = (50/1000) × 65.000 = $3.250', () => {
      expect(result.filamentCost).toBeCloseTo(3250, 2);
    });

    it('costo de energía = (270/1000) × 4 × 800 = $864', () => {
      expect(result.energyCost).toBeCloseTo(864, 2);
    });

    it('costo de desgaste = 4 × 500 = $2.000', () => {
      expect(result.depreciationCost).toBeCloseTo(2000, 2);
    });

    it('insumos extra = $5.000', () => {
      expect(result.extraCosts).toBeCloseTo(5000, 2);
    });

    it('subtotal = 3.250 + 864 + 2.000 + 5.000 = $11.114', () => {
      expect(result.subtotal).toBeCloseTo(11114, 2);
    });

    it('margen de error 5% agrega $555,70', () => {
      expect(result.errorMarginPercent).toBe(5);
      expect(result.errorMarginAmount).toBeCloseTo(555.70, 2);
    });

    it('riesgo de fallo 3% agrega $350,091', () => {
      expect(result.failureRiskPercent).toBe(3);
      expect(result.failureRiskAmount).toBeCloseTo(350.091, 2);
    });

    it('subtotal con riesgo = $12.019,791', () => {
      expect(result.subtotalWithRisk).toBeCloseTo(12019.791, 2);
    });

    it('ganancia 40% agrega $4.807,9164', () => {
      expect(result.profitMarginPercent).toBe(40);
      expect(result.profitAmount).toBeCloseTo(4807.9164, 2);
    });

    it('precio antes de descuento = $16.827,7074', () => {
      expect(result.priceBeforeDiscount).toBeCloseTo(16827.7074, 2);
    });

    it('sin descuento (0%)', () => {
      expect(result.discountPercent).toBe(0);
      expect(result.discountAmount).toBeCloseTo(0, 2);
    });

    it('total por unidad = $16.827,7074', () => {
      expect(result.totalPerUnit).toBeCloseTo(16827.7074, 2);
    });

    it('total 1 unidad = $16.827,7074', () => {
      expect(result.quantity).toBe(1);
      expect(result.totalAllUnits).toBeCloseTo(16827.7074, 2);
    });
  });

  // --------------------------------------------------------------------------
  // Con descuento
  // --------------------------------------------------------------------------
  describe('con descuento de mayorista (10%)', () => {
    it('aplica descuento correctamente después de la ganancia', () => {
      const params: CalcParams = { ...baseParams, discount: 10 };
      const result = calculateCost(params, basePiece);

      // priceBeforeDiscount = $16.827,7074
      // descuento = 16.827,7074 × 10% = $1.682,77074
      // total = 16.827,7074 - 1.682,77074 = $15.144,93666
      expect(result.discountPercent).toBe(10);
      expect(result.discountAmount).toBeCloseTo(1682.77074, 2);
      expect(result.totalPerUnit).toBeCloseTo(15144.93666, 2);
    });
  });

  // --------------------------------------------------------------------------
  // Múltiples unidades
  // --------------------------------------------------------------------------
  describe('múltiples unidades', () => {
    it('multiplica el total por la cantidad', () => {
      const piece: PieceInput = { ...basePiece, quantity: 5 };
      const result = calculateCost(baseParams, piece);

      expect(result.quantity).toBe(5);
      expect(result.totalAllUnits).toBeCloseTo(result.totalPerUnit * 5, 2);
    });
  });

  // --------------------------------------------------------------------------
  // Sin ganancia (uso personal)
  // --------------------------------------------------------------------------
  describe('uso personal (0% ganancia)', () => {
    it('el total es igual al subtotal con riesgo', () => {
      const params: CalcParams = { ...baseParams, profitMargin: 0, discount: 0 };
      const result = calculateCost(params, basePiece);

      expect(result.profitAmount).toBeCloseTo(0, 2);
      expect(result.totalPerUnit).toBeCloseTo(result.subtotalWithRisk, 2);
    });
  });

  // --------------------------------------------------------------------------
  // Sin márgenes ni riesgos (costo puro)
  // --------------------------------------------------------------------------
  describe('costo puro (sin error, sin riesgo, sin ganancia)', () => {
    it('el total es igual al subtotal', () => {
      const params: CalcParams = {
        ...baseParams,
        errorMargin: 0,
        failureRisk: 0,
        profitMargin: 0,
        discount: 0,
      };
      const result = calculateCost(params, basePiece);

      expect(result.totalPerUnit).toBeCloseTo(result.subtotal, 2);
      expect(result.subtotal).toBeCloseTo(11114, 2);
    });
  });

  // --------------------------------------------------------------------------
  // Edge case: pieza solo con filamento (sin tiempo, sin extras)
  // --------------------------------------------------------------------------
  describe('pieza sin tiempo de impresión', () => {
    it('solo cobra filamento e insumos extras', () => {
      const piece: PieceInput = {
        printTimeHours: 0,
        filamentGrams: 100,
        extraCosts: 0,
        quantity: 1,
      };
      const params: CalcParams = {
        ...baseParams,
        errorMargin: 0,
        failureRisk: 0,
        profitMargin: 0,
      };
      const result = calculateCost(params, piece);

      expect(result.energyCost).toBe(0);
      expect(result.depreciationCost).toBe(0);
      expect(result.filamentCost).toBeCloseTo(6500, 2); // 100/1000 × 65000
      expect(result.totalPerUnit).toBeCloseTo(6500, 2);
    });
  });

  // --------------------------------------------------------------------------
  // Validaciones
  // --------------------------------------------------------------------------
  describe('validaciones', () => {
    it('lanza error si el tiempo es negativo', () => {
      expect(() =>
        calculateCost(baseParams, { ...basePiece, printTimeHours: -1 }),
      ).toThrow('El tiempo de impresión no puede ser negativo');
    });

    it('lanza error si los gramos son negativos', () => {
      expect(() =>
        calculateCost(baseParams, { ...basePiece, filamentGrams: -1 }),
      ).toThrow('Los gramos de filamento no pueden ser negativos');
    });

    it('lanza error si la cantidad es menor a 1', () => {
      expect(() =>
        calculateCost(baseParams, { ...basePiece, quantity: 0 }),
      ).toThrow('La cantidad debe ser al menos 1');
    });
  });

  // --------------------------------------------------------------------------
  // Consistencia de la fórmula
  // --------------------------------------------------------------------------
  describe('consistencia matemática', () => {
    it('el desglose suma al total por unidad', () => {
      const result = calculateCost(baseParams, basePiece);

      const reconstructed =
        result.subtotal +
        result.errorMarginAmount +
        result.failureRiskAmount +
        result.profitAmount -
        result.discountAmount;

      expect(result.totalPerUnit).toBeCloseTo(reconstructed, 4);
    });
  });
});

// ============================================================================
// calculateFromProfiles — atajo con perfiles
// ============================================================================

describe('calculateFromProfiles', () => {
  it('produce el mismo resultado que calculateCost con parámetros equivalentes', () => {
    const now = new Date().toISOString();
    const profiles: ProfileCombination = {
      printer: {
        id: 'p1', type: 'printer', name: 'Test', model: 'Test',
        powerConsumptionW: 270, depreciationPerHour: 500,
        createdAt: now, updatedAt: now,
      },
      material: {
        id: 'm1', type: 'material', name: 'PLA',
        pricePerKg: 65000, density: 1.24,
        createdAt: now, updatedAt: now,
      },
      client: {
        id: 'c1', type: 'client', name: 'Regular',
        profitMargin: 40, discount: 0, defaultDesignCost: 5000,
        createdAt: now, updatedAt: now,
      },
      general: {
        id: 'g1', type: 'general', name: 'Default',
        pricePerKwh: 800, errorMargin: 5, failureRisk: 3,
        createdAt: now, updatedAt: now,
      },
    };

    const fromProfiles = calculateFromProfiles(profiles, basePiece);
    const fromParams = calculateCost(baseParams, basePiece);

    expect(fromProfiles.totalPerUnit).toBeCloseTo(fromParams.totalPerUnit, 4);
    expect(fromProfiles.subtotal).toBeCloseTo(fromParams.subtotal, 4);
  });
});

describe('paramsFromProfiles', () => {
  it('extrae correctamente los parámetros de cada perfil', () => {
    const now = new Date().toISOString();
    const profiles: ProfileCombination = {
      printer: {
        id: 'p1', type: 'printer', name: 'Test', model: 'Test',
        powerConsumptionW: 350, depreciationPerHour: 1200,
        createdAt: now, updatedAt: now,
      },
      material: {
        id: 'm1', type: 'material', name: 'PETG',
        pricePerKg: 75000, density: 1.27,
        createdAt: now, updatedAt: now,
      },
      client: {
        id: 'c1', type: 'client', name: 'Premium',
        profitMargin: 60, discount: 5, defaultDesignCost: 10000,
        createdAt: now, updatedAt: now,
      },
      general: {
        id: 'g1', type: 'general', name: 'Custom',
        pricePerKwh: 900, errorMargin: 8, failureRisk: 5,
        createdAt: now, updatedAt: now,
      },
    };

    const params = paramsFromProfiles(profiles);

    expect(params.pricePerKg).toBe(75000);
    expect(params.powerConsumptionW).toBe(350);
    expect(params.depreciationPerHour).toBe(1200);
    expect(params.pricePerKwh).toBe(900);
    expect(params.errorMargin).toBe(8);
    expect(params.failureRisk).toBe(5);
    expect(params.profitMargin).toBe(60);
    expect(params.discount).toBe(5);
  });

  describe('Dificultad de impresión y multiplicadores comerciales', () => {
    it('aplica recargo por dificultad geométrica correctamente', () => {
      const resStandard = calculateCost({ ...baseParams, difficultyPercent: 0 }, basePiece);
      const resComplex = calculateCost({ ...baseParams, difficultyPercent: 20 }, basePiece);

      expect(resStandard.difficultyPercent).toBe(0);
      expect(resStandard.difficultyAmount).toBe(0);

      // Subtotal base es 11.114. Un 20% de dificultad es 2.222,80
      expect(resComplex.difficultyPercent).toBe(20);
      expect(resComplex.difficultyAmount).toBeCloseTo(11114 * 0.20, 2);
      expect(resComplex.totalAllUnits).toBeGreaterThan(resStandard.totalAllUnits);
    });

    it('calcula multiplicador comercial equivalente', () => {
      // 100% de margen = x2
      const resX2 = calculateCost({ ...baseParams, profitMargin: 100 }, basePiece);
      expect(resX2.profitMultiplier).toBe(2.0);

      // 150% de margen = x2.5
      const resX25 = calculateCost({ ...baseParams, profitMargin: 150 }, basePiece);
      expect(resX25.profitMultiplier).toBe(2.5);

      // 200% de margen = x3
      const resX3 = calculateCost({ ...baseParams, profitMargin: 200 }, basePiece);
      expect(resX3.profitMultiplier).toBe(3.0);

      // 250% de margen = x3.5
      const resX35 = calculateCost({ ...baseParams, profitMargin: 250 }, basePiece);
      expect(resX35.profitMultiplier).toBe(3.5);
    });
  });
});
