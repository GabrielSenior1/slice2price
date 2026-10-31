// ============================================================================
// Slice2Price — Interfaz común para parsers de slicer
// ============================================================================
// Cada slicer implementa esta interfaz. Se construyen en etapas posteriores.
// ============================================================================

/** Resultado extraído de un G-code o archivo .3mf */
export interface SliceResult {
  /** Tiempo estimado de impresión en horas */
  printTimeHours: number;
  /** Filamento usado en gramos */
  filamentGrams: number;
  /** Nombre del slicer que generó el archivo */
  slicerName: string;
  /** Nombre del archivo de origen (opcional) */
  sourceFile?: string;
}

/** Opciones contextuales para los parsers (ej. densidad del material activo) */
export interface ParserOptions {
  /** Densidad del material en g/cm³ (ej. 1.04 para ABS, 1.24 para PLA, 1.27 para PETG) */
  density?: number;
  /** Diámetro del filamento en mm (por defecto 1.75mm) */
  diameter?: number;
}

/** Contrato que debe cumplir cada parser de slicer */
export interface SlicerParser {
  /** Identificador del slicer (ej: 'orca', 'cura', 'creality') */
  readonly slicerId: string;
  /** Nombre para mostrar en la UI */
  readonly displayName: string;

  /**
   * Intenta extraer los datos de laminado de un contenido de archivo.
   * @param content - Contenido del archivo (G-code o texto extraído de .3mf)
   * @param filename - Nombre del archivo (para detectar extensión)
   * @param options - Opciones contextuales como densidad del material activo
   * @returns Los datos extraídos, o null si este parser no reconoce el formato
   */
  parse(content: string, filename?: string, options?: ParserOptions): SliceResult | null;

  /**
   * Verifica si el contenido parece generado por este slicer.
   * Útil para auto-detectar cuál parser usar.
   */
  canParse(content: string): boolean;
}

// ----------------------------------------------------------------------------
// Utilidades de conversión (usadas por los parsers)
// ----------------------------------------------------------------------------

/**
 * Convierte volumen en cm³ a gramos usando la densidad del material.
 * @param volumeCm3 - Volumen en centímetros cúbicos
 * @param densityGPerCm3 - Densidad en g/cm³ (ej: PLA = 1.24)
 */
export function volumeToGrams(volumeCm3: number, densityGPerCm3: number): number {
  return volumeCm3 * densityGPerCm3;
}

/**
 * Convierte longitud de filamento en mm a gramos.
 * Asume filamento de diámetro estándar (1.75mm por defecto).
 * @param lengthMm - Longitud del filamento en milímetros
 * @param densityGPerCm3 - Densidad en g/cm³
 * @param diameterMm - Diámetro del filamento en mm (default: 1.75)
 */
export function filamentLengthToGrams(
  lengthMm: number,
  densityGPerCm3: number,
  diameterMm: number = 1.75,
): number {
  const radiusCm = (diameterMm / 2) / 10; // mm → cm
  const lengthCm = lengthMm / 10;          // mm → cm
  const volumeCm3 = Math.PI * radiusCm * radiusCm * lengthCm;
  return volumeToGrams(volumeCm3, densityGPerCm3);
}
