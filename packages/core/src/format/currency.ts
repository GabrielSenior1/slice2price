// ============================================================================
// Slice2Price — Formateo de moneda (COP - Pesos Colombianos)
// ============================================================================

/**
 * Formatea un número como pesos colombianos.
 * Ejemplo: 16828 → "$16.828"
 *
 * @param value - Valor numérico en COP
 * @param decimals - Decimales a mostrar (por defecto 0)
 */
export function formatCOP(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formatea un número con separador de miles colombiano, sin símbolo de moneda.
 * Ejemplo: 16828.5 → "16.828,5"
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formatea un porcentaje.
 * Ejemplo: 5 → "5%", 40.5 → "40,5%"
 */
export function formatPercent(value: number): string {
  return `${formatNumber(value, value % 1 === 0 ? 0 : 1)}%`;
}
