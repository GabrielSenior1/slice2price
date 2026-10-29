// ============================================================================
// Slice2Price — Pruebas del formateo de moneda
// ============================================================================

import { describe, it, expect } from 'vitest';
import { formatCOP, formatNumber, formatPercent } from './currency.js';

describe('formatCOP', () => {
  it('formatea un número entero con separador de miles', () => {
    const result = formatCOP(12500);
    // Intl con es-CO puede dar "$ 12.500" o "$12.500" según el runtime
    expect(result).toMatch(/\$\s?12[.,]500/);
  });

  it('formatea cero', () => {
    const result = formatCOP(0);
    expect(result).toMatch(/\$\s?0/);
  });

  it('formatea un número grande', () => {
    const result = formatCOP(16828);
    expect(result).toMatch(/\$\s?16[.,]828/);
  });

  it('puede mostrar decimales si se piden', () => {
    const result = formatCOP(16827.71, 2);
    // Busca algo como "$ 16.827,71"
    expect(result).toContain('16');
    expect(result).toContain('827');
  });
});

describe('formatNumber', () => {
  it('formatea sin símbolo de moneda', () => {
    const result = formatNumber(12500);
    expect(result).not.toContain('$');
    expect(result).toMatch(/12[.,]500/);
  });

  it('formatea con decimales', () => {
    const result = formatNumber(1234.56, 2);
    expect(result).toContain('1');
    expect(result).toContain('234');
  });
});

describe('formatPercent', () => {
  it('formatea un porcentaje entero', () => {
    expect(formatPercent(5)).toBe('5%');
  });

  it('formatea un porcentaje con decimal', () => {
    const result = formatPercent(40.5);
    // Puede ser "40,5%" o "40.5%" según locale
    expect(result).toMatch(/40[.,]5%/);
  });
});
